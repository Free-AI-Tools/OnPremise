"""
FastAPI application entry point — AG-UI + A2UI backend with local SQLite persistence.

Wires together:
  - LLMClient (llama-server communication)
  - MCPManager (multi-server MCP tool discovery & routing)
  - CustomToolRegistry (user-defined HTTP tools)
  - AGUIHandler (AG-UI event streaming & A2UI UI payloads)
  - db.py (SQLite chat history persistence)
  - REST endpoints for MCP, Tools, Skills, and Conversations
"""
import logging
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agui_handler import AGUIHandler
from config import (
    get_settings,
    load_mcp_config,
    save_mcp_config,
    load_skills_config,
    save_skills_config,
)
import db
from llm_client import LLMClient
from mcp_manager import MCPManager
from tool_registry import CustomToolRegistry

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# --- Global instances ---
settings = get_settings()
llm_client = LLMClient(base_url=settings.llama_server_url, model=settings.model_name)
mcp_manager = MCPManager()
custom_registry = CustomToolRegistry()


# --- Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize DB, connect MCP servers. Shutdown: close everything."""
    logger.info("Starting backend...")

    # Initialize SQLite DB
    await db.init_db()

    # Load config and connect MCP servers
    config = load_mcp_config()
    await mcp_manager.startup(config.get("servers", []))
    custom_registry.load_tools(config.get("custom_tools", []))

    server_status = mcp_manager.get_server_status()
    for s in server_status:
        status = "✓ connected" if s["connected"] else f"✗ error: {s['error']}"
        logger.info(f"  MCP server '{s['name']}': {status} ({s['tool_count']} tools)")

    logger.info(f"Backend ready on {settings.backend_host}:{settings.backend_port}")
    yield

    # Shutdown
    logger.info("Shutting down backend...")
    await mcp_manager.shutdown()
    await custom_registry.close()
    await llm_client.close()


