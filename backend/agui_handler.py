"""
AG-UI event handler — bridges LLM client + MCP tool registry + A2UI protocol + SQLite DB into AG-UI SSE events.
"""
import json
import logging
import uuid
from typing import Any, AsyncIterator

from ag_ui.core import (
    EventType,
    RunStartedEvent,
    RunFinishedEvent,
    RunErrorEvent,
    TextMessageStartEvent,
    TextMessageContentEvent,
    TextMessageEndEvent,
    ToolCallStartEvent,
    ToolCallArgsEvent,
    ToolCallEndEvent,
    CustomEvent,
)
from ag_ui.encoder import EventEncoder

from a2ui_protocol import transform_tool_result_to_a2ui
import db
from config import SYSTEM_PROMPT
from llm_client import LLMClient
from mcp_manager import MCPManager

logger = logging.getLogger(__name__)


class AGUIHandler:
    """Handles a single AG-UI run: tool decision, tool execution, A2UI surface emission, and streamed response."""

    def __init__(self, llm: LLMClient, mcp: MCPManager) -> None:
        self.llm = llm
        self.mcp = mcp
        self.encoder = EventEncoder()

    def content_type(self) -> str:
        """Return the SSE content type for StreamingResponse."""
        return self.encoder.get_content_type()

    async def run(
        self,
        user_messages: list[dict[str, Any]],
        thread_id: str | None = None,
        run_id: str | None = None,
    ) -> AsyncIterator[str]:
        """
        Execute a full AG-UI run for the given user messages.

        Yields encoded SSE frames in order:
          RUN_STARTED → [TOOL_CALL_* & A2UI CUSTOM]* →
          TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT* → TEXT_MESSAGE_END →
          RUN_FINISHED
        """
        thread_id = thread_id or f"th_{uuid.uuid4().hex[:8]}"
        run_id = run_id or f"run_{uuid.uuid4().hex[:8]}"
        msg_id = f"msg_{uuid.uuid4().hex[:8]}"

        # Extract latest user message content to persist
        user_prompt = ""
        for m in reversed(user_messages):
            if m.get("role") == "user":
                user_prompt = m.get("content", "")
                user_msg_id = f"user_{uuid.uuid4().hex[:8]}"
                await db.save_message(user_msg_id, thread_id, "user", user_prompt)
                break

        try:
            # --- RUN_STARTED ---
            yield self.encoder.encode(
                RunStartedEvent(type=EventType.RUN_STARTED, thread_id=thread_id, run_id=run_id)
            )

            # Build messages array with system prompt
            messages: list[dict[str, Any]] = [
                {"role": "system", "content": SYSTEM_PROMPT},
                *user_messages,
            ]

            # Collect available tools
            tools = self.mcp.get_openai_tools()
            a2ui_payload = None

            # --- PASS 1: Tool decision (non-streaming) ---
            if tools:
                response = await self.llm.chat_with_tools(messages, tools)
                assistant_msg = response["choices"][0]["message"]

                if assistant_msg.get("tool_calls"):
                    messages.append(assistant_msg)

                    for call in assistant_msg["tool_calls"]:
                        func = call["function"]
                        tool_name = func["name"]
                        tool_args_str = func.get("arguments", "{}")
                        tool_call_id = call.get("id", f"call_{uuid.uuid4().hex[:6]}")

                        try:
                            tool_args = json.loads(tool_args_str)
                        except json.JSONDecodeError:
                            tool_args = {}

                        # --- TOOL_CALL_START ---
                        yield self.encoder.encode(
                            ToolCallStartEvent(
                                type=EventType.TOOL_CALL_START,
                                tool_call_id=tool_call_id,
                                tool_call_name=tool_name,
                                parent_message_id=msg_id,
                            )
                        )

                        # --- TOOL_CALL_ARGS ---
                        yield self.encoder.encode(
                            ToolCallArgsEvent(
                                type=EventType.TOOL_CALL_ARGS,
                                tool_call_id=tool_call_id,
                                delta=tool_args_str,
                            )
                        )

                        # Execute the tool
                        logger.info(f"Calling tool '{tool_name}' with args: {tool_args}")
                        tool_result = await self.mcp.call_tool(tool_name, tool_args)
                        logger.info(f"Tool '{tool_name}' returned {len(tool_result)} chars")

                        # --- TOOL_CALL_END ---
                        yield self.encoder.encode(
                            ToolCallEndEvent(
                                type=EventType.TOOL_CALL_END,
                                tool_call_id=tool_call_id,
                            )
                        )

                        # Check for declarative A2UI UI transform
                        a2ui_payload = transform_tool_result_to_a2ui(tool_name, tool_args, tool_result)
                        if a2ui_payload:
                            yield self.encoder.encode(
                                CustomEvent(
                                    type=EventType.CUSTOM,
                                    name="a2ui:createSurface",
                                    value=a2ui_payload,
                                )
                            )

                        # Save tool call details to SQLite
                        await db.save_tool_call(
                            tool_call_id=tool_call_id,
                            message_id=msg_id,
                            tool_name=tool_name,
                            arguments=tool_args,
                            result_summary=tool_result[:500],
                        )

                        # Truncate tool result to prevent context window overflow
                        if len(tool_result) > 2500:
                            tool_result = tool_result[:2500] + "\n... [tool output truncated for context limit]"

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call_id,
                            "content": tool_result,
                        })

                else:
                    # Direct non-streaming response
                    direct_content = assistant_msg.get("content", "")
                    yield self.encoder.encode(
                        TextMessageStartEvent(
                            type=EventType.TEXT_MESSAGE_START,
                            message_id=msg_id,
                            role="assistant",
                        )
                    )
                    if direct_content:
                        yield self.encoder.encode(
                            TextMessageContentEvent(
                                type=EventType.TEXT_MESSAGE_CONTENT,
                                message_id=msg_id,
                                delta=direct_content,
                            )
                        )
                    yield self.encoder.encode(
                        TextMessageEndEvent(type=EventType.TEXT_MESSAGE_END, message_id=msg_id)
                    )

                    # Persist assistant message to DB
                    await db.save_message(msg_id, thread_id, "assistant", direct_content, a2ui_payload)

                    yield self.encoder.encode(
                        RunFinishedEvent(
                            type=EventType.RUN_FINISHED, thread_id=thread_id, run_id=run_id
                        )
                    )
                    return

            # --- PASS 2: Streamed final response ---
            yield self.encoder.encode(
                TextMessageStartEvent(
                    type=EventType.TEXT_MESSAGE_START,
                    message_id=msg_id,
                    role="assistant",
                )
            )

            response_tokens: list[str] = []
            async for token in self.llm.chat_stream(messages):
                response_tokens.append(token)
                yield self.encoder.encode(
                    TextMessageContentEvent(
                        type=EventType.TEXT_MESSAGE_CONTENT,
                        message_id=msg_id,
                        delta=token,
                    )
                )

            yield self.encoder.encode(
                TextMessageEndEvent(type=EventType.TEXT_MESSAGE_END, message_id=msg_id)
            )

            full_response = "".join(response_tokens)
            # Persist assistant response to DB
            await db.save_message(msg_id, thread_id, "assistant", full_response, a2ui_payload)

            # --- RUN_FINISHED ---
            yield self.encoder.encode(
                RunFinishedEvent(
                    type=EventType.RUN_FINISHED, thread_id=thread_id, run_id=run_id
                )
            )

        except Exception as e:
            logger.exception(f"Run failed: {e}")
            yield self.encoder.encode(
                RunErrorEvent(
                    type=EventType.RUN_ERROR,
                    message=str(e),
                    code="AGENT_EXECUTION_ERROR",
                )
            )
