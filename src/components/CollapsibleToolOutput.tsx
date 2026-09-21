import React, { useState } from 'react';
import { ChevronDown, ChevronRight, PieChart, BarChart3, Sparkles } from 'lucide-react';
import { A2UIRenderer, A2UIPayload } from './a2ui/A2UIRenderer';

interface CollapsibleToolOutputProps {
  payload: A2UIPayload;
}

export const CollapsibleToolOutput: React.FC<CollapsibleToolOutputProps> = ({ payload }) => {
  // Default to open so generated charts and visual cards are immediately visible to the user
  const [isOpen, setIsOpen] = useState(true);

  if (!payload) return null;

  // Detect component type from A2UI payload
  const compType = payload.components?.[0]?.type || '';
  const isPie = compType.includes('Pie');
  const isBar = compType.includes('Bar');

  const label = isPie
    ? 'Interactive Pie Chart'
    : isBar
    ? 'Interactive Bar Chart'
    : compType.includes('Table')
    ? 'Data Table'
    : compType.includes('Search')
    ? 'Search Sources'
    : 'Interactive Visual';

  const IconComponent = isPie ? PieChart : isBar ? BarChart3 : Sparkles;

  return (
    <div className="my-2.5 select-none">
      {/* Visual Artifact toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#FFFFFF] dark:bg-[#1E1E1E] hover:bg-[#F3F1EC] dark:hover:bg-[#282826] border border-[#E5E2DC] dark:border-[#2E2D2B] text-xs text-[#C2410C] dark:text-[#EA580C] rounded-lg transition-colors font-sans shadow-xs cursor-pointer"
      >
        <IconComponent className="w-3.5 h-3.5 text-[#C2410C] dark:text-[#EA580C]" />
        <span className="font-semibold">{isOpen ? `Hide ${label}` : label}</span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-[#716E68] dark:text-[#9E9B94]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[#716E68] dark:text-[#9E9B94]" />
        )}
      </button>

      {/* Expanded Surface Content */}
      {isOpen && (
        <div className="mt-2.5 p-3.5 bg-[#F9F8F5] dark:bg-[#191918] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-xl transition-all shadow-xs">
          <A2UIRenderer payload={payload} />
        </div>
      )}
    </div>
  );
};
