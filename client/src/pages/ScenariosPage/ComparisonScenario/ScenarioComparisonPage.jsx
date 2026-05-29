import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  Download,
  Home,
  Plus,
  RefreshCw,
  Target,
  Trophy,
  X,
  Zap,
  Shield,
  Activity,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { getGoals, getScenarios } from "../../../api/api";
import "./ScenarioComparisonPage.css";

function ScenarioComparisonPage() {
  const navigate = useNavigate();
  const { goalId } = useParams();

  const [goals, setGoals] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(goalId || "");
  const [selectedScenarios, setSelectedScenarios] = useState(["", ""]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const goalsData = await getGoals();
      setGoals(goalsData || []);

      const scenarioGroups = await Promise.all(
        (goalsData || []).map((goal) => getScenarios(goal.goal_id).catch(() => []))
      );

      const allScenarios = [];
      (goalsData || []).forEach((goal, index) => {
        (scenarioGroups[index] || []).forEach((scenario) => {
          allScenarios.push({
            ...scenario,
            goal_id: goal.goal_id,
            goal_title: goal.title,
            goal_target: goal.target_amount,
            goal_current: goal.current_amount,
            goal_progress: goal.target_amount > 0
              ? Math.round(((parseFloat(goal.current_amount) || 0) / parseFloat(goal.target_amount)) * 100)
              : 0,
          });
        });
      });

      setScenarios(allScenarios);

      const activeGoalId = goalId || selectedGoal;
      const available = allScenarios.filter((scenario) => scenario.goal_id?.toString() === activeGoalId?.toString());
      if (activeGoalId && available.length >= 2) {
        setSelectedScenarios([available[0].scenario_id.toString(), available[1].scenario_id.toString()]);
      }
    } catch (error) {
      console.error("Ошибка загрузки сравнения:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("ru-RU").format(parseFloat(amount) || 0);

  const filteredScenarios = useMemo(() => {
    if (!selectedGoal) return scenarios;
    return scenarios.filter((scenario) => scenario.goal_id?.toString() === selectedGoal.toString());
  }, [scenarios, selectedGoal]);

  const currentGoal = useMemo(
    () => goals.find((goal) => goal.goal_id?.toString() === selectedGoal?.toString()),
    [goals, selectedGoal]
  );

  useEffect(() => {
    if (!selectedGoal) return;
    const available = scenarios.filter((scenario) => scenario.goal_id?.toString() === selectedGoal.toString());
    if (available.length >= 2) setSelectedScenarios([available[0].scenario_id.toString(), available[1].scenario_id.toString()]);
    else if (available.length === 1) setSelectedScenarios([available[0].scenario_id.toString(), ""]);
    else setSelectedScenarios(["", ""]);
  }, [selectedGoal, scenarios]);

  const calculateRisk = (expectedReturn) => {
    const value = parseFloat(expectedReturn) || 0;
    if (value < 5) return { label: "Низкий", score: 1, icon: <Shield size={14} />, className: "low" };
    if (value < 10) return { label: "Средний", score: 2, icon: <Activity size={14} />, className: "medium" };
    return { label: "Высокий", score: 3, icon: <Zap size={14} />, className: "high" };
  };

  const comparisonData = useMemo(() => {
    const selected = selectedScenarios
      .filter(Boolean)
      .map((id) => scenarios.find((scenario) => scenario.scenario_id?.toString() === id?.toString()))
      .filter(Boolean);

    return selected.map((scenario) => {
      const target = parseFloat(scenario.goal_target) || 0;
      const current = parseFloat(scenario.goal_current) || 0;
      const monthly = parseFloat(scenario.monthly_contribution) || 0;
      const expectedReturn = parseFloat(scenario.expected_return) || 0;
      const inflation = parseFloat(scenario.inflation_rate) || 0;
      const remaining = Math.max(0, target - current);
      const monthsToGoal = monthly > 0 ? Math.ceil(remaining / monthly) : Infinity;
      const risk = calculateRisk(expectedReturn);
      const effectiveReturn = expectedReturn - inflation;
      const probability = isFinite(monthsToGoal) ? Math.max(30, Math.min(98, 100 - Math.max(0, monthsToGoal - 24))) : 20;
      const monthlyLoad = Math.min(100, Math.round((monthly / 50000) * 100));
      const rating = Math.min(100, Math.round(
        (isFinite(monthsToGoal) ? Math.max(8, 35 - monthsToGoal / 3) : 5) +
        probability * 0.28 +
        (4 - risk.score) * 7 +
        Math.max(0, effectiveReturn) * 2 +
        Math.max(0, 12 - monthlyLoad / 8)
      ));

      return { ...scenario, monthsToGoal, risk, effectiveReturn, probability, monthlyLoad, rating, remaining };
    });
  }, [selectedScenarios, scenarios]);

  const analysis = useMemo(() => {
    if (comparisonData.length < 2) return null;
    const sorted = [...comparisonData].sort((a, b) => b.rating - a.rating);
    return {
      best: sorted[0],
      weakest: sorted[sorted.length - 1],
      averageRating: Math.round(comparisonData.reduce((sum, scenario) => sum + scenario.rating, 0) / comparisonData.length),
    };
  }, [comparisonData]);

  const selectedCount = selectedScenarios.filter(Boolean).length;

  const handleGoalChange = (goalIdValue) => {
    setSelectedGoal(goalIdValue);
    if (goalIdValue) navigate(`/scenarios/compare/${goalIdValue}`, { replace: true });
  };

  const handleScenarioChange = (index, scenarioId) => {
    const next = [...selectedScenarios];
    next[index] = scenarioId;
    setSelectedScenarios(next);
  };

  const handleAddScenario = () => {
    if (selectedScenarios.length < 5) setSelectedScenarios([...selectedScenarios, ""]);
  };

  const handleRemoveScenario = (index) => {
    const next = selectedScenarios.filter((_, currentIndex) => currentIndex !== index);
    setSelectedScenarios(next.length ? next : [""]);
  };

  const handleExport = () => {
    const payload = JSON.stringify({ goal: currentGoal, scenarios: comparisonData, analysis }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `scenario-comparison-${selectedGoal || "all"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Layout>
        <div className="comparisonLoading"><div className="comparisonSpinner" /><p>Готовим сравнение сценариев...</p></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="scenarioComparisonContainer">
        <nav className="comparisonBreadcrumb">
          <Link to="/"><Home size={14} /> Главная</Link><span>/</span>
          <Link to="/scenarios"><BarChart3 size={14} /> Сценарии</Link><span>/</span><span>Сравнение</span>
        </nav>

        <section className="comparisonHero">
          <div>
            <span className="comparisonEyebrow">Decision studio</span>
            <h1>Сравнение сценариев</h1>
            <p>Выберите цель и несколько стратегий, чтобы увидеть сроки, риск, вероятность успеха и общий рейтинг в одном месте.</p>
          </div>
          <div className="comparisonHeroPanel">
            <span>Выбрано</span><strong>{selectedCount}</strong><small>из {filteredScenarios.length} доступных сценариев</small>
          </div>
        </section>

        {error && <div className="comparisonError"><AlertCircle size={18} /> {error}</div>}

        <section className="comparisonControlPanel">
          <div className="controlHeader">
            <div><span>Цель</span><h2>Настройка сравнения</h2></div>
            <button onClick={loadData} className="comparisonUtilityButton"><RefreshCw size={15} /> Обновить</button>
          </div>

          <select value={selectedGoal || ""} onChange={(e) => handleGoalChange(e.target.value)} className="goalSelectModern">
            <option value="">Выберите цель</option>
            {goals.map((goal) => (
              <option key={goal.goal_id} value={goal.goal_id}>{goal.title} ({scenarios.filter((s) => s.goal_id === goal.goal_id).length} сценариев)</option>
            ))}
          </select>

          {currentGoal && (
            <div className="selectedGoalCard">
              <div><span>Цель</span><strong>{currentGoal.title}</strong></div>
              <div><span>Накоплено</span><strong>{formatCurrency(currentGoal.current_amount)} ₽</strong></div>
              <div><span>Нужно</span><strong>{formatCurrency(currentGoal.target_amount)} ₽</strong></div>
              <div><span>Сценариев</span><strong>{filteredScenarios.length}</strong></div>
            </div>
          )}
        </section>

        <section className="scenarioPickerPanel">
          <div className="controlHeader">
            <div><span>Сценарии</span><h2>Что сравниваем</h2></div>
            <button onClick={handleAddScenario} className="comparisonUtilityButton" disabled={selectedScenarios.length >= 5}><Plus size={15} /> Добавить</button>
          </div>

          <div className="scenarioPickerGrid">
            {selectedScenarios.map((selectedId, index) => {
              const selected = filteredScenarios.find((scenario) => scenario.scenario_id?.toString() === selectedId?.toString());
              return (
                <article key={index} className="scenarioPickerCard">
                  <div className="pickerCardHeader">
                    <div><span>Сценарий {index + 1}</span><strong>{selected?.name || "Не выбран"}</strong></div>
                    {index > 1 && <button onClick={() => handleRemoveScenario(index)}><X size={15} /></button>}
                  </div>
                  <select value={selectedId || ""} onChange={(e) => handleScenarioChange(index, e.target.value)} disabled={!selectedGoal || filteredScenarios.length === 0}>
                    <option value="">Выберите сценарий</option>
                    {filteredScenarios.map((scenario) => (
                      <option key={scenario.scenario_id} value={scenario.scenario_id}>{scenario.name} ({formatCurrency(scenario.monthly_contribution)} ₽)</option>
                    ))}
                  </select>
                  {selected && <div className="scenarioMiniPreview"><span>{formatCurrency(selected.monthly_contribution)} ₽/мес</span><span>{selected.expected_return}% доходность</span></div>}
                </article>
              );
            })}

            {selectedGoal && filteredScenarios.length < 2 && (
              <div className="comparisonEmptyCard">
                <AlertCircle size={34} /><h3>Недостаточно сценариев</h3>
                <p>Для сравнения нужно минимум два сценария по выбранной цели.</p>
                <Link to={`/scenarios/new/${selectedGoal}`} className="comparisonPrimaryButton"><Plus size={16} /> Создать сценарий</Link>
              </div>
            )}
          </div>
        </section>

        {comparisonData.length >= 2 && (
          <>
            <section className="comparisonSummaryGrid">
              <article className="summaryScoreCard accent"><Trophy size={24} /><span>Лучший сценарий</span><strong>{analysis.best.name}</strong><small>Рейтинг {analysis.best.rating}/100</small></article>
              <article className="summaryScoreCard"><BarChart3 size={24} /><span>Средний рейтинг</span><strong>{analysis.averageRating}/100</strong><small>по выбранным стратегиям</small></article>
              <article className="summaryScoreCard"><Clock size={24} /><span>Самый быстрый срок</span><strong>{Math.min(...comparisonData.map((s) => s.monthsToGoal).filter(Number.isFinite))} мес.</strong><small>до цели</small></article>
            </section>

            <section className="comparisonTableWrapper">
              <div className="comparisonTableHeader">
                <div><span>Матрица</span><h2>Параметры сценариев</h2></div>
                <button onClick={handleExport} className="comparisonPrimaryButton"><Download size={15} /> Экспорт JSON</button>
              </div>
              <div className="modernTableScroll">
                <table className="comparisonTable">
                  <thead><tr><th>Параметр</th>{comparisonData.map((scenario) => <th key={scenario.scenario_id}>{scenario.name}</th>)}</tr></thead>
                  <tbody>
                    <tr><td><Target size={14} /> Цель</td>{comparisonData.map((s) => <td key={s.scenario_id}>{formatCurrency(s.goal_target)} ₽</td>)}</tr>
                    <tr><td><DollarSign size={14} /> Ежемесячный взнос</td>{comparisonData.map((s) => <td key={s.scenario_id}><strong>{formatCurrency(s.monthly_contribution)} ₽</strong></td>)}</tr>
                    <tr><td><TrendingUp size={14} /> Доходность</td>{comparisonData.map((s) => <td key={s.scenario_id}>{s.expected_return}%</td>)}</tr>
                    <tr><td><Clock size={14} /> Срок</td>{comparisonData.map((s) => <td key={s.scenario_id}>{Number.isFinite(s.monthsToGoal) ? `${s.monthsToGoal} мес.` : "Недостижимо"}</td>)}</tr>
                    <tr><td><Shield size={14} /> Риск</td>{comparisonData.map((s) => <td key={s.scenario_id}><span className={`riskBadge ${s.risk.className}`}>{s.risk.icon}{s.risk.label}</span></td>)}</tr>
                    <tr><td><Activity size={14} /> Вероятность</td>{comparisonData.map((s) => <td key={s.scenario_id}><div className="probabilityBar"><div style={{ width: `${s.probability}%` }} /><span>{s.probability}%</span></div></td>)}</tr>
                    <tr><td><Trophy size={14} /> Рейтинг</td>{comparisonData.map((s) => <td key={s.scenario_id}><strong>{s.rating}/100</strong></td>)}</tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="analysisSection">
              <article className="bestScenarioCard"><Trophy size={24} /><span>Рекомендуемый выбор</span><h2>{analysis.best.name}</h2><p>Лучший баланс срока, риска, нагрузки и доходности среди выбранных сценариев.</p></article>
              <article className="worstScenarioCard"><AlertCircle size={24} /><span>Слабее остальных</span><h2>{analysis.weakest.name}</h2><p>Этот сценарий уступает по итоговому рейтингу. Его стоит пересмотреть или использовать как запасной вариант.</p></article>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

export default ScenarioComparisonPage;
