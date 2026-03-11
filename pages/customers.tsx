import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Alert, AlertIcon } from '@chakra-ui/react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  type: string;
}

const fetchCustomers = async (): Promise<Customer[]> => {
  const res = await axios.get('/api/customers');
  return res.data.data; // assuming { data: [...] }
};

export default function CustomersPage() {
  const { data, isLoading, error } = useQuery(['customers'], fetchCustomers);

  if (isLoading) return <Spinner size="xl" />;
  if (error) return (
    <Alert status="error"><AlertIcon/>Failed to load customers</Alert>
  );

  return (
    <Box p={4}>
      <Heading mb={4}>Customers</Heading>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th>Type</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data?.map(c => (
            <Tr key={c.id}>
              <Td>{c.name}</Td>
              <Td>{c.email}</Td>
              <Td>{c.phone}</Td>
              <Td>{c.type}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
