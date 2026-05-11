// client/src/utils/dateUtils.js
export const formatDateForDisplay = (dateString) => {
  if (!dateString) return "-";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error("Ошибка форматирования даты:", error);
    return dateString;
  }
};

export const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  } catch (error) {
    console.error("Ошибка форматирования даты:", error);
    return "";
  }
};

export const getMonthName = (monthIndex) => {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  return months[monthIndex];
};

export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return "";
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startStr = start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    
    return `${startStr} - ${endStr}`;
  } catch (error) {
    return "";
  }
};