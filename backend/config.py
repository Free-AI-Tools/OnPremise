import json
import logging
import os
import shutil
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


def get_app_base_dir() -> Path:
    """Return the application root directory (exe directory in production, project dir in dev)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    # In dev, parent of backend is project root
    return Path(__file__).parent.parent


def get_pointer_file_path() -> Path:
    """Return location where data_location.txt pointer is stored."""
    return get_app_base_dir() / "data_location.txt"


def resolve_app_data_dir() -> Path:
    """
    Resolve the root data directory using a 3-tier hierarchy:
    1. Pointer file: data_location.txt (user-configured custom drive/path)
    2. Environment variable: APP_DATA_DIR or PORTABLE_DATA_DIR
    3. Portable directory: ./data next to executable or project
    4. Fallback: %APPDATA%/AI-Portable-App (frozen exe) or backend/.config (dev)
    """
    # 1. Check pointer file
    pointer = get_pointer_file_path()
    if pointer.exists():
        try:
            custom_path_str = pointer.read_text(encoding="utf-8").strip()
            if custom_path_str:
                custom_path = Path(custom_path_str)
                custom_path.mkdir(parents=True, exist_ok=True)
                return custom_path
        except Exception as e:
            logger.warning(f"Failed to read data_location.txt: {e}")

    # 2. Check environment variable
    env_dir = os.getenv("APP_DATA_DIR") or os.getenv("PORTABLE_DATA_DIR")
    if env_dir:
        p = Path(env_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    # 3. Check for portable 'data' folder
    base_dir = get_app_base_dir()
    portable_dir = base_dir / "data"
    if portable_dir.exists() and portable_dir.is_dir():
        return portable_dir

    # 4. Fallback
    if getattr(sys, "frozen", False):
        app_data = Path(os.getenv("APPDATA", Path.home() / "AppData" / "Roaming")) / "AI-Portable-App"
    else:
        app_data = Path(__file__).parent / ".config"

    app_data.mkdir(parents=True, exist_ok=True)
    return app_data


def set_custom_storage_root(new_path: Path) -> Path:
    """Save user-configured path to data_location.txt and clear settings cache."""
    new_path = Path(new_path).resolve()
    new_path.mkdir(parents=True, exist_ok=True)

    pointer = get_pointer_file_path()
    pointer.write_text(str(new_path), encoding="utf-8")
    logger.info(f"Updated storage pointer to: {new_path}")

    get_settings.cache_clear()
    return new_path


def get_disk_space_info(target_path: Path | None = None) -> Dict[str, Any]:
    """Inspect disk space for a given path or current storage root."""
    path = target_path or get_settings().config_dir
    try:
        total, used, free = shutil.disk_usage(str(path))
        drive = path.drive or (str(path).split(os.sep)[0] if os.sep in str(path) else "")
        return {
            "path": str(path.resolve()),
            "drive": drive,
            "total_bytes": total,
            "used_bytes": used,
            "free_bytes": free,
            "total_gb": round(total / (1024 ** 3), 1),
            "used_gb": round(used / (1024 ** 3), 1),
            "free_gb": round(free / (1024 ** 3), 1),
            "percent_free": round((free / total) * 100, 1) if total > 0 else 0,
        }
    except Exception as e:
        logger.error(f"Failed to query disk space for {path}: {e}")
        return {
            "path": str(path),
            "drive": "",
            "total_gb": 0,
            "used_gb": 0,
            "free_gb": 0,
            "percent_free": 0,
            "error": str(e),
        }


class Settings(BaseSettings):
    llama_server_url: str = "http://localhost:8080"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    model_name: str = "qwen"
    context_window: int = 4096
    max_tool_result_tokens: int = 3000
    config_dir: Path = resolve_app_data_dir()

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


SYSTEM_PROMPT = """Only state facts present in tool results. If search results don't contain specific numbers or details, say so explicitly — never estimate or invent them.
When searching the web, extract clean, concise keywords (e.g. 'top economies GDP PPP 2024') without conversational phrases like 'can you make a pie chart'.
When the user asks for a chart, visual breakdown, or comparison, call 'render_pie_chart' or 'render_bar_chart' with the data.
- When the user asks to create, generate, or make any file (CSV, JSON, Python script, HTML, or markdown text), ALWAYS call `write_file` directly with the formatted content. This automatically saves the file and presents it as an interactive Artifact on the user's Artifact Canvas.
- Use `read_file` to inspect files already present in the workspace.
- Use `execute_python` only when performing complex calculations, data transformations, or running analysis on existing files.
- NEVER use `fetch` for local files or workspace paths (e.g. 'file://' or 'outputs/...'). `fetch` is ONLY for public web HTTP/HTTPS URLs.
After calling any tool, always provide a concise, friendly natural language summary for the user. Never print, repeat, or echo raw tool call commands, function names, or syntax (such as 'render_pie_chart title=...') in your response."""


@lru_cache()
def get_settings() -> Settings:
    settings = Settings(config_dir=resolve_app_data_dir())
    settings.config_dir.mkdir(parents=True, exist_ok=True)
    return settings


def get_mcp_config_file() -> Path:
    return get_settings().config_dir / "mcp_servers.json"


def get_skills_config_file() -> Path:
    return get_settings().config_dir / "skills.json"


DEFAULT_MCP_CONFIG = {
    "servers": [
        {
            "id": "free-search",
            "name": "free-search-mcp",
            "enabled": True,
            "transport": "stdio",
            "command": "uvx",
            "args": ["free-search-mcp"],
            "disabled_tools": [
                "fetch_batch",
                "read_doc",
                "paper_graph",
                "cache_search",
                "engines",
                "compare",
                "extract_structured",
                "download"
            ]
        }
    ],
    "custom_tools": []
}

DEFAULT_SKILLS_CONFIG: Dict[str, Any] = {
    "skills": []
}


def load_mcp_config() -> Dict[str, Any]:
    """Load MCP configuration from file, creating defaults if not exists."""
    cfg_file = get_mcp_config_file()
    if not cfg_file.exists():
        save_mcp_config(DEFAULT_MCP_CONFIG)
        return DEFAULT_MCP_CONFIG

    with cfg_file.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_mcp_config(config: Dict[str, Any]) -> None:
    """Save MCP configuration to file."""
    cfg_file = get_mcp_config_file()
    cfg_file.parent.mkdir(parents=True, exist_ok=True)
    with cfg_file.open("w", encoding="utf-8") as f:
        json.dump(config, f, indent=4)


def load_skills_config() -> Dict[str, Any]:
    """Load skills configuration from file, creating defaults if not exists."""
    skills_file = get_skills_config_file()
    if not skills_file.exists():
        save_skills_config(DEFAULT_SKILLS_CONFIG)
        return DEFAULT_SKILLS_CONFIG

    with skills_file.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_skills_config(config: Dict[str, Any]) -> None:
    """Save skills configuration to file."""
    skills_file = get_skills_config_file()
    skills_file.parent.mkdir(parents=True, exist_ok=True)
    with skills_file.open("w", encoding="utf-8") as f:
        json.dump(config, f, indent=4)
