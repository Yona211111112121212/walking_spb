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
        res.status(401).json({ error: 'Неверный токен' });
    }
};

// Получение всех воспоминаний пользователя
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT m.*, w.title as walk_title 
            FROM memories m
            LEFT JOIN walks w ON m.walk_id = w.id
            WHERE m.user_id = $1 
            ORDER BY m.created_at DESC
        `, [req.userId]);
        
        // Для каждого воспоминания получаем фотографии
        const memories = result.rows;
        
        for (let memory of memories) {
            const photosResult = await db.query(
                'SELECT * FROM memory_photos WHERE memory_id = $1 ORDER BY created_at',
                [memory.id]
            );
            memory.photos = photosResult.rows;
        }
        
        res.json(memories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создание воспоминания
router.post('/', authenticateToken, async (req, res) => {
    const { walk_id, title, content, photos } = req.body;

    try {
        // Проверяем, существует ли прогулка (если указана)
        if (walk_id) {
            const walkCheck = await db.query(
                'SELECT id FROM walks WHERE id = $1 AND user_id = $2',
                [walk_id, req.userId]
            );
            
            if (walkCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Прогулка не найдена' });
            }
        }

        // Создаем воспоминание
        const memoryResult = await db.query(
            `INSERT INTO memories (user_id, walk_id, title, content) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.userId, walk_id, title, content]
        );

        const memory = memoryResult.rows[0];

        // Добавляем фотографии
        if (photos && photos.length > 0) {
            for (const photoUrl of photos) {
                await db.query(
                    'INSERT INTO memory_photos (memory_id, photo_url) VALUES ($1, $2)',
                    [memory.id, photoUrl]
                );
            }
        }

        // Получаем полные данные воспоминания
        const fullMemoryResult = await db.query(`
            SELECT m.*, w.title as walk_title 
            FROM memories m
            LEFT JOIN walks w ON m.walk_id = w.id
            WHERE m.id = $1
        `, [memory.id]);
        
        const fullMemory = fullMemoryResult.rows[0];
        
        if (fullMemory) {
            const photosResult = await db.query(
                'SELECT * FROM memory_photos WHERE memory_id = $1 ORDER BY created_at',
                [fullMemory.id]
            );
            fullMemory.photos = photosResult.rows;
        }

        res.json(fullMemory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение конкретного воспоминания
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT m.*, w.title as walk_title 
            FROM memories m
            LEFT JOIN walks w ON m.walk_id = w.id
            WHERE m.id = $1 AND m.user_id = $2
        `, [req.params.id, req.userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Воспоминание не найдено' });
        }
        
        const memory = result.rows[0];
        
        // Получаем фотографии
        const photosResult = await db.query(
            'SELECT * FROM memory_photos WHERE memory_id = $1 ORDER BY created_at',
            [memory.id]
        );
        memory.photos = photosResult.rows;
        
        res.json(memory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление воспоминания
router.put('/:id', authenticateToken, async (req, res) => {
    const { walk_id, title, content, photos } = req.body;

    try {
        // Проверяем, существует ли воспоминание у пользователя
        const memoryCheck = await db.query(
            'SELECT id FROM memories WHERE id = $1 AND user_id = $2',
            [req.params.id, req.userId]
        );
        
        if (memoryCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Воспоминание не найдено' });
        }

        // Проверяем, существует ли прогулка (если указана)
        if (walk_id) {
            const walkCheck = await db.query(
                'SELECT id FROM walks WHERE id = $1 AND user_id = $2',
                [walk_id, req.userId]
            );
            
            if (walkCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Прогулка не найдена' });
            }
        }

        // Обновляем воспоминание
        const updateResult = await db.query(
            `UPDATE memories 
             SET walk_id = $1, title = $2, content = $3 
             WHERE id = $4 
             RETURNING *`,
            [walk_id, title, content, req.params.id]
        );

        // Обновляем фотографии
        if (photos) {
            // Удаляем старые фотографии
            await db.query(
                'DELETE FROM memory_photos WHERE memory_id = $1',
                [req.params.id]
            );
            
            // Добавляем новые
            if (photos.length > 0) {
                for (const photoUrl of photos) {
                    await db.query(
                        'INSERT INTO memory_photos (memory_id, photo_url) VALUES ($1, $2)',
                        [req.params.id, photoUrl]
                    );
                }
            }
        }

        // Получаем обновленные данные
        const result = await db.query(`
            SELECT m.*, w.title as walk_title 
            FROM memories m
            LEFT JOIN walks w ON m.walk_id = w.id
            WHERE m.id = $1
        `, [req.params.id]);
        
        const memory = result.rows[0];
        
        if (memory) {
            const photosResult = await db.query(
                'SELECT * FROM memory_photos WHERE memory_id = $1 ORDER BY created_at',
                [memory.id]
            );
            memory.photos = photosResult.rows;
        }

        res.json(memory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление воспоминания
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Проверяем, существует ли воспоминание у пользователя
        const memoryCheck = await db.query(
            'SELECT id FROM memories WHERE id = $1 AND user_id = $2',
            [req.params.id, req.userId]
        );
        
        if (memoryCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Воспоминание не найдено' });
        }

        // Удаляем воспоминание (каскадно удалятся и фотографии)
        await db.query(
            'DELETE FROM memories WHERE id = $1',
            [req.params.id]
        );

        res.json({ success: true, message: 'Воспоминание удалено' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
// Создание воспоминания
router.post('/', authenticateToken, async (req, res) => {
    const { walk_id, title, content } = req.body; // Убрали photos из получения

    try {
        // Проверяем, существует ли прогулка (если указана)
        if (walk_id) {
            const walkCheck = await db.query(
                'SELECT id FROM walks WHERE id = $1 AND user_id = $2',
                [walk_id, req.userId]
            );
            
            if (walkCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Прогулка не найдена' });
            }
        }

        // Создаем воспоминание БЕЗ фотографий
        const memoryResult = await db.query(
            `INSERT INTO memories (user_id, walk_id, title, content) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.userId, walk_id, title, content]
        );

        const memory = memoryResult.rows[0];

        // Получаем полные данные воспоминания
        const fullMemoryResult = await db.query(`
            SELECT m.*, w.title as walk_title 
            FROM memories m
            LEFT JOIN walks w ON m.walk_id = w.id
            WHERE m.id = $1
        `, [memory.id]);
        
        const fullMemory = fullMemoryResult.rows[0];
        
        if (fullMemory) {
            // Возвращаем пустой массив фотографий
            fullMemory.photos = [];
        }

        res.json(fullMemory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
module.exports = router;