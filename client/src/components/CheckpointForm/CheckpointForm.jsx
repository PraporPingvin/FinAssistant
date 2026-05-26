import React, { useState } from "react";
import {
  Plus,
  X,
  Calendar,
  DollarSign,
  Flag,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
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

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high": return <Flag size={14} className="priorityHigh" />;
      case "medium": return <Flag size={14} className="priorityMedium" />;
      case "low": return <Flag size={14} className="priorityLow" />;
      default: return null;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case "high": return "Высокий";
      case "medium": return "Средний";
      case "low": return "Низкий";
      default: return "Средний";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkpointForm">
      <div className="formHeader">
        <h3>
          <Plus size={18} />
          Новая контрольная точка
        </h3>
        <button type="button" onClick={onCancel} className="closeButton">
          <X size={18} />
        </button>
      </div>
      
      <p className="formGoalInfo">
        <Flag size={14} />
        Цель: {goalTitle}
      </p>

      <div className="formGroup">
        <label className="formLabel">
          Название <span className="required">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Например: Накопить 50% суммы"
          className={`formInput ${errors.title ? "error" : ""}`}
          disabled={submitting}
        />
        {errors.title && <div className="error">{errors.title}</div>}
      </div>

      <div className="formRow">
        <div className="formGroup">
          <label className="formLabel">
            <DollarSign size={14} />
            Сумма <span className="required">*</span>
          </label>
          <input
            type="number"
            name="target_amount"
            value={formData.target_amount}
            onChange={handleChange}
            placeholder={goalTarget}
            min="0"
            step="1000"
            className={`formInput ${errors.target_amount ? "error" : ""}`}
            disabled={submitting}
          />
          {formData.target_amount && (
            <div className="preview">{formatCurrency(formData.target_amount)} ₽</div>
          )}
          {errors.target_amount && <div className="error">{errors.target_amount}</div>}
        </div>

        <div className="formGroup">
          <label className="formLabel">
            <Calendar size={14} />
            Дата выполнения
          </label>
          <input
            type="date"
            name="target_date"
            value={formData.target_date}
            onChange={handleChange}
            className="formInput"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="formGroup">
        <label className="formLabel">
          <Flag size={14} />
          Приоритет
        </label>
        <select name="priority" value={formData.priority} onChange={handleChange} className="formSelect" disabled={submitting}>
          <option value="high">🔴 Высокий</option>
          <option value="medium">🟡 Средний</option>
          <option value="low">🟢 Низкий</option>
        </select>
      </div>

      <div className="formGroup">
        <label className="formLabel">Описание</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Дополнительная информация..."
          rows="3"
          className="formTextarea"
          disabled={submitting}
        />
      </div>

      {errors.submit && (
        <div className="submitError">
          <AlertCircle size={14} />
          {errors.submit}
        </div>
      )}

      <div className="formButtons">
        <button type="button" onClick={onCancel} className="cancelBtn" disabled={submitting}>
          <X size={14} />
          Отмена
        </button>
        <button type="submit" className="submitBtn" disabled={submitting}>
          <CheckCircle size={14} />
          {submitting ? "Создание..." : "Создать контрольную точку"}
        </button>
      </div>
    </form>
  );
}

export default CheckpointForm;