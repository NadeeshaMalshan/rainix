import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import RiverScreen from '../components/RiverScreen';

export default function RiverRoute() {
  const { query, lat, lon } = useLocalSearchParams();
  
  return <RiverScreen query={query as string} lat={lat as string} lon={lon as string} />;
}
