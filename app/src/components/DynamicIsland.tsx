import React, { useState, useEffect } from 'react';
import { View, Text, TouchableWithoutFeedback, TextInput, TouchableOpacity, Dimensions, StyleSheet, Keyboard, DeviceEventEmitter } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  SharedValue,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
  interpolateColor,
  useSharedValue
} from 'react-native-reanimated';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const TOPBAR_WIDTH = width;
const TOPBAR_HEIGHT = 100;
const COLLAPSED_WIDTH = 180;
const COLLAPSED_HEIGHT = 44;
const EXPANDED_WIDTH = width - 32;
const EXPANDED_HEIGHT = 150;

const springConfig = {
  damping: 16,
  stiffness: 180,
  mass: 0.8,
  overshootClamping: false,
};

interface DynamicIslandProps {
  scrollY: SharedValue<number>;
  weather: any;
  city: string;
  country: string;
  condition: string;
  isGps?: boolean;
  isRiver?: boolean;
  stationName?: string;
  riverLevel?: string | number;
  riverStatus?: string;
}

export default function DynamicIsland({ scrollY, weather, city, country, temp, condition, isGps = false, isRiver = false, stationName, riverLevel, riverStatus }: DynamicIslandProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTopSearchVisible, setIsTopSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const saved = await AsyncStorage.getItem('rainix_favorites');
        if (saved) {
          const favorites = JSON.parse(saved);
          const exists = favorites.some((fav: any) => fav.name === city);
          setIsFavorite(exists);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkFavorite();
  }, [city]);

  const toggleFavorite = async () => {
    try {
      const saved = await AsyncStorage.getItem('rainix_favorites');
      let favorites = saved ? JSON.parse(saved) : [];
      
      if (isFavorite) {
        favorites = favorites.filter((fav: any) => fav.name !== city);
        setIsFavorite(false);
      } else {
        const newFav = { name: city, query: city, isRiver };
        favorites = [newFav, ...favorites];
        setIsFavorite(true);
      }
      
      await AsyncStorage.setItem('rainix_favorites', JSON.stringify(favorites));
      DeviceEventEmitter.emit('favorites_updated', favorites);
    } catch (e) {
      console.error(e);
    }
  };

  const isExpandedSV = useSharedValue(false);
  const expandedHeightSV = useSharedValue(150);

  useEffect(() => {
    isExpandedSV.value = isExpanded;
    if (!isExpanded) {
      setSuggestions([]);
      setShowSuggestions(false);
      expandedHeightSV.value = 150;
      setSearchQuery('');
    }
  }, [isExpanded]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery && searchQuery.trim().length >= 2) {
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

          const q = encodeURIComponent(searchQuery.trim());
          const [geoRes, riverRes] = await Promise.all([
            fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=5`).catch(() => null),
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
            setSuggestions(combined.slice(0, 4));
            setShowSuggestions(true);
            expandedHeightSV.value = withSpring(150 + Math.min(combined.length, 4) * 44, springConfig);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
            expandedHeightSV.value = withSpring(150, springConfig);
          }
        } catch (err) {
          setSuggestions([]);
          setShowSuggestions(false);
          expandedHeightSV.value = withSpring(150, springConfig);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        expandedHeightSV.value = withSpring(150, springConfig);
      }
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const getWeatherIconInfo = () => {
    const code = weather?.weather?.weatherCode ?? weather?.weatherCode ?? 0;
    
    let isNightTime = false;
    const timeStr = weather?.weather?.time || weather?.time;
    if (timeStr) {
      try {
        const hours = new Date(timeStr).getHours();
        isNightTime = hours >= 19 || hours <= 6;
      } catch (e) {}
    }

    if (code === 0) {
      return isNightTime 
        ? { name: 'moon' as const, color: 'white' } 
        : { name: 'sun' as const, color: 'white' };
    }
    if (code >= 1 && code <= 3) {
      return { name: 'cloud' as const, color: 'white' };
    }
    if (code === 45 || code === 48) {
      return { name: 'wind' as const, color: 'white' };
    }
    if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
      return { name: 'cloud-rain' as const, color: 'white' };
    }
    if (code >= 95) {
      return { name: 'cloud-lightning' as const, color: 'white' };
    }
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
      return { name: 'cloud-snow' as const, color: 'white' };
    }
    return { name: 'cloud' as const, color: 'white' };
  };

  const iconInfo = getWeatherIconInfo();

  useAnimatedReaction(
    () => scrollY.value,
    (current, previous) => {
      if (previous !== null && Math.abs(current - previous) > 1) {
        if (isExpandedSV.value) {
          isExpandedSV.value = false;
          runOnJS(setIsExpanded)(false);
        }
      }
      if (current > 20 && previous !== null && current > previous) {
        runOnJS(setIsTopSearchVisible)(false);
      }
    }
  );

  // State: 0 = Top Bar, 1 = Pill (Collapsed), 2 = Expanded
  const stateValue = useDerivedValue(() => {
    if (isExpanded) return withSpring(2, springConfig);
    const scrollVal = interpolate(scrollY.value, [0, 80], [0, 1], Extrapolation.CLAMP);
    return withSpring(scrollVal, springConfig);
  });

  const animatedStyle = useAnimatedStyle(() => {
    const currentWidth = interpolate(stateValue.value, [0, 1, 2], [TOPBAR_WIDTH, COLLAPSED_WIDTH, EXPANDED_WIDTH]);
    const currentHeight = interpolate(stateValue.value, [0, 1, 2], [TOPBAR_HEIGHT, COLLAPSED_HEIGHT, expandedHeightSV.value]);
    const currentBorderRadius = interpolate(stateValue.value, [0, 1, 2], [0, 22, 32]);
    const currentTop = interpolate(stateValue.value, [0, 1, 2], [0, 36, 38]);
    const backgroundColor = interpolateColor(
      stateValue.value,
      [0, 1, 2],
      ['rgba(0,0,0,0)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)']
    );
    const elevation = interpolate(stateValue.value, [0, 1, 2], [0, 15, 15]);
    const shadowOpacity = interpolate(stateValue.value, [0, 1, 2], [0, 0.5, 0.5]);

    return { 
      width: currentWidth, 
      height: currentHeight, 
      borderRadius: currentBorderRadius, 
      top: currentTop, 
      backgroundColor,
      elevation,
      shadowOpacity,
    };
  });

  const topBarContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(stateValue.value, [0, 0.5], [1, 0], Extrapolation.CLAMP);
    return { opacity, display: opacity === 0 ? 'none' : 'flex' };
  });

  const collapsedContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(stateValue.value, [0.5, 1, 1.5], [0, 1, 0], Extrapolation.CLAMP);
    return { opacity, display: opacity === 0 ? 'none' : 'flex' };
  });

  const expandedContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(stateValue.value, [1.5, 2], [0, 1], Extrapolation.CLAMP);
    return { opacity, display: opacity === 0 ? 'none' : 'flex' };
  });

  const handleIslandTap = () => {
    if (scrollY.value > 50 || isExpanded) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      Keyboard.dismiss();
      setIsExpanded(false);
      setIsTopSearchVisible(false);
      router.push(`/weather?city=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <View style={isExpanded ? styles.wrapperExpanded : styles.wrapper}>
      {isExpanded && (
        <View
          style={styles.backdrop}
          onTouchStart={() => {
            setIsExpanded(false);
            setIsTopSearchVisible(false);
            Keyboard.dismiss();
          }}
        />
      )}
      <TouchableWithoutFeedback onPress={handleIslandTap}>
        <Animated.View style={[styles.island, animatedStyle]}>

          {/* TOP BAR (state = 0) */}
          <Animated.View style={[styles.absoluteFill, styles.topBarRow, topBarContentStyle]}>
            {isTopSearchVisible ? (
              <View style={styles.searchRow}>
                <TouchableOpacity onPress={() => setIsTopSearchVisible(false)} style={styles.iconBtn}>
                  <MaterialIcons name="close" size={22} color="white" />
                </TouchableOpacity>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search City or River..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
                />
                <TouchableOpacity onPress={() => { setIsTopSearchVisible(false); router.push('/weather?gps=true'); }} style={styles.iconBtn}>
                  <MaterialIcons name="my-location" size={22} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.topBarInner}>
                <TouchableOpacity onPress={() => router.push('/')} style={styles.iconBtn}>
                  <MaterialIcons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.cityNameLarge}>{city}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity onPress={toggleFavorite} style={styles.iconBtn}>
                    <MaterialIcons name={isFavorite ? "favorite" : "favorite-border"} size={26} color={isFavorite ? "#f43f5e" : "white"} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsTopSearchVisible(true)} style={styles.iconBtn}>
                    <MaterialIcons name="search" size={28} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>

          {/* COLLAPSED PILL (state = 1) */}
          <Animated.View pointerEvents="none" style={[styles.absoluteFill, styles.pillCenter, collapsedContentStyle]}>
            <View style={styles.pillRow}>
              {isGps && <MaterialIcons name="location-on" size={13} color="white" style={{ marginRight: 2 }} />}
              <Text style={styles.pillText}>{city}</Text>
            </View>
          </Animated.View>

          {/* EXPANDED (state = 2) */}
          <Animated.View style={[styles.absoluteFill, styles.expandedPad, expandedContentStyle]}>
            <View style={styles.expandedTop}>
              {isRiver ? (
                <View style={[styles.weatherIconBox, { justifyContent: 'center', alignItems: 'center' }]}>
                  <MaterialIcons name="waves" size={32} color="white" />
                </View>
              ) : (
                <View style={styles.weatherIconBox}>
                  <Feather name={iconInfo.name} size={32} color={iconInfo.color} />
                </View>
              )}
              <View style={styles.expandedCenter}>
                {isRiver ? (
                  <>
                    <Text style={[styles.expandedCity, { fontSize: 18 }]}>{stationName || city}</Text>
                    <Text style={[styles.expandedCondition, { color: 'rgba(255,255,255,0.7)', marginTop: 2 }]}>{riverStatus || 'Unknown'}</Text>
                    <Text style={[styles.expandedTemp, { fontSize: 24, marginTop: 4 }]}>{riverLevel}m</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.expandedCity}>{city}</Text>
                    <Text style={styles.expandedCondition}>{condition}</Text>
                    <Text style={styles.expandedTemp}>{temp}°</Text>
                  </>
                )}
              </View>
              <View style={{ width: 60 }} />
            </View>

            <View style={styles.inputsCol}>
              <View style={styles.searchBarBox}>
                <TouchableOpacity onPress={handleSearchSubmit} style={{ padding: 2 }}>
                  <MaterialIcons name="search" size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
                <TextInput
                  style={styles.expandedInput}
                  placeholder="Search City..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
                />
              </View>

              {/* Suggestions list */}
              {showSuggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionRow}
                      onPress={() => {
                        Keyboard.dismiss();
                        setIsExpanded(false);
                        setIsTopSearchVisible(false);
                        router.push(`/weather?city=${encodeURIComponent(item.name)}`);
                        setSearchQuery('');
                      }}
                    >
                      <MaterialIcons name="location-on" size={14} color="rgba(255,255,255,0.5)" style={{ marginRight: 2 }} />
                      <View style={styles.suggestionTextCol}>
                        <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.suggestionSub} numberOfLines={1}>
                          {item.admin1 ? `${item.admin1}, ` : ''}{item.country}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>

        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  wrapperExpanded: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  island: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
  },
  absoluteFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  // TOP BAR
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 30,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    paddingVertical: 0,
    marginHorizontal: 6,
  },
  iconBtn: {
    padding: 4,
  },
  cityNameLarge: {
    color: 'white',
    fontSize: 22,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  // PILL
  pillCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginLeft: 4,
  },
  // EXPANDED
  expandedPad: {
    padding: 16,
    paddingTop: 14,
  },
  expandedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  weatherIconBox: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedCity: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  expandedCondition: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginBottom: 2,
  },
  expandedTemp: {
    color: 'white',
    fontSize: 26,
    fontWeight: '300',
  },
  inputsCol: {
    marginTop: 10,
    flexDirection: 'column',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  expandedInput: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    paddingVertical: 0,
    marginLeft: 8,
  },
  suggestionsContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  suggestionTextCol: {
    marginLeft: 6,
    flex: 1,
  },
  suggestionName: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  suggestionSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 1,
  },
});
