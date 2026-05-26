import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Target,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getGoals } from "../../api/api";
import Layout from "../../components/Layout";
import GoalCard from "../../components/Goal/GoalCard/GoalCard";
import "./GoalsPage.css";

function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await getGoals();
      setGoals(data);
    } catch (err) {
      console.error("Ошибка загрузки целей:", err);
      setError(err.message || "Не удалось загрузить цели");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner" />
          <p className="loadingText">Загружаем ваши цели...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="goalsPage">
        <div className="goalsHero">
          <div className="goalsHeroContent">
            <div className="heroBadge">
              <Sparkles size={16} />
              Финансовое планирование
            </div>
            <h1 className="goalsTitle">Мои цели</h1>
            <p className="goalsSubtitle">
              Отслеживайте накопления, анализируйте прогресс
              и достигайте финансовых целей быстрее.
            </p>
          </div>
          <Link to="/goals/new" className="createGoalButton">
            <Plus size={18} />
            Новая цель
          </Link>
        </div>

        {error && (
          <div className="errorMessage">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {!loading && goals.length === 0 && (
          <div className="emptyState">
            <div className="emptyIcon">
              <Target size={48} />
            </div>
            <h2>У вас пока нет целей</h2>
            <p>
              Создайте первую финансовую цель и начните отслеживать свой прогресс.
            </p>
            <Link to="/goals/new" className="emptyButton">
              <Plus size={18} />
              Создать первую цель
            </Link>
          </div>
        )}

        {goals.length > 0 && (
          <div className="goalsGrid">
            {goals.map((goal) => (
              <GoalCard key={goal.goal_id} goal={goal} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default GoalsPage;