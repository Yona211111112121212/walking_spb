// components/PlaceModal.js
import React, { useState, useEffect } from 'react';
import { FiX, FiMapPin } from 'react-icons/fi';
import YandexMap from './YandexMap';
import '../styles/App.css';

function PlaceModal({ place, walks, onClose, onAddToWalk }) {
  const [showWalkSelection, setShowWalkSelection] = useState(false);
  const [selectedWalk, setSelectedWalk] = useState('');
  const [showCreateWalk, setShowCreateWalk] = useState(false);
  const [newWalkTitle, setNewWalkTitle] = useState('');
  const [showMap, setShowMap] = useState(false);

  const interestCategories = [
    { id: 'музеи', label: 'Музеи' },
    { id: 'парк', label: 'Парки' },
    { id: 'monument', label: 'Памятники' },
    { id: 'architecture', label: 'Архитектура' },
    { id: 'gallery', label: 'Галереи' },
    { id: 'bridge', label: 'Мосты' },
    { id: 'cafe', label: 'Кафе' }
  ];

  const budgetLabels = {
    free: 'Бесплатно',
    budget: 'Бюджетно',
    medium: 'Средний',
    premium: 'Премиум'
  };

  // Автоматически показываем карту через 1 секунду
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMap(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleAddClick = () => {
    if (!selectedWalk) {
      const notification = document.createElement('div');
      notification.className = 'alert-green';
      notification.textContent = 'Выберите вариант добавления';
      notification.style.position = 'fixed';
      notification.style.top = '100px';
      notification.style.right = '30px';
      notification.style.zIndex = '9999';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);
      return;
    }

    let walkTitle = '';
    
    if (selectedWalk === 'create') {
      if (!newWalkTitle.trim()) {
        const notification = document.createElement('div');
        notification.className = 'alert-green';
        notification.textContent = 'Введите название новой прогулки';
        notification.style.position = 'fixed';
        notification.style.top = '100px';
        notification.style.right = '30px';
        notification.style.zIndex = '9999';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 3000);
        return;
      }
      walkTitle = newWalkTitle;
    } else {
      const walk = walks.find(w => w.id == selectedWalk);
      walkTitle = walk ? walk.title : 'прогулку';
    }

    onAddToWalk(place.id, selectedWalk, walkTitle);
    setShowCreateWalk(false);
    setNewWalkTitle('');
  };

  // Открытие адреса на Яндекс карте С МЕСТОМ
  const handleAddressClick = () => {
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

  const favoriteWalk = walks.find(walk => walk.is_favorite);
  const otherWalks = walks.filter(walk => !walk.is_favorite);

  const handleCreateWalk = () => {
    setShowCreateWalk(true);
    setSelectedWalk('create');
    setNewWalkTitle(`Прогулка ${new Date().toLocaleDateString()}`);
  };

  const handleSelectWalk = (walkId) => {
    setSelectedWalk(walkId);
    setShowCreateWalk(false);
    setNewWalkTitle('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="place-modal-fixed" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <FiX size={24} />
        </button>
        
        <div className="modal-image-container-fixed">
          {place.image_url ? (
            <img 
              src={place.image_url} 
              alt={place.title}
              className="modal-image"
            />
          ) : (
            <div className="modal-image-placeholder" style={{ height: '100%' }}>
              <span className="placeholder-icon" style={{ fontSize: '60px' }}>🏛️</span>
            </div>
          )}
        </div>
        
        <div className="modal-content-compact">
          <h2 className="modal-title" style={{ fontSize: '24px', marginBottom: '15px' }}>{place.title}</h2>
          
          <div className="modal-info-compact">
            {place.category && (
              <div className="modal-info-item-compact">
                <span className="modal-info-label-compact">Категория:</span>
                <span className="modal-info-value-compact">
                  {interestCategories.find(c => c.id === place.category)?.label || place.category}
                </span>
              </div>
            )}
            
            {place.budget && (
              <div className="modal-info-item-compact">
                <span className="modal-info-label-compact">Бюджет:</span>
                <span className="modal-info-value-compact">
                  {budgetLabels[place.budget] || place.budget}
                </span>
              </div>
            )}
            
            {place.estimated_time && (
              <div className="modal-info-item-compact">
                <span className="modal-info-label-compact">Время:</span>
                <span className="modal-info-value-compact">
                  {place.estimated_time} минут
                </span>
              </div>
            )}
            
            {place.address && (
              <div className="modal-info-item-compact">
                <span className="modal-info-label-compact">Адрес:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                    className="address-link-beautiful"
                    onClick={handleAddressClick}
                    title="Открыть на Яндекс Картах"
                  >
                    <FiMapPin className="address-icon" size={16} />
                    <span>{place.address}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* БЛОК С КАРТОЙ */}
          {place.address && showMap && (
            <div className="map-section-modal" style={{ 
              marginTop: '15px',
              padding: window.innerWidth < 768 ? '10px' : '15px'
            }}>
              <h4 className="modal-info-label-compact" style={{ 
                marginBottom: '8px',
                fontSize: window.innerWidth < 768 ? '14px' : '16px'
              }}>
                <FiMapPin style={{ marginRight: '6px' }} />
                Расположение на карте:
              </h4>
              <YandexMap 
                place={place}
                height={window.innerWidth < 768 ? 150 : 180}
                showControls={true}
                zoom={15}
              />
              <p style={{ 
                textAlign: 'center', 
                marginTop: '5px', 
                color: '#666', 
                fontSize: '11px',
                fontStyle: 'italic',
                padding: '0 5px'
              }}>
                Используйте элементы управления для масштабирования и изменения типа карты
              </p>
            </div>
          )}
          
          {place.description && (
            <div className="modal-description-compact" style={{ marginTop: '20px' }}>
              <h4 className="modal-info-label-compact" style={{ marginBottom: '10px' }}>Описание:</h4>
              <p>{place.description}</p>
            </div>
          )}
          
          {/* Кнопка добавления в прогулку */}
          {!showWalkSelection ? (
            <div className="modal-footer-wide" style={{ marginTop: '25px' }}>
              <button 
                className="btn btn-primary"
                onClick={() => setShowWalkSelection(true)}
                style={{ padding: '12px 30px', fontSize: '16px' }}
              >
                Добавить в прогулку
              </button>
            </div>
          ) : (
            <div className="walk-selection-modal" style={{ marginTop: '25px' }}>
              <h3 className="walk-selection-title" style={{ fontSize: '18px', marginBottom: '15px' }}>Выберите вариант:</h3>
              <div className="walk-selection-options">
                {favoriteWalk && (
                  <button 
                    className={`walk-option-btn ${selectedWalk === favoriteWalk.id ? 'selected' : ''}`}
                    onClick={() => handleSelectWalk(favoriteWalk.id)}
                  >
                    Добавить в Избранное
                  </button>
                )}
                
                {otherWalks.map(walk => (
                  <button 
                    key={walk.id}
                    className={`walk-option-btn ${selectedWalk === walk.id ? 'selected' : ''}`}
                    onClick={() => handleSelectWalk(walk.id)}
                  >
                    Добавить в "{walk.title}"
                  </button>
                ))}
                
                <button 
                  className={`walk-option-btn ${selectedWalk === 'create' ? 'selected' : ''}`}
                  onClick={handleCreateWalk}
                >
                  Создать новую прогулку
                </button>
              </div>
              
              {/* Окошко создания новой прогулки */}
              {showCreateWalk && (
                <div className="create-walk-modal-fixed">
                  <h4 style={{ marginBottom: '12px', color: 'var(--primary-dark)', fontSize: '16px' }}>
                    Название новой прогулки:
                  </h4>
                  <input
                    type="text"
                    className="create-walk-input-fixed"
                    placeholder="Введите название"
                    value={newWalkTitle}
                    onChange={(e) => setNewWalkTitle(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
              
              <div className="modal-footer-wide" style={{ marginTop: '20px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={handleAddClick}
                  disabled={!selectedWalk || (selectedWalk === 'create' && !newWalkTitle.trim())}
                  style={{ padding: '12px 30px', fontSize: '16px' }}
                >
                  Добавить
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowWalkSelection(false);
                    setSelectedWalk('');
                    setShowCreateWalk(false);
                    setNewWalkTitle('');
                  }}
                  style={{ marginLeft: '10px', padding: '12px 30px', fontSize: '16px' }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlaceModal;