import { v4 as uuidv4 } from 'uuid';

export const generateRandomColor = () => {
  const hues = [
    '220, 100%, 60%', // Blue
    '280, 100%, 65%', // Purple
    '330, 90%, 65%',  // Pink
    '150, 90%, 45%',  // Green
    '30, 100%, 60%',  // Orange
    '190, 90%, 60%',  // Cyan
  ];
  return `hsl(${hues[Math.floor(Math.random() * hues.length)]})`;
};

export const createEvent = (isParent = true, parentId = null, order = 0, isMilestone = false, type = null) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (isMilestone) {
    // Los hitos son eventos puntuales (mismo start y end)
    end.setTime(start.getTime());
  } else {
    end.setDate(end.getDate() + 5);
  }

  // Determine type if not provided
  let eventType = type;
  if (!eventType) {
    if (isParent) eventType = 'epoch';
    else if (isMilestone) eventType = 'milestone';
    else eventType = 'stage'; // Default sub-event is stage
  }

  return {
    id: uuidv4(),
    title: isMilestone ? 'Nuevo Hito' : (eventType === 'epoch' ? 'Nueva Época' : (eventType === 'stage' ? 'Nueva Etapa' : 'Nuevo Suceso')),
    start,
    end,
    color: isParent ? generateRandomColor() : undefined,
    parentId,
    isParent,
    type: eventType,
    order: order, // Orden vertical para reordenamiento
    isMilestone: isMilestone || false, // Nueva propiedad para identificar hitos
    description: '',
    mediaUrl: '',
    tags: []
  };
};

export const formatDate = (date) => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};
