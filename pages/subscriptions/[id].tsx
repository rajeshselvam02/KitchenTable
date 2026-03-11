import React from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Box, Heading, Text, Spinner, Alert, AlertIcon } from '@chakra-ui/react';

interface Subscription {
  id: string;
  plan_type: string;
  meal_type: string;
  start_date: string;
  end_date: string;
  status: string;
  auto_renew: boolean;
}

const fetchSubscription = async (id: string): Promise<Subscription> => {
  const res = await axios.get(`/api/subscriptions/${id}`);
  return res.data.data;
};

export default function SubscriptionDetail() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { data, isLoading, error } = useQuery(['subscription', id], () => fetchSubscription(id), {
    enabled: !!id,
  });

  if (isLoading) return <Spinner size="xl" />;
  if (error) return (
    <Alert status="error"><AlertIcon/>Failed to load subscription</Alert>
  );

  return (
    <Box p={4}>
      <Heading mb={4}>Subscription {data?.id}</Heading>
      <Text><strong>Plan:</strong> {data?.plan_type} ({data?.meal_type})</Text>
      <Text><strong>Period:</strong> {data?.start_date} → {data?.end_date}</Text>
      <Text><strong>Status:</strong> {data?.status}</Text>
      <Text><strong>Auto‑renew:</strong> {data?.auto_renew ? 'Yes' : 'No'}</Text>
    </Box>
  );
}
