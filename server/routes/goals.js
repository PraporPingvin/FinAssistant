// Получить конкретную цель по ID
router.get('/goal/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    
    const goal = await pool.query(
      'SELECT * FROM goals WHERE goal_id = $1',
      [goalId]
    );
    
    if (goal.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }
    
    res.json(goal.rows[0]);
  } catch (error) {
    console.error('Ошибка получения цели:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});