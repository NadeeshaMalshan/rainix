import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { PromptInputBasic } from '../components/ui/prompt-input-demo';
import LiquidGlassText2D from '../components/LiquidGlassText2D';
import StationsMap from '../components/StationsMap';
import StationWeatherCard from '../components/StationWeatherCard';

export default function RiverDashboard() {
  const router = useRouter();
  const { force, lat, lon } = router.query;

  // Extract the river name from the query string (e.g. ?kalu-ganga or ?city=ratnapura)
  const getQueryLocation = () => {
    if (router.query.city) return router.query.city;
    const keys = Object.keys(router.query).filter(k => k !== 'force' && k !== 'lat' && k !== 'lon');
    if (keys.length > 0) return keys[0].replace(/-/g, ' ');
    return null;
  };

  const queryLocation = getQueryLocation();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [cityData, setCityData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  
  const [selectedRiverIdx, setSelectedRiverIdx] = useState(0);
  const [showStationsDropdown, setShowStationsDropdown] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  const filterId = React.useId ? React.useId().replace(/:/g, "") : "river-glass-text";
  
  const celestialRef = useRef(null);

  // Memoize bubbles so they don't regenerate (and glitch) on every re-render
  const bubbles = React.useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      size: Math.random() * 12 + 4,
      left: Math.random() * 100,
      delayRise: Math.random() * -20,
      durRise: 8 + Math.random() * 10,
      durSway: 3 + Math.random() * 4,
      swayAmount: Math.random() * 30 + 10
    }));
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const qLoc = getQueryLocation();
    const targetCity = qLoc ? qLoc.trim() : (lat && lon) ? 'My Location' : 'Ratnapura';
    fetchData(targetCity, lat, lon);
  }, [router.query, lat, lon, router.isReady]);

  const fetchData = async (cityQuery, targetLat, targetLon) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      let resolvedCity = cityQuery;
      if (!queryLocation && targetLat && targetLon) {
        resolvedCity = 'My Location';
        setSearchQuery('');
      }

      const nodeApiUrl = (process.env.NEXT_PUBLIC_NODE_API_URL || "http://localhost:5000").replace(/\/$/, "");
      let url = `${nodeApiUrl}/api/city/${encodeURIComponent(resolvedCity)}?full=true`;
      if (targetLat && targetLon) {
        url += `&lat=${targetLat}&lon=${targetLon}`;
      }
      const res = await fetch(url);
      const result = await res.json();
      
      if (result.success && result.data) {
        setCityData(result.data);
        setSearchQuery('');
        setSelectedRiverIdx(0);
        setShowStationsDropdown(false);
        saveToRecentSearches(result.data);
      } else {
        setErrorMsg(`Could not retrieve data for "${cityQuery}".`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to data grid.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveToRecentSearches = (data) => {
    try {
      const locationName = data.weather ? `${data.weather.city}, ${data.weather.country}` : data.city;
      const coordsText = data.weather?.coordinates ? `${data.weather.coordinates.latitude.toFixed(4)}° N, ${data.weather.coordinates.longitude.toFixed(4)}° E` : '';
      const newSearchItem = { name: locationName, query: data.city, coords: coordsText };
      const saved = localStorage.getItem('rainix_recent_searches_river');
      let recent = saved ? JSON.parse(saved) : [];
      const filtered = recent.filter(item => item.query.toLowerCase() !== data.city.toLowerCase());
      const updated = [newSearchItem, ...filtered].slice(0, 5);
      localStorage.setItem('rainix_recent_searches_river', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery && searchQuery.length >= 2) {
        try {
          const nodeApiUrl = (process.env.NEXT_PUBLIC_NODE_API_URL || "http://localhost:5000").replace(/\/$/, "");
          const [geoRes, riverRes] = await Promise.all([
            fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5`).catch(() => null),
            fetch(`${nodeApiUrl}/api/rivers/search?q=${encodeURIComponent(searchQuery)}`).catch(() => null)
          ]);
          
          let combined = [];
          if (riverRes) {
            const riverData = await riverRes.json();
            if (riverData.success && riverData.data) {
              combined = [...riverData.data];
            }
          }
          if (geoRes) {
            const geoData = await geoRes.json();
            if (geoData.results) {
              combined = [...combined, ...geoData.results];
            }
          }
          
          if (combined.length > 0) {
            // Remove exact duplicates by name
            const unique = [];
            const seen = new Set();
            for (const item of combined) {
              if (!seen.has(item.name)) {
                seen.add(item.name);
                unique.push(item);
              }
            }
            setSuggestions(unique.slice(0, 8));
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
    const saved = localStorage.getItem('rainix_recent_searches_river');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, [cityData]);

  const handleSearchSubmit = (query, isRiver = false) => {
    if (!query || query.trim() === '') return;
    const trimmed = query.trim();
    setShowSuggestions(false);
    setIsFocused(false);
    
    const queryLower = trimmed.toLowerCase();
    const riverKeywords = ['ganga', 'oya', 'river'];
    const isRiverQuery = isRiver || riverKeywords.some(kw => queryLower.includes(kw));

    if (isRiverQuery) {
      const formattedQuery = trimmed.toLowerCase().replace(/\s+/g, '-');
      router.push(`/river?${encodeURIComponent(formattedQuery)}`);
    } else {
      router.push(`/weather?city=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleGpsClick = async () => {
    setIsLoading(true);
    setErrorMsg('');
    
    const pushCoords = (latitude, longitude) => {
      router.push(`/river?lat=${latitude}&lon=${longitude}`);
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
  const activeRiver = rivers.length > 0 ? (rivers[selectedRiverIdx] || rivers[0]) : null;

  const formattedCity = activeRiver ? activeRiver.name : (cityData?.weather?.city || queryLocation || 'Ratnapura');
  const formattedCountry = activeRiver ? (activeRiver.basin ? `${activeRiver.basin} Basin` : (cityData?.weather?.city || queryLocation || 'Ratnapura')) : (cityData?.weather?.country || 'Sri Lanka');

  const alertVal = activeRiver?.alertLevels?.find(x => x.name === 'alert')?.value || activeRiver?.levels?.alert || '--';
  const minorVal = activeRiver?.alertLevels?.find(x => x.name === 'minor')?.value || activeRiver?.levels?.minor || '--';
  const majorVal = activeRiver?.alertLevels?.find(x => x.name === 'major')?.value || activeRiver?.levels?.major || '--';

  let currentRiverLevel = '--';
  if (activeRiver) {
    if (activeRiver.currentLevel !== null && activeRiver.currentLevel !== undefined) {
      currentRiverLevel = activeRiver.currentLevel;
    } else {
      const chartArr = activeRiver.chart || activeRiver.historicalData;
      if (chartArr && chartArr.length > 0) {
        const lastPoint = chartArr[chartArr.length - 1];
        if (lastPoint && lastPoint.y !== null && lastPoint.y !== undefined) {
          currentRiverLevel = lastPoint.y;
        } else if (lastPoint && lastPoint.value !== null && lastPoint.value !== undefined) {
          currentRiverLevel = lastPoint.value;
        }
      }
    }
  }

  const determineRiverState = () => {
    if (force) return force;
    if (currentRiverLevel === '--') return 'normal';
    const lvl = parseFloat(currentRiverLevel);
    const major = parseFloat(majorVal);
    const minor = parseFloat(minorVal);
    const alert = parseFloat(alertVal);

    if (!isNaN(major) && lvl >= major) return 'major_flood';
    if (!isNaN(minor) && lvl >= minor) return 'minor_flood';
    if (!isNaN(alert) && lvl >= alert) return 'alert';
    return 'normal';
  };

  const riverState = determineRiverState();

  const getBackgroundGradient = (state) => {
    switch (state) {
      case 'major_flood': return 'linear-gradient(180deg, #4A0E17 0%, #8A2332 100%)';
      case 'minor_flood': return 'linear-gradient(180deg, #5C2A12 0%, #A25025 100%)';
      case 'alert': return 'linear-gradient(180deg, #0F304A 0%, #295F8A 100%)';
      case 'normal': default: return 'linear-gradient(180deg, #071F36 0%, #10416A 100%)';
    }
  };

  const getTextColor = () => 'text-white drop-shadow-md';
  const textColorClass = getTextColor();

  const precipitation = weather?.precipitationProbability || 0;

  let minRiverLevel = '--';
  let maxRiverLevel = '--';
  let chartData = [];
  if (activeRiver) {
    const chartArr = activeRiver.chart || activeRiver.historicalData;
    if (chartArr && chartArr.length > 0) {
      chartData = chartArr.filter(d => (d.y !== null && d.y !== undefined) || (d.value !== null && d.value !== undefined));
      if (chartData.length > 0) {
        const values = chartData.map(d => d.y !== undefined ? d.y : d.value);
        minRiverLevel = Math.min(...values).toFixed(1);
        maxRiverLevel = Math.max(...values).toFixed(1);
      }
    }
  }

  let previousRiverLevel = null;
  let trendIcon = null;
  let trendColor = '';

  if (activeRiver && chartData.length > 1) {
    const prevPoint = chartData[chartData.length - 2];
    previousRiverLevel = prevPoint.y !== undefined ? prevPoint.y : prevPoint.value;
    
    const currentNum = parseFloat(currentRiverLevel);
    const prevNum = parseFloat(previousRiverLevel);
    
    if (!isNaN(currentNum) && !isNaN(prevNum)) {
      if (currentNum > prevNum) {
         trendIcon = 'arrow_upward';
      } else if (currentNum < prevNum) {
         trendIcon = 'arrow_downward';
      } else {
         trendIcon = null;
      }
    }
  }

  // SVG Chart Calculation
  const chartHeight = 160;
  const chartWidth = 1000; // Virtual coordinate system
  let pathD = '';
  let areaD = '';
  let activePoints = [];
  let yMaxChart = 10; // Default fallback
  let yMinChart = 0;

  if (chartData.length > 0) {
    const values = chartData.map(d => d.y !== undefined ? d.y : d.value);
    const times = chartData.map(d => {
      if (d.x !== undefined) return typeof d.x === 'string' ? new Date(d.x).getTime() : d.x;
      return new Date(d.time).getTime();
    });
    
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    
    // Determine bounds, including thresholds if available
    const thresholds = [
      activeRiver?.alertLevels?.find(x => x.name === 'major')?.value || activeRiver?.levels?.major || 0,
      activeRiver?.alertLevels?.find(x => x.name === 'minor')?.value || activeRiver?.levels?.minor || 0,
      activeRiver?.alertLevels?.find(x => x.name === 'alert')?.value || activeRiver?.levels?.alert || 0,
    ].filter(v => v > 0);
    
    const maxNeeded = Math.max(12, maxV * 1.1, ...thresholds);
    yMaxChart = Math.ceil(maxNeeded / 2) * 2;
    yMinChart = 0;

    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    
    activePoints = chartData.map((d, i) => {
      const v = d.y !== undefined ? d.y : d.value;
      const t = d.x !== undefined ? (typeof d.x === 'string' ? new Date(d.x).getTime() : d.x) : new Date(d.time).getTime();
      const xPos = times.length > 1 ? ((t - minT) / (maxT - minT)) * chartWidth : chartWidth / 2;
      const yPos = chartHeight - (((v - yMinChart) / (yMaxChart - yMinChart)) * chartHeight);
      return { x: xPos, y: yPos, value: v, time: t };
    });

    if (activePoints.length > 0) {
      pathD = `M ${activePoints[0].x} ${activePoints[0].y} `;
      for (let i = 1; i < activePoints.length; i++) {
        const prev = activePoints[i - 1];
        const curr = activePoints[i];
        // Smooth curve using cubic bezier
        const cp1x = prev.x + (curr.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = curr.x - (curr.x - prev.x) / 2;
        const cp2y = curr.y;
        pathD += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y} `;
      }
      areaD = `${pathD} L ${activePoints[activePoints.length - 1].x} ${chartHeight} L ${activePoints[0].x} ${chartHeight} Z`;
    }
  }

  const getYPosForValue = (val) => {
    if (val === '--' || isNaN(val)) return null;
    const v = parseFloat(val);
    if (v > yMaxChart || v < yMinChart) return null;
    return chartHeight - (((v - yMinChart) / (yMaxChart - yMinChart)) * chartHeight);
  };

  // (Alerts already declared above)

  const alertY = getYPosForValue(alertVal);
  const minorY = getYPosForValue(minorVal);
  const majorY = getYPosForValue(majorVal);

  return (
    <div className="min-h-screen relative overflow-hidden font-sans text-white transition-all duration-1000 ease-in-out">
      <Head>
        <title>River Dashboard: {formattedCity}</title>
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
                screens: { 'xs': '375px' },
                fontFamily: {
                  poppins: ['"Poppins"', 'sans-serif'],
                  sans: ['"Poppins"', 'sans-serif'],
                  display: ['"Poppins"', 'sans-serif'],
                },
              }
            }
          }
        `}
      </Script>

      <style>{`
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: none; } }
        @keyframes bubble-rise-real { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-120vh); opacity: 0; } }
        @keyframes bubble-sway-real { 0% { transform: translateX(0); } 100% { transform: translateX(var(--sway-amount)); } }
        
        .animate-fade-in-up { animation: fade-in-up 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
      `}</style>

      <style dangerouslySetInnerHTML={{ __html: `
        .responsive-weather-search {
          position: absolute !important;
          top: 1rem !important;
          left: 0 !important;
          right: 0 !important;
          margin-inline: auto !important;
          z-index: 50 !important;
          width: 100% !important;
          max-width: 300px !important;
          text-align: center !important;
        }
        @media (min-width: 375px) { .responsive-weather-search { max-width: 330px !important; } }
        @media (min-width: 640px) { .responsive-weather-search { max-width: 384px !important; } }
        @media (min-width: 768px) { .responsive-weather-search { max-width: 448px !important; } }

        .deep-frosted-pill {
          background-color: rgba(255, 255, 255, 0.02) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          transform: translateZ(0);
        }
        .deep-frosted-dropdown {
          background-color: rgba(13, 20, 35, 0.85) !important;
          -webkit-backdrop-filter: blur(28px) !important;
          backdrop-filter: blur(28px) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          transform: translateZ(0);
        }
        .deep-frosted-card {
          background-color: rgba(255, 255, 255, 0.03) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3) !important;
          transform: translateZ(0);
        }
      `}} />

      <div 
        className={`font-poppins overflow-x-hidden overflow-y-auto w-full max-w-full min-h-screen relative flex flex-col justify-between select-none transition-all duration-1000 pb-12 ${textColorClass}`}
        style={{ background: getBackgroundGradient(riverState) }}
      >
        {/* Underwater Light Rays */}
        <div className="light-rays-container absolute top-0 left-0 right-0 h-[60vh] overflow-hidden pointer-events-none z-0 opacity-40 mix-blend-overlay">
          <div className="absolute top-[-20%] left-[10%] w-[150px] h-[120%] bg-gradient-to-b from-white to-transparent transform rotate-[15deg] blur-[30px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[-20%] left-[40%] w-[200px] h-[120%] bg-gradient-to-b from-white to-transparent transform rotate-[25deg] blur-[40px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
          <div className="absolute top-[-20%] left-[70%] w-[100px] h-[120%] bg-gradient-to-b from-white to-transparent transform rotate-[10deg] blur-[25px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '5s' }} />
        </div>

        {/* Realistic Rising Bubbles */}
        <div className="bubble-container absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {bubbles.map((b) => (
            <div 
              key={b.id} 
              className="absolute bottom-[-50px]"
              style={{
                left: `${b.left}%`,
                animation: `bubble-rise-real ${b.durRise}s linear infinite`,
                animationDelay: `${b.delayRise}s`
              }}
            >
              <div 
                className="rounded-full"
                style={{
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.1) 40%, rgba(255, 255, 255, 0) 60%)',
                  boxShadow: 'inset 0 0 10px rgba(255,255,255,0.4), inset 2px 2px 5px rgba(255,255,255,0.6), inset -2px -2px 5px rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  filter: `blur(${b.size < 6 ? 2 : (b.size < 10 ? 1 : 0)}px)`,
                  animation: `bubble-sway-real ${b.durSway}s ease-in-out infinite alternate`,
                  transform: `translateX(-${b.swayAmount/2}px)`,
                  '--sway-amount': `${b.swayAmount}px`
                }}
              />
            </div>
          ))}
        </div>

        <div className="responsive-weather-search">
          <div className="flex w-full items-start gap-2 md:gap-3">
            <div className="flex-1 min-w-0 relative">
              <div className="deep-frosted-pill w-full h-11 md:h-[3.25rem] rounded-full shadow-lg transition-all duration-300 flex items-center pr-1.5 pl-3 md:pl-5 hover:bg-white/25 focus-within:bg-white/25 focus-within:border-white/40">
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

              {isFocused && (
                <div className="deep-frosted-dropdown absolute top-[3.2rem] md:top-[3.75rem] left-0 w-full rounded-2xl shadow-2xl transition-all duration-300 z-50 flex flex-col overflow-hidden max-h-[250px] md:max-h-[300px] overflow-y-auto">
                  {searchQuery.trim().length < 2 ? (
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
                              onClick={() => { setSearchQuery(item.query); handleSearchSubmit(item.query, item.isRiver); setIsFocused(false); }}
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
                    suggestions.length > 0 ? (
                      <div className="p-2 md:p-3">
                        <div className="text-[9px] md:text-[10px] uppercase font-normal text-white opacity-50 px-3 py-1 flex items-center gap-1.5 text-left">
                          <span className="material-symbols-outlined text-xs">travel_explore</span> Search Results
                        </div>
                        {suggestions.map((s, idx) => (
                          <div 
                            key={idx} 
                            className="px-3 py-2 md:py-2.5 cursor-pointer hover:bg-white/20 rounded-lg transition-colors text-left text-white flex flex-col border-b border-white/5 last:border-b-0"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setSearchQuery(s.name); handleSearchSubmit(s.name, s.isRiver); setIsFocused(false); }}
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
          <div className="flex-1 flex flex-col justify-center items-center w-full min-h-full relative z-40 main-weather-content pt-20 md:pt-24 pb-8">
            <div className="flex flex-col items-center w-full max-w-6xl px-4">
              
              <div className="relative z-50">
                <div 
                  onClick={() => { if (rivers.length > 1) setShowStationsDropdown(!showStationsDropdown); }}
                  className={`flex items-center gap-2 mb-1 justify-center transition-colors ${rivers.length > 1 ? 'hover:opacity-80 cursor-pointer' : ''}`}
                >
                  <h1 className={`text-xl xs:text-2xl md:text-3xl font-semibold tracking-tight ${textColorClass} drop-shadow-md text-center`}>
                    {formattedCity}
                  </h1>
                  {rivers.length > 1 && (
                    <span className="material-symbols-outlined text-white/80 transition-transform duration-300" style={{ transform: showStationsDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      expand_more
                    </span>
                  )}
                </div>
                
                {showStationsDropdown && rivers.length > 1 && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 min-w-[250px] deep-frosted-dropdown rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up py-2 border border-white/20">
                    <div className="text-[10px] uppercase font-semibold text-white/50 px-4 py-2 border-b border-white/10 tracking-wider">
                      Select Station
                    </div>
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                      {rivers.map((r, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            setSelectedRiverIdx(idx);
                            setShowStationsDropdown(false);
                          }}
                          className={`px-4 py-3 cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-between ${idx === selectedRiverIdx ? 'bg-white/15' : ''}`}
                        >
                          <span className="text-white font-medium text-sm drop-shadow-md">{r.name}</span>
                          {idx === selectedRiverIdx && (
                            <span className="material-symbols-outlined text-white/90 text-sm">check</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <h2 className={`text-sm md:text-base font-normal opacity-70 ${textColorClass} mb-6 md:mb-10 drop-shadow-sm`}>
                {formattedCountry}
              </h2>
              
              <div className="flex items-end justify-center mb-6">
                <span className={`text-[6rem] xs:text-[7rem] md:text-[9rem] leading-none font-light tracking-tighter ${textColorClass} drop-shadow-lg`}>
                  {currentRiverLevel}
                </span>
                <div className="flex items-center mb-3 md:mb-4 ml-1 md:ml-2">
                  <span className={`text-4xl md:text-5xl font-normal ${textColorClass} opacity-80`}>
                    {currentRiverLevel !== '--' ? 'm' : ''}
                  </span>
                  {trendIcon && currentRiverLevel !== '--' && (
                    <span className={`material-symbols-outlined text-3xl md:text-4xl drop-shadow-sm font-bold ml-1 ${textColorClass} opacity-80 ${trendColor}`}>
                      {trendIcon}
                    </span>
                  )}
                </div>
              </div>
              
            

              {/* 24-Hour River Level Trend Card */}
              <div className="w-full rounded-3xl p-5 md:p-8 flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <h3 className="text-sm md:text-base font-semibold text-white/90">24-Hour River Level Trend</h3>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1.5 text-sm md:text-base font-medium text-white">
                  <span className="material-symbols-outlined text-[16px] md:text-[18px]">arrow_upward</span> {maxRiverLevel}m
                </span>
                <span className="flex items-center gap-1.5 text-sm md:text-base font-medium text-white">
                  <span className="material-symbols-outlined text-[16px] md:text-[18px]">arrow_downward</span> {minRiverLevel}m
                </span>
                {weather && (
                  <>
                    <span className="text-white/30">|</span>
                    <span className="flex items-center gap-1.5 text-sm md:text-base font-medium text-white">
                      <span className="material-symbols-outlined text-[16px] md:text-[18px]">water_drop</span> {precipitation}%
                    </span>
                  </>
                )}
                  </div>
                </div>

                <div className="w-full h-[200px] md:h-[250px] relative">
                  {/* SVG Chart */}
                  <svg 
                    width="100%" 
                    height="100%" 
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                    preserveAspectRatio="none" 
                    className="absolute inset-0"
                    onMouseMove={(e) => {
                      if (!activePoints.length) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const scaleX = chartWidth / rect.width;
                      const mouseX = (e.clientX - rect.left) * scaleX;
                      let closest = null;
                      let minDist = Infinity;
                      activePoints.forEach(p => {
                        const dist = Math.abs(p.x - mouseX);
                        if (dist < minDist) {
                          minDist = dist;
                          closest = p;
                        }
                      });
                      setHoveredPoint(closest);
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3A82F6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#3A82F6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Threshold Lines */}
                    {majorY !== null && (
                      <g>
                        <line x1="0" y1={majorY} x2={chartWidth} y2={majorY} stroke="#eff5ff" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="5,5" />
                      </g>
                    )}
                    {minorY !== null && (
                      <g>
                        <line x1="0" y1={minorY} x2={chartWidth} y2={minorY} stroke="#eff5ff" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="5,5" />
                      </g>
                    )}
                    {alertY !== null && (
                      <g>
                        <line x1="0" y1={alertY} x2={chartWidth} y2={alertY} stroke="#eff5ff" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="5,5" />
                      </g>
                    )}

                    {/* Chart Area */}
                    {areaD && <path d={areaD} fill="url(#areaGradient)" />}
                    {/* Chart Line */}
                    {pathD && <path d={pathD} fill="none" stroke="#b3d0ffa7" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 6px rgba(58, 130, 246, 0.8))' }} />}
                    
                    {/* Data Points */}
                    {activePoints.map((p, i) => {
                      const isHovered = hoveredPoint && hoveredPoint.x === p.x;
                      return (
                        <circle 
                          key={i} 
                          cx={p.x} 
                          cy={p.y} 
                          r={isHovered ? "6" : (i === activePoints.length - 1 ? "4" : "2")} 
                          fill="#fff" 
                          opacity={isHovered ? "1" : (i === activePoints.length - 1 ? "1" : "0.5")} 
                          style={{ transition: 'all 0.2s ease' }}
                        />
                      );
                    })}
                  </svg>

                  {/* HTML Overlay for Text Labels */}
                  <div className="absolute inset-0 pointer-events-none z-10">
                    {majorY !== null && (
                      <div 
                        className="absolute right-0 text-[9px] md:text-xs text-[#eff5ff] opacity-80 font-sans tracking-wide pr-1"
                        style={{ top: `calc(${(majorY / chartHeight) * 100}% - 14px)` }}
                      >
                        MAJOR FLOOD ({majorVal}m)
                      </div>
                    )}
                    {minorY !== null && (
                      <div 
                        className="absolute right-0 text-[9px] md:text-xs text-[#eff5ff] opacity-80 font-sans tracking-wide pr-1"
                        style={{ top: `calc(${(minorY / chartHeight) * 100}% - 14px)` }}
                      >
                        MINOR FLOOD ({minorVal}m)
                      </div>
                    )}
                    {alertY !== null && (
                      <div 
                        className="absolute right-0 text-[9px] md:text-xs text-[#eff5ff] opacity-80 font-sans tracking-wide pr-1"
                        style={{ top: `calc(${(alertY / chartHeight) * 100}% - 14px)` }}
                      >
                        ALERT ({alertVal}m)
                      </div>
                    )}
                  </div>

                  {/* Tooltip */}
                  {hoveredPoint && (
                    <div 
                      className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full pb-2"
                      style={{ 
                        left: `${(hoveredPoint.x / chartWidth) * 100}%`, 
                        top: `${(hoveredPoint.y / chartHeight) * 100}%`
                      }}
                    >
                      <div className="bg-[#0D1423]/90 backdrop-blur-md border border-white/20 px-3 py-2 rounded-xl shadow-2xl flex flex-col items-center min-w-[70px]">
                        <span className="text-[10px] text-white/70 font-semibold uppercase mb-0.5 tracking-wider">
                          {new Date(hoveredPoint.time).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-white font-bold text-sm drop-shadow-md">
                          {hoveredPoint.value.toFixed(2)}m
                        </span>
                      </div>
                      <div className="w-2.5 h-2.5 bg-[#0D1423]/90 border-r border-b border-white/20 transform rotate-45 absolute bottom-0.5 left-1/2 -translate-x-1/2"></div>
                    </div>
                  )}

                  {/* X-Axis Labels */}
                  <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] md:text-xs font-semibold text-white/40 uppercase">
                    {[0, 1, 2, 3, 4].map(i => {
                      if (!activePoints || activePoints.length === 0) return <span key={i}>--:--</span>;
                      const minT = activePoints[0].time;
                      const maxT = activePoints[activePoints.length - 1].time;
                      const t = minT + (maxT - minT) * (i / 4);
                      const d = new Date(t);
                      
                      if (i === 4 && Math.abs(Date.now() - maxT) < 3600000) {
                        return <span key={i} className="text-white">NOW</span>;
                      }
                      
                      if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
                        return <span key={i}>{d.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' })}</span>;
                      }
                      return <span key={i}>{d.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}</span>;
                    })}
                  </div>

                  {/* Y-Axis Labels */}
                  <div className="absolute top-0 left-0 bottom-0 flex flex-col justify-between text-[10px] md:text-xs font-semibold text-white/40 pointer-events-none pb-1">
                    {Array.from({ length: (yMaxChart - yMinChart) / 2 + 1 }).map((_, i) => (
                      <span key={i}>{((yMaxChart - yMinChart) - i * 2)}m</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="w-full flex flex-col xl:flex-row gap-6 mt-8 mb-4 relative z-20">
                <div className="w-full xl:w-1/2">
                  <StationWeatherCard 
                    lat={activeRiver?.lat || null} 
                    lon={activeRiver?.lon || null} 
                    stationName={activeRiver?.name || ''} 
                  />
                </div>
                <div className="w-full xl:w-1/2">
                  <div className="w-full h-full min-h-[200px] md:min-h-[240px]">
                    <StationsMap stations={rivers} activeStationIdx={selectedRiverIdx} />
                  </div>
                </div>
              </div>              {/* AI Assistant Input */}
              <div className="w-full mt-10 md:mt-12">
                <PromptInputBasic />
              </div>

              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
