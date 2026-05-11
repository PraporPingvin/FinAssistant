// client/src/utils/exportUtils.js
export function exportPaymentsToExcel(payments, goalTitle) {
  if (!payments || payments.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  try {
    // Создаем CSV содержимое
    const headers = ['Дата платежа', 'Сумма (₽)', 'Описание', 'Дата создания'];
    const csvRows = [
      [`Цель: ${goalTitle}`],
      [`Всего платежей: ${payments.length}`],
      [`Общая сумма: ${payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('ru-RU')} ₽`],
      [], // Пустая строка
      headers,
    ];

    // Добавляем данные
    payments.forEach(payment => {
      const row = [
        new Date(payment.payment_date).toLocaleDateString('ru-RU'),
        payment.amount.toLocaleString('ru-RU'),
        payment.description,
        new Date(payment.created_at).toLocaleDateString('ru-RU'),
      ];
      csvRows.push(row);
    });

    // Преобразуем в CSV строку
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        // Экранируем кавычки и добавляем их если есть запятые
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    // Создаем Blob и скачиваем
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_${goalTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    alert('✅ Экспорт завершен успешно!');
    
  } catch (error) {
    console.error('Ошибка экспорта:', error);
    alert('❌ Ошибка при экспорте данных');
  }
}

export function exportPaymentsToPDF(payments, goal) {
  // Реализация экспорта в PDF (потребуется библиотека вроде jsPDF)
  alert('Экспорт в PDF будет доступен в следующей версии');
}