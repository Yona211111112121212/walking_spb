const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Проверка подключения
pool.connect((err, client, release) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err);
    } else {
        console.log('Успешное подключение к PostgreSQL');
        release();
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};