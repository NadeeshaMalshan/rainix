import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Line, Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, Extrapolation, interpolate, useAnimatedScrollHandler } from 'react-native-reanimated';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import DynamicIsland from './DynamicIsland';
import PromptInputBasic from './PromptInputBasic';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Removed WaterDropEffect as requested

// --- Main River Screen ---
interface RiverScreenProps {
  query?: string;
  lat?: string;
  lon?: string;
}

export default function RiverScreen({ query, lat, lon }: RiverScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [cityData, setCityData] = useState<any>(null);
  const [selectedRiverIdx, setSelectedRiverIdx] = useState(0);
  const [showStationsDropdown, setShowStationsDropdown] = useState(false);
  const [hasGps, setHasGps] = useState(false);
  const [stationWeather, setStationWeather] = useState<any>(null);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      setHasGps(status === 'granted');
    });
  }, []);

  useEffect(() => {
    const fetchLocationData = async () => {
      let targetCity = query ? String(query).trim().replace(/-/g, ' ') : null;
      let targetLat = lat;
      let targetLon = lon;
      if (!targetCity && !targetLat && !targetLon) targetCity = 'Ratnapura';
      fetchData(targetCity, targetLat, targetLon);
    };
    fetchLocationData();
  }, [query, lat, lon]);

  const fetchData = async (cityQuery: string | null, targetLat: any, targetLon: any) => {
    let resolvedCity = cityQuery || 'My Location';
    const cacheKey = `rainix_river_cache_${resolvedCity}`;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setCityData(JSON.parse(cached));
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    } catch (e) { setIsLoading(true); }

    try {
      let nodeApiUrl = process.env.EXPO_PUBLIC_NODE_API_URL || "http://10.0.2.2:5000";
      if (!process.env.EXPO_PUBLIC_NODE_API_URL && Constants.appOwnership === 'expo') {
        const hostUri = Constants.experienceUrl;
        if (hostUri) {
          try {
            const parsedUri = new URL(hostUri);
            if (parsedUri.hostname) {
              nodeApiUrl = `http://${parsedUri.hostname}:5000`;
            }
          } catch (e) {
            if (hostUri.includes(':')) {
              nodeApiUrl = `http://${hostUri.split(':')[0]}:5000`;
            }
          }
        }
      }
      
      let url = `${nodeApiUrl}/api/city/${encodeURIComponent(resolvedCity)}?full=true`;
      if (targetLat && targetLon) url += `&lat=${targetLat}&lon=${targetLon}`;
      
      const res = await fetch(url);
      const result = await res.json();
      
      if (result.success && result.data) {
        setCityData(result.data);
        setIsLoading(false);
        AsyncStorage.setItem(cacheKey, JSON.stringify(result.data)).catch(() => {});
      } else if (!cityData) {
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      if (!cityData) setIsLoading(false);
    }
  };

  const weather = cityData?.weather?.weather;
  const rivers = cityData?.rivers || [];
  const activeRiver = rivers.length > 0 ? (rivers[selectedRiverIdx] || rivers[0]) : null;

  useEffect(() => {
    if (activeRiver?.lat && activeRiver?.lon) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${activeRiver.lat}&longitude=${activeRiver.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`)
        .then(res => res.json())
        .then(data => {
          if (data.current) setStationWeather(data.current);
        })
        .catch(() => {});
    }
  }, [activeRiver?.lat, activeRiver?.lon]);

  const formattedCity = activeRiver ? activeRiver.name : (cityData?.weather?.city || query?.replace(/-/g, ' ') || 'Unknown');
  const formattedCountry = activeRiver ? (activeRiver.basin ? `${activeRiver.basin} Basin` : (cityData?.weather?.city || '')) : (cityData?.weather?.country || 'Sri Lanka');
  const formattedRiverName = activeRiver ? (activeRiver.originalName || activeRiver.river || activeRiver.basin || activeRiver.name) : formattedCity;

  const alertVal = activeRiver?.alertLevels?.find((x: any) => x.name === 'alert')?.value || activeRiver?.levels?.alert || '--';
  const minorVal = activeRiver?.alertLevels?.find((x: any) => x.name === 'minor')?.value || activeRiver?.levels?.minor || '--';
  const majorVal = activeRiver?.alertLevels?.find((x: any) => x.name === 'major')?.value || activeRiver?.levels?.major || '--';

  let currentRiverLevel: string | number = '--';
  if (activeRiver) {
    if (activeRiver.currentLevel !== null && activeRiver.currentLevel !== undefined) {
      currentRiverLevel = activeRiver.currentLevel;
    } else {
      const chartArr = activeRiver.chart || activeRiver.historicalData;
      if (chartArr && chartArr.length > 0) {
        const lastPoint = chartArr[chartArr.length - 1];
        if (lastPoint && lastPoint.y !== null && lastPoint.y !== undefined) currentRiverLevel = lastPoint.y;
        else if (lastPoint && lastPoint.value !== null && lastPoint.value !== undefined) currentRiverLevel = lastPoint.value;
      }
    }
  }

  const riverState = (() => {
    if (currentRiverLevel === '--') return 'normal';
    const lvl = parseFloat(String(currentRiverLevel));
    if (!isNaN(parseFloat(String(majorVal))) && lvl >= parseFloat(String(majorVal))) return 'major_flood';
    if (!isNaN(parseFloat(String(minorVal))) && lvl >= parseFloat(String(minorVal))) return 'minor_flood';
    if (!isNaN(parseFloat(String(alertVal))) && lvl >= parseFloat(String(alertVal))) return 'alert';
    return 'normal';
  })();

  const getBackgroundGradient = (state: string) => {
    switch (state) {
      case 'major_flood': return ['#4A0E17', '#8A2332']; 
      case 'minor_flood': return ['#5C2A12', '#A25025']; 
      case 'alert': return ['#0F304A', '#295F8A'];       
      case 'normal': default: return ['#071F36', '#10416A']; 
    }
  };

  let minRiverLevel = '--';
  let maxRiverLevel = '--';
  let chartData: any[] = [];
  if (activeRiver) {
    const chartArr = activeRiver.chart || activeRiver.historicalData;
    if (chartArr && chartArr.length > 0) {
      chartData = chartArr.filter((d: any) => (d.y !== null && d.y !== undefined) || (d.value !== null && d.value !== undefined));
      if (chartData.length > 0) {
        const values = chartData.map((d: any) => d.y !== undefined ? d.y : d.value);
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
    const currentNum = parseFloat(String(currentRiverLevel));
    const prevNum = parseFloat(String(previousRiverLevel));
    if (!isNaN(currentNum) && !isNaN(prevNum)) {
      if (currentNum > prevNum) { trendIcon = 'arrow-up-right'; trendColor = '#ef4444'; } 
      else if (currentNum < prevNum) { trendIcon = 'arrow-down-right'; trendColor = '#10b981'; }
    }
  }

  // --- SVG Chart Calculation ---
  const chartHeight = 160;
  const chartWidth = SCREEN_WIDTH - 64; 
  let pathD = '', areaD = '';
  let activePoints: any[] = [];
  let yMaxChart = 10, yMinChart = 0;

  if (chartData.length > 0) {
    const values = chartData.map(d => d.y !== undefined ? d.y : d.value);
    const times = chartData.map(d => {
      if (d.x !== undefined) return typeof d.x === 'string' ? new Date(d.x).getTime() : d.x;
      return new Date(d.time).getTime();
    });
    
    const thresholds = [
      activeRiver?.alertLevels?.find((x: any) => x.name === 'major')?.value || activeRiver?.levels?.major || 0,
      activeRiver?.alertLevels?.find((x: any) => x.name === 'minor')?.value || activeRiver?.levels?.minor || 0,
      activeRiver?.alertLevels?.find((x: any) => x.name === 'alert')?.value || activeRiver?.levels?.alert || 0,
    ].filter(v => parseFloat(v) > 0).map(v => parseFloat(v));
    
    yMaxChart = Math.ceil(Math.max(12, Math.max(...values) * 1.1, ...thresholds) / 2) * 2;
    yMinChart = 0;

    const minT = Math.min(...times), maxT = Math.max(...times);
    
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
        const prev = activePoints[i - 1], curr = activePoints[i];
        const cp1x = prev.x + (curr.x - prev.x) / 2, cp1y = prev.y;
        const cp2x = curr.x - (curr.x - prev.x) / 2, cp2y = curr.y;
        pathD += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y} `;
      }
      areaD = `${pathD} L ${activePoints[activePoints.length - 1].x} ${chartHeight} L ${activePoints[0].x} ${chartHeight} Z`;
    }
  }

  const getYPosForValue = (val: any) => {
    if (val === '--' || isNaN(parseFloat(val))) return null;
    const v = parseFloat(val);
    if (v > yMaxChart || v < yMinChart) return null;
    return chartHeight - (((v - yMinChart) / (yMaxChart - yMinChart)) * chartHeight);
  };

  const precipitation = weather?.precipitationProbability || 0;

  if (isLoading && !cityData) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white/70 mt-4">Loading river data...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black', overflow: 'hidden' }}>
      <LinearGradient colors={getBackgroundGradient(riverState) as [string, string]} style={{ flex: 1 }}>

        <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }} style={{ zIndex: 10 }}>
          <View style={{ height: 110 }} />

          <View className="px-6 flex-1 items-center pb-8">
            {/* River Header */}
            <View className="relative z-50 w-full items-center">
              <TouchableOpacity onPress={() => { if (rivers.length > 1) setShowStationsDropdown(!showStationsDropdown); }} activeOpacity={0.8} className="flex-row items-center justify-center mb-1">
                <Text style={{ color: 'white', fontSize: 28, fontWeight: '600', textAlign: 'center' }}>{formattedCity}</Text>
                {rivers.length > 1 && <Feather name={showStationsDropdown ? "chevron-up" : "chevron-down"} size={24} color="rgba(255,255,255,0.8)" style={{ marginLeft: 4 }} />}
              </TouchableOpacity>
              
              {/* Floating Station Dropdown */}
              {showStationsDropdown && rivers.length > 1 && (
                <View className="absolute top-full mt-2 w-full max-w-[250px] bg-[#1c1c1e] rounded-2xl shadow-2xl overflow-hidden border border-white/20 z-50 py-2">
                  <Text className="text-[10px] uppercase font-semibold text-white/50 px-4 py-2 border-b border-white/10 tracking-wider">Select Station</Text>
                  <ScrollView style={{ maxHeight: 200 }}>
                    {rivers.map((r: any, idx: number) => (
                      <TouchableOpacity key={idx} onPress={() => { setSelectedRiverIdx(idx); setShowStationsDropdown(false); }} className={`px-4 py-3 flex-row justify-between items-center ${idx === selectedRiverIdx ? 'bg-white/10' : ''}`}>
                        <Text className="text-white font-medium text-sm">{r.name}</Text>
                        {idx === selectedRiverIdx && <Feather name="check" size={16} color="white" />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <Text className="text-white/70 text-base mb-8">{formattedCountry}</Text>

            {/* Current Level */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 32 }}>
              <Text style={{ fontSize: 96, fontWeight: '300', color: 'white', lineHeight: 100 }}>{currentRiverLevel}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingBottom: 12 }}>
                <Text style={{ fontSize: 36, color: 'rgba(255,255,255,0.8)' }}>{currentRiverLevel !== '--' ? 'm' : ''}</Text>
                {trendIcon && currentRiverLevel !== '--' && <Feather name={trendIcon as any} size={32} color={trendColor} style={{ marginLeft: 6 }} />}
              </View>
            </View>

            {/* 24-Hour Trend Card */}
            <View style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 24, marginTop: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', zIndex: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' }}>24-Hour River Level Trend</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="arrow-upward" size={14} color="white" />
                    <Text style={{ color: 'white', fontSize: 12 }}>{maxRiverLevel}m</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="arrow-downward" size={14} color="white" />
                    <Text style={{ color: 'white', fontSize: 12 }}>{minRiverLevel}m</Text>
                  </View>
                </View>
              </View>

              <View style={{ height: chartHeight, width: '100%', position: 'relative', marginBottom: 20 }}>
                {/* Y-Axis Labels */}
                <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, flexDirection: 'column', justifyContent: 'space-between', zIndex: 10, pointerEvents: 'none', paddingBottom: 8 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Text key={i} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600' }}>{((yMaxChart - yMinChart) - i * ((yMaxChart - yMinChart)/3)).toFixed(0)}m</Text>
                  ))}
                </View>

                <Svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ marginLeft: 0 }}>
                  <Defs>
                    <SvgLinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#3A82F6" stopOpacity="0.4" />
                      <Stop offset="100%" stopColor="#3A82F6" stopOpacity="0.0" />
                    </SvgLinearGradient>
                  </Defs>
                  {getYPosForValue(majorVal) !== null && <Line x1="0" y1={getYPosForValue(majorVal)!} x2={chartWidth} y2={getYPosForValue(majorVal)!} stroke="rgba(239,68,68,0.4)" strokeWidth="1" strokeDasharray="4,4" />}
                  {getYPosForValue(minorVal) !== null && <Line x1="0" y1={getYPosForValue(minorVal)!} x2={chartWidth} y2={getYPosForValue(minorVal)!} stroke="rgba(245,158,11,0.4)" strokeWidth="1" strokeDasharray="4,4" />}
                  {getYPosForValue(alertVal) !== null && <Line x1="0" y1={getYPosForValue(alertVal)!} x2={chartWidth} y2={getYPosForValue(alertVal)!} stroke="rgba(59,130,246,0.4)" strokeWidth="1" strokeDasharray="4,4" />}
                  {areaD && <Path d={areaD} fill="url(#areaGradient)" />}
                  {pathD && <Path d={pathD} fill="none" stroke="#60A5FA" strokeWidth="3" />}
                  {activePoints.map((p, i) => (
                    <Circle key={i} cx={p.x} cy={p.y} r={i === activePoints.length - 1 ? 4 : 2} fill="#fff" opacity={i === activePoints.length - 1 ? 1 : 0.4} />
                  ))}
                </Svg>

                {/* Threshold Labels */}
                {getYPosForValue(majorVal) !== null && <Text className="absolute right-0 text-red-400/80 text-[9px] font-bold" style={{ top: getYPosForValue(majorVal)! - 14 }}>MAJOR ({majorVal}m)</Text>}
                {getYPosForValue(minorVal) !== null && <Text className="absolute right-0 text-orange-400/80 text-[9px] font-bold" style={{ top: getYPosForValue(minorVal)! - 14 }}>MINOR ({minorVal}m)</Text>}
                {getYPosForValue(alertVal) !== null && <Text className="absolute right-0 text-blue-400/80 text-[9px] font-bold" style={{ top: getYPosForValue(alertVal)! - 14 }}>ALERT ({alertVal}m)</Text>}

                {/* X-Axis Labels */}
                <View style={{ position: 'absolute', bottom: -24, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
                  {[0, 1, 2, 3, 4].map(i => {
                    if (!activePoints.length) return <Text key={i} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' }}>--:--</Text>;
                    const minT = activePoints[0].time, maxT = activePoints[activePoints.length - 1].time;
                    const d = new Date(minT + (maxT - minT) * (i / 4));
                    if (i === 4 && Math.abs(Date.now() - maxT) < 3600000) return <Text key={i} style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>NOW</Text>;
                    return <Text key={i} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' }}>{d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>;
                  })}
                </View>
              </View>
            </View>

            {/* Station Weather Card */}
            {activeRiver && (
              <View style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 20, marginTop: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text className="text-white/60 text-xs uppercase font-semibold mb-1">Station Weather</Text>
                  <Text className="text-white text-lg font-medium">{activeRiver.name} Station</Text>
                  <Text className="text-white/40 text-[10px] mt-1">{activeRiver.lat?.toFixed(4)}° N, {activeRiver.lon?.toFixed(4)}° E</Text>
                </View>
                <View className="items-end">
                  {stationWeather?.temperature_2m !== undefined && <Text className="text-white text-3xl font-light">{stationWeather.temperature_2m}°</Text>}
                  <View className="flex-row items-center mt-1">
                    <Feather name="wind" size={12} color="rgba(255,255,255,0.6)" />
                    <Text className="text-white/60 text-xs ml-1 mr-3">{stationWeather?.wind_speed_10m ?? '--'} km/h</Text>
                    <Feather name="droplet" size={12} color="rgba(255,255,255,0.6)" />
                    <Text className="text-white/60 text-xs ml-1">{stationWeather?.relative_humidity_2m ?? '--'}%</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Stations Map */}
            {activeRiver && activeRiver.lat && activeRiver.lon ? (
              <View style={{ width: '100%', height: 220, borderRadius: 24, marginTop: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', backgroundColor: '#1c1c1e' }}>
                <MapView
                  provider={PROVIDER_DEFAULT}
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={{
                    latitude: activeRiver.lat,
                    longitude: activeRiver.lon,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                  }}
                  region={{
                    latitude: activeRiver.lat,
                    longitude: activeRiver.lon,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                  }}
                  userInterfaceStyle="dark"
                >
                  {rivers.map((r: any, idx: number) => (
                    r.lat && r.lon ? (
                      <Marker
                        key={idx}
                        coordinate={{ latitude: r.lat, longitude: r.lon }}
                        title={r.name}
                        description={`${r.currentLevel || '--'}m`}
                        pinColor={idx === selectedRiverIdx ? '#3b82f6' : '#9ca3af'}
                        onPress={() => setSelectedRiverIdx(idx)}
                      />
                    ) : null
                  ))}
                </MapView>
                <View className="absolute top-3 left-3 bg-black/60 px-3 py-1.5 rounded-full border border-white/20">
                  <Text className="text-white text-xs font-semibold">Station Locations</Text>
                </View>
              </View>
            ) : null}

            {/* AI Prompt */}
            <View className="w-full mt-10">
              <PromptInputBasic />
            </View>

          </View>
        </Animated.ScrollView>
      </LinearGradient>
      
      {/* Dynamic Island Top Nav */}
      <DynamicIsland 
        scrollY={scrollY} 
        weather={weather} 
        city={formattedRiverName} 
        country={formattedCountry} 
        temp={weather?.temperature} 
        condition={weather?.weatherCode} 
        isGps={query === undefined && lat === undefined} 
        isRiver={true}
        stationName={formattedCity}
        riverLevel={currentRiverLevel}
        riverStatus={activeRiver?.status}
      />
    </View>
  );
}
