import React, { useState, useEffect } from 'react';

const THINKING_VERBS = [
  'Weighing',
  'Thinking...',
  'Synthesizing...',
  'Pondering...',
  'Formulating...',
];

interface ClaudeThinkingIndicatorProps {
  customMessage?: string;
}

export const ClaudeThinkingIndicator: React.FC<ClaudeThinkingIndicatorProps> = ({
  customMessage,
}) => {
  const [verbIndex, setVerbIndex] = useState(0);

  useEffect(() => {
    if (customMessage) return;
    const interval = setInterval(() => {
      setVerbIndex((prev) => (prev + 1) % THINKING_VERBS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [customMessage]);

  const displayVerb = customMessage || THINKING_VERBS[verbIndex];

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-1 select-none animate-fadeIn">
      {/* Signature Claude terracotta sunburst / asterisk glyph with slow smooth spin */}
      <svg
        className="w-4 h-4 text-[#C2410C] dark:text-[#EA580C] animate-spin shrink-0"
        style={{ animationDuration: '3.5s' }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
      >
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
      </svg>

      {/* Dynamic thinking status verb matching Claude design */}
      <span className="text-sm font-medium text-[#716E68] dark:text-[#9E9B94] tracking-normal transition-opacity duration-300">
        {displayVerb}
      </span>
    </div>
  );
};
