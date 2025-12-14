// components/WalkDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from './Header';
import YandexMap from './YandexMap';
import { walksApi } from '../utils/api';
import '../styles/App.css';
import { FiMapPin, FiList, FiChevronUp, FiChevronDown } from 'react-icons/fi';

function WalkDetail({ user, onLogout }) {
    const { walkId } = useParams();
    const navigate = useNavigate();
    const [walk, setWalk] = useState(null);
    const [places, setPlaces] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [notification, setNotification] = useState('');
    const [showRouteMap, setShowRouteMap] = useState(true);

    useEffect(() => {
        loadWalk();
    }, [walkId]);

    const loadWalk = async () => {
        setIsLoading(true);
        try {
            const response = await walksApi.getById(walkId);
            setWalk(response.data);
            setPlaces(response.data.places || []);
        } catch (error) {
            console.error('Ошибка загрузки прогулки:', error);
            showNotification('Прогулка не найдена', 'error');
            navigate('/walks');
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

    const startWalk = () => {
        setIsActive(true);
        setShowCompletion(false);
        showNotification('Прогулка начата! Отмечайте посещенные места');
    };

    const completeWalk = () => {
        setIsActive(false);
        setShowCompletion(true);
        showNotification('Прогулка завершена! Вы молодец!');
    };

    // Функция для открытия адреса на Яндекс картах
    const handleAddressClick = (place) => {
        if (place.address) {
            const query = encodeURIComponent(`${place.title}, ${place.address}, Санкт-Петербург`);
            const yandexMapsUrl = `https://yandex.ru/maps/?text=${query}`;
            window.open(yandexMapsUrl, '_blank', 'noopener,noreferrer');
        } else if (place.map_link) {
            window.open(place.map_link, '_blank', 'noopener,noreferrer');
        } else {
            const query = encodeURIComponent(`${place.title}, Санкт-Петербург`);
            window.open(`https://yandex.ru/maps/?text=${query}`, '_blank', 'noopener,noreferrer');
        }
    };

    const markPlaceAsVisited = async (placeId, visited) => {
        try {
            await walksApi.markVisited(walkId, placeId, visited);
            
            setPlaces(prev => prev.map(place => 
                place.id === placeId ? { ...place, visited } : place
            ));
            
            if (visited) {
                showNotification('Место отмечено как посещенное!');
            }
        } catch (error) {
            console.error('Ошибка отметки посещения:', error);
            showNotification(error.response?.data?.error || 'Ошибка отметки посещения', 'error');
        }
    };

    const handleRemovePlace = (placeId) => {
        setShowDeleteConfirm({
            type: 'place',
            id: placeId,
            name: places.find(p => p.id === placeId)?.title
        });
    };

    const removePlace = async (placeId) => {
        try {
            await walksApi.removePlace(walkId, placeId);
            setPlaces(prev => prev.filter(place => place.id !== placeId));
            setShowDeleteConfirm(null);
            showNotification('Место удалено из прогулки');
        } catch (error) {
            console.error('Ошибка удаления места:', error);
            showNotification(error.response?.data?.error || 'Ошибка удаления места', 'error');
        }
    };

    const moveVisitedToEnd = () => {
        const visitedPlaces = places.filter(p => p.visited);
        const notVisitedPlaces = places.filter(p => !p.visited);
        setPlaces([...notVisitedPlaces, ...visitedPlaces]);
        showNotification('Места отсортированы: посещенные в конце');
    };

    const calculateProgress = () => {
        if (!places.length) return 0;
        const visitedCount = places.filter(p => p.visited).length;
        return Math.round((visitedCount / places.length) * 100);
    };

    const allPlacesVisited = places.length > 0 && places.every(p => p.visited);

    if (isLoading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Загрузка прогулки...</p>
            </div>
        );
    }

    if (!walk) {
        return null;
    }

    return (
        <div className="walks-page">
            <Header user={user} currentPage="walks" onLogout={onLogout} />
            
            {notification && (
                <div className="notification-green">
                    {notification.message}
                </div>
            )}
            
            <div className="walks-container">
                <div className="walks-header">
                    <h2 className="walks-title">{walk.title}</h2>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                        {!isActive && places.length > 0 && (
                            <button className="btn btn-primary" onClick={startWalk}>
                                Начать прогулку
                            </button>
                        )}
                        {isActive && allPlacesVisited && (
                            <button className="btn btn-primary" onClick={completeWalk}>
                                Завершить прогулку
                            </button>
                        )}
                        <button 
                            className="btn btn-secondary"
                            onClick={() => navigate('/walks')}
                        >
                            Назад к списку
                        </button>
                    </div>
                </div>

                {/* Прогресс */}
                {places.length > 0 && (
                    <div className="walk-progress" style={{ marginBottom: '20px' }}>
                        <div className="progress-text">
                            Прогресс: {calculateProgress()}% ({places.filter(p => p.visited).length}/{places.length})
                        </div>
                        <div className="progress-bar-beautiful">
                            <div 
                                className="progress-fill-beautiful" 
                                style={{ width: `${calculateProgress()}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* КАРТА МАРШРУТА - АДАПТИВНАЯ */}
                {places.length > 0 && showRouteMap && (
                    <div className="walk-map-section" style={{ 
                        marginBottom: '25px',
                        backgroundColor: 'var(--light-bg)',
                        padding: '20px',
                        borderRadius: '15px',
                        border: '2px solid var(--button-border)'
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '15px',
                            flexWrap: 'wrap',
                            gap: '10px'
                        }}>
                            <h3 className="section-title" style={{ 
                                fontSize: '22px', 
                                margin: 0, 
                                color: 'var(--primary-dark)',
                                flex: 1,
                                minWidth: '200px'
                            }}>
                                <FiMapPin style={{ marginRight: '10px' }} />
                                Карта маршрута: {places.length} мест
                            </h3>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button 
                                    className="btn btn-secondary"
                                    onClick={() => setShowRouteMap(!showRouteMap)}
                                    style={{ 
                                        padding: '8px 15px', 
                                        fontSize: '14px',
                                        backgroundColor: 'var(--light-bg)',
                                        color: 'var(--primary-dark)',
                                        borderColor: 'var(--border-color)'
                                    }}
                                >
                                    {showRouteMap ? 
                                        <><FiChevronUp style={{ marginRight: '5px' }} /> Скрыть</> : 
                                        <><FiChevronDown style={{ marginRight: '5px' }} /> Показать</>
                                    }
                                </button>
                            </div>
                        </div>
                        
                        <div style={{ 
                            height: window.innerWidth < 768 ? '300px' : '400px', 
                            borderRadius: '10px', 
                            overflow: 'hidden',
                            transition: 'height 0.3s ease'
                        }}>
                            <YandexMap 
                                place={{ 
                                    id: walkId,
                                    title: walk?.title || 'Маршрут',
                                    description: `Прогулка включает ${places.length} мест`,
                                    places: places,
                                    address: places.length > 0 ? places[0].address : null
                                }}
                                height={window.innerWidth < 768 ? 300 : 400}
                                showControls={true}
                                zoom={14}
                                type="route"
                            />
                        </div>
                    </div>
                )}

                {/* Список мест */}
                <div className="walk-details-content">
                    {places.length === 0 ? (
                        <div className="no-results" style={{ textAlign: 'center', padding: '40px' }}>
                            <p>В этой прогулке пока нет мест</p>
                            <p>Добавьте места с главной страницы!</p>
                            <button 
                                className="btn btn-primary"
                                onClick={() => navigate('/')}
                                style={{ marginTop: '20px' }}
                            >
                                На главную
                            </button>
                        </div>
                    ) : (
                        <>
                            {!showRouteMap && (
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'flex-end', 
                                    marginBottom: '15px' 
                                }}>
                                    <button 
                                        className="btn btn-secondary"
                                        onClick={() => setShowRouteMap(true)}
                                        style={{ 
                                            padding: '10px 20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            backgroundColor: 'var(--light-bg)',
                                            color: 'var(--primary-dark)',
                                            borderColor: 'var(--border-color)'
                                        }}
                                    >
                                        <FiMapPin size={16} />
                                        Показать карту маршрута
                                    </button>
                                </div>
                            )}
                            
                            <div className="walk-places-list-detailed">
                                {places.map((place, index) => (
                                    <div key={place.id} className="walk-place-item-beautiful">
                                        <div className="place-number-beautiful">{index + 1}</div>
                                        <div className="place-info-beautiful">
                                            <h4 className="place-title-beautiful">{place.title}</h4>
                                            {place.description && (
                                                <p className="place-description-beautiful">
                                                    {place.description.length > 120 
                                                        ? `${place.description.substring(0, 120)}...` 
                                                        : place.description}
                                                </p>
                                            )}
                                            {place.address && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                                                    <button 
                                                        className="address-link-beautiful"
                                                        onClick={() => handleAddressClick(place)}
                                                        title="Открыть на Яндекс Картах"
                                                        style={{ padding: '0' }}
                                                    >
                                                        <FiMapPin className="address-icon" size={14} />
                                                        <span style={{ fontSize: '14px' }}>{place.address}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="place-actions-beautiful">
                                            {isActive ? (
                                                <label className="visited-checkbox-beautiful">
                                                    <input
                                                        type="checkbox"
                                                        checked={place.visited || false}
                                                        onChange={(e) => markPlaceAsVisited(place.id, e.target.checked)}
                                                    />
                                                    <div className="checkbox-custom"></div>
                                                    <span>{place.visited ? 'Посещено' : 'Отметить'}</span>
                                                </label>
                                            ) : (
                                                <div className={`visit-status-beautiful ${place.visited ? 'visited' : 'not-visited'}`}>
                                                    {place.visited ? '✓ Посещено' : 'Еще не посещено'}
                                                </div>
                                            )}
                                            <button 
                                                className="remove-place-btn-beautiful"
                                                onClick={() => handleRemovePlace(place.id)}
                                                title="Удалить место"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Кнопки управления */}
                {places.length > 0 && (
                    <div className="walk-actions-footer" style={{ marginTop: '30px', textAlign: 'center' }}>
                        <button 
                            className="btn btn-secondary"
                            onClick={moveVisitedToEnd}
                            style={{ 
                                padding: '12px 25px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                margin: '0 auto',
                                backgroundColor: 'var(--light-bg)',
                                color: 'var(--primary-dark)',
                                borderColor: 'var(--border-color)'
                            }}
                        >
                            <FiList size={16} />
                            Посещенные в конец
                        </button>
                    </div>
                )}

                {/* Сообщение о завершении */}
                {showCompletion && (
                    <div className="walk-completion-message">
                        <h3>Прогулка завершена! :)</h3>
                        <p>Молодец! Вы успешно завершили прогулку "{walk.title}"!</p>
                        <p>Хотите сохранить воспоминания об этой прогулке?</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <button 
                                className="btn btn-primary"
                                onClick={() => navigate('/memories', { state: { walkId: walk.id, walkTitle: walk.title } })}
                            >
                                Создать воспоминание
                            </button>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowCompletion(false)}
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                )}

                {/* Если прогулка активна и все места посещены */}
                {isActive && allPlacesVisited && !showCompletion && (
                    <div className="walk-completion-message">
                        <h3>Все места посещены!</h3>
                        <p>Вы посетили все места в этой прогулке. Нажмите "Завершить прогулку", чтобы сохранить результат.</p>
                        <button 
                            className="btn btn-primary"
                            onClick={completeWalk}
                            style={{ marginTop: '10px' }}
                        >
                            Завершить прогулку
                        </button>
                    </div>
                )}
            </div>

            {/* Модальное окно подтверждения удаления */}
            {showDeleteConfirm && (
                <div className="modal-overlay">
                    <div className="confirm-modal">
                        <h3 className="confirm-title">Удалить место?</h3>
                        <p className="confirm-message">
                            Вы уверены, что хотите удалить "{showDeleteConfirm.name}" из прогулки?
                        </p>
                        <div className="confirm-buttons">
                            <button 
                                className="btn btn-danger"
                                onClick={() => removePlace(showDeleteConfirm.id)}
                            >
                                Удалить
                            </button>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteConfirm(null)}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ФИКСИРОВАННЫЙ ПОДВАЛ */}
            <footer className="site-footer-fixed">
                <p>По вопросам и предложениям: <a href="mailto:contact@walkingspb.ru" className="email-link-green">contact@walkingspb.ru</a></p>
            </footer>
        </div>
    );
}

export default WalkDetail;