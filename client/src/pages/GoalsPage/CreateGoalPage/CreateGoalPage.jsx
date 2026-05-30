import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Plus,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { createGoal } from "../../../api/api";
import "./CreateGoalPage.css";

function getYearWord(value) {
  const abs = Math.abs(value);
  if (abs % 10 === 1 && abs % 100 !== 11) return "год";
  if (abs % 10 >= 2 && abs % 10 <= 4 && (abs % 100 < 10 || abs % 100 >= 20)) return "года";
  return "лет";
}

function getMonthWord(value) {
  const abs = Math.abs(value);
  if (abs % 10 === 1 && abs % 100 !== 11) return "месяц";
  if (abs % 10 >= 2 && abs % 10 <= 4 && (abs % 100 < 10 || abs % 100 >= 20)) return "месяца";
  return "месяцев";
}

function getDayWord(value) {
  const abs = Math.abs(value);
  if (abs % 10 === 1 && abs % 100 !== 11) return "день";
  if (abs % 10 >= 2 && abs % 10 <= 4 && (abs % 100 < 10 || abs % 100 >= 20)) return "дня";
  return "дней";
}

function toDateInputValue(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function CreateGoalPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    target_amount: "",
    monthly_contribution: "",
    initial_amount: "",
    start_date: new Date().toISOString().split("T")[0],
    deadline_date: "",
    description: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [autoDeadline, setAutoDeadline] = useState(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = ["target_amount", "monthly_contribution", "initial_amount"].includes(name)
      ? value.replace(/[^\d]/g, "")
      : value;

    setFormData((prev) => ({ ...prev, [name]: nextValue }));

    if (name === "deadline_date") {
      setAutoDeadline(false);
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = "Введите название цели";
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      newErrors.target_amount = "Введите корректную сумму";
    }
    if (!formData.monthly_contribution || parseFloat(formData.monthly_contribution) <= 0) {
      newErrors.monthly_contribution = "Введите корректный ежемесячный взнос";
    }
    if (!formData.start_date) newErrors.start_date = "Выберите дату начала";
    if (formData.deadline_date && new Date(formData.deadline_date) < new Date(formData.start_date)) {
      newErrors.deadline_date = "Дата завершения не может быть раньше даты начала";
    }

    return newErrors;
  };

  const formatCurrency = (value) => {
    if (!value) return "0";
    return new Intl.NumberFormat("ru-RU").format(parseFloat(value));
  };

  const formatDuration = ({ years, months, days }) => {
    const parts = [];
    if (years > 0) parts.push(`${years} ${getYearWord(years)}`);
    if (months > 0) parts.push(`${months} ${getMonthWord(months)}`);
    if (days > 0 || parts.length === 0) parts.push(`${days} ${getDayWord(days)}`);
    return parts.join(" ");
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const preview = useMemo(() => {
    const target = parseFloat(formData.target_amount) || 0;
    const initial = parseFloat(formData.initial_amount) || 0;
    const monthly = parseFloat(formData.monthly_contribution) || 0;
    const remaining = Math.max(target - initial, 0);
    const exactMonths = monthly > 0 && remaining > 0 ? remaining / monthly : 0;
    const months = monthly > 0 ? Math.ceil(exactMonths) : null;
    const totalDays = monthly > 0 ? Math.ceil(exactMonths * 30.44) : null;
    const yearsPart = totalDays !== null ? Math.floor(totalDays / 365) : 0;
    const monthsPart = totalDays !== null ? Math.floor((totalDays % 365) / 30.44) : 0;
    const daysPart = totalDays !== null ? Math.max(0, Math.round((totalDays % 365) % 30.44)) : 0;
    const startDate = formData.start_date ? new Date(formData.start_date) : new Date();
    const finishDate = totalDays !== null ? new Date(startDate) : null;

    if (finishDate) {
      finishDate.setDate(finishDate.getDate() + totalDays);
    }

    const progress = target > 0 ? Math.min(100, Math.round((initial / target) * 100)) : 0;
    return {
      months,
      progress,
      remaining,
      totalDays,
      yearsPart,
      monthsPart,
      daysPart,
      finishDate,
      deadlineValue: toDateInputValue(finishDate),
      hasForecast: target > 0 && monthly > 0,
      isReached: target > 0 && remaining === 0,
    };
  }, [formData.target_amount, formData.initial_amount, formData.monthly_contribution, formData.start_date]);

  useEffect(() => {
    if (!autoDeadline) return;

    const nextDeadline = preview.isReached
      ? formData.start_date
      : preview.hasForecast
        ? preview.deadlineValue
        : "";

    setFormData((prev) => (
      prev.deadline_date === nextDeadline ? prev : { ...prev, deadline_date: nextDeadline }
    ));
  }, [autoDeadline, formData.start_date, preview.deadlineValue, preview.hasForecast, preview.isReached]);

  const handleAutoDeadline = () => {
    setAutoDeadline(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await createGoal({
        user_id: 1,
        title: formData.title,
        target_amount: parseFloat(formData.target_amount),
        monthly_contribution: parseFloat(formData.monthly_contribution),
        initial_amount: parseFloat(formData.initial_amount) || 0,
        start_date: formData.start_date,
        deadline_date: formData.deadline_date || null,
        description: formData.description,
        status: "active",
      });

      setSuccess(true);
      setTimeout(() => navigate("/goals"), 1200);
    } catch (error) {
      console.error("Ошибка создания цели:", error);
      setErrors({ submit: `Ошибка при создании цели: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {loading && (
        <div className="loadingOverlay">
          <div className="goalFormSpinner" />
          <div className="loadingText">Создание цели...</div>
        </div>
      )}

      <div className="goalFormPage createGoalPage">
        <section className="goalFormHero">
          <div>
            <span className="goalFormEyebrow">
              <Sparkles size={16} />
              Новый финансовый маршрут
            </span>
            <h1>Новая финансовая цель</h1>
            <p>Заполните параметры цели, чтобы сразу увидеть стартовый прогресс и ориентир по срокам.</p>
          </div>
          <div className="goalFormPreviewCard">
            <span>Предпросмотр</span>
            <strong>{preview.progress}%</strong>
            <small>
              {preview.isReached
                ? "Цель уже покрыта стартовой суммой"
                : preview.hasForecast
                  ? `Около ${formatDuration({ years: preview.yearsPart, months: preview.monthsPart, days: preview.daysPart })}`
                  : "Добавьте сумму и взнос для прогноза"}
            </small>
          </div>
        </section>

        {success && (
          <div className="successMessage">
            <Plus size={18} />
            Цель успешно создана. Перенаправляем на страницу целей...
          </div>
        )}

        {errors.submit && (
          <div className="errorMessage">
            <X size={18} />
            {errors.submit}
          </div>
        )}

        <section className="goalFormShell">
          <form onSubmit={handleSubmit} className="goalFormCard">
            <div className="formGroup fullWidth">
              <label htmlFor="title" className="formLabel">Название цели <span className="required">*</span></label>
              <input id="title" name="title" type="text" placeholder="Например: накопить на машину" value={formData.title} onChange={handleChange} className={`formInput ${errors.title ? "formInputError" : ""}`} disabled={loading} />
              {errors.title && <div className="validationError">{errors.title}</div>}
            </div>

            <div className="formRow">
              <div className="formColumn">
                <label htmlFor="target_amount" className="formLabel"><Target size={14} /> Целевая сумма (₽) <span className="required">*</span></label>
                <input id="target_amount" name="target_amount" type="text" placeholder="1 000 000" value={formData.target_amount} onChange={handleChange} className={`formInput ${errors.target_amount ? "formInputError" : ""}`} disabled={loading} />
                {formData.target_amount && <div className="currencyPreview">{formatCurrency(formData.target_amount)} ₽</div>}
                {errors.target_amount && <div className="validationError">{errors.target_amount}</div>}
              </div>

              <div className="formColumn">
                <label htmlFor="monthly_contribution" className="formLabel"><CreditCard size={14} /> Ежемесячный взнос (₽) <span className="required">*</span></label>
                <input id="monthly_contribution" name="monthly_contribution" type="text" placeholder="15 000" value={formData.monthly_contribution} onChange={handleChange} className={`formInput ${errors.monthly_contribution ? "formInputError" : ""}`} disabled={loading} />
                {formData.monthly_contribution && <div className="currencyPreview">{formatCurrency(formData.monthly_contribution)} ₽ в месяц</div>}
                {errors.monthly_contribution && <div className="validationError">{errors.monthly_contribution}</div>}
              </div>
            </div>

            <div className="formRow">
              <div className="formColumn">
                <label htmlFor="initial_amount" className="formLabel"><Wallet size={14} /> Начальная сумма (₽)</label>
                <input id="initial_amount" name="initial_amount" type="text" placeholder="50 000" value={formData.initial_amount} onChange={handleChange} className="formInput" disabled={loading} />
                {formData.initial_amount && <div className="currencyPreview">Уже есть: {formatCurrency(formData.initial_amount)} ₽</div>}
              </div>

              <div className="formColumn">
                <label htmlFor="start_date" className="formLabel"><Calendar size={14} /> Дата начала <span className="required">*</span></label>
                <input id="start_date" name="start_date" type="date" value={formData.start_date} onChange={handleChange} className={`formInput ${errors.start_date ? "formInputError" : ""}`} disabled={loading} />
                {errors.start_date && <div className="validationError">{errors.start_date}</div>}
              </div>
            </div>

            <div className="formGroup fullWidth">
              <div className="deadlineLabelRow">
                <label htmlFor="deadline_date" className="formLabel"><Clock size={14} /> Желаемая дата завершения</label>
                {!autoDeadline && preview.hasForecast && (
                  <button type="button" className="autoDeadlineButton" onClick={handleAutoDeadline} disabled={loading}>
                    Пересчитать автоматически
                  </button>
                )}
              </div>
              <input id="deadline_date" name="deadline_date" type="date" value={formData.deadline_date} onChange={handleChange} className={`formInput ${errors.deadline_date ? "formInputError" : ""}`} min={formData.start_date} disabled={loading} />
              {autoDeadline && preview.hasForecast && <div className="currencyPreview">Дата рассчитана автоматически по ежемесячному взносу.</div>}
              {!autoDeadline && <div className="currencyPreview">Дата изменена вручную.</div>}
              {errors.deadline_date && <div className="validationError">{errors.deadline_date}</div>}
            </div>

            <section className="goalTrajectoryPanel">
              <div className="goalTrajectorySummary">
                <div>
                  <span>Финансовая траектория</span>
                  <strong>{formatCurrency(preview.remaining)} ₽</strong>
                  <p>Осталось до цели с учётом стартовой суммы.</p>
                </div>
                <div className="goalTrajectoryProgress">
                  <strong>{preview.progress}%</strong>
                  <span>стартовый прогресс</span>
                </div>
              </div>

              <div className="miniProgressTrack">
                <div style={{ width: `${preview.progress}%` }} />
              </div>

              <div className="goalTimeEstimate">
                <div className="goalTimeEstimateHeader">
                  <Clock size={16} />
                  <span>Примерный срок</span>
                </div>

                {preview.isReached ? (
                  <strong>Цель уже достигнута</strong>
                ) : preview.hasForecast ? (
                  <>
                    <strong>{formatDuration({ years: preview.yearsPart, months: preview.monthsPart, days: preview.daysPart })}</strong>
                    <div className="goalTimeChips">
                      <span>{preview.months} {getMonthWord(preview.months)}</span>
                      <span>{preview.totalDays} {getDayWord(preview.totalDays)}</span>
                    </div>
                    <p>Желаемая дата завершения: {formatDate(preview.finishDate)}</p>
                  </>
                ) : (
                  <p>Введите целевую сумму и ежемесячный взнос, чтобы увидеть расчет срока.</p>
                )}
              </div>
            </section>
            <div className="formGroup fullWidth">
              <label htmlFor="description" className="formLabel"><FileText size={14} /> Описание цели</label>
              <textarea id="description" name="description" placeholder="Опишите детали вашей цели..." value={formData.description} onChange={handleChange} className="formTextarea" disabled={loading} rows="4" />
            </div>

            <div className="formButtons">
              <button type="button" onClick={() => navigate("/goals")} className="formButton cancelButton" disabled={loading}>Отмена</button>
              <button type="submit" disabled={loading} className="formButton submitButton">
                <Plus size={16} />
                {loading ? "Создание..." : "Создать цель"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Layout>
  );
}

export default CreateGoalPage;
