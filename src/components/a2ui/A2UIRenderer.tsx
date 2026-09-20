import React from 'react';
import { WeatherCard } from './WeatherCard';
import { SearchResultsCard } from './SearchResultsCard';
import { BarChartCard } from './BarChartCard';
import { LayoutGrid } from 'lucide-react';

export interface A2UIPayload {
  protocol: 'a2ui';
  version: string;
  surfaceId: string;
  dataModel?: Record<string, any>;
  components: Array<{
    id: string;
    type: string;
    props: Record<string, any>;
    children?: Array<any>;
  }>;
}

// Trusted Component Catalog Registry
const A2UI_CATALOG: Record<string, React.ComponentType<any>> = {
  WeatherCard: WeatherCard,
  SearchResultsCard: SearchResultsCard,
  BarChart: BarChartCard,
  BarChartCard: BarChartCard,
};

interface A2UIRendererProps {
  payload: A2UIPayload;
}

export const A2UIRenderer: React.FC<A2UIRendererProps> = ({ payload }) => {
  if (!payload || !Array.isArray(payload.components)) {
    return null;
  }

  return (
    <div className="a2ui-surface-wrapper space-y-2 my-2">
      {payload.components.map((comp) => {
        const Component = A2UI_CATALOG[comp.type];

        if (Component) {
          return <Component key={comp.id} {...comp.props} />;
        }

        // Fallback for catalog components not explicitly built yet
        return (
          <div
            key={comp.id}
            className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 text-xs text-slate-300"
          >
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-sky-400 mb-1">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>A2UI Surface Component: {comp.type}</span>
            </div>
            <pre className="bg-slate-900/80 p-2 rounded text-[11px] text-slate-400 font-mono overflow-x-auto">
              {JSON.stringify(comp.props, null, 2)}
            </pre>
          </div>
        );
      })}
    </div>
  );
};
