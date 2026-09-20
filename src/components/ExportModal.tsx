import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, CheckCircle, FolderOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ExportModalProps {
  conversationId: string;
  onClose: () => void;
}

interface SavedFileInfo {
  filePath: string;
  fileName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ conversationId, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [format, setFormat] = useState<'md' | 'json' | 'txt'>('md');
  const [includeTools, setIncludeTools] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFileInfo, setSavedFileInfo] = useState<SavedFileInfo | null>(null);

  const handleSaveToFile = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`http://localhost:8000/conversations/${conversationId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          include_tools: includeTools,
        }),
      });

      if (!response.ok) throw new Error('Failed to export conversation');
      const result = await response.json();

      setSavedFileInfo({
        filePath: result.file_path,
        fileName: result.file_name,
      });
      setIsSaving(false);
    } catch (err) {
      console.error('Failed to export conversation:', err);
      setIsSaving(false);
    }
  };

  const handleOpenFile = async () => {
    if (!savedFileInfo) return;
    try {
      await fetch('http://localhost:8000/open-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: savedFileInfo.filePath }),
      });
    } catch (e) {
      console.error('Failed to open file in explorer:', e);
    }
  };

  const handleCopy = async () => {
    try {
      const res = await fetch(`http://localhost:8000/conversations/${conversationId}`);
      if (!res.ok) throw new Error('Failed to fetch conversation');
      const data = await res.json();
      let content = `# ${data.title || 'Conversation'}\n\n`;
      content += (data.messages || [])
        .map((m: any) => `**${m.role}:** ${m.content}`)
        .join('\n\n');

      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy conversation:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className={`border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-6 transition-colors ${
        isDark ? 'bg-[#1E1E1E] border-[#2E2D2B] text-[#F4F4F5]' : 'bg-[#FFFFFF] border-[#E5E2DC] text-[#1F1E1D]'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${
          isDark ? 'border-[#2E2D2B]' : 'border-[#E5E2DC]'
        }`}>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#C2410C] dark:text-[#EA580C]" />
            <h3 className="text-sm font-semibold">Export Conversation</h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'text-[#9E9B94] hover:bg-[#282826]' : 'text-[#716E68] hover:bg-[#F3F1EC]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Saved Success Confirmation Card */}
        {savedFileInfo ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-semibold">File Saved Successfully!</div>
                <div className="text-[11px] opacity-90 break-all font-mono">
                  {savedFileInfo.filePath}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleOpenFile}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white font-medium text-xs rounded-xl shadow-xs transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Show in Folder</span>
              </button>

              <button
                onClick={onClose}
                className={`px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${
                  isDark ? 'bg-[#282826] border-[#2E2D2B] text-white hover:bg-[#333330]' : 'bg-[#F3F1EC] border-[#E5E2DC] text-[#1F1E1D] hover:bg-[#E5E2DC]'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Format Selection Form */
          <>
            <div className="space-y-2.5">
              <label className={`text-xs font-semibold block ${isDark ? 'text-[#9E9B94]' : 'text-[#716E68]'}`}>
                File Format
              </label>
              <div className="space-y-2 text-xs">
                <label className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-[#282826]' : 'hover:bg-[#F3F1EC]'
                }`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="md"
                    checked={format === 'md'}
                    onChange={() => setFormat('md')}
                    className="w-4 h-4 accent-[#C2410C]"
                  />
                  <span className="font-medium">Markdown document (.md)</span>
                </label>

                <label className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-[#282826]' : 'hover:bg-[#F3F1EC]'
                }`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="json"
                    checked={format === 'json'}
                    onChange={() => setFormat('json')}
                    className="w-4 h-4 accent-[#C2410C]"
                  />
                  <span className="font-medium">Raw JSON data (.json)</span>
                </label>

                <label className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-colors ${
                  isDark ? 'hover:bg-[#282826]' : 'hover:bg-[#F3F1EC]'
                }`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="txt"
                    checked={format === 'txt'}
                    onChange={() => setFormat('txt')}
                    className="w-4 h-4 accent-[#C2410C]"
                  />
                  <span className="font-medium">Plain text document (.txt)</span>
                </label>
              </div>
            </div>

            {/* Include Tool Details Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeTools}
                  onChange={(e) => setIncludeTools(e.target.checked)}
                  className="w-4 h-4 accent-[#C2410C] rounded"
                />
                <span className={isDark ? 'text-[#9E9B94]' : 'text-[#716E68]'}>
                  Include tool execution traces
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className={`grid grid-cols-2 gap-3 pt-3 border-t ${
              isDark ? 'border-[#2E2D2B]' : 'border-[#E5E2DC]'
            }`}>
              <button
                onClick={handleSaveToFile}
                disabled={isSaving}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#C2410C] hover:bg-[#9A3412] text-white font-medium text-xs rounded-xl shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save file'}</span>
              </button>

              <button
                onClick={handleCopy}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-xl border transition-colors ${
                  isDark ? 'bg-[#282826] border-[#2E2D2B] text-white hover:bg-[#333330]' : 'bg-[#F3F1EC] border-[#E5E2DC] text-[#1F1E1D] hover:bg-[#E5E2DC]'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
