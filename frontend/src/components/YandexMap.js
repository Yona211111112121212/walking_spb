// components/YandexMap.js
import React, { useEffect, useRef, useState } from 'react';
import { FiMapPin } from 'react-icons/fi';

function YandexMap({ place, height = 250, showControls = true, zoom = 16, type = 'single' }) {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [allPlaces, setAllPlaces] = useState([]);

  // Определяем тип: единичное место или маршрут с несколькими местами
  useEffect(() => {
    if (type === 'route' && place.places && place.places.length > 0) {
      setAllPlaces(place.places);
    } else {
      // Если это единичное место, создаем массив с ним
      setAllPlaces([place]);
    }
  }, [place, type]);

  // Получаем координаты из базы данных или используем предустановленные
  const getCoordinates = (placeItem) => {
    // 1. Проверяем, есть ли координаты в базе данных
    if (placeItem.latitude && placeItem.longitude) {
      return [parseFloat(placeItem.latitude), parseFloat(placeItem.longitude)];
    }
    
    // 2. Проверяем предустановленные координаты
    const presetCoordinates = {
      'Эрмитаж': [59.939831, 30.314559],
      'Летний сад': [59.945309, 30.336458],
      'Медный всадник': [59.936204, 30.302087],
      'Храм Спаса на Крови': [59.940163, 30.328844],
      'Русский музей': [59.938874, 30.331554],
      'Петергоф': [59.883333, 29.900000],
      'Исаакиевский собор': [59.934121, 30.306200],
      'Кунсткамера': [59.941399, 30.304516],
      'Дворцовый мост': [59.941280, 30.308090],
      
      // Общие категории
      'музей': [59.939831, 30.314559],
      'памятник': [59.936204, 30.302087],
      'парк': [59.945309, 30.336458],
      'собор': [59.934121, 30.306200],
      'архитектура': [59.940163, 30.328844],
      'галереи': [59.938874, 30.331554],
      'мосты': [59.941280, 30.308090],
      'кафе': [59.939000, 30.315000],
    };

    // Ищем по названию
    if (placeItem.title) {
      for (const [key, coords] of Object.entries(presetCoordinates)) {
        if (placeItem.title.toLowerCase().includes(key.toLowerCase())) {
          return coords;
        }
      }
    }

    // Ищем по категории
    if (placeItem.category) {
      const categoryMap = {
        'museum': [59.939831, 30.314559],
        'park': [59.945309, 30.336458],
        'monument': [59.936204, 30.302087],
        'architecture': [59.940163, 30.328844],
        'gallery': [59.938874, 30.331554],
        'bridge': [59.941280, 30.308090],
        'cafe': [59.939000, 30.315000]
      };
      
      if (categoryMap[placeItem.category]) {
        return categoryMap[placeItem.category];
      }
    }

    // Центр СПб по умолчанию
    return [59.934280, 30.335099];
  };

  // Инициализация карты
  const initMap = async () => {
    if (!window.ymaps || !mapRef.current || allPlaces.length === 0) return;

    // Получаем координаты для всех мест
    const placesWithCoords = allPlaces.map(placeItem => ({
      ...placeItem,
      coordinates: getCoordinates(placeItem)
    }));

    // Вычисляем центр карты (среднее значение всех координат)
    const center = calculateCenter(placesWithCoords);

    // Создаем карту
    const map = new window.ymaps.Map(mapRef.current, {
      center: center,
      zoom: zoom,
      controls: showControls ? ['zoomControl', 'typeSelector', 'fullscreenControl'] : []
    });

    // Сохраняем ссылку
    mapRef.current.mapInstance = map;

    // Добавляем метки для каждого места
    placesWithCoords.forEach((placeItem, index) => {
      const isVisited = placeItem.visited || false;
      
      // Иконка в зависимости от типа места и статуса посещения
      const getIconPreset = () => {
        if (isVisited) {
          return 'islands#greenStretchyIcon'; // Зеленый для посещенных
        }
        
        if (!placeItem.category) return 'islands#blueStretchyIcon';
        
        const iconMap = {
          'museum': 'islands#blueMuseumIcon',
          'park': 'islands#greenParkIcon',
          'monument': 'islands#darkOrangeMonumentIcon',
          'architecture': 'islands#violetArchitectureIcon',
          'gallery': 'islands#brownArtIcon',
          'bridge': 'islands#blueBridgeIcon',
          'cafe': 'islands#redCafeIcon'
        };
        
        return iconMap[placeItem.category] || 'islands#blueStretchyIcon';
      };

      // Цвет иконки
      const iconColor = isVisited ? '#7DA937' : '#2D3B37';

      // Содержимое балуна
      const balloonContent = `
        <div style="padding: 10px; max-width: 250px;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <div style="background: ${isVisited ? '#7DA937' : '#2D3B37'}; color: white; width: 25px; height: 25px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px; font-weight: bold;">
              ${index + 1}
            </div>
            <h4 style="margin: 0; font-size: 14px; color: #2D3B37;">${placeItem.title}</h4>
          </div>
          ${placeItem.address ? `<p style="margin: 0 0 5px 0; color: #666; font-size: 12px;"><i class="fas fa-map-marker-alt" style="margin-right: 5px; color: #7DA937;"></i>${placeItem.address}</p>` : ''}
          ${placeItem.category ? `<p style="margin: 0 0 5px 0; color: #7DA937; font-size: 11px; font-weight: 600;">${getCategoryLabel(placeItem.category)}</p>` : ''}
          ${placeItem.description ? `<p style="margin: 0; font-size: 12px; line-height: 1.3;">${placeItem.description.substring(0, 100)}...</p>` : ''}
          ${isVisited ? `<p style="margin: 5px 0 0 0; color: #7DA937; font-size: 11px; font-weight: bold;">✓ Посещено</p>` : ''}
        </div>
      `;

      // Создаем метку
      const placemark = new window.ymaps.Placemark(placeItem.coordinates, {
        hintContent: `${index + 1}. ${placeItem.title}`,
        balloonContent: balloonContent
      }, {
        preset: getIconPreset(),
        iconColor: iconColor,
        hideIconOnBalloonOpen: false
      });

      // Добавляем метку на карту
      map.geoObjects.add(placemark);

      // Открываем балун при клике
      placemark.events.add('click', function() {
        placemark.balloon.open();
      });
    });
    
    // Масштабируем карту, чтобы все метки были видны
    if (placesWithCoords.length > 1) {
      map.setBounds(map.geoObjects.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 50
      });
    }

    // Добавляем кнопку "Построить маршрут" (сделана уже)
    if (placesWithCoords.length > 1 && type === 'route') {
      addRouteButton(map, placesWithCoords);
    }
  };

  // Функция для расчета центра карты
  const calculateCenter = (places) => {
    if (places.length === 0) return [59.934280, 30.335099];
    if (places.length === 1) return places[0].coordinates;
    
    // Вычисляем среднее значение координат
    const latSum = places.reduce((sum, p) => sum + p.coordinates[0], 0);
    const lngSum = places.reduce((sum, p) => sum + p.coordinates[1], 0);
    
    return [latSum / places.length, lngSum / places.length];
  };

  // Функция для получения читаемого названия категории
  const getCategoryLabel = (category) => {
    const labels = {
      'museum': 'Музей',
      'park': 'Парк',
      'monument': 'Памятник',
      'architecture': 'Архитектура',
      'gallery': 'Галерея',
      'bridge': 'Мост',
      'cafe': 'Кафе'
    };
    return labels[category] || category;
  };

  // Функция для добавления кнопки построения маршрута (сделана уже)
  const addRouteButton = (map, places) => {
    // Создаем пользовательский элемент управления (уже более узкий)
    const routeButton = new window.ymaps.control.Button({
      data: {
        content: '<div style="padding: 0px 0px; background: #7DA937; color: white; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;"><i class="fas fa-route" style="margin-right: 3px;"></i>Маршрут</div>',
        title: "Построить маршрут между точками"
      },
      options: {
        selectOnClick: false,
        maxWidth: 100 // Уменьшена ширина
      }
    });
    
    routeButton.events.add('click', function() {
      if (places.length < 2) return;
      
      // Формируем строку для Яндекс.Навигатора
      const waypoints = places.map(p => 
        `${p.coordinates[0]},${p.coordinates[1]}`
      ).join('~');
      
      const naviUrl = `https://yandex.ru/navi/?rtext=${waypoints}`;
      window.open(naviUrl, '_blank', 'noopener,noreferrer');
    });
    
    map.controls.add(routeButton, { float: 'right', floatIndex: 100 });
  };

  useEffect(() => {
    const loadMap = () => {
      if (allPlaces.length === 0) return;

      // Загружаем API Яндекс.Карт, если еще не загружено
      if (!window.ymaps) {
        const script = document.createElement('script');
        script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${process.env.REACT_APP_YANDEX_MAPS_API_KEY}`;
        script.async = true;
        
        script.onload = () => {
          window.ymaps.ready(() => {
            initMap();
            setMapLoaded(true);
          });
        };
        
        document.head.appendChild(script);
      } else {
        // Если API уже загружено
        window.ymaps.ready(() => {
          initMap();
          setMapLoaded(true);
        });
      }
    };

    loadMap();

    // Очистка
    return () => {
      if (mapRef.current && mapRef.current.mapInstance) {
        mapRef.current.mapInstance.destroy();
      }
    };
  }, [allPlaces, type]);

  return (
    <div className="yandex-map-container">
      {!mapLoaded && (
        <div className="map-placeholder" style={{ height: `${height}px`, borderRadius: '10px' }}>
          <div className="spinner" style={{ width: '30px', height: '30px' }}></div>
          <p style={{ marginTop: '10px', color: 'var(--primary-dark)' }}>
            <FiMapPin style={{ marginRight: '5px' }} />
            Загрузка карты...
          </p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Отображаем {allPlaces.length} мест на карте
          </p>
        </div>
      )}
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: `${height}px`, 
          borderRadius: '10px',
          display: mapLoaded ? 'block' : 'none'
        }} 
      />
      
      {mapLoaded && type === 'route' && allPlaces.length > 1 && (
        <div style={{ 
          marginTop: '5px', 
          fontSize: '12px', 
          color: '#666',
          textAlign: 'center',
          padding: '2px'
        }}>
          (зеленые - посещенные)
        </div>
      )}
    </div>
  );
}

export default YandexMap;