import React from "react";
import "./PaymentList.css";

function PaymentList({ payments }) {
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return "—";
    }
  };

  if (!payments || payments.length === 0) {
    return (
      <div className="emptyState">
        <p>Платежей пока нет</p>
      </div>
    );
  }

  // Рассчитываем общую сумму
  const totalAmount = payments.reduce((sum, payment) => {
    return sum + (parseFloat(payment.amount) || 0);
  }, 0);

  // Средний платеж
  const averageAmount = payments.length > 0 
    ? Math.round(totalAmount / payments.length) 
    : 0;

  // Последний платеж
  const lastPayment = payments.length > 0 
    ? payments[0] // Предполагаем, что платежи отсортированы по дате
    : null;

  return (
    <div>
      {/* Сводка */}
      <div className="paymentSummary">
        <div className="summaryItem">
          <span className="summaryLabel">Всего платежей</span>
          <span className="summaryValue">{payments.length}</span>
        </div>
        
        <div className="summaryItem">
          <span className="summaryLabel">Общая сумма</span>
          <span className="totalAmount">
            {formatCurrency(totalAmount)}
            <span className="currency"> ₽</span>
          </span>
        </div>
        
        <div className="summaryItem">
          <span className="summaryLabel">Средний платеж</span>
          <span className="summaryValue">
            {formatCurrency(averageAmount)}
            <span className="currency"> ₽</span>
          </span>
        </div>
        
        {lastPayment && (
          <div className="summaryItem">
            <span className="summaryLabel">Последний платеж</span>
            <span className="summaryValue">
              {formatDate(lastPayment.payment_date)}
            </span>
          </div>
        )}
      </div>

      {/* Таблица */}
      <div className="paymentListContainer">
        <table className="paymentTable">
          <thead>
            <tr>
              <th className="tableHeader">Дата</th>
              <th className="tableHeader">Сумма</th>
              <th className="tableHeader">Описание</th>
              <th className="tableHeader">Добавлен</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.payment_id} className="tableRow">
                <td className="tableCell dateCell">
                  {formatDate(payment.payment_date)}
                </td>
                <td className="tableCell amountCell">
                  {formatCurrency(payment.amount)}
                  <span className="currency"> ₽</span>
                </td>
                <td 
                  className="tableCell descriptionCell descriptionFull" 
                  title={payment.description || "—"}
                >
                  {payment.description || "—"}
                </td>
                <td className="tableCell dateCell">
                  {formatDate(payment.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PaymentList;