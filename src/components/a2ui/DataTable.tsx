import React from 'react';
import { Table as TableIcon } from 'lucide-react';

interface DataTableProps {
  title?: string;
  headers?: string[];
  rows?: (string | number)[][];
  content?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ title, headers = [], rows = [], content }) => {
  let parsedHeaders = headers;
  let parsedRows = rows;

  if ((!parsedHeaders.length || !parsedRows.length) && content && content.includes('|')) {
    const lines = content.split('\n').filter((l) => l.trim().startsWith('|'));
    if (lines.length >= 2) {
      parsedHeaders = lines[0]
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
      parsedRows = lines.slice(2).map((l) =>
        l
          .split('|')
          .map((s) => s.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      );
    }
  }

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1E1E1E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-xl p-4 my-3 text-xs text-[#1F1E1D] dark:text-[#F4F4F5] shadow-xs overflow-hidden transition-colors">
      {title && (
        <div className="flex items-center gap-2 border-b border-[#E5E2DC] dark:border-[#2E2D2B] pb-2.5 mb-3">
          <TableIcon className="w-4 h-4 text-[#C2410C] dark:text-[#EA580C]" />
          <h4 className="font-semibold text-xs text-[#C2410C] dark:text-[#EA580C]">{title}</h4>
        </div>
      )}

      {parsedHeaders.length > 0 && parsedRows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-[#E5E2DC] dark:border-[#2E2D2B]">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-[#F3F1EC] dark:bg-[#282826] text-[#1F1E1D] dark:text-[#F4F4F5] font-semibold border-b border-[#E5E2DC] dark:border-[#2E2D2B]">
                {parsedHeaders.map((h, i) => (
                  <th key={i} className="px-3.5 py-2.5 border-r border-[#E5E2DC] dark:border-[#2E2D2B] last:border-r-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC] dark:divide-[#2E2D2B] text-[#52504C] dark:text-[#D1CFCA]">
              {parsedRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#FAF9F5] dark:hover:bg-[#242320] transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2.5 border-r border-[#E5E2DC] dark:border-[#2E2D2B] last:border-r-0">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-[#52504C] dark:text-[#D1CFCA] font-sans leading-relaxed">
          {content || 'No tabular data'}
        </div>
      )}
    </div>
  );
};
