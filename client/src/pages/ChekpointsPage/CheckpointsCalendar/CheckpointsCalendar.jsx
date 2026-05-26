import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Target,
  DollarSign,
  Eye,
  AlertCircle,
} from "lucide-react";
import { getCheckpoints, getGoals } from "../../../api/api";
import "./CheckpointsCalendar.css";

function CheckpointsCalendar() {
  const navigate = useNavigate();
  const [checkpoints, setCheckpoints] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [goalsData, checkpointsData] = await Promise.all([
        getGoals(),
        getCheckpoints().catch(() => [])
      ]);
      setGoals(goalsData);
      setCheckpoints(checkpointsData || []);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getCheckpointsForDate = (date) => {
    const dateStr = formatDate(date);
    return checkpoints.filter(cp => {
      if (!cp.target_date) return false;
      const cpDate = new Date(cp.target_date);
      return formatDate(cpDate) === dateStr;
    });
  };

  const getGoalTitle = (goalId) => {
    const goal = goals.find(g => g.goal_id === goalId);
    return goal?.title || "Неизвестная цель";
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed": return "✅";
      case "pending": return "⏳";
      case "overdue": return "⚠️";
      default: return "📌";
    }
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    
    const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const emptyCells = [];
    for (let i = 0; i < adjustedFirstDay; i++) {
      emptyCells.push(<div key={`empty-${i}`} className="calendarDay empty"></div>);
    }
    
    const dayCells = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayCheckpoints = getCheckpointsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate && formatDate(date) === formatDate(selectedDate);
      
      dayCells.push(
        <div 
          key={`day-${day}`} 
          className={`calendarDay ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayCheckpoints.length > 0 ? 'hasCheckpoints' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <span className="dayNumber">{day}</span>
          {dayCheckpoints.length > 0 && (
            <span className="checkpointsIndicator">{dayCheckpoints.length}</span>
          )}
        </div>
      );
    }

    return (
      <>
        <div className="calendarWeekdays">
          {weekDays.map(day => (
            <div key={day} className="weekday">{day}</div>
          ))}
        </div>
        <div className="calendarGrid">
          {emptyCells}
          {dayCells}
        </div>
      </>
    );
  };

  const changeMonth = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + delta);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  if (loading) {
    return (
      <div className="calendarLoading">
        <div className="loadingSpinner" />
        <p>Загрузка календаря...</p>
      </div>
    );
  }

  const selectedDateCheckpoints = selectedDate ? getCheckpointsForDate(selectedDate) : [];

  return (
    <div className="calendarPage">
      <div className="calendarContainer">
        <div className="calendarHeader">
          <button className="monthNav" onClick={() => changeMonth(-1)}>
            <ChevronLeft size={20} />
          </button>
          <h2 className="currentMonth">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button className="monthNav" onClick={() => changeMonth(1)}>
            <ChevronRight size={20} />
          </button>
        </div>

        {renderCalendar()}
      </div>

      {selectedDate && (
        <div className="selectedDateCheckpoints">
          <h3>
            <Calendar size={18} />
            Контрольные точки на {selectedDate.toLocaleDateString('ru-RU')}
            {selectedDateCheckpoints.length === 0 && " — нет"}
          </h3>
          
          {selectedDateCheckpoints.length > 0 && (
            <div className="checkpointsMiniList">
              {selectedDateCheckpoints.map(cp => (
                <div key={cp.checkpoint_id} className="calendarCheckpointItem">
                  <div className="checkpointMiniHeader">
                    <span className="checkpointMiniTitle">{cp.title}</span>
                    <span className="checkpointMiniStatus">
                      {getStatusIcon(cp.status)}
                    </span>
                  </div>
                  <div className="checkpointMiniDetails">
                    <span>
                      <Target size={12} />
                      {getGoalTitle(cp.goal_id)}
                    </span>
                    <span className="checkpointAmount">
                      <DollarSign size={12} />
                      {new Intl.NumberFormat('ru-RU').format(cp.target_amount)} ₽
                    </span>
                  </div>
                  <button 
                    className="viewButton"
                    onClick={() => navigate(`/goals/${cp.goal_id}`)}
                  >
                    <Eye size={14} />
                    Просмотр
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CheckpointsCalendar;