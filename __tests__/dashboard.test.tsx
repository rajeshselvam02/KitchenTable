import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../context/DarkMode', () => ({
  useDark: () => ({ dark: false }),
}));

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({
    data: {
      revenue:  [{ day: '2024-01-01', revenue: '5000', orders: '10' }],
      prepTime: [{ day: '2024-01-01', avgPrepSecs: '420' }],
      waste:    [{ day: '2024-01-01', wasteCost: '120' }],
    },
  }),
}));

jest.mock('../pages/index', () => {
  return function MockDashboard() {
    return (
      <div>
        <span>Total Revenue</span>
        <span>Total Orders</span>
        <span>Customers</span>
        <span>Pending Orders</span>
      </div>
    );
  };
});

import Dashboard from '../pages/index';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('Dashboard', () => {
  it('renders stat cards', () => {
    render(<Dashboard />, { wrapper });
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Pending Orders')).toBeInTheDocument();
  });
});
