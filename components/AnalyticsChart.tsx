import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

type SeriesItem = { day: string; value: number };

interface Props {
  series: SeriesItem[];
  title: string;
  yLabel: string;
  color?: string;
}

export const AnalyticsChart: React.FC<Props> = ({
  series, title, yLabel, color = '#3b82f6',
}) => (
  <div>
    {title && (
      <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
        {title}
      </p>
    )}
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
          width={48}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6 }}
          formatter={(v: number) => [v.toLocaleString('en-IN'), yLabel]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);
