import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import MainPage from './components/MainPage';
import WalkManager from './components/WalkManager';
import WalkDetail from './components/WalkDetail';
import MemoryJournal from './components/MemoryJournal';
import Profile from './components/Profile';
import './styles/App.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (token && savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                const tempPhoto = localStorage.getItem('tempProfilePhoto');
                if (tempPhoto) {
                    parsedUser.profile_pic_url = tempPhoto;
                }
                
                setUser(parsedUser);
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Ошибка парсинга пользователя:', error);
            }
        }
        setLoading(false);
    }, []);

    const handleLogin = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        const tempPhoto = localStorage.getItem('tempProfilePhoto');
        if (tempPhoto) {
            userData.profile_pic_url = tempPhoto;
        }
        
        setUser(userData);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tempProfilePhoto');
        setUser(null);
        setIsAuthenticated(false);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Загрузка...</p>
            </div>
        );
    }

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/login" element={
                        !isAuthenticated ? (
                            <Login onLogin={handleLogin} />
                        ) : (
                            <Navigate to="/" />
                        )
                    } />
                    
                    <Route path="/register" element={
                        !isAuthenticated ? (
                            <Register onRegister={handleLogin} />
                        ) : (
                            <Navigate to="/" />
                        )
                    } />
                    
                    <Route path="/" element={
                        isAuthenticated ? (
                            <MainPage user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    } />
                    
                    <Route path="/walks" element={
                        isAuthenticated ? (
                            <WalkManager user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    } />
                    
                    <Route path="/walks/:walkId" element={
                        isAuthenticated ? (
                            <WalkDetail user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    } />
                    
                    <Route path="/memories" element={
                        isAuthenticated ? (
                            <MemoryJournal user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    } />
                    
                    <Route path="/profile" element={
                        isAuthenticated ? (
                            <Profile user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" />
                        )
                    } />
                    
                    {/* Добавьте маршрут для 404 ошибок если нужно */}
                    <Route path="*" element={
                        <Navigate to="/" />
                    } />
                </Routes>
            </div>
        </Router>
    );
}

export default App;