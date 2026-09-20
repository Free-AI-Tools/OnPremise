import asyncio
from mcp_manager import MCPManager
from config import load_mcp_config

async def inspect_tools():
    m = MCPManager()
    c = load_mcp_config()
    await m.startup(c["servers"])
    tools = m.get_openai_tools()
    print("Discovered tools:", len(tools))
    for t in tools:
        print("TOOL:", t["function"]["name"])
        print("DESC:", t["function"]["description"])
        print("PARAMS:", t["function"]["parameters"])
    await m.shutdown()

if __name__ == "__main__":
    asyncio.run(inspect_tools())
