
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

function Profile({ user, onLogout }) {
    const [isEditing, setIsEditing] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [photo, setPhoto] = useState('');
    const [savedPhoto, setSavedPhoto] = useState('');
    const [notification, setNotification] = useState('');
    const fileInputRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || ''
            });
            
            const tempPhoto = localStorage.getItem('tempProfilePhoto');
            const userPhoto = user.profile_pic_url || '';
            
            if (tempPhoto) {
                setPhoto(tempPhoto);
                setSavedPhoto(tempPhoto);
            } else {
                setPhoto(userPhoto);
                setSavedPhoto(userPhoto);
            }
        }
    }, [user]);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification('');
        }, 3000);
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showNotification('Файл слишком большой. Максимальный размер - 5MB.', 'error');
                return;
            }
            
            if (!file.type.match('image.*')) {
                showNotification('Пожалуйста, выберите изображение.', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result;
                setPhoto(result);
                localStorage.setItem('tempProfilePhoto', result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                showNotification('Токен не найден. Пожалуйста, войдите снова.', 'error');
                setTimeout(() => {
                    onLogout();
                    navigate('/login');
                }, 2000);
                return;
            }
            
            const dataToSend = {
                full_name: formData.full_name.trim(),
                email: formData.email.trim().toLowerCase()
            };
            
            if (!dataToSend.full_name) {
                showNotification('Введите ФИО', 'error');
                return;
            }
            
            if (!dataToSend.email || !dataToSend.email.includes('@')) {
                showNotification('Введите корректный email', 'error');
                return;
            }
            
            console.log('Отправка данных профиля:', dataToSend);
            
            const response = await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            });
            
            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.error || `Ошибка сервера: ${response.status}`);
            }
            
            console.log('Ответ сервера:', responseData);
            
            if (photo !== savedPhoto) {
                localStorage.setItem('tempProfilePhoto', photo);
            }
            
            setSavedPhoto(photo);
            setIsEditing(false);
            
            const updatedUser = {
                ...user,
                full_name: dataToSend.full_name,
                email: dataToSend.email,
                profile_pic_url: photo
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            showNotification('Данные успешно сохранены!');
            
        } catch (error) {
            console.error('Ошибка при обновлении профиля:', error);
            
            let errorMsg = 'Ошибка при сохранении: ';
            
            if (error.message.includes('Failed to fetch')) {
                errorMsg = 'Сервер недоступен. Проверьте запущен ли бэкенд.';
            } else if (error.message.includes('401')) {
                errorMsg = 'Сессия истекла. Пожалуйста, войдите снова.';
                setTimeout(() => {
                    onLogout();
                    navigate('/login');
                }, 2000);
            } else if (error.message.includes('400')) {
                errorMsg = 'Неверные данные. Проверьте введенные значения.';
            } else if (error.message.includes('409')) {
                errorMsg = 'Этот email уже используется другим пользователем.';
            } else {
                errorMsg = error.message || 'Ошибка сервера';
            }
            
            showNotification(errorMsg, 'error');
        }
    };

    const handlePasswordChange = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showNotification('Новые пароли не совпадают', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                showNotification('Токен не найден', 'error');
                return;
            }
            
            const response = await fetch('http://localhost:5000/api/auth/change-password', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });
            
            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.error || 'Ошибка при смене пароля');
            }
            
            setShowChangePassword(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showNotification('Пароль успешно изменен!');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('tempProfilePhoto');
        onLogout();
        navigate('/login');
    };

    return (
        <div className="profile-page">
            <Header user={user} currentPage="profile" onLogout={onLogout} />
            
            {notification && (
                <div className="notification-green">
                    {notification.message}
                </div>
            )}
            
            <div className="profile-container">
                <div className="profile-container-grid">
                    {/* 1. ЗАГОЛОВОК НА ВСЮ ШИРИНУ */}
                    <h2 className="profile-title-grid">
                        Мой профиль
                    </h2>
                    
                    {/* 2. ЛЕВАЯ КОЛОНКА - ФОРМЫ */}
                    <div className="profile-info-section-grid">
                        <div className="form-group">
                            <label>ФИО</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                    placeholder="Введите ваше ФИО"
                                />
                            ) : (
                                <p className="profile-info-text">
                                    {formData.full_name}
                                </p>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <label>Email (логин)</label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    className="form-control"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="Введите ваш email"
                                />
                            ) : (
                                <p className="profile-info-text">
                                    {formData.email}
                                </p>
                            )}
                        </div>

                        <div className="profile-buttons">
                            {isEditing ? (
                                <>
                                    <button className="btn btn-primary" onClick={handleSave} style={{ marginBottom: '10px' }}>
                                        Сохранить изменения
                                    </button>
                                    <button 
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setPhoto(savedPhoto);
                                        }}
                                        style={{ marginBottom: '10px' }}
                                    >
                                        Отмена
                                    </button>
                                </>
                            ) : (
                                <button className="btn btn-primary" onClick={() => setIsEditing(true)} style={{ marginBottom: '10px' }}>
                                    Редактировать профиль
                                </button>
                            )}
                            
                            <button 
                                className="btn btn-secondary"
                                onClick={() => setShowChangePassword(true)}
                                style={{ marginBottom: '10px' }}
                            >
                                Сменить пароль
                            </button>
                        </div>
                    </div>
                    
                    {/* 3. ПРАВАЯ КОЛОНКА - ФОТО */}
                    <div className="profile-photo-section-grid">
                        <div className="profile-photo-container">
                            {photo ? (
                                <img 
                                    src={photo} 
                                    alt="Профиль" 
                                    className="profile-photo"
                                />
                            ) : (
                                <div className="profile-photo-placeholder">
                                    {user?.full_name?.charAt(0) || 'П'}
                                </div>
                            )}
                        </div>
                        
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="file-input-hidden"
                            accept="image/*"
                            onChange={handlePhotoChange}
                        />
                        
                        <button 
                            className="btn btn-secondary change-photo-btn"
                            onClick={() => fileInputRef.current.click()}
                            style={{ marginTop: '20px', width: '100%' }}
                        >
                            Изменить фото
                        </button>
                    </div>
                    
                    {/* 4. КНОПКА ВЫХОДА НА ВСЮ ШИРИНУ */}
                    <div className="profile-logout-section-grid">
                        <button 
                            className="btn btn-danger logout-btn-compact" 
                            onClick={handleLogout}
                        >
                            Выйти из аккаунта
                        </button>
                    </div>
                </div>
            </div>

            {showChangePassword && (
                <div className="modal-overlay">
                    <div className="modal-content change-password-modal">
                        <h3>Сменить пароль</h3>
                        
                        <div className="form-group">
                            <label>Текущий пароль</label>
                            <input
                                type="password"
                                className="form-control"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData(prev => ({ 
                                    ...prev, 
                                    currentPassword: e.target.value 
                                }))}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Новый пароль</label>
                            <input
                                type="password"
                                className="form-control"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(prev => ({ 
                                    ...prev, 
                                    newPassword: e.target.value 
                                }))}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Повторите новый пароль</label>
                            <input
                                type="password"
                                className="form-control"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(prev => ({ 
                                    ...prev, 
                                    confirmPassword: e.target.value 
                                }))}
                            />
                        </div>

                        <div className="modal-buttons">
                            <button className="btn btn-primary" onClick={handlePasswordChange}>
                                Сохранить
                            </button>
                            <button 
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowChangePassword(false);
                                    setPasswordData({ 
                                        currentPassword: '', 
                                        newPassword: '', 
                                        confirmPassword: '' 
                                    });
                                }}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <footer className="site-footer-fixed">
                <p>По вопросам и предложениям: <a href="mailto:contact@walkingspb.ru" className="email-link-green">contact@walkingspb.ru</a></p>
            </footer>
        </div>
    );
}

export default Profile;
