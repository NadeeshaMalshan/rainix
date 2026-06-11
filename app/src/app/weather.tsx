import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import WeatherScreen from '../components/WeatherScreen';

export default function WeatherRoute() {
  const { city, lat, lon } = useLocalSearchParams();
  
  return (
    <WeatherScreen 
      city={city ? String(city) : undefined} 
      lat={lat ? String(lat) : undefined} 
      lon={lon ? String(lon) : undefined} 
    />
  );
}
