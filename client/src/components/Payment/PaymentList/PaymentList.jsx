import React from "react";
import { Calendar, Edit2, FileText, Trash2 } from "lucide-react";
import "./PaymentList.css";

function PaymentList({ payments, onEdit, onDelete }) {
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat("ru-RU").format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const handleDelete = (payment) => {
    if (window.confirm(`Удалить платеж на сумму ${formatCurrency(payment.amount)} ₽? Это действие нельзя отменить.`)) {
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

  const totalAmount = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  const averageAmount = payments.length > 0 ? Math.round(totalAmount / payments.length) : 0;
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

      <div className="paymentTimeline">
        {payments.map((payment, index) => (
          <article key={payment.payment_id} className="paymentTimelineCard">
            <div className="paymentTimelineMarker">
              <span>{index + 1}</span>
            </div>

            <div className="paymentCardBody">
              <div className="paymentCardTopline">
                <div>
                  <span className="paymentDate"><Calendar size={14} /> {formatDate(payment.payment_date)}</span>
                  <strong>{formatCurrency(payment.amount)} ₽</strong>
                </div>
                <div className="paymentActions">
                  <button
                    onClick={() => onEdit(payment)}
                    className="paymentActionButton editButtonPayment"
                    title="Редактировать платеж"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(payment)}
                    className="paymentActionButton deleteButton"
                    title="Удалить платеж"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <p className="paymentDescription"><FileText size={14} /> {payment.description || "Без описания"}</p>
              <small>Добавлен: {formatDateTime(payment.created_at)}</small>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default PaymentList;
