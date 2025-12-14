import React from 'react';

function PlacesCatalog({ places, onPlaceClick }) {
    return (
        <div>
            <h3>Места для посещения ({places.length})</h3>
            
            <div className="places-grid">
                {places.map(place => (
                    <div 
                        key={place.id} 
                        className="place-card"
                        onClick={() => onPlaceClick(place)}
                    >
                        {place.image_url && (
                            <img 
                                src={place.image_url} 
                                alt={place.title}
                                className="place-image"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                                }}
                            />
                        )}
                        
                        <h4 className="place-title">{place.title}</h4>
                        
                        <div className="place-category">
                            {place.category}
                        </div>
                        
                        <div style={{ marginTop: '10px' }}>
                            <p><strong>Время:</strong> {place.estimated_time || '?'} мин</p>
                            <p><strong>Бюджет:</strong> {place.budget || 'не указан'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PlacesCatalog;