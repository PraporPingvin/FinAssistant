import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  Target,
  BarChart3,
  Plus,
  X,
  RefreshCw,
  Download,
  Printer,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  Shield,
  Zap,
  Activity,
  Star,
  Trophy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Save,
  Eye,
  Trash2,
  Edit2,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { getGoals, getScenarios, createForecast } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import "./ScenarioComparisonPage.css";

function ScenarioComparisonPage() {
  const navigate = useNavigate();
  const { goalId } = useParams();

  const [goals, setGoals] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filteredScenarios, setFilteredScenarios] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(goalId || null);

  const { user } = useAuth();

  const [selectedScenarios, setSelectedScenarios] = useState([
    { id: "", goalId: "" },
    { id: "", goalId: "" }
  ]);

  const [comparisonData, setComparisonData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedGoal) {
      const filtered = scenarios.filter(s => 
        s.goal_id && s.goal_id.toString() === selectedGoal.toString()
      );
      setFilteredScenarios(filtered);
      
      if (filtered.length > 0) {
        if (filtered.length >= 2) {
          setSelectedScenarios([
            { id: filtered[0].scenario_id.toString(), goalId: selectedGoal },
            { id: filtered[1].scenario_id.toString(), goalId: selectedGoal }
          ]);
        } else if (filtered.length === 1) {
          setSelectedScenarios([
            { id: filtered[0].scenario_id.toString(), goalId: selectedGoal },
            { id: "", goalId: selectedGoal }
          ]);
        }
      }
    } else {
      setFilteredScenarios(scenarios);
    }
  }, [selectedGoal, scenarios]);

  useEffect(() => {
    const selectedCount = selectedScenarios.filter(s => s.id && s.id !== "").length;
    if (selectedCount >= 2 && filteredScenarios.length > 0) {
      loadComparisonData();
    } else {
      setComparisonData([]);
      setAnalysis(null);
      setIsComparing(false);
    }
  }, [selectedScenarios, filteredScenarios]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const goalsData = await getGoals();
      setGoals(goalsData);

      const scenariosPromises = goalsData.map(goal =>
        getScenarios(goal.goal_id).catch(() => [])
      );

      const scenariosResults = await Promise.all(scenariosPromises);

      const allScenarios = [];
      goalsData.forEach((goal, index) => {
        const goalScenarios = scenariosResults[index] || [];
        goalScenarios.forEach(scenario => {
          allScenarios.push({
            ...scenario,
            goal_id: goal.goal_id,
            goal_title: goal.title,
            goal_target: goal.target_amount,
            goal_current: goal.current_amount,
            goal_progress: goal.target_amount > 0 
              ? Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100) 
              : 0
          });
        });
      });

      setScenarios(allScenarios);

      if (goalId) {
        const currentGoal = goalsData.find(g => g.goal_id && g.goal_id.toString() === goalId.toString());
        if (currentGoal) {
          setSelectedGoal(goalId);
          const goalScenarios = allScenarios.filter(s => 
            s.goal_id && s.goal_id.toString() === currentGoal.goal_id.toString()
          );
          if (goalScenarios.length >= 2) {
            setSelectedScenarios([
              { id: goalScenarios[0].scenario_id.toString(), goalId: currentGoal.goal_id.toString() },
              { id: goalScenarios[1].scenario_id.toString(), goalId: currentGoal.goal_id.toString() }
            ]);
          }
        }
      }

    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadComparisonData = useCallback(async () => {
    try {
      setIsComparing(true);

      const selectedIds = selectedScenarios
        .filter(s => s.id && s.id !== "")
        .map(s => s.id.toString().trim());

      if (selectedIds.length < 2) {
        setComparisonData([]);
        setAnalysis(null);
        return;
      }

      const selectedScenariosData = selectedIds.map(scenarioId => {
        const scenario = scenarios.find(s => {
          const scenarioIdStr = s.scenario_id ? s.scenario_id.toString() : "";
          return scenarioIdStr === scenarioId;
        });
        return scenario;
      }).filter(Boolean);

      if (selectedScenariosData.length < 2) {
        setComparisonData([]);
        setAnalysis(null);
        return;
      }

      const comparisonResults = selectedScenariosData.map(scenario => {
        const targetAmount = parseFloat(scenario.goal_target) || 0;
        const currentAmount = parseFloat(scenario.goal_current) || 0;
        const monthlyContribution = parseFloat(scenario.monthly_contribution) || 0;
        const expectedReturn = parseFloat(scenario.expected_return) || 0;
        const inflationRate = parseFloat(scenario.inflation_rate) || 0;
        const remainingAmount = targetAmount - currentAmount;

        const monthsToGoal = monthlyContribution > 0 && remainingAmount > 0
          ? Math.ceil(remainingAmount / monthlyContribution)
          : Infinity;

        const effectiveReturn = expectedReturn - inflationRate;
        const riskInfo = calculateRiskLevel(expectedReturn, scenario.name);
        
        let probability = 100;
        if (monthsToGoal > 120) probability = 30;
        else if (monthsToGoal > 60) probability = 60;
        else if (monthsToGoal > 36) probability = 80;

        const monthlyLoad = monthlyContribution > 0
          ? Math.min(100, Math.round((monthlyContribution / 50000) * 100))
          : 0;

        let feasibility = "Высокая";
        let feasibilityScore = 3;
        if (expectedReturn > 20) {
          feasibility = "Низкая";
          feasibilityScore = 1;
        } else if (expectedReturn > 12) {
          feasibility = "Средняя";
          feasibilityScore = 2;
        }

        const rating = calculateRating({
          monthsToGoal,
          probability,
          riskScore: riskInfo.riskScore,
          effectiveReturn,
          monthlyLoad,
          feasibilityScore
        }, scenario.name);

        return {
          ...scenario,
          monthsToGoal,
          effectiveReturn,
          riskLevel: riskInfo.riskLevel,
          riskScore: riskInfo.riskScore,
          riskDescription: riskInfo.description,
          probability,
          monthlyLoad,
          feasibility,
          feasibilityScore,
          rating,
          remainingAmount,
          yearlyContribution: monthlyContribution * 12,
          totalContribution: monthlyContribution * (isFinite(monthsToGoal) ? monthsToGoal : 0)
        };
      });

      setComparisonData(comparisonResults);

      if (comparisonResults.length >= 2) {
        performAnalysis(comparisonResults);
      }

    } catch (error) {
      console.error("Ошибка загрузки данных для сравнения:", error);
      setComparisonData([]);
      setAnalysis(null);
    } finally {
      setIsComparing(false);
    }
  }, [selectedScenarios, scenarios]);

  const calculateRiskLevel = (expectedReturn, scenarioName = "") => {
    const returnValue = parseFloat(expectedReturn) || 0;
    let riskLevel = "Низкий";
    let riskScore = 1;

    const lowerName = (scenarioName || "").toLowerCase();
    if (lowerName.includes('высок') && lowerName.includes('риск')) {
      riskLevel = "Высокий";
      riskScore = 3;
    } else if (lowerName.includes('средн') && lowerName.includes('риск')) {
      riskLevel = "Средний";
      riskScore = 2;
    } else if (lowerName.includes('низк') && lowerName.includes('риск')) {
      riskLevel = "Низкий";
      riskScore = 1;
    } else {
      if (returnValue > 15) {
        riskLevel = "Высокий";
        riskScore = 3;
      } else if (returnValue > 8) {
        riskLevel = "Средний";
        riskScore = 2;
      }
    }

    return {
      riskLevel,
      riskScore,
      description: getRiskDescription(riskLevel)
    };
  };

  const getRiskDescription = (riskLevel) => {
    switch (riskLevel) {
      case "Низкий": return "Минимальный риск, стабильный доход";
      case "Средний": return "Умеренный риск, баланс доходности и безопасности";
      case "Высокий": return "Высокий риск, потенциально высокая доходность";
      default: return "";
    }
  };

  const calculateRating = (factors, scenarioName = "") => {
    let score = 0;

    const lowerName = (scenarioName || "").toLowerCase();
    const hasHighRiskInName = lowerName.includes('высок') && lowerName.includes('риск');
    const hasLowRiskInName = lowerName.includes('низк') && lowerName.includes('риск');

    if (factors.monthsToGoal < 12) score += 30;
    else if (factors.monthsToGoal < 24) score += 25;
    else if (factors.monthsToGoal < 36) score += 20;
    else if (factors.monthsToGoal < 60) score += 15;
    else if (isFinite(factors.monthsToGoal)) score += 10;
    else score += 5;

    score += (factors.probability * 0.25);

    let riskModifier = 20;
    if (hasHighRiskInName) riskModifier = 15;
    else if (hasLowRiskInName) riskModifier = 25;

    score += (4 - factors.riskScore) * (riskModifier / 3);
    score += Math.min(Math.max(factors.effectiveReturn, 0) * 2, 15);

    if (factors.monthlyLoad < 20) score += 10;
    else if (factors.monthlyLoad < 30) score += 8;
    else if (factors.monthlyLoad < 40) score += 5;
    else score += 2;

    return Math.min(Math.round(score), 100);
  };

  const performAnalysis = (scenariosData) => {
    const sortedByRating = [...scenariosData].sort((a, b) => b.rating - a.rating);
    const bestScenario = sortedByRating[0];
    const worstScenario = sortedByRating[sortedByRating.length - 1];

    const comparisons = {
      months: compareValues(scenariosData.map(s => s.monthsToGoal), "месяцев до цели", "меньше - лучше"),
      risk: compareValues(scenariosData.map(s => s.riskScore), "уровень риска", "меньше - лучше"),
      probability: compareValues(scenariosData.map(s => s.probability), "вероятность успеха", "больше - лучше"),
      effectiveReturn: compareValues(scenariosData.map(s => s.effectiveReturn), "эффективная доходность", "больше - лучше"),
      monthlyLoad: compareValues(scenariosData.map(s => s.monthlyLoad), "ежемесячная нагрузка", "меньше - лучше")
    };

    const recommendations = generateRecommendations(bestScenario, worstScenario, comparisons);

    setAnalysis({
      bestScenario,
      worstScenario,
      comparisons,
      recommendations,
      averageRating: Math.round(scenariosData.reduce((sum, s) => sum + s.rating, 0) / scenariosData.length)
    });
  };

  const compareValues = (values, label, ideal) => {
    const validValues = values.filter(v => isFinite(v));
    if (validValues.length === 0) {
      return { label, values: [], min: 0, max: 0, avg: 0, ideal, difference: 0, percentDifference: "0" };
    }

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;

    return {
      label,
      values: validValues,
      min,
      max,
      avg,
      ideal,
      difference: max - min,
      percentDifference: min > 0 ? ((max - min) / min * 100).toFixed(1) : "0"
    };
  };

  const generateRecommendations = (best, worst, comparisons) => {
    const recommendations = [];

    if (comparisons.months.difference > 12 && isFinite(best.monthsToGoal) && isFinite(worst.monthsToGoal)) {
      recommendations.push({
        title: "Срок достижения",
        icon: <Clock size={16} />,
        content: `Сценарий "${best.name}" позволяет достичь цели на ${comparisons.months.difference} месяцев быстрее, чем "${worst.name}".`
      });
    }

    if (comparisons.risk.difference >= 1) {
      let riskContent = "";
      if (best.riskScore < worst.riskScore) {
        riskContent = `"${best.name}" имеет более безопасную стратегию (${best.riskLevel} риск) по сравнению с "${worst.name}" (${worst.riskLevel} риск).`;
      } else if (best.riskScore > worst.riskScore) {
        riskContent = `"${best.name}" - более агрессивная стратегия (${best.riskLevel} риск) с потенциально более высокой доходностью, чем у консервативного "${worst.name}" (${worst.riskLevel} риск).`;
      } else {
        riskContent = `Оба сценария имеют ${best.riskLevel} уровень риска.`;
      }
      recommendations.push({
        title: "Уровень риска",
        icon: <Shield size={16} />,
        content: riskContent
      });
    }

    if (comparisons.monthlyLoad.difference > 15) {
      let loadContent = "";
      if (best.monthlyLoad < worst.monthlyLoad) {
        loadContent = `"${best.name}" имеет меньшую финансовую нагрузку (${best.monthlyLoad}% от дохода) по сравнению с "${worst.name}" (${worst.monthlyLoad}% от дохода).`;
      } else {
        loadContent = `"${worst.name}" требует меньших ежемесячных взносов (${worst.monthlyLoad}% от дохода), что легче для бюджета, чем "${best.name}" (${best.monthlyLoad}% от дохода).`;
      }
      recommendations.push({
        title: "Финансовая нагрузка",
        icon: <DollarSign size={16} />,
        content: loadContent
      });
    }

    if (comparisons.effectiveReturn.difference > 3) {
      let returnContent = "";
      if (best.effectiveReturn > worst.effectiveReturn) {
        returnContent = `"${best.name}" предлагает более высокую эффективную доходность (${best.effectiveReturn.toFixed(1)}%) после вычета инфляции по сравнению с "${worst.name}" (${worst.effectiveReturn.toFixed(1)}%).`;
      } else {
        returnContent = `"${worst.name}" обеспечивает более стабильный, хотя и меньший доход (${worst.effectiveReturn.toFixed(1)}% против ${best.effectiveReturn.toFixed(1)}% у "${best.name}").`;
      }
      recommendations.push({
        title: "Эффективность",
        icon: <TrendingUp size={16} />,
        content: returnContent
      });
    }

    const generalAdvice = getGeneralAdvice(best, worst);
    recommendations.push({
      title: "Оптимальный выбор",
      icon: <Trophy size={16} />,
      content: generalAdvice
    });

    return recommendations;
  };

  const getGeneralAdvice = (best, worst) => {
    const bestRisk = best.riskScore;
    const worstRisk = worst.riskScore;

    if (bestRisk === 1 && worstRisk === 1) {
      return `Оба сценария имеют низкий уровень риска. Рекомендуется "${best.name}" с рейтингом ${best.rating}/100 баллов.`;
    } else if (bestRisk === 1 && worstRisk > 1) {
      return `Рекомендуется "${best.name}" с низким уровнем риска (${best.rating}/100). Это наиболее безопасный вариант по сравнению с "${worst.name}".`;
    } else if (bestRisk === 2 && worstRisk === 3) {
      return `"${best.name}" предлагает оптимальный баланс риска и доходности (${best.rating}/100). Более безопасен, чем агрессивный "${worst.name}".`;
    } else if (bestRisk === 3 && worstRisk <= 2) {
      return `"${best.name}" - агрессивная стратегия с высоким риском (${best.rating}/100). Подходит для инвесторов, готовых к риску ради большей доходности.`;
    } else if (best.rating - worst.rating > 20) {
      return `Настоятельно рекомендуется "${best.name}" (${best.rating}/100) - значительно превосходит "${worst.name}" (${worst.rating}/100) по большинству параметров.`;
    }
    return `На основе комплексного анализа рекомендуется "${best.name}" с общим рейтингом ${best.rating}/100 баллов.`;
  };

  const handleSaveToDatabase = async () => {
    if (!comparisonData.length || !analysis) {
      alert("Нет данных для сохранения");
      return;
    }

    try {
      setSavingToDb(true);
      setSaveSuccess(false);

      const savePromises = comparisonData.map(async (scenario) => {
        const forecastDate = new Date().toISOString().split('T')[0];
        let predictedFinishDate = null;
        if (isFinite(scenario.monthsToGoal) && scenario.monthsToGoal > 0) {
          const date = new Date();
          date.setMonth(date.getMonth() + scenario.monthsToGoal);
          predictedFinishDate = date.toISOString().split('T')[0];
        } else {
          const date = new Date();
          date.setFullYear(date.getFullYear() + 10);
          predictedFinishDate = date.toISOString().split('T')[0];
        }

        const forecastData = {
          goal_id: parseInt(scenario.goal_id),
          scenario_id: parseInt(scenario.scenario_id),
          forecast_date: forecastDate,
          predicted_finish_date: predictedFinishDate,
          remaining_months: isFinite(scenario.monthsToGoal) ? scenario.monthsToGoal : 120,
          current_amount: parseFloat(scenario.goal_current) || 0,
          target_amount: parseFloat(scenario.goal_target) || 0,
          final_amount: parseFloat(scenario.goal_target) || 0
        };

        return await createForecast(forecastData);
      });

      await Promise.all(savePromises);
      setSaveSuccess(true);
      alert(`Сравнение успешно сохранено в базу данных!\nСохранено ${savePromises.length} прогнозов.`);
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      console.error("Ошибка при сохранении в базу данных:", error);
      alert(`Ошибка при сохранении: ${error.message}`);
    } finally {
      setSavingToDb(false);
    }
  };

  const handleExportComparison = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      comparedScenarios: comparisonData.map(s => ({
        name: s.name,
        goal: s.goal_title,
        rating: s.rating,
        monthsToGoal: s.monthsToGoal,
        expectedReturn: s.expected_return,
        monthlyContribution: s.monthly_contribution,
        riskLevel: s.riskLevel,
        probability: s.probability
      })),
      analysis: analysis ? {
        bestScenario: analysis.bestScenario?.name,
        worstScenario: analysis.worstScenario?.name,
        averageRating: analysis.averageRating,
        recommendations: analysis.recommendations
      } : null
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `сравнение-сценариев-${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    setShowExportModal(false);
  };

  const handleGoalChange = (goalId) => {
    setSelectedGoal(goalId);
    setComparisonData([]);
    setAnalysis(null);
    if (goalId) {
      navigate(`/scenarios/compare/${goalId}`, { replace: true });
    } else {
      navigate(`/scenarios/compare`, { replace: true });
    }
  };

  const handleScenarioChange = (index, scenarioId) => {
    const newSelected = [...selectedScenarios];
    if (scenarioId) {
      const scenario = scenarios.find(s => s.scenario_id?.toString() === scenarioId);
      newSelected[index] = {
        id: scenarioId,
        goalId: scenario?.goal_id?.toString() || selectedGoal
      };
    } else {
      newSelected[index] = { id: "", goalId: selectedGoal || "" };
    }
    setSelectedScenarios(newSelected);
  };

  const handleAddScenario = () => {
    if (selectedScenarios.length < 5) {
      setSelectedScenarios([...selectedScenarios, { id: "", goalId: selectedGoal || "" }]);
    }
  };

  const handleRemoveScenario = (index) => {
    const newSelected = selectedScenarios.filter((_, i) => i !== index);
    setSelectedScenarios(newSelected.length > 0 ? newSelected : [{ id: "", goalId: selectedGoal || "" }]);
  };

  const handleClearAll = () => {
    setSelectedScenarios([{ id: "", goalId: selectedGoal || "" }, { id: "", goalId: selectedGoal || "" }]);
    setComparisonData([]);
    setAnalysis(null);
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const getRiskIcon = (riskLevel) => {
    if (riskLevel === "Низкий") return <Shield size={14} />;
    if (riskLevel === "Средний") return <Activity size={14} />;
    return <Zap size={14} />;
  };

  const getRiskClass = (riskLevel) => {
    if (riskLevel === "Низкий") return "riskLow";
    if (riskLevel === "Средний") return "riskMedium";
    return "riskHigh";
  };

  const getSelectedCount = () => selectedScenarios.filter(s => s.id && s.id !== "").length;

  const currentGoal = selectedGoal 
    ? goals.find(g => g.goal_id && g.goal_id.toString() === selectedGoal.toString())
    : null;

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner" />
          <p>Загружаем данные для сравнения...</p>
        </div>
      </Layout>
    );
  }

  const selectedCount = getSelectedCount();
  const hasEnoughScenarios = scenarios.length >= 2;

  return (
    <Layout>
      <div className="scenarioComparisonContainer">
        <div className="breadcrumb">
          <Link to="/"><Home size={14} /> Главная</Link>
          <span>/</span>
          <Link to="/scenarios"><BarChart3 size={14} /> Сценарии</Link>
          <span>/</span>
          <span className="current">Сравнение сценариев</span>
          {currentGoal && (
            <>
              <span>/</span>
              <span>{currentGoal.title}</span>
            </>
          )}
        </div>

        <div className="pageHeaderForecast">
          <div className="headerContentForecast">
            <h1>Сравнение сценариев</h1>
            <p className="headerDescription">
              {currentGoal 
                ? `Сравнение сценариев для цели: "${currentGoal.title}"`
                : "Сравните различные стратегии достижения финансовых целей"
              }
            </p>
          </div>
        </div>

        <div className="goalSelectionSection">
          <div className="goalSelectionHeader">
            <h3>
              <Target size={18} />
              Выберите цель для сравнения
            </h3>
            {currentGoal && (
              <div className="goalStatsScenario">
                <span className="goalStat">
                  Целевая сумма: {formatCurrency(currentGoal.target_amount)} ₽
                </span>
                <span className="goalStat">
                  Прогресс: {Math.round((parseFloat(currentGoal.current_amount) / parseFloat(currentGoal.target_amount)) * 100)}%
                </span>
              </div>
            )}
          </div>
          
          <div className="goalSelector">
            <select
              value={selectedGoal || ""}
              onChange={(e) => handleGoalChange(e.target.value)}
              className="goalSelect"
            >
              <option value="">Все цели (сравнение всех сценариев)</option>
              {goals.map(goal => (
                <option key={goal.goal_id} value={goal.goal_id.toString()}>
                  {goal.title} - {formatCurrency(goal.target_amount)} ₽ 
                  ({scenarios.filter(s => s.goal_id === goal.goal_id).length} сценариев)
                </option>
              ))}
            </select>
            
            {currentGoal && (
              <div className="goalInfoCard">
                <div className="goalInfoHeader">
                  <h4>{currentGoal.title}</h4>
                  <span className="goalProgress">
                    {Math.round((parseFloat(currentGoal.current_amount) / parseFloat(currentGoal.target_amount)) * 100)}%
                  </span>
                </div>
                <div className="goalInfoDetails">
                  <div>
                    <span>Цель:</span>
                    <strong>{formatCurrency(currentGoal.target_amount)} ₽</strong>
                  </div>
                  <div>
                    <span>Накоплено:</span>
                    <strong>{formatCurrency(currentGoal.current_amount)} ₽</strong>
                  </div>
                  <div>
                    <span>Сценариев:</span>
                    <strong>{filteredScenarios.length}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="errorMessage">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="selectionSection">
          <div className="selectionHeader">
            <h3>
              <BarChart3 size={18} />
              Выберите сценарии для сравнения
              {selectedCount > 0 && (
                <span className="selectionCount">{selectedCount} выбрано</span>
              )}
            </h3>
            {currentGoal && filteredScenarios.length >= 2 && (
              <p className="selectionHint">
                Выбрана цель "{currentGoal.title}". Доступно сценариев: {filteredScenarios.length}
              </p>
            )}
          </div>

          <div className="selectedScenariosGrid">
            {selectedScenarios.map((selected, index) => {
              const scenario = filteredScenarios.find(s => s.scenario_id?.toString() === selected.id);
              
              return (
                <div key={index} className="scenarioSelectorCard">
                  <div className="scenarioSelectorHeader">
                    <div>
                      <h4 className="scenarioSelectorTitle">Сценарий {index + 1}</h4>
                      {scenario && (
                        <div className="scenarioGoal">
                          <Target size={12} />
                          {scenario.goal_title}
                        </div>
                      )}
                    </div>
                    {index >= 2 && (
                      <button onClick={() => handleRemoveScenario(index)} className="removeButton" title="Удалить">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  <select
                    value={selected.id || ""}
                    onChange={(e) => handleScenarioChange(index, e.target.value)}
                    className="scenarioSelect"
                    disabled={!selectedGoal || filteredScenarios.length === 0}
                  >
                    <option value="">Выберите сценарий...</option>
                    {selectedGoal && filteredScenarios.length > 0 ? (
                      filteredScenarios.map(option => (
                        <option key={option.scenario_id} value={option.scenario_id.toString()}>
                          {option.name} (взнос: {formatCurrency(option.monthly_contribution)} ₽)
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {!selectedGoal ? "Сначала выберите цель" : "Нет доступных сценариев"}
                      </option>
                    )}
                  </select>
                  
                  {scenario && (
                    <div className="scenarioPreview">
                      <span>Взнос: {formatCurrency(scenario.monthly_contribution)} ₽</span>
                      <span>Доходность: {scenario.expected_return}%</span>
                    </div>
                  )}
                </div>
              );
            })}
            
            {!selectedGoal ? (
              <div className="emptySelection">
                <Target size={36} />
                <h4>Сначала выберите цель</h4>
                <p>Пожалуйста, выберите цель из списка выше, чтобы увидеть доступные сценарии</p>
              </div>
            ) : filteredScenarios.length < 2 ? (
              <div className="emptySelection">
                <BarChart3 size={36} />
                <h4>Недостаточно сценариев</h4>
                <p>Для цели "{currentGoal?.title}" доступно только {filteredScenarios.length} сценариев</p>
                <p>Для сравнения нужно как минимум 2 сценария</p>
                <Link to={`/scenarios/new/${selectedGoal}`} className="emptyStateButton">
                  <Plus size={14} />
                  Создать новый сценарий
                </Link>
              </div>
            ) : null}
          </div>

          <div className="selectionControls">
            <button onClick={handleAddScenario} className="addButton" disabled={selectedScenarios.length >= 5}>
              <Plus size={14} />
              Добавить сценарий
            </button>
            {selectedCount >= 2 && (
              <button onClick={loadComparisonData} className="addButton" disabled={isComparing}>
                {isComparing ? "Сравниваем..." : "Сравнить"}
              </button>
            )}
            <button onClick={handleClearAll} className="clearButton">
              Очистить все
            </button>
          </div>
        </div>

        {isComparing && (
          <div className="comparingMessage">
            <div className="loadingSpinnerSmall" />
            <p>Выполняем сравнение сценариев...</p>
          </div>
        )}

        {!isComparing && comparisonData.length >= 2 && (
          <>
            <div className="comparisonTableWrapper">
              <div className="comparisonTableHeader">
                <h3>
                  <BarChart3 size={18} />
                  Сравнительный анализ
                  <span className="selectionCount">{comparisonData.length} сценария</span>
                </h3>
                <div className="tableControls">
                  <button onClick={handleSaveToDatabase} className="saveToDbButton" disabled={savingToDb}>
                    {savingToDb ? "Сохранение..." : saveSuccess ? "Сохранено!" : <><Save size={14} /> Сохранить</>}
                  </button>
                  <button onClick={() => setShowExportModal(true)} className="exportButton" title="Экспортировать">
                    <Download size={14} /> Экспорт
                  </button>
                  <button onClick={() => window.print()} className="optionButton" title="Печать">
                    <Printer size={14} /> Печать
                  </button>
                </div>
              </div>

              <div className="tableWrapper">
                <table className="comparisonTable">
                  <thead>
                    <tr>
                      <th>Параметр</th>
                      {comparisonData.map((scenario, index) => (
                        <th key={index} className="scenarioColumn scenarioColumnHeader">
                          <div className="scenarioTitle">{scenario.name || `Сценарий ${index + 1}`}</div>
                          <div className="scenarioGoalTitle">{scenario.goal_title}</div>
                          <div className="scenarioRating">Рейтинг: {scenario.rating}/100</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="paramLabel">Целевая сумма</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">
                          <strong>{formatCurrency(scenario.goal_target)} ₽</strong>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="paramLabel">Текущий прогресс</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">
                          <strong>{scenario.goal_progress}%</strong>
                          <div className="subtext">{formatCurrency(scenario.goal_current)} ₽</div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="paramLabel">Ежемесячный взнос</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">
                          <strong>{formatCurrency(scenario.monthly_contribution)} ₽</strong>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="paramLabel">Ожидаемая доходность</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">{scenario.expected_return}%</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="paramLabel">Срок достижения</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className={`valueCell ${getBestWorstClass(scenario.monthsToGoal, 'months', comparisonData, analysis)}`}>
                          {isFinite(scenario.monthsToGoal) ? (
                            <strong>{scenario.monthsToGoal} мес.</strong>
                          ) : <span className="warningText">Недостижимо</span>}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="paramLabel">Уровень риска</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className={`valueCell ${getBestWorstClass(scenario.riskScore, 'risk', comparisonData, analysis)}`}>
                          <span className={`riskBadge ${getRiskClass(scenario.riskLevel)}`}>
                            {getRiskIcon(scenario.riskLevel)} {scenario.riskLevel}
                          </span>
                         </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="paramLabel">Вероятность успеха</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className={`valueCell ${getBestWorstClass(scenario.probability, 'probability', comparisonData, analysis)}`}>
                          <div className="probabilityBar">
                            <div className="probabilityFill" style={{ width: `${scenario.probability}%` }} />
                            <span>{scenario.probability}%</span>
                          </div>
                         </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="paramLabel">Общий рейтинг</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">
                          <div className="ratingDisplay">
                            <span className="ratingScore">{scenario.rating}/100</span>
                            <div className="ratingStars">
                              {"★".repeat(Math.floor(scenario.rating / 20))}
                              {"☆".repeat(5 - Math.floor(scenario.rating / 20))}
                            </div>
                          </div>
                         </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {analysis && (
              <div className="analysisSection">
                <div className="bestWorstComparison">
                  <div className="bestScenarioCard">
                    <div className="bestWorstHeader best">
                      <Trophy size={20} />
                      <h4>Лучший сценарий</h4>
                    </div>
                    <div className="bestWorstContent">
                      <h5>{analysis.bestScenario.name}</h5>
                      <p>Цель: {analysis.bestScenario.goal_title}</p>
                      <div className="ratingBadge bestRating">Рейтинг: {analysis.bestScenario.rating}/100</div>
                      <div className="bestWorstDetails">
                        <div><span>Срок:</span> <strong>{analysis.bestScenario.monthsToGoal} мес.</strong></div>
                        <div><span>Риск:</span> <strong>{analysis.bestScenario.riskLevel}</strong></div>
                        <div><span>Нагрузка:</span> <strong>{analysis.bestScenario.monthlyLoad}%</strong></div>
                      </div>
                    </div>
                  </div>

                  <div className="vsSeparator">
                    <div className="vsCircle">VS</div>
                  </div>

                  <div className="worstScenarioCard">
                    <div className="bestWorstHeader worst">
                      <AlertTriangle size={20} />
                      <h4>Худший сценарий</h4>
                    </div>
                    <div className="bestWorstContent">
                      <h5>{analysis.worstScenario.name}</h5>
                      <p>Цель: {analysis.worstScenario.goal_title}</p>
                      <div className="ratingBadge worstRating">Рейтинг: {analysis.worstScenario.rating}/100</div>
                      <div className="bestWorstDetails">
                        <div><span>Срок:</span> <strong>{analysis.worstScenario.monthsToGoal} мес.</strong></div>
                        <div><span>Риск:</span> <strong>{analysis.worstScenario.riskLevel}</strong></div>
                        <div><span>Нагрузка:</span> <strong>{analysis.worstScenario.monthlyLoad}%</strong></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="recommendationsSection">
                  <h4>Ключевые выводы</h4>
                  <div className="recommendationsGrid">
                    {analysis.recommendations.map((rec, index) => (
                      <div key={index} className="recommendationCard">
                        <div className="recommendationIcon">{rec.icon || <FileText size={18} />}</div>
                        <div className="recommendationContent">
                          <h5>{rec.title}</h5>
                          <p>{rec.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showExportModal && (
        <div className="modalOverlay" onClick={() => setShowExportModal(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Экспорт сравнения</h3>
              <button onClick={() => setShowExportModal(false)} className="closeButton">
                <X size={18} />
              </button>
            </div>
            <div className="modalBody">
              <div className="exportOptions">
                <label className="exportOption">
                  <input
                    type="radio"
                    value="json"
                    checked={exportFormat === "json"}
                    onChange={(e) => setExportFormat(e.target.value)}
                  />
                  <span>JSON</span>
                </label>
              </div>
            </div>
            <div className="modalFooter">
              <button onClick={() => setShowExportModal(false)} className="cancelButtonModal">
                Отмена
              </button>
              <button onClick={handleExportComparison} className="submitButtonModal">
                <Download size={14} /> Экспортировать
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function getBestWorstClass(value, key, comparisonData, analysis) {
  if (!analysis || !analysis.comparisons || !comparisonData.length) return "";
  
  const comparison = analysis.comparisons[key];
  if (!comparison || comparison.values.length < 2) return "";
  
  const betterIsLess = ["months", "risk", "monthlyLoad"].includes(key);
  const isMin = value === comparison.min;
  const isMax = value === comparison.max;
  
  if (betterIsLess) {
    if (isMin && comparison.min !== comparison.max) return "bestValue";
    if (isMax && comparison.min !== comparison.max) return "worstValue";
  } else {
    if (isMax && comparison.min !== comparison.max) return "bestValue";
    if (isMin && comparison.min !== comparison.max) return "worstValue";
  }
  return "";
}

export default ScenarioComparisonPage;