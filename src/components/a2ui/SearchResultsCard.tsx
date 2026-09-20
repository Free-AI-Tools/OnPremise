import React from 'react';
import { Search, ExternalLink, Globe } from 'lucide-react';

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
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 my-2 text-slate-100 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">
            Search Grounding: "{query}"
          </span>
        </div>
        {sourceCount > 0 && (
          <span className="text-[11px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded flex items-center gap-1">
            <Globe className="w-3 h-3 text-slate-400" />
            {sourceCount} sources cited
          </span>
        )}
      </div>
      <div className="text-xs text-slate-300 leading-relaxed font-sans max-h-48 overflow-y-auto pr-1">
        {summary}
      </div>
    </div>
  );
};
