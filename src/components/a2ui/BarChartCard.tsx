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
import { useTheme } from '../../context/ThemeContext';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = labels.map((label, index) => {
    const row: Record<string, any> = { label };
    series.forEach((s) => {
      row[s.name] = s.data[index] ?? 0;
    });
    return row;
  });

  const colors = ['#C2410C', '#818cf8', '#34d399', '#fbbf24', '#f472b6'];

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#1E1E1E] border border-[#E5E2DC] dark:border-[#2E2D2B] rounded-xl p-4 my-3 text-[#1F1E1D] dark:text-[#F4F4F5] shadow-xs transition-colors">
      <div className="flex items-center gap-2 border-b border-[#E5E2DC] dark:border-[#2E2D2B] pb-2.5 mb-3">
        <BarChart3 className="w-4 h-4 text-[#C2410C] dark:text-[#EA580C]" />
        <h4 className="font-semibold text-xs text-[#C2410C] dark:text-[#EA580C]">{title}</h4>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2E2D2B' : '#E5E2DC'} />
            <XAxis dataKey="label" stroke={isDark ? '#9E9B94' : '#716E68'} fontSize={11} />
            <YAxis stroke={isDark ? '#9E9B94' : '#716E68'} fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#141413' : '#FFFFFF',
                borderColor: isDark ? '#2E2D2B' : '#E5E2DC',
                borderRadius: 8,
                fontSize: 12,
                color: isDark ? '#F4F4F5' : '#1F1E1D',
              }}
              itemStyle={{ color: isDark ? '#F4F4F5' : '#1F1E1D' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4, color: isDark ? '#9E9B94' : '#716E68' }} />
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
