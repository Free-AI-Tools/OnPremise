import asyncio
from contextlib import AsyncExitStack, asynccontextmanager
from dataclasses import dataclass, field
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.sse import sse_client
from mcp.types import Tool

@dataclass
class MCPServerConnection:
    server_id: str
    name: str
    session: ClientSession | None = None
    tools: list[Tool] = field(default_factory=list)
    disabled_tools: list[str] = field(default_factory=list)
    connected: bool = False
    error: str | None = None

class MCPManager:
    """
    A generic MCP connection manager that maintains persistent connections to multiple MCP servers,
    discovers their tools, and routes tool calls.
    """

    def __init__(self):
        self._stack = AsyncExitStack()
        self._connections: dict[str, MCPServerConnection] = {}
        self._tool_routes: dict[str, str] = {}
        # Keep track of individual contexts if we need to close them separately,
        # but AsyncExitStack might not allow popping specific ones easily. 
        # For simplicity, we manage everything in one stack as per instructions.

    async def startup(self, server_configs: list[dict]) -> None:
        """
        Initialize connections to a list of server configurations.
        """
        for config in server_configs:
            if config.get("enabled", True):
                await self._connect_server(config)

    async def _connect_server(self, config: dict) -> None:
        """
        Connect to a single MCP server based on its configuration.
        """
        server_id = config.get("id", config.get("name", "unknown"))
        name = config.get("name", server_id)
        
        connection = MCPServerConnection(
            server_id=server_id,
            name=name,
            disabled_tools=config.get("disabled_tools", [])
        )
        self._connections[server_id] = connection
        
        try:
            transport_type = config.get("transport", "stdio")
            
            if transport_type == "stdio":
                server_params = StdioServerParameters(
                    command=config["command"],
                    args=config.get("args", []),
                    env=config.get("env")
                )
                read, write = await self._stack.enter_async_context(stdio_client(server_params))
            elif transport_type in ("sse", "http"):
                url = config["url"]
                read, write = await self._stack.enter_async_context(sse_client(url=url))
            else:
                raise ValueError(f"Unsupported transport type: {transport_type}")

            session = ClientSession(read, write)
            await self._stack.enter_async_context(session)
            await session.initialize()
            
            tools_response = await session.list_tools()
            
            connection.session = session
            connection.tools = tools_response.tools
            connection.connected = True
            
            # Map tool routes
            for tool in connection.tools:
                self._tool_routes[tool.name] = server_id
                
        except Exception as e:
            connection.error = str(e)
            connection.connected = False

    async def disconnect_server(self, server_id: str) -> None:
        """
        Disconnect a specific server and remove its tool routes.
        Note: True disconnection of the transport may wait until stack shutdown 
        if using a single AsyncExitStack.
        """
        if server_id in self._connections:
            connection = self._connections.pop(server_id)
            if connection.tools:
                for tool in connection.tools:
                    self._tool_routes.pop(tool.name, None)
            
            if connection.session:
                # We can't easily pop from AsyncExitStack, but we can clear refs
                connection.session = None
            connection.connected = False

    def get_openai_tools(self) -> list[dict[str, Any]]:
        """
        Get all discovered tools across connected servers formatted for OpenAI.
        """
        openai_tools = []
        for connection in self._connections.values():
            if not connection.connected:
                continue
                
            for tool in connection.tools:
                if tool.name in connection.disabled_tools:
                    continue
                    
                # Truncate overly long docstrings to keep system prompt lightweight
                desc = (tool.description or "").split("\n\n")[0].strip()
                if len(desc) > 300:
                    desc = desc[:300] + "..."

                openai_tools.append({
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": desc,
                        "parameters": getattr(tool, "input_schema", getattr(tool, "inputSchema", {}))
                    }
                })

        # Add built-in generative UI chart tools
        openai_tools.extend([
            {
                "type": "function",
                "function": {
                    "name": "render_pie_chart",
                    "description": "Render an interactive visual pie chart to the user. Call this when asked to make a pie chart, visual breakdown, or show percentage distribution.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string", "description": "Title of the pie chart"},
                            "slices": {
                                "type": "array",
                                "description": "List of data slices with name and numerical value",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string", "description": "Label for slice"},
                                        "value": {"type": "number", "description": "Numeric value or percentage"}
                                    },
                                    "required": ["name", "value"]
                                }
                            }
                        },
                        "required": ["title", "slices"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "render_bar_chart",
                    "description": "Render an interactive bar chart to the user for comparisons or metrics.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string", "description": "Title of the bar chart"},
                            "labels": {"type": "array", "items": {"type": "string"}, "description": "X-axis category labels"},
                            "series": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string"},
                                        "data": {"type": "array", "items": {"type": "number"}}
                                    },
                                    "required": ["name", "data"]
                                }
                            }
                        },
                        "required": ["title", "labels", "series"]
                    }
                }
            }
        ])

        return openai_tools

    async def call_tool(self, tool_name: str, arguments: dict) -> str:
        """
        Route a tool call to the appropriate server or built-in handler and return the text result.
        """
        # Handle built-in chart tools
        if tool_name == "render_pie_chart":
            title = arguments.get("title", "Pie Chart")
            slices = arguments.get("slices", [])
            return f"Successfully generated interactive pie chart '{title}' with {len(slices)} slices."

        if tool_name == "render_bar_chart":
            title = arguments.get("title", "Bar Chart")
            labels = arguments.get("labels", [])
            return f"Successfully generated interactive bar chart '{title}' across {len(labels)} categories."

        if tool_name not in self._tool_routes:
            return f"Error: Tool '{tool_name}' not found."
            
        server_id = self._tool_routes[tool_name]
        connection = self._connections.get(server_id)
        
        if not connection or not connection.connected or not connection.session:
            return f"Error: Server '{server_id}' for tool '{tool_name}' is not connected."
            
        if tool_name in connection.disabled_tools:
            return f"Error: Tool '{tool_name}' is disabled."
            
        try:
            result = await connection.session.call_tool(tool_name, arguments)
            if getattr(result, "isError", False):
                # Return the error to the LLM
                error_texts = [c.text for c in result.content if getattr(c, "text", None)]
                return f"Tool Error: {chr(10).join(error_texts)}"
                
            # Extract text
            texts = [c.text for c in result.content if getattr(c, "text", None)]
            return "\n".join(texts)
            
        except Exception as e:
            return f"Error executing tool '{tool_name}': {str(e)}"

    async def test_connection(self, config: dict) -> dict[str, Any]:
        """
        Test a connection without affecting the main manager.
        """
        async with AsyncExitStack() as stack:
            try:
                transport_type = config.get("transport", "stdio")
                
                if transport_type == "stdio":
                    server_params = StdioServerParameters(
                        command=config["command"],
                        args=config.get("args", []),
                        env=config.get("env")
                    )
                    read, write = await stack.enter_async_context(stdio_client(server_params))
                elif transport_type in ("sse", "http"):
                    url = config["url"]
                    read, write = await stack.enter_async_context(sse_client(url=url))
                else:
                    return {"success": False, "error": f"Unsupported transport type: {transport_type}"}

                session = ClientSession(read, write)
                await stack.enter_async_context(session)
                await session.initialize()
                
                tools_response = await session.list_tools()
                
                tools = [{"name": t.name, "description": t.description} for t in tools_response.tools]
                return {"success": True, "tools": tools}
                
            except Exception as e:
                return {"success": False, "error": str(e)}

    def get_server_status(self) -> list[dict[str, Any]]:
        """
        Get the status of all configured servers.
        """
        return [
            {
                "id": conn.server_id,
                "name": conn.name,
                "connected": conn.connected,
                "tool_count": len(conn.tools),
                "error": conn.error
            }
            for conn in self._connections.values()
        ]

    async def shutdown(self) -> None:
        """
        Close all active connections.
        """
        await self._stack.aclose()
        self._connections.clear()
        self._tool_routes.clear()
