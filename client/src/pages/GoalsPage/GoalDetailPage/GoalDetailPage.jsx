// client/src/pages/GoalsPage/GoalDetailPage/GoalDetailPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  useParams,
  useNavigate,
  Link,
} from "react-router-dom";

import {
  Home,
  Target,
  Pencil,
  Trash2,
  CreditCard,
  LineChart,
  Sparkles,
  Calendar,
  Wallet,
  TrendingUp,
} from "lucide-react";

import Layout from "../../../components/Layout";

import {
  getGoal,
  deleteGoal,
} from "../../../api/api";

import "./GoalDetailPage.css";

function GoalDetailPage() {
  const { goalId } = useParams();

  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [
    showDeleteConfirm,
    setShowDeleteConfirm,
  ] = useState(false);

  const [deleting, setDeleting] =
    useState(false);

  useEffect(() => {
    if (goalId) {
      loadGoal();
    }
  }, [goalId]);

  const loadGoal = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getGoal(goalId);

      setGoal(data);

    } catch (error) {
      console.error(
        "Ошибка загрузки цели:",
        error
      );

      setError(
        "Не удалось загрузить данные цели"
      );

    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async () => {
    try {
      setDeleting(true);

      await deleteGoal(goalId);

      navigate("/goals");

    } catch (error) {
      console.error(
        "Ошибка удаления цели:",
        error
      );

      setError("Не удалось удалить цель");

      setShowDeleteConfirm(false);

    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(
      "ru-RU",
      {
        style: "currency",
        currency: "RUB",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }
    ).format(Number(amount || 0));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";

    try {
      return new Date(
        dateString
      ).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

    } catch {
      return "—";
    }
  };

  const calculations = useMemo(() => {
    if (!goal) {
      return {
        currentAmount: 0,
        targetAmount: 0,
        remainingAmount: 0,
        progress: 0,
        estimatedMonths: null,
      };
    }

    const currentAmount = Number(
      goal.current_amount || 0
    );

    const targetAmount = Number(
      goal.target_amount || 0
    );

    const monthlyContribution =
      Number(
        goal.monthly_contribution || 0
      );

    const remainingAmount = Math.max(
      0,
      targetAmount - currentAmount
    );

    const progress = targetAmount
      ? Math.min(
          100,
          Math.round(
            (currentAmount /
              targetAmount) *
              100
          )
        )
      : 0;

    const estimatedMonths =
      monthlyContribution > 0
        ? Math.ceil(
            remainingAmount /
              monthlyContribution
          )
        : null;

    return {
      currentAmount,
      targetAmount,
      remainingAmount,
      progress,
      estimatedMonths,
    };
  }, [goal]);

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner" />

          <p className="loadingText">
            Загружаем данные цели...
          </p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="errorContainer">
          <div className="errorCard">
            <h2>
              Ошибка загрузки
            </h2>

            <p>
              {error ||
                "Цель не найдена"}
            </p>

            <button
              onClick={() =>
                navigate("/goals")
              }
              className="backButton"
            >
              Вернуться к целям
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="goalDetailPage">

        {/* BREADCRUMB */}

        <div className="breadcrumb">
          <Link to="/">
            <Home size={16} />
            Главная
          </Link>

          <span>/</span>

          <Link to="/goals">
            <Target size={16} />
            Цели
          </Link>

          <span>/</span>

          <span className="current">
            {goal.title}
          </span>
        </div>

        {/* HERO */}

        <div className="goalHero">

          <div className="goalHeroTop">

            <div>
              <div
                className={`statusBadge status-${goal.status}`}
              >
                {goal.status === "active"
                  ? "Активна"
                  : "Завершена"}
              </div>

              <h1 className="goalTitle">
                {goal.title}
              </h1>

              {goal.description && (
                <p className="goalDescription">
                  {goal.description}
                </p>
              )}
            </div>

            <div className="heroActions">

              <Link
                to={`/goals/${goalId}/edit`}
                className="heroButton primaryButton"
              >
                <Pencil size={18} />
                Редактировать
              </Link>

              <button
                onClick={() =>
                  setShowDeleteConfirm(
                    true
                  )
                }
                className="heroButton dangerButton"
              >
                <Trash2 size={18} />
                Удалить
              </button>

            </div>

          </div>

          {/* PROGRESS */}

          <div className="progressCard">

            <div className="progressHeader">

              <div>
                <div className="progressLabel">
                  Прогресс накоплений
                </div>

                <div className="progressPercent">
                  {
                    calculations.progress
                  }
                  %
                </div>
              </div>

              <div className="progressAmounts">
                <span>
                  {formatCurrency(
                    calculations.currentAmount
                  )}
                </span>

                <span className="divider">
                  /
                </span>

                <span>
                  {formatCurrency(
                    calculations.targetAmount
                  )}
                </span>
              </div>

            </div>

            <div className="progressBar">
              <div
                className="progressFill"
                style={{
                  width: `${calculations.progress}%`,
                }}
              />
            </div>

            <div className="progressStats">

              <div className="statCard">
                <div className="statLabel">
                  Осталось накопить
                </div>

                <div className="statValue">
                  {formatCurrency(
                    calculations.remainingAmount
                  )}
                </div>
              </div>

              <div className="statCard">
                <div className="statLabel">
                  Ежемесячный взнос
                </div>

                <div className="statValue">
                  {formatCurrency(
                    goal.monthly_contribution
                  )}
                </div>
              </div>

              <div className="statCard">
                <div className="statLabel">
                  Примерный срок
                </div>

                <div className="statValue">
                  {calculations.estimatedMonths
                    ? `${calculations.estimatedMonths} мес.`
                    : "—"}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* INFO GRID */}

        <div className="infoGridGoalDetail">

          <div className="infoCardGoalDetail">
            <Wallet size={22} />

            <div>
              <div className="infoLabel">
                Стартовая сумма
              </div>

              <div className="infoValue">
                {formatCurrency(
                  goal.initial_amount || 0
                )}
              </div>
            </div>
          </div>

          <div className="infoCardGoalDetail">
            <Calendar size={22} />

            <div>
              <div className="infoLabel">
                Дата начала
              </div>

              <div className="infoValue">
                {formatDate(
                  goal.start_date
                )}
              </div>
            </div>
          </div>

          <div className="infoCardGoalDetail">
            <Target size={22} />

            <div>
              <div className="infoLabel">
                Дедлайн
              </div>

              <div className="infoValue">
                {goal.deadline_date
                  ? formatDate(
                      goal.deadline_date
                    )
                  : "Не установлен"}
              </div>
            </div>
          </div>

          <div className="infoCardGoalDetail">
            <TrendingUp size={22} />

            <div>
              <div className="infoLabel">
                Статус
              </div>

              <div className="infoValue">
                {goal.status === "active"
                  ? "В процессе"
                  : "Завершена"}
              </div>
            </div>
          </div>

        </div>

        {/* ACTIONS */}

        <div className="actionSection">

          <Link
            to={`/goals/${goalId}/payments`}
            className="actionCard"
          >
            <CreditCard size={22} />

            <div>
              <h3>
                Управление платежами
              </h3>

              <p>
                Просмотр и добавление
                платежей
              </p>
            </div>
          </Link>

          <Link
            to={`/scenarios/${goalId}`}
            className="actionCard"
          >
            <LineChart size={22} />

            <div>
              <h3>
                Сценарии достижения
              </h3>

              <p>
                Анализ вариантов
                накоплений
              </p>
            </div>
          </Link>

          <Link
            to={`/forecast/${goalId}`}
            className="actionCard"
          >
            <Sparkles size={22} />

            <div>
              <h3>Прогноз</h3>

              <p>
                Прогноз достижения
                цели
              </p>
            </div>
          </Link>

        </div>

        {/* DELETE MODAL */}

        {showDeleteConfirm && (
          <div className="modalOverlay">

            <div className="modalCard">

              <h3>
                Удалить цель?
              </h3>

              <p>
                Это действие нельзя
                отменить.
              </p>

              <div className="modalActions">

                <button
                  onClick={() =>
                    setShowDeleteConfirm(
                      false
                    )
                  }
                  className="modalButton cancelModalButton"
                >
                  Отмена
                </button>

                <button
                  onClick={
                    handleDeleteGoal
                  }
                  disabled={deleting}
                  className="modalButton deleteModalButton"
                >
                  {deleting
                    ? "Удаление..."
                    : "Удалить"}
                </button>

              </div>

            </div>

          </div>
        )}

      </div>
    </Layout>
  );
}

export default GoalDetailPage;