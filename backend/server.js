const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/frontend', express.static('frontend'));
// Подключаем маршруты
const authRoutes = require('./routes/auth');
const placesRoutes = require('./routes/places');
const walksRoutes = require('./routes/walks');
const memoriesRoutes = require('./routes/memories');

app.use('/api/auth', authRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/walks', walksRoutes);
app.use('/api/memories', memoriesRoutes);

// Тестовый маршрут
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend работает!' });
});

// Для всех остальных маршрутов
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
    console.log(`📍 Маршруты доступны по адресу: http://localhost:${PORT}`);
});
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    version: process.env.VERSION || 'unknown',
    timestamp: new Date().toISOString()
  });
});

app.get('/status', (req, res) => {
  res.json({
    app: 'SP Project',
    version: process.env.VERSION,
    color: process.env.COLOR,
    environment: process.env.NODE_ENV
  });
});