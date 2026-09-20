import React, { useState } from 'react';
import { X, Download, Copy, Check } from 'lucide-react';

interface ArtifactPanelProps {
  filename?: string;
  language?: string;
  code: string;
  onClose: () => void;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  filename = 'rest_api_example.py',
  language = 'Python',
  code,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lines = code.split('\n');

  return (
    <div className="w-96 bg-[#0c0e15] border-l border-[#1a1f2c] flex flex-col h-full shrink-0 select-none">
      {/* Artifact Header */}
      <div className="h-14 border-b border-[#1a1f2c] px-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#f8fafc]">Artifact</h3>
        <button
          onClick={onClose}
          className="text-[#64748b] hover:text-[#f8fafc] p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Code Header Bar */}
      <div className="px-4 py-2.5 bg-[#090b10] border-b border-[#1a1f2c] flex items-center justify-between text-xs text-[#94a3b8]">
        <span className="font-mono text-[12px]">{filename}</span>
        <span className="text-[11px] text-[#64748b] bg-[#141824] px-2 py-0.5 rounded font-mono">
          {language} ▾
        </span>
      </div>

      {/* Code Editor with Line Numbers */}
      <div className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed bg-[#090b10] text-[#e2e8f0]">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-[#141824]">
                <td className="w-8 select-none text-right pr-4 text-[#475569] text-[11px]">
                  {idx + 1}
                </td>
                <td className="whitespace-pre font-mono text-[#cbd5e1]">{line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-[#1a1f2c] grid grid-cols-2 gap-3 bg-[#0c0e15]">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-[#141a29] hover:bg-[#1e273b] border border-[#232d42] text-xs font-medium text-[#e2e8f0] rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-[#141a29] hover:bg-[#1e273b] border border-[#232d42] text-xs font-medium text-[#e2e8f0] rounded-lg transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
};
