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
    <div className="bg-slate-800/90 border border-sky-500/30 rounded-xl p-4 my-2 text-slate-100 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-3">
        <div className="flex items-center gap-2">
          {isRain ? (
            <CloudRain className="w-5 h-5 text-sky-400" />
          ) : isSun ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Cloud className="w-5 h-5 text-slate-400" />
          )}
          <h4 className="font-semibold text-sm text-sky-300">{title}</h4>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded">
          <Thermometer className="w-3.5 h-3.5 text-rose-400" />
          <span>Live Weather Widget</span>
        </div>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed font-sans">{summary}</p>
    </div>
  );
};
