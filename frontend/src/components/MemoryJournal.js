import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import { memoriesApi, walksApi } from '../utils/api';
import '../styles/App.css';
import { FiCalendar, FiMapPin, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';

function MemoryJournal({ user, onLogout }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [memories, setMemories] = useState([]);
    const [walks, setWalks] = useState([]);
    const [showMemoryForm, setShowMemoryForm] = useState(false);
    const [showMemoryView, setShowMemoryView] = useState(null);
    const [editingMemory, setEditingMemory] = useState(null);
    const [memoryForm, setMemoryForm] = useState({
        title: '',
        content: '',
        walk_id: '',
        photos: []
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [notification, setNotification] = useState('');
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [tempMemoryId, setTempMemoryId] = useState(null); // Для временного хранения фото при создании

    useEffect(() => {
        loadData();
        
        if (location.state?.walkId) {
            setMemoryForm(prev => ({
                ...prev,
                walk_id: location.state.walkId
            }));
            setShowMemoryForm(true);
        }
    }, [location]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [memoriesResponse, walksResponse] = await Promise.all([
                memoriesApi.getAll(),
                walksApi.getAll()
            ]);
            
            // Восстанавливаем фото из localStorage для каждого воспоминания
            const memoriesWithLocalPhotos = memoriesResponse.data.map(memory => {
                const localPhotos = [];
                for (let i = 0; i < 10; i++) { // Проверяем до 10 фото
                    const photoKey = `memory_${memory.id}_photo_${i}`;
                    const savedPhoto = localStorage.getItem(photoKey);
                    if (savedPhoto) {
                        localPhotos.push({ photo_url: savedPhoto, is_local: true });
                    } else {
                        // Если фото не найдено, прерываем цикл
                        break;
                    }
                }
                
                return {
                    ...memory,
                    photos: [...(memory.photos || []), ...localPhotos]
                };
            });
            
            setMemories(memoriesWithLocalPhotos);
            setWalks(walksResponse.data);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            showNotification('Ошибка загрузки данных', 'error');
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setMemoryForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePhotosChange = (e) => {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) return;
        
        // Ограничение на количество фото (максимум 10)
        const remainingSlots = 10 - memoryForm.photos.length;
        const filesToAdd = files.slice(0, remainingSlots);
        
        if (files.length > remainingSlots) {
            showNotification(`Можно добавить только ${remainingSlots} фото`, 'error');
        }
        
        filesToAdd.forEach(file => {
            // Проверяем размер файла (максимум 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showNotification(`Файл "${file.name}" слишком большой. Максимум 5MB.`, 'error');
                return;
            }
            
            // Проверяем тип файла
            if (!file.type.match('image.*')) {
                showNotification(`Файл "${file.name}" не является изображением`, 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                setMemoryForm(prev => ({
                    ...prev,
                    photos: [...prev.photos, result]
                }));
            };
            reader.readAsDataURL(file);
        });
        
        // Сбрасываем input
        e.target.value = '';
    };

    const removePhoto = (index) => {
        setMemoryForm(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!memoryForm.title.trim()) {
        showNotification('Введите название воспоминания', 'error');
        return;
    }

    try {
        // Генерируем временный ID для фото при создании нового воспоминания
        let memoryId;
        let tempId = null; // Объявляем здесь
        
        if (editingMemory) {
            memoryId = editingMemory.id;
        } else {
            // Создаем временный ID и сохраняем его
            tempId = `temp_${Date.now()}`;
            setTempMemoryId(tempId);
            memoryId = tempId;
        }
        
        // Сохраняем каждое фото в localStorage
        memoryForm.photos.forEach((photo, index) => {
            const photoKey = `memory_${memoryId}_photo_${index}`;
            localStorage.setItem(photoKey, photo);
        });
        
        // Для бэкенда отправляем пустой массив фото
        const dataToSend = {
            ...memoryForm,
            photos: [] // Всегда отправляем пустой массив, так как фото сохраняем локально
        };
        
        let response;
        if (editingMemory) {
            response = await memoriesApi.update(editingMemory.id, dataToSend);
            showNotification('Воспоминание обновлено!');
        } else {
            response = await memoriesApi.create(dataToSend);
            showNotification('Воспоминание сохранено!');
            
            // После создания на сервере, переносим фото из временного ключа в постоянный
            if (response.data && response.data.id && tempId) {
                const newMemoryId = response.data.id;
                
                // Переносим фото из временного ключа в постоянный
                for (let i = 0; i < memoryForm.photos.length; i++) {
                    const tempKey = `memory_${tempId}_photo_${i}`;
                    const permanentKey = `memory_${newMemoryId}_photo_${i}`;
                    
                    const photoData = localStorage.getItem(tempKey);
                    if (photoData) {
                        localStorage.setItem(permanentKey, photoData);
                        localStorage.removeItem(tempKey);
                    }
                }
            }
        }
        
        resetForm();
        loadData();
    } catch (error) {
        console.error('Ошибка сохранения воспоминания:', error);
        showNotification(error.response?.data?.error || 'Ошибка сохранения воспоминания', 'error');
    }
};
    const handleEdit = (memory, e) => {
        e.stopPropagation();
        setEditingMemory(memory);
        
        // Восстанавливаем фото из localStorage
        const localPhotos = [];
        for (let i = 0; i < 10; i++) {
            const photoKey = `memory_${memory.id}_photo_${i}`;
            const savedPhoto = localStorage.getItem(photoKey);
            if (savedPhoto) {
                localPhotos.push(savedPhoto);
            } else {
                // Если фото не найдено, прерываем цикл
                break;
            }
        }
        
        // Объединяем фото с сервера и локальные
        const serverPhotos = memory.photos ? memory.photos.map(p => p.photo_url) : [];
        const allPhotos = [...serverPhotos, ...localPhotos];
        
        setMemoryForm({
            title: memory.title || '',
            content: memory.content || '',
            walk_id: memory.walk_id || '',
            photos: allPhotos
        });
        setShowMemoryForm(true);
    };

    const handleViewMemory = (memory) => {
        setShowMemoryView(memory);
        setCurrentPhotoIndex(0);
    };

    const handleDelete = async (memoryId, e) => {
        e.stopPropagation();
        try {
            await memoriesApi.delete(memoryId);
            
            // Удаляем фото из localStorage
            for (let i = 0; i < 10; i++) {
                const photoKey = `memory_${memoryId}_photo_${i}`;
                localStorage.removeItem(photoKey);
            }
            
            setShowDeleteConfirm(null);
            showNotification('Воспоминание удалено!');
            loadData();
        } catch (error) {
            console.error('Ошибка удаления воспоминания:', error);
            showNotification(error.response?.data?.error || 'Ошибка удаления воспоминания', 'error');
        }
    };

    const resetForm = () => {
        setMemoryForm({
            title: '',
            content: '',
            walk_id: '',
            photos: []
        });
        setEditingMemory(null);
        setTempMemoryId(null);
        setShowMemoryForm(false);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getWalkTitle = (walkId) => {
        const walk = walks.find(w => w.id == walkId);
        return walk ? walk.title : 'Неизвестная прогулка';
    };

    const nextPhoto = () => {
        if (!showMemoryView?.photos) return;
        setCurrentPhotoIndex(prev => 
            prev < showMemoryView.photos.length - 1 ? prev + 1 : 0
        );
    };

    const prevPhoto = () => {
        if (!showMemoryView?.photos) return;
        setCurrentPhotoIndex(prev => 
            prev > 0 ? prev - 1 : showMemoryView.photos.length - 1
        );
    };

    const selectPhoto = (index) => {
        setCurrentPhotoIndex(index);
    };

    return (
        <div className="memories-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header user={user} currentPage="memories" onLogout={onLogout} />
            
            {/* Зеленое уведомление */}
            {notification && (
                <div className="notification-green">
                    {notification.message}
                </div>
            )}
            
            <div className="memories-container" style={{ flex: 1 }}>
                {/* Центрированная кнопка создания */}
                <div className="page-header-centered">
                    <div className="create-center-container" style={{ width: '100%', maxWidth: '300px' }}>
                        <button 
                            className="btn btn-primary create-memory-btn"
                            onClick={() => setShowMemoryForm(true)}
                            style={{ width: '100%', padding: '14px' }}
                        >
                            Создать воспоминание
                        </button>
                    </div>
                </div>

                {showMemoryForm && (
                    <div className="modal-overlay">
                        <div className="modal-content memory-form-modal">
                            <h3>{editingMemory ? 'Редактировать воспоминание' : 'Новое воспоминание'}</h3>
                            
                            <form onSubmit={handleSubmit} className="memory-form">
                                <div className="form-group">
                                    <label>Название воспоминания *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        className="form-control"
                                        value={memoryForm.title}
                                        onChange={handleInputChange}
                                        placeholder="Например: Мой первый поход в Эрмитаж"
                                        required
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Прогулка (опционально)</label>
                                    <select
                                        name="walk_id"
                                        className="form-control"
                                        value={memoryForm.walk_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Выберите прогулку</option>
                                        {walks.map(walk => (
                                            <option key={walk.id} value={walk.id}>
                                                {walk.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Описание</label>
                                    <textarea
                                        name="content"
                                        className="form-control"
                                        value={memoryForm.content}
                                        onChange={handleInputChange}
                                        placeholder="Опишите ваши впечатления..."
                                        rows="4"
                                    ></textarea>
                                </div>
                                
                                <div className="form-group">
                                    <label>Фотографии (максимум 10)</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        accept="image/*"
                                        onChange={handlePhotosChange}
                                        multiple
                                    />
                                    <small style={{ color: '#666', marginTop: '5px' }}>
                                        Фото сохранятся локально на вашем устройстве
                                    </small>
                                    <div className="photo-upload-indicator">
                                        <span>Добавлено: {memoryForm.photos.length}/10 фото</span>
                                    </div>
                                </div>
                                
                                {memoryForm.photos.length > 0 && (
                                    <div className="multiple-photos-preview">
                                        {memoryForm.photos.map((photo, index) => (
                                            <div key={index} className="multiple-photo-item">
                                                <img 
                                                    src={photo} 
                                                    alt={`Предпросмотр ${index + 1}`} 
                                                    className="multiple-photo-img"
                                                />
                                                <button 
                                                    type="button"
                                                    className="remove-photo-btn"
                                                    onClick={() => removePhoto(index)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    <button type="submit" className="btn btn-primary">
                                        {editingMemory ? 'Сохранить изменения' : 'Сохранить воспоминание'}
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={resetForm}
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showMemoryView && (
                    <div className="modal-overlay" onClick={() => setShowMemoryView(null)}>
                        <div className="memory-view-modal" onClick={(e) => e.stopPropagation()}>
                            <button 
                                className="modal-close-btn" 
                                onClick={() => setShowMemoryView(null)}
                                style={{ top: '15px', right: '15px', zIndex: 10 }}
                            >
                                <FiX size={24} />
                            </button>
                            
                            {/* Основное фото */}
                            <div className="memory-view-image-container">
                                {showMemoryView.photos && showMemoryView.photos.length > 0 ? (
                                    <>
                                        <img 
                                            src={showMemoryView.photos[currentPhotoIndex]?.photo_url} 
                                            alt={`Фото ${currentPhotoIndex + 1}`}
                                            className="memory-view-main-image"
                                        />
                                        {showMemoryView.photos.length > 1 && (
                                            <div className="memory-view-nav-buttons">
                                                <button className="memory-nav-btn" onClick={prevPhoto}>
                                                    <FiChevronLeft />
                                                </button>
                                                <button className="memory-nav-btn" onClick={nextPhoto}>
                                                    <FiChevronRight />
                                                </button>
                                            </div>
                                        )}
                                        <div className="photos-count-badge">
                                            {currentPhotoIndex + 1} / {showMemoryView.photos.length}
                                        </div>
                                    </>
                                ) : (
                                    <div className="photo-placeholder-memory" style={{ height: '100%' }}>
                                        📔
                                    </div>
                                )}
                            </div>
                            
                            {/* Миниатюры */}
                            {showMemoryView.photos && showMemoryView.photos.length > 1 && (
                                <div className="memory-view-thumbnails">
                                    {showMemoryView.photos.map((photo, index) => (
                                        <img 
                                            key={index}
                                            src={photo.photo_url} 
                                            alt={`Миниатюра ${index + 1}`}
                                            className={`memory-thumbnail ${index === currentPhotoIndex ? 'active' : ''}`}
                                            onClick={() => selectPhoto(index)}
                                        />
                                    ))}
                                </div>
                            )}
                            
                            {/* Контент */}
                            <div className="memory-view-content">
                                <h2 className="memory-view-title">{showMemoryView.title}</h2>
                                
                                <div className="memory-view-meta">
                                    {showMemoryView.created_at && (
                                        <div className="memory-view-date">
                                            <FiCalendar />
                                            <span>{formatDateTime(showMemoryView.created_at)}</span>
                                        </div>
                                    )}
                                    {showMemoryView.walk_id && (
                                        <div className="memory-view-walk">
                                            <FiMapPin />
                                            <span>{getWalkTitle(showMemoryView.walk_id)}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {showMemoryView.content && (
                                    <div className="memory-view-description">
                                        {showMemoryView.content}
                                    </div>
                                )}
                                
                                <div className="memory-actions-uniform" style={{ marginTop: '30px' }}>
                                    <button 
                                        className="btn btn-secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(showMemoryView, e);
                                            setShowMemoryView(null);
                                        }}
                                    >
                                        Редактировать
                                    </button>
                                    <button 
                                        className="btn btn-danger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowDeleteConfirm(showMemoryView.id);
                                            setShowMemoryView(null);
                                        }}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Модальное окно подтверждения удаления */}
                {showDeleteConfirm && (
                    <div className="modal-overlay">
                        <div className="confirm-modal">
                            <h3 className="confirm-title">Удалить воспоминание?</h3>
                            <p className="confirm-message">
                                Вы уверены, что хотите удалить это воспоминание? Это действие нельзя отменить.
                            </p>
                            <div className="confirm-buttons">
                                <button 
                                    className="btn btn-danger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(showDeleteConfirm, e);
                                    }}
                                >
                                    Удалить
                                </button>
                                <button 
                                    className="btn btn-secondary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteConfirm(null);
                                    }}
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="loading-places">
                        <div className="spinner"></div>
                        <p>Загрузка воспоминаний...</p>
                    </div>
                ) : memories.length === 0 ? (
                    <div className="no-memories">
                        <p>У вас пока нет воспоминаний</p>
                        <p>Создайте первое воспоминание о вашей прогулке!</p>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowMemoryForm(true)}
                            style={{ marginTop: '20px' }}
                        >
                            Создать первое воспоминание
                        </button>
                    </div>
                ) : (
                    <div className="memories-grid">
                        {memories.map(memory => {
                            const hasPhotos = memory.photos && memory.photos.length > 0;
                            return (
                                <div 
                                    key={memory.id} 
                                    className="memory-card-clickable"
                                    onClick={() => handleViewMemory(memory)}
                                >
                                    {hasPhotos ? (
                                        <img 
                                            src={memory.photos[0].photo_url} 
                                            alt={memory.title}
                                            className="memory-image-persistent"
                                        />
                                    ) : (
                                        <div className="photo-placeholder-memory">
                                            📔
                                        </div>
                                    )}
                                    
                                    {hasPhotos && memory.photos.length > 1 && (
                                        <div className="photos-count-badge">
                                            +{memory.photos.length - 1}
                                        </div>
                                    )}
                                    
                                    <div className="memory-content">
                                        <h3 className="memory-card-title">{memory.title}</h3>
                                        <div className="memory-meta">
                                            {memory.created_at && (
                                                <div className="memory-date">
                                                    {formatDate(memory.created_at)}
                                                </div>
                                            )}
                                            {memory.walk_id && (
                                                <div className="memory-walk">
                                                    Прогулка: {getWalkTitle(memory.walk_id)}
                                                </div>
                                            )}
                                        </div>
                                        {memory.content && memory.content.length > 100 ? (
                                            <p className="memory-description">
                                                {memory.content.substring(0, 100)}...
                                            </p>
                                        ) : (
                                            <p className="memory-description">{memory.content}</p>
                                        )}
                                        <div className="memory-actions-uniform">
                                            <button 
                                                className="btn btn-secondary"
                                                onClick={(e) => handleEdit(memory, e)}
                                            >
                                                Редактировать
                                            </button>
                                            <button 
                                                className="btn btn-danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDeleteConfirm(memory.id);
                                                }}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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

export default MemoryJournal;