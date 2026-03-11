import { Box, Heading, Table, Thead, Tr, Th, Tbody, Td, Button } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import axios from 'axios';

type Order = {
  id: number;
  customerName: string;
  dishName: string;
  quantity: number;
  status: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4003/ws/orders');
    ws.onmessage = ev => {
      const order: Order = JSON.parse(ev.data);
      setOrders(prev => [order, ...prev]);
    };
    // fallback fetch initial list
    axios.get('/api/orders').then(r => setOrders(r.data));
    return () => ws.close();
  }, []);

  const updateStatus = async (id: number, next: string) => {
    await axios.patch(`/api/orders/${id}`, { status: next });
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, status: next } : o)));
  };

  return (
    <Box p={4}>
      <Heading mb={4}>Live Order Queue</Heading>
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>#</Th><Th>Customer</Th><Th>Dish</Th><Th>Qty</Th><Th>Status</Th><Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {orders.map(o => (
            <Tr key={o.id}>
              <Td>{o.id}</Td>
              <Td>{o.customerName}</Td>
              <Td>{o.dishName}</Td>
              <Td>{o.quantity}</Td>
              <Td>{o.status}</Td>
              <Td>
                {o.status === 'pending' && (
                  <Button size="xs" colorScheme="green" onClick={() => updateStatus(o.id,'preparing')}>Start</Button>
                )}
                {o.status === 'preparing' && (
                  <Button size="xs" colorScheme="blue" onClick={() => updateStatus(o.id,'ready')}>Ready</Button>
                )}
                {o.status === 'ready' && (
                  <Button size="xs" colorScheme="purple" onClick={() => updateStatus(o.id,'delivered')}>Done</Button>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
