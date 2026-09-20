import React from 'react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface PieDataEntry {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartCardProps {
  title?: string;
  data: PieDataEntry[];
  donut?: boolean;
}

const DEFAULT_PALETTE = [
  '#C2410C', // Claude terracotta
  '#818cf8', // indigo
  '#34d399', // emerald
  '#fbbf24', // amber
  '#f472b6', // pink
  '#a78bfa', // purple
  '#38bdf8', // sky
];

export const PieChartCard: React.FC<PieChartCardProps> = ({
  title = 'Distribution',
  data = [],
  donut = true,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1E1E1E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-xl p-4 my-3 text-[#1F1E1D] dark:text-[#F4F4F5] shadow-xs select-none transition-colors">
      <div className="flex items-center gap-2 border-b border-[#E5E2DC] dark:border-[#2E2D2B] pb-2.5 mb-3">
        <PieIcon className="w-4 h-4 text-[#C2410C] dark:text-[#EA580C]" />
        <h4 className="font-semibold text-xs text-[#C2410C] dark:text-[#EA580C]">{title}</h4>
      </div>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={75}
              innerRadius={donut ? 35 : 0}
              paddingAngle={donut ? 4 : 0}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`
              }
              labelLine={{ stroke: isDark ? '#9E9B94' : '#716E68', strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}-${index}`}
                  fill={entry.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#141413' : '#FFFFFF',
                borderColor: isDark ? '#2E2D2B' : '#E5E2DC',
                borderRadius: '8px',
                fontSize: '11px',
                color: isDark ? '#F4F4F5' : '#1F1E1D',
              }}
              itemStyle={{ color: isDark ? '#F4F4F5' : '#1F1E1D' }}
            />
            <Legend
              wrapperStyle={{
                fontSize: '11px',
                color: isDark ? '#9E9B94' : '#716E68',
                paddingTop: '8px',
              }}
            />
          </RePieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
