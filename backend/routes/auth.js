const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { body, validationResult } = require('express-validator');
const { 
    authLimiter, 
    trackFailedLogin, 
    resetFailedLogin, 
    requiresCaptcha,
    getRemainingAttempts 
} = require('../middleware/rateLimiter');
const { 
    generateCaptcha, 
    verifyCaptcha 
} = require('../middleware/captcha');

// Вспомогательная функция для получения IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.ip || 
           'unknown';
};

// Получение капчи (публичный эндпоинт)
router.post('/captcha', (req, res) => {
    try {
        const captcha = generateCaptcha();
        res.json({
            success: true,
            captcha: {
                id: captcha.id,
                text: captcha.text,
                question: captcha.question
            }
        });
    } catch (error) {
        console.error('Ошибка генерации капчи:', error);
        res.status(500).json({ error: 'Ошибка генерации капчи' });
    }
});

// Регистрация с rate limiting
router.post('/register', authLimiter, [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').notEmpty().trim()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name } = req.body;

    try {
        // Проверка существования пользователя
        const existingUser = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        // Хэширование пароля
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Создание пользователя
        const newUser = await db.query(
            'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
            [email, passwordHash, full_name]
        );

        // Создание JWT токена
        const token = jwt.sign(
            { userId: newUser.rows[0].id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            token,
            user: {
                id: newUser.rows[0].id,
                email: newUser.rows[0].email,
                full_name: newUser.rows[0].full_name,
                created_at: newUser.rows[0].created_at
            }
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера при регистрации' });
    }
});

// Вход с защитой от брутфорса
router.post('/login', authLimiter, [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    body('captchaId').optional().trim(),
    body('captchaAnswer').optional().trim()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, captchaId, captchaAnswer } = req.body;
    const clientIP = getClientIP(req);

    console.log(`Попытка входа: ${email} с IP ${clientIP}`);

    try {
        // Проверяем, требуется ли капча
        const needsCaptcha = requiresCaptcha(clientIP, email);
        
        if (needsCaptcha) {
            console.log(`Для ${email} требуется капча`);
            
            // Проверяем наличие капчи в запросе
            if (!captchaId || !captchaAnswer) {
                // Генерируем новую капчу и отправляем пользователю
                const captcha = generateCaptcha();
                return res.status(400).json({ 
                    error: 'Требуется проверка безопасности',
                    captchaRequired: true,
                    captcha: {
                        id: captcha.id,
                        text: captcha.text
                    },
                    message: 'Пройдите проверку безопасности'
                });
            }
            
            // Проверяем капчу
            const isCaptchaValid = verifyCaptcha(captchaId, captchaAnswer);
            if (!isCaptchaValid) {
                trackFailedLogin(clientIP, email);
                const remainingAttempts = getRemainingAttempts(clientIP, email);
                return res.status(400).json({ 
                    error: 'Неверный ответ проверки безопасности',
                    captchaRequired: true,
                    message: `Неправильный ответ. Осталось попыток: ${remainingAttempts}`
                });
            }
        }

        // Ищем пользователя
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            const failedCount = trackFailedLogin(clientIP, email);
            const remainingAttempts = getRemainingAttempts(clientIP, email);
            const needsCaptchaNow = requiresCaptcha(clientIP, email);
            
            const response = {
                error: 'Неверный email или пароль',
                remainingAttempts: remainingAttempts
            };
            
            if (needsCaptchaNow) {
                const captcha = generateCaptcha();
                response.captchaRequired = true;
                response.captcha = {
                    id: captcha.id,
                    text: captcha.text
                };
                response.message = 'Пройдите проверку безопасности';
            }
            
            return res.status(401).json(response);
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            const failedCount = trackFailedLogin(clientIP, email);
            const remainingAttempts = getRemainingAttempts(clientIP, email);
            const needsCaptchaNow = requiresCaptcha(clientIP, email);
            
            const response = {
                error: 'Неверный email или пароль',
                remainingAttempts: remainingAttempts
            };
            
            if (needsCaptchaNow) {
                const captcha = generateCaptcha();
                response.captchaRequired = true;
                response.captcha = {
                    id: captcha.id,
                    text: captcha.text
                };
                response.message = 'Пройдите проверку безопасности';
            }
            
            return res.status(401).json(response);
        }

        // Сброс счетчика неудачных попыток после успешного входа
        resetFailedLogin(clientIP, email);

        // Создание JWT токена
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`Успешный вход: ${email} с IP ${clientIP}`);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                profile_pic_url: user.profile_pic_url,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        
        // В случае ошибки сервера тоже увеличиваем счетчик
        trackFailedLogin(clientIP, email);
        
        res.status(500).json({ 
            error: 'Ошибка сервера при входе',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Проверка email (для валидации при регистрации)
router.post('/check-email', authLimiter, async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email обязателен' });
    }

    try {
        const result = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        res.json({
            exists: result.rows.length > 0
        });
    } catch (error) {
        console.error('Ошибка проверки email:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение профиля
router.get('/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Токен отсутствует' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await db.query(
            'SELECT id, email, full_name, profile_pic_url, created_at FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(401).json({ error: 'Неверный или истёкший токен' });
    }
});

// Обновление профиля
router.put('/profile', [
    body('full_name').optional().trim().isLength({ min: 2 }).withMessage('ФИО должно быть не менее 2 символов'),
    body('email').optional().isEmail().withMessage('Введите корректный email')
], async (req, res) => {
    console.log('=== НАЧАЛО ОБНОВЛЕНИЯ ПРОФИЛЯ ===');
    console.log('Полный заголовок Authorization:', req.headers.authorization);
    
    const token = req.headers.authorization?.split(' ')[1];
    
    console.log('Токен (обрезанный):', token ? token.substring(0, 20) + '...' : 'отсутствует');
    console.log('Тело запроса:', JSON.stringify(req.body, null, 2));
    
    if (!token) {
        console.log('ОШИБКА: Токен отсутствует');
        return res.status(401).json({ error: 'Токен отсутствует' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Ошибки валидации:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        console.log('Проверяем JWT_SECRET:', process.env.JWT_SECRET ? 'установлен' : 'не установлен');
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Токен успешно декодирован:', decoded);
        
        const { full_name, email } = req.body;
        
        console.log('Данные для обновления:', { full_name, email });
        
        // Проверяем, что есть данные для обновления
        if (!full_name && !email) {
            console.log('ОШИБКА: Нет данных для обновления');
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }

        // Проверяем существование пользователя
        const userCheck = await db.query(
            'SELECT id, email FROM users WHERE id = $1',
            [decoded.userId]
        );
        
        console.log('Проверка пользователя:', userCheck.rows);
        
        if (userCheck.rows.length === 0) {
            console.log('ОШИБКА: Пользователь не найден в БД');
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Если меняется email, проверяем уникальность
        if (email && email !== userCheck.rows[0].email) {
            console.log('Проверяем уникальность email:', email);
            const existingEmail = await db.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, decoded.userId]
            );
            
            if (existingEmail.rows.length > 0) {
                console.log('ОШИБКА: Email уже используется другим пользователем');
                return res.status(400).json({ error: 'Email уже используется другим пользователем' });
            }
        }

        // Собираем обновления
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (full_name) {
            updates.push(`full_name = $${paramCount}`);
            values.push(full_name);
            paramCount++;
            console.log('Добавлено обновление full_name:', full_name);
        }

        if (email) {
            updates.push(`email = $${paramCount}`);
            values.push(email);
            paramCount++;
            console.log('Добавлено обновление email:', email);
        }

        values.push(decoded.userId);
        
        const query = `
            UPDATE users 
            SET ${updates.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount}
            RETURNING id, email, full_name, profile_pic_url, created_at
        `;
        
        console.log('SQL запрос:', query);
        console.log('Параметры запроса:', values);

        const result = await db.query(query, values);
        
        console.log('Результат обновления:', result.rows);
        
        if (result.rows.length === 0) {
            console.log('ОШИБКА: Пользователь не найден после обновления');
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        console.log('=== ПРОФИЛЬ УСПЕШНО ОБНОВЛЕН ===');
        console.log('Новые данные:', result.rows[0]);
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('=== ОШИБКА ОБНОВЛЕНИЯ ПРОФИЛЯ ===');
        console.error('Тип ошибки:', error.name);
        console.error('Сообщение:', error.message);
        console.error('Стек ошибки:', error.stack);
        
        if (error.name === 'JsonWebTokenError') {
            console.error('Детали JWT ошибки:', error.message);
            return res.status(401).json({ error: 'Неверный токен' });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Токен истек' });
        }
        
        // Ошибки PostgreSQL
        if (error.code) {
            console.error('Код ошибки PostgreSQL:', error.code);
            console.error('Сообщение PostgreSQL:', error.message);
            console.error('Детали PostgreSQL:', error.detail);
        }
        
        res.status(500).json({ 
            error: 'Ошибка сервера при обновлении профиля',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Смена пароля
router.put('/change-password', [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Токен отсутствует' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { currentPassword, newPassword } = req.body;

        // Получаем пользователя
        const userResult = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const user = userResult.rows[0];

        // Проверяем текущий пароль
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный текущий пароль' });
        }

        // Хэшируем новый пароль
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Обновляем пароль
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [newPasswordHash, decoded.userId]
        );

        res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (error) {
        console.error('Ошибка смены пароля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получение статистики безопасности (для админа/отладки)
router.get('/security-stats', async (req, res) => {
    try {
        const { failedAttemptsCache } = require('../middleware/rateLimiter');
        
        const keys = failedAttemptsCache.keys();
        const stats = keys.map(key => ({
            key: key,
            attempts: failedAttemptsCache.get(key),
            ttl: failedAttemptsCache.getTtl(key)
        }));
        
        res.json({
            totalFailedAttempts: keys.length,
            stats: stats
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;