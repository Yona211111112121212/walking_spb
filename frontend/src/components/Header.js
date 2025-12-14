import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';

function Header({ user, currentPage, onLogout }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <header className="header-container" style={{ paddingBottom: '10px' }}>
            <div className="header-top">
                <div className="header-title">
                    <h1 className="header-logo">Прогулки по Петербургу</h1>
                    <p className="header-welcome">
                        Добро пожаловать! Готовы исследовать город?
                    </p>
                </div>
                
                <div className="header-profile">
                    <button 
                        className="profile-button"
                        onClick={() => navigate('/profile')}
                        aria-label="Профиль"
                    >
                        {user?.profile_pic_url ? (
                            <img src={user.profile_pic_url} alt="Профиль" />
                        ) : (
                            <span className="profile-initial">
                                {user?.full_name?.charAt(0) || 'П'}
                            </span>
                        )}
                    </button>
                </div>
                
                <button 
                    className="burger-button"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Меню"
                >
                    {isMenuOpen ? <FiX size={27} /> : <FiMenu size={27} />}
                </button>
            </div>
            
            <nav className="main-navigation">
                <ul className="nav-menu">
                    <li className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}>
                        <Link to="/" className="nav-link">
                            Главная
                        </Link>
                    </li>
                    <li className={`nav-item ${currentPage === 'walks' ? 'active' : ''}`}>
                        <Link to="/walks" className="nav-link">
                            Мои прогулки
                        </Link>
                    </li>
                    <li className={`nav-item ${currentPage === 'memories' ? 'active' : ''}`}>
                        <Link to="/memories" className="nav-link">
                            Дневник путешествий
                        </Link>
                    </li>
                </ul>
            </nav>
            
            {isMenuOpen && (
                <nav className="mobile-navigation" style={{ paddingBottom: '15px' }}>
                    <ul className="mobile-menu">
                        <li className="mobile-item">
                            <Link 
                                to="/" 
                                className={`mobile-link ${currentPage === 'home' ? 'active' : ''}`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Главная
                            </Link>
                        </li>
                        <li className="mobile-item">
                            <Link 
                                to="/walks" 
                                className={`mobile-link ${currentPage === 'walks' ? 'active' : ''}`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Мои прогулки
                            </Link>
                        </li>
                        <li className="mobile-item">
                            <Link 
                                to="/memories" 
                                className={`mobile-link ${currentPage === 'memories' ? 'active' : ''}`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Дневник путешествий
                            </Link>
                        </li>
                    </ul>
                </nav>
            )}
        </header>
    );
}

export default Header;