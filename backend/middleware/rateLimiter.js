const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

// Кэш для хранения неудачных попыток входа (TTL 5 минут)
const failedAttemptsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Rate limiting мидлвар
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 5, // максимум 5 запросов в минуту
    message: {
        error: 'Слишком много попыток. Пожалуйста, попробуйте позже.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

const trackFailedLogin = (ip, email) => {
    const key = `failed_${ip}_${email}`;
    const currentAttempts = failedAttemptsCache.get(key) || 0;
    const newAttempts = currentAttempts + 1;
    
    failedAttemptsCache.set(key, newAttempts);
    
    console.log(`Неудачная попытка входа для ${email} с IP ${ip}. Попытка: ${newAttempts}`);
    
    return newAttempts;
};

const resetFailedLogin = (ip, email) => {
    const key = `failed_${ip}_${email}`;
    failedAttemptsCache.del(key);
};

const requiresCaptcha = (ip, email) => {
    const key = `failed_${ip}_${email}`;
    const failedAttempts = failedAttemptsCache.get(key) || 0;
    
    return failedAttempts >= 3;
};

const getRemainingAttempts = (ip, email) => {
    const key = `failed_${ip}_${email}`;
    const failedAttempts = failedAttemptsCache.get(key) || 0;
    
    return Math.max(0, 5 - failedAttempts);
};

module.exports = {
    authLimiter,
    trackFailedLogin,
    resetFailedLogin,
    requiresCaptcha,
    getRemainingAttempts,
    failedAttemptsCache
};