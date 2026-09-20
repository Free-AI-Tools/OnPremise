"""
AG-UI event handler — bridges LLM client + MCP tool registry + A2UI protocol + SQLite DB into AG-UI SSE events.

Includes adaptive context management with 4-step overflow defense:
  1. Pre-prune messages to fit detected context budget
  2. Catch CONTEXT_OVERFLOW silently
  3. Aggressively prune and retry
  4. Friendly fallback message (user never sees raw errors)
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

# Friendly message shown to users when context is exhausted even after pruning
CONTEXT_OVERFLOW_MSG = (
    "⚠️ This conversation has grown too long for your device's memory. "
    "Please start a new conversation to continue."
)


# ---------------------------------------------------------------------------
# Token estimation & message pruning
# ---------------------------------------------------------------------------

def estimate_tokens(messages: list[dict[str, Any]]) -> int:
    """Rough token estimation across messages (~1 token per 4 characters)."""
    total_chars = 0
    for m in messages:
        content = m.get("content") or ""
        if isinstance(content, str):
            total_chars += len(content)
        elif isinstance(content, list):
            total_chars += sum(len(str(c)) for c in content)
        # Count tool_calls JSON if present
        if "tool_calls" in m:
            total_chars += len(json.dumps(m["tool_calls"], default=str))
    return total_chars // 4


def prune_messages_for_context(
    messages: list[dict[str, Any]],
    max_tokens: int,
) -> list[dict[str, Any]]:
    """
    Trim conversation messages so total estimated tokens stay under max_tokens.

    Strategy:
      - Always keep the system prompt (index 0)
      - Always keep the latest user message and any trailing tool messages
      - Drop the oldest non-system messages first (FIFO)
    """
    if estimate_tokens(messages) <= max_tokens:
        return messages

    # Separate system prompt from rest
    system_msg = messages[0] if messages and messages[0].get("role") == "system" else None
    rest = list(messages[1:] if system_msg else messages)

    # Drop oldest messages one-by-one until within budget (keep at least 1)
    while len(rest) > 1:
        candidate = ([system_msg] if system_msg else []) + rest
        if estimate_tokens(candidate) <= max_tokens:
            break
        rest.pop(0)

    return ([system_msg] if system_msg else []) + rest


def is_context_overflow(err: Exception) -> bool:
    """Check if an exception is a context window overflow from llama-server."""
    return "CONTEXT_OVERFLOW" in str(err)


# ---------------------------------------------------------------------------
# AG-UI Handler
# ---------------------------------------------------------------------------

class AGUIHandler:
    """Handles a single AG-UI run: tool decision, tool execution, A2UI surface emission, and streamed response."""

    def __init__(self, llm: LLMClient, mcp: MCPManager) -> None:
        self.llm = llm
        self.mcp = mcp
        self.encoder = EventEncoder()

    def content_type(self) -> str:
        """Return the SSE content type for StreamingResponse."""
        return self.encoder.get_content_type()

    def _token_budget(self, reserve_for_response: int = 800) -> int:
        """Calculate max prompt tokens based on detected context size minus response reserve."""
        return max(self.llm.context_size - reserve_for_response, 1024)

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
            raw_messages: list[dict[str, Any]] = [
                {"role": "system", "content": SYSTEM_PROMPT},
                *user_messages,
            ]

            # Step 1: Pre-prune messages to fit context budget
            budget = self._token_budget()
            messages = prune_messages_for_context(raw_messages, max_tokens=budget)
            logger.info(
                f"Context budget: {budget} tokens | "
                f"Estimated prompt: {estimate_tokens(messages)} tokens | "
                f"Messages: {len(messages)}"
            )

            # Collect available tools
            tools = self.mcp.get_openai_tools()
            a2ui_payload = None

            # --- PASS 1: Tool decision (non-streaming) ---
            if tools:
                # Step 2 & 3: Try tool call, catch overflow, prune harder, retry
                try:
                    response = await self.llm.chat_with_tools(messages, tools)
                except RuntimeError as err:
                    if is_context_overflow(err):
                        logger.warning("Context overflow on Pass 1 — aggressively pruning and retrying...")
                        messages = prune_messages_for_context(raw_messages, max_tokens=budget // 2)
                        try:
                            response = await self.llm.chat_with_tools(messages, tools)
                        except RuntimeError as retry_err:
                            if is_context_overflow(retry_err):
                                # Step 4: Friendly fallback
                                logger.error("Context overflow persists after pruning — sending friendly fallback")
                                async for frame in self._emit_fallback(msg_id, thread_id, run_id):
                                    yield frame
                                return
                            raise retry_err
                    else:
                        raise err

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

                        # Adaptive tool result truncation based on context budget
                        # Use at most 25% of total budget for tool results
                        max_tool_chars = (budget * 4) // 4  # 25% of budget in chars
                        max_tool_chars = min(max_tool_chars, 1500)  # Hard cap at 1500
                        if len(tool_result) > max_tool_chars:
                            tool_result = tool_result[:max_tool_chars] + "\n... [truncated for device memory limit]"

                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call_id,
                            "content": tool_result,
                        })

                else:
                    # Direct non-streaming response (no tool calls needed)
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

            # Re-prune after tool results were appended (they may have pushed us over)
            messages = prune_messages_for_context(messages, max_tokens=budget)

            response_tokens: list[str] = []

            # Step 2 & 3: Try streaming, catch overflow, prune harder, retry
            try:
                async for token in self.llm.chat_stream(messages):
                    response_tokens.append(token)
                    yield self.encoder.encode(
                        TextMessageContentEvent(
                            type=EventType.TEXT_MESSAGE_CONTENT,
                            message_id=msg_id,
                            delta=token,
                        )
                    )
            except RuntimeError as err:
                if is_context_overflow(err):
                    logger.warning("Context overflow on Pass 2 — aggressively pruning and retrying stream...")
                    messages = prune_messages_for_context(messages, max_tokens=budget // 2)
                    try:
                        async for token in self.llm.chat_stream(messages):
                            response_tokens.append(token)
                            yield self.encoder.encode(
                                TextMessageContentEvent(
                                    type=EventType.TEXT_MESSAGE_CONTENT,
                                    message_id=msg_id,
                                    delta=token,
                                )
                            )
                    except RuntimeError as retry_err:
                        if is_context_overflow(retry_err):
                            # Step 4: Friendly fallback within the existing text stream
                            logger.error("Context overflow persists on stream retry — emitting friendly message")
                            yield self.encoder.encode(
                                TextMessageContentEvent(
                                    type=EventType.TEXT_MESSAGE_CONTENT,
                                    message_id=msg_id,
                                    delta=CONTEXT_OVERFLOW_MSG,
                                )
                            )
                        else:
                            raise retry_err
                else:
                    raise err

            yield self.encoder.encode(
                TextMessageEndEvent(type=EventType.TEXT_MESSAGE_END, message_id=msg_id)
            )

            full_response = "".join(response_tokens)
            if not full_response:
                full_response = CONTEXT_OVERFLOW_MSG
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
            # Even unexpected errors get a friendly message, not raw JSON
            yield self.encoder.encode(
                TextMessageStartEvent(
                    type=EventType.TEXT_MESSAGE_START,
                    message_id=msg_id,
                    role="assistant",
                )
            )
            yield self.encoder.encode(
                TextMessageContentEvent(
                    type=EventType.TEXT_MESSAGE_CONTENT,
                    message_id=msg_id,
                    delta=f"⚠️ Something went wrong. Please try again or start a new conversation.",
                )
            )
            yield self.encoder.encode(
                TextMessageEndEvent(type=EventType.TEXT_MESSAGE_END, message_id=msg_id)
            )
            yield self.encoder.encode(
                RunFinishedEvent(
                    type=EventType.RUN_FINISHED, thread_id=thread_id, run_id=run_id
                )
            )

    async def _emit_fallback(
        self,
        msg_id: str,
        thread_id: str,
        run_id: str,
    ) -> AsyncIterator[str]:
        """Emit a friendly fallback message as a normal assistant text response."""
        yield self.encoder.encode(
            TextMessageStartEvent(
                type=EventType.TEXT_MESSAGE_START,
                message_id=msg_id,
                role="assistant",
            )
        )
        yield self.encoder.encode(
            TextMessageContentEvent(
                type=EventType.TEXT_MESSAGE_CONTENT,
                message_id=msg_id,
                delta=CONTEXT_OVERFLOW_MSG,
            )
        )
        yield self.encoder.encode(
            TextMessageEndEvent(type=EventType.TEXT_MESSAGE_END, message_id=msg_id)
        )
        await db.save_message(msg_id, thread_id, "assistant", CONTEXT_OVERFLOW_MSG, None)
        yield self.encoder.encode(
            RunFinishedEvent(
                type=EventType.RUN_FINISHED, thread_id=thread_id, run_id=run_id
            )
        )
