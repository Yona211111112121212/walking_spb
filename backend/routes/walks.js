
const express = require('express');
const router = express.Router();
const db = require('../database');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Токен отсутствует' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        res.status(401).json({ error: 'Неверный токен' });
    }
};

// Получение всех прогулок пользователя
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM walks WHERE user_id = $1 ORDER BY is_favorite DESC, created_at DESC',
            [req.userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения прогулок:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создание новой прогулки
router.post('/', authenticateToken, async (req, res) => {
    const { title, is_favorite } = req.body;

    try {
        const result = await db.query(
            'INSERT INTO walks (user_id, title, is_favorite) VALUES ($1, $2, $3) RETURNING *',
            [req.userId, title, is_favorite || false]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка создания прогулки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение прогулки по ID
router.get('/:walkId', authenticateToken, async (req, res) => {
    try {
        // Получаем прогулку
        const walkResult = await db.query(
            'SELECT * FROM walks WHERE id = $1 AND user_id = $2',
            [req.params.walkId, req.userId]
        );

        if (walkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Прогулка не найдена' });
        }

        const walk = walkResult.rows[0];

        // Получаем места в прогулке
        const placesResult = await db.query(`
            SELECT p.*, wp.visited, wp.order_index 
            FROM walk_places wp
            JOIN places p ON wp.place_id = p.id
            WHERE wp.walk_id = $1
            ORDER BY wp.order_index, wp.created_at
        `, [req.params.walkId]);

        walk.places = placesResult.rows;

        res.json(walk);
    } catch (error) {
        console.error('Ошибка получения прогулки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение мест в прогулке
router.get('/:walkId/places', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, wp.visited, wp.order_index 
            FROM walk_places wp
            JOIN places p ON wp.place_id = p.id
            WHERE wp.walk_id = $1
            ORDER BY wp.order_index, wp.created_at
        `, [req.params.walkId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения мест прогулки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление места в прогулку
router.post('/:walkId/places', authenticateToken, async (req, res) => {
    const { placeId } = req.body;

    if (!placeId) {
        return res.status(400).json({ error: 'ID места обязательно' });
    }

    try {
        // Проверяем, существует ли прогулка у пользователя
        const walkCheck = await db.query(
            'SELECT id FROM walks WHERE id = $1 AND user_id = $2',
            [req.params.walkId, req.userId]
        );

        if (walkCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Прогулка не найдена' });
        }

        // Проверяем, существует ли место
        const placeCheck = await db.query(
            'SELECT id FROM places WHERE id = $1',
            [placeId]
        );

        if (placeCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Место не найдено' });
        }

        // Проверяем, не добавлено ли уже это место в прогулку
        const existingCheck = await db.query(
            'SELECT id FROM walk_places WHERE walk_id = $1 AND place_id = $2',
            [req.params.walkId, placeId]
        );

        if (existingCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Место уже добавлено в прогулку' });
        }

        // Получаем текущий максимальный order_index
        const maxOrderResult = await db.query(
            'SELECT MAX(order_index) as max_order FROM walk_places WHERE walk_id = $1',
            [req.params.walkId]
        );
        
        const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;

        // Добавляем место в прогулку
        const result = await db.query(
            `INSERT INTO walk_places (walk_id, place_id, order_index) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [req.params.walkId, placeId, nextOrder]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка добавления места в прогулку:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление нескольких мест в прогулку (для готовых маршрутов)
router.post('/:walkId/places/batch', authenticateToken, async (req, res) => {
    const { placeIds } = req.body; // Массив ID мест

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
        return res.status(400).json({ error: 'Массив ID мест обязателен' });
    }

    try {
        // Проверяем, существует ли прогулка у пользователя
        const walkCheck = await db.query(
            'SELECT id FROM walks WHERE id = $1 AND user_id = $2',
            [req.params.walkId, req.userId]
        );

        if (walkCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Прогулка не найдена' });
        }

        const results = [];
        let orderIndex = 1;

        // Получаем текущий максимальный order_index
        const maxOrderResult = await db.query(
            'SELECT MAX(order_index) as max_order FROM walk_places WHERE walk_id = $1',
            [req.params.walkId]
        );
        
        orderIndex = (maxOrderResult.rows[0].max_order || 0) + 1;

        // Добавляем каждое место
        for (const placeId of placeIds) {
            // Проверяем, существует ли место
            const placeCheck = await db.query(
                'SELECT id FROM places WHERE id = $1',
                [placeId]
            );

            if (placeCheck.rows.length === 0) {
                continue; // Пропускаем несуществующие места
            }

            // Проверяем, не добавлено ли уже это место
            const existingCheck = await db.query(
                'SELECT id FROM walk_places WHERE walk_id = $1 AND place_id = $2',
                [req.params.walkId, placeId]
            );

            if (existingCheck.rows.length > 0) {
                continue; // Пропускаем уже добавленные места
            }

            // Добавляем место
            const result = await db.query(
                `INSERT INTO walk_places (walk_id, place_id, order_index) 
                 VALUES ($1, $2, $3) 
                 RETURNING *`,
                [req.params.walkId, placeId, orderIndex]
            );
            
            results.push(result.rows[0]);
            orderIndex++;
        }

        res.status(201).json({
            success: true,
            message: `Добавлено ${results.length} мест`,
            places: results
        });
    } catch (error) {
        console.error('Ошибка добавления нескольких мест:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление места из прогулки
router.delete('/:walkId/places/:placeId', authenticateToken, async (req, res) => {
    try {
        // Проверяем, существует ли прогулка у пользователя
        const walkCheck = await db.query(
            'SELECT id FROM walks WHERE id = $1 AND user_id = $2',
            [req.params.walkId, req.userId]
        );

        if (walkCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Прогулка не найдена' });
        }

        // Удаляем место из прогулки
        const result = await db.query(
            'DELETE FROM walk_places WHERE walk_id = $1 AND place_id = $2 RETURNING *',
            [req.params.walkId, req.params.placeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Место не найдено в прогулке' });
        }

        res.json({ success: true, message: 'Место удалено из прогулки' });
    } catch (error) {
        console.error('Ошибка удаления места из прогулки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Отметка места как посещенного
router.put('/:walkId/places/:placeId/visit', authenticateToken, async (req, res) => {
    const { visited } = req.body;

    if (typeof visited !== 'boolean') {
        return res.status(400).json({ error: 'Поле visited должно быть boolean' });
    }

    try {
        // Проверяем, существует ли прогулка у пользователя
        const walkCheck = await db.query(
            'SELECT id FROM walks WHERE id = $1 AND user_id = $2',
            [req.params.walkId, req.userId]
        );

        if (walkCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Прогулка не найдена' });
        }

        const result = await db.query(
            'UPDATE walk_places SET visited = $1 WHERE walk_id = $2 AND place_id = $3 RETURNING *',
            [visited, req.params.walkId, req.params.placeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Место не найдено в прогулке' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка обновления посещения:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление порядка мест
router.put('/:walkId/places/order', authenticateToken, async (req, res) => {
    const { places } = req.body; // Массив объектов {placeId, order_index}

    if (!Array.isArray(places)) {
        return res.status(400).json({ error: 'places должен быть массивом' });
    }

    try {
        // Проверяем, существует ли прогулка у пользователя
        const walkCheck = await db.query(
            'SELECT id FROM walks WHERE id = $1 AND user_id = $2',
            [req.params.walkId, req.userId]
        );

        if (walkCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Прогулка не найдена' });
        }

        // Обновляем порядок для каждого места
        for (const place of places) {
            if (!place.placeId || !place.order_index) {
                continue;
            }
            
            await db.query(
                'UPDATE walk_places SET order_index = $1 WHERE walk_id = $2 AND place_id = $3',
                [place.order_index, req.params.walkId, place.placeId]
            );
        }

        res.json({ success: true, message: 'Порядок обновлен' });
    } catch (error) {
        console.error('Ошибка обновления порядка мест:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление прогулки
router.delete('/:walkId', authenticateToken, async (req, res) => {
    try {
        // Проверяем, существует ли прогулка у пользователя и не является ли избранным
        const walkCheck = await db.query(
            'SELECT id, is_favorite FROM walks WHERE id = $1 AND user_id = $2',
            [req.params.walkId, req.userId]
        );

        if (walkCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Прогулка не найдена' });
        }

        if (walkCheck.rows[0].is_favorite) {
            return res.status(400).json({ error: 'Нельзя удалить избранное' });
        }

        // Удаляем прогулку (каскадно удалятся и walk_places)
        await db.query(
            'DELETE FROM walks WHERE id = $1',
            [req.params.walkId]
        );

        res.json({ success: true, message: 'Прогулка удалена' });
    } catch (error) {
        console.error('Ошибка удаления прогулки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление прогулки (название)
router.put('/:walkId', authenticateToken, async (req, res) => {
    const { title } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Название обязательно' });
    }

    try {
        // Проверяем, существует ли прогулка у пользователя
        const walkCheck = await db.query(
            'SELECT id, is_favorite FROM walks WHERE id = $1 AND user_id = $2',
            [req.params.walkId, req.userId]
        );

        if (walkCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Прогулка не найдена' });
        }

        const result = await db.query(
            'UPDATE walks SET title = $1 WHERE id = $2 RETURNING *',
            [title.trim(), req.params.walkId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка обновления прогулки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;
