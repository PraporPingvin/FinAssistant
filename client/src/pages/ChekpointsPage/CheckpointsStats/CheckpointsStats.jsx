import React, { useEffect, useState } from "react";
import {
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart,
  List,
  Award,
  Flame,
  Calendar,
  Activity,
  Circle,
  CircleDot,
  CircleCheck,
  Loader,
  AlertTriangle,
  Wallet,
  LineChart,
  Flag,
} from "lucide-react";
import { getGoals, getCheckpoints, getScenarios } from "../../../api/api";
import "./CheckpointsStats.css";

function CheckpointsStats() {
  const [goals, setGoals] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [scenariosMap, setScenariosMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const goalsData = await getGoals();
      const checkpointsData = await getCheckpoints().catch(() => []);
      
      setGoals(goalsData);
      setCheckpoints(checkpointsData || []);
      
      const scenariosTemp = {};
      for (const goal of goalsData) {
        try {
          const scenarios = await getScenarios(goal.goal_id);
          scenariosTemp[goal.goal_id] = scenarios || [];
        } catch (error) {
          scenariosTemp[goal.goal_id] = [];
        }
      }
      setScenariosMap(scenariosTemp);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU').format(amount || 0);
  };

  const calculateStats = () => {
    const totalGoals = goals.length;
    const activeGoals = goals.filter(g => g.status === "active").length;
    const completedGoals = goals.filter(g => g.status === "completed").length;
    
    const totalCheckpoints = checkpoints.length;
    const completedCheckpoints = checkpoints.filter(cp => cp.status === "completed").length;
    const pendingCheckpoints = checkpoints.filter(cp => cp.status === "pending").length;
    const overdueCheckpoints = checkpoints.filter(cp => {
      if (cp.status !== "pending") return false;
      return cp.target_date && new Date(cp.target_date) < new Date();
    }).length;
    
    const highPriority = checkpoints.filter(cp => cp.priority === "high").length;
    const mediumPriority = checkpoints.filter(cp => cp.priority === "medium").length;
    const lowPriority = checkpoints.filter(cp => cp.priority === "low").length;
    
    const totalScenarios = Object.values(scenariosMap).reduce((sum, arr) => sum + arr.length, 0);
    const goalsWithScenarios = goals.filter(g => (scenariosMap[g.goal_id] || []).length > 0).length;
    
    const totalTarget = goals.reduce((sum, g) => sum + (parseFloat(g.target_amount) || 0), 0);
    const totalCurrent = goals.reduce((sum, g) => sum + (parseFloat(g.current_amount) || 0), 0);
    const totalProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    
    return {
      goals: { total: totalGoals, active: activeGoals, completed: completedGoals },
      checkpoints: { 
        total: totalCheckpoints, 
        completed: completedCheckpoints, 
        pending: pendingCheckpoints,
        overdue: overdueCheckpoints,
        completionRate: totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0
      },
      priorities: { high: highPriority, medium: mediumPriority, low: lowPriority },
      scenarios: { total: totalScenarios, goalsWithScenarios },
      finances: {
        totalTarget,
        totalCurrent,
        totalProgress,
        remaining: totalTarget - totalCurrent
      }
    };
  };

  if (loading) {
    return (
      <div className="statsLoading">
        <div className="loadingSpinner" />
        <p>Загрузка статистики...</p>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="statsPage">
      <section className="statsHeroPanel">
        <div className="statsHeroCopy">
          <span>Аналитика контроля</span>
          <h2>Статистика в одном взгляде</h2>
          <p>Главные показатели целей, контрольных точек, приоритетов, финансов и сценариев собраны в компактную сводку.</p>
        </div>
        <div className="statsHeroProgress" style={{ "--progress": `${stats.finances.totalProgress}%` }}>
          <div>
            <strong>{stats.finances.totalProgress}%</strong>
            <span>общий прогресс</span>
          </div>
        </div>
        <div className="statsHeroFacts">
          <div><span>Целей</span><strong>{stats.goals.total}</strong></div>
          <div><span>Точек</span><strong>{stats.checkpoints.total}</strong></div>
          <div><span>Сценариев</span><strong>{stats.scenarios.total}</strong></div>
          <div><span>Осталось</span><strong>{formatCurrency(stats.finances.remaining)} ₽</strong></div>
        </div>
      </section>
      {/* Цели */}
      <div className="statsSection">
        <h3><Target size={18} /> Цели</h3>
        <div className="statsGrid">
          <div className="statCard">
            <div className="statIcon"><BarChart3 size={24} /></div>
            <div className="statContent">
              <div className="statValue">{stats.goals.total}</div>
              <div className="statLabel">Всего целей</div>
            </div>
          </div>
          <div className="statCard">
            <div className="statIcon"><Activity size={24} /></div>
            <div className="statContent">
              <div className="statValue">{stats.goals.active}</div>
              <div className="statLabel">Активных</div>
            </div>
          </div>
          <div className="statCard">
            <div className="statIcon"><Award size={24} /></div>
            <div className="statContent">
              <div className="statValue">{stats.goals.completed}</div>
              <div className="statLabel">Выполнено</div>
            </div>
          </div>
        </div>
      </div>

      {/* Контрольные точки */}
      <div className="statsSection">
        <h3><CheckCircle size={18} /> Контрольные точки</h3>
        <div className="statsGrid">
          <div className="statCard">
            <div className="statIcon"><List size={24} /></div>
            <div className="statContent">
              <div className="statValue">{stats.checkpoints.total}</div>
              <div className="statLabel">Всего точек</div>
            </div>
          </div>
          <div className="statCard">
            <div className="statIcon"><CheckCircle size={24} /></div>
            <div className="statContent">
              <div className="statValue">{stats.checkpoints.completed}</div>
              <div className="statLabel">Выполнено</div>
            </div>
          </div>
          <div className="statCard">
            <div className="statIcon"><Loader size={24} /></div>
            <div className="statContent">
              <div className="statValue">{stats.checkpoints.pending}</div>
              <div className="statLabel">В процессе</div>
            </div>
          </div>
          <div className="statCard warning">
            <div className="statIcon"><AlertTriangle size={24} /></div>
            <div className="statContent">
              <div className="statValue">{stats.checkpoints.overdue}</div>
              <div className="statLabel">Просрочено</div>
            </div>
          </div>
        </div>

        <div className="progressBarContainer">
          <div className="progressLabel">
            <span>Прогресс выполнения</span>
            <span>{stats.checkpoints.completionRate}%</span>
          </div>
          <div className="progressBar">
            <div className="progressFill" style={{ width: `${stats.checkpoints.completionRate}%` }} />
          </div>
        </div>
      </div>

      {/* Приоритеты */}
      <div className="statsSection">
        <h3><Flag size={18} /> Приоритеты</h3>
        <div className="statsGrid priorities">
          <div className="priorityCard high">
            <div className="priorityIcon"><CircleDot size={24} color="#E35D5D" /></div>
            <div className="priorityContent">
              <div className="priorityValue">{stats.priorities.high}</div>
              <div className="priorityLabel">Высокий</div>
            </div>
          </div>
          <div className="priorityCard medium">
            <div className="priorityIcon"><Circle size={24} color="#F5A623" /></div>
            <div className="priorityContent">
              <div className="priorityValue">{stats.priorities.medium}</div>
              <div className="priorityLabel">Средний</div>
            </div>
          </div>
          <div className="priorityCard low">
            <div className="priorityIcon"><CircleCheck size={24} color="#2E7D32" /></div>
            <div className="priorityContent">
              <div className="priorityValue">{stats.priorities.low}</div>
              <div className="priorityLabel">Низкий</div>
            </div>
          </div>
        </div>
      </div>

      {/* Финансы */}
      <div className="statsSection">
        <h3><DollarSign size={18} /> Финансы</h3>
        <div className="statsGrid">
          <div className="statCard">
            <div className="statIcon"><Target size={24} /></div>
            <div className="statContent">
              <div className="statValue">{formatCurrency(stats.finances.totalTarget)} ₽</div>
              <div className="statLabel">Всего нужно</div>
            </div>
          </div>
          <div className="statCard">
            <div className="statIcon"><Wallet size={24} /></div>
            <div className="statContent">
              <div className="statValue">{formatCurrency(stats.finances.totalCurrent)} ₽</div>
              <div className="statLabel">Накоплено</div>
            </div>
          </div>
          <div className="statCard">
            <div className="statIcon"><LineChart size={24} /></div>
            <div className="statContent">
              <div className="statValue">{stats.finances.totalProgress}%</div>
              <div className="statLabel">Общий прогресс</div>
            </div>
          </div>
          <div className="statCard">
            <div className="statIcon"><Clock size={24} /></div>
            <div className="statContent">
              <div className="statValue">{formatCurrency(stats.finances.remaining)} ₽</div>
              <div className="statLabel">Осталось</div>
            </div>
          </div>
        </div>
      </div>

      {/* Сценарии */}
      <div className="statsSection">
        <h3><BarChart3 size={18} /> Сценарии</h3>
        <div className="statsGrid">
          <div className="statCard">
            <div className="statIcon"><TrendingUp size={24} /></div>
            <div className="statContent">
              <div className="statValue">{stats.scenarios.total}</div>
              <div className="statLabel">Всего сценариев</div>
            </div>
          </div>
          <div className="statCard">
            <div className="statIcon"><Target size={24} /></div>
            <div className="statContent">
              <div className="statValue">{stats.scenarios.goalsWithScenarios}</div>
              <div className="statLabel">Целей с прогнозом</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckpointsStats;
