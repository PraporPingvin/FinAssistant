import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Target,
  TrendingUp,
  CheckCircle,
  RefreshCw,
  Plus,
  AlertCircle,
  PieChart,
} from "lucide-react";
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
      
      const data = await getGoals(user.id);
      
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

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const activeGoals = goals.filter(g => g.status === "active").length;
  const completedGoals = goals.filter(g => g.status === "completed").length;
  const totalSaved = goals.reduce((sum, g) => sum + (parseFloat(g.current_amount) || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + (parseFloat(g.target_amount) || 0), 0);

  return (
    <Layout>
      <div className="dashboardPage">
        <div className="dashboardHeader">
          <div>
            <h1 className="pageTitle">Финансовый обзор</h1>
            <p className="pageSubtitle">
              Добро пожаловать, {user.first_name || user.email || "пользователь"}!
            </p>
          </div>
          <div className="decorativeLine" />
        </div>

        {error && (
          <div className="errorCard">
            <AlertCircle size={20} />
            <div>
              <strong>Ошибка:</strong> {error}
            </div>
          </div>
        )}

        <div className="statsGrid">
          <div className="statCard">
            <div className="statIcon">
              <Target size={28} />
            </div>
            <div className="statNumber">{goals.length}</div>
            <div className="statLabel">Всего целей</div>
          </div>
          <div className="statCard">
            <div className="statIcon">
              <TrendingUp size={28} />
            </div>
            <div className="statNumber">{activeGoals}</div>
            <div className="statLabel">В процессе</div>
          </div>
          <div className="statCard">
            <div className="statIcon">
              <CheckCircle size={28} />
            </div>
            <div className="statNumber">{completedGoals}</div>
            <div className="statLabel">Выполнено</div>
          </div>
          <div className="statCard">
            <div className="statIcon">
              <PieChart size={28} />
            </div>
            <div className="statNumber">{formatCurrency(totalSaved)} ₽</div>
            <div className="statLabel">Всего накоплено</div>
          </div>
        </div>

        {goals.length > 0 && (
          <div className="progressSection">
            <div className="progressHeader">
              <span>Общий прогресс по всем целям</span>
              <span className="progressPercent">{totalProgress}%</span>
            </div>
            <div className="progressBar">
              <div 
                className="progressFill"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
            <div className="progressDetails">
              <span>{formatCurrency(totalSaved)}</span>
              <span>/</span>
              <span>{formatCurrency(totalTarget)} ₽</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loadingContainer">
            <div className="loadingSpinner" />
            <p>Загружаем ваши цели...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="emptyState">
            <Target size={56} />
            <h2>Начните свой финансовый путь</h2>
            <p>Создайте первую цель для отслеживания финансового прогресса.</p>
            <Link to="/goals/new" className="createButton">
              <Plus size={18} />
              Создать первую цель
            </Link>
          </div>
        ) : (
          <>
            <div className="goalsSection">
              <h2 className="goalsTitle">Ваши цели</h2>
              <div className="goalsGrid">
                {goals.map(goal => (
                  <GoalCard key={goal.goal_id} goal={goal} />
                ))}
              </div>
            </div>
          </>
        )}

        <div className="refreshSection">
          <button 
            onClick={handleRefreshClick}
            className="refreshButton"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
            {refreshing ? "Обновление..." : "Обновить данные"}
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