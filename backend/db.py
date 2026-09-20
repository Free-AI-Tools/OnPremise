"""
SQLite database module for local chat history persistence using aiosqlite.
Stores conversations, messages, tool calls, and A2UI declarative payload histories.
"""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiosqlite
from config import get_settings

logger = logging.getLogger(__name__)

DB_PATH = get_settings().config_dir / "assistant_history.db"


async def init_db() -> None:
    """Initialize SQLite database tables if they do not exist."""
    get_settings().config_dir.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                active_skills TEXT DEFAULT '[]'
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMP NOT NULL,
                a2ui_payload TEXT,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS tool_calls (
                id TEXT PRIMARY KEY,
                message_id TEXT NOT NULL,
                tool_name TEXT NOT NULL,
                arguments TEXT NOT NULL,
                result_summary TEXT NOT NULL,
                timestamp TIMESTAMP NOT NULL,
                FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE
            )
        """)
        await db.commit()
        logger.info(f"Initialized chat history database at {DB_PATH}")


async def create_conversation(conversation_id: str, title: str = "New Conversation", active_skills: Optional[List[str]] = None) -> Dict[str, Any]:
    """Create a new conversation record."""
    now = datetime.now(timezone.utc).isoformat()
    skills_json = json.dumps(active_skills or [])
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO conversations (id, title, created_at, updated_at, active_skills) VALUES (?, ?, ?, ?, ?)",
            (conversation_id, title, now, now, skills_json)
        )
        await db.commit()
    return {
        "id": conversation_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
        "active_skills": active_skills or []
    }


async def save_message(
    message_id: str,
    conversation_id: str,
    role: str,
    content: str,
    a2ui_payload: Optional[Dict[str, Any]] = None
) -> None:
    """Save a user, assistant, system, or tool message."""
    now = datetime.now(timezone.utc).isoformat()
    payload_json = json.dumps(a2ui_payload) if a2ui_payload else None

    async with aiosqlite.connect(DB_PATH) as db:
        # Ensure conversation exists
        async with db.execute("SELECT id FROM conversations WHERE id = ?", (conversation_id,)) as cursor:
            if not await cursor.fetchone():
                title = content[:30] + "..." if len(content) > 30 else content or "New Conversation"
                await db.execute(
                    "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                    (conversation_id, title, now, now)
                )

        await db.execute(
            "INSERT OR REPLACE INTO messages (id, conversation_id, role, content, timestamp, a2ui_payload) VALUES (?, ?, ?, ?, ?, ?)",
            (message_id, conversation_id, role, content, now, payload_json)
        )
        await db.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (now, conversation_id)
        )
        await db.commit()


async def save_tool_call(
    tool_call_id: str,
    message_id: str,
    tool_name: str,
    arguments: Dict[str, Any],
    result_summary: str
) -> None:
    """Save details of a completed tool call."""
    now = datetime.now(timezone.utc).isoformat()
    args_json = json.dumps(arguments)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO tool_calls (id, message_id, tool_name, arguments, result_summary, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (tool_call_id, message_id, tool_name, args_json, result_summary, now)
        )
        await db.commit()


async def list_conversations() -> List[Dict[str, Any]]:
    """List all stored conversations ordered by most recently updated."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM conversations ORDER BY updated_at DESC") as cursor:
            rows = await cursor.fetchall()
            result = []
            for row in rows:
                c = dict(row)
                c["active_skills"] = json.loads(c.get("active_skills") or "[]")
                result.append(c)
            return result


async def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """Fetch full conversation history including messages and tool calls."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)) as cursor:
            conv_row = await cursor.fetchone()
            if not conv_row:
                return None
            conv = dict(conv_row)
            conv["active_skills"] = json.loads(conv.get("active_skills") or "[]")

        async with db.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC", (conversation_id,)) as cursor:
            msg_rows = await cursor.fetchall()
            messages = []
            for msg_row in msg_rows:
                m = dict(msg_row)
                m["a2ui_payload"] = json.loads(m["a2ui_payload"]) if m.get("a2ui_payload") else None
                
                # Fetch associated tool calls
                async with db.execute("SELECT * FROM tool_calls WHERE message_id = ?", (m["id"],)) as t_cursor:
                    t_rows = await t_cursor.fetchall()
                    tool_calls = []
                    for t_row in t_rows:
                        t = dict(t_row)
                        t["arguments"] = json.loads(t["arguments"])
                        tool_calls.append(t)
                    m["tool_calls"] = tool_calls
                messages.append(m)
            
            conv["messages"] = messages
            return conv


async def update_conversation_title(conversation_id: str, new_title: str) -> bool:
    """Update conversation title."""
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
            (new_title, now, conversation_id)
        )
        await db.commit()
        return cursor.rowcount > 0


async def delete_conversation(conversation_id: str) -> bool:
    """Delete conversation and all associated messages and tool calls."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        await db.commit()
        return cursor.rowcount > 0
