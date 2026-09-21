"""
Workspace management module for conversation-isolated file storage.
Manages uploads, outputs, and generated artifacts on disk.
Extracts concise token-efficient file metadata for LLM context injection.
"""

import csv
import json
import logging
import mimetypes
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import get_settings

logger = logging.getLogger(__name__)


def get_workspaces_root() -> Path:
    """Return root directory where all conversation workspaces are stored."""
    root = get_settings().config_dir / "workspaces"
    root.mkdir(parents=True, exist_ok=True)
    return root


def get_conversation_workspace(conversation_id: str) -> Path:
    """Get or create the root directory for a specific conversation."""
    ws = get_workspaces_root() / conversation_id
    ws.mkdir(parents=True, exist_ok=True)
    return ws


def get_uploads_dir(conversation_id: str) -> Path:
    """Directory where user uploaded files are safely staged."""
    d = get_conversation_workspace(conversation_id) / "uploads"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_outputs_dir(conversation_id: str) -> Path:
    """Directory where AI generated outputs (tables, charts, exports) are saved."""
    d = get_conversation_workspace(conversation_id) / "outputs"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_artifacts_dir(conversation_id: str) -> Path:
    """Directory where explicit artifacts (code, HTML, Markdown, SVGs) are saved."""
    d = get_conversation_workspace(conversation_id) / "artifacts"
    d.mkdir(parents=True, exist_ok=True)
    return d


def delete_conversation_workspace(conversation_id: str) -> bool:
    """Delete a conversation's workspace directory and all contained files."""
    ws = get_workspaces_root() / conversation_id
    if ws.exists() and ws.is_dir():
        try:
            shutil.rmtree(ws)
            logger.info(f"Cleaned up workspace for conversation {conversation_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete workspace for {conversation_id}: {e}")
            return False
    return False


def extract_file_metadata(file_path: Path) -> Dict[str, Any]:
    """
    Inspect a file on disk and return a compact, token-friendly metadata summary.
    Avoids loading entire files into LLM context window.
    """
    if not file_path.exists():
        return {"error": f"File not found: {file_path.name}"}

    size_bytes = file_path.stat().st_size
    mime, _ = mimetypes.guess_type(str(file_path))
    ext = file_path.suffix.lower()

    # Friendly size string
    if size_bytes < 1024:
        size_str = f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        size_str = f"{size_bytes / 1024:.1f} KB"
    else:
        size_str = f"{size_bytes / (1024 * 1024):.2f} MB"

    meta: Dict[str, Any] = {
        "filename": file_path.name,
        "path": str(file_path),
        "size_bytes": size_bytes,
        "size_str": size_str,
        "mime_type": mime or "application/octet-stream",
        "extension": ext,
        "summary": "",
    }

    # CSV Analysis
    if ext == ".csv":
        try:
            with file_path.open("r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f)
                header = next(reader, None)
                if header:
                    meta["columns"] = header
                    meta["column_count"] = len(header)
                    sample_rows = []
                    row_count = 1
                    for row in reader:
                        row_count += 1
                        if len(sample_rows) < 3:
                            sample_rows.append(row)
                    meta["row_count"] = row_count
                    meta["sample_rows"] = sample_rows
                    meta["summary"] = f"CSV with {row_count} rows, {len(header)} columns: {', '.join(header[:8])}"
        except Exception as e:
            meta["summary"] = f"CSV file ({size_str}), error reading schema: {e}"

    # JSON Analysis
    elif ext == ".json":
        try:
            with file_path.open("r", encoding="utf-8", errors="replace") as f:
                data = json.load(f)
                if isinstance(data, list):
                    meta["item_count"] = len(data)
                    meta["type"] = "array"
                    if data and isinstance(data[0], dict):
                        meta["keys"] = list(data[0].keys())
                    meta["summary"] = f"JSON Array with {len(data)} items"
                elif isinstance(data, dict):
                    meta["type"] = "object"
                    meta["keys"] = list(data.keys())
                    meta["summary"] = f"JSON Object with keys: {', '.join(list(data.keys())[:10])}"
        except Exception as e:
            meta["summary"] = f"JSON file ({size_str})"

    # Text / Code Analysis
    elif ext in (".txt", ".md", ".py", ".js", ".ts", ".html", ".css", ".sql", ".sh", ".log", ".yaml", ".yml"):
        try:
            with file_path.open("r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
                line_count = len(lines)
                first_lines = "".join(lines[:5]).strip()
                meta["line_count"] = line_count
                meta["preview"] = first_lines
                meta["summary"] = f"{ext[1:].upper()} file ({line_count} lines)"
        except Exception as e:
            meta["summary"] = f"Text file ({size_str})"

    else:
        meta["summary"] = f"Binary/Document file ({ext}, {size_str})"

    return meta


def generate_llm_file_descriptor(metadata: Dict[str, Any]) -> str:
    """
    Format metadata into a concise prompt descriptor (~30-60 tokens)
    so the AI understands what file is available without choking context.
    """
    lines = [
        f"[Attached File: {metadata.get('filename')}]",
        f"- Relative Path: uploads/{metadata.get('filename')}",
        f"- Size: {metadata.get('size_str')}",
    ]

    if "columns" in metadata:
        cols = ", ".join(metadata["columns"][:10])
        lines.append(f"- Schema ({metadata.get('column_count')} cols, ~{metadata.get('row_count')} rows): {cols}")
        if metadata.get("sample_rows"):
            lines.append("- Sample (first row): " + ", ".join(metadata["sample_rows"][0][:8]))

    elif "keys" in metadata:
        lines.append(f"- JSON Structure: {metadata.get('type')} with keys: {', '.join(metadata['keys'][:8])}")

    elif "line_count" in metadata:
        lines.append(f"- Length: {metadata.get('line_count')} lines")
        if metadata.get("preview"):
            preview_short = metadata["preview"][:150].replace("\n", " ")
            lines.append(f"- Snippet: {preview_short}")

    lines.append("- Note: Use `read_file` or `execute_python` to inspect, analyze, or transform this file.")
    return "\n".join(lines)
