// server/database/migrate.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrate() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'finroad_db',
        user: process.env.DB_USER || 'finroad_user',
        password: process.env.DB_PASSWORD || 'secure_password123',
    });

    try {
        console.log('🚀 Запуск миграции базы данных...\n');
        
        // Читаем файл schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Разбиваем на отдельные команды
        const commands = schema.split(';').filter(cmd => cmd.trim().length > 0);
        
        for (let i = 0; i < commands.length; i++) {
            const cmd = commands[i].trim();
            if (cmd) {
                console.log(`📝 Выполняем команду ${i + 1}/${commands.length}...`);
                await pool.query(cmd);
            }
        }
        
        console.log('\n✅ Миграция выполнена успешно!');
        console.log('📊 Структура базы данных создана\n');
        
        // Выводим список созданных таблиц
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📋 Созданные таблицы:');
        tables.rows.forEach(row => console.log(`   • ${row.table_name}`));
        
    } catch (error) {
        console.error('❌ Ошибка миграции:', error.message);
    } finally {
        await pool.end();
    }
}

// Запуск миграции
migrate();