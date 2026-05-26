// src/pages/Dashboard/Dashboard.jsx (исправленная версия)
import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { getGoals } from "../../api/api";
import GoalCard from "../../components/Goal/GoalCard/GoalCard";
import { useAuth } from "../../context/AuthContext";
import "./Dashboard.css";

function Dashboard() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [totalProgress, setTotalProgress] = useState(0);
  
  const { user, isAuthenticated } = useAuth(); 

  useEffect(() => {
    if (isAuthenticated && user) {
      loadGoals();
    }
  }, [isAuthenticated, user]); 

  const calculateTotalProgress = (goalsList) => {
    if (!goalsList || goalsList.length === 0) return 0;
    
    let totalTarget = 0;
    let totalCurrent = 0;
    
    goalsList.forEach(goal => {
      const target = parseFloat(goal.target_amount) || 0;
      const current = parseFloat(goal.current_amount) || 0;
      
      totalTarget += target;
      totalCurrent += current;
    });
    
    if (totalTarget === 0) return 0;
    
    const progress = Math.round((totalCurrent / totalTarget) * 100);
    return Math.min(Math.max(progress, 0), 100);
  };

  const loadGoals = async (isRefresh = false) => {
    if (!user) return;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log("Загрузка целей для пользователя:", user.id);
      const data = await getGoals(user.id); 
      console.log("Полученные данные:", data);
      
      if (data && Array.isArray(data)) {
        setGoals(data);
        const progress = calculateTotalProgress(data);
        setTotalProgress(progress);
        setError(null);
        setLastUpdate(new Date());
      } else {
        setGoals([]);
        setTotalProgress(0);
      }
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      setError(`Ошибка: ${error.message}`);
      setGoals([]);
      setTotalProgress(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefreshClick = () => {
    loadGoals(true);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    });
  };

  if (!isAuthenticated || !user) {
    return null; // или редирект на логин
  }

  return (
    <Layout>
      <div className="dashboardContainer">
        <div className="dashboardHeader">
          <h1>Финансовый обзор</h1>
          <p>Добро пожаловать, {user.first_name || user.email}!</p>
          <div className="decorativeLine"></div>
        </div>

        {error && (
          <div className="errorMessage">
            <h3>Внимание</h3>
            <p>{error}</p>
          </div>
        )}

        <div className="statsContainer">
          <div className="statCard">
            <h3>Всего целей</h3>
            <div className="statNumber">{goals.length}</div>
          </div>
          <div className="statCard">
            <h3>В процессе</h3>
            <div className="statNumber">
              {goals.filter(g => g.status === "active").length}
            </div>
          </div>
          <div className="statCard">
            <h3>Выполнено</h3>
            <div className="statNumber">
              {goals.filter(g => g.status === "completed").length}
            </div>
          </div>
        </div>

        {goals.length > 0 && (
          <div className="progressSection">
            <div className="progressLabel">
              <span>Общий прогресс по всем целям</span>
              <span className="progressValue">{totalProgress}%</span>
            </div>
            <div className="progressBar">
              <div 
                className="progressFill"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="loadingContainer">
            <div className="loadingAnimation"></div>
            <p>Загружаем ваши цели...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="emptyState">
            <h3>Начните свой финансовый путь</h3>
            <p>Создайте первую цель для отслеживания финансового прогресса.</p>
            <a href="/goals/new" className="createButton">
              Создать первую цель
            </a>
          </div>
        ) : (
          <>
            <div className="goalsTitle">
              Ваши цели
            </div>
            <div className="goalsGrid">
              {goals.map(goal => (
                <GoalCard key={goal.goal_id} goal={goal} />
              ))}
            </div>
          </>
        )}

        <div className="refreshSection">
          <button 
            onClick={handleRefreshClick}
            className="refreshButton"
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <div className="loadingSpinner" />
                Обновление
              </>
            ) : (
              "⟳ Обновить данные"
            )}
          </button>
          
          <div className="lastUpdate">
            Обновлено в {formatTime(lastUpdate)}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;