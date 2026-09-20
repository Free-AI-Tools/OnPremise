import React, { useMemo } from 'react';
import { A2uiSurface, basicCatalog } from '@a2ui/react/v0_9';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { WeatherCard } from './WeatherCard';
import { SearchResultsCard } from './SearchResultsCard';
import { BarChartCard } from './BarChartCard';
import { PieChartCard } from './PieChartCard';
import { DataTable } from './DataTable';

export interface A2UIPayload {
  protocol?: string;
  version?: string;
  surfaceId?: string;
  type?: string;
  messages?: any[];
  components?: any[];
  dataModel?: Record<string, any>;
}

interface A2UIRendererProps {
  payload: A2UIPayload;
}

export const A2UIRenderer: React.FC<A2UIRendererProps> = ({ payload }) => {
  if (!payload) return null;

  // Process A2UI message protocol using official @a2ui/web_core MessageProcessor
  const surfaceModel = useMemo(() => {
    try {
      const processor = new MessageProcessor([basicCatalog]);
      const surfaceId = payload.surfaceId || 'surface_default';

      if (payload.messages && Array.isArray(payload.messages)) {
        processor.processMessages(payload.messages);
      } else if (payload.type === 'createSurface') {
        processor.processMessages([payload as any]);
      } else if (payload.components && Array.isArray(payload.components)) {
        processor.processMessages([
          {
            type: 'createSurface',
            surfaceId,
            catalogId: 'basic',
          } as any,
          {
            type: 'updateComponents',
            surfaceId,
            components: payload.components,
          } as any,
        ]);
        if (payload.dataModel) {
          processor.processMessages([
            {
              type: 'updateDataModel',
              surfaceId,
              data: payload.dataModel,
            } as any,
          ]);
        }
      }

      return processor.model.getSurface(surfaceId);
    } catch (e) {
      return null;
    }
  }, [payload]);

  // If official A2UI SurfaceModel resolved, render through official @a2ui/react surface component!
  if (surfaceModel) {
    return (
      <div className="a2ui-official-surface my-3 p-1 border border-[#1a1f2c] rounded-xl bg-[#0c0e15] shadow-lg">
        <A2uiSurface surface={surfaceModel} />
      </div>
    );
  }

  // Fallback for custom specialized widgets
  const surfaceComponents = payload.components || [];

  return (
    <div className="a2ui-surface-wrapper space-y-3 my-3">
      {surfaceComponents.map((comp: any, idx: number) => {
        const type = comp.type || comp.component;
        const props = comp.props || comp;

        if (type === 'WeatherCard') return <WeatherCard key={comp.id || idx} {...props} />;
        if (type === 'SearchResultsCard') return <SearchResultsCard key={comp.id || idx} {...props} />;
        if (type === 'BarChart' || type === 'BarChartCard') return <BarChartCard key={comp.id || idx} {...props} />;
        if (type === 'PieChart' || type === 'PieChartCard') return <PieChartCard key={comp.id || idx} {...props} />;
        if (type === 'DataTable' || type === 'Table' || type === 'DataGrid') return <DataTable key={comp.id || idx} {...props} />;

        return null;
      })}
    </div>
  );
};
