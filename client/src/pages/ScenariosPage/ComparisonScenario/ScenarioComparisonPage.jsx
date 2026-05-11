import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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

  // Выбранные сценарии для сравнения
  const [selectedScenarios, setSelectedScenarios] = useState([
    { id: "", goalId: "" },
    { id: "", goalId: "" }
  ]);

  // Данные для сравнения
  const [comparisonData, setComparisonData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Фильтруем сценарии при изменении выбранной цели
  useEffect(() => {
    if (selectedGoal) {
      const filtered = scenarios.filter(s => 
        s.goal_id && s.goal_id.toString() === selectedGoal.toString()
      );
      setFilteredScenarios(filtered);
      
      // Если есть сценарии для этой цели, сбрасываем выбор
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
        } else {
          setSelectedScenarios([
            { id: "", goalId: selectedGoal },
            { id: "", goalId: selectedGoal }
          ]);
        }
      }
    } else {
      // Если цель не выбрана, показываем все сценарии
      setFilteredScenarios(scenarios);
    }
  }, [selectedGoal, scenarios]);

  // Начинаем сравнение при выборе достаточного количества сценариев
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

      console.log("🔄 Начинаем загрузку данных для сравнения...");

      // Загружаем все цели
      const goalsData = await getGoals();
      console.log("✅ Загружено целей:", goalsData.length);
      setGoals(goalsData);

      // Находим цель по goalId из URL
      let currentGoal = null;
      if (goalId) {
        currentGoal = goalsData.find(g => g.goal_id && g.goal_id.toString() === goalId.toString());
        console.log(`🎯 Найдена цель из URL:`, currentGoal);
      }

      // Загружаем сценарии для всех целей
      const scenariosPromises = goalsData.map(goal =>
        getScenarios(goal.goal_id).catch((error) => {
          console.warn(`⚠️ Не удалось загрузить сценарии для цели ${goal.goal_id}:`, error);
          return [];
        })
      );

      const scenariosResults = await Promise.all(scenariosPromises);

      // Объединяем все сценарии с информацией о цели
      const allScenarios = [];
      let scenarioCount = 0;

      goalsData.forEach((goal, index) => {
        const goalScenarios = scenariosResults[index] || [];
        console.log(`📊 Цель "${goal.title}" (ID: ${goal.goal_id}): ${goalScenarios.length} сценариев`);

        goalScenarios.forEach(scenario => {
          scenarioCount++;
          allScenarios.push({
            ...scenario,
            goal_id: goal.goal_id,
            goal_title: goal.title,
            goal_target: goal.target_amount,
            goal_current: goal.current_amount,
            goal_progress: goal.target_amount > 0 ? Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100) : 0
          });
        });
      });

      console.log(`✅ Всего загружено сценариев: ${scenarioCount}`);
      setScenarios(allScenarios);

      // Если есть цель из URL, фильтруем сценарии для нее
      if (currentGoal) {
        const goalScenarios = allScenarios.filter(s => 
          s.goal_id && s.goal_id.toString() === currentGoal.goal_id.toString()
        );
        console.log(`🎯 Сценарии для цели ${currentGoal.title}:`, goalScenarios);

        if (goalScenarios.length >= 2) {
          setSelectedScenarios([
            { id: goalScenarios[0].scenario_id.toString(), goalId: goalScenarios[0].goal_id.toString() },
            { id: goalScenarios[1].scenario_id.toString(), goalId: goalScenarios[1].goal_id.toString() }
          ]);
          console.log(`✅ Автоматически выбраны сценарии: ${goalScenarios[0].scenario_id}, ${goalScenarios[1].scenario_id}`);
        } else if (goalScenarios.length === 1) {
          setSelectedScenarios([
            { id: goalScenarios[0].scenario_id.toString(), goalId: goalScenarios[0].goal_id.toString() },
            { id: "", goalId: currentGoal.goal_id.toString() }
          ]);
        }
      }

    } catch (error) {
      console.error("❌ Ошибка загрузки данных:", error);
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

      console.log("🔄 Начинаем сравнение сценариев:");
      console.log("Выбранные ID:", selectedIds);

      if (selectedIds.length < 2) {
        console.log("⚠️ Недостаточно сценариев для сравнения");
        setComparisonData([]);
        setAnalysis(null);
        return;
      }

      const selectedScenariosData = selectedIds.map(scenarioId => {
        const scenario = scenarios.find(s => {
          const scenarioIdStr = s.scenario_id ? s.scenario_id.toString() : "";
          return scenarioIdStr === scenarioId;
        });

        if (!scenario) {
          console.warn(`⚠️ Сценарий с ID ${scenarioId} не найден`);
          return null;
        }

        console.log(`✅ Найден сценарий: ${scenario.name} (ID: ${scenario.scenario_id})`);
        return scenario;
      }).filter(Boolean);

      if (selectedScenariosData.length < 2) {
        console.log("⚠️ Не удалось найти достаточно сценариев для сравнения");
        setComparisonData([]);
        setAnalysis(null);
        return;
      }

      // Рассчитываем данные для каждого сценария
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
      } else {
        setAnalysis(null);
      }

    } catch (error) {
      console.error("❌ Ошибка загрузки данных для сравнения:", error);
      setComparisonData([]);
      setAnalysis(null);
    } finally {
      setIsComparing(false);
    }
  }, [selectedScenarios, scenarios]);

  // Функция расчета уровня риска с учетом названия сценария
  const calculateRiskLevel = (expectedReturn, scenarioName = "") => {
    const returnValue = parseFloat(expectedReturn) || 0;
    let riskLevel = "Низкий";
    let riskScore = 1;

    // Если в названии есть указание на риск, используем его
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
      // Автоматический расчет на основе доходности
      if (returnValue > 15) {
        riskLevel = "Высокий";
        riskScore = 3;
      } else if (returnValue > 8) {
        riskLevel = "Средний";
        riskScore = 2;
      } else {
        riskLevel = "Низкий";
        riskScore = 1;
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
      case "Низкий":
        return "Минимальный риск, стабильный доход";
      case "Средний":
        return "Умеренный риск, баланс доходности и безопасности";
      case "Высокий":
        return "Высокий риск, потенциально высокая доходность";
      default:
        return "";
    }
  };

  const calculateRating = (factors, scenarioName = "") => {
    // Взвешенная система оценки (макс 100 баллов)
    let score = 0;

    // Анализируем название для коррекции рейтинга
    const lowerName = (scenarioName || "").toLowerCase();
    const hasHighRiskInName = lowerName.includes('высок') && lowerName.includes('риск');
    const hasLowRiskInName = lowerName.includes('низк') && lowerName.includes('риск');

    // Меньше месяцев - лучше (до 30 баллов)
    if (factors.monthsToGoal < 12) score += 30;
    else if (factors.monthsToGoal < 24) score += 25;
    else if (factors.monthsToGoal < 36) score += 20;
    else if (factors.monthsToGoal < 60) score += 15;
    else if (isFinite(factors.monthsToGoal)) score += 10;
    else score += 5; // Если срок недостижим

    // Выше вероятность - лучше (до 25 баллов)
    score += (factors.probability * 0.25);

    // Ниже риск - лучше (до 20 баллов)
    // Для высокорисковых сценариев меньше штраф, для низкорисковых - больше бонус
    let riskModifier = 20;
    if (hasHighRiskInName) {
      riskModifier = 15; // Меньше важность риска
    } else if (hasLowRiskInName) {
      riskModifier = 25; // Больше важность риска
    }

    // Максимальные баллы за низкий риск, меньше за средний, еще меньше за высокий
    score += (4 - factors.riskScore) * (riskModifier / 3);

    // Выше эффективная доходность - лучше (до 15 баллов)
    score += Math.min(Math.max(factors.effectiveReturn, 0) * 2, 15);

    // Ниже нагрузка - лучше (до 10 баллов)
    if (factors.monthlyLoad < 20) score += 10;
    else if (factors.monthlyLoad < 30) score += 8;
    else if (factors.monthlyLoad < 40) score += 5;
    else score += 2;

    return Math.min(Math.round(score), 100);
  };

  const performAnalysis = (scenariosData) => {
    console.log("🔍 Выполняем анализ для:", scenariosData);

    // Находим лучший и худший сценарии
    const sortedByRating = [...scenariosData].sort((a, b) => b.rating - a.rating);
    const bestScenario = sortedByRating[0];
    const worstScenario = sortedByRating[sortedByRating.length - 1];

    // Сравниваем параметры
    const comparisons = {
      months: compareValues(scenariosData.map(s => s.monthsToGoal), "месяцев до цели", "меньше - лучше"),
      risk: compareValues(scenariosData.map(s => s.riskScore), "уровень риска", "меньше - лучше"),
      probability: compareValues(scenariosData.map(s => s.probability), "вероятность успеха", "больше - лучше"),
      effectiveReturn: compareValues(scenariosData.map(s => s.effectiveReturn), "эффективная доходность", "больше - лучше"),
      monthlyLoad: compareValues(scenariosData.map(s => s.monthlyLoad), "ежемесячная нагрузка", "меньше - лучше")
    };

    // Генерируем рекомендации
    const recommendations = generateRecommendations(bestScenario, worstScenario, comparisons);

    console.log("📊 Результаты анализа:", {
      bestScenario,
      worstScenario,
      comparisons,
      recommendations
    });

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

    // Рекомендация по сроку
    if (comparisons.months.difference > 12 && isFinite(best.monthsToGoal) && isFinite(worst.monthsToGoal)) {
      recommendations.push({
        title: "⏱️ Срок достижения",
        content: `Сценарий "${best.name}" позволяет достичь цели на ${comparisons.months.difference} месяцев быстрее, чем "${worst.name}".`
      });
    }

    // Рекомендация по риску
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
        title: "🎯 Уровень риска",
        content: riskContent
      });
    }

    // Рекомендация по нагрузке
    if (comparisons.monthlyLoad.difference > 15) {
      let loadContent = "";

      if (best.monthlyLoad < worst.monthlyLoad) {
        loadContent = `"${best.name}" имеет меньшую финансовую нагрузку (${best.monthlyLoad}% от дохода) по сравнению с "${worst.name}" (${worst.monthlyLoad}% от дохода).`;
      } else {
        loadContent = `"${worst.name}" требует меньших ежемесячных взносов (${worst.monthlyLoad}% от дохода), что легче для бюджета, чем "${best.name}" (${best.monthlyLoad}% от дохода).`;
      }

      recommendations.push({
        title: "💰 Финансовая нагрузка",
        content: loadContent
      });
    }

    // Рекомендация по доходности
    if (comparisons.effectiveReturn.difference > 3) {
      let returnContent = "";

      if (best.effectiveReturn > worst.effectiveReturn) {
        returnContent = `"${best.name}" предлагает более высокую эффективную доходность (${best.effectiveReturn.toFixed(1)}%) после вычета инфляции по сравнению с "${worst.name}" (${worst.effectiveReturn.toFixed(1)}%).`;
      } else {
        returnContent = `"${worst.name}" обеспечивает более стабильный, хотя и меньший доход (${worst.effectiveReturn.toFixed(1)}% против ${best.effectiveReturn.toFixed(1)}% у "${best.name}").`;
      }

      recommendations.push({
        title: "📈 Эффективность",
        content: returnContent
      });
    }

    // Рекомендация по вероятности
    if (comparisons.probability.difference > 20) {
      let probabilityContent = "";

      if (best.probability > worst.probability) {
        probabilityContent = `"${best.name}" имеет более высокую вероятность успеха (${best.probability}%) по сравнению с "${worst.name}" (${worst.probability}%).`;
      } else {
        probabilityContent = `Несмотря на более низкий рейтинг, "${worst.name}" имеет более предсказуемый результат (${worst.probability}% вероятность).`;
      }

      recommendations.push({
        title: "🎯 Вероятность успеха",
        content: probabilityContent
      });
    }

    // Общая рекомендация
    const generalAdvice = getGeneralAdvice(best, worst);
    recommendations.push({
      title: "🏆 Оптимальный выбор",
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
    } else {
      return `На основе комплексного анализа рекомендуется "${best.name}" с общим рейтингом ${best.rating}/100 баллов.`;
    }
  };

  // ============ ФУНКЦИИ ДЛЯ СОХРАНЕНИЯ В БАЗУ ДАННЫХ ============

  const handleSaveToDatabase = async () => {
    if (!comparisonData.length || !analysis) {
      alert("Нет данных для сохранения");
      return;
    }

    try {
      setSavingToDb(true);
      setSaveSuccess(false);

      console.log("💾 Сохраняем сравнение в базу данных...");

      // Сохраняем каждый сценарий как отдельный прогноз
      const savePromises = comparisonData.map(async (scenario) => {
        // Определяем дату прогноза (сегодня)
        const forecastDate = new Date().toISOString().split('T')[0];
        
        // Определяем прогнозируемую дату достижения цели
        let predictedFinishDate = null;
        if (isFinite(scenario.monthsToGoal) && scenario.monthsToGoal > 0) {
          const date = new Date();
          date.setMonth(date.getMonth() + scenario.monthsToGoal);
          predictedFinishDate = date.toISOString().split('T')[0];
        } else {
          // Если срок не определен, ставим через 10 лет
          const date = new Date();
          date.setFullYear(date.getFullYear() + 10);
          predictedFinishDate = date.toISOString().split('T')[0];
        }

        // Создаем объект прогноза
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

        console.log(`📊 Сохраняем прогноз для сценария "${scenario.name}":`, forecastData);

        // Отправляем на сервер
        return await createForecast(forecastData);
      });

      // Ждем сохранения всех прогнозов
      const results = await Promise.all(savePromises);
      
      console.log("✅ Все прогнозы успешно сохранены:", results);
      setSaveSuccess(true);
      
      // Показываем сообщение об успехе
      alert(`✅ Сравнение успешно сохранено в базу данных!\nСохранено ${results.length} прогнозов.`);

      // Сбрасываем флаг успеха через 3 секунды
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (error) {
      console.error("❌ Ошибка при сохранении в базу данных:", error);
      alert(`❌ Ошибка при сохранении: ${error.message}`);
    } finally {
      setSavingToDb(false);
    }
  };

  const handleSaveToLocalStorage = () => {
    try {
      // Создаем объект с данными для сохранения
      const savedComparison = {
        id: `comparison_${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('ru-RU'),
        time: new Date().toLocaleTimeString('ru-RU'),
        goalId: selectedGoal,
        goalTitle: currentGoal?.title || 'Все цели',
        scenarios: comparisonData.map(s => ({
          id: s.scenario_id,
          name: s.name,
          goalTitle: s.goal_title,
          rating: s.rating,
          monthlyContribution: s.monthly_contribution,
          expectedReturn: s.expected_return,
          inflationRate: s.inflation_rate,
          monthsToGoal: s.monthsToGoal,
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

      // Получаем существующие сохраненные сравнения из localStorage
      const savedComparisons = JSON.parse(localStorage.getItem('savedComparisons') || '[]');
      
      // Добавляем новое сравнение
      savedComparisons.push(savedComparison);
      
      // Сохраняем обратно в localStorage
      localStorage.setItem('savedComparisons', JSON.stringify(savedComparisons));
      
      alert('✅ Сравнение успешно сохранено в локальное хранилище!');
      
      console.log('💾 Сохраненное сравнение:', savedComparison);
    } catch (error) {
      console.error('❌ Ошибка при сохранении в localStorage:', error);
      alert('Не удалось сохранить сравнение в локальное хранилище.');
    }
  };

  const handleViewSavedComparisons = () => {
    const savedComparisons = JSON.parse(localStorage.getItem('savedComparisons') || '[]');
    
    if (savedComparisons.length === 0) {
      alert('У вас пока нет сохраненных сравнений в локальном хранилище.');
      return;
    }
    
    // Формируем сообщение со списком сохраненных сравнений
    let message = '📋 Сохраненные сравнения (localStorage):\n\n';
    savedComparisons.forEach((comp, index) => {
      message += `${index + 1}. ${comp.goalTitle} - ${comp.date} ${comp.time}\n`;
      message += `   Сценариев: ${comp.scenarios.length}, Лучший: ${comp.analysis?.bestScenario || '—'}\n\n`;
    });
    
    alert(message);
  };

  // ============ КОНЕЦ ФУНКЦИЙ ДЛЯ СОХРАНЕНИЯ ============

  // Обработчики
  const handleGoalChange = (goalId) => {
    console.log(`🎯 Изменена цель: ${goalId}`);
    setSelectedGoal(goalId);
    setComparisonData([]);
    setAnalysis(null);
    
    // Обновляем URL без перезагрузки страницы
    if (goalId) {
      navigate(`/scenarios/compare/${goalId}`, { replace: true });
    } else {
      navigate(`/scenarios/compare`, { replace: true });
    }
  };

  const handleScenarioChange = (index, scenarioId) => {
    const newSelected = [...selectedScenarios];

    if (scenarioId) {
      const scenario = scenarios.find(s => {
        const scenarioIdStr = s.scenario_id ? s.scenario_id.toString() : "";
        return scenarioIdStr === scenarioId;
      });

      newSelected[index] = {
        id: scenarioId,
        goalId: scenario?.goal_id ? scenario.goal_id.toString() : selectedGoal
      };
      console.log(`✅ Выбран сценарий ${index + 1}: ID=${scenarioId}, цель=${newSelected[index].goalId}`);
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

  const handleCompareNow = () => {
    const selectedCount = selectedScenarios.filter(s => s.id && s.id !== "").length;
    if (selectedCount >= 2) {
      loadComparisonData();
    } else {
      alert("Выберите как минимум 2 сценария для сравнения");
    }
  };

  const handleExportComparison = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      comparedScenarios: comparisonData.map(s => ({
        name: s.name,
        goal: s.goal_title,
        rating: s.rating
      })),
      analysis: analysis
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `сравнение-сценариев-${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Вспомогательные функции
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const getScenarioOptions = () => {
    // Если выбрана конкретная цель, показываем только ее сценарии
    const scenariosToShow = selectedGoal 
      ? scenarios.filter(s => s.goal_id && s.goal_id.toString() === selectedGoal.toString())
      : scenarios;
    
    return scenariosToShow.map(scenario => {
      const scenarioId = scenario.scenario_id ? scenario.scenario_id.toString() : "";
      return {
        value: scenarioId,
        label: `${scenario.name || 'Без названия'} (${scenario.goal_title || 'Без цели'})`,
        goalId: scenario.goal_id ? scenario.goal_id.toString() : ""
      };
    });
  };

  const getBestWorstClass = (value, comparisonKey) => {
    if (!analysis || comparisonData.length < 2) return "";

    const comparison = analysis.comparisons[comparisonKey];
    if (!comparison || comparison.values.length < 2) return "";

    const minValue = Math.min(...comparison.values);
    const maxValue = Math.max(...comparison.values);

    // Для некоторых параметров "лучше" значит меньше (срок, риск, нагрузка)
    // Для других "лучше" значит больше (вероятность, доходность)
    const betterIsLess = ["months", "risk", "monthlyLoad"].includes(comparisonKey);

    if (betterIsLess) {
      return value === minValue ? "bestValue" : value === maxValue ? "worstValue" : "";
    } else {
      return value === maxValue ? "bestValue" : value === minValue ? "worstValue" : "";
    }
  };

  const getSelectedCount = () => {
    return selectedScenarios.filter(s => s.id && s.id !== "").length;
  };

  // Получаем текущую цель для отображения
  const currentGoal = selectedGoal 
    ? goals.find(g => g.goal_id && g.goal_id.toString() === selectedGoal.toString())
    : null;

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingAnimation"></div>
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
        {/* Хлебные крошки */}
        <div className="breadcrumb">
          <Link to="/">Главная</Link>
          {" > "}
          <Link to="/scenarios">Сценарии</Link>
          {" > "}
          <span>Сравнение сценариев</span>
          {currentGoal && (
            <>
              {" > "}
              <span>{currentGoal.title}</span>
            </>
          )}
        </div>

        {/* Заголовок */}
        <div className="pageHeader">
          <div className="headerContent">
            <h1>Сравнение сценариев</h1>
            <p className="headerSubtitle">
              {currentGoal 
                ? `Сравнение сценариев для цели: "${currentGoal.title}"`
                : "Сравните различные стратегии достижения финансовых целей"
              }
            </p>
          </div>
        </div>

        {/* Выбор цели */}
        <div className="goalSelectionSection">
          <div className="goalSelectionHeader">
            <h3>
              <span>🎯</span>
              Выберите цель для сравнения
            </h3>
            <div className="goalStats">
              {currentGoal && (
                <>
                  <span className="goalStat">
                    📊 Целевая сумма: {formatCurrency(currentGoal.target_amount)} ₽
                  </span>
                  <span className="goalStat">
                    📈 Прогресс: {Math.round((parseFloat(currentGoal.current_amount) / parseFloat(currentGoal.target_amount)) * 100)}%
                  </span>
                </>
              )}
            </div>
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

        {/* Сообщение об ошибке */}
        {error && (
          <div className="errorMessage">
            <strong>Внимание:</strong> {error}
          </div>
        )}

        {/* Выбор сценариев */}
        <div className="selectionSection">
          <div className="selectionHeader">
            <h3>
              <span>📊</span>
              Выберите сценарии для сравнения
              {selectedCount > 0 && (
                <span className="selectionCount">
                  {selectedCount} выбрано
                </span>
              )}
            </h3>
            {currentGoal && filteredScenarios.length >= 2 && (
              <p className="selectionHint">
                ⚠️ Выбрана цель "{currentGoal.title}". Доступно сценариев: {filteredScenarios.length}
              </p>
            )}
          </div>

          <div className="selectedScenariosGrid">
            {selectedScenarios.map((selected, index) => {
              // Ищем сценарий среди отфильтрованных (только для выбранной цели)
              const scenario = filteredScenarios.find(s => {
                const scenarioId = s.scenario_id ? s.scenario_id.toString() : "";
                return scenarioId === selected.id;
              });
              
              return (
                <div key={index} className="scenarioSelectorCard">
                  <div className="scenarioSelectorHeader">
                    <div>
                      <h4 className="scenarioSelectorTitle">
                        Сценарий {index + 1}
                      </h4>
                      {scenario && (
                        <div className="scenarioGoal">
                          <span>🎯</span>
                          {scenario.goal_title}
                        </div>
                      )}
                    </div>
                    {index >= 2 && (
                      <button
                        onClick={() => handleRemoveScenario(index)}
                        className="removeButton"
                      >
                        ×
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
                      getScenarioOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
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
                <div className="emptySelectionIcon">🎯</div>
                <h4>Сначала выберите цель</h4>
                <p>Пожалуйста, выберите цель из списка выше, чтобы увидеть доступные сценарии</p>
              </div>
            ) : filteredScenarios.length < 2 ? (
              <div className="emptySelection">
                <div className="emptySelectionIcon">📊</div>
                <h4>Недостаточно сценариев</h4>
                <p>Для цели "{currentGoal?.title}" доступно только {filteredScenarios.length} сценариев</p>
                <p>Для сравнения нужно как минимум 2 сценария</p>
                <Link 
                  to={`/scenarios/new/${selectedGoal}`} 
                  className="emptyStateButton"
                  style={{ marginTop: '15px' }}
                >
                  <span>➕</span>
                  Создать новый сценарий
                </Link>
              </div>
            ) : null}
          </div>

          {/* Кнопки управления */}
          <div className="selectionControls">
            <button
              onClick={handleAddScenario}
              className="addButton"
              disabled={selectedScenarios.length >= 5}
            >
              <span>+</span>
              Добавить сценарий
            </button>
            {selectedCount >= 2 && (
              <button
                onClick={handleCompareNow}
                className="addButton"
                disabled={isComparing}
                style={{ backgroundColor: isComparing ? '#cccccc' : '' }}
              >
                {isComparing ? '⏳ Сравниваем...' : '🔍 Сравнить'}
              </button>
            )}
            <button
              onClick={handleClearAll}
              className="clearButton"
            >
              Очистить все
            </button>
          </div>
        </div>

        {/* Состояние загрузки сравнения */}
        {isComparing && (
          <div className="comparingMessage">
            <div className="loadingAnimation" style={{ margin: '0 auto 15px' }}></div>
            <p>Выполняем сравнение сценариев...</p>
            <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
              Анализируем {selectedCount} сценариев для цели "{currentGoal?.title}"
            </p>
          </div>
        )}

        {/* Сообщение о недостатке сценариев в системе */}
        {!isComparing && !selectedGoal && (
          <div className="emptyState">
            <div className="emptyStateIcon">🎯</div>
            <h3>Выберите цель для сравнения</h3>
            <p>
              Пожалуйста, выберите цель из списка выше, чтобы увидеть доступные сценарии для сравнения.
            </p>
          </div>
        )}

        {/* Сообщение о недостатке сценариев для выбранной цели */}
        {!isComparing && selectedGoal && filteredScenarios.length < 2 && (
          <div className="emptyState">
            <div className="emptyStateIcon">📊</div>
            <h3>Недостаточно сценариев для сравнения</h3>
            <p>
              Для цели "{currentGoal?.title}" доступно только {filteredScenarios.length} сценарий.
              Для сравнения нужно как минимум 2 сценария.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <Link to={`/scenarios/new/${selectedGoal}`} className="emptyStateButton">
                <span>➕</span>
                Создать сценарий
              </Link>
              <button 
                onClick={() => handleGoalChange("")}
                className="emptyStateButton" 
                style={{ backgroundColor: '#f5f5f5', color: '#495631' }}
              >
                <span>🔍</span>
                Посмотреть все сценарии
              </button>
            </div>
          </div>
        )}

        {/* Таблица сравнения */}
        {!isComparing && comparisonData.length >= 2 && (
          <>
            <div className="comparisonTableWrapper">
              <div className="comparisonTableHeader">
                <h3>
                  <span>📈</span>
                  Сравнительный анализ
                  <span className="selectionCount">
                    {comparisonData.length} сценария
                  </span>
                </h3>
                <div className="tableControls">
                  {/* КНОПКА СОХРАНЕНИЯ В БАЗУ ДАННЫХ */}
                  <button
                    onClick={handleSaveToDatabase}
                    className="saveToDbButton"
                    disabled={savingToDb || !comparisonData.length}
                    title="Сохранить прогнозы в базу данных"
                  >
                    {savingToDb ? (
                      <>⏳ Сохранение...</>
                    ) : saveSuccess ? (
                      <>✅ Сохранено!</>
                    ) : (
                      <>
                        <span>💾</span>
                        Сохранить
                      </>
                    )}
                  </button>

                  {/* КНОПКА СОХРАНЕНИЯ В LOCALSTORAGE */}
                  {/* <button
                    onClick={handleSaveToLocalStorage}
                    className="saveToLocalButton"
                    disabled={!comparisonData.length}
                    title="Сохранить в локальное хранилище"
                  >
                    <span>📋</span>
                    Сохранить локально
                  </button> */}

                  {/* КНОПКА ПРОСМОТРА СОХРАНЕННЫХ */}
                  {/* <button
                    onClick={handleViewSavedComparisons}
                    className="viewSavedButton"
                    title="Просмотреть сохраненные в localStorage"
                  >
                    <span>📂</span>
                    Сохраненные
                  </button> */}

                  <button
                    onClick={handleExportComparison}
                    className="exportButton"
                    title="Экспортировать в JSON"
                  >
                    <span>📥</span>
                    Экспорт
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="optionButton"
                    title="Распечатать"
                  >
                    🖨️ Печать
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
                          <div className="scenarioGoal">{scenario.goal_title}</div>
                          <div style={{
                            fontSize: '0.8rem',
                            marginTop: '5px',
                            color: 'rgba(73, 86, 49, 0.8)'
                          }}>
                            Рейтинг: {scenario.rating}/100
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Основные параметры */}
                    <tr>
                      <td>Целевая сумма</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">
                          <div className="highlight">{formatCurrency(scenario.goal_target)} ₽</div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Текущий прогресс</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">
                          <div className="highlight">{scenario.goal_progress}%</div>
                          <div className="subtext">{formatCurrency(scenario.goal_current)} ₽</div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Ежемесячный взнос</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">
                          <div className="highlight">{formatCurrency(scenario.monthly_contribution)} ₽</div>
                          <div className="subtext">Годовой: {formatCurrency(scenario.yearlyContribution)} ₽</div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Ожидаемая доходность</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">
                          <div className="highlight">{scenario.expected_return}%</div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Инфляция</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">
                          {scenario.inflation_rate}%
                        </td>
                      ))}
                    </tr>

                    {/* Расчетные параметры */}
                    <tr className="calculatedRow">
                      <td><strong>Срок достижения</strong></td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className={`valueCell ${getBestWorstClass(scenario.monthsToGoal, 'months')}`}>
                          {isFinite(scenario.monthsToGoal) ? (
                            <>
                              <div className="highlight">
                                {scenario.monthsToGoal} месяцев
                              </div>
                              <div className="subtext">
                                {Math.floor(scenario.monthsToGoal / 12)} лет {scenario.monthsToGoal % 12} месяцев
                              </div>
                            </>
                          ) : (
                            <div className="highlight" style={{ color: '#e63946' }}>
                              Недостижимо
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Эффективная доходность</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className={`valueCell ${getBestWorstClass(scenario.effectiveReturn, 'effectiveReturn')}`}>
                          <div className={`highlight ${scenario.effectiveReturn > 0 ? 'positive' : 'negative'}`}>
                            {scenario.effectiveReturn.toFixed(1)}%
                          </div>
                          <div className="subtext">После инфляции</div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Уровень риска</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className={`valueCell ${getBestWorstClass(scenario.riskScore, 'risk')}`}>
                          <div className={`riskBadge risk${scenario.riskScore}`}>
                            {scenario.riskLevel}
                          </div>
                          <div className="subtext">{scenario.riskDescription}</div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Вероятность успеха</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className={`valueCell ${getBestWorstClass(scenario.probability, 'probability')}`}>
                          <div className="probabilityBar">
                            <div
                              className="probabilityFill"
                              style={{ width: `${scenario.probability}%` }}
                            ></div>
                            <span className="probabilityText">{scenario.probability}%</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Ежемесячная нагрузка</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className={`valueCell ${getBestWorstClass(scenario.monthlyLoad, 'monthlyLoad')}`}>
                          <div className="loadIndicator">
                            {scenario.monthlyLoad < 20 ? (
                              <span style={{ color: '#2e7d32' }}>Низкая</span>
                            ) : scenario.monthlyLoad < 35 ? (
                              <span style={{ color: '#f9a825' }}>Средняя</span>
                            ) : (
                              <span style={{ color: '#e63946' }}>Высокая</span>
                            )}
                            <div className="loadBar">
                              <div
                                className={`loadFill load${Math.floor(scenario.monthlyLoad / 20) + 1}`}
                                style={{ width: `${Math.min(scenario.monthlyLoad, 100)}%` }}
                              ></div>
                            </div>
                            <div className="subtext">{scenario.monthlyLoad}% от дохода</div>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Реалистичность</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">
                          <div className={`feasibilityBadge feasibility${scenario.feasibilityScore}`}>
                            {scenario.feasibility}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td>Общий рейтинг</td>
                      {comparisonData.map((scenario, index) => (
                        <td key={index} className="valueCell">
                          <div className="ratingDisplay">
                            <div className="ratingScore">{scenario.rating}/100</div>
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

            {/* Анализ и рекомендации */}
            {analysis && (
              <div className="analysisSection">
                <div className="analysisHeader">
                  <h3>
                    <span>🔍</span>
                    Анализ и рекомендации <br/>
                    {analysis.averageRating && (
                      <span className="averageRating">
                        Средний рейтинг: {analysis.averageRating}/100
                      </span>
                    )}
                  </h3>
                </div>

                <div className="bestWorstComparison">
                  <div className="bestScenarioCard">
                    <div className="bestWorstHeader best">
                      <span>🏆</span>
                      <h4>Лучший сценарий</h4>
                    </div>
                    <div className="bestWorstContent">
                      <h5>{analysis.bestScenario.name}</h5>
                      <p>Цель: {analysis.bestScenario.goal_title}</p>
                      <div className="ratingBadge bestRating">
                        Рейтинг: {analysis.bestScenario.rating}/100
                      </div>
                      <div className="bestWorstDetails">
                        <div>
                          <span>Срок:</span>
                          <strong>{analysis.bestScenario.monthsToGoal} месяцев</strong>
                        </div>
                        <div>
                          <span>Риск:</span>
                          <strong className={`riskText risk${analysis.bestScenario.riskScore}`}>
                            {analysis.bestScenario.riskLevel}
                          </strong>
                        </div>
                        <div>
                          <span>Нагрузка:</span>
                          <strong>{analysis.bestScenario.monthlyLoad}%</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="vsSeparator">
                    <div className="vsCircle">VS</div>
                    <div className="vsLine"></div>
                  </div>

                  <div className="worstScenarioCard">
                    <div className="bestWorstHeader worst">
                      <span>⚠️</span>
                      <h4>Худший сценарий</h4>
                    </div>
                    <div className="bestWorstContent">
                      <h5>{analysis.worstScenario.name}</h5>
                      <p>Цель: {analysis.worstScenario.goal_title}</p>
                      <div className="ratingBadge worstRating">
                        Рейтинг: {analysis.worstScenario.rating}/100
                      </div>
                      <div className="bestWorstDetails">
                        <div>
                          <span>Срок:</span>
                          <strong>{analysis.worstScenario.monthsToGoal} месяцев</strong>
                        </div>
                        <div>
                          <span>Риск:</span>
                          <strong className={`riskText risk${analysis.worstScenario.riskScore}`}>
                            {analysis.worstScenario.riskLevel}
                          </strong>
                        </div>
                        <div>
                          <span>Нагрузка:</span>
                          <strong>{analysis.worstScenario.monthlyLoad}%</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="recommendationsSection">
                  <h4>Ключевые выводы</h4>
                  <div className="recommendationsGrid">
                    {analysis.recommendations.map((rec, index) => (
                      <div key={index} className="recommendationCard">
                        <div className="recommendationIcon">
                          {rec.title.includes('Срок') && '⏱️'}
                          {rec.title.includes('риск') && '🎯'}
                          {rec.title.includes('Финансовая') && '💰'}
                          {rec.title.includes('Эффективность') && '📈'}
                          {rec.title.includes('Вероятность') && '🎯'}
                          {rec.title.includes('Оптимальный') && '🏆'}
                        </div>
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

        {/* Сообщение о необходимости выбора */}
        {!isComparing && !comparisonData.length && scenarios.length >= 2 && selectedCount < 2 && (
          <div className="selectionPrompt">
            <div className="selectionPromptIcon">📊</div>
            <h3>Выберите сценарии для сравнения</h3>
            <p>Для начала сравнения выберите как минимум 2 сценария из доступных {scenarios.length} вариантов</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ScenarioComparisonPage;