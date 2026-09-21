import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Code2,
  Eye,
  Maximize2,
  Minimize2,
  FileText,
  Table as TableIcon,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface ArtifactProps {
  id?: string;
  filename?: string;
  title?: string;
  type?: 'code' | 'markdown' | 'html' | 'svg' | 'table';
  language?: string;
  code: string;
  onClose: () => void;
}

export const ArtifactPanel: React.FC<ArtifactProps> = ({
  filename = 'artifact.txt',
  title,
  type = 'code',
  language = 'python',
  code,
  onClose,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const isPreviewable =
    type === 'html' ||
    type === 'svg' ||
    type === 'markdown' ||
    type === 'table' ||
    filename.endsWith('.html') ||
    filename.endsWith('.svg') ||
    filename.endsWith('.md') ||
    filename.endsWith('.csv');

  const [activeTab, setActiveTab] = useState<'code' | 'preview'>(
    isPreviewable ? 'preview' : 'code'
  );
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const mime =
      type === 'html'
        ? 'text/html;charset=utf-8'
        : type === 'svg'
        ? 'image/svg+xml;charset=utf-8'
        : type === 'markdown'
        ? 'text/markdown;charset=utf-8'
        : 'text/plain;charset=utf-8';

    const blob = new Blob([code], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lines = code.split('\n');
  const displayTitle = title || filename;

  return (
    <div
      className={`border-l flex flex-col h-full shrink-0 select-text transition-all duration-200 z-20 ${
        isExpanded ? 'w-[780px]' : 'w-[540px]'
      } ${
        isDark
          ? 'bg-[#1A1918] border-[#2E2D2B] text-[#F4F4F5]'
          : 'bg-[#FAF9F5] border-[#E5E2DC] text-[#1F1E1D]'
      }`}
    >
      {/* Top Header Bar */}
      <div
        className={`h-14 border-b px-5 flex items-center justify-between shrink-0 ${
          isDark ? 'border-[#2E2D2B] bg-[#141413]/80' : 'border-[#E5E2DC] bg-[#F3F1EC]/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-3">
          <div className="p-1.5 rounded-lg bg-[#C2410C]/10 text-[#C2410C] dark:text-[#EA580C]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-xs font-semibold truncate">{displayTitle}</h3>
            <span className="text-[10px] text-[#716E68] dark:text-[#9E9B94] font-mono truncate">
              {filename}
            </span>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Preview / Code Toggle */}
          {isPreviewable && (
            <div
              className={`flex items-center p-0.5 rounded-lg border mr-2 text-xs ${
                isDark
                  ? 'bg-[#20201E] border-[#2E2D2B]'
                  : 'bg-[#FFFFFF] border-[#E5E2DC]'
              }`}
            >
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-[#C2410C] text-white font-medium shadow-xs'
                    : 'text-[#716E68] dark:text-[#9E9B94] hover:text-[#1F1E1D] dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'code'
                    ? 'bg-[#C2410C] text-white font-medium shadow-xs'
                    : 'text-[#716E68] dark:text-[#9E9B94] hover:text-[#1F1E1D] dark:hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Code</span>
              </button>
            </div>
          )}

          {/* Expand / Minimize Width */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] text-[#716E68] dark:text-[#9E9B94] hover:text-[#1F1E1D] dark:hover:text-white transition-colors"
            title={isExpanded ? 'Collapse width' : 'Expand width'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] text-[#716E68] dark:text-[#9E9B94] hover:text-[#1F1E1D] dark:hover:text-white transition-colors"
            title="Copy content"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] text-[#716E68] dark:text-[#9E9B94] hover:text-[#1F1E1D] dark:hover:text-white transition-colors"
            title="Download file"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#E5E2DC] dark:hover:bg-[#2E2D2B] text-[#716E68] dark:text-[#9E9B94] hover:text-rose-500 transition-colors ml-1"
            title="Close artifact"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {activeTab === 'preview' ? (
          <div className="flex-1 w-full h-full overflow-auto p-4">
            {type === 'svg' || filename.endsWith('.svg') ? (
              <div
                className="w-full h-full flex items-center justify-center p-6 bg-white dark:bg-[#141413] rounded-xl border border-[#E5E2DC] dark:border-[#2E2D2B]"
                dangerouslySetInnerHTML={{ __html: code }}
              />
            ) : type === 'html' || filename.endsWith('.html') ? (
              <iframe
                title="Artifact HTML Preview"
                srcDoc={code}
                sandbox="allow-scripts allow-same-origin allow-modals"
                className="w-full h-full rounded-xl border border-[#E5E2DC] dark:border-[#2E2D2B] bg-white"
              />
            ) : type === 'table' || filename.endsWith('.csv') ? (
              <div className="overflow-x-auto rounded-xl border border-[#E5E2DC] dark:border-[#2E2D2B] bg-[#FFFFFF] dark:bg-[#20201E]">
                <table className="w-full text-xs text-left">
                  <tbody>
                    {lines.map((row, rIdx) => {
                      const cells = row.split(',').map((c) => c.trim());
                      if (rIdx === 0) {
                        return (
                          <tr key={rIdx} className="border-b font-semibold bg-[#F3F1EC] dark:bg-[#282826]">
                            {cells.map((cell, cIdx) => (
                              <th key={cIdx} className="px-3 py-2 border-r last:border-r-0">
                                {cell}
                              </th>
                            ))}
                          </tr>
                        );
                      }
                      return (
                        <tr key={rIdx} className="border-b last:border-b-0 hover:bg-[#FAF9F5] dark:hover:bg-[#252523]">
                          {cells.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 border-r last:border-r-0 font-mono text-[11px]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 whitespace-pre-wrap font-sans leading-relaxed">
                {code}
              </div>
            )}
          </div>
        ) : (
          /* Code View with Line Numbers */
          <div className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed select-text">
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-[#E5E2DC]/40 dark:hover:bg-[#282826]/40">
                    <td className="w-10 select-none text-right pr-4 text-[#A8A49C] dark:text-[#6E6B65] text-[11px] font-mono align-top">
                      {idx + 1}
                    </td>
                    <td className="whitespace-pre font-mono text-[#1F1E1D] dark:text-[#E2E8F0] break-all">
                      {line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div
        className={`h-9 border-t px-4 flex items-center justify-between text-[11px] text-[#716E68] dark:text-[#9E9B94] shrink-0 font-mono ${
          isDark ? 'border-[#2E2D2B] bg-[#141413]/60' : 'border-[#E5E2DC] bg-[#F3F1EC]/60'
        }`}
      >
        <span>
          {lines.length} lines • {(new Blob([code]).size / 1024).toFixed(1)} KB
        </span>
        <span className="capitalize">{language || type}</span>
      </div>
    </div>
  );
};
