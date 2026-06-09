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
  CheckCircle,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { getGoals, getPayments, getScenarios } from "../../../api/api";
import { calculateScenarioMetrics, formatPercent } from "../../../utils/scenarioCalculations";
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
      const paymentGroups = await Promise.all(
        (goalsData || []).map((goal) => getPayments(goal.goal_id).catch(() => []))
      );

      const allScenarios = [];
      (goalsData || []).forEach((goal, index) => {
        const payments = paymentGroups[index] || [];
        const current = calculateScenarioMetrics({ goal, payments, scenario: { monthly_contribution: 1 } }).current;
        (scenarioGroups[index] || []).forEach((scenario) => {
          allScenarios.push({
            ...scenario,
            goal_id: goal.goal_id,
            goal_title: goal.title,
            goal_target: goal.target_amount,
            goal_current: current,
            goal_payments: payments,
            goal_progress: goal.target_amount > 0
              ? Math.round((current / parseFloat(goal.target_amount)) * 100)
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

  const currentGoal = useMemo(() => {
    const goal = goals.find((item) => item.goal_id?.toString() === selectedGoal?.toString());
    if (!goal) return null;
    const scenarioForGoal = scenarios.find((scenario) => scenario.goal_id?.toString() === selectedGoal?.toString());
    return {
      ...goal,
      computed_current: scenarioForGoal?.goal_current ?? goal.current_amount,
    };
  }, [goals, scenarios, selectedGoal]);

  useEffect(() => {
    if (!selectedGoal) return;
    const available = scenarios.filter((scenario) => scenario.goal_id?.toString() === selectedGoal.toString());
    if (available.length >= 2) setSelectedScenarios([available[0].scenario_id.toString(), available[1].scenario_id.toString()]);
    else if (available.length === 1) setSelectedScenarios([available[0].scenario_id.toString(), ""]);
    else setSelectedScenarios(["", ""]);
  }, [selectedGoal, scenarios]);

  const comparisonData = useMemo(() => {
    const selected = selectedScenarios
      .filter(Boolean)
      .map((id) => scenarios.find((scenario) => scenario.scenario_id?.toString() === id?.toString()))
      .filter(Boolean);

    return selected.map((scenario) => {
      const metrics = calculateScenarioMetrics({
        goal: {
          target_amount: scenario.goal_target,
          initial_amount: scenario.goal_current,
        },
        scenario,
        payments: [],
      });
      const remaining = metrics.remaining;
      const monthsToGoal = metrics.monthsToGoal;
      const riskBase = metrics.risk;
      const risk = {
        label: riskBase.label,
        score: riskBase.score,
        className: riskBase.className,
        icon: riskBase.className === "low" ? <Shield size={14} /> : riskBase.className === "medium" ? <Activity size={14} /> : <Zap size={14} />,
      };
      const effectiveReturn = metrics.effectiveReturn;
      const probability = metrics.probability;
      const monthlyLoad = metrics.monthlyLoad;
      const rating = metrics.rating;

      return { ...scenario, monthsToGoal, risk, effectiveReturn, probability, monthlyLoad, rating, remaining };
    });
  }, [selectedScenarios, scenarios]);

  const analysis = useMemo(() => {
    if (comparisonData.length < 2) return null;
    const sorted = [...comparisonData].sort((a, b) => b.rating - a.rating);
    const reachable = comparisonData.filter((scenario) => Number.isFinite(scenario.monthsToGoal));
    const fastest = reachable.length
      ? [...reachable].sort((a, b) => a.monthsToGoal - b.monthsToGoal)[0]
      : null;
    const safest = [...comparisonData].sort((a, b) => a.risk.score - b.risk.score || b.probability - a.probability)[0];
    const lowestPayment = [...comparisonData].sort((a, b) => (parseFloat(a.monthly_contribution) || 0) - (parseFloat(b.monthly_contribution) || 0))[0];
    const highestProbability = [...comparisonData].sort((a, b) => b.probability - a.probability)[0];
    const best = sorted[0];
    const weakest = sorted[sorted.length - 1];
    const recommendations = buildRecommendations({ best, weakest, fastest, safest, lowestPayment, highestProbability, scenarios: comparisonData });
    return {
      best,
      weakest,
      fastest,
      safest,
      lowestPayment,
      highestProbability,
      averageRating: Math.round(comparisonData.reduce((sum, scenario) => sum + scenario.rating, 0) / comparisonData.length),
      recommendations,
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

  const selectedScenarioIds = selectedScenarios.filter(Boolean);
  const fastestMonths = analysis?.fastest?.monthsToGoal;

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
          <span className="comparisonEyebrow">Центр принятия решений</span>
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
              <div><span>Накоплено</span><strong>{formatCurrency(currentGoal.computed_current)} ₽</strong></div>
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
                      <option
                        key={scenario.scenario_id}
                        value={scenario.scenario_id}
                        disabled={selectedScenarioIds.includes(scenario.scenario_id?.toString()) && scenario.scenario_id?.toString() !== selectedId?.toString()}
                      >
                        {scenario.name} ({formatCurrency(scenario.monthly_contribution)} ₽)
                      </option>
                    ))}
                  </select>
                  {selected && <div className="scenarioMiniPreview"><span>{formatCurrency(selected.monthly_contribution)} ₽/мес</span><span>{formatPercent(selected.expected_return)}% доп. рост</span></div>}
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
              <article className="summaryScoreCard"><Clock size={24} /><span>Самый быстрый срок</span><strong>{Number.isFinite(fastestMonths) ? `${fastestMonths} мес.` : "Нет"}</strong><small>{analysis.fastest ? analysis.fastest.name : "нет достижимых сценариев"}</small></article>
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
                    <tr><td><TrendingUp size={14} /> Доп. рост</td>{comparisonData.map((s) => <td key={s.scenario_id}>{formatPercent(s.expected_return)}%</td>)}</tr>
                    <tr><td><Activity size={14} /> Инфляция</td>{comparisonData.map((s) => <td key={s.scenario_id}>{formatPercent(s.inflation_rate)}%</td>)}</tr>
                    <tr><td><TrendingUp size={14} /> Рост после инфляции</td>{comparisonData.map((s) => <td key={s.scenario_id}>{s.effectiveReturn.toFixed(1)}%</td>)}</tr>
                    <tr><td><Target size={14} /> Осталось накопить</td>{comparisonData.map((s) => <td key={s.scenario_id}>{formatCurrency(s.remaining)} ₽</td>)}</tr>
                    <tr><td><Clock size={14} /> Срок</td>{comparisonData.map((s) => <td key={s.scenario_id}>{Number.isFinite(s.monthsToGoal) ? `${s.monthsToGoal} мес.` : "Недостижимо"}</td>)}</tr>
                    <tr><td><Shield size={14} /> Риск</td>{comparisonData.map((s) => <td key={s.scenario_id}><span className={`riskBadge ${s.risk.className}`}>{s.risk.icon}{s.risk.label}</span></td>)}</tr>
                    <tr><td><Activity size={14} /> Вероятность</td>{comparisonData.map((s) => <td key={s.scenario_id}><div className="probabilityBar"><div style={{ width: `${s.probability}%` }} /><span>{s.probability}%</span></div></td>)}</tr>
                    <tr><td><Trophy size={14} /> Рейтинг</td>{comparisonData.map((s) => <td key={s.scenario_id}><strong>{s.rating}/100</strong></td>)}</tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="analysisSection">
              <article className="bestScenarioCard"><Trophy size={24} /><span>Рекомендуемый выбор</span><h2>{analysis.best.name}</h2><p>Лучший баланс срока, риска, нагрузки и дополнительного роста среди выбранных сценариев.</p></article>
              <article className="worstScenarioCard"><AlertCircle size={24} /><span>Слабее остальных</span><h2>{analysis.weakest.name}</h2><p>Этот сценарий уступает по итоговому рейтингу. Его стоит пересмотреть или использовать как запасной вариант.</p></article>
            </section>

            <section className="recommendationsPanel">
              <div className="comparisonTableHeader">
                <div><span>Рекомендации</span><h2>Как читать сравнение</h2></div>
              </div>
              <div className="recommendationsGrid">
                {analysis.recommendations.map((item, index) => (
                  <article key={index} className={`recommendationCard ${item.tone || ""}`}>
                    {item.icon}
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

function buildRecommendations({ best, weakest, fastest, safest, lowestPayment, highestProbability, scenarios }) {
  const items = [];
  const unreachable = scenarios.filter((scenario) => !Number.isFinite(scenario.monthsToGoal));
  const highRisk = scenarios.filter((scenario) => scenario.risk.className === "high");
  const negativeGrowth = scenarios.filter((scenario) => scenario.effectiveReturn < 0);

  items.push({
    tone: "success",
    icon: <Trophy size={22} />,
    title: `Основной выбор: ${best.name}`,
    text: `У него лучший общий рейтинг ${best.rating}/100. Это не просто самый быстрый вариант, а баланс срока, вероятности, риска и размера взноса.`,
  });

  if (fastest) {
    items.push({
      icon: <Clock size={22} />,
      title: `Самый быстрый: ${fastest.name}`,
      text: `Этот сценарий доводит цель примерно за ${fastest.monthsToGoal} мес. Если скорость важнее нагрузки и риска, его стоит рассмотреть первым.`,
    });
  }

  if (safest) {
    items.push({
      icon: <Shield size={22} />,
      title: `Самый осторожный: ${safest.name}`,
      text: `У него риск "${safest.risk.label}". Такой сценарий лучше подходит, если вы не хотите закладывать слишком оптимистичный дополнительный рост.`,
    });
  }

  if (lowestPayment) {
    items.push({
      icon: <DollarSign size={22} />,
      title: `Минимальная нагрузка: ${lowestPayment.name}`,
      text: `Здесь самый небольшой ежемесячный взнос: ${new Intl.NumberFormat("ru-RU").format(parseFloat(lowestPayment.monthly_contribution) || 0)} ₽. Подходит, если важнее комфортный платёж, а не максимальная скорость.`,
    });
  }

  if (highestProbability && highestProbability.scenario_id !== best.scenario_id) {
    items.push({
      icon: <Activity size={22} />,
      title: `Самая высокая вероятность: ${highestProbability.name}`,
      text: `Вероятность ${highestProbability.probability}%. Если хотите более устойчивый план, сравните его с рекомендованным сценарием.`,
    });
  }

  if (negativeGrowth.length > 0) {
    items.push({
      tone: "warning",
      icon: <AlertCircle size={22} />,
      title: "Инфляция выше роста",
      text: `В ${negativeGrowth.length} сценарии(ях) рост после инфляции отрицательный. Это значит, что инфляция замедляет достижение цели, и срок может стать длиннее.`,
    });
  }

  if (highRisk.length > 0) {
    items.push({
      tone: "warning",
      icon: <Zap size={22} />,
      title: "Есть сценарии с высоким риском",
      text: `Высокий риск появляется, когда дополнительный рост 10% в год или выше. Такие сценарии могут выглядеть быстрее, но они более оптимистичные.`,
    });
  }

  if (unreachable.length > 0) {
    items.push({
      tone: "danger",
      icon: <AlertCircle size={22} />,
      title: "Есть недостижимые варианты",
      text: `В ${unreachable.length} сценарии(ях) цель не достигается в разумный срок. Увеличьте взнос или снизьте влияние инфляции/ожидания.`,
    });
  }

  if (weakest && weakest.scenario_id !== best.scenario_id) {
    items.push({
      tone: "muted",
      icon: <X size={22} />,
      title: `Что пересмотреть: ${weakest.name}`,
      text: `У этого сценария самый слабый рейтинг среди выбранных. Проверьте взнос, срок и рост после инфляции.`,
    });
  }

  items.push({
    tone: "muted",
    icon: <CheckCircle size={22} />,
    title: "Практический совет",
    text: "Для дипломной логики лучше считать базовым сценарий с доп. ростом 0%. Остальные сценарии показывают, как изменится срок, если добавить более оптимистичные условия.",
  });

  return items;
}

export default ScenarioComparisonPage;
