import { render, screen } from '@testing-library/react';
import Dashboard from '../pages/index';

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { revenue: [], prepTime: [], waste: [] } }),
}));

test('renders Analytics Dashboard heading', async () => {
  render(<Dashboard />);
  const heading = await screen.findByText(/Analytics Dashboard/i);
  expect(heading).toBeInTheDocument();
});
