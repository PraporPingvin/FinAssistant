import React, { useState } from "react";
import { Calendar, Check, DollarSign, FileText, X } from "lucide-react";
import "./PaymentForm.css";

function PaymentForm({ goal, onSubmit, onCancel }) {
  const defaultAmount = goal?.monthly_contribution
    ? Math.round(Number(goal.monthly_contribution)).toString()
    : "";

  const [formData, setFormData] = useState({
    amount: defaultAmount,
    payment_date: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "amount") {
      setFormData((prev) => ({ ...prev, [name]: value.replace(/[^\d]/g, "") }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Введите корректную сумму";
    }

    if (!formData.payment_date) {
      newErrors.payment_date = "Выберите дату платежа";
    } else if (new Date(formData.payment_date) > new Date()) {
      newErrors.payment_date = "Дата платежа не может быть в будущем";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Введите описание платежа";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
      });

      setFormData({
        amount: defaultAmount,
        payment_date: new Date().toISOString().split("T")[0],
        description: "",
      });
      setErrors({});
    } catch (error) {
      console.error("Ошибка отправки формы:", error);
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "0";
    return new Intl.NumberFormat("ru-RU").format(parseFloat(value));
  };

  return (
    <form onSubmit={handleSubmit} className="paymentForm">
      <div className="paymentFormIntro">
        <span>Новый платеж</span>
        <strong>{goal?.title}</strong>
      </div>

      <div className="formGroup">
        <label htmlFor="amount" className="formLabel">
          <DollarSign size={14} /> Сумма платежа <span className="required">*</span>
        </label>
        <input
          id="amount"
          name="amount"
          type="text"
          placeholder="10 000"
          value={formData.amount}
          onChange={handleChange}
          className={`formInput ${errors.amount ? "formInputError" : ""}`}
          disabled={submitting}
        />
        {formData.amount && <div className="currencyPreview">{formatCurrency(formData.amount)} ₽</div>}
        {defaultAmount && (
          <div className="formHint">
            Сумма подставлена из планового взноса цели. Ее можно изменить, если нужно.
          </div>
        )}
        {errors.amount && <div className="formError">{errors.amount}</div>}
      </div>

      <div className="formGroup">
        <label htmlFor="payment_date" className="formLabel">
          <Calendar size={14} /> Дата платежа <span className="required">*</span>
        </label>
        <input
          id="payment_date"
          name="payment_date"
          type="date"
          value={formData.payment_date}
          onChange={handleChange}
          className={`formInput ${errors.payment_date ? "formInputError" : ""}`}
          max={new Date().toISOString().split("T")[0]}
          disabled={submitting}
        />
        {errors.payment_date && <div className="formError">{errors.payment_date}</div>}
      </div>

      <div className="formGroup">
        <label htmlFor="description" className="formLabel">
          <FileText size={14} /> Описание платежа <span className="required">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="Например: зарплата, премия, подарок или перевод из накоплений"
          value={formData.description}
          onChange={handleChange}
          className={`formTextarea ${errors.description ? "formInputError" : ""}`}
          disabled={submitting}
          rows="3"
        />
        {errors.description && <div className="formError">{errors.description}</div>}
      </div>

      {errors.submit && <div className="submitError">{errors.submit}</div>}

      <div className="formButtons">
        <button type="button" onClick={onCancel} className="formButton cancelButton" disabled={submitting}>
          <X size={16} /> Отмена
        </button>
        <button type="submit" className="formButton submitButton" disabled={submitting}>
          <Check size={16} /> {submitting ? "Добавляем..." : "Добавить платеж"}
        </button>
      </div>
    </form>
  );
}

export default PaymentForm;
