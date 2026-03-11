import { Box, Flex, IconButton, Text, VStack, Tag, SimpleGrid, Heading } from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import axios from 'axios';
import { DishPickerModal } from './DishPickerModal';

type Dish = { id: number; name: string; cost_per_serving: number };

type DayMenu = { id: number; dish: Dish; portion: 'regular' | 'large' };

type Props = { startDate: Date; days: number };

export const MenuCalendar: React.FC<Props> = ({ startDate, days }) => {
  const [menus, setMenus] = useState<Record<string, DayMenu[]>>({});
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');

  const loadRange = async () => {
    const end = dayjs(startDate).add(days - 1, 'day').toDate();
    const res = await axios.get('/api/menus', {
      params: { start: dayjs(startDate).format('YYYY-MM-DD'), end: dayjs(end).format('YYYY-MM-DD') }
    });
    const grouped: Record<string, DayMenu[]> = {};
    res.data.forEach((m: any) => {
      const key = dayjs(m.day).format('YYYY-MM-DD');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ id: m.id, dish: m.dish, portion: m.portion });
    });
    setMenus(grouped);
  };

  useEffect(() => { loadRange(); }, [startDate, days]);

  const openAdd = (dayKey: string) => {
    setSelectedDay(dayKey);
    setShowModal(true);
  };

  const addDish = async (dishId: number, portion: 'regular' | 'large') => {
    await axios.post('/api/menus', { day: selectedDay, dish_id: dishId, portion });
    setShowModal(false);
    await loadRange();
  };

  const cells = [];
  for (let i = 0; i < days; i++) {
    const day = dayjs(startDate).add(i, 'day');
    const key = day.format('YYYY-MM-DD');
    cells.push(
      <Box key={key} borderWidth="1px" p={2} minH="120px">
        <Flex justify="space-between" align="center">
          <Text fontWeight="bold">{day.format('ddd MMM D')}</Text>
          <IconButton aria-label="Add dish" icon={<AddIcon />} size="sm" onClick={() => openAdd(key)} />
        </Flex>
        <VStack mt={2} spacing={1} align="stretch">
          {menus[key]?.map(m => (
            <Tag key={m.id} size="sm">{m.dish.name} ({m.portion})</Tag>
          ))}
        </VStack>
      </Box>
    );
  }

  return (
    <>
      <SimpleGrid columns={7} spacing={2}>{cells}</SimpleGrid>
      {showModal && <DishPickerModal onClose={() => setShowModal(false)} onSelect={addDish} />}
    </>
  );
};
