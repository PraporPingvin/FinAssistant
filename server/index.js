// server/index.js - Главный файл
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/database');
const safeLogging = require('./middleware/logging');

// Импорт маршрутов
const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const goalsRoutes = require('./routes/goals.routes');
const paymentsRoutes = require('./routes/payments.routes');
const scenariosRoutes = require('./routes/scenarios.routes');
const checkpointsRoutes = require('./routes/checkpoints.routes');
const forecastsRoutes = require('./routes/forecasts.routes');
const statsRoutes = require('./routes/stats.routes');
const economicRoutes = require('./routes/economic.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Настройка CORS
app.use(cors({
    origin: [
        'http://localhost:3000', 
        'http://localhost:5173', 
        'http://127.0.0.1:5173',
        'https://finassistant.layxl.dev',
        'https://finassistant.layxl.dev:5000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(safeLogging);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Сервер работает',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        message: 'Сервер работает!',
        timestamp: new Date().toISOString()
    });
});

// Регистрация маршрутов
app.use('/api/auth', authRoutes);
app.use('/api/user/profile', profileRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/scenarios', scenariosRoutes);
app.use('/api/checkpoints', checkpointsRoutes);
app.use('/api/forecast', forecastsRoutes);
app.use('/api/user/stats', statsRoutes);
app.use('/api/economic', economicRoutes);

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('❌ Ошибка:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log('='.repeat(60));
    console.log(`\n🔧 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  База данных: PostgreSQL`);
    console.log('\n✅ Доступные маршруты:');
    console.log('   🔐 /api/auth/*');
    console.log('   👤 /api/user/profile/*');
    console.log('   🎯 /api/goals/*');
    console.log('   💳 /api/payments/*');
    console.log('   📈 /api/scenarios/*');
    console.log('   📌 /api/checkpoints/*');
    console.log('   🔮 /api/forecast/*');
    console.log('   📊 /api/user/stats');
    console.log('\n' + '='.repeat(60) + '\n');
});
