import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

export const useFormattedDate = () => {
  const formatDate = (dateString: string, formatStr: string = 'dd/MM/yyyy') => {
    try {
      return format(parseISO(dateString), formatStr);
    } catch {
      return dateString;
    }
  };

  const getRelativeDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date)) return 'Overdue';
    return formatDate(dateString);
  };

  const getDateStatus = (dateString: string) => {
    const date = parseISO(dateString);
    if (isPast(date)) return 'overdue';
    if (isToday(date)) return 'today';
    if (isTomorrow(date)) return 'tomorrow';
    return 'upcoming';
  };

  return { formatDate, getRelativeDate, getDateStatus };
};