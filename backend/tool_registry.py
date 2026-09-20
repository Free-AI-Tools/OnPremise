"""
Custom HTTP tool registry for user-defined HTTP-backed tools.
"""
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class CustomToolRegistry:
    """Manages custom HTTP-backed tools (no full MCP server required)."""

    def __init__(self) -> None:
        self._tools: dict[str, dict[str, Any]] = {}
        self._client = httpx.AsyncClient(timeout=60.0)

    def load_tools(self, custom_tools: list[dict[str, Any]]) -> None:
        """Load custom tools from config."""
        self._tools.clear()
        for tool in custom_tools:
            if tool.get("enabled", True):
                self._tools[tool["name"]] = tool

    def get_openai_tools(self) -> list[dict[str, Any]]:
        """Return OpenAI-format tools for all enabled custom tools."""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": tool.get("parameters", {"type": "object", "properties": {}}),
                },
            }
            for tool in self._tools.values()
        ]

    def has_tool(self, tool_name: str) -> bool:
        """Check if a tool name belongs to this registry."""
        return tool_name in self._tools

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> str:
        """POST arguments to the tool's configured HTTP endpoint."""
        tool = self._tools.get(tool_name)
        if not tool:
            return f"Error: Custom tool '{tool_name}' not found."

        endpoint = tool.get("endpoint", "")
        if not endpoint:
            return f"Error: No endpoint configured for tool '{tool_name}'."

        try:
            response = await self._client.post(endpoint, json=arguments)
            response.raise_for_status()
            return response.text
        except httpx.RequestError as e:
            logger.error(f"Custom tool '{tool_name}' request failed: {e}")
            return f"Error: Failed to reach endpoint for tool '{tool_name}': {e}"
        except httpx.HTTPStatusError as e:
            logger.error(f"Custom tool '{tool_name}' returned error: {e}")
            return f"Error: Tool '{tool_name}' returned HTTP {e.response.status_code}"

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()
