import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../utils/api';
import '../styles/App.css';

function Login({ onLogin }) {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        captchaId: '',
        captchaAnswer: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [captchaData, setCaptchaData] = useState(null);
    const [remainingAttempts, setRemainingAttempts] = useState(null);
    const navigate = useNavigate();

    // УБИРАЕМ автоматическую загрузку капчи
    // useEffect(() => {
    //     loadNewCaptcha();
    // }, []);

    const loadNewCaptcha = async () => {
        try {
            const response = await authApi.getCaptcha();
            if (response.data.success) {
                setCaptchaData(response.data.captcha);
                setFormData(prev => ({
                    ...prev,
                    captchaId: response.data.captcha.id
                }));
            }
        } catch (error) {
            console.error('Ошибка загрузки капчи:', error);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.email.trim()) {
            newErrors.email = 'Email обязателен';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Некорректный email';
        }
        
        if (!formData.password) {
            newErrors.password = 'Пароль обязателен';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Пароль должен быть не менее 6 символов';
        }
        
        // Проверка капчи, если она отображается
        if (captchaData && !formData.captchaAnswer.trim()) {
            newErrors.captchaAnswer = 'Введите ответ';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
        if (serverError) {
            setServerError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setIsLoading(true);
        setServerError('');
        setRemainingAttempts(null);
        
        try {
            console.log('Отправка запроса на вход...', formData);
            const response = await authApi.login(formData);
            console.log('Ответ сервера:', response.data);
            
            if (response.data.success) {
                onLogin(response.data.token, response.data.user);
                navigate('/');
            }
        } catch (err) {
            console.error('Ошибка при входе:', err);
            
            if (err.code === 'ERR_NETWORK') {
                setServerError('Не удалось подключиться к серверу. Проверьте, запущен ли backend на порту 5000.');
            } else if (err.response?.data?.error) {
                const errorData = err.response.data;
                setServerError(errorData.error);
                
                // Обработка информации о капче
                if (errorData.captchaRequired) {
                    setCaptchaData(errorData.captcha);
                    setFormData(prev => ({
                        ...prev,
                        captchaId: errorData.captcha.id,
                        captchaAnswer: '' // Сбрасываем предыдущий ответ
                    }));
                }
                
                // Отображение оставшихся попыток
                if (errorData.remainingAttempts !== undefined) {
                    setRemainingAttempts(errorData.remainingAttempts);
                }
                
                // Загрузка новой капчи при неверном ответе
                if (errorData.captchaRequired && errorData.error.includes('Неверный ответ')) {
                    loadNewCaptcha();
                }
            } else if (err.response?.data?.errors) {
                setServerError(err.response.data.errors[0]?.msg || 'Ошибка валидации');
            } else {
                setServerError('Ошибка при входе. Проверьте данные и подключение к серверу.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCaptchaRefresh = () => {
        loadNewCaptcha();
        setFormData(prev => ({
            ...prev,
            captchaAnswer: ''
        }));
    };

    return (
        <div className="login-page">
            {/* Текст сверху */}
            <div className="welcome-text-top">
                <h1 className="welcome-title">Добро пожаловать!</h1>
                <p className="welcome-subtitle">
                    Войдите в свой аккаунт, чтобы начать исследовать Санкт-Петербург
                </p>
            </div>
            
            <div className="login-container-wide">
                <div className="login-header">
                    <h1>Прогулки по Петербургу</h1>
                    <p>Войдите в свой аккаунт</p>
                </div>
                
                <form onSubmit={handleSubmit} className="login-form">
                    {serverError && (
                        <div className="alert alert-error">
                            {serverError}
                        </div>
                    )}
                    
                    {remainingAttempts !== null && remainingAttempts > 0 && (
                        <div className="alert alert-warning">
                            Осталось попыток входа: {remainingAttempts}
                        </div>
                    )}
                    
                    <div className="form-group">
                        <label htmlFor="email">Email (логин)</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className={`form-control ${errors.email ? 'error' : ''}`}
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="example@mail.ru"
                            disabled={isLoading}
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Пароль</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            className={`form-control ${errors.password ? 'error' : ''}`}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>
                    
                    {/* Капча секция - теперь появляется только когда нужно */}
                    {captchaData && (
                        <div className="captcha-section">
                            <div className="captcha-header">
                                <label>Проверка безопасности</label>
                                <button 
                                    type="button" 
                                    className="btn-captcha-refresh"
                                    onClick={handleCaptchaRefresh}
                                    disabled={isLoading}
                                >
                                    Обновить
                                </button>
                            </div>
                            <div className="captcha-display">
                                <div className="captcha-question">
                                    {captchaData.text}
                                </div>
                                <input
                                    type="text"
                                    name="captchaAnswer"
                                    className={`form-control ${errors.captchaAnswer ? 'error' : ''}`}
                                    value={formData.captchaAnswer}
                                    onChange={handleChange}
                                    placeholder="Введите ответ"
                                    disabled={isLoading}
                                />
                                {errors.captchaAnswer && (
                                    <span className="error-text">{errors.captchaAnswer}</span>
                                )}
                            </div>
                            <div className="captcha-help">
                                Решите простую математическую задачу для подтверждения, что вы не робот.
                            </div>
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        className="btn btn-primary btn-login"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                Вход...
                            </>
                        ) : (
                            'Войти'
                        )}
                    </button>
                </form>
                
                <div className="login-footer">
                    <p>Ещё нет аккаунта? <Link to="/register" className="link">Зарегистрироваться</Link></p>
                    
                </div>
            </div>
        </div>
    );
}

export default Login;