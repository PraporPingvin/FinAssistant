// src/components/CheckpointForm/CheckpointForm.jsx
import React, { useState } from "react";
import "./CheckpointForm.css";

function CheckpointForm({ goalId, goalTitle, goalTarget, currentAmount, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    target_amount: "",
    target_date: "",
    priority: "medium",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Введите название контрольной точки";
    }
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      newErrors.target_amount = "Введите корректную сумму";
    }
    if (formData.target_amount && parseFloat(formData.target_amount) > parseFloat(goalTarget)) {
      newErrors.target_amount = "Сумма не может быть больше целевой суммы цели";
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
        goal_id: goalId,
        title: formData.title.trim(),
        target_amount: parseFloat(formData.target_amount),
        target_date: formData.target_date || null,
        priority: formData.priority,
        description: formData.description || "",
        status: "pending"
      });
      setFormData({
        title: "",
        target_amount: "",
        target_date: "",
        priority: "medium",
        description: "",
      });
    } catch (error) {
      console.error("Ошибка:", error);
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "0";
    return new Intl.NumberFormat('ru-RU').format(parseFloat(value));
  };

  return (
    <form onSubmit={handleSubmit} className="checkpoint-form">
      <h3>➕ Новая контрольная точка</h3>
      <p className="form-goal-info">Цель: {goalTitle}</p>

      <div className="form-group">
        <label>Название *</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Например: Накопить 50% суммы"
          disabled={submitting}
        />
        {errors.title && <div className="error">{errors.title}</div>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Сумма *</label>
          <input
            type="number"
            name="target_amount"
            value={formData.target_amount}
            onChange={handleChange}
            placeholder={goalTarget}
            min="0"
            step="1000"
            disabled={submitting}
          />
          {formData.target_amount && (
            <div className="preview">{formatCurrency(formData.target_amount)} ₽</div>
          )}
          {errors.target_amount && <div className="error">{errors.target_amount}</div>}
        </div>

        <div className="form-group">
          <label>Дата выполнения (опционально)</label>
          <input
            type="date"
            name="target_date"
            value={formData.target_date}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Приоритет</label>
        <select name="priority" value={formData.priority} onChange={handleChange} disabled={submitting}>
          <option value="high">🔴 Высокий</option>
          <option value="medium">🟡 Средний</option>
          <option value="low">🟢 Низкий</option>
        </select>
      </div>

      <div className="form-group">
        <label>Описание</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Дополнительная информация..."
          rows="3"
          disabled={submitting}
        />
      </div>

      {errors.submit && <div className="error submit-error">{errors.submit}</div>}

      <div className="form-buttons">
        <button type="button" onClick={onCancel} className="cancel-btn" disabled={submitting}>
          Отмена
        </button>
        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "Создание..." : "Создать контрольную точку"}
        </button>
      </div>
    </form>
  );
}

export default CheckpointForm;