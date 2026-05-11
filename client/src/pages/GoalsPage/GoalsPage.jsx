import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка целей...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="goals-page-container">
        <div className="goals-header">
          <h1>Мои финансовые цели</h1>
          <Link to="/goals/new" className="create-goal-button">
            + Новая цель
          </Link>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {goals.length === 0 ? (
          <div className="empty-state">
            <h3>У вас пока нет целей</h3>
            <p>Создайте свою первую финансовую цель, чтобы начать отслеживать прогресс</p>
            <Link to="/goals/new" className="create-first-goal">
              Создать первую цель
            </Link>
          </div>
        ) : (
          <div className="goals-grid">
            {goals.map(goal => (
              <GoalCard key={goal.goal_id} goal={goal} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default GoalsPage;