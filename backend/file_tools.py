"""
File operations & Python code execution tools for the AI agent.
Provides read_file, write_file, list_workspace_files, execute_python, and create_artifact.
Confines all operations to the conversation's workspace directory.
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import workspaces

logger = logging.getLogger(__name__)

# Allowed tools set
FILE_TOOL_NAMES = {
    "read_file",
    "write_file",
    "list_workspace_files",
    "execute_python",
    "create_artifact",
}


def is_file_tool(tool_name: str) -> bool:
    """Check if a tool is handled by the local file tools engine."""
    return tool_name in FILE_TOOL_NAMES


def get_file_tools_schemas() -> List[Dict[str, Any]]:
    """Return OpenAI function calling schemas for file operations & Python runner."""
    return [
        {
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Read content from an uploaded or generated file in the conversation workspace. Use offset and limit to read lines in chunks without context overflow.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Relative file path, e.g. 'uploads/sales.csv' or 'outputs/summary.txt'",
                        },
                        "offset": {
                            "type": "integer",
                            "description": "1-based line number to start reading from (default 1)",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of lines to return (default 100)",
                        },
                    },
                    "required": ["path"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "write_file",
                "description": "Write text, cleaned data, code, or report content to a file inside the conversation workspace.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Relative destination path, e.g. 'outputs/cleaned_data.csv' or 'outputs/report.md'",
                        },
                        "content": {
                            "type": "string",
                            "description": "Text or code content to write",
                        },
                    },
                    "required": ["path", "content"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "list_workspace_files",
                "description": "List all uploaded files, generated outputs, and artifacts available in the current conversation.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "execute_python",
                "description": "Execute Python code in a subprocess inside the conversation workspace. Use this to analyze CSV/JSON files, compute aggregates with pandas/math, manipulate datasets, or generate new files.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "Python source code to execute",
                        },
                    },
                    "required": ["code"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "create_artifact",
                "description": "Create a rich interactive artifact to be presented on the user's Artifact Canvas (code, markdown document, interactive HTML, SVG, or data table).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "identifier": {
                            "type": "string",
                            "description": "Filename or ID, e.g. 'sales_dashboard.html', 'analytics.py', or 'summary.md'",
                        },
                        "title": {
                            "type": "string",
                            "description": "Human-readable title, e.g. 'Sales Forecast Dashboard'",
                        },
                        "type": {
                            "type": "string",
                            "enum": ["code", "markdown", "html", "svg", "table"],
                            "description": "Type of artifact to render on canvas",
                        },
                        "language": {
                            "type": "string",
                            "description": "Programming language (e.g. 'python', 'html', 'javascript', 'markdown', 'csv')",
                        },
                        "content": {
                            "type": "string",
                            "description": "Full artifact content",
                        },
                    },
                    "required": ["identifier", "title", "type", "content"],
                },
            },
        },
    ]


def _safe_resolve_path(workspace_root: Path, relative_path: str) -> Optional[Path]:
    """Ensure path stays strictly within the conversation workspace."""
    clean_rel = relative_path.strip().lstrip("/\\")
    resolved = (workspace_root / clean_rel).resolve()
    try:
        resolved.relative_to(workspace_root.resolve())
        return resolved
    except ValueError:
        logger.warning(f"Path traversal blocked: {relative_path} outside {workspace_root}")
        return None


async def execute_file_tool(
    thread_id: str,
    tool_name: str,
    args: Dict[str, Any],
) -> Tuple[str, Optional[Dict[str, Any]]]:
    """
    Execute a file tool.
    Returns (tool_result_str, artifact_payload_or_none).
    """
    ws = workspaces.get_conversation_workspace(thread_id)

    # 1. READ FILE
    if tool_name == "read_file":
        rel_path = args.get("path", "")
        file_path = _safe_resolve_path(ws, rel_path)
        if not file_path or not file_path.exists():
            # Try searching in uploads/ or outputs/ directly if not prefixed
            for sub in ("uploads", "outputs", "artifacts"):
                alt = ws / sub / Path(rel_path).name
                if alt.exists():
                    file_path = alt
                    break

        if not file_path or not file_path.exists():
            return f"Error: File '{rel_path}' does not exist in workspace.", None

        offset = max(1, int(args.get("offset", 1)))
        limit = max(1, min(500, int(args.get("limit", 100))))

        try:
            with file_path.open("r", encoding="utf-8", errors="replace") as f:
                all_lines = f.readlines()
                total = len(all_lines)
                start_idx = offset - 1
                end_idx = min(start_idx + limit, total)
                chunk = all_lines[start_idx:end_idx]

                header = f"--- {file_path.name} (Lines {offset} to {end_idx} of {total}) ---\n"
                return header + "".join(chunk), None
        except Exception as e:
            return f"Error reading file '{file_path.name}': {e}", None

    # 2. WRITE FILE
    elif tool_name == "write_file":
        rel_path = args.get("path", "")
        content = args.get("content", "")

        # Default to outputs/ if not prefixed
        if "/" not in rel_path and "\\" not in rel_path:
            dest_path = ws / "outputs" / rel_path
        else:
            dest_path = _safe_resolve_path(ws, rel_path)

        if not dest_path:
            return f"Error: Invalid destination path '{rel_path}'.", None

        try:
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            dest_path.write_text(content, encoding="utf-8")
            size = len(content.encode("utf-8"))
            filename = dest_path.name
            ext = dest_path.suffix.lstrip(".").lower()

            art_type = "code"
            if ext in ("html", "htm"):
                art_type = "html"
            elif ext == "svg":
                art_type = "svg"
            elif ext in ("md", "markdown"):
                art_type = "markdown"
            elif ext in ("csv", "tsv"):
                art_type = "table"

            lang_map = {
                "py": "python",
                "js": "javascript",
                "ts": "typescript",
                "html": "html",
                "css": "css",
                "json": "json",
                "md": "markdown",
                "csv": "csv",
                "txt": "text",
                "sql": "sql",
                "sh": "bash",
            }
            lang = lang_map.get(ext, ext or "text")

            payload = {
                "id": filename,
                "filename": filename,
                "title": filename,
                "type": art_type,
                "language": lang,
                "code": content,
                "content": content,
            }
            return (
                f"Successfully wrote {size} bytes to '{dest_path.relative_to(ws)}'. "
                f"The file has been automatically presented to the user on the Artifact Canvas.",
                payload,
            )
        except Exception as e:
            return f"Error writing file: {e}", None

    # 3. LIST WORKSPACE FILES
    elif tool_name == "list_workspace_files":
        items = []
        for category in ("uploads", "outputs", "artifacts"):
            cat_dir = ws / category
            if cat_dir.exists():
                for f in cat_dir.iterdir():
                    if f.is_file():
                        meta = workspaces.extract_file_metadata(f)
                        items.append(f"- {category}/{f.name} ({meta.get('size_str')}, {meta.get('summary')})")

        if not items:
            return "No files in current workspace.", None
        return "Workspace files:\n" + "\n".join(items), None

    # 4. EXECUTE PYTHON
    elif tool_name == "execute_python":
        code = args.get("code", "")
        if not code.strip():
            return "Error: No Python code provided.", None

        # Pre-scan outputs before execution
        outputs_dir = workspaces.get_outputs_dir(thread_id)
        before_files = set(outputs_dir.iterdir()) if outputs_dir.exists() else set()

        try:
            # Run in worker thread to avoid blocking event loop
            def run_proc():
                env = os.environ.copy()
                env["PYTHONIOENCODING"] = "utf-8"

                py_bin = sys.executable
                # If running inside frozen PyInstaller bundle, prefer host Python if installed
                if getattr(sys, "frozen", False):
                    host_py = shutil.which("python") or shutil.which("python3") or shutil.which("py")
                    if host_py:
                        py_bin = host_py

                return subprocess.run(
                    [py_bin, "-c", code],
                    cwd=str(ws),
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=30,
                )

            proc = await asyncio.to_thread(run_proc)

            stdout = proc.stdout.strip()
            stderr = proc.stderr.strip()

            # Check for newly generated files
            after_files = set(outputs_dir.iterdir()) if outputs_dir.exists() else set()
            new_files = [f for f in (after_files - before_files) if f.is_file()]

            output_lines = []
            if stdout:
                output_lines.append(f"Output:\n{stdout}")
            if stderr:
                output_lines.append(f"Stderr:\n{stderr}")
            if new_files:
                output_lines.append(f"Generated Files: {', '.join(f.name for f in new_files)}")
            if proc.returncode != 0:
                output_lines.append(f"Exited with error code: {proc.returncode}")

            res_text = "\n\n".join(output_lines) if output_lines else "Code executed successfully with no output."

            # Automatically pop open the first generated file as an Artifact on canvas
            artifact_payload = None
            if new_files:
                first_file = new_files[0]
                try:
                    content = first_file.read_text(encoding="utf-8")
                    ext = first_file.suffix.lstrip(".").lower()
                    art_type = "table" if ext in ("csv", "tsv") else ("code" if ext in ("py", "js", "ts", "json", "sql") else "markdown")
                    artifact_payload = {
                        "id": first_file.name,
                        "filename": first_file.name,
                        "title": first_file.name,
                        "type": art_type,
                        "language": ext or "text",
                        "code": content,
                        "content": content,
                    }
                except Exception as read_err:
                    logger.warning(f"Could not read generated file '{first_file.name}' for artifact: {read_err}")

            return res_text, artifact_payload

        except subprocess.TimeoutExpired:
            return "Error: Execution timed out after 30 seconds.", None
        except Exception as e:
            return f"Error executing Python code: {e}", None

    # 5. CREATE ARTIFACT
    elif tool_name == "create_artifact":
        identifier = Path(args.get("identifier", f"artifact_{int(asyncio.get_event_loop().time())}")).name
        title = args.get("title", identifier)
        art_type = args.get("type", "code")
        language = args.get("language", "python")
        content = args.get("content", "")

        # Save to disk
        art_dir = workspaces.get_artifacts_dir(thread_id)
        art_path = art_dir / identifier
        try:
            art_path.write_text(content, encoding="utf-8")
        except Exception as e:
            logger.warning(f"Could not write artifact to disk: {e}")

        payload = {
            "id": identifier,
            "filename": identifier,
            "title": title,
            "type": art_type,
            "language": language,
            "code": content,
            "content": content,
        }

        return f"Artifact '{title}' ({art_type}) created successfully.", payload

    return f"Unknown tool: {tool_name}", None
