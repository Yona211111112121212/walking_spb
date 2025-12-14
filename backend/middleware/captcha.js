const NodeCache = require('node-cache');

// Кэш для хранения капч (TTL 10 минут)
const captchaCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Генерация простой математической капчи
const generateCaptcha = () => {
    const operations = ['+', '-', '*'];
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let answer;
    switch (operation) {
        case '+':
            answer = num1 + num2;
            break;
        case '-':
            answer = num1 - num2;
            break;
        case '*':
            answer = num1 * num2;
            break;
    }
    
    const question = `${num1} ${operation} ${num2}`;
    const captchaId = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    captchaCache.set(captchaId, answer.toString());
    
    return {
        id: captchaId,
        question: question,
        text: `Решите: ${num1} ${operation} ${num2} = ?`
    };
};

// Проверка ответа капчи
const verifyCaptcha = (captchaId, userAnswer) => {
    if (!captchaId || !userAnswer) {
        return false;
    }
    
    const correctAnswer = captchaCache.get(captchaId);
    if (!correctAnswer) {
        return false;
    }
    
    captchaCache.del(captchaId);
    
    return correctAnswer === userAnswer.trim();
};

module.exports = {
    generateCaptcha,
    verifyCaptcha
};