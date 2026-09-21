import React from 'react';
import { DataTable } from './a2ui/DataTable';
import { PieChartCard } from './a2ui/PieChartCard';

interface FormattedMessageProps {
  content: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content }) => {
  if (!content) return null;

  // Filter out raw tool call syntax or internal tags if any reached the frontend
  const cleanedContent = content
    .replace(/^(?:render_pie_chart|render_bar_chart)[^\n]*\n?/i, '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
    .trim();

  if (!cleanedContent) return null;

  // 1. Check for Markdown table (| col1 | col2 |)
  if (cleanedContent.includes('|') && cleanedContent.split('\n').some((l) => l.trim().startsWith('|'))) {
    const lines = cleanedContent.split('\n');
    const textParts: string[] = [];
    const tableLines: string[] = [];
    let inTable = false;

    lines.forEach((line) => {
      if (line.trim().startsWith('|')) {
        inTable = true;
        tableLines.push(line);
      } else {
        if (inTable) {
          inTable = false;
        }
        textParts.push(line);
      }
    });

    const plainText = textParts.join('\n').trim();
    const tableContent = tableLines.join('\n').trim();

    return (
      <div className="space-y-3 font-sans">
        {plainText && <div className="whitespace-pre-wrap leading-relaxed">{plainText}</div>}
        {tableContent && <DataTable content={tableContent} />}
      </div>
    );
  }

  // 2. Check for bullet percentage distributions (e.g., - China: 20.8% or 1. USA: 18.6%)
  const percentagePattern = /(?:[-*•]|\d+\.)\s*([A-Za-z0-9_\s]{2,25})[:\-=]\s*([0-9]+(?:\.[0-9]+)?)\s*%/g;
  const matches = Array.from(cleanedContent.matchAll(percentagePattern));

  if (matches.length >= 3) {
    const chartData = matches.map((m) => ({
      name: m[1].trim(),
      value: parseFloat(m[2]),
    }));

    return (
      <div className="space-y-3 font-sans">
        <div className="whitespace-pre-wrap leading-relaxed">{cleanedContent}</div>
        <PieChartCard title="Visual Share Distribution" data={chartData} donut={true} />
      </div>
    );
  }

  return <div className="whitespace-pre-wrap leading-relaxed font-sans">{cleanedContent}</div>;
};
