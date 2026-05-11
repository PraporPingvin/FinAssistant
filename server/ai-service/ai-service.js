const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateScenarioAdvice(goalData, userPreferences = {}) {
    try {
      const prompt = `
        Пользователь имеет финансовую цель:
        - Название: ${goalData.title}
        - Целевая сумма: ${goalData.target_amount} ₽
        - Текущие накопления: ${goalData.current_amount} ₽
        - Ежемесячный взнос: ${goalData.monthly_contribution} ₽
        - Срок: ${goalData.deadline_date ? `до ${goalData.deadline_date}` : 'не ограничен'}
        
        Предпочтения пользователя: ${userPreferences.risk || 'умеренный'} риск
        
        Предложи 3 варианта сценариев инвестирования:
        1. Консервативный (низкий риск)
        2. Умеренный (средний риск)
        3. Агрессивный (высокий риск)
        
        Для каждого сценария укажи:
        - Рекомендуемую доходность (% годовых)
        - Рекомендуемый ежемесячный взнос
        - Ожидаемый срок достижения цели
        - Рекомендуемые типы активов
        - Уровень риска (низкий/средний/высокий)
        
        Ответ в формате JSON:
        {
          "scenarios": [
            {
              "name": "Название сценария",
              "monthly_contribution": число,
              "expected_return": число,
              "inflation_rate": 6.0,
              "description": "Описание стратегии",
              "recommended_assets": ["актив1", "актив2"],
              "risk_level": "низкий/средний/высокий"
            }
          ]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Ты финансовый консультант. Помоги пользователю создать оптимальные сценарии достижения финансовых целей."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.getDefaultScenarios(goalData);
    }
  }

  getDefaultScenarios(goalData) {
    return {
      scenarios: [
        {
          name: "Консервативный план",
          monthly_contribution: goalData.monthly_contribution,
          expected_return: 5.0,
          inflation_rate: 6.0,
          description: "Банковские вклады, облигации федерального займа",
          recommended_assets: ["ОФЗ", "Банковские депозиты"],
          risk_level: "низкий"
        },
        {
          name: "Сбалансированный план",
          monthly_contribution: goalData.monthly_contribution * 1.2,
          expected_return: 8.5,
          inflation_rate: 6.0,
          description: "Смешанный портфель из акций и облигаций",
          recommended_assets: ["ETF на акции", "Корпоративные облигации"],
          risk_level: "средний"
        },
        {
          name: "Агрессивный план",
          monthly_contribution: goalData.monthly_contribution * 1.5,
          expected_return: 12.0,
          inflation_rate: 6.0,
          description: "Акции роста, технологические компании",
          recommended_assets: ["Акции технологических компаний", "ETF на развивающиеся рынки"],
          risk_level: "высокий"
        }
      ]
    };
  }

  async analyzeScenario(scenarioData) {
    const prompt = `
      Проанализируй сценарий инвестирования:
      ${JSON.stringify(scenarioData, null, 2)}
      
      Оцени:
      1. Реалистичность ожидаемой доходности
      2. Риски и их управление
      3. Альтернативные варианты
      4. Рекомендации по оптимизации
      
      Ответ в формате:
      {
        "analysis": "Текст анализа",
        "score": число от 1 до 10,
        "strengths": ["сильная сторона1", "сильная сторона2"],
        "weaknesses": ["слабая сторона1", "слабая сторона2"],
        "recommendations": ["рекомендация1", "рекомендация2"]
      }
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Ты финансовый аналитик. Анализируй инвестиционные сценарии и давай рекомендации."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 800
    });

    return JSON.parse(response.choices[0].message.content);
  }
}

module.exports = new AIService();