import React from 'react';
import { Search, Globe } from 'lucide-react';

interface SearchResultsCardProps {
  query: string;
  summary: string;
  sourceCount?: number;
}

export const SearchResultsCard: React.FC<SearchResultsCardProps> = ({
  query,
  summary,
  sourceCount = 0,
}) => {
  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1E1E1E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-xl p-4 my-2 text-[#1F1E1D] dark:text-[#F4F4F5] shadow-xs transition-colors">
      <div className="flex items-center justify-between border-b border-[#E5E2DC] dark:border-[#2E2D2B] pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Search Grounding: "{query}"
          </span>
        </div>
        {sourceCount > 0 && (
          <span className="text-[11px] text-[#716E68] dark:text-[#9E9B94] bg-[#F3F1EC] dark:bg-[#282826] px-2 py-0.5 rounded flex items-center gap-1">
            <Globe className="w-3 h-3 text-[#716E68] dark:text-[#9E9B94]" />
            {sourceCount} sources cited
          </span>
        )}
      </div>
      <div className="text-xs text-[#52504C] dark:text-[#D1CFCA] leading-relaxed font-sans max-h-48 overflow-y-auto pr-1">
        {summary}
      </div>
    </div>
  );
};
