import React, { useState } from "react";
import { Calendar, Edit2, FileText, Trash2 } from "lucide-react";
import ModernDialog from "../../ModernDialog/ModernDialog";
import "./PaymentList.css";

function PaymentList({ payments, onEdit, onDelete }) {
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  const sortedPayments = [...payments].sort((a, b) => {
    const dateDiff = new Date(b.payment_date) - new Date(a.payment_date);
    if (dateDiff !== 0) return dateDiff;

    const createdDiff = new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (createdDiff !== 0) return createdDiff;

    return Number(b.payment_id || 0) - Number(a.payment_id || 0);
  });

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

  const handleConfirmDelete = () => {
    if (!paymentToDelete) return;
    onDelete(paymentToDelete.payment_id);
    setPaymentToDelete(null);
  };

  if (!payments || payments.length === 0) {
    return (
      <div className="emptyPaymentList">
        <p>Платежей пока нет</p>
      </div>
    );
  }

  return (
    <div className="paymentList">
      <div className="paymentTimeline">
        {sortedPayments.map((payment, index) => (
          <article key={payment.payment_id} className="paymentTimelineCard">
            <div className="paymentTimelineMarker">
              <span>{sortedPayments.length - index}</span>
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
                    onClick={() => setPaymentToDelete(payment)}
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

      <ModernDialog
        open={Boolean(paymentToDelete)}
        variant="danger"
        eyebrow="Платежи"
        title="Удалить платеж?"
        description={
          paymentToDelete
            ? `Платеж на сумму ${formatCurrency(paymentToDelete.amount)} ₽ будет удален без возможности отмены.`
            : ""
        }
        cancelText="Отмена"
        confirmText="Удалить"
        onCancel={() => setPaymentToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default PaymentList;
