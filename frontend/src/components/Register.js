import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../utils/api';
import '../styles/App.css';

function Register({ onRegister }) {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        if (error) setError('');
    };

    const validateForm = () => {
        if (formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают');
            return false;
        }

        if (formData.password.length < 6) {
            setError('Пароль должен быть не менее 6 символов');
            return false;
        }

        if (!formData.email.includes('@')) {
            setError('Введите корректный email');
            return false;
        }

        if (!formData.full_name.trim()) {
            setError('Введите ФИО');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            console.log('Отправка запроса на регистрацию...', {
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password
            });
            
            const response = await authApi.register({
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password
            });
            
            console.log('Ответ сервера:', response.data);
            
            if (response.data.token && response.data.user) {
                onRegister(response.data.token, response.data.user);
                navigate('/');
            }
        } catch (err) {
            console.error('Ошибка при регистрации:', err);
            
            if (err.code === 'ERR_NETWORK') {
                setError('Не удалось подключиться к серверу. Проверьте: \n1. Запущен ли backend (npm start в папке backend) \n2. Работает ли сервер на http://localhost:5000');
            } else if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else if (err.response?.data?.errors) {
                setError(err.response.data.errors[0]?.msg || 'Ошибка валидации');
            } else {
                setError('Ошибка при регистрации: ' + (err.message || 'Неизвестная ошибка'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-page">
            {/* Текст сверху */}
            <div className="welcome-text-top">
                <h1 className="welcome-title">Присоединяйтесь к нам!</h1>
                <p className="welcome-subtitle">
                    Создайте аккаунт и откройте для себя лучшие маршруты по Санкт-Петербургу
                </p>
            </div>
            
            <div className="register-container-wide">
                <div className="register-header">
                    <h1>Прогулки по Петербургу</h1>
                    <p>Создайте новый аккаунт</p>
                </div>
                
                <form onSubmit={handleSubmit} className="register-form">
                    {error && (
                        <div className="alert alert-error" style={{ whiteSpace: 'pre-line' }}>
                            {error}
                        </div>
                    )}
                    
                    <div className="form-group">
                        <label>ФИО</label>
                        <input
                            type="text"
                            name="full_name"
                            className="form-control"
                            value={formData.full_name}
                            onChange={handleChange}
                            placeholder="Иванов Иван Иванович"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Email (логин)</label>
                        <input
                            type="email"
                            name="email"
                            className="form-control"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="example@mail.ru"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Пароль (минимум 6 символов)</label>
                        <input
                            type="password"
                            name="password"
                            className="form-control"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Подтвердите пароль</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            className="form-control"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        className="btn btn-primary btn-register"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                Регистрация...
                            </>
                        ) : (
                            'Зарегистрироваться'
                        )}
                    </button>
                </form>
                
                <div className="register-footer">
                    <p>Уже есть аккаунт? <Link to="/login" className="link">Войти</Link></p>
                </div>
            </div>
        </div>
    );
}

export default Register;