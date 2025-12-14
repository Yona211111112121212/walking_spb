
import axios from 'axios';

// Базовый URL для API
const API_BASE_URL = 'http://localhost:5000/api';

// Создаем экземпляр axios с настройками
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Добавляем интерцептор для автоматической подстановки токена
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Обработчик ошибок
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Если токен невалидный, разлогиниваем
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// API для аутентификации
export const authApi = {
    // Регистрация
    register: (data) => api.post('/auth/register', data),
    
    // Вход (с поддержкой captcha)
    login: (data) => api.post('/auth/login', data),
    
    // Получение captcha
    getCaptcha: () => api.post('/auth/captcha'),
    
    // Проверка статуса captcha
    checkCaptchaStatus: () => api.get('/auth/captcha-status'),
    
    // Получение профиля
    getProfile: () => api.get('/auth/profile'),
    
    // Обновление профиля
    updateProfile: (data) => api.put('/auth/profile', data),
    
    // Смена пароля
    changePassword: (data) => api.put('/auth/change-password', data)
};

// API для мест
export const placesApi = {
    // Получение всех мест
    getAll: (params = {}) => api.get('/places', { params }),
    
    // Получение места по ID
    getById: (id) => api.get(`/places/${id}`),
    
    // Получение готовых прогулок
    getReadyWalks: () => api.get('/places/ready-walks/list'),
    
    // Заполнение тестовыми данными
    seed: () => api.post('/places/seed')
};

// API для прогулок
export const walksApi = {
    // Получение всех прогулок пользователя
    getAll: () => api.get('/walks'),
    
    // Получение прогулки по ID
    getById: (id) => api.get(`/walks/${id}`),
    
    // Создание прогулки
    create: (data) => api.post('/walks', data),
    
    // Обновление прогулки
    update: (id, data) => api.put(`/walks/${id}`, data),
    
    // Удаление прогулки
    delete: (id) => api.delete(`/walks/${id}`),
    
    // Получение мест в прогулке
    getPlaces: (walkId) => api.get(`/walks/${walkId}/places`),
    
    // Добавление места в прогулку
    addPlace: (walkId, placeId) => api.post(`/walks/${walkId}/places`, { placeId }),
    
    // Удаление места из прогулки
    removePlace: (walkId, placeId) => api.delete(`/walks/${walkId}/places/${placeId}`),
    
    // Отметка места как посещенного
    markVisited: (walkId, placeId, visited) => 
        api.put(`/walks/${walkId}/places/${placeId}/visit`, { visited })
};

// API для воспоминаний
export const memoriesApi = {
    // Получение всех воспоминаний
    getAll: () => api.get('/memories'),
    
    // Получение воспоминания по ID
    getById: (id) => api.get(`/memories/${id}`),
    
    // Создание воспоминания
    create: (data) => api.post('/memories', data),
    
    // Обновление воспоминания
    update: (id, data) => api.put(`/memories/${id}`, data),
    
    // Удаление воспоминания
    delete: (id) => api.delete(`/memories/${id}`)
};

// API для тестирования
export const testApi = {
    // Тест подключения
    testConnection: () => axios.get('/api/test'),
    
    // Тест профиля
    testProfile: () => axios.get('/api/auth/profile'),
    
    // Тест авторизации
    testAuth: () => axios.get('/api/auth/profile')
};

export default api;
