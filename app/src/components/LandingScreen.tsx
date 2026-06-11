import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Dimensions, Platform, Keyboard, StyleSheet, ScrollView, PlatformColor } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence, withDelay, runOnJS, withSpring } from 'react-native-reanimated';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// --- Reusable Animated Components ---

const Star = ({ top, left, size, delay, duration }: any) => {
  const opacity = useSharedValue(0.2);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(withTiming(1, { duration: duration / 2 }), withTiming(0.2, { duration: duration / 2 })),
        -1, true
      );
      scale.value = withRepeat(
        withSequence(withTiming(1.2, { duration: duration / 2 }), withTiming(0.8, { duration: duration / 2 })),
        -1, true
      );
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', top, left, width: size, height: size, backgroundColor: 'white', borderRadius: size / 2 },
        animatedStyle
      ]}
    />
  );
};

const Cloud = ({ top, width: cloudWidth, height: cloudHeight, duration, delay, isNight }: any) => {
  const translateX = useSharedValue(-cloudWidth * 2);

  useEffect(() => {
    setTimeout(() => {
      translateX.value = withRepeat(
        withTiming(width + cloudWidth, { duration, easing: Easing.linear }),
        -1, false
      );
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  return (
    <Animated.View style={[{ position: 'absolute', top, opacity: isNight ? 0.2 : 0.4 }, animatedStyle]}>
      <Image
        source={require('../assets/images/cloud.png')}
        style={{ width: cloudWidth, height: cloudHeight, tintColor: 'white' }}
        contentFit="contain"
      />
    </Animated.View>
  );
};

const Bird = ({ top, delay, duration, scale }: any) => {
  const translateX = useSharedValue(-100);
  const translateY = useSharedValue(top);
  const scaleY = useSharedValue(1);

  useEffect(() => {
    setTimeout(() => {
      translateX.value = withRepeat(
        withTiming(width + 100, { duration, easing: Easing.linear }),
        -1, false
      );
      translateY.value = withRepeat(
        withSequence(withTiming(top - 40, { duration: duration / 2 }), withTiming(top + 20, { duration: duration / 2 })),
        -1, true
      );
      scaleY.value = withRepeat(
        withSequence(withTiming(-0.4, { duration: 350 }), withTiming(1, { duration: 350 })),
        -1, true
      );
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale },
      { scaleY: scaleY.value }
    ]
  }));

  return (
    <Animated.View style={[{ position: 'absolute', opacity: 0.7 }, animatedStyle]}>
      <Svg width="24" height="16" viewBox="0 0 24 16">
        <Path fill="#0F172A" d="M 2.1,3.5 C 5.1,1.5 9,0 12,2 C 15,0 18.9,1.5 21.9,3.5 C 22.8,4.1 21.5,5.1 20.3,5.1 C 17,5.1 13.5,7 12,12 C 10.5,7 7,5.1 3.7,5.1 C 2.5,5.1 1.2,4.1 2.1,3.5 Z" />
      </Svg>
    </Animated.View>
  );
};

export default function LandingScreen({  pages,
  scrollToPage,
  favorites,
  setFavorites
}: any) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNight, setIsNight] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [pageWeathers, setPageWeathers] = useState<Record<string, any>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const safePages = pages || [{ type: 'landing', id: 'landing' }];  useEffect(() => {
    const loadWeathers = async () => {
      if (!pages) return;
      const weathers: Record<string, any> = {};
      for (const p of pages) {
        if (p.type === 'landing') continue;
        
        let cacheKey = '';
        if (p.type === 'gps') cacheKey = 'rainix_cache_gps';
        else if (p.type === 'fav') cacheKey = p.isRiver ? `rainix_river_cache_${p.name}` : `rainix_cache_${p.name}`;
        
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            weathers[p.id] = JSON.parse(cached);
          }
        } catch (e) {}
      }
      setPageWeathers(weathers);
    };
    loadWeathers();
  }, [pages]);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTimeInMinutes = hours * 60 + minutes;
      const dayStart = 6 * 60; // 6:00 AM
      const dayEnd = 18 * 60 + 30; // 6:30 PM
      setIsNight(!(currentTimeInMinutes >= dayStart && currentTimeInMinutes < dayEnd));
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);

    const loadRecent = async () => {
      try {
        const saved = await AsyncStorage.getItem('rainix_recent_searches');
        if (saved) {
          setRecentSearches(JSON.parse(saved));
        } else {
          const defaults = [
            { name: 'Seattle, WA', query: 'Seattle', coords: '47.6062° N, 122.3321° W' },
            { name: 'Colombo, LK', query: 'Colombo', coords: '6.9271° N, 79.8612° E' }
          ];
          setRecentSearches(defaults);
          await AsyncStorage.setItem('rainix_recent_searches', JSON.stringify(defaults));
        }
      } catch (e) {}
    };
    loadRecent();

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery && searchQuery.trim().length >= 2) {
        try {
          let nodeApiUrl = process.env.EXPO_PUBLIC_NODE_API_URL || "http://10.0.2.2:5000";
          
          const q = encodeURIComponent(searchQuery.trim());
          const [geoRes, riverRes] = await Promise.all([
            fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=15`).catch(() => null),
            fetch(`${nodeApiUrl}/api/rivers/search?q=${q}`).catch(() => null)
          ]);
          
          const geoData = geoRes ? await geoRes.json() : null;
          const riverData = riverRes ? await riverRes.json() : null;
          
          let combined: any[] = [];
          
          if (riverData && riverData.success && riverData.data) {
            const riverResults = riverData.data.map((r: any) => ({
              id: r.id || r.name,
              name: r.name,
              admin1: r.basin ? `${r.basin} Basin` : 'River',
              country: 'Sri Lanka',
              isRiver: true
            }));
            combined = [...combined, ...riverResults];
          }
          
          if (geoData && geoData.results) {
             combined = [...combined, ...geoData.results];
          }
          
          if (combined.length > 0) {
            setSuggestions(combined.slice(0, 8));
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        } catch (err) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearchSubmit = async (query: string, isRiver = false) => {
    if (!query || query.trim() === '') return;
    const trimmed = query.trim();
    setShowSuggestions(false);
    Keyboard.dismiss();
    setIsSearchMode(false);
    
    const riverKeywords = ['ganga', 'oya', 'river'];
    const isRiverQuery = isRiver || riverKeywords.some(kw => trimmed.toLowerCase().includes(kw));

    if (isRiverQuery) {
      router.push(`/river?query=${encodeURIComponent(trimmed.toLowerCase().replace(/\s+/g, '-'))}`);
    } else {
      router.push(`/weather?city=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleGpsClick = () => {
    router.push(`/weather?gps=true`);
  };

  const getWeatherIcon = (codeVal: any, timeStr: string) => {
    const code = Number(codeVal);
    let isNight = false;
    if (timeStr) {
      const hours = new Date(timeStr).getHours();
      isNight = hours >= 19 || hours <= 6;
    }
    
    if (code === 0) return isNight ? 'moon' : 'sun';
    if (code >= 1 && code <= 3) return 'cloud';
    if (code === 45 || code === 48) return 'cloud';
    if (code >= 51 && code <= 57) return 'cloud-drizzle';
    if (code >= 61 && code <= 67) return 'cloud-rain';
    if (code >= 71 && code <= 77) return 'cloud-snow';
    if (code >= 80 && code <= 82) return 'cloud-rain';
    if (code >= 85 && code <= 86) return 'cloud-snow';
    if (code >= 95) return 'cloud-lightning';
    return 'cloud';
  };

  const dayGradient = ['#3A82F6', '#89CFF0'];
  const nightGradient = ['#0A192F', '#112240'];

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      
      {/* Small subtle background clouds */}
      <View style={{ ...StyleSheet.absoluteFillObject, opacity: 0.3 }} pointerEvents="none">
        <Cloud top={height * 0.05} width={128} height={64} duration={80000} delay={0} isNight={true} />
        <Cloud top={height * 0.15} width={160} height={80} duration={100000} delay={18000} isNight={true} />
        <Cloud top={height * 0.08} width={144} height={72} duration={120000} delay={36000} isNight={true} />
      </View>

      {/* Main Content (OneUI Dashboard style - Pure Black) */}
      <View style={{ flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 16 }}>
        
        {/* Title & AI Button / Edit Mode Header */}
        {isEditMode ? (
          <>
            <Text 
              style={{
                fontSize: 42,
                fontWeight: '600',
                color: Platform.OS === 'android' && Platform.Version >= 31 ? PlatformColor('@android:color/system_accent1_300') : '#B0D0FF',
                textAlign: 'center',
                marginBottom: 32,
                marginTop: 12,
                letterSpacing: -0.5,
              }}
            >
              {selectedItems.length} selected
            </Text>

            <View className="w-full flex-row justify-between items-center px-4 mb-4 z-10">
              <TouchableOpacity 
                className="items-center"
                onPress={() => {
                  const itemsCount = safePages.filter((p:any) => p.type !== 'landing').length;
                  if (selectedItems.length === itemsCount) {
                    setSelectedItems([]);
                  } else {
                    const allIds = safePages.filter((p:any) => p.type !== 'landing').map((p:any) => p.id);
                    setSelectedItems(allIds);
                  }
                }}
              >
                <View 
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center mb-1 ${selectedItems.length === safePages.filter((p:any) => p.type !== 'landing').length && selectedItems.length > 0 ? 'border-transparent bg-[#B0D0FF]' : 'border-[#a0a0a0] bg-transparent'}`} 
                  style={selectedItems.length === safePages.filter((p:any) => p.type !== 'landing').length && selectedItems.length > 0 ? { backgroundColor: Platform.OS === 'android' && Platform.Version >= 31 ? PlatformColor('@android:color/system_accent1_300') : '#B0D0FF' } : {}}
                >
                  {selectedItems.length === safePages.filter((p:any) => p.type !== 'landing').length && selectedItems.length > 0 && <Feather name="check" size={16} color="black" />}
                </View>
                <Text className="text-white text-xs">All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsEditMode(false); setSelectedItems([]); }}>
                <Text className="text-[#B0D0FF] text-lg font-medium" style={{ color: Platform.OS === 'android' && Platform.Version >= 31 ? PlatformColor('@android:color/system_accent1_300') : '#B0D0FF' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text 
              style={{
                fontSize: 42,
                fontWeight: '600',
                color: Platform.OS === 'android' && Platform.Version >= 31 ? PlatformColor('@android:color/system_accent1_300') : '#B0D0FF',
                textAlign: 'center',
                marginBottom: 12,
                letterSpacing: -0.5,
              }}
            >
              rainiX
            </Text>

            <TouchableOpacity 
              onPress={() => router.push('/ai')}
              className="bg-[#1c1c1e] rounded-full px-5 py-2 flex-row items-center self-center mb-8 z-10"
              activeOpacity={0.7}
            >
              <Feather name="arrow-up-right" size={14} color={Platform.OS === 'android' && Platform.Version >= 31 ? PlatformColor('@android:color/system_accent1_300') : '#B0D0FF'} style={{ marginRight: 6 }} />
              <Text style={{ color: Platform.OS === 'android' && Platform.Version >= 31 ? PlatformColor('@android:color/system_accent1_300') : '#B0D0FF', fontWeight: '500', fontSize: 14 }}>rainiX AI</Text>
            </TouchableOpacity>

            {/* Action Row */}
            <View className="w-full flex-row justify-between items-center px-2 mb-6 z-10">
              <TouchableOpacity onPress={() => {
                if (scrollToPage && pages && pages.length > 1) {
                  scrollToPage(1); // Back to GPS or first fav
                }
              }} className="p-2" activeOpacity={0.7}>
                <Feather name="chevron-left" size={28} color="white" />
              </TouchableOpacity>
              <View className="flex-row items-center">
                <TouchableOpacity onPress={() => setIsSearchMode(true)} className="p-2 ml-1" activeOpacity={0.7}>
                  <Feather name="search" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity className="p-2 ml-2" activeOpacity={0.7}>
                  <Feather name="more-vertical" size={22} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Cards List using DraggableFlatList */}
        <View className="flex-1 w-full z-10">
          <DraggableFlatList
            data={safePages.filter((p: any) => p.type === 'fav')}
            onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            onDragEnd={({ data }) => {
              if (setFavorites) {
                const newFavs = data.map((p: any) => ({ name: p.name, query: p.name, isRiver: p.isRiver }));
                setFavorites(newFavs);
                AsyncStorage.setItem('rainix_favorites', JSON.stringify(newFavs)).catch(() => {});
              }
            }}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ paddingBottom: 64 }}
            ListHeaderComponent={() => (
              <View className="w-full">
                {safePages.filter((p: any) => p.type !== 'landing').length === 0 && (
                   <View className="items-center py-10 opacity-50">
                      <Text className="text-white text-lg">No pages added yet.</Text>
                      <Text className="text-white/80 mt-2 text-sm text-center">Tap the + icon to search and add cities or rivers.</Text>
                   </View>
                )}
                {/* Render GPS Item if exists */}
                {safePages.filter((p: any) => p.type === 'gps').length > 0 ? (
                  safePages.filter((p: any) => p.type === 'gps').map((p: any) => {
                    const data = pageWeathers[p.id];
                    const temp = data?.weather?.weather?.temperature ? Math.round(data?.weather?.weather?.temperature) : '--';
                    const high = data?.weather?.weather?.high ? Math.round(data?.weather?.weather?.high) : '--';
                    const low = data?.weather?.weather?.low ? Math.round(data?.weather?.weather?.low) : '--';
                    const locationName = data?.weather?.city || 'My Location';
                    const country = data?.weather?.country || 'Sri Lanka';
                    const now = new Date();
                    const timeString = data?.weather?.time ? new Date(data.weather.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateString = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                    const isSelected = selectedItems.includes(p.id);

                    return (
                      <TouchableOpacity 
                        key={p.id}
                        onLongPress={() => {
                          if (!isEditMode) {
                            setIsEditMode(true);
                            setSelectedItems([p.id]);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          }
                        }}
                        onPress={() => {
                          if (isEditMode) {
                            if (isSelected) {
                              setSelectedItems(prev => prev.filter(id => id !== p.id));
                            } else {
                              setSelectedItems(prev => [...prev, p.id]);
                            }
                            return;
                          }
                          if (scrollToPage && pages) {
                            const idx = pages.findIndex((page: any) => page.id === p.id);
                            if (idx !== -1) scrollToPage(idx);
                          }
                        }}
                        activeOpacity={0.8}
                        className={`w-full bg-[#1c1c1e] rounded-[24px] p-5 mb-4 flex-row justify-between items-center ${isSelected && isEditMode ? 'border border-white/10 bg-[#2c2c2e]' : ''}`}
                      >
                        {isEditMode && (
                          <View 
                            className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-4 ${isSelected ? 'border-transparent bg-[#B0D0FF]' : 'border-[#a0a0a0] bg-transparent'}`} 
                            style={isSelected ? { backgroundColor: Platform.OS === 'android' && Platform.Version >= 31 ? PlatformColor('@android:color/system_accent1_300') : '#B0D0FF' } : {}}
                          >
                            {isSelected && <Feather name="check" size={16} color="black" />}
                          </View>
                        )}
                        <View style={{ flex: 1, marginRight: 10, opacity: isEditMode && !isSelected ? 0.6 : 1 }}>
                          <View className="flex-row items-center mb-1">
                            <MaterialIcons name="location-on" size={16} color="white" style={{ marginRight: 4 }} />
                            <Text className="text-white text-lg font-semibold" numberOfLines={1}>{locationName}</Text>
                          </View>
                          <Text className="text-[#a0a0a0] text-xs mb-1" numberOfLines={1}>{locationName}, {country}</Text>
                          <Text className="text-[#a0a0a0] text-[11px]">{dateString} at {timeString}</Text>
                        </View>
                        
                        {!isEditMode && (
                          <View className="items-end">
                            <View className="flex-row items-center mb-1">
                              <Feather name={getWeatherIcon(data?.weather?.weather?.weatherCode, data?.weather?.time) as any} size={24} color="white" />
                              <Text className="text-white text-4xl font-medium ml-3">{temp}°</Text>
                            </View>
                            <Text className="text-[#a0a0a0] text-xs mt-1">{high}° / {low}°</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <TouchableOpacity 
                    onPress={async () => {
                      try {
                        let { status } = await Location.requestForegroundPermissionsAsync();
                        if (status === 'granted') {
                          const { DeviceEventEmitter } = require('react-native');
                          DeviceEventEmitter.emit('gps_granted');
                        }
                      } catch(e) {}
                    }}
                    activeOpacity={0.8}
                    className="w-full bg-[#1c1c1e] rounded-[24px] p-5 mb-4 flex-row justify-center items-center"
                    style={{ borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                     <MaterialIcons name="my-location" size={20} color="#a0a0a0" style={{ marginRight: 8 }} />
                     <Text className="text-[#a0a0a0] font-medium text-center">Add weather for current location</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            renderItem={({ item: p, drag, isActive }: any) => {
              const data = pageWeathers[p.id];
              const temp = data?.weather?.weather?.temperature ? Math.round(data?.weather?.weather?.temperature) : '--';
              const high = data?.weather?.weather?.high ? Math.round(data?.weather?.weather?.high) : '--';
              const low = data?.weather?.weather?.low ? Math.round(data?.weather?.weather?.low) : '--';
              const locationName = p.name;
              const country = data?.weather?.country || 'Sri Lanka';
              
              const isRiver = p.isRiver || p.id.toLowerCase().includes('ganga') || p.id.toLowerCase().includes('oya') || p.id.toLowerCase().includes('river');
              
              let riverLevelStr = '--';
              if (isRiver) {
                 const rivers = data?.rivers || [];
                 const activeRiver = rivers[0];
                 if (activeRiver) {
                   if (activeRiver.currentLevel !== null && activeRiver.currentLevel !== undefined) {
                      riverLevelStr = activeRiver.currentLevel + 'm';
                   } else {
                      const chartArr = activeRiver.chart || activeRiver.historicalData;
                      if (chartArr && chartArr.length > 0) {
                        const lastPoint = chartArr[chartArr.length - 1];
                        if (lastPoint && lastPoint.y !== null && lastPoint.y !== undefined) riverLevelStr = lastPoint.y + 'm';
                        else if (lastPoint && lastPoint.value !== null && lastPoint.value !== undefined) riverLevelStr = lastPoint.value + 'm';
                      }
                   }
                 }
              }
              const riverLevel = isRiver ? riverLevelStr : null;
              
              const now = new Date();
              const timeString = data?.weather?.time ? new Date(data.weather.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateString = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

              const isSelected = selectedItems.includes(p.id);

              return (
                <ScaleDecorator>
                  <TouchableOpacity 
                    onLongPress={() => {
                      if (!isEditMode) {
                        setIsEditMode(true);
                        setSelectedItems([p.id]);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                    }}
                    disabled={isActive}
                    onPress={() => {
                      if (isEditMode) {
                        if (isSelected) {
                          setSelectedItems(prev => prev.filter(id => id !== p.id));
                        } else {
                          setSelectedItems(prev => [...prev, p.id]);
                        }
                        return;
                      }
                      if (scrollToPage && pages) {
                        const idx = pages.findIndex((page: any) => page.id === p.id);
                        if (idx !== -1) scrollToPage(idx);
                      }
                    }}
                    activeOpacity={0.8}
                    style={{ opacity: isActive ? 0.7 : 1 }}
                    className={`w-full bg-[#1c1c1e] rounded-[24px] p-5 mb-4 flex-row justify-between items-center ${isSelected && isEditMode ? 'border border-white/10 bg-[#2c2c2e]' : ''}`}
                  >
                    {isEditMode && (
                      <View 
                        className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-4 ${isSelected ? 'border-transparent bg-[#B0D0FF]' : 'border-[#a0a0a0] bg-transparent'}`} 
                        style={isSelected ? { backgroundColor: Platform.OS === 'android' && Platform.Version >= 31 ? PlatformColor('@android:color/system_accent1_300') : '#B0D0FF' } : {}}
                      >
                        {isSelected && <Feather name="check" size={16} color="black" />}
                      </View>
                    )}
                    <View style={{ flex: 1, marginRight: 10, opacity: isEditMode && !isSelected ? 0.6 : 1 }}>
                      <View className="flex-row items-center mb-1">
                        <Text className="text-white text-lg font-semibold" numberOfLines={1}>{locationName}</Text>
                      </View>
                      {!isRiver && <Text className="text-[#a0a0a0] text-xs mb-1" numberOfLines={1}>{locationName}, {country}</Text>}
                      <Text className="text-[#a0a0a0] text-[11px]">{dateString} at {timeString}</Text>
                    </View>
                    
                    {!isEditMode && (
                      <View className="items-end">
                        {isRiver ? (
                          <Text className="text-white text-3xl font-medium">{riverLevel}</Text>
                        ) : (
                          <>
                            <View className="flex-row items-center mb-1">
                              <Feather name={getWeatherIcon(data?.weather?.weather?.weatherCode, data?.weather?.time) as any} size={24} color="white" />
                              <Text className="text-white text-4xl font-medium ml-3">{temp}°</Text>
                            </View>
                            <Text className="text-[#a0a0a0] text-xs mt-1">{high}° / {low}°</Text>
                          </>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                </ScaleDecorator>
              );
            }}
            ListFooterComponent={() => (
              <Text className="text-[#808080] text-sm mt-4 px-2 leading-5">
                The location at the top of the list will be used to provide weather information in notifications and other connected services.
              </Text>
            )}
          />
        </View>

        {isEditMode && (
          <View style={{ position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', zIndex: 50 }}>
            <View className="bg-[#2c2c2e] rounded-full flex-row items-center overflow-hidden border border-white/10" style={{ paddingHorizontal: 40, paddingVertical: 12 }}>
               <TouchableOpacity 
                 onPress={() => {
                    if (selectedItems.length === 0) return;
                    let remainingFavs = favorites;
                    if (selectedItems.includes('gps')) {
                       const { DeviceEventEmitter } = require('react-native');
                       DeviceEventEmitter.emit('remove_gps');
                    }
                    
                    const favIdsToRemove = selectedItems.filter(id => id !== 'gps').map(id => id.replace('fav-', ''));
                    if (favIdsToRemove.length > 0 && setFavorites && favorites) {
                       remainingFavs = favorites.filter((f:any) => !favIdsToRemove.includes(f.name));
                       setFavorites(remainingFavs);
                       AsyncStorage.setItem('rainix_favorites', JSON.stringify(remainingFavs));
                       const { DeviceEventEmitter } = require('react-native');
                       DeviceEventEmitter.emit('favorites_updated', remainingFavs);
                    }
                    
                    setIsEditMode(false);
                    setSelectedItems([]);
                 }}
                 className="items-center justify-center opacity-80"
               >
                 <Feather name="trash-2" size={24} color="#a0a0a0" />
                 <Text className="text-[#a0a0a0] text-xs mt-1">Delete{selectedItems.length > 1 ? ' all' : ''}</Text>
               </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Search Overlay (OneUI 8.5 Design) */}
      {isSearchMode && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000', zIndex: 100 }}>
          {/* Header & Search Bar */}
          <View className="px-2 pt-16 pb-2 flex-row items-center">
             <TouchableOpacity onPress={() => { setIsSearchMode(false); Keyboard.dismiss(); }} className="p-3 mr-1" activeOpacity={0.7}>
               <Feather name="chevron-left" size={32} color="white" />
             </TouchableOpacity>
             <View className="flex-1 flex-row items-center bg-[#1c1c1e] rounded-full px-4 py-3 mr-4">
               <TextInput 
                 className="flex-1 text-white text-lg font-medium"
                 placeholder="Search city or river"
                 placeholderTextColor="#808080"
                 value={searchQuery}
                 onChangeText={setSearchQuery}
                 onFocus={() => setIsFocused(true)}
                 autoFocus={true}
                 onSubmitEditing={() => handleSearchSubmit(searchQuery)}
                 cursorColor="#3A82F6"
               />
               {searchQuery.length > 0 && (
                 <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                   <MaterialIcons name="cancel" size={20} color="#808080" />
                 </TouchableOpacity>
               )}
             </View>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}>
            {searchQuery.trim().length < 2 ? (
               <View>
                  {/* Favorites */}
                  {favorites.length > 0 && (
                    <View className="mb-6">
                      <Text className="text-[#808080] text-[13px] font-semibold mb-3 ml-2 uppercase tracking-wide">Favorites</Text>
                      {favorites.map((item, idx) => (
                         <TouchableOpacity 
                           key={`fav-${idx}`} 
                           className="flex-row items-center px-2 py-3.5 mb-1"
                           activeOpacity={0.7}
                           onPress={() => { setSearchQuery(item.query); handleSearchSubmit(item.query, false); }}
                         >
                           <MaterialIcons name="favorite" size={22} color="#808080" style={{ marginRight: 16 }} />
                           <Text className="text-white text-[17px] font-medium">{item.name}</Text>
                         </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Recent Searches */}
                  <View className="mb-6">
                    <Text className="text-[#808080] text-[13px] font-semibold mb-3 ml-2 uppercase tracking-wide">Recent searches</Text>
                    {recentSearches.map((item, idx) => (
                       <TouchableOpacity 
                         key={idx} 
                         className="flex-row items-center px-2 py-3.5 mb-1"
                         activeOpacity={0.7}
                         onPress={() => { setSearchQuery(item.query); handleSearchSubmit(item.query, item.isRiver); }}
                       >
                         <MaterialIcons name="history" size={24} color="#808080" style={{ marginRight: 16 }} />
                         <View style={{ flex: 1 }}>
                           <Text className="text-white text-[17px] font-medium">{item.name}</Text>
                           {item.coords && <Text className="text-[#808080] text-[13px] mt-0.5">{item.coords}</Text>}
                         </View>
                       </TouchableOpacity>
                    ))}
                  </View>
               </View>
            ) : showSuggestions && suggestions.length > 0 ? (
               <View className="mb-6">
                  <Text className="text-[#808080] text-[13px] font-semibold mb-3 ml-2 uppercase tracking-wide">Search results</Text>
                  {suggestions.map((s, idx) => (
                     <TouchableOpacity 
                       key={idx} 
                       className="flex-row items-center px-2 py-3.5 mb-1"
                       activeOpacity={0.7}
                       onPress={() => { setSearchQuery(s.name); handleSearchSubmit(s.name, s.isRiver); }}
                     >
                       <MaterialIcons name="location-on" size={24} color="#808080" style={{ marginRight: 16 }} />
                       <View style={{ flex: 1 }}>
                         <Text className="text-white text-[17px] font-medium">{s.name}</Text>
                         <Text className="text-[#808080] text-[13px] mt-0.5">{s.admin1 ? `${s.admin1}, ` : ''}{s.country}</Text>
                       </View>
                     </TouchableOpacity>
                  ))}
               </View>
            ) : (
               <View className="pt-20 items-center">
                  <MaterialIcons name="search-off" size={48} color="#333333" />
                  <Text className="text-[#808080] text-[15px] mt-4">No results found</Text>
               </View>
            )}
          </ScrollView>
        </View>
      )}
      
      {/* Removed LinearGradient closing tag as we are using pure View now */}
    </View>
  );
}
