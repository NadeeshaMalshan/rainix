import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { PromptInputBasic } from '../components/ui/prompt-input-demo';
import LiquidGlassText2D from '../components/LiquidGlassText2D';
import HourlyForecast from '../components/HourlyForecast';
import DailyForecast from '../components/DailyForecast';
import WeatherMetricsRow from '../components/WeatherMetricsRow';

export default function WeatherDashboard() {
  const router = useRouter();
  const { city, force, lat, lon } = router.query;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [cityData, setCityData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [showStickyNav, setShowStickyNav] = useState(false);
  const locationRef = useRef(null);
  const [savedLocationsWeather, setSavedLocationsWeather] = useState({
    'Tokyo, JP': { temp: '19°', status: 'Clear Conditions', style: 'sunny' },
    'Sydney, AU': { temp: '22°', status: 'Partly Cloudy', style: 'partly_cloudy_day' }
  });
  const filterId = React.useId ? React.useId().replace(/:/g, "") : "weather-glass-text";
  
  const lightningTimer = useRef(null);
  const celestialRef = useRef(null);

  useEffect(() => {
    if (!router.isReady) return;
    const targetCity = city ? city.trim() : (lat && lon) ? 'My Location' : 'Ratnapura';
    fetchData(targetCity, lat, lon);
  }, [city, lat, lon, router.isReady]);

  const fetchData = async (cityQuery, targetLat, targetLon) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      let resolvedCity = cityQuery;
      if (!city && targetLat && targetLon) {
        resolvedCity = 'My Location';
        setSearchQuery('');
      }

      const nodeApiUrl = (process.env.NEXT_PUBLIC_NODE_API_URL || "http://localhost:5000").replace(/\/$/, "");
      let url = `${nodeApiUrl}/api/city/${encodeURIComponent(resolvedCity)}`;
      if (targetLat && targetLon) {
        url += `?lat=${targetLat}&lon=${targetLon}`;
      }
      const res = await fetch(url);
      const result = await res.json();
      
      if (result.success && result.data) {
        setCityData(result.data);
        setSearchQuery('');
        saveToRecentSearches(result.data);
      } else {
        setErrorMsg(`Could not retrieve weather for "${cityQuery}".`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to weather grid.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveToRecentSearches = (data) => {
    try {
      const locationName = `${data.weather.city}, ${data.weather.country}`;
      const coordsText = `${data.weather.coordinates.latitude.toFixed(4)}° N, ${data.weather.coordinates.longitude.toFixed(4)}° E`;
      const newSearchItem = { name: locationName, query: data.city, coords: coordsText };
      const saved = localStorage.getItem('rainix_recent_searches');
      let recent = saved ? JSON.parse(saved) : [];
      const filtered = recent.filter(item => item.query.toLowerCase() !== data.city.toLowerCase());
      const updated = [newSearchItem, ...filtered].slice(0, 5);
      localStorage.setItem('rainix_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery && searchQuery.length >= 2) {
        try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5`);
          const data = await res.json();
          if (data.results) {
            setSuggestions(data.results);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
          }
        } catch (err) {
          console.error("Failed to fetch suggestions", err);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const saved = localStorage.getItem('rainix_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, [cityData]);

  useEffect(() => {
    const fetchSavedLocationsWeather = async () => {
      try {
        const fetchCityWeather = async (city) => {
          const nodeApiUrl = (process.env.NEXT_PUBLIC_NODE_API_URL || "http://localhost:5000").replace(/\/$/, "");
          const res = await fetch(`${nodeApiUrl}/api/city/${city}`);
          const result = await res.json();
          if (result.success && result.data.weather) {
            const tempVal = Math.round(result.data.weather.weather.temperature);
            const code = result.data.weather.weather.weatherCode;
            let statusText = 'Clear Conditions';
            let weatherIcon = 'sunny';

            if (code >= 51 && code <= 67) {
              statusText = 'Light Rain';
              weatherIcon = 'rainy';
            } else if (code >= 71 && code <= 86) {
              statusText = 'Snow Showers';
              weatherIcon = 'weather_snowy';
            } else if (code >= 95) {
              statusText = 'Active Storm Alert';
              weatherIcon = 'thunderstorm';
            } else if (code >= 1 && code <= 3) {
              statusText = 'Partly Cloudy';
              weatherIcon = 'partly_cloudy_day';
            } else if (code > 3) {
              statusText = 'Overcast';
              weatherIcon = 'cloudy';
            }

            return { temp: `${tempVal}°`, status: statusText, style: weatherIcon };
          }
          return null;
        };

        const tokyo = await fetchCityWeather('Tokyo');
        const sydney = await fetchCityWeather('Sydney');

        setSavedLocationsWeather(prev => ({
          'Tokyo, JP': tokyo || prev['Tokyo, JP'],
          'Sydney, AU': sydney || prev['Sydney, AU']
        }));
      } catch (err) {
        console.warn('Failed to pre-fetch saved locations weather, using defaults.', err);
      }
    };

    fetchSavedLocationsWeather();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (locationRef.current) {
        const rect = locationRef.current.getBoundingClientRect();
        // Show sticky nav as soon as the location section starts going out of view (hits the top)
        setShowStickyNav(rect.top <= 10);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (query) => {
    if (query && query.trim()) {
      setShowSuggestions(false);
      setIsFocused(false);
      router.push(`/weather?city=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleGpsClick = async () => {
    setIsLoading(true);
    setErrorMsg('');
    
    const pushCoords = (latitude, longitude) => {
      router.push(`/weather?lat=${latitude}&lon=${longitude}`);
    };

    const fallbackToIpLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          pushCoords(data.latitude, data.longitude);
        } else {
          throw new Error("Invalid IP location data");
        }
      } catch (err) {
        console.error("IP fallback failed:", err);
        setErrorMsg('Location access denied and IP fallback failed.');
        setIsLoading(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          pushCoords(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn("GPS Error, falling back to IP:", error);
          fallbackToIpLocation();
        },
        { timeout: 20000, maximumAge: 60000 }
      );
    } else {
      fallbackToIpLocation();
    }
  };

  const weather = cityData?.weather?.weather;
  const rivers = cityData?.rivers || [];
  const formattedCity = cityData?.weather?.city || city || 'Ratnapura';
  const formattedCountry = cityData?.weather?.country || 'Sri Lanka';
  const currentTemp = weather ? Math.round(weather.temperature) : 31;

  const getWeatherDetails = (code) => {
  if (code === 0) return { label: 'Sunny', icon: 'wb_sunny', state: 'sunny' };
  if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', icon: 'cloud_queue', state: 'partly_cloudy' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'filter_drama', state: 'cloudy' }; 
  if (code >= 51 && code <= 57) return { label: 'Light Rain', icon: 'grain', state: 'rainy' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: 'rainy', state: 'rainy' }; 
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'ac_unit', state: 'snow' }; 
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: 'umbrella', state: 'rainy' };
  if (code >= 85 && code <= 86) return { label: 'Snow Showers', icon: 'weather_snowy', state: 'snow' }; 
  if (code >= 95) return { label: 'Thunderstorms', icon: 'thunderstorm', state: 'thunderstorm' };
  return { label: 'Cloudy', icon: 'cloud', state: 'cloudy' };
};

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 720;
    try {
      if (timeStr.includes('T')) {
        const parts = timeStr.split('T')[1].split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      const parts = timeStr.split(':');
      if (parts.length >= 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } catch (e) {
      console.error(e);
    }
    return 720;
  };

  const calculateOrbit = (timeStr, sunriseStr, sunsetStr) => {
    const t_curr = parseTimeToMinutes(timeStr);
    const t_sunrise = parseTimeToMinutes(sunriseStr) || 351;
    const t_sunset = parseTimeToMinutes(sunsetStr) || 1098;
    const isNight = t_curr < t_sunrise || t_curr > t_sunset;
    let progress = 0.5;
    if (!isNight) {
      const dayDuration = t_sunset - t_sunrise;
      progress = dayDuration > 0 ? (t_curr - t_sunrise) / dayDuration : 0.5;
    } else {
      const nightDuration = (1440 - t_sunset) + t_sunrise;
      const elapsed = t_curr > t_sunset ? (t_curr - t_sunset) : ((1440 - t_sunset) + t_curr);
      progress = nightDuration > 0 ? elapsed / nightDuration : 0.5;
    }
    progress = Math.max(0, Math.min(1, progress));
    const angle = Math.PI * (1 - progress); 
    const x = 50 + 40 * Math.cos(angle);
    const y = 70 - 45 * Math.sin(angle);
    return { isNight, x, y };
  };

  const weatherCondition = weather ? getWeatherDetails(weather.weatherCode) : { label: 'Sunny', icon: 'wb_sunny', state: 'sunny' };
  if (force === 'snow') { weatherCondition.label = 'Snowy'; weatherCondition.icon = 'ac_unit'; }
  if (force === 'sunny') { weatherCondition.label = 'Sunny'; weatherCondition.icon = 'wb_sunny'; }
  if (force === 'clear_night') { weatherCondition.label = 'Clear Night'; weatherCondition.icon = 'nights_stay'; }
  if (force === 'partly_cloudy_night') { weatherCondition.label = 'Partly Cloudy'; weatherCondition.icon = 'nights_stay'; }

  const orbit = weather ? calculateOrbit(weather.time, weather.sunrise, weather.sunset) : { isNight: false, x: 50, y: 25 };
  if (force && force.includes('night')) orbit.isNight = true;
  
  const determineWeatherState = () => {
    if (force) return force;
    if (!weather) return 'sunny';
    const code = weather.weatherCode;
    const isNight = orbit.isNight;
    if (code === 0) return isNight ? 'clear_night' : 'sunny';
    if (code >= 1 && code <= 3) return isNight ? 'partly_cloudy_night' : 'partly_cloudy_day';
    if (code === 45 || code === 48) return 'cloudy';
    if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
    if (code >= 95) return 'thunderstorm';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    return 'cloudy';
  };

  const weatherState = determineWeatherState();

  useEffect(() => {
    if (!isLoading && weatherState) {
      console.log('Weather animation played on load');
    }
  }, [weatherState, isLoading]);

  const getBackgroundGradient = (state) => {
    switch (state) {
      case 'sunny': return 'linear-gradient(180deg, #3A82F6 0%, #89CFF0 100%)'; // Deeper blue for better white contrast
      case 'partly_cloudy_day': return 'linear-gradient(180deg, #5B9DD9 0%, #AECBEB 100%)';
      case 'cloudy': return 'linear-gradient(180deg, #78909C 0%, #B0BEC5 100%)';
      case 'rainy': return 'linear-gradient(180deg, #455A64 0%, #78909C 100%)';
      case 'thunderstorm': return 'linear-gradient(180deg, #263238 0%, #37474F 100%)';
      case 'snow': return 'linear-gradient(180deg, #90A4AE 0%, #CFD8DC 100%)';
      case 'clear_night': return 'linear-gradient(180deg, #0A192F 0%, #112240 100%)';
      case 'partly_cloudy_night': return 'linear-gradient(180deg, #112240 0%, #1A365D 100%)';
      default: return 'linear-gradient(180deg, #3A82F6 0%, #89CFF0 100%)';
    }
  };

  const getTextColor = (state) => {
    // Always use white text with a drop shadow for a premium look across all times of day
    return 'text-white drop-shadow-md';
  };
  const textColorClass = getTextColor(weatherState);

  const getAqiText = (state) => {
    if (['thunderstorm'].includes(state)) return 'Medium';
    return 'Low';
  };
  const aqiText = getAqiText(weatherState);

  const getCloudConfig = (state) => {
    switch (state) {
      case 'partly_cloudy_day':
      case 'partly_cloudy_night':
        return { count: 15, filter: '' };
      case 'cloudy':
        return { count: 25, filter: 'brightness-90' };
      case 'rainy':
      case 'thunderstorm':
        return { count: 35, filter: 'brightness-50 contrast-125 saturate-50' };
      case 'snow':
        return { count: 25, filter: 'brightness-90' };
      default:
        return { count: 0, filter: '' };
    }
  };
  const cloudConfig = getCloudConfig(weatherState);

  const getGroundFilter = (state) => {
    if (['rainy', 'thunderstorm', 'clear_night', 'partly_cloudy_night'].includes(state)) {
      return 'brightness-50 contrast-125 saturate-75';
    }
    if (['cloudy'].includes(state)) {
      return 'brightness-75';
    }
    return 'brightness-100';
  };
  const groundFilterClass = getGroundFilter(weatherState);

  const isRainy = weather ? weather.precipitation > 0 || weather.weatherCode >= 50 : false;
  const activeRiver = rivers.length > 0 ? rivers[0] : null;
  const isRiverAlert = activeRiver && activeRiver.status === 'ALERT';
  
  const hasActiveWarning = isRiverAlert || isRainy || (weather && weather.windSpeed > 15) || weatherState === 'thunderstorm';
  const alertTitle = isRiverAlert ? 'Flood Alert' : weatherState === 'thunderstorm' ? 'Thunderstorm Alert' : isRainy ? 'Precipitation Alert' : (weather && weather.windSpeed > 15) ? 'High Wind' : '';
  const alertDesc = isRiverAlert ? `Elevated levels in Kalu Ganga` : weatherState === 'thunderstorm' ? 'Severe thunderstorms in region' : isRainy ? `Heavy downpour in region` : (weather && weather.windSpeed > 15) ? `Gale force wind` : '';
  const alertIcon = isRiverAlert ? 'flood' : weatherState === 'thunderstorm' ? 'thunderstorm' : isRainy ? 'rainy' : 'air';

  useEffect(() => {
    // Component is now fully CSS animated, no GSAP JS loops needed!
    // We only keep the timer cleanup just in case, though it's no longer used.
    return () => {};
  }, [weatherState, cityData, isLoading, errorMsg]);  return (
    <div className="min-h-screen relative overflow-hidden font-sans text-white transition-all duration-1000 ease-in-out">
      
      {/* Sticky Navigation Bar */}
      <div className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-300 ${showStickyNav ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="deep-frosted-pill mx-2 md:mx-6 mt-2 p-2 px-4 rounded-2xl shadow-glass flex items-center justify-between gap-4">
          <div className={`flex items-center gap-3 ${textColorClass}`}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 shadow-inner">
              <span className="material-symbols-outlined text-2xl">{weatherCondition.icon}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-bold leading-tight">{Math.round(currentTemp)}°</span>
            </div>
            <div className="hidden sm:flex flex-col ml-1 border-l border-white/20 pl-4">
              <span className="text-sm md:text-base font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] md:max-w-[200px]">{formattedCity}</span>
              <span className="text-[10px] md:text-xs opacity-70 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] md:max-w-[200px]">{formattedCountry}</span>
            </div>
          </div>
          <div className="flex-1 max-w-sm ml-auto relative">
            <div className="deep-frosted-pill w-full h-10 md:h-11 rounded-full flex items-center px-3 hover:bg-white/25 focus-within:bg-white/25 focus-within:ring-1 ring-white/30 transition-all">
              <input 
                className={`flex-1 min-w-0 bg-transparent border-none text-sm md:text-base ${textColorClass} placeholder:${textColorClass} placeholder:opacity-60 outline-none`}
                placeholder="Search..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(searchQuery); }}
              />
              <button 
                onClick={() => handleSearchSubmit(searchQuery)}
                className={`p-1 md:p-1.5 rounded-full hover:bg-white/30 transition-colors ${textColorClass} flex items-center justify-center`}
              >
                <span className="material-symbols-outlined text-lg md:text-xl">search</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Head>
        <title>Weather Dashboard: {formattedCity}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Hanken+Grotesk:wght@400;600&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </Head>
      <Script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" strategy="beforeInteractive" />
      <Script id="tailwind-config" strategy="beforeInteractive">
        {`
          tailwind.config = {
            theme: {
              extend: {
                screens: {
                  'xs': '375px',
                },
                fontFamily: {
                  poppins: ['"Poppins"', 'sans-serif'],
                  sans: ['"Poppins"', 'sans-serif'],
                  display: ['"Poppins"', 'sans-serif'],
                },
                boxShadow: {
                  'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
                  'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.1)',
                  'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.2)',
                  'neon': '0 0 20px rgba(255, 255, 255, 0.2)',
                },
                colors: {
                  background: 'hsl(var(--background))',
                  foreground: 'hsl(var(--foreground))',
                  border: 'hsl(var(--border))',
                }
              }
            }
          }
        `}
      </Script>

      <style>{`
        @keyframes rain-fall {
          0% { transform: translateY(-100px); }
          100% { transform: translateY(120vh); }
        }
        @keyframes snow-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0.8; }
          100% { transform: translateY(100vh) translateX(30px) rotate(360deg); opacity: 0; }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes cloud-move {
          0% { transform: translateX(0); }
          100% { transform: translateX(150vw); }
        }
        
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pop-in {
          0% { transform: translate(-50%, -50%) scale(0); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes lightning-flash {
          0%, 100% { opacity: 0; }
          1% { opacity: 0.6; }
          2% { opacity: 0; }
          3% { opacity: 0.45; }
          10% { opacity: 0; }
        }
        
        .animate-rain { animation: rain-fall linear infinite; will-change: transform; }
        .animate-snow { animation: snow-fall linear infinite; will-change: transform, opacity; }
        .animate-star { animation: star-twinkle ease-in-out infinite; will-change: opacity, transform; }
        .animate-cloud { animation: cloud-move linear infinite; will-change: transform; }
        .animate-fade-in-up { animation: fade-in-up 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .animate-pop-in { animation: pop-in 1.5s cubic-bezier(0.68, -0.55, 0.26, 1.55) forwards; }
        .animate-lightning { animation: lightning-flash 5s infinite; pointer-events: none; }
      `}</style>

      <style dangerouslySetInnerHTML={{ __html: `
        .responsive-weather-search {
          position: absolute !important;
          top: 1rem !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 50 !important;
          width: 100% !important;
          max-width: 300px !important;
          text-align: center !important;
        }
        @media (min-width: 375px) {
          .responsive-weather-search {
            max-width: 330px !important;
          }
        }
        @media (min-width: 640px) {
          .responsive-weather-search {
            max-width: 384px !important;
          }
        }
        @media (min-width: 768px) {
          .responsive-weather-search {
            max-width: 448px !important;
          }
        }

        .deep-frosted-pill {
          background-color: rgba(255, 255, 255, 0.22) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.32) !important;
        }
        .deep-frosted-dropdown {
          background-color: rgba(13, 20, 35, 0.85) !important;
          -webkit-backdrop-filter: blur(28px) !important;
          backdrop-filter: blur(28px) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
        }
      `}} />

      <div 
        className={`font-poppins overflow-x-hidden overflow-y-auto w-full max-w-full min-h-screen relative flex flex-col justify-between select-none transition-all duration-1000 pb-12 ${textColorClass}`}
        style={{ background: getBackgroundGradient(weatherState) }}
      >
        {weatherState === 'thunderstorm' && <div className="lightning-overlay animate-lightning bg-white absolute inset-0 z-40" />}
        {['clear_night', 'partly_cloudy_night'].includes(weatherState) && (
          <div className="star-container absolute inset-0 pointer-events-none z-0">
            {Array.from({ length: 45 }).map((_, i) => (
              <div key={i} className="star-particle animate-star absolute bg-white rounded-full" style={{ width: `${Math.random() * 2 + 1}px`, height: `${Math.random() * 2 + 1}px`, left: `${Math.random() * 100}%`, top: `${Math.random() * 65}%`, animationDuration: `${0.8 + Math.random() * 1.8}s`, animationDelay: `${Math.random() * -2}s` }} />
            ))}
          </div>
        )}

        <div ref={celestialRef} className={`absolute z-10 pointer-events-none animate-pop-in ${['cloudy', 'thunderstorm', 'rainy', 'snow'].includes(weatherState) ? 'hidden' : ''}`} style={{ left: `${orbit.x}%`, top: `${orbit.y}%` }}>
          {orbit.isNight ? (
            <img src="/images/moon.png" alt="Moon" className="w-32 h-32 md:w-56 md:h-56 object-contain" />
          ) : (
            <img src="/images/sun.png" alt="Sun" className="w-32 h-32 md:w-56 md:h-56 object-contain" />
          )}
        </div>

        {cloudConfig.count > 0 && (
          <div className="cloud-container absolute inset-0 pointer-events-none z-20">
            {Array.from({ length: cloudConfig.count }).map((_, i) => {
              const sizes = [ 
                { w: 'w-64 md:w-[32rem]', h: 'h-32 md:h-[16rem]', top: '5%' }, 
                { w: 'w-80 md:w-[45rem]', h: 'h-40 md:h-[20rem]', top: '15%' }, 
                { w: 'w-72 md:w-[36rem]', h: 'h-36 md:h-[18rem]', top: '25%' }, 
                { w: 'w-96 md:w-[50rem]', h: 'h-48 md:h-[24rem]', top: '35%' }, 
                { w: 'w-64 md:w-[34rem]', h: 'h-32 md:h-[16rem]', top: '12%' }, 
                { w: 'w-80 md:w-[40rem]', h: 'h-40 md:h-[18rem]', top: '45%' }, 
                { w: 'w-72 md:w-[38rem]', h: 'h-36 md:h-[17rem]', top: '8%' } 
              ];
              const c = sizes[i % sizes.length];
              const opacity = `opacity-${20 + (i % 5) * 10}`;
              return (
                <img key={i} src="/images/cloud.png" alt="Cloud" className={`weather-cloud animate-cloud absolute object-contain mix-blend-multiply ${c.w} ${c.h} ${opacity} ${cloudConfig.filter}`} style={{ top: c.top, left: `-800px`, animationDuration: `${50 + (i % 5) * 10}s`, animationDelay: `${-(i * (80 / cloudConfig.count))}s` }} />
              );
            })}
          </div>
        )}

        {['rainy', 'thunderstorm'].includes(weatherState) && (
          <div className="rain-container absolute inset-0 pointer-events-none z-20">
            {Array.from({ length: 180 }).map((_, i) => (
              <div key={i} className="rain-drop animate-rain absolute bg-sky-200/60 w-[2px] h-8 rounded" style={{ left: `${Math.random() * 100}%`, top: `-40px`, animationDuration: `${0.45 + Math.random() * 0.3}s`, animationDelay: `${Math.random() * -1.5}s`, opacity: Math.random() * 0.4 + 0.3 }} />
            ))}
          </div>
        )}

        {weatherState === 'snow' && (
          <div className="snow-container absolute inset-0 pointer-events-none z-20">
            {Array.from({ length: 45 }).map((_, i) => (
              <div key={i} className="snowflake animate-snow absolute bg-white rounded-full" style={{ width: `${Math.random() * 6 + 4}px`, height: `${Math.random() * 6 + 4}px`, left: `${Math.random() * 100}%`, top: `-20px`, animationDuration: `${4.5 + Math.random() * 3.5}s`, animationDelay: `${Math.random() * -8}s` }} />
            ))}
          </div>
        )}

        <div className="responsive-weather-search">
          <div className="flex w-full items-start gap-2 md:gap-3">
            <div className="flex-1 min-w-0 relative">
              <div 
                className="deep-frosted-pill w-full h-11 md:h-[3.25rem] rounded-full shadow-lg transition-all duration-300 flex items-center pr-1.5 pl-3 md:pl-5 hover:bg-white/25 focus-within:bg-white/25 focus-within:border-white/40"
              >
                <input 
                  className={`flex-1 min-w-0 bg-transparent border-none text-left focus:ring-0 ${textColorClass} font-medium text-sm md:text-lg placeholder:${textColorClass} placeholder:opacity-60 outline-none`}
                  placeholder="Search City or River..." 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 250)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(searchQuery); }}
                />
                <button 
                  onClick={() => handleSearchSubmit(searchQuery)}
                  className={`p-1 md:p-1.5 rounded-full hover:bg-white/30 transition-colors ${textColorClass} flex items-center justify-center cursor-pointer`}
                >
                  <span className="material-symbols-outlined text-xl md:text-2xl">search</span>
                </button>
              </div>

              {/* Dynamic Dropdown Overlay */}
              {isFocused && (
                <div 
                  className="deep-frosted-dropdown absolute top-[3.2rem] md:top-[3.75rem] left-0 w-full rounded-2xl shadow-2xl transition-all duration-300 z-50 flex flex-col overflow-hidden max-h-[250px] md:max-h-[300px] overflow-y-auto"
                >
                  {searchQuery.trim().length < 2 ? (
                    /* Case 1: Search input is empty or cleared - immediately show Recents/Saved */
                    <>
                      {recentSearches.length > 0 && (
                        <div className="p-2 md:p-3">
                          <div className="text-[9px] md:text-[10px] uppercase font-normal text-white opacity-50 px-3 py-1 flex items-center gap-1.5 text-left">
                            <span className="material-symbols-outlined text-xs">history</span> Recent Searches
                          </div>
                          {recentSearches.slice(0, 2).map((item, idx) => (
                            <div 
                              key={idx} 
                              className="px-3 py-1.5 md:py-2 cursor-pointer hover:bg-white/20 rounded-lg transition-colors text-left text-white flex flex-col mt-0.5 md:mt-1"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setSearchQuery(item.query); handleSearchSubmit(item.query); setIsFocused(false); }}
                            >
                              <span className="font-normal text-xs md:text-sm">{item.name}</span>
                              <span className="text-[9px] md:text-[10px] text-white opacity-40">{item.coords}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {recentSearches.length === 0 && (
                        <div className="p-4 text-center text-white/50 text-[11px] md:text-xs font-normal">
                          No recent searches available.
                        </div>
                      )}
                    </>
                  ) : (
                    /* Case 2: Typed query is 2+ characters */
                    suggestions.length > 0 ? (
                      /* Subcase A: Suggestions available */
                      <div className="p-2 md:p-3">
                        <div className="text-[9px] md:text-[10px] uppercase font-normal text-white opacity-50 px-3 py-1 flex items-center gap-1.5 text-left">
                          <span className="material-symbols-outlined text-xs">travel_explore</span> Search Results
                        </div>
                        {suggestions.map((s, idx) => (
                          <div 
                            key={idx} 
                            className="px-3 py-2 md:py-2.5 cursor-pointer hover:bg-white/20 rounded-lg transition-colors text-left text-white flex flex-col border-b border-white/5 last:border-b-0"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setSearchQuery(s.name); handleSearchSubmit(s.name); setIsFocused(false); }}
                          >
                            <span className="font-normal text-xs md:text-sm flex items-center gap-1">
                              {s.isRiver && <span className="material-symbols-outlined text-white opacity-70 text-sm">waves</span>}
                              {s.name}
                            </span>
                            <span className="text-[9px] md:text-[10px] text-white opacity-50">{s.admin1 ? `${s.admin1}, ` : ''}{s.country}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Subcase B: No results available */
                      <div className="p-4 md:p-5 text-center text-white/50 text-xs md:text-sm font-normal">
                        <span className="material-symbols-outlined text-white/40 text-lg md:text-xl block mb-1">info</span>
                        Search results are not available
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
            
            <button 
              type="button" 
              className={`deep-frosted-pill h-10 w-10 md:h-[3.25rem] md:w-[3.25rem] rounded-full flex-shrink-0 hover:bg-white/30 transition-all duration-300 flex items-center justify-center ${textColorClass} shadow-lg`} 
              onClick={handleGpsClick}
            >
              <span className="material-symbols-outlined text-xl md:text-2xl">my_location</span>
            </button>
          </div>
        </div>

        {!isLoading && !errorMsg && cityData && (
          <div className="flex-1 flex flex-col justify-center items-center w-full min-h-full relative z-40 main-weather-content animate-fade-in-up pt-20 md:pt-24 pb-8">
            <svg className="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
              <filter id={`liquid-glass-text-${filterId}`} primitiveUnits="objectBoundingBox">
                <feImage result="map" width="100%" height="100%" x="0" y="0" href="data:image/webp;base64,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" preserveAspectRatio="none" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur" />
                <feDisplacementMap id="disp" in="blur" in2="map" scale="0.5" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </svg>

            <style>{`
              .ios-glass-text {
                color: transparent;
                background-color: rgba(255, 255, 255, 0.4);
                -webkit-background-clip: text;
                background-clip: text;
                backdrop-filter: blur(12px) url(#liquid-glass-text-${filterId}) saturate(200%) brightness(1.3) contrast(1.1);
                -webkit-backdrop-filter: blur(12px) saturate(200%) brightness(1.3) contrast(1.1);
                mix-blend-mode: overlay;
              }
            `}</style>

            <div className="flex flex-col items-center" ref={locationRef}>
              <h1 className={`text-2xl xs:text-3xl md:text-4xl font-normal tracking-tight ${textColorClass} mb-1 drop-shadow-md`}>
                {formattedCity}
              </h1>
              <h2 className={`text-base md:text-xl font-normal opacity-90 ${textColorClass} mb-4 md:mb-8 drop-shadow-sm`}>
                {formattedCountry}
              </h2>
              
              <LiquidGlassText2D text={`${Math.round(currentTemp)}°C`} />
              
              <div className="flex flex-row items-center mt-2 md:mt-4 gap-2 md:gap-4">
                <span className={`text-lg md:text-2xl font-normal ${textColorClass} mb-1 md:mb-2`}>{weatherCondition.label}</span>
                
                <div className={`flex flex-wrap justify-center items-center gap-x-2 gap-y-1.5 md:gap-x-2.5 md:gap-y-2 text-xs font-normal ${textColorClass}`}>
                  <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-xl">arrow_upward</span>{Math.round(weather?.high || currentTemp + 6)}</span>
                  <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-xl">arrow_downward</span>{Math.round(weather?.low || currentTemp - 2)}</span>
                  <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-xl">thermostat</span>{Math.round(weather?.feelsLike || currentTemp)}</span>
                  <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-xl">eco</span>{aqiText}</span>
                  <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-xl">water_drop</span>{weather?.precipitationProbability || 0}%</span>
                </div>
              </div>

              {hasActiveWarning && (
                <div className="w-full flex items-center justify-center gap-2 mt-3 md:mt-5 text-xs md:text-base font-normal select-none pointer-events-auto px-2">
                  <span className="material-symbols-outlined text-xl">{alertIcon}</span>
                  <span>{alertTitle}: {alertDesc}</span>
                </div>
              )}

               {/* AI Assistant Input */}
              <div className="w-full mt-4 md:mt-6 px-2 md:px-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <PromptInputBasic />
              </div>

              {/* 24 Hours Weather Section */}
              <div className="w-full animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <HourlyForecast hourlyData={weather?.hourly} />
              </div>

              {/* 14 Days Weather Section */}
              <div className="w-full animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <DailyForecast dailyData={weather?.forecast14Days} />
              </div>

              {/* Weather Metrics Section */}
              <div className="w-full animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <WeatherMetricsRow weather={weather} />
              </div>

              
            </div>
          </div>
        )}

        
      </div>
    </div>
  );
}
