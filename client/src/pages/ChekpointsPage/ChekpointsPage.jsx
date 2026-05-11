// client/src/pages/CheckpointsPage/CheckpointsPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import CheckpointsOverview from "./CheckpointsOverview/CheckpointsOverview";
import CheckpointsCalendar from "./CheckpointsCalendar/CheckpointsCalendar";
import CheckpointsProgress from "./CheckpointsProgress/CheckpointsProgress";
import CheckpointsForecast from "./CheckpointsForecast/CheckpointsForecast";
import CheckpointsStats from "./CheckpointsStats/CheckpointsStats";
import "./CheckpointsPage.css";

function CheckpointsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  const tabs = [
    { id: "overview", label: "📋 Обзор"},
    { id: "progress", label: "📊 Прогресс целей" },
    { id: "forecast", label: "🔮 Прогнозы"},
    { id: "calendar", label: "📅 Календарь"},
    { id: "stats", label: "📈 Статистика"},
  ];

  return (
    <Layout>
      <div className="checkpoints-page">
        {/* Хлебные крошки */}
        <div className="breadcrumb">
          <Link to="/">🏠 Главная</Link>
          <span className="separator">›</span>
          <span className="current">Контроль и прогнозы</span>
        </div>

        {/* Заголовок */}
        <div className="page-header">
          <h1>📊 Контроль целей и прогнозы</h1>
          <p className="header-description">
            Отслеживайте прогресс, управляйте контрольными точками и смотрите прогнозы достижения целей
          </p>
        </div>

        {/* Навигационные вкладки */}
        <div className="tabs-navigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Контент в зависимости от выбранной вкладки */}
        <div className="tab-content">
          {activeTab === "overview" && <CheckpointsOverview />}
          {activeTab === "progress" && <CheckpointsProgress />}
          {activeTab === "forecast" && <CheckpointsForecast />}
          {activeTab === "calendar" && <CheckpointsCalendar />}
          {activeTab === "stats" && <CheckpointsStats />}
        </div>

        {/* Кнопка "Наверх" */}
        <button 
          className="scroll-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ↑
        </button>
      </div>
    </Layout>
  );
}

export default CheckpointsPage;