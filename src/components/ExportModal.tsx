import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ExportModalProps {
  conversationId: string;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ conversationId, onClose }) => {
  const [format, setFormat] = useState<'md' | 'json' | 'pdf'>('md');
  const [includeTools, setIncludeTools] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const res = await fetch(`http://localhost:8000/conversations/${conversationId}`);
      let content = 'Exported conversation content';
      if (res.ok) {
        const data = await res.json();
        content = `# ${data.title}\n\n` + (data.messages || []).map((m: any) => `**${m.role}:** ${m.content}`).join('\n\n');
      }
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#141824] border border-[#232d42] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-6">
        {/* Header matching export.png */}
        <div className="flex items-center justify-between border-b border-[#232d42] pb-4">
          <h3 className="text-base font-semibold text-[#f8fafc]">Export Conversation</h3>
          <button onClick={onClose} className="text-[#64748b] hover:text-[#f8fafc] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Section matching export.png */}
        <div className="space-y-3">
          <label className="text-xs text-[#94a3b8] block font-medium">Format</label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer text-xs text-[#f8fafc]">
              <input
                type="radio"
                name="exportFormat"
                value="md"
                checked={format === 'md'}
                onChange={() => setFormat('md')}
                className="w-4 h-4 accent-[#38bdf8]"
              />
              <span>Markdown (.md)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-xs text-[#f8fafc]">
              <input
                type="radio"
                name="exportFormat"
                value="json"
                checked={format === 'json'}
                onChange={() => setFormat('json')}
                className="w-4 h-4 accent-[#38bdf8]"
              />
              <span>JSON (full data)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer text-xs text-[#f8fafc]">
              <input
                type="radio"
                name="exportFormat"
                value="pdf"
                checked={format === 'pdf'}
                onChange={() => setFormat('pdf')}
                className="w-4 h-4 accent-[#38bdf8]"
              />
              <span>PDF</span>
            </label>
          </div>
        </div>

        {/* Checkbox matching export.png */}
        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer text-xs text-[#f8fafc]">
            <input
              type="checkbox"
              checked={includeTools}
              onChange={(e) => setIncludeTools(e.target.checked)}
              className="w-4 h-4 accent-[#38bdf8] rounded"
            />
            <span>Include tool-call details</span>
          </label>
        </div>

        {/* Action Buttons matching export.png */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#232d42]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-[#60a5fa] hover:bg-[#3b82f6] text-[#090b10] font-semibold text-xs rounded-xl shadow transition-colors"
          >
            Save to file
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 bg-[#141a29] hover:bg-[#1e273b] border border-[#232d42] text-xs font-medium text-[#f8fafc] rounded-xl transition-colors"
          >
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
};
