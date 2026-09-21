import React, { useState } from 'react';
import { Copy, Check, RotateCcw, Pencil } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

interface MessageActionBarProps {
  role: 'user' | 'assistant';
  content: string;
  time?: string;
  onRetry: () => void;
  onEdit?: () => void;
  disabled?: boolean;
}

export const MessageActionBar: React.FC<MessageActionBarProps> = ({
  role,
  content,
  time,
  onRetry,
  onEdit,
  disabled = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (copied) return;
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1.5 px-0.5 select-none text-[#716E68] dark:text-[#9E9B94]">
      {/* Time display for User messages if positioned before buttons */}
      {role === 'user' && time && (
        <span className="text-[11px] mr-1.5 font-normal opacity-70">
          {time}
        </span>
      )}

      {/* USER ACTION BUTTONS */}
      {role === 'user' && (
        <>
          {/* Retry User Query */}
          <div className="relative group/btn">
            <button
              onClick={onRetry}
              disabled={disabled}
              className="p-1 hover:bg-[#E5E2DC]/70 dark:hover:bg-[#2A2A28] rounded-md transition-colors disabled:opacity-40 cursor-pointer"
              aria-label="Retry"
            >
              <RotateCcw className="w-3.5 h-3.5 hover:text-[#1F1E1D] dark:hover:text-[#F4F4F5]" />
            </button>
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1F1E1D] dark:bg-[#2E2D2B] text-white dark:text-[#F4F4F5] text-[10px] px-1.5 py-0.5 rounded shadow-md pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30 font-sans">
              Retry
            </span>
          </div>

          {/* Edit User Query */}
          {onEdit && (
            <div className="relative group/btn">
              <button
                onClick={onEdit}
                disabled={disabled}
                className="p-1 hover:bg-[#E5E2DC]/70 dark:hover:bg-[#2A2A28] rounded-md transition-colors disabled:opacity-40 cursor-pointer"
                aria-label="Edit"
              >
                <Pencil className="w-3.5 h-3.5 hover:text-[#1F1E1D] dark:hover:text-[#F4F4F5]" />
              </button>
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1F1E1D] dark:bg-[#2E2D2B] text-white dark:text-[#F4F4F5] text-[10px] px-1.5 py-0.5 rounded shadow-md pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30 font-sans">
                Edit
              </span>
            </div>
          )}

          {/* Copy User Text */}
          <div className="relative group/btn">
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-[#E5E2DC]/70 dark:hover:bg-[#2A2A28] rounded-md transition-colors cursor-pointer"
              aria-label="Copy"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 hover:text-[#1F1E1D] dark:hover:text-[#F4F4F5]" />
              )}
            </button>
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1F1E1D] dark:bg-[#2E2D2B] text-white dark:text-[#F4F4F5] text-[10px] px-1.5 py-0.5 rounded shadow-md pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30 font-sans">
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </div>
        </>
      )}

      {/* ASSISTANT ACTION BUTTONS */}
      {role === 'assistant' && (
        <>
          {/* Copy Assistant Response */}
          <div className="relative group/btn">
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-[#E5E2DC]/70 dark:hover:bg-[#2A2A28] rounded-md transition-colors cursor-pointer"
              aria-label="Copy"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 hover:text-[#1F1E1D] dark:hover:text-[#F4F4F5]" />
              )}
            </button>
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1F1E1D] dark:bg-[#2E2D2B] text-white dark:text-[#F4F4F5] text-[10px] px-1.5 py-0.5 rounded shadow-md pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30 font-sans">
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </div>

          {/* Regenerate / Retry Response */}
          <div className="relative group/btn">
            <button
              onClick={onRetry}
              disabled={disabled}
              className="p-1 hover:bg-[#E5E2DC]/70 dark:hover:bg-[#2A2A28] rounded-md transition-colors disabled:opacity-40 cursor-pointer"
              aria-label="Regenerate"
            >
              <RotateCcw className="w-3.5 h-3.5 hover:text-[#1F1E1D] dark:hover:text-[#F4F4F5]" />
            </button>
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1F1E1D] dark:bg-[#2E2D2B] text-white dark:text-[#F4F4F5] text-[10px] px-1.5 py-0.5 rounded shadow-md pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 whitespace-nowrap z-30 font-sans">
              Regenerate response
            </span>
          </div>

          {/* Timestamp for Assistant messages */}
          {time && (
            <span className="text-[11px] ml-1.5 font-normal opacity-70">
              {time}
            </span>
          )}
        </>
      )}
    </div>
  );
};
