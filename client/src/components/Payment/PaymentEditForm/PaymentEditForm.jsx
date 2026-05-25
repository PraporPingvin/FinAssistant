import React, { useState, useEffect } from "react";
import "./PaymentEditForm.css";

function PaymentEditForm({ payment, goal, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    amount: "",
    payment_date: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (payment) {
      setFormData({
        amount: payment.amount.toString(),
        payment_date: payment.payment_date.split('T')[0],
        description: payment.description || "",
      });
    }
  }, [payment]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "amount") {
      const numericValue = value.replace(/[^\d]/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Введите корректную сумму";
    }
    
    if (!formData.payment_date) {
      newErrors.payment_date = "Выберите дату платежа";
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
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        description: formData.description,
      });
    } catch (error) {
      console.error("Ошибка обновления платежа:", error);
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "0";
    const num = parseFloat(value);
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  return (
    <form onSubmit={handleSubmit} className="paymentEditForm">
      <h3 className="editFormTitle">✏️ Редактирование платежа</h3>

      <div className="formGroup">
        <label htmlFor="amount" className="formLabel">
          Сумма платежа (₽) <span className="required">*</span>
        </label>
        <input
          id="amount"
          name="amount"
          type="text"
          placeholder="10000"
          value={formData.amount}
          onChange={handleChange}
          className={`formInput ${errors.amount ? 'formInputError' : ''}`}
          disabled={submitting}
        />
        {formData.amount && (
          <div className="currencyPreview">
            {formatCurrency(formData.amount)} ₽
          </div>
        )}
        {errors.amount && <div className="formError">{errors.amount}</div>}
      </div>

      <div className="formGroup">
        <label htmlFor="payment_date" className="formLabel">
          Дата платежа <span className="required">*</span>
        </label>
        <input
          id="payment_date"
          name="payment_date"
          type="date"
          value={formData.payment_date}
          onChange={handleChange}
          className={`formInput ${errors.payment_date ? 'formInputError' : ''}`}
          max={new Date().toISOString().split("T")[0]}
          disabled={submitting}
        />
        {errors.payment_date && <div className="formError">{errors.payment_date}</div>}
      </div>

      <div className="formGroup">
        <label htmlFor="description" className="formLabel">
          Описание платежа <span className="required">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="Например: Зарплата за март, премия, подарок и т.д."
          value={formData.description}
          onChange={handleChange}
          className={`formTextarea ${errors.description ? 'formInputError' : ''}`}
          disabled={submitting}
        />
        {errors.description && <div className="formError">{errors.description}</div>}
      </div>

      {errors.submit && (
        <div className="submitError">
          ❌ {errors.submit}
        </div>
      )}

      <div className="formButtons">
        <button
          type="button"
          onClick={onCancel}
          className="formButton cancelButton"
          disabled={submitting}
        >
          Отмена
        </button>
        <button
          type="submit"
          className="formButton submitButton"
          disabled={submitting}
        >
          {submitting ? "Сохранение..." : "Сохранить изменения"}
        </button>
      </div>
    </form>
  );
}

export default PaymentEditForm;