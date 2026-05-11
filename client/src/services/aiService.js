// // client/src/services/aiService.js

// class AIService {
//   constructor() {
//     // Для Vite используем import.meta.env
//     this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
//     this.useMock = !this.apiKey; // Если нет API ключа, используем мок-данные
//   }

//   /**
//    * Генерация прогноза достижения цели
//    */
//   async generateForecast(goalData, scenarios) {
//     try {
//       if (this.useMock) {
//         console.log('🔧 Используем мок-данные для прогноза (API ключ не найден)');
//         return this.getMockForecast(goalData, scenarios);
//       }

//       const prompt = this.buildForecastPrompt(goalData, scenarios);
      
//       const response = await fetch('https://api.openai.com/v1/chat/completions', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${this.apiKey}`
//         },
//         body: JSON.stringify({
//           model: 'gpt-3.5-turbo',
//           messages: [
//             {
//               role: 'system',
//               content: 'Ты - финансовый советник. Анализируй данные и давай прогнозы достижения финансовых целей. Отвечай в формате JSON.'
//             },
//             {
//               role: 'user',
//               content: prompt
//             }
//           ],
//           temperature: 0.7,
//           max_tokens: 1000
//         })
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//       const data = await response.json();
//       return this.parseAIResponse(data);
//     } catch (error) {
//       console.error('❌ Ошибка при обращении к ИИ:', error);
//       console.log('🔧 Используем мок-данные из-за ошибки');
//       return this.getMockForecast(goalData, scenarios);
//     }
//   }

//   /**
//    * Формирование промпта для ИИ
//    */
//   buildForecastPrompt(goalData, scenarios) {
//     const scenariosText = scenarios.map(s => `
//       Сценарий: ${s.name}
//       - Ежемесячный взнос: ${s.monthly_contribution} ₽
//       - Ожидаемая доходность: ${s.expected_return}% годовых
//       - Инфляция: ${s.inflation_rate}%
//     `).join('\n');

//     return `
//       Проанализируй следующие данные финансовой цели:
      
//       Цель: ${goalData.title}
//       Целевая сумма: ${goalData.target_amount} ₽
//       Текущая сумма: ${goalData.current_amount || 0} ₽
//       Начальная сумма: ${goalData.initial_amount || 0} ₽
//       Дата начала: ${goalData.start_date}
//       Желаемая дата завершения: ${goalData.deadline_date || 'Не указана'}

//       Доступные сценарии:
//       ${scenariosText}

//       На основе этих данных предоставь:
//       1. Прогноз по каждому сценарию (дата достижения, итоговая сумма с учетом доходности)
//       2. Рекомендации по оптимизации
//       3. Анализ рисков
//       4. Советы по ускорению достижения цели

//       Ответ должен быть в формате JSON со следующей структурой:
//       {
//         "scenarios": [
//           {
//             "name": "название сценария",
//             "predictedDate": "дата в формате YYYY-MM-DD",
//             "finalAmount": число,
//             "monthsToGoal": число,
//             "confidence": число от 0 до 100,
//             "risk": "низкий/средний/высокий"
//           }
//         ],
//         "recommendations": [
//           {
//             "text": "текст рекомендации",
//             "impact": "высокий/средний/низкий",
//             "savings": число (потенциальная экономия)
//           }
//         ],
//         "risks": [
//           {
//             "factor": "фактор риска",
//             "probability": число от 0 до 100,
//             "impact": "описание влияния"
//           }
//         ],
//         "optimalStrategy": "название оптимального сценария",
//         "summary": "краткое резюме"
//       }
//     `;
//   }

//   /**
//    * Парсинг ответа от ИИ
//    */
//   parseAIResponse(response) {
//     try {
//       const content = response.choices[0].message.content;
//       const jsonMatch = content.match(/\{[\s\S]*\}/);
//       if (jsonMatch) {
//         return JSON.parse(jsonMatch[0]);
//       }
//       throw new Error('Не удалось распарсить ответ ИИ');
//     } catch (error) {
//       console.error('❌ Ошибка парсинга ответа ИИ:', error);
//       return null;
//     }
//   }

//   /**
//    * Мок-данные для демонстрации (когда нет API ключа)
//    */
//   getMockForecast(goalData, scenarios) {
//     const today = new Date();
//     const currentAmount = parseFloat(goalData.current_amount || 0);
//     const targetAmount = parseFloat(goalData.target_amount);
//     const remainingAmount = targetAmount - currentAmount;

//     const scenariosForecast = scenarios.map(scenario => {
//       const monthlyContribution = parseFloat(scenario.monthly_contribution);
//       const expectedReturn = parseFloat(scenario.expected_return) / 100 / 12; // месячная доходность
      
//       // Упрощенный расчет (без сложных процентов для демо)
//       let monthsToGoal = Math.ceil(remainingAmount / monthlyContribution);
      
//       // Корректировка с учетом доходности
//       if (expectedReturn > 0) {
//         monthsToGoal = Math.ceil(monthsToGoal * 0.9); // Условное уменьшение срока
//       }

//       const predictedDate = new Date(today);
//       predictedDate.setMonth(predictedDate.getMonth() + monthsToGoal);

//       // Расчет итоговой суммы с учетом доходности
//       let finalAmount = currentAmount;
//       for (let i = 0; i < monthsToGoal; i++) {
//         finalAmount += monthlyContribution;
//         finalAmount *= (1 + expectedReturn);
//       }

//       // Определение уровня риска
//       let risk = 'средний';
//       let confidence = 75;
//       if (expectedReturn > 0.01) { // > 12% годовых
//         risk = 'высокий';
//         confidence = 60;
//       } else if (expectedReturn < 0.003) { // < 4% годовых
//         risk = 'низкий';
//         confidence = 90;
//       }

//       return {
//         name: scenario.name,
//         predictedDate: predictedDate.toISOString().split('T')[0],
//         finalAmount: Math.round(finalAmount),
//         monthsToGoal,
//         confidence,
//         risk
//       };
//     });

//     // Генерация рекомендаций
//     const recommendations = [
//       {
//         text: 'Увеличьте ежемесячный взнос на 10% - это сократит срок достижения цели на 2-3 месяца',
//         impact: 'высокий',
//         savings: Math.round(targetAmount * 0.05)
//       },
//       {
//         text: 'Рассмотрите вариант рефинансирования текущих кредитов для увеличения свободных средств',
//         impact: 'средний',
//         savings: Math.round(targetAmount * 0.03)
//       },
//       {
//         text: 'Откройте накопительный счет с более высокой процентной ставкой',
//         impact: 'средний',
//         savings: Math.round(targetAmount * 0.02)
//       }
//     ];

//     // Анализ рисков
//     const risks = [
//       {
//         factor: 'Экономическая нестабильность',
//         probability: 30,
//         impact: 'Может снизить доходность инвестиций на 2-3%'
//       },
//       {
//         factor: 'Потеря дохода',
//         probability: 15,
//         impact: 'Временная приостановка накоплений, увеличение срока на 3-6 месяцев'
//       },
//       {
//         factor: 'Инфляция',
//         probability: 85,
//         impact: 'Снижение покупательной способности накоплений'
//       }
//     ];

//     // Определение оптимальной стратегии
//     const optimalStrategy = scenariosForecast.reduce((best, current) => {
//       if (!best) return current;
//       const bestScore = best.confidence * (best.risk === 'низкий' ? 1.2 : best.risk === 'средний' ? 1 : 0.8);
//       const currentScore = current.confidence * (current.risk === 'низкий' ? 1.2 : current.risk === 'средний' ? 1 : 0.8);
//       return currentScore > bestScore ? current : best;
//     });

//     return {
//       scenarios: scenariosForecast,
//       recommendations,
//       risks,
//       optimalStrategy: optimalStrategy.name,
//       summary: `На основе анализа достижение цели "${goalData.title}" наиболее вероятно через ${optimalStrategy.monthsToGoal} месяцев при использовании сценария "${optimalStrategy.name}". Рекомендуем ${recommendations[0].text.toLowerCase()}`
//     };
//   }
// }

// // Создаем и экспортируем единственный экземпляр сервиса
// const aiService = new AIService();
// export default aiService;

// client/src/services/deepseekService.js

class DeepSeekService {
  constructor() {
    this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    // DeepSeek имеет OpenAI-совместимый API
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    
    this.useMock = !this.apiKey;
    
    if (this.useMock) {
      console.warn('⚠️ DeepSeek API ключ не найден. Используется мок-режим');
    } else {
      console.log('✅ DeepSeek API инициализирован');
    }
  }

  /**
   * Генерация прогноза для финансовой цели
   */
  async generateForecast(goalData, scenarios) {
    if (this.useMock) {
      return this.getMockForecast(goalData, scenarios);
    }

    const prompt = this.buildFinancialPrompt(goalData, scenarios);
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat', // DeepSeek-V3 модель
          messages: [
            {
              role: 'system',
              content: 'Ты — эксперт по финансовому планированию с 20-летним опытом. Отвечай ТОЛЬКО в формате JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 2000,
          top_p: 0.9,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Ошибка DeepSeek API');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      return this.parseAIResponse(content);
      
    } catch (error) {
      console.error('❌ Ошибка DeepSeek API:', error);
      return this.getMockForecast(goalData, scenarios);
    }
  }

  /**
   * Промпт для финансового анализа
   */
  buildFinancialPrompt(goalData, scenarios) {
    const scenariosText = scenarios.map(s => `
      СЦЕНАРИЙ: ${s.name}
      - Ежемесячный взнос: ${s.monthly_contribution} ₽
      - Доходность: ${s.expected_return}% годовых
      - Инфляция: ${s.inflation_rate}%
    `).join('\n');

    return `
      Проанализируй финансовую цель и предоставь прогноз в JSON формате.

      ЦЕЛЬ: ${goalData.title}
      - Целевая сумма: ${goalData.target_amount} ₽
      - Текущая сумма: ${goalData.current_amount || 0} ₽
      - Начальная сумма: ${goalData.initial_amount || 0} ₽
      - Дата начала: ${goalData.start_date}
      - Желаемая дата: ${goalData.deadline_date || 'не указана'}

      СЦЕНАРИИ:
      ${scenariosText}

      Требуемый формат ответа:
      {
        "scenarios": [
          {
            "name": "название сценария",
            "monthsToGoal": число (месяцев до цели),
            "finalAmount": число (итоговая сумма с учетом доходности),
            "confidence": число (уверенность 0-100),
            "risk": "низкий/средний/высокий"
          }
        ],
        "recommendations": [
          {
            "text": "конкретная рекомендация",
            "impact": "высокий/средний/низкий",
            "savings": число (экономия в рублях)
          }
        ],
        "risks": [
          {
            "factor": "фактор риска",
            "probability": число (0-100),
            "impact": "описание влияния"
          }
        ],
        "optimalStrategy": "название лучшего сценария",
        "summary": "краткое резюме (2-3 предложения)"
      }

      ВАЖНО: Ответ должен быть ТОЛЬКО JSON, без пояснений и markdown.
    `;
  }

  /**
   * Парсинг JSON из ответа
   */
  parseAIResponse(response) {
    try {
      // Очищаем ответ от возможных markdown-оберток
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('JSON не найден');
    } catch (error) {
      console.error('❌ Ошибка парсинга:', error);
      console.log('Сырой ответ:', response);
      return null;
    }
  }

  /**
   * Мок-данные для тестирования
   */
  getMockForecast(goalData, scenarios) {
    const currentAmount = parseFloat(goalData.current_amount || 0);
    const targetAmount = parseFloat(goalData.target_amount);
    const remainingAmount = targetAmount - currentAmount;
    
    const scenariosForecast = scenarios.map(scenario => {
      const monthly = parseFloat(scenario.monthly_contribution);
      const monthsToGoal = Math.ceil(remainingAmount / monthly);
      const expectedReturn = parseFloat(scenario.expected_return) / 100;
      
      // Простой расчет итоговой суммы с учетом доходности
      const finalAmount = targetAmount * (1 + expectedReturn * (monthsToGoal / 12));
      
      return {
        name: scenario.name,
        monthsToGoal,
        finalAmount: Math.round(finalAmount),
        confidence: 75,
        risk: expectedReturn > 0.1 ? 'высокий' : 
              expectedReturn > 0.05 ? 'средний' : 'низкий'
      };
    });

    return {
      scenarios: scenariosForecast,
      recommendations: [
        {
          text: 'Увеличьте ежемесячный взнос на 10% - это сократит срок на 2-3 месяца',
          impact: 'высокий',
          savings: Math.round(targetAmount * 0.05)
        },
        {
          text: 'Рассмотрите возможность рефинансирования кредитов',
          impact: 'средний',
          savings: Math.round(targetAmount * 0.03)
        },
        {
          text: 'Откройте накопительный счет с более высокой ставкой',
          impact: 'средний',
          savings: Math.round(targetAmount * 0.02)
        }
      ],
      risks: [
        {
          factor: 'Экономическая нестабильность',
          probability: 30,
          impact: 'Снижение доходности инвестиций на 2-3%'
        },
        {
          factor: 'Инфляция',
          probability: 85,
          impact: 'Снижение покупательной способности накоплений'
        },
        {
          factor: 'Потеря дохода',
          probability: 15,
          impact: 'Временная приостановка накоплений'
        }
      ],
      optimalStrategy: scenariosForecast[0]?.name,
      summary: `На основе анализа оптимальным является сценарий "${scenariosForecast[0]?.name}". Рекомендуется увеличить ежемесячные взносы для ускорения достижения цели.`
    };
  }

  /**
   * Проверка баланса API ключа
   */
  async checkBalance() {
    try {
      const response = await fetch('https://api.deepseek.com/user/balance', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.balance;
    } catch (error) {
      console.error('Ошибка проверки баланса:', error);
      return null;
    }
  }
}

export default new DeepSeekService();