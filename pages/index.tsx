import { Box, Heading, VStack } from '@chakra-ui/react';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { useQuery } from 'react-query';
import axios from 'axios';

type RevenuePoint = { day: string; revenue: number };
type PrepPoint = { day: string; avgPrepSecs: number };
type WastePoint = { day: string; wasteCost: number };

type Summary = {
  revenue: RevenuePoint[];
  prepTime: PrepPoint[];
  waste: WastePoint[];
};

export default function Dashboard() {
  const { data, isLoading } = useQuery<Summary>('analyticsSummary', async () => {
    const res = await axios.get('/api/analytics/summary');
    return res.data;
  });

  if (isLoading) return <Box>Loading…</Box>;

  const revSeries = data!.revenue.map(r => ({ day: r.day, value: r.revenue }));
  const prepSeries = data!.prepTime.map(p => ({ day: p.day, value: p.avgPrepSecs }));
  const wasteSeries = data!.waste.map(w => ({ day: w.day, value: w.wasteCost }));

  return (
    <VStack spacing={8} align="stretch" p={4}>
      <Heading>Analytics Dashboard</Heading>
      <AnalyticsChart series={revSeries} title="Revenue (last 30 days)" yLabel="USD" color="#38A169" />
      <AnalyticsChart series={prepSeries} title="Average Prep Time" yLabel="seconds" color="#D69E2E" />
      <AnalyticsChart series={wasteSeries} title="Food Waste Cost" yLabel="USD" color="#E53E3E" />
    </VStack>
  );
}
