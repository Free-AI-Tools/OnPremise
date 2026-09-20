import React from 'react';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface SeriesItem {
  name: string;
  data: number[];
  color?: string;
}

interface BarChartCardProps {
  title: string;
  labels: string[];
  series: SeriesItem[];
}

export const BarChartCard: React.FC<BarChartCardProps> = ({ title, labels, series }) => {
  // Transform labels + series into Recharts data format
  const chartData = labels.map((label, index) => {
    const row: Record<string, any> = { label };
    series.forEach((s) => {
      row[s.name] = s.data[index] ?? 0;
    });
    return row;
  });

  const colors = ['#38bdf8', '#fbbf24', '#34d399', '#f472b6', '#a78bfa'];

  return (
    <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 my-3 text-slate-100 shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-700/60 pb-2.5 mb-3">
        <BarChart3 className="w-4 h-4 text-sky-400" />
        <h4 className="font-semibold text-xs text-sky-300">{title}</h4>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
            {series.map((s, idx) => (
              <Bar
                key={s.name}
                dataKey={s.name}
                fill={s.color || colors[idx % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </ReBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
