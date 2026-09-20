"""
A2UI (Agent-to-UI) Protocol Module.
Implements the declarative A2UI protocol specification (https://a2ui.org/)
for generating secure, platform-agnostic, component-based UI surfaces for LLM tool results.
"""
import uuid
from typing import Any, Dict, List, Optional


class A2UISurfaceBuilder:
    """Helper class to build A2UI declarative JSON surfaces."""

    def __init__(self, surface_id: Optional[str] = None):
        self.surface_id = surface_id or f"surf_{uuid.uuid4().hex[:8]}"
        self.components: List[Dict[str, Any]] = []
        self.data_model: Dict[str, Any] = {}

    def set_data(self, key: str, value: Any) -> "A2UISurfaceBuilder":
        """Set or update state in the surface data model."""
        self.data_model[key] = value
        return self

    def add_component(
        self,
        component_type: str,
        props: Dict[str, Any],
        children: Optional[List[Dict[str, Any]]] = None,
        component_id: Optional[str] = None
    ) -> "A2UISurfaceBuilder":
        """
        Add a declarative catalog component to the surface.
        
        Catalog component types include:
          - WeatherCard
          - SearchResultsCard
          - MetricBox
          - DataGrid
          - CodeViewer
          - ActionButtons
          - Card / Section
        """
        c_id = component_id or f"comp_{uuid.uuid4().hex[:6]}"
        comp: Dict[str, Any] = {
            "id": c_id,
            "type": component_type,
            "props": props
        }
        if children:
            comp["children"] = children
        self.components.append(comp)
        return self

    def build_create_surface_payload(self) -> Dict[str, Any]:
        """Build the full A2UI createSurface message payload."""
        return {
            "type": "createSurface",
            "surfaceId": self.surface_id,
            "dataModel": self.data_model,
            "components": self.components
        }

    def build_payload(self) -> Dict[str, Any]:
        """Build complete A2UI JSON payload for frontend component rendering."""
        return {
            "protocol": "a2ui",
            "version": "1.0",
            "surfaceId": self.surface_id,
            "dataModel": self.data_model,
            "components": self.components
        }


def transform_tool_result_to_a2ui(tool_name: str, arguments: Dict[str, Any], result_text: str) -> Optional[Dict[str, Any]]:
    """
    Intelligently inspects a tool call and transforms its result into a rich declarative A2UI JSON surface.
    Returns None if no specialized A2UI visual component applies.
    """
    # 1. Weather search result -> WeatherCard
    if "weather" in tool_name.lower() or "weather" in str(arguments).lower():
        city = arguments.get("query", arguments.get("city", "Location")).title()
        builder = A2UISurfaceBuilder()
        builder.set_data("city", city)
        builder.add_component("WeatherCard", {
            "title": f"Weather Summary — {city}",
            "summary": result_text[:400],
            "raw_text": result_text
        })
        return builder.build_payload()

    # 2. General web search result -> SearchResultsCard
    if tool_name in ("search", "web_search"):
        query = arguments.get("query", "Web Search")
        builder = A2UISurfaceBuilder()
        builder.set_data("query", query)
        builder.add_component("SearchResultsCard", {
            "query": query,
            "summary": result_text[:600],
            "sourceCount": result_text.count("http://") + result_text.count("https://")
        })
        return builder.build_payload()

    # 3. Multi-source research -> ResearchSummaryCard
    if tool_name == "research":
        question = arguments.get("question", arguments.get("query", "Research Brief"))
        builder = A2UISurfaceBuilder()
        builder.add_component("Card", {
            "title": f"🔬 Research Brief: {question}",
            "variant": "primary"
        }, children=[
            {
                "id": f"c_{uuid.uuid4().hex[:4]}",
                "type": "MarkdownText",
                "props": {"content": result_text[:800]}
            }
        ])
        return builder.build_payload()

    return None
