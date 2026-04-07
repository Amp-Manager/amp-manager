import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  Legend,
} from 'recharts';

interface WorkflowStatsProps {
  last7Days: Array<{
    date: string;
    saved: number;
    success: number;
    failure: number;
  }>;
}

export default function WorkflowStats({ last7Days }: WorkflowStatsProps) {
  // Memoize to avoid unnecessary re-renders
  const chartData = useMemo(() => last7Days, [last7Days]);

  if (chartData.length === 0) {
    return (
      <div className="bg-base-100 rounded-lg border border-base-200 p-4 text-center text-base-content/50">
        No workflow data in the last 7 days
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-lg border border-base-200 shadow-sm overflow-hidden h-[280px] flex flex-col">
      <div className="p-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">Workflows – Last 7 Days</h3>
        {/* Optional small total */}
        <span className="text-xs text-base-content/50">
          Total: {chartData.reduce((sum, d) => sum + d.success + d.failure + d.saved, 0)}
        </span>
      </div>

      <div className="flex-1 w-[400px] h-[226px]">
        <ResponsiveContainer width={400} height={228}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 40 }} // extra bottom
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-content)" opacity={0.4} />
            <XAxis
              dataKey="date"
              stroke="var(--color-secondary-content)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--color-secondary-content)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-base-300)',
                borderColor: 'var(--color-base-100)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--color-secondary-content)',
              }}
            />
            <Legend
              verticalAlign="top"
              height={30}
              wrapperStyle={{ fontSize: '11px' }}
            />

            <Line
              type="monotone"
              dataKey="success"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="failure"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1 }}
              activeDot={{ r: 5 }}
            />
            {/* Optional lighter/dashed line */}
            <Line type="monotone" dataKey="saved" stroke="#3b82f6" strokeDasharray="4 2" />

            <Brush
              dataKey="date"
              height={20}
              stroke="#3b82f6"
              fill="var(--color-base-300)"
              travellerWidth={10}
              tickFormatter={(value) => value.slice(0, 6)} // shorten dates
              startIndex={Math.max(0, chartData.length - 7)} // default show all/last 7
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}