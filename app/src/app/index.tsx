import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, DeviceEventEmitter, LogBox } from 'react-native';

LogBox.ignoreLogs([
  "InteractionManager has been deprecated"
]);
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import LandingScreen from '../components/LandingScreen';
import WeatherScreen from '../components/WeatherScreen';
import RiverScreen from '../components/RiverScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function App() {
  const [hasGps, setHasGps] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setHasGps(status === 'granted');
        
        const savedFavs = await AsyncStorage.getItem('rainix_favorites');
        if (savedFavs) {
          setFavorites(JSON.parse(savedFavs));
        }
      } catch (e) {}
      setIsLoaded(true);
    };
    loadData();

    const listener = DeviceEventEmitter.addListener('favorites_updated', (newFavs) => {
      setFavorites(newFavs);
    });
    
    const gpsListener = DeviceEventEmitter.addListener('gps_granted', () => {
      setHasGps(true);
    });

    const removeGpsListener = DeviceEventEmitter.addListener('remove_gps', () => {
      setHasGps(false);
    });

    return () => {
      listener.remove();
      gpsListener.remove();
      removeGpsListener.remove();
    };
  }, []);

  const pages = [{ type: 'landing', id: 'landing' }];
  if (hasGps) pages.push({ type: 'gps', id: 'gps' });
  favorites.forEach(fav => pages.push({ type: 'fav', name: fav.name, id: `fav-${fav.name}`, isRiver: fav.isRiver }));

  // Set the initial current page when data finishes loading
  useEffect(() => {
    if (isLoaded && pages.length > 1 && currentPage === 0) {
      setCurrentPage(1);
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: 'black' }} />;
  }

  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (pageIndex !== currentPage) {
      setCurrentPage(pageIndex);
    }
  };

  const scrollToPage = (index: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: (pages.length > 1 ? 1 : 0) * SCREEN_WIDTH, y: 0 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {pages.map((p, i) => (
          <View key={p.id} style={{ width: SCREEN_WIDTH, height: '100%', overflow: 'hidden' }}>
            {p.type === 'landing' && <LandingScreen pages={pages} scrollToPage={scrollToPage} favorites={favorites} setFavorites={setFavorites} />}
            {p.type === 'gps' && <WeatherScreen isGps={true} isActive={currentPage === i} />}
            {p.type === 'fav' && (
              p.isRiver ? <RiverScreen query={p.name} /> : <WeatherScreen city={p.name} isActive={currentPage === i} />
            )}
          </View>
        ))}
      </ScrollView>

      {/* Pagination Indicator */}
      <View className="absolute bottom-6 left-0 right-0 flex-row justify-center items-center gap-3 z-50">
        {pages.map((p, idx) => {
          const isActive = currentPage === idx;
          
          if (p.type === 'landing') {
            return (
              <TouchableOpacity key={idx} onPress={() => scrollToPage(idx)}>
                <View className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-white/40'}`} />
              </TouchableOpacity>
            );
          }
          
          if (p.type === 'gps') {
            return (
              <TouchableOpacity key={idx} onPress={() => scrollToPage(idx)}>
                <MaterialIcons 
                  name="location-on" 
                  size={12} 
                  color={isActive ? "white" : "rgba(255,255,255,0.4)"} 
                />
              </TouchableOpacity>
            );
          }
          
          return (
            <TouchableOpacity key={idx} onPress={() => scrollToPage(idx)}>
              <View className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-white/40'}`} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
