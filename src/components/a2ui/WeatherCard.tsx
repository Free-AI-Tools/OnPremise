import React from 'react';
import { CloudRain, Sun, Cloud, Thermometer } from 'lucide-react';

interface WeatherCardProps {
  title: string;
  summary: string;
  raw_text?: string;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ title, summary }) => {
  const isRain = summary.toLowerCase().includes('rain');
  const isSun = summary.toLowerCase().includes('sun') || summary.toLowerCase().includes('clear');

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1E1E1E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-xl p-4 my-2 text-[#1F1E1D] dark:text-[#F4F4F5] shadow-xs transition-colors">
      <div className="flex items-center justify-between border-b border-[#E5E2DC] dark:border-[#2E2D2B] pb-2 mb-3">
        <div className="flex items-center gap-2">
          {isRain ? (
            <CloudRain className="w-5 h-5 text-sky-500" />
          ) : isSun ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Cloud className="w-5 h-5 text-[#716E68] dark:text-[#9E9B94]" />
          )}
          <h4 className="font-semibold text-sm text-[#C2410C] dark:text-[#EA580C]">{title}</h4>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#716E68] dark:text-[#9E9B94] bg-[#F3F1EC] dark:bg-[#282826] px-2 py-0.5 rounded">
          <Thermometer className="w-3.5 h-3.5 text-rose-500" />
          <span>Weather Data</span>
        </div>
      </div>
      <p className="text-xs text-[#52504C] dark:text-[#D1CFCA] leading-relaxed font-sans">{summary}</p>
    </div>
  );
};
