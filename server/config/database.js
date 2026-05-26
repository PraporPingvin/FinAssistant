// server/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

let pool;

try {
    pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'finroad_db',
        user: process.env.DB_USER || 'finroad_user',
        password: process.env.DB_PASSWORD || 'secure_password123',
    });
    
    console.log('✅ PostgreSQL настроен');
} catch (error) {
    console.error('❌ Ошибка настройки PostgreSQL:', error.message);
    process.exit(1);
}

module.exports = pool;