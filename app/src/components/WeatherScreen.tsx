import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Dimensions, ScrollView, Platform, Keyboard, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import * as Location from 'expo-location';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
  withRepeat,
  withDelay,
  withSpring,
  Easing,
  SharedValue,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 1. Rain Droplet Animation
function RainDrop({ left, duration, delay, scrollY }: { left: number; duration: number; delay: number; scrollY: SharedValue<number> }) {
  const translateY = useSharedValue(-40);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(SCREEN_HEIGHT + 40, { duration, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const dimFactor = interpolate(
      scrollY.value,
      [0, 250],
      [1.0, 0.4],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY: translateY.value }],
      opacity: dimFactor,
    };
  });

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        top: 0,
        width: 2.0,
        height: 22,
        backgroundColor: 'rgba(200, 230, 255, 0.35)',
        borderRadius: 3,
        left: `${left}%`,
        shadowColor: 'rgba(150, 200, 255, 0.2)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 1,
      }, animatedStyle]}
    />
  );
}

function RainEffect({ scrollY }: { scrollY: SharedValue<number> }) {
  const drops = useRef(Array.from({ length: 40 }).map(() => ({
    left: Math.random() * 100,
    duration: 600 + Math.random() * 400,
    delay: Math.random() * 1000,
  }))).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((drop, i) => (
        <RainDrop key={i} left={drop.left} duration={drop.duration} delay={drop.delay} scrollY={scrollY} />
      ))}
    </View>
  );
}

// 2. Snowflake Animation
function Snowflake({ left, initialY, speedMultiplier, progress, size, scrollY }: { left: number; initialY: number; speedMultiplier: number; progress: SharedValue<number>; size: number; scrollY: SharedValue<number> }) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(15, { duration: 1200 + Math.random() * 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const totalHeight = SCREEN_HEIGHT + 40;
    const y = (initialY + progress.value * speedMultiplier * totalHeight) % totalHeight - 20;
    const dimFactor = interpolate(
      scrollY.value,
      [0, 250],
      [1.0, 0.3],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateY: y },
        { translateX: translateX.value }
      ],
      opacity: dimFactor,
    };
  });

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        top: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        left: `${left}%`,
      }, animatedStyle]}
    />
  );
}

function SnowEffect({ scrollY }: { scrollY: SharedValue<number> }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const flakes = useRef(Array.from({ length: 20 }).map((_, i) => ({
    left: Math.random() * 100,
    initialY: Math.random() * (SCREEN_HEIGHT + 40),
    speedMultiplier: 0.7 + Math.random() * 0.6,
    size: 4 + Math.random() * 6,
  }))).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flakes.map((flake, i) => (
        <Snowflake key={i} left={flake.left} initialY={flake.initialY} speedMultiplier={flake.speedMultiplier} progress={progress} size={flake.size} scrollY={scrollY} />
      ))}
    </View>
  );
}

// 3. Twinkling Star Animation
function StarParticle({ left, top, duration, size, scrollY }: { left: number; top: number; duration: number; size: number; scrollY: SharedValue<number> }) {
  const opacity = useSharedValue(0.2 + Math.random() * 0.8);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.2, { duration }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const dimFactor = interpolate(
      scrollY.value,
      [0, 250],
      [1.0, 0.3],
      Extrapolation.CLAMP
    );
    return {
      opacity: opacity.value * dimFactor,
    };
  });

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'white',
        left: `${left}%`,
        top: `${top}%`,
      }, animatedStyle]}
    />
  );
}

function StarEffect({ scrollY }: { scrollY: SharedValue<number> }) {
  const stars = useRef(Array.from({ length: 25 }).map((_, i) => ({
    left: Math.random() * 100,
    top: Math.random() * 65,
    duration: 800 + Math.random() * 1800,
    size: 1 + Math.random() * 2,
  }))).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((star, i) => (
        <StarParticle key={i} left={star.left} top={star.top} duration={star.duration} size={star.size} scrollY={scrollY} />
      ))}
    </View>
  );
}

// 4. Lightning Flash Animation
function LightningEffect({ scrollY }: { scrollY: SharedValue<number> }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    let isRunning = true;
    
    const triggerFlash = () => {
      if (!isRunning) return;
      
      opacity.value = withTiming(0.6, { duration: 50 }, () => {
        opacity.value = withTiming(0, { duration: 150 }, () => {
          if (Math.random() > 0.4) {
            opacity.value = withTiming(0.4, { duration: 50 }, () => {
              opacity.value = withTiming(0, { duration: 200 });
            });
          }
        });
      });

      const nextTime = 4000 + Math.random() * 6000;
      setTimeout(triggerFlash, nextTime);
    };

    triggerFlash();

    return () => {
      isRunning = false;
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const dimFactor = interpolate(
      scrollY.value,
      [0, 250],
      [1.0, 0.2],
      Extrapolation.CLAMP
    );
    return {
      opacity: opacity.value * dimFactor,
    };
  });

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 40,
      }, animatedStyle]}
      pointerEvents="none"
    />
  );
}

// 5. Floating Cloud Animation
function FloatingCloud({ initialX, speedMultiplier, progress, top, scale, opacity, tintColor, scrollY }: { initialX: number; speedMultiplier: number; progress: SharedValue<number>; top: number; scale: number; opacity: number; tintColor?: string; scrollY: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    const totalWidth = SCREEN_WIDTH + 400;
    const x = (initialX + progress.value * speedMultiplier * totalWidth) % totalWidth - 300;
    const dimFactor = interpolate(
      scrollY.value,
      [0, 250],
      [1.0, 0.2],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: x },
        { scale }
      ],
      opacity: opacity * dimFactor,
    };
  });

  return (
    <Animated.Image
      source={require('../assets/images/cloud.png')}
      style={[{
        position: 'absolute',
        width: 300,
        height: 150,
        top: `${top}%`,
        opacity,
        resizeMode: 'contain',
        tintColor,
      }, animatedStyle]}
    />
  );
}

function CloudEffect({ count, tintColor, scrollY }: { count: number; tintColor?: string; scrollY: SharedValue<number> }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 60000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const clouds = useRef(Array.from({ length: count }).map((_, i) => ({
    initialX: Math.random() * (SCREEN_WIDTH + 400),
    speedMultiplier: 0.8 + Math.random() * 0.4,
    top: 5 + Math.random() * 40,
    scale: 0.8 + Math.random() * 0.8,
    opacity: 0.2 + Math.random() * 0.3,
  }))).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {clouds.map((cloud, i) => (
        <FloatingCloud key={i} initialX={cloud.initialX} speedMultiplier={cloud.speedMultiplier} progress={progress} top={cloud.top} scale={cloud.scale} opacity={cloud.opacity} tintColor={tintColor} scrollY={scrollY} />
      ))}
    </View>
  );
}

const { width, height } = Dimensions.get('window');

import HourlyForecast from '../components/HourlyForecast';
import DailyForecast from '../components/DailyForecast';
import WeatherMetricsRow from '../components/WeatherMetricsRow';
import RiverGaugeChart from '../components/RiverGaugeChart';
import SunMoonCards from '../components/SunMoonCards';
import MapWrapper from '../components/MapWrapper';
import DynamicIsland from '../components/DynamicIsland';
import PromptInputBasic from '../components/PromptInputBasic';

interface WeatherScreenProps {
  city?: string;
  lat?: string;
  lon?: string;
  isGps?: boolean;
  isActive?: boolean;
}

export default function WeatherScreen({ city, lat, lon, isGps, isActive = true }: WeatherScreenProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [cityData, setCityData] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [orbitProgress, setOrbitProgress] = useState(0.5);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [hasGps, setHasGps] = useState(false);

  useEffect(() => {
    const loadFooterData = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setHasGps(status === 'granted');
        
        const savedFavs = await AsyncStorage.getItem('rainix_favorites');
        if (savedFavs) {
          setFavorites(JSON.parse(savedFavs));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadFooterData();
  }, [city, isGps]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    const fetchLocationData = async () => {
      let targetCity = city ? String(city).trim() : null;
      let targetLat = lat;
      let targetLon = lon;

      if (!targetCity && !targetLat && !targetLon && isGps) {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setErrorMsg('Permission to access location was denied');
            setIsLoading(false);
            return;
          }
          let location = await Location.getCurrentPositionAsync({});
          targetLat = location.coords.latitude.toString();
          targetLon = location.coords.longitude.toString();
          targetCity = "My Location";
        } catch (error) {
          console.error("Location error:", error);
          setErrorMsg('Failed to get location');
          setIsLoading(false);
          return;
        }
      } else if (!targetCity && !targetLat && !targetLon) {
        targetCity = 'Ratnapura';
      }

      fetchData(targetCity, targetLat, targetLon);
    };

    fetchLocationData();
  }, [city, lat, lon]);

  const fetchData = async (cityQuery: string | null, targetLat: any, targetLon: any) => {
    let resolvedCity = cityQuery || 'My Location';
    const cacheKey = `rainix_cache_${isGps ? 'gps' : resolvedCity}`;

    // Try to load cached data first for immediate display
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setCityData(parsed);
        calculateOrbit(parsed.weather?.weather);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    } catch (e) {
      setIsLoading(true);
    }

    setErrorMsg('');
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
      if (targetLat && targetLon) {
        url += `&lat=${targetLat}&lon=${targetLon}`;
      }
      
      const res = await fetch(url);
      const result = await res.json();
      
      if (result.success && result.data) {
        setCityData(result.data);
        saveToRecentSearches(result.data);
        calculateOrbit(result.data.weather?.weather);
        setIsLoading(false);
        // Save to cache
        AsyncStorage.setItem(cacheKey, JSON.stringify(result.data)).catch(() => {});
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

  const saveToRecentSearches = async (data: any) => {
    try {
      const locationName = `${data.weather.city}, ${data.weather.country}`;
      const coordsText = `${data.weather.coordinates.latitude.toFixed(4)}° N, ${data.weather.coordinates.longitude.toFixed(4)}° E`;
      const newSearchItem = { name: locationName, query: data.city, coords: coordsText };
      
      const saved = await AsyncStorage.getItem('rainix_recent_searches');
      let recent = saved ? JSON.parse(saved) : [];
      const filtered = recent.filter((item: any) => item.query.toLowerCase() !== data.city.toLowerCase());
      const updated = [newSearchItem, ...filtered].slice(0, 5);
      await AsyncStorage.setItem('rainix_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const parseTimeToMinutes = (timeStr: string) => {
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

  const calculateOrbit = (weather: any) => {
    if (!weather) return;
    const t_curr = parseTimeToMinutes(weather.time);
    const t_sunrise = parseTimeToMinutes(weather.sunrise) || 351;
    const t_sunset = parseTimeToMinutes(weather.sunset) || 1098;
    const isNightNow = t_curr < t_sunrise || t_curr > t_sunset;
    setIsNight(isNightNow);
    
    let progress = 0.5;
    if (!isNightNow) {
      const dayDuration = t_sunset - t_sunrise;
      progress = dayDuration > 0 ? (t_curr - t_sunrise) / dayDuration : 0.5;
    } else {
      const nightDuration = (1440 - t_sunset) + t_sunrise;
      const elapsed = t_curr > t_sunset ? (t_curr - t_sunset) : ((1440 - t_sunset) + t_curr);
      progress = nightDuration > 0 ? elapsed / nightDuration : 0.5;
    }
    setOrbitProgress(Math.max(0, Math.min(1, progress)));
  };

  const determineWeatherState = () => {
    if (!cityData?.weather?.weather) return 'sunny';
    const code = cityData?.weather?.weather?.weatherCode;
    if (code === 0) return isNight ? 'clear_night' : 'sunny';
    if (code >= 1 && code <= 3) return isNight ? 'partly_cloudy_night' : 'partly_cloudy_day';
    if (code === 45 || code === 48) return 'cloudy';
    if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
    if (code >= 95) return 'thunderstorm';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    return 'cloudy';
  };

  const weatherState = determineWeatherState();

  const celestialScale = useSharedValue(0);

  useEffect(() => {
    celestialScale.value = 0;
    celestialScale.value = withSpring(1, { damping: 12, stiffness: 100 });
  }, [isNight, weatherState]);

  const celestialAnimatedStyle = useAnimatedStyle(() => {
    const dimFactor = interpolate(
      scrollY.value,
      [0, 250],
      [1.0, 0.25],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: -75 },
        { translateY: -75 },
        { scale: celestialScale.value }
      ],
      opacity: 0.8 * dimFactor,
    };
  });

  const getBackgroundGradient = (state: string) => {
    if (['sunny', 'partly_cloudy_day', 'clear_night', 'partly_cloudy_night'].includes(state)) {
      if (!isNight) {
        if (orbitProgress < 0.15) return ['#3B5998', '#8B6B7B', '#E89A7E'];
        else if (orbitProgress > 0.85) return ['#2E3863', '#7B526F', '#D4806A'];
        else if (orbitProgress < 0.3) return ['#4477C5', '#7CB0E6'];
        else if (orbitProgress > 0.7) return ['#3763A8', '#85AEE0'];
        else return ['#2D68C4', '#68A0ED'];
      } else {
        if (orbitProgress < 0.1) return ['#161D3A', '#2A385E'];
        else if (orbitProgress > 0.9) return ['#101633', '#29385C'];
        else return ['#0A0F24', '#131A33'];
      }
    }
    switch (state) {
      case 'cloudy': return isNight ? ['#1E293B', '#334155'] : ['#334155', '#64748B'];
      case 'rainy': return ['#1E293B', '#334155'];
      case 'thunderstorm': return ['#0F172A', '#1E293B'];
      case 'snow': return isNight ? ['#334155', '#475569'] : ['#475569', '#94A3B8'];
      default: return ['#1E3A8A', '#3B82F6'];
    }
  };

  const formattedCity = city || cityData?.weather?.city || 'Your Location';
  const formattedCountry = cityData?.weather?.country || 'Sri Lanka';
  const currentTemp = cityData?.weather?.weather?.temperature ? Math.round(cityData?.weather?.weather?.temperature) : 31;
  const conditionLabel = weatherState.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const angle = Math.PI * (1 - orbitProgress);
  const celestialX = 50 + 40 * Math.cos(angle);
  const celestialY = 45 - 35 * Math.sin(angle);

  const getCloudCount = (state: string) => {
    if (['partly_cloudy_day', 'partly_cloudy_night'].includes(state)) return 8;
    if (['cloudy', 'snow'].includes(state)) return 15;
    if (['rainy', 'thunderstorm'].includes(state)) return 20;
    return 0;
  };
  const cloudCount = getCloudCount(weatherState);

  const getCloudTintColor = (state: string) => {
    if (['rainy', 'thunderstorm'].includes(state)) return '#475569';
    if (['cloudy', 'snow'].includes(state)) return '#cbd5e1';
    return '#ffffff';
  };
  const cloudTintColor = getCloudTintColor(weatherState);

  return (
    <View style={{ flex: 1, backgroundColor: 'black', overflow: 'hidden' }}>
        <LinearGradient colors={getBackgroundGradient(weatherState) as [string, string, ...string[]]} style={{ flex: 1 }}>
      {/* Background Weather Effects wrapped in absolute zIndex container */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
        {isActive && ['clear_night', 'partly_cloudy_night'].includes(weatherState) && <StarEffect scrollY={scrollY} />}
        {isActive && cloudCount > 0 && <CloudEffect count={cloudCount} tintColor={cloudTintColor} scrollY={scrollY} />}
        {isActive && ['rainy', 'thunderstorm'].includes(weatherState) && <RainEffect scrollY={scrollY} />}
        {isActive && weatherState === 'snow' && <SnowEffect scrollY={scrollY} />}
      </View>

      {/* Celestial Body (Sun/Moon) */}
      {cityData && !['cloudy', 'thunderstorm', 'rainy', 'snow'].includes(weatherState) && (
        <Animated.View 
          style={[{
            position: 'absolute',
            left: `${celestialX}%`,
            top: `${celestialY}%`,
            zIndex: 2,
          }, celestialAnimatedStyle]}
          pointerEvents="none"
        >
          {isNight ? (
            <Image 
              source={require('../assets/images/moon.png')} 
              style={{ width: 150, height: 150, opacity: 0.8 }} 
              contentFit="contain" 
            />
          ) : (
            <Image 
              source={require('../assets/images/sun.png')} 
              style={{ width: 150, height: 150, opacity: 0.8 }} 
              contentFit="contain" 
            />
          )}
        </Animated.View>
      )}

      {cityData && (
        <DynamicIsland 
          scrollY={scrollY}
          weather={cityData.weather}
          city={formattedCity}
          country={formattedCountry}
          temp={currentTemp}
          condition={conditionLabel}
          isGps={!!isGps}
        />
      )}

      <Animated.ScrollView 
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={{ zIndex: 10 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 140 }}
      >
        {isLoading ? (
          <View className="flex-1 justify-center items-center mt-20">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text className="text-white mt-4">Loading weather data...</Text>
          </View>
        ) : errorMsg ? (
          <View className="flex-1 justify-center items-center mt-20 bg-white/10 p-6 rounded-3xl border border-white/20">
             <MaterialIcons name="error-outline" size={48} color="#fca5a5" />
             <Text className="text-xl font-bold text-white mt-4">Connection Error</Text>
             <Text className="text-white/80 mt-2 text-center">{errorMsg}</Text>
             <TouchableOpacity 
               onPress={() => fetchData(city as string, lat, lon)}
               className="mt-6 px-6 py-2 bg-white/20 rounded-full"
             >
               <Text className="text-white font-medium">Retry</Text>
             </TouchableOpacity>
          </View>
        ) : cityData && (
          <View className="items-center pt-4">
            
            <Text className="text-7xl font-light text-white my-2">{currentTemp}°</Text>
            
            <Text className="text-xl text-white mt-2">{conditionLabel}</Text>
            
            <View className="flex-row flex-wrap justify-center items-center mt-3 mb-6">
              <View className="flex-row items-center mx-2 my-1"><MaterialIcons name="arrow-upward" size={16} color="white" /><Text className="text-white ml-1">{Math.round(cityData?.weather?.weather?.high || currentTemp + 6)}°C</Text></View>
              <View className="flex-row items-center mx-2 my-1"><MaterialIcons name="arrow-downward" size={16} color="white" /><Text className="text-white ml-1">{Math.round(cityData?.weather?.weather?.low || currentTemp - 2)}°C</Text></View>
              <View className="flex-row items-center mx-2 my-1"><MaterialIcons name="water-drop" size={16} color="white" /><Text className="text-white ml-1">{cityData?.weather?.weather?.precipitationProbability || 0}%</Text></View>
              <View className="flex-row items-center mx-2 my-1"><MaterialIcons name="wb-twilight" size={16} color="white" /><Text className="text-white ml-1">{cityData?.weather?.weather?.humidity || 0}%</Text></View>
            </View>

            <PromptInputBasic />

            <HourlyForecast hourlyData={cityData?.weather?.hourly || cityData?.weather?.weather?.hourly} />
            <DailyForecast dailyData={cityData?.weather?.forecast14Days || cityData?.weather?.weather?.forecast14Days} />
            
            {/* We passed cityData?.weather to these, which has .weather inside it, so it worked, but let's pass cityData?.weather.weather directly to be safe if that's what they expect */}
            <WeatherMetricsRow weather={cityData?.weather} />
            <SunMoonCards weather={cityData?.weather} />
            
            {cityData?.rivers && cityData.rivers.length > 0 && (
              <RiverGaugeChart activeRiver={cityData.rivers[0]} />
            )}

            <MapWrapper 
              coordinates={cityData?.weather?.coordinates} 
              radarUrl={cityData?.radar?.tileUrl} 
            />

          </View>
        )}
      </Animated.ScrollView>

      {/* Bottom Fade Overlay instead of navbar */}
        <LinearGradient 
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']} 
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, zIndex: 100 }} 
          pointerEvents="none" 
        />
      </LinearGradient>
    </View>
  );
}
