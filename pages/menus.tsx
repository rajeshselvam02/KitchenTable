import { Box, Heading } from '@chakra-ui/react';
import { MenuCalendar } from '../components/MenuCalendar';
import dayjs from 'dayjs';
import { startOfWeek } from 'date-fns';

export default function MenusPage() {
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 }); // Monday as start
  return (
    <Box p={4}>
      <Heading mb={4}>Weekly Menu Builder</Heading>
      <MenuCalendar startDate={monday} days={7} />
    </Box>
  );
}
