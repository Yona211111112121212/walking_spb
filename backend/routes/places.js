const express = require('express');
const router = express.Router();
const db = require('../database');

// Получение всех мест с фильтрацией
router.get('/', async (req, res) => {
    const { category, budget, time, search } = req.query;
    
    try {
        let query = 'SELECT * FROM places WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (category) {
            query += ` AND category = $${paramCount}`;
            params.push(category);
            paramCount++;
        }

        if (budget) {
            query += ` AND budget = $${paramCount}`;
            params.push(budget);
            paramCount++;
        }

        if (time) {
            query += ` AND estimated_time <= $${paramCount}`;
            params.push(parseInt(time));
            paramCount++;
        }

        if (search) {
            query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        query += ' ORDER BY title ASC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение конкретного места
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM places WHERE id = $1',
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Место не найдено' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Готовые прогулки (статичные наборы мест)
router.get('/ready-walks/list', async (req, res) => {
    try {
        const readyWalks = [
            {
                id: 1,
                title: 'Архитектурный Петербург',
                description: 'Знакомство с главными архитектурными шедеврами города',
                image_url: 'https://avatars.mds.yandex.net/i?id=194a0acdd975d765d840c339be939b6b_l-8258224-images-thumbs&n=13',
                place_ids: [4, 7] // Храм Спаса на Крови, Исаакиевский собор
            },
            {
                id: 2,
                title: 'Музейный день',
                description: 'Посещение лучших музеев города за один день',
                image_url: 'https://avatars.mds.yandex.net/i?id=f2f2a547fd11abfed2ed7416f67d00a8a0f82f1e-5873280-images-thumbs&n=13',
                place_ids: [1, 5, 8] // Эрмитаж, Русский музей, Кунсткамера
            },
            {
                id: 3,
                title: 'Парки и сады',
                description: 'Прогулка по самым красивым паркам Северной столицы',
                image_url: 'https://avatars.mds.yandex.net/i?id=ba4e5363243de2acbf7489f812d2b081d62149f6-16427651-images-thumbs&n=13',
                place_ids: [2, 6] // Летний сад, Петергоф
            },
            {
                id: 4,
                title: 'Бесплатные достопримечательности',
                description: 'Экскурсия по самым интересным бесплатным местам',
                image_url: 'https://avatars.mds.yandex.net/i?id=38253760c85976a8a09d799390275109b0c912f8-4568535-images-thumbs&n=13',
                place_ids: [2, 3, 9] // Летний сад, Медный всадник, Дворцовый мост
            }
        ];

        // Получаем информацию о местах для каждой прогулки
        for (let walk of readyWalks) {
            if (walk.place_ids && walk.place_ids.length > 0) {
                const placeQuery = `SELECT * FROM places WHERE id = ANY($1::int[])`;
                const placeResult = await db.query(placeQuery, [walk.place_ids]);
                walk.places = placeResult.rows;
                walk.places_count = walk.places.length;
            }
        }

        res.json(readyWalks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


module.exports = router;