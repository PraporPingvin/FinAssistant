// server/middleware/validation.js

// Валидация email
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Валидация пароля
const validatePassword = (password) => {
    return password && password.length >= 6;
};

// Middleware для валидации регистрации
const validateRegistration = (req, res, next) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    
    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Некорректный формат email' });
    }
    
    if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }
    
    next();
};

// Middleware для валидации создания цели
const validateGoal = (req, res, next) => {
    const { title, target_amount, monthly_contribution, start_date } = req.body;
    
    if (!title || !target_amount || !monthly_contribution || !start_date) {
        return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }
    
    if (target_amount <= 0) {
        return res.status(400).json({ error: 'Целевая сумма должна быть больше 0' });
    }
    
    if (monthly_contribution <= 0) {
        return res.status(400).json({ error: 'Ежемесячный взнос должен быть больше 0' });
    }
    
    next();
};

module.exports = {
    validateEmail,
    validatePassword,
    validateRegistration,
    validateGoal
};