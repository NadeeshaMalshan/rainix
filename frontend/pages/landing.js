import { useState, useEffect } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';
import LiquidGlassText2D from '../components/LiquidGlassText2D';

export default function Landing() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNight, setIsNight] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  
  // Suggestions states
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Recent Searches State
  const [recentSearches, setRecentSearches] = useState([]);
  
  // Saved Locations Live Weather State
  const [savedLocationsWeather, setSavedLocationsWeather] = useState({
    'Tokyo, JP': { temp: '24°', status: 'Active Storm Alert', style: 'thunderstorm' },
    'Sydney, AU': { temp: '31°', status: 'Clear Conditions', style: 'sunny' }
  });

  // Active River Stations Live Level State
  const [riverStations, setRiverStations] = useState([
    { name: 'Kelani Ganga - Nagalagam Street', level: '6.82m', status: 'Major Flood', trend: 'trending_up' },
    { name: 'Kalu Ganga - Putupaula', level: '3.21m', status: 'Normal', trend: 'trending_flat' }
  ]);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTimeInMinutes = hours * 60 + minutes;
      
      const dayStart = 6 * 60; // 6:00 AM
      const dayEnd = 18 * 60 + 30; // 6:30 PM
      
      const dayTime = currentTimeInMinutes >= dayStart && currentTimeInMinutes < dayEnd;
      setIsNight(!dayTime);
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);

    // Load recent searches
    const saved = localStorage.getItem('rainix_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaults = [
        { name: 'Seattle, WA', query: 'Seattle', coords: '47.6062° N, 122.3321° W' },
        { name: 'Colombo, LK', query: 'Colombo', coords: '6.9271° N, 79.8612° E' }
      ];
      setRecentSearches(defaults);
      localStorage.setItem('rainix_recent_searches', JSON.stringify(defaults));
    }

    fetchSavedLocationsWeather();
    fetchLiveRivers();

    return () => clearInterval(interval);
  }, []);

  // Search-as-you-type geocoding suggestion API call + local river matching
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery && searchQuery.trim().length >= 2) {
        const trimmed = searchQuery.trim().toLowerCase();
        
        try {
          const nodeApiUrl = (process.env.NEXT_PUBLIC_NODE_API_URL || "http://localhost:5000").replace(/\/$/, "");
          const [geoRes, riverRes] = await Promise.all([
            fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery.trim())}&count=20`).catch(() => null),
            fetch(`${nodeApiUrl}/api/rivers/search?q=${encodeURIComponent(searchQuery.trim())}`).catch(() => null)
          ]);
          
          let combined = [];
          if (riverRes) {
            const riverData = await riverRes.json();
            if (riverData.success && riverData.data) {
              combined = [...riverData.data.map(r => ({ ...r, isRiver: true }))];
            }
          }
          if (geoRes) {
            const geoData = await geoRes.json();
            if (geoData.results) {
              const slResults = geoData.results.filter(g => g.country === 'Sri Lanka' || g.country_code === 'LK');
              combined = [...combined, ...slResults];
            }
          }
          
          if (combined.length > 0) {
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
            setShowSuggestions(false);
          }
        } catch (err) {
          console.error("Failed to fetch suggestions", err);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, riverStations]);

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

  const fetchLiveRivers = async () => {
    try {
      const nodeApiUrl = (process.env.NEXT_PUBLIC_NODE_API_URL || "http://localhost:5000").replace(/\/$/, "");
      const kelaniRes = await fetch(`${nodeApiUrl}/api/rivers/Kelani`);
      const kelaniData = await kelaniRes.json();
      
      const kaluRes = await fetch(`${nodeApiUrl}/api/rivers/Kalu`);
      const kaluData = await kaluRes.json();

      const newRivers = [...riverStations];

      if (kelaniData.success && kelaniData.data.length > 0) {
        const device = kelaniData.data[0];
        newRivers[0] = {
          name: 'Kelani Ganga - ' + (device.area || 'Nagalagam Street'),
          level: `${device.maxLevel ? device.maxLevel.toFixed(2) : '6.82'}m`,
          status: device.status === 'ALERT' ? 'Major Flood' : 'Normal',
          trend: device.status === 'ALERT' ? 'trending_up' : 'trending_flat'
        };
      }

      if (kaluData.success && kaluData.data.length > 0) {
        const device = kaluData.data.find(d => d.area === 'Putupaula') || kaluData.data[0];
        newRivers[1] = {
          name: 'Kalu Ganga - ' + (device.area || 'Putupaula'),
          level: `${device.maxLevel ? device.maxLevel.toFixed(2) : '3.21'}m`,
          status: device.status === 'ALERT' ? 'High Level Warning' : 'Normal',
          trend: device.status === 'ALERT' ? 'trending_up' : 'trending_flat'
        };
      }

      setRiverStations(newRivers);
    } catch (err) {
      console.warn('Failed to fetch live river data, using defaults.', err);
    }
  };

  const handleSearchSubmit = (query, isRiver = false) => {
    if (!query || query.trim() === '') return;
    const trimmed = query.trim();
    setShowSuggestions(false);
    
    // Check if the query is a known river or passed explicitly as river
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

  const handleGpsClick = () => {
    const pushCoords = (latitude, longitude) => {
      router.push(`/weather?lat=${latitude}&lon=${longitude}`);
    };

    const fallbackToIpLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          pushCoords(data.latitude, data.longitude);
        }
      } catch (err) {
        console.error("IP fallback failed:", err);
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

  const dayGradient = 'linear-gradient(180deg, #3A82F6 0%, #89CFF0 100%)';
  const nightGradient = 'linear-gradient(180deg, #0A192F 0%, #112240 100%)';

  return (
    <div className="min-h-screen relative overflow-hidden font-sans text-white select-none">
      <Head>
        <title>rainiX - Minimal Weather Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Hanken+Grotesk:wght@400;600&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </Head>

      <style>{`
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
          100% { opacity: 1; transform: none; }
        }
        @keyframes pop-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bird-flap {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(-0.4); }
        }
        @keyframes fly-across-1 {
          0% { transform: translate(-10vw, 15vh) scale(0.5); }
          100% { transform: translate(110vw, 8vh) scale(0.5); }
        }
        @keyframes fly-across-2 {
          0% { transform: translate(-15vw, 22vh) scale(0.4); }
          100% { transform: translate(110vw, 12vh) scale(0.4); }
        }
        @keyframes fly-across-3 {
          0% { transform: translate(-20vw, 18vh) scale(0.35); }
          100% { transform: translate(110vw, 10vh) scale(0.35); }
        }
        
        .animate-star { animation: star-twinkle ease-in-out infinite; will-change: opacity, transform; }
        .animate-cloud { animation: cloud-move linear infinite; will-change: transform; }
        .animate-fade-in-up { animation: fade-in-up 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .animate-pop-in { animation: pop-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <style dangerouslySetInnerHTML={{ __html: `
        .responsive-search-container {
          left: 0 !important;
          right: 0 !important;
          margin-inline: auto !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        @media (min-width: 375px) {
          .responsive-search-container {
            max-width: 330px !important;
          }
        }
        @media (min-width: 640px) {
          .responsive-search-container {
            max-width: 384px !important;
          }
        }
        @media (min-width: 768px) {
          .responsive-search-container {
            max-width: 512px !important;
          }
        }

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
        }
      `}} />

      {/* Main Background */}
      <div 
        className="font-poppins w-full max-w-full min-h-screen relative flex flex-col justify-between overflow-x-hidden overflow-y-auto custom-scrollbar pb-12 transition-all duration-1000"
        style={{ background: isNight ? nightGradient : dayGradient }}
      >
        {/* Twinkling Stars (Night-only) */}
        {isNight && (
          <div className="star-container absolute inset-0 pointer-events-none z-0">
            {Array.from({ length: 45 }).map((_, i) => (
              <div 
                key={i} 
                className="star-particle animate-star absolute bg-white rounded-full" 
                style={{ 
                  width: `${Math.random() * 2 + 1}px`, 
                  height: `${Math.random() * 2 + 1}px`, 
                  left: `${Math.random() * 100}%`, 
                  top: `${Math.random() * 65}%`, 
                  animationDuration: `${0.8 + Math.random() * 1.8}s`, 
                  animationDelay: `${Math.random() * -2}s` 
                }} 
              />
            ))}
          </div>
        )}

        {/* Flying Birds (Day-only) */}
        {!isNight && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <div className="absolute" style={{ animation: 'fly-across-1 22s linear infinite', animationDelay: '0s' }}>
              <svg className="w-8 h-6 text-slate-900/75 fill-current" viewBox="0 0 24 16">
                <path d="M 2.1,3.5 C 5.1,1.5 9,0 12,2 C 15,0 18.9,1.5 21.9,3.5 C 22.8,4.1 21.5,5.1 20.3,5.1 C 17,5.1 13.5,7 12,12 C 10.5,7 7,5.1 3.7,5.1 C 2.5,5.1 1.2,4.1 2.1,3.5 Z" style={{ transformOrigin: 'center', animation: 'bird-flap 0.35s ease-in-out infinite' }} />
              </svg>
            </div>
            <div className="absolute" style={{ animation: 'fly-across-2 25s linear infinite', animationDelay: '3s' }}>
              <svg className="w-8 h-6 text-slate-950/70 fill-current" viewBox="0 0 24 16">
                <path d="M 2.1,3.5 C 5.1,1.5 9,0 12,2 C 15,0 18.9,1.5 21.9,3.5 C 22.8,4.1 21.5,5.1 20.3,5.1 C 17,5.1 13.5,7 12,12 C 10.5,7 7,5.1 3.7,5.1 C 2.5,5.1 1.2,4.1 2.1,3.5 Z" style={{ transformOrigin: 'center', animation: 'bird-flap 0.4s ease-in-out infinite' }} />
              </svg>
            </div>
            <div className="absolute" style={{ animation: 'fly-across-3 28s linear infinite', animationDelay: '1.5s' }}>
              <svg className="w-8 h-6 text-slate-950/60 fill-current" viewBox="0 0 24 16">
                <path d="M 2.1,3.5 C 5.1,1.5 9,0 12,2 C 15,0 18.9,1.5 21.9,3.5 C 22.8,4.1 21.5,5.1 20.3,5.1 C 17,5.1 13.5,7 12,12 C 10.5,7 7,5.1 3.7,5.1 C 2.5,5.1 1.2,4.1 2.1,3.5 Z" style={{ transformOrigin: 'center', animation: 'bird-flap 0.38s ease-in-out infinite' }} />
              </svg>
            </div>
          </div>
        )}

     

        {/* Soft Decorative Floating Clouds (exactly 4, dynamically sized for viewport scaling) */}
        <div className="cloud-container absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => {
            const sizes = [
              'w-64 h-32 md:w-[32rem] md:h-[16rem]',
              'w-80 h-40 md:w-[45rem] md:h-[20rem]',
              'w-72 h-36 md:w-[36rem] md:h-[18rem]',
              'w-64 h-32 md:w-[32rem] md:h-[16rem]'
            ];
            const sizeClass = sizes[i % sizes.length];
            const tops = ['8%', '20%', '12%', '28%'];
            const topVal = tops[i % tops.length];
            return (
              <img 
                key={i} 
                src="/images/cloud.png" 
                alt="Cloud" 
                className={`weather-cloud animate-cloud absolute object-contain mix-blend-multiply brightness-90 ${sizeClass} ${isNight ? 'opacity-20' : 'opacity-40'}`} 
                style={{ 
                  top: topVal, 
                  left: `-800px`, 
                  animationDuration: `${60 + i * 15}s`, 
                  animationDelay: `${-i * 18}s` 
                }} 
              />
            );
          })}
        </div>

        {/* Center Main Content Container */}
        <div className="flex-1 flex flex-col justify-center items-center w-full relative z-40 px-3 xs:px-4 md:px-6 pt-[6vh] pb-32 animate-fade-in-up">
          
          <div className="flex flex-col items-center w-full max-w-2xl text-center">
            
      
           
            {/* Liquid Glass text */}
            <div className="w-full max-w-full flex justify-center transition-transform">
              <LiquidGlassText2D text="rainiX" />
            </div>

            {/* Simple Minimalist Pill Search Bar */}
            <div className="responsive-search-container mt-5 md:mt-8 flex items-center gap-2 md:gap-3">
              <div className="flex-1 min-w-0 relative">
                <div 
                  className="deep-frosted-pill w-full h-11 md:h-[3.25rem] rounded-full shadow-lg transition-all duration-300 flex items-center pr-1.5 pl-3 md:pl-5 hover:bg-white/25 focus-within:bg-white/25 focus-within:border-white/40"
                >
                  <input 
                    className="flex-1 min-w-0 !bg-transparent border-none text-left focus:ring-0 text-white font-medium text-sm md:text-lg placeholder:text-white placeholder:opacity-60 outline-none"
                    style={{ backgroundColor: 'transparent' }}
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
                    className="p-1 md:p-1.5 rounded-full hover:bg-white/30 transition-colors text-white flex items-center justify-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl md:text-2xl">search</span>
                  </button>
                </div>

                {/* Dynamic Dropdown Overlay (Search Suggestions vs. Grouped Recents & Saved) */}
                {isFocused && (
                  <div 
                    className="deep-frosted-dropdown absolute top-[3.2rem] md:top-[3.75rem] left-0 w-full rounded-2xl shadow-2xl transition-all duration-300 z-50 flex flex-col overflow-hidden max-h-[250px] md:max-h-[300px] overflow-y-auto"
                  >
                    {searchQuery.trim().length < 2 ? (
                      /* Case 1: Search input is empty or cleared - immediately show Recents/Saved */
                      <>
                        {recentSearches.length > 0 && (
                          <div className="p-2 md:p-3">
                            <div className="text-[9px] md:text-[10px] uppercase font-normal text-white opacity-50 px-3 py-1 flex items-center gap-1.5">
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
                      /* Case 2: Typed query is 2+ characters */
                      showSuggestions && suggestions.length > 0 ? (
                        /* Subcase A: Suggestions available */
                        <div className="p-2 md:p-3">
                          <div className="text-[9px] md:text-[10px] uppercase font-normal text-white opacity-50 px-3 py-1 flex items-center gap-1.5">
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
                        /* Subcase B: No results available - Display Search results are not available */
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
                className="deep-frosted-pill h-10 w-10 md:h-[3.25rem] md:w-[3.25rem] rounded-full flex-shrink-0 hover:bg-white/30 transition-all duration-300 flex items-center justify-center text-white shadow-lg cursor-pointer" 
                onClick={handleGpsClick}
              >
                <span className="material-symbols-outlined text-xl md:text-2xl">my_location</span>
              </button>
            </div>

            {/* rainiX AI Quick Gateway Button */}
            <button
  onClick={() => router.push('/ai')}
  className="mt-4 md:mt-6 px-5 md:px-6 py-2 md:py-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 hover:border-white/30 shadow-lg text-white text-xs md:text-base flex items-center gap-1.5 md:gap-2 transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer group"
>
  <span className="text-black dark:text-white leading-none flex items-center">
    ↗
  </span>

  <span className="font-medium">rainiX AI</span>
</button>
          </div>
        </div>

        {/* Bottom Landscape Ground (Responsive scaling for small landscape overlays) */}
       
      </div>

  
    </div>
  );
}
