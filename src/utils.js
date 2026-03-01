import { v4 as uuidv4 } from 'uuid';

// Zoom constants (px/day)
export const MIN_ZOOM = 0.0001; // ~75,000 years visible
export const MAX_ZOOM = 1000;   // sub-day detail

// Creates a Date from year/month/day, supporting negative years (BCE)
// JS Date constructor treats years 0-99 as 1900+, so we use setFullYear
export const createDateFromParts = (year, month = 1, day = 1) => {
    const d = new Date(0);
    d.setFullYear(year, month - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Extracts year/month/day from a Date, returning the real year (including negative)
export const getDateParts = (date) => {
    if (!date) return { year: 0, month: 1, day: 1 };
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate()
    };
};

// Formats a year for display on the timeline axis: "500 a.C." or "2024"
export const formatYearLabel = (year) => {
    if (year < 0) return `${Math.abs(year)} a.C.`;
    if (year === 0) return '1 a.C.'; // Year 0 in JS = 1 BC
    return `${year}`;
};

// Human-readable zoom label
export const formatZoomLabel = (pixelsPerDay) => {
    if (pixelsPerDay >= 50) return `${pixelsPerDay.toFixed(0)} px/dia`;
    if (pixelsPerDay >= 1) return `${(1 / pixelsPerDay).toFixed(1)} dias/px`;
    const yearsPerPx = 1 / (pixelsPerDay * 365.25);
    if (yearsPerPx < 100) return `${yearsPerPx.toFixed(0)} años/px`;
    return `${(yearsPerPx / 1000).toFixed(1)}k años/px`;
};

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
  const { year, month, day } = getDateParts(date);
  const sign = year < 0 ? '-' : '';
  const absYear = Math.abs(year);
  const pad4 = String(absYear).padStart(4, '0');
  const pad2m = String(month).padStart(2, '0');
  const pad2d = String(day).padStart(2, '0');
  return `${sign}${pad4}-${pad2m}-${pad2d}`;
};
