import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { walksApi } from '../utils/api';
import '../styles/App.css';

function WalkManager({ user, onLogout }) {
    const [walks, setWalks] = useState([]);
    const [newWalkTitle, setNewWalkTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadWalks();
    }, []);

    const loadWalks = async () => {
        setIsLoading(true);
        try {
            const response = await walksApi.getAll();
            setWalks(response.data);
        } catch (error) {
            console.error('Ошибка загрузки прогулок:', error);
            showNotification('Ошибка загрузки прогулок', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification('');
        }, 3000);
    };

    const createWalk = async () => {
        if (!newWalkTitle.trim()) {
            showNotification('Введите название прогулки', 'error');
            return;
        }

        try {
            const response = await walksApi.create({ title: newWalkTitle });
            setNewWalkTitle('');
            setWalks(prev => [...prev, response.data]);
            showNotification('Прогулка создана!');
        } catch (error) {
            console.error('Ошибка создания прогулки:', error);
            showNotification(error.response?.data?.error || 'Ошибка создания прогулки', 'error');
        }
    };

    const deleteWalk = async (walkId, isFavorite) => {
        if (isFavorite) {
            showNotification('Избранное нельзя удалить', 'error');
            return;
        }

        // Красивое подтверждение
        const confirmDelete = window.confirm('Удалить эту прогулку?');
        if (!confirmDelete) {
            return;
        }

        try {
            await walksApi.delete(walkId);
            setWalks(prev => prev.filter(walk => walk.id !== walkId));
            showNotification('Прогулка удалена!');
        } catch (error) {
            console.error('Ошибка удаления прогулки:', error);
            showNotification(error.response?.data?.error || 'Ошибка удаления прогулки', 'error');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    };

    return (
        <div className="walks-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header user={user} currentPage="walks" onLogout={onLogout} />
            
            {/* Зеленое уведомление */}
            {notification && (
                <div className="notification-green">
                    {notification.message}
                </div>
            )}
            
            <div className="walks-container" style={{ flex: 1 }}>
                {/* Центрированная кнопка создания */}
                <div className="page-header-centered">
                    <div className="create-center-container" style={{ width: '100%', maxWidth: '500px' }}>
                        <div style={{ width: '100%' }}>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Название новой прогулки"
                                value={newWalkTitle}
                                onChange={(e) => setNewWalkTitle(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') createWalk();
                                }}
                                style={{ marginBottom: '12px', textAlign: 'center' }}
                            />
                            <button 
                                className="btn btn-primary" 
                                onClick={createWalk} 
                                style={{ width: '100%', padding: '14px' }}
                            >
                                Создать прогулку
                            </button>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="loading-places">
                        <div className="spinner"></div>
                        <p>Загрузка прогулок...</p>
                    </div>
                ) : (
                    // ИСПРАВЛЕННЫЙ ГРИД - прогулки в несколько рядов
                    <div className="walks-grid-fixed">
                        {walks.map(walk => ( 
                            <div 
                                key={walk.id} 
                                className={`walk-folder ${walk.is_favorite ? 'walk-favorite-light' : ''}`}
                                onClick={() => navigate(`/walks/${walk.id}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="walk-folder-header">
                                    <h3 className="walk-folder-title">{walk.title}</h3>
                                    {walk.is_favorite && ( 
                                        <span className="walk-favorite-badge">★ Избранное</span>
                                    )}
                                </div>
                                
                                <div className="walk-folder-content">
                                    <div className="walk-info">
                                        <p className="walk-date">
                                            Создано: {formatDate(walk.created_at)}
                                        </p>
                                    </div>
                                    
                                    <div className="walk-folder-actions" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                            className="btn btn-primary"
                                            onClick={() => navigate(`/walks/${walk.id}`)}
                                            style={{ padding: '10px 20px', fontSize: '15px' }}
                                        >
                                            Открыть
                                        </button>
                                        {!walk.is_favorite && (
                                            <button 
                                                className="btn btn-danger"
                                                onClick={() => deleteWalk(walk.id, walk.is_favorite)}
                                                style={{ padding: '10px 20px', fontSize: '15px' }}
                                            >
                                                Удалить
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && walks.length === 0 && (
                    <div className="no-results" style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <p>У вас пока нет прогулок</p>
                        <p>Создайте первую прогулку или добавьте места в Избранное!</p>
                    </div>
                )}
            </div>

            {/* Фиксированный подвал */}
            <footer className="site-footer-fixed">
                <p>По вопросам и предложениям: <a href="mailto:contact@walkingspb.ru" className="email-link-green">contact@walkingspb.ru</a></p>
            </footer>
        </div>
    );
}

export default WalkManager;