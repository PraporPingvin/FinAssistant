import React from "react";

function Tabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "overview", label: "Обзор" },
    { id: "goals", label: "Цели" },
    { id: "scenarios", label: "Сценарии" },
    { id: "forecast", label: "Прогноз" },
    { id: "payments", label: "Пополнения" },
    { id: "checkpoints", label: "Контрольные точки" },
  ];

  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? "active" : ""}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
