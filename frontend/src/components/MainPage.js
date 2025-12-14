import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import PlaceModal from './PlaceModal';
import { placesApi, walksApi } from '../utils/api';
import '../styles/App.css';

function MainPage({ user, onLogout }) {
    const [places, setPlaces] = useState([]);
    const [readyWalks, setReadyWalks] = useState([]);
    const [filteredPlaces, setFilteredPlaces] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedBudgets, setSelectedBudgets] = useState([]);
    const [selectedTimes, setSelectedTimes] = useState([]);
    const [showReadyWalks, setShowReadyWalks] = useState(false);
    const [userWalks, setUserWalks] = useState([]);
    const [notification, setNotification] = useState('');
    const navigate = useNavigate();

    const interestCategories = [
        { id: 'Музеи', label: 'Музеи' },
        { id: 'Парки', label: 'Парки' },
        { id: 'Памятники', label: 'Памятники' },
        { id: 'Архитектура', label: 'Архитектура' },
        { id: 'Галереи', label: 'Галереи' },
        { id: 'Мосты', label: 'Мосты' },
        { id: 'Тематическое Кафе', label: 'Тематическое Кафе' }
    ];

    const budgetOptions = [
        { id: 'бесплатно', label: 'Бесплатно' },
        { id: 'бюджетно', label: 'Бюджетно' },
        { id: 'средний', label: 'Средний' },
        { id: 'премиум', label: 'Премиум' }
    ];

    const timeOptions = [
        { id: '30', label: 'До 30 мин' },
        { id: '60', label: 'До 1 часа' },
        { id: '120', label: 'До 2 часов' },
        { id: '180', label: 'До 3 часов' }
    ];

    // Загрузка данных
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const placesResponse = await placesApi.getAll();
            const placesData = placesResponse.data || [];
             console.log('=== ДАННЫЕ С СЕРВЕРА ===');
        console.log('Получено мест:', placesData.length);
        console.log('Пример места:', placesData[0]);
        console.log('Все категории:', placesData.map(p => p.category).filter(Boolean));
        console.log('Все бюджеты:', placesData.map(p => p.budget).filter(Boolean));
        
        setPlaces(placesData);
        setFilteredPlaces(placesData);
            const readyWalksResponse = await placesApi.getReadyWalks();
            setReadyWalks(readyWalksResponse.data || []);
            
            const walksResponse = await walksApi.getAll();
            setUserWalks(walksResponse.data || []);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            showNotification('Ошибка загрузки данных с сервера', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // ПРОСТАЯ И РАБОТАЮЩАЯ ФИЛЬТРАЦИЯ
    useEffect(() => {
        let result = [...places];
          console.log('=== ДЕБАГ ФИЛЬТРАЦИИ ===');
    console.log('Все места (первые 3):', places.slice(0, 3));
    console.log('Уникальные категории в БД:', [...new Set(places.map(p => p.category))]);
    console.log('Уникальные бюджеты в БД:', [...new Set(places.map(p => p.budget))]);
    console.log('Выбранные категории для фильтра:', selectedCategories);
    console.log('Выбранные бюджеты для фильтра:', selectedBudgets);
    console.log('Выбранные времена для фильтра:', selectedTimes);
    console.log('Поисковой запрос:', searchQuery);
        console.log('Начало фильтрации. Всего мест:', result.length);
        console.log('Выбранные категории:', selectedCategories);
        console.log('Выбранные бюджеты:', selectedBudgets);
        console.log('Выбранные времена:', selectedTimes);
        console.log('Поиск:', searchQuery);
        
        // Поиск
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(place => 
                (place.title && place.title.toLowerCase().includes(query)) ||
                (place.description && place.description.toLowerCase().includes(query))
            );
            console.log('После поиска осталось:', result.length);
        }
        
        // Фильтр по категориям
        if (selectedCategories.length > 0) {
            console.log('Применяем фильтр категорий:', selectedCategories);
            result = result.filter(place => {
                if (!place.category) return false;
                return selectedCategories.includes(place.category);
            });
            console.log('После фильтра категорий осталось:', result.length);
        }
        
        // Фильтр по бюджету
        if (selectedBudgets.length > 0) {
            console.log('Применяем фильтр бюджета:', selectedBudgets);
            result = result.filter(place => {
                if (!place.budget) return false;
                return selectedBudgets.includes(place.budget);
            });
            console.log('После фильтра бюджета осталось:', result.length);
        }
        
        // Фильтр по времени
        if (selectedTimes.length > 0) {
            console.log('Применяем фильтр времени:', selectedTimes);
            result = result.filter(place => {
                if (!place.estimated_time) return false;
                const time = parseInt(place.estimated_time);
                return selectedTimes.some(timeId => {
                    const maxTime = parseInt(timeId);
                    return time <= maxTime;
                });
            });
            console.log('После фильтра времени осталось:', result.length);
        }
        
        console.log('Итоговое количество мест после фильтров:', result.length);
        setFilteredPlaces(result);
        
    }, [places, selectedCategories, selectedBudgets, selectedTimes, searchQuery]);

    const toggleCategory = (categoryId) => {
        setSelectedCategories(prev => 
            prev.includes(categoryId) 
                ? prev.filter(id => id !== categoryId) 
                : [...prev, categoryId]
        );
    };

    const toggleBudget = (budgetId) => {
        setSelectedBudgets(prev => 
            prev.includes(budgetId) 
                ? prev.filter(id => id !== budgetId) 
                : [...prev, budgetId]
        );
    };

    const toggleTime = (timeId) => {
        setSelectedTimes(prev => 
            prev.includes(timeId) 
                ? prev.filter(id => id !== timeId) 
                : [...prev, timeId]
        );
    };

    const removeFilter = (type, id) => {
        switch (type) {
            case 'category':
                setSelectedCategories(prev => prev.filter(item => item !== id));
                break;
            case 'budget':
                setSelectedBudgets(prev => prev.filter(item => item !== id));
                break;
            case 'time':
                setSelectedTimes(prev => prev.filter(item => item !== id));
                break;
            default:
                break;
        }
    };

    const clearAllFilters = () => {
        setSelectedCategories([]);
        setSelectedBudgets([]);
        setSelectedTimes([]);
        setSearchQuery('');
    };

    const handlePlaceClick = (place) => {
        setSelectedPlace(place);
        setIsModalOpen(true);
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification('');
        }, 3000);
    };

    const handleAddToWalk = async (placeId, walkId, walkTitle) => {
        try {
            let targetWalkId = walkId;
            
            if (walkId === 'create') {
                walkTitle = walkTitle || `Прогулка ${new Date().toLocaleDateString()}`;
                targetWalkId = 'create';
            }

            if (walkId === 'create') {
                if (!walkTitle || !walkTitle.trim()) {
                    showNotification('Введите название новой прогулки', 'error');
                    return;
                }

                const walkResponse = await walksApi.create({ title: walkTitle });
                const newWalk = walkResponse.data;
                targetWalkId = newWalk.id;
                
                await walksApi.addPlace(newWalk.id, placeId);
                showNotification(`Создана новая прогулка "${walkTitle}" и место добавлено!`);
            } else {
                await walksApi.addPlace(walkId, placeId);
                showNotification(`Место добавлено в "${walkTitle}"!`);
            }
            
            const walksResponse = await walksApi.getAll();
            setUserWalks(walksResponse.data);
            
            setIsModalOpen(false);
            setSelectedPlace(null);
        } catch (error) {
            console.error('Ошибка при добавлении места:', error);
            showNotification(error.response?.data?.error || 'Ошибка при добавлении места', 'error');
        }
    };

    const handleAddReadyWalk = async (readyWalkId) => {
        try {
            const readyWalk = readyWalks.find(rw => rw.id === readyWalkId);
            if (!readyWalk) return;

            const walkResponse = await walksApi.create({ 
                title: readyWalk.title 
            });
            const newWalk = walkResponse.data;

            if (readyWalk.place_ids && readyWalk.place_ids.length > 0) {
                for (const placeId of readyWalk.place_ids) {
                    try {
                        await walksApi.addPlace(newWalk.id, placeId);
                    } catch (err) {
                        console.error(`Ошибка добавления места ${placeId}:`, err);
                    }
                }
            }

            showNotification(`Готовая прогулка "${readyWalk.title}" добавлена в ваши прогулки!`);
            
            const walksResponse = await walksApi.getAll();
            setUserWalks(walksResponse.data);
            
            navigate(`/walks/${newWalk.id}`);
        } catch (error) {
            console.error('Ошибка добавления готовой прогулки:', error);
            showNotification(error.response?.data?.error || 'Ошибка добавления готовой прогулки', 'error');
        }
    };

    // Активные фильтры для отображения сверху
    const activeFilters = [
        ...selectedCategories.map(id => ({ 
            type: 'category', 
            id, 
            label: interestCategories.find(c => c.id === id)?.label 
        })),
        ...selectedBudgets.map(id => ({ 
            type: 'budget', 
            id, 
            label: budgetOptions.find(b => b.id === id)?.label 
        })),
        ...selectedTimes.map(id => ({ 
            type: 'time', 
            id, 
            label: timeOptions.find(t => t.id === id)?.label 
        }))
    ];

    const hasActiveFilters = activeFilters.length > 0 || searchQuery;

    return (
        <div className="main-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header user={user} currentPage="home" onLogout={onLogout} />
            
            {notification && (
                <div className="notification-green">
                    {notification.message}
                </div>
            )}
            
            <div className="page-container" style={{ flex: 1 }}>
                <div className="search-container-main">
                    <input
                        type="text"
                        className="search-input-main"
                        placeholder="Поиск мест..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filters-button-container">
                    <button 
                        className={`filters-toggle-btn ${isFiltersOpen ? 'active' : ''}`}
                        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    >
                        {isFiltersOpen ? 'Скрыть фильтры' : 'Показать фильтры'}
                        {hasActiveFilters && <span className="active-badge"></span>}
                    </button>
                    
                    <button 
                        className={`filters-toggle-btn ${showReadyWalks ? 'active' : ''}`}
                        onClick={() => setShowReadyWalks(!showReadyWalks)}
                        style={{ marginLeft: '10px' }}
                    >
                        {showReadyWalks ? 'Скрыть готовые маршруты' : 'Показать готовые маршруты'}
                    </button>
                </div>

                {hasActiveFilters && (
                    <div className="active-filters-container">
                        {searchQuery && (
                            <div className="active-filter-tag">
                                <span>Поиск: "{searchQuery}"</span>
                                <button 
                                    className="filter-remove-btn"
                                    onClick={() => setSearchQuery('')}
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        {activeFilters.map(filter => (
                            <div key={`${filter.type}-${filter.id}`} className="active-filter-tag">
                                <span>{filter.label}</span>
                                <button 
                                    className="filter-remove-btn"
                                    onClick={() => removeFilter(filter.type, filter.id)}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <button className="clear-all-filters-btn" onClick={clearAllFilters}>
                            Очистить все
                        </button>
                    </div>
                )}

                {isFiltersOpen && (
                    <div className="filters-panel">
                        <div className="filter-group">
                            <h4 className="filter-title">Интересы</h4>
                            <div className="filter-options">
                                {interestCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        className={`filter-option ${selectedCategories.includes(cat.id) ? 'active' : ''}`}
                                        onClick={() => toggleCategory(cat.id)}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="filter-group">
                            <h4 className="filter-title">Бюджет</h4>
                            <div className="filter-options">
                                {budgetOptions.map(opt => (
                                    <button
                                        key={opt.id}
                                        className={`filter-option ${selectedBudgets.includes(opt.id) ? 'active' : ''}`}
                                        onClick={() => toggleBudget(opt.id)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="filter-group">
                            <h4 className="filter-title">Время</h4>
                            <div className="filter-options">
                                {timeOptions.map(opt => (
                                    <button
                                        key={opt.id}
                                        className={`filter-option ${selectedTimes.includes(opt.id) ? 'active' : ''}`}
                                        onClick={() => toggleTime(opt.id)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <main className="main-content">
                    {showReadyWalks && readyWalks.length > 0 && (
                        <div className="ready-walks-section">
                            <h2 className="section-title">Готовые прогулки</h2>
                            <div className="ready-walks-grid">
                                {readyWalks.map(walk => (
                                    <div key={walk.id} className="ready-walk-card">
                                        <img 
                                            src={walk.image_url} 
                                            alt={walk.title}
                                            className="ready-walk-image"
                                            
                                        />
                                        <div className="ready-walk-info">
                                            <h3 className="ready-walk-title">{walk.title}</h3>
                                            <p className="ready-walk-description">{walk.description}</p>
                                            <p className="ready-walk-places-count">
                                                Мест: {walk.places_count || 0}
                                            </p>
                                            <button 
                                                className="btn btn-primary add-to-my-walks-btn"
                                                onClick={() => handleAddReadyWalk(walk.id)}
                                            >
                                                Добавить в мои прогулки
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(!showReadyWalks || readyWalks.length === 0) && (
                        <>
                            <h2 className="section-title">Места для посещения</h2>

                            {isLoading ? (
                                <div className="loading-places">
                                    <div className="spinner"></div>
                                    <p>Загрузка мест...</p>
                                </div>
                            ) : filteredPlaces.length === 0 ? (
                                <div className="no-results">
                                    <p>По вашему запросу ничего не найдено</p>
                                    <p>Попробуйте изменить фильтры или очистить их</p>
                                    <div style={{ marginTop: '15px' }}>
                                        <button className="btn btn-primary" onClick={clearAllFilters}>
                                            Очистить все фильтры
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    
                                    <div className="places-grid">
                                        {filteredPlaces.map(place => (
                                            <div 
                                                key={place.id} 
                                                className="place-card"
                                                onClick={() => handlePlaceClick(place)}
                                            >
                                                <div className="place-image-container">
                                                    {place.image_url ? (
                                                        <img 
                                                            src={place.image_url} 
                                                            alt={place.title}
                                                            className="place-image"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = 'https://via.placeholder.com/400x300/2D3B37/E3F0CF?text=' + encodeURIComponent(place.title.substring(0, 20));
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="place-image-placeholder">
                                                            <span className="placeholder-icon">🏛️</span>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="place-info">
                                                    <h3 className="place-title">{place.title}</h3>
                                                    
                                                    <div className="place-categories">
                                                        {place.category && (
                                                            <span className="place-category-tag">
                                                                {interestCategories.find(c => c.id === place.category)?.label || place.category}
                                                            </span>
                                                        )}
                                                        {place.budget && (
                                                            <span className="place-category-tag">
                                                                {budgetOptions.find(b => b.id === place.budget)?.label || place.budget}
                                                            </span>
                                                        )}
                                                        {place.estimated_time && (
                                                            <span className="place-category-tag" style={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}>
                                                                {place.estimated_time} мин
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </main>
            </div>

            {isModalOpen && selectedPlace && (
                <PlaceModal
                    place={selectedPlace}
                    walks={userWalks}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedPlace(null);
                    }}
                    onAddToWalk={handleAddToWalk}
                />
            )}

            <footer className="site-footer-fixed">
                <p>По вопросам и предложениям: <a href="mailto:contact@walkingspb.ru" className="email-link-green">contact@walkingspb.ru</a></p>
            </footer>
        </div>
    );
}

export default MainPage;