import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, RadioGroup, Stack, Radio, Input } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import axios from 'axios';

type Dish = { id: number; name: string };

type Props = {
  onClose: () => void;
  onSelect: (dishId: number, portion: 'regular' | 'large') => void;
};

export const DishPickerModal: React.FC<Props> = ({ onClose, onSelect }) => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [portion, setPortion] = useState<'regular' | 'large'>('regular');

  useEffect(() => {
    axios.get('/api/dishes').then(r => setDishes(r.data));
  }, []);

  const handleConfirm = () => {
    if (selected) onSelect(selected, portion);
  };

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Select a Dish</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <RadioGroup onChange={v => setSelected(Number(v))} value={selected?.toString() ?? ''}>
            <Stack direction="column">
              {dishes.map(d => (
                <Radio key={d.id} value={d.id.toString()}>{d.name}</Radio>
              ))}
            </Stack>
          </RadioGroup>
          <RadioGroup mt={4} onChange={v => setPortion(v as any)} value={portion}>
            <Stack direction="row">
              <Radio value="regular">Regular</Radio>
              <Radio value="large">Large</Radio>
            </Stack>
          </RadioGroup>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} mr={3}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleConfirm} isDisabled={selected===null}>Add</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