app = FastAPI(title="AI Assistant Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================================
# Request / Response Models
# =====================================================================

class RunAgentInput(BaseModel):
    """AG-UI standard input for running an agent."""
    thread_id: str | None = Field(None, alias="threadId")
    run_id: str | None = Field(None, alias="runId")
    messages: list[dict[str, Any]] = []
    tools: list[dict[str, Any]] | None = None
    state: dict[str, Any] | None = None
    context: list[Any] | None = None
    forwarded_props: dict[str, Any] | None = Field(None, alias="forwardedProps")

    model_config = {"populate_by_name": True}


class MCPServerConfig(BaseModel):
    """Configuration for adding/updating an MCP server."""
    id: str | None = None
    name: str
    enabled: bool = True
    transport: str = "stdio"
    command: str | None = None
    args: list[str] = []
    url: str | None = None
    auth_header: str | None = None
    disabled_tools: list[str] = []


class CustomToolConfig(BaseModel):
    """Configuration for a custom HTTP-backed tool."""
    id: str | None = None
    name: str
    description: str = ""
    parameters: dict[str, Any] = {"type": "object", "properties": {}}
    endpoint: str
    enabled: bool = True


class SkillConfig(BaseModel):
    """Configuration for a skill."""
    id: str | None = None
    name: str
    description: str = ""
    instructions: str = ""
    enabled: bool = True


class TitleUpdate(BaseModel):
    title: str


# =====================================================================
# Core Endpoints
# =====================================================================

@app.get("/health")
async def health():
    """Liveness check — used by Tauri shell to know when the backend is ready."""
    return {"status": "ok"}


@app.post("/awp")
async def run_agent(input_data: RunAgentInput):
    """
    AG-UI Wire Protocol endpoint.
    Accepts a user message, streams AG-UI events and A2UI JSON payloads over SSE.
    """
    handler = AGUIHandler(llm=llm_client, mcp=mcp_manager)

    user_messages = [
        msg for msg in input_data.messages
        if msg.get("role") in ("user", "assistant")
    ]

    return StreamingResponse(
        handler.run(
            user_messages=user_messages,
            thread_id=input_data.thread_id,
            run_id=input_data.run_id,
        ),
        media_type=handler.content_type(),
    )


# =====================================================================
# Conversation History Endpoints
# =====================================================================

@app.get("/conversations")
async def get_conversations():
    """List all stored conversations for the chat sidebar."""
    return await db.list_conversations()


@app.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Fetch a complete conversation thread with messages, tool calls, and A2UI payloads."""
    conv = await db.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail=f"Conversation '{conversation_id}' not found")
    return conv


@app.put("/conversations/{conversation_id}/title")
async def update_title(conversation_id: str, body: TitleUpdate):
    """Rename a conversation thread."""
    success = await db.update_conversation_title(conversation_id, body.title)
    if not success:
        raise HTTPException(status_code=404, detail=f"Conversation '{conversation_id}' not found")
    return {"status": "updated"}


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation thread."""
    success = await db.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Conversation '{conversation_id}' not found")
    return {"status": "deleted"}


# =====================================================================
# MCP Server Management Endpoints
# =====================================================================

@app.get("/mcp/servers")
async def list_mcp_servers():
    """List configured MCP servers and their connection status."""
    config = load_mcp_config()
    status = mcp_manager.get_server_status()
    status_map = {s["id"]: s for s in status}
    result = []
    for server in config.get("servers", []):
        live = status_map.get(server["id"], {})
        result.append({
            **server,
            "connected": live.get("connected", False),
            "tool_count": live.get("tool_count", 0),
            "error": live.get("error"),
        })
    return result


@app.post("/mcp/servers")
async def add_mcp_server(server: MCPServerConfig):
    """Add a new MCP server configuration."""
    config = load_mcp_config()
    server_dict = server.model_dump()
    if not server_dict.get("id"):
        server_dict["id"] = f"server_{uuid.uuid4().hex[:8]}"

    config["servers"].append(server_dict)
    save_mcp_config(config)

    if server_dict.get("enabled", True):
        await mcp_manager._connect_server(server_dict)

    return {"id": server_dict["id"], "status": "added"}


@app.put("/mcp/servers/{server_id}")
async def update_mcp_server(server_id: str, server: MCPServerConfig):
    """Update an MCP server's configuration."""
    config = load_mcp_config()
    for i, s in enumerate(config["servers"]):
        if s["id"] == server_id:
            server_dict = server.model_dump()
            server_dict["id"] = server_id
            config["servers"][i] = server_dict
            save_mcp_config(config)

            await mcp_manager.disconnect_server(server_id)
            if server_dict.get("enabled", True):
                await mcp_manager._connect_server(server_dict)

            return {"id": server_id, "status": "updated"}

    raise HTTPException(status_code=404, detail=f"Server '{server_id}' not found")


@app.delete("/mcp/servers/{server_id}")
async def delete_mcp_server(server_id: str):
    """Remove an MCP server."""
    config = load_mcp_config()
    config["servers"] = [s for s in config["servers"] if s["id"] != server_id]
    save_mcp_config(config)
    await mcp_manager.disconnect_server(server_id)
    return {"id": server_id, "status": "deleted"}


@app.post("/mcp/servers/{server_id}/test")
async def test_mcp_server(server_id: str):
    """Test-connect to a server and return discovered tools."""
    config = load_mcp_config()
    for s in config["servers"]:
        if s["id"] == server_id:
            result = await mcp_manager.test_connection(s)
            return result
    raise HTTPException(status_code=404, detail=f"Server '{server_id}' not found")


@app.get("/mcp/servers/{server_id}/tools")
async def list_server_tools(server_id: str):
    """List tools discovered from a given MCP server."""
    conn = mcp_manager._connections.get(server_id)
    if not conn:
        raise HTTPException(status_code=404, detail=f"Server '{server_id}' not found or not connected")
    return [
        {
            "name": t.name,
            "description": t.description,
            "disabled": t.name in conn.disabled_tools,
        }
        for t in conn.tools
    ]


# =====================================================================
# Custom Tool Endpoints
# =====================================================================

@app.get("/tools/custom")
async def list_custom_tools():
    """List custom HTTP-backed tools."""
    config = load_mcp_config()
    return config.get("custom_tools", [])


@app.post("/tools/custom")
async def add_custom_tool(tool: CustomToolConfig):
    """Add a custom tool."""
    config = load_mcp_config()
    tool_dict = tool.model_dump()
    if not tool_dict.get("id"):
        tool_dict["id"] = f"tool_{uuid.uuid4().hex[:8]}"

    if "custom_tools" not in config:
        config["custom_tools"] = []
    config["custom_tools"].append(tool_dict)
    save_mcp_config(config)
    custom_registry.load_tools(config["custom_tools"])

    return {"id": tool_dict["id"], "status": "added"}


@app.put("/tools/custom/{tool_id}")
async def update_custom_tool(tool_id: str, tool: CustomToolConfig):
    """Update a custom tool."""
    config = load_mcp_config()
    custom_tools = config.get("custom_tools", [])
    for i, t in enumerate(custom_tools):
        if t["id"] == tool_id:
            tool_dict = tool.model_dump()
            tool_dict["id"] = tool_id
            custom_tools[i] = tool_dict
            config["custom_tools"] = custom_tools
            save_mcp_config(config)
            custom_registry.load_tools(custom_tools)
            return {"id": tool_id, "status": "updated"}

    raise HTTPException(status_code=404, detail=f"Custom tool '{tool_id}' not found")


@app.delete("/tools/custom/{tool_id}")
async def delete_custom_tool(tool_id: str):
    """Remove a custom tool."""
    config = load_mcp_config()
    config["custom_tools"] = [t for t in config.get("custom_tools", []) if t["id"] != tool_id]
    save_mcp_config(config)
    custom_registry.load_tools(config["custom_tools"])
    return {"id": tool_id, "status": "deleted"}


# =====================================================================
# Skills Endpoints
# =====================================================================

@app.get("/skills")
async def list_skills():
    """List configured skills."""
    config = load_skills_config()
    return config.get("skills", [])


@app.post("/skills")
async def add_skill(skill: SkillConfig):
    """Add a new skill."""
    config = load_skills_config()
    skill_dict = skill.model_dump()
    if not skill_dict.get("id"):
        skill_dict["id"] = f"skill_{uuid.uuid4().hex[:8]}"
    config["skills"].append(skill_dict)
    save_skills_config(config)
    return {"id": skill_dict["id"], "status": "added"}


@app.put("/skills/{skill_id}")
async def update_skill(skill_id: str, skill: SkillConfig):
    """Update a skill."""
    config = load_skills_config()
    for i, s in enumerate(config["skills"]):
        if s["id"] == skill_id:
            skill_dict = skill.model_dump()
            skill_dict["id"] = skill_id
            config["skills"][i] = skill_dict
            save_skills_config(config)
            return {"id": skill_id, "status": "updated"}
    raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")


@app.delete("/skills/{skill_id}")
async def delete_skill(skill_id: str):
    """Remove a skill."""
    config = load_skills_config()
    config["skills"] = [s for s in config["skills"] if s["id"] != skill_id]
    save_skills_config(config)
    return {"id": skill_id, "status": "deleted"}


# =====================================================================
# Entry point
# =====================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.backend_host, port=settings.backend_port)
