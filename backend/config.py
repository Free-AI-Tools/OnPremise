import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    llama_server_url: str = "http://localhost:8080"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    model_name: str = "qwen"
    context_window: int = 4096
    max_tool_result_tokens: int = 3000
    config_dir: Path = Path(__file__).parent / ".config"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


SYSTEM_PROMPT = """Only state facts present in tool results. If search results don't contain specific numbers or details, say so explicitly — never estimate or invent them."""


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    # Ensure config directory exists
    settings.config_dir.mkdir(parents=True, exist_ok=True)
    return settings


# Setup constants based on settings
MCP_CONFIG_FILE = get_settings().config_dir / "mcp_servers.json"
SKILLS_CONFIG_FILE = get_settings().config_dir / "skills.json"


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
    if not MCP_CONFIG_FILE.exists():
        save_mcp_config(DEFAULT_MCP_CONFIG)
        return DEFAULT_MCP_CONFIG
    
    with MCP_CONFIG_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_mcp_config(config: Dict[str, Any]) -> None:
    """Save MCP configuration to file."""
    get_settings().config_dir.mkdir(parents=True, exist_ok=True)
    with MCP_CONFIG_FILE.open("w", encoding="utf-8") as f:
        json.dump(config, f, indent=4)


def load_skills_config() -> Dict[str, Any]:
    """Load skills configuration from file, creating defaults if not exists."""
    if not SKILLS_CONFIG_FILE.exists():
        save_skills_config(DEFAULT_SKILLS_CONFIG)
        return DEFAULT_SKILLS_CONFIG
    
    with SKILLS_CONFIG_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_skills_config(config: Dict[str, Any]) -> None:
    """Save skills configuration to file."""
    get_settings().config_dir.mkdir(parents=True, exist_ok=True)
    with SKILLS_CONFIG_FILE.open("w", encoding="utf-8") as f:
        json.dump(config, f, indent=4)
