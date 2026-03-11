import { Box, Heading } from '@chakra-ui/react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type SeriesItem = { day: string; value: number };

type Props = {
  series: SeriesItem[];
  title: string;
  yLabel: string;
  color?: string;
};

export const AnalyticsChart: React.FC<Props> = ({ series, title, yLabel, color = '#3182CE' }) => (
  <Box>
    <Heading size="sm" mb={2}>{title}</Heading>
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={series}>
        <XAxis dataKey="day" />
        <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </Box>
);
