import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ArrowUp,
  X,
  FileText,
  Cpu,
  Paperclip,
  ScrollText,
  Globe,
  History,
  Check,
  PieChart as PieIcon,
  ChevronRight
} from 'lucide-react';

export interface AttachedFile {
  name: string;
  size: number;
  content: string;
}

interface ClaudeInputCardProps {
  onSend: (text: string, files?: AttachedFile[], toolsExplicitlyEnabled?: boolean) => void;
  disabled?: boolean;
  status?: 'idle' | 'thinking' | 'searching';
  placeholder?: string;
}

export const ClaudeInputCard: React.FC<ClaudeInputCardProps> = ({
  onSend,
  disabled = false,
  status = 'idle',
  placeholder = 'How can I help you today?',
}) => {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [showSkillsSubmenu, setShowSkillsSubmenu] = useState(false);

  // Capability toggles matching Claude flyout menu
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [chartsEnabled, setChartsEnabled] = useState(true);

  // Active skills checklist
  const [activeSkills, setActiveSkills] = useState<Record<string, boolean>>({
    'Trip Planner': true,
    'Deep Research': true,
    'Data Analyst': false,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Close plus flyout on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
        setShowSkillsSubmenu(false);
      }
    };
    if (isPlusMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isPlusMenuOpen]);

  // Keyboard shortcut Ctrl+U for attachments
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || '';
        setAttachedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            content,
          },
        ]);
      };
      reader.readAsText(file);
    });

    e.target.value = '';
    setIsPlusMenuOpen(false);
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if ((!text.trim() && attachedFiles.length === 0) || disabled || status !== 'idle') return;
    onSend(text.trim(), attachedFiles, webSearchEnabled || chartsEnabled);
    setText('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleSkill = (skill: string) => {
    setActiveSkills((prev) => ({ ...prev, [skill]: !prev[skill] }));
  };

  return (
    <div className="w-full bg-[#FFFFFF] dark:bg-[#20201E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-2xl shadow-sm transition-all focus-within:border-[#C2410C]/60 dark:focus-within:border-[#EA580C]/60 focus-within:shadow-md relative">
      {/* Attached Files Preview Chips */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {attachedFiles.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3F1EC] dark:bg-[#1A1918] border border-[#E5E2DC] dark:border-[#2E2D2B] text-xs font-mono text-[#1F1E1D] dark:text-[#F4F4F5]"
            >
              <FileText className="w-3.5 h-3.5 text-[#C2410C] dark:text-[#EA580C]" />
              <span className="truncate max-w-[140px]">{file.name}</span>
              <button
                onClick={() => removeFile(idx)}
                className="hover:text-rose-500 transition-colors ml-1"
                title="Remove file"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Textarea */}
      <div className="p-3.5 pb-2">
        <textarea
          ref={textareaRef}
          value={text}
          disabled={disabled || status !== 'idle'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder={placeholder}
          rows={2}
          className="w-full bg-transparent resize-none text-sm text-[#1F1E1D] dark:text-[#F4F4F5] placeholder-[#716E68] dark:placeholder-[#9E9B94] focus:outline-none leading-relaxed"
        />
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      {/* Bottom Action Toolbar */}
      <div className="px-3 pb-3 flex items-center justify-between gap-2 border-t border-transparent pt-1">
        <div className="flex items-center gap-2 relative" ref={menuRef}>
          {/* Claude '+' Button with Flyout Popover */}
          <button
            type="button"
            onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
            title="Add content, capabilities and skills"
            disabled={disabled || status !== 'idle'}
            className={`p-1.5 rounded-full transition-colors ${
              isPlusMenuOpen
                ? 'bg-[#E5E2DC] dark:bg-[#2E2D2B] text-[#1F1E1D] dark:text-white'
                : 'hover:bg-[#F3F1EC] dark:hover:bg-[#2E2D2B] text-[#716E68] dark:text-[#9E9B94]'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Claude Flyout Menu matching screenshot */}
          {isPlusMenuOpen && (
            <div className="absolute bottom-11 left-0 w-64 bg-[#FFFFFF] dark:bg-[#20201E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-2xl shadow-xl p-1.5 z-40 text-xs text-[#1F1E1D] dark:text-[#F4F4F5] select-none animate-in fade-in zoom-in-95 duration-100">
              {/* Attachment options */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F3F1EC] dark:hover:bg-[#282826] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Paperclip className="w-4 h-4 text-[#716E68] dark:text-[#9E9B94]" />
                  <span>Add files or photos</span>
                </div>
                <span className="text-[10px] text-[#A8A49C] dark:text-[#6E6B65] font-mono">Ctrl+U</span>
              </button>

              <div className="my-1.5 h-px bg-[#E5E2DC] dark:bg-[#2E2D2B]" />

              {/* Skills Submenu Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSkillsSubmenu(!showSkillsSubmenu)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F3F1EC] dark:hover:bg-[#282826] transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <ScrollText className="w-4 h-4 text-[#C2410C] dark:text-[#EA580C]" />
                    <span>Skills</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#A8A49C]" />
                </button>

                {showSkillsSubmenu && (
                  <div className="absolute left-full bottom-0 ml-1.5 w-52 bg-[#FFFFFF] dark:bg-[#20201E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-2xl shadow-xl p-1.5 z-50 text-xs">
                    <div className="px-2 py-1 text-[10px] font-semibold text-[#716E68] dark:text-[#9E9B94] uppercase tracking-wider">
                      Enabled Skills
                    </div>
                    {Object.entries(activeSkills).map(([skill, active]) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#F3F1EC] dark:hover:bg-[#282826] transition-colors text-left"
                      >
                        <span>{skill}</span>
                        {active && <Check className="w-3.5 h-3.5 text-sky-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="my-1.5 h-px bg-[#E5E2DC] dark:bg-[#2E2D2B]" />

              {/* Live Toggles with Checkmarks matching screenshot */}
              <button
                type="button"
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F3F1EC] dark:hover:bg-[#282826] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-[#716E68] dark:text-[#9E9B94]" />
                  <span>Web search</span>
                </div>
                {webSearchEnabled && <Check className="w-4 h-4 text-sky-500 stroke-[2.5]" />}
              </button>

              <button
                type="button"
                onClick={() => setMemoryEnabled(!memoryEnabled)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F3F1EC] dark:hover:bg-[#282826] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-[#716E68] dark:text-[#9E9B94]" />
                  <span>Memory</span>
                </div>
                {memoryEnabled && <Check className="w-4 h-4 text-sky-500 stroke-[2.5]" />}
              </button>

              <button
                type="button"
                onClick={() => setChartsEnabled(!chartsEnabled)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F3F1EC] dark:hover:bg-[#282826] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <PieIcon className="w-4 h-4 text-[#C2410C] dark:text-[#EA580C]" />
                  <span>Interactive charts</span>
                </div>
                {chartsEnabled && <Check className="w-4 h-4 text-sky-500 stroke-[2.5]" />}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Local Model Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3F1EC] dark:bg-[#1A1918] text-[11px] font-mono text-[#716E68] dark:text-[#9E9B94]">
            <Cpu className="w-3 h-3 text-[#C2410C] dark:text-[#EA580C]" />
            <span>Qwen 2.5 3B · Local</span>
          </div>

          {/* Circular Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={(!text.trim() && attachedFiles.length === 0) || disabled || status !== 'idle'}
            className="w-8 h-8 rounded-full bg-[#C2410C] hover:bg-[#9A3412] disabled:bg-[#E5E2DC] dark:disabled:bg-[#2E2D2B] text-white disabled:text-[#A8A49C] dark:disabled:text-[#6E6B65] flex items-center justify-center transition-all active:scale-95 shadow-xs"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
