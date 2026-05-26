import React from "react";
import { Edit2, Trash2, Calendar, DollarSign, FileText, Clock } from "lucide-react";
import "./PaymentList.css";

function PaymentList({ payments, onEdit, onDelete }) {
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "—";
    }
  };

  const handleDelete = async (payment) => {
    if (window.confirm(`Вы уверены, что хотите удалить платеж на сумму ${formatCurrency(payment.amount)} ₽?\n\nЭто действие нельзя отменить.`)) {
      onDelete(payment.payment_id);
    }
  };

  if (!payments || payments.length === 0) {
    return (
      <div className="emptyPaymentList">
        <p>Платежей пока нет</p>
      </div>
    );
  }

  const totalAmount = payments.reduce((sum, payment) => {
    return sum + (parseFloat(payment.amount) || 0);
  }, 0);

  const averageAmount = payments.length > 0 
    ? Math.round(totalAmount / payments.length) 
    : 0;

  const lastPayment = payments.length > 0 ? payments[0] : null;

  return (
    <div className="paymentList">
      <div className="paymentSummary">
        <div className="summaryItem">
          <span className="summaryLabel">Всего платежей</span>
          <span className="summaryValue">{payments.length}</span>
        </div>
        <div className="summaryItem">
          <span className="summaryLabel">Общая сумма</span>
          <span className="summaryValue totalAmount">{formatCurrency(totalAmount)} ₽</span>
        </div>
        <div className="summaryItem">
          <span className="summaryLabel">Средний платеж</span>
          <span className="summaryValue">{formatCurrency(averageAmount)} ₽</span>
        </div>
        {lastPayment && (
          <div className="summaryItem">
            <span className="summaryLabel">Последний платеж</span>
            <span className="summaryValue">{formatDate(lastPayment.payment_date)}</span>
          </div>
        )}
      </div>

      <div className="paymentListContainer">
        <table className="paymentTable">
          <thead>
            <tr>
              <th className="tableHeader">Дата</th>
              <th className="tableHeader">Сумма</th>
              <th className="tableHeader">Описание</th>
              <th className="tableHeader">Добавлен</th>
              <th className="tableHeader actionsHeader">Действия</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.payment_id} className="tableRow">
                <td className="tableCell dateCell">
                  {formatDate(payment.payment_date)}
                </td>
                <td className="tableCell amountCell">
                  {formatCurrency(payment.amount)} ₽
                </td>
                <td className="tableCell descriptionCell" title={payment.description || "—"}>
                  {payment.description || "—"}
                </td>
                <td className="tableCell dateCell">
                  {formatDateTime(payment.created_at)}
                </td>
                <td className="tableCell actionsCell">
                  <button
                    onClick={() => onEdit(payment)}
                    className="actionButton editButtonPayment"
                    title="Редактировать платеж"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(payment)}
                    className="actionButton deleteButton"
                    title="Удалить платеж"
                  >
                    <Trash2 size={14} />
                  </button>
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