import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  Target,
} from "lucide-react";
import Layout from "../../components/Layout";
import CheckpointsOverview from "./CheckpointsOverview/CheckpointsOverview";
import CheckpointsCalendar from "./CheckpointsCalendar/CheckpointsCalendar";
import CheckpointsProgress from "./CheckpointsProgress/CheckpointsProgress";
import CheckpointsForecast from "./CheckpointsForecast/CheckpointsForecast";
import CheckpointsStats from "./CheckpointsStats/CheckpointsStats";
import "./CheckpointsPage.css";

function CheckpointsPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Обзор", icon: <LayoutDashboard size={16} /> },
    { id: "progress", label: "Прогресс целей", icon: <TrendingUp size={16} /> },
    { id: "forecast", label: "Прогнозы", icon: <BarChart3 size={16} /> },
    { id: "calendar", label: "Календарь", icon: <Calendar size={16} /> },
    { id: "stats", label: "Статистика", icon: <PieChart size={16} /> },
  ];

  return (
    <Layout>
      <div className="checkpointsPage">
        <div className="breadcrumb">
          <Link to="/">
            <Home size={14} />
            Главная
          </Link>
          <span>/</span>
          <span className="current">Контроль и прогнозы</span>
        </div>

        <div className="pageHeaderCheckpoint">
          <h1>
            <Target size={28} />
            Контроль целей и прогнозы
          </h1>
          <p className="headerDescription">
            Отслеживайте прогресс, управляйте контрольными точками и смотрите прогнозы достижения целей
          </p>
        </div>

        <div className="tabsNavigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tabButton ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="tabContent">
          {activeTab === "overview" && <CheckpointsOverview />}
          {activeTab === "progress" && <CheckpointsProgress />}
          {activeTab === "forecast" && <CheckpointsForecast />}
          {activeTab === "calendar" && <CheckpointsCalendar />}
          {activeTab === "stats" && <CheckpointsStats />}
        </div>

        <button
          className="scrollToTop"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ↑
        </button>
      </div>
    </Layout>
  );
}

export default CheckpointsPage;