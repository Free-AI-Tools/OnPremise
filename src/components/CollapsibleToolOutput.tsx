import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { A2UIRenderer, A2UIPayload } from './a2ui/A2UIRenderer';

interface CollapsibleToolOutputProps {
  payload: A2UIPayload;
}

export const CollapsibleToolOutput: React.FC<CollapsibleToolOutputProps> = ({ payload }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!payload) return null;

  return (
    <div className="my-2.5 select-none">
      {/* Collapsible reasoning / tool toggle chip matching Claude styling */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#FFFFFF] dark:bg-[#1E1E1E] hover:bg-[#F3F1EC] dark:hover:bg-[#282826] border border-[#E5E2DC] dark:border-[#2E2D2B] text-xs text-[#C2410C] dark:text-[#EA580C] rounded-lg transition-colors font-mono shadow-xs"
      >
        <Brain className="w-3.5 h-3.5 text-[#C2410C] dark:text-[#EA580C]" />
        <span className="font-semibold">{isOpen ? 'Hide Reasoning' : 'Reasoning'}</span>
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
