import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { PromptInputBasic } from '@/components/ui/demo';

export default function Landing() {
  const router = useRouter();
  const [particles, setParticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedCityData, setSelectedCityData] = useState(null);
  
  // Recent Searches State (Loads from localStorage on client)
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

  // Generate background particles on mount
  useEffect(() => {
    const items = [];
    for (let i = 0; i < 20; i++) {
      const size = Math.random() * 200 + 100;
      items.push({
        id: i,
        width: `${size}px`,
        height: `${size}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        duration: `${Math.random() * 20 + 20}s`
      });
    }
    setParticles(items);

    // Load recent searches from localStorage
    const saved = localStorage.getItem('rainix_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default placeholder recent searches
      const defaults = [
        { name: 'Seattle, WA', query: 'Seattle', coords: '47.6062° N, 122.3321° W' },
        { name: 'Colombo, LK', query: 'Colombo', coords: '6.9271° N, 79.8612° E' }
      ];
      setRecentSearches(defaults);
      localStorage.setItem('rainix_recent_searches', JSON.stringify(defaults));
    }

    // Fetch actual weather for saved locations & rivers on load
    fetchSavedLocationsWeather();
    fetchLiveRivers();
  }, []);

  const fetchSavedLocationsWeather = async () => {
    try {
      const fetchCityWeather = async (city) => {
        const res = await fetch(`http://localhost:5000/api/city/${city}`);
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
      // Kelani Ganga (Nagalagam Street) is under region Kelani
      const kelaniRes = await fetch('http://localhost:5000/api/rivers/Kelani');
      const kelaniData = await kelaniRes.json();
      
      // Kalu Ganga (Putupaula) is under region Kalu
      const kaluRes = await fetch('http://localhost:5000/api/rivers/Kalu');
      const kaluData = await kaluRes.json();

      const newRivers = [...riverStations];

      if (kelaniData.success && kelaniData.data.length > 0) {
        // find Nagalagam Street device or Kelani device
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

  // Perform search query
  const handleSearch = (query) => {
    if (!query || query.trim() === '') return;
    const trimmed = query.trim();
    router.push(`/weather?city=${encodeURIComponent(trimmed)}`);
  };


  const handleClearAll = () => {
    setRecentSearches([]);
    localStorage.removeItem('rainix_recent_searches');
  };

  const handleClose = () => {
    if (selectedCityData) {
      setSelectedCityData(null);
    } else {
      router.push('/');
    }
  };

  // Maps WMO code to weather conditions
  const getWeatherConditions = (code) => {
    if (code === 0) return { label: 'Clear Sky', icon: 'sunny' };
    if (code >= 1 && code <= 3) return { label: 'Mainly Clear / Partly Cloudy', icon: 'partly_cloudy_day' };
    if (code === 45 || code === 48) return { label: 'Foggy Conditions', icon: 'foggy' };
    if (code >= 51 && code <= 55) return { label: 'Light Drizzle', icon: 'rainy' };
    if (code >= 61 && code <= 65) return { label: 'Continuous Rain', icon: 'rainy_heavy' };
    if (code >= 71 && code <= 75) return { label: 'Snowfall', icon: 'weather_snowy' };
    if (code >= 80 && code <= 82) return { label: 'Violent Showers', icon: 'rainy' };
    if (code >= 95) return { label: 'Thunderstorms & Heavy Storms', icon: 'thunderstorm' };
    return { label: 'Overcast Conditions', icon: 'cloud' };
  };

  return (
    <>
      <Head>
        <title>rainiX - All in ONE weather service</title>
        <link href="/landing.css" rel="stylesheet" />
      </Head>

      <div 
        className="text-on-surface font-body-md selection:bg-primary/30 min-h-screen relative overflow-y-auto"
        style={{
          background: 'radial-gradient(circle at top right, #1A3A5F, #0A192F)',
        }}
      >
        {/* Background Dashboard Simulation (Blurred behind overlay) */}
        <div className="fixed inset-0 grid grid-cols-12 gap-6 p-8 opacity-25 grayscale pointer-events-none z-0">
          <div className="col-span-8 glass-pane rounded-lg p-10 h-64"></div>
          <div className="col-span-4 glass-pane rounded-lg p-10 h-64"></div>
          <div className="col-span-4 glass-pane rounded-lg p-10 h-96"></div>
          <div className="col-span-4 glass-pane rounded-lg p-10 h-96"></div>
          <div className="col-span-4 glass-pane rounded-lg p-10 h-96"></div>
        </div>

        {/* Search Overlay Container */}
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-view-padding overflow-y-auto search-overlay-backdrop">
          <div className="w-full max-w-3xl flex flex-col gap-8 animate-in fade-in zoom-in duration-300 relative z-10 pb-16">
            
            {/* Close Button (Absolute for quick exit) */}
            <button 
              className="fixed top-8 right-8 text-on-surface-variant hover:text-primary transition-colors cursor-pointer p-2 hover:bg-white/5 rounded-full"
              onClick={handleClose}
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[32px] block">close</span>
            </button>

            {/* Search Header */}
            <div className="space-y-2 text-center lg:text-left">
              <h1 className="font-headline-lg text-[44px] text-primary tracking-tight font-extrabold flex items-center justify-center lg:justify-start gap-2">
                <span className="material-symbols-outlined text-[44px]">rainy</span> rainiX
              </h1>
              <p className="font-body-md text-on-surface-variant/80 tracking-wide font-medium">All in ONE weather & river alert service</p>
            </div>

            {/* Focused Interaction Zone */}
            <div className="glass-pane rounded-lg p-2 active-search-focus shadow-2xl transition-all duration-500 bg-white/[0.02]">
              <div className="px-2 py-2">
                <PromptInputBasic onSearch={handleSearch} />
              </div>

              {/* Filter Toggle Chips */}
              <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-white/[0.05]">
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary font-label-sm text-label-sm transition-transform active:scale-95">
                  <span className="material-symbols-outlined text-[18px]">location_on</span>
                  Sri Lanka & Global Locations
                </button>
                <button 
                  type="button"
                  onClick={() => setSearchQuery('Colombo')} 
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-on-surface-variant font-label-sm text-label-sm hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">water_drop</span>
                  River Net
                </button>
              </div>
            </div>

            {/* Error Message Panel */}
            {errorMsg && (
              <div className="glass-pane rounded-xl p-6 border-red-500/40 bg-red-500/10 text-red-200 shadow-lg animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-400 text-3xl">warning</span>
                  <p className="font-semibold text-lg">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center p-12 glass-pane rounded-xl gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="text-on-surface-variant font-medium text-lg animate-pulse">Fetching Real-Time Meteorological & Hydrological Data...</p>
              </div>
            )}

            {/* Dynamic Search Results Screen */}
            {selectedCityData && !isLoading && (
              <div className="glass-pane rounded-xl p-8 flex flex-col gap-6 shadow-2xl bg-white/[0.03] border-primary/20 animate-in fade-in duration-300">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                  <div>
                    <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                      <span className="material-symbols-outlined text-[16px]">map</span>
                      Global Coordinates Weather
                    </div>
                    <h2 className="text-[36px] font-extrabold text-on-surface leading-tight mt-1">
                      {selectedCityData.weather.city}, <span className="text-primary">{selectedCityData.weather.country}</span>
                    </h2>
                    <p className="text-on-surface-variant text-sm font-semibold tracking-wider uppercase mt-1">
                      {selectedCityData.weather.coordinates.latitude.toFixed(4)}° N, {selectedCityData.weather.coordinates.longitude.toFixed(4)}° E
                    </p>
                  </div>
                  <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 shadow-inner">
                    <span className="material-symbols-outlined text-[48px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {getWeatherConditions(selectedCityData.weather.weather.weatherCode).icon}
                    </span>
                    <div className="text-right">
                      <span className="text-[42px] font-black text-primary leading-none block">
                        {Math.round(selectedCityData.weather.weather.temperature)}°C
                      </span>
                      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mt-1 block">
                        {getWeatherConditions(selectedCityData.weather.weather.weatherCode).label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weather Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col gap-1">
                    <span className="material-symbols-outlined text-primary text-[24px]">air</span>
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Wind Speed</span>
                    <span className="text-xl font-bold text-on-surface">{selectedCityData.weather.weather.windSpeed} km/h</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col gap-1">
                    <span className="material-symbols-outlined text-primary text-[24px]">humidity_mid</span>
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Humidity</span>
                    <span className="text-xl font-bold text-on-surface">{selectedCityData.weather.weather.humidity}%</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col gap-1">
                    <span className="material-symbols-outlined text-primary text-[24px]">rainy</span>
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Precipitation</span>
                    <span className="text-xl font-bold text-on-surface">{selectedCityData.weather.weather.precipitation} mm</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex flex-col gap-1">
                    <span className="material-symbols-outlined text-primary text-[24px]">schedule</span>
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">Update Time</span>
                    <span className="text-[13px] font-bold text-on-surface break-words leading-tight">{new Date(selectedCityData.weather.weather.time).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Hydrological Alert River Stations in City */}
                <div className="space-y-3 mt-2">
                  <h3 className="font-title-md text-title-md text-primary flex items-center gap-2 border-b border-white/5 pb-2 font-bold">
                    <span className="material-symbols-outlined">waves</span> 
                    Active Hydro River Stations ({selectedCityData.rivers ? selectedCityData.rivers.length : 0})
                  </h3>
                  {selectedCityData.rivers && selectedCityData.rivers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedCityData.rivers.map((river, idx) => (
                        <div key={idx} className="group glass-pane rounded-xl p-5 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-all border border-white/10">
                          <div className="flex items-center gap-4">
                            <div className="bg-primary/20 p-3 rounded-lg border border-primary/20">
                              <span className="material-symbols-outlined text-primary text-2xl font-bold">waves</span>
                            </div>
                            <div>
                              <p className="font-bold text-[18px] text-on-surface group-hover:text-primary transition-colors">{river.name}</p>
                              <p className="font-semibold text-sm text-on-surface-variant/80 uppercase tracking-widest mt-1">Area: {river.city || 'N/A'}</p>
                              <span className={`inline-block text-xs font-bold px-2 py-1 rounded mt-2 uppercase ${river.status === 'ALERT' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-green-500/20 text-green-300 border border-green-500/30'}`}>
                                {river.status === 'ALERT' ? 'High alert flood' : 'Safe level'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-extrabold text-primary block">{river.maxLevel ? river.maxLevel.toFixed(2) : '0.00'}m</span>
                            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Water level</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-white/5 rounded-xl text-center text-on-surface-variant font-semibold">
                      No active hydrological river network sensors are mapped in {selectedCityData.weather.city}.
                    </div>
                  )}
                </div>

                {/* RainViewer Live Atmospheric Weather Radar */}
                {selectedCityData.radar && (
                  <div className="space-y-3 mt-2">
                    <h3 className="font-title-md text-title-md text-primary flex items-center gap-2 border-b border-white/5 pb-2 font-bold">
                      <span className="material-symbols-outlined">satellite_alt</span>
                      Live Weather Radar Overlay
                    </h3>
                    <div className="rounded-xl overflow-hidden glass-pane border border-white/10 relative p-4 flex flex-col md:flex-row items-center gap-6">
                      <div className="relative w-full md:w-48 h-48 bg-slate-950/80 rounded-xl overflow-hidden border border-white/10 shadow-inner flex items-center justify-center">
                        <div className="absolute inset-0 bg-[radial-gradient(#1e3c72_1px,transparent_1px)] [background-size:16px_16px] opacity-40 animate-pulse"></div>
                        {/* Custom visual mockup of radar map sweep */}
                        <div className="absolute top-1/2 left-1/2 w-44 h-44 -mt-22 -ml-22 rounded-full border border-primary/20 animate-ping"></div>
                        <div className="absolute top-1/2 left-1/2 w-28 h-28 -mt-14 -ml-14 rounded-full border border-primary/40"></div>
                        <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-primary/55 to-transparent top-1/2 left-0 origin-center animate-spin"></div>
                        <span className="material-symbols-outlined text-primary text-[56px] relative z-10 opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
                      </div>
                      <div className="flex-1 space-y-3">
                        <h4 className="text-xl font-bold text-on-surface flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
                          Radar Network Online
                        </h4>
                        <p className="text-on-surface-variant text-sm leading-relaxed">
                          Satellite and Precipitation tracking is active for <strong>{selectedCityData.weather.city}</strong>. Rainviewer host metadata generated a radar sweep frame for timeline <strong>{new Date(selectedCityData.radar.latestFrame * 1000).toLocaleTimeString()}</strong>.
                        </p>
                        <div className="bg-slate-900/60 p-3 rounded-lg border border-white/5">
                          <p className="text-[12px] font-semibold text-primary font-mono select-all truncate">
                            {selectedCityData.radar.tileUrl}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-4 border-t border-white/10 pt-6">
                  <button 
                    onClick={() => setSelectedCityData(null)}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-on-surface font-semibold rounded-lg transition-colors border border-white/10"
                  >
                    Clear Result
                  </button>
                  <button 
                    onClick={handleClose}
                    className="px-6 py-2 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-lg transition-all active:scale-95 shadow-lg"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Results & Suggestions Grid */}
            {!selectedCityData && !isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-card-gap pb-bottom-safe-area">
                
                {/* Recent Searches */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-title-md text-title-md text-primary-fixed-dim flex items-center gap-2 font-bold">
                      <span className="material-symbols-outlined text-primary">history</span>
                      Recent Searches
                    </h3>
                    {recentSearches.length > 0 && (
                      <button 
                        onClick={handleClearAll}
                        className="text-label-sm font-label-sm text-on-surface-variant hover:text-error transition-colors uppercase font-bold tracking-wider"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {recentSearches.length > 0 ? (
                      recentSearches.map((item, idx) => (
                        <div 
                          key={idx}
                          onClick={() => { setSearchQuery(item.query); handleSearch(item.query); }}
                          className="group glass-pane rounded-xl p-4 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-all border border-white/5 hover:border-primary/30"
                        >
                          <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">location_city</span>
                            <div>
                              <p className="font-title-md text-on-surface font-bold group-hover:text-primary transition-colors">{item.name}</p>
                              <p className="font-label-sm text-label-sm text-on-surface-variant font-medium mt-0.5">{item.coords}</p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">north_west</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-on-surface-variant px-4 py-8 text-center bg-white/[0.02] rounded-xl font-medium">Your search history is empty.</p>
                    )}
                  </div>
                </div>

                {/* Saved Locations */}
                <div className="space-y-4">
                  <h3 className="font-title-md text-title-md text-primary-fixed-dim px-2 flex items-center gap-2 font-bold">
                    <span className="material-symbols-outlined text-primary">bookmark</span>
                    Saved Locations
                  </h3>
                  <div className="flex flex-col gap-2">
                    {Object.entries(savedLocationsWeather).map(([name, loc], idx) => (
                      <div 
                        key={idx}
                        onClick={() => { setSearchQuery(name.split(',')[0]); handleSearch(name.split(',')[0]); }}
                        className="group glass-pane rounded-xl p-4 flex items-center justify-between hover:border-primary/40 hover:bg-white/5 cursor-pointer transition-all overflow-hidden relative border border-white/5"
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="bg-primary/20 p-2.5 rounded-lg border border-primary/20">
                            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                              {loc.style}
                            </span>
                          </div>
                          <div>
                            <p className="font-title-md text-on-surface font-bold group-hover:text-primary transition-colors">{name}</p>
                            <p className={`font-label-sm text-label-sm font-bold uppercase mt-0.5 ${loc.style === 'thunderstorm' ? 'text-tertiary-container' : 'text-green-300'}`}>
                              {loc.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right relative z-10 flex items-center gap-2">
                          <p className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-black">{loc.temp}</p>
                          <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary transition-colors">chevron_right</span>
                        </div>
                        {/* Dynamic decorative backdrop effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active River Stations */}
                <div className="col-span-1 md:col-span-2 space-y-4 mt-4">
                  <h3 className="font-title-md text-title-md text-primary-fixed-dim px-2 flex items-center gap-2 font-bold">
                    <span className="material-symbols-outlined text-primary">water_lux</span>
                    Hydro Sri Lanka Live Stations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {riverStations.map((station, idx) => (
                      <div 
                        key={idx}
                        onClick={() => { setSearchQuery(station.name.includes('Kelani') ? 'Colombo' : 'Kalutara'); handleSearch(station.name.includes('Kelani') ? 'Colombo' : 'Kalutara'); }}
                        className="group glass-pane rounded-xl p-4 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-all border border-white/5 hover:border-primary/30"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-2.5 rounded-lg border border-primary/10">
                            <span className="material-symbols-outlined text-primary text-xl">waves</span>
                          </div>
                          <div>
                            <p className="font-bold text-on-surface group-hover:text-primary transition-colors">{station.name}</p>
                            <p className={`font-label-sm text-label-sm font-bold uppercase mt-1 ${station.status === 'Normal' ? 'text-green-300' : 'text-tertiary-container animate-pulse'}`}>
                              {station.level} - {station.status}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`material-symbols-outlined text-[24px] ${station.status === 'Normal' ? 'text-on-surface-variant/60' : 'text-tertiary-container'}`}>
                            {station.trend}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Footer Stats */}
            <div className="border-t border-white/10 pt-6 flex flex-wrap justify-between items-center gap-4 text-on-surface-variant font-semibold text-xs tracking-wider">
              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="uppercase opacity-50 font-bold">Rainix Platform online</span>
                  <span className="text-primary font-extrabold mt-0.5">HYDRO-MET LOGICAL SHIELD ACTIVE</span>
                </div>
                <div className="flex flex-col">
                  <span className="uppercase opacity-50 font-bold">POWERED BY:</span>
                  <span className="text-on-surface font-extrabold mt-0.5">OPENWEATHER, RIVERNET, RAINVIEWER</span>
                </div>
              </div>
              <div className="text-on-surface-variant/40 font-mono text-[10px]">
                BUILD v1.8.2 // LATENCY: 34MS
              </div>
            </div>

          </div>
        </div>

        {/* Background Atmospheric Effect */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute bg-primary/5 rounded-full blur-3xl floating-particle"
              style={{
                width: particle.width,
                height: particle.height,
                left: particle.left,
                top: particle.top,
                animationDelay: particle.animationDelay,
                '--duration': particle.duration
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
