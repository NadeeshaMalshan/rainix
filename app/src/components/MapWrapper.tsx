import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';

export default function MapWrapper({ coordinates, radarUrl }: { coordinates: any, radarUrl?: string }) {
  if (!coordinates) return null;

  return (
    <View className="w-full mt-2">
      <View className="bg-white/10 rounded-3xl p-4 md:p-6 mb-4 h-[400px] overflow-hidden">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-white font-semibold text-lg tracking-wide">Live Weather Radar</Text>
            <View className="bg-black/20 px-3 py-1 rounded-full">
               <Text className="text-[10px] text-white/50">OpenWeatherMap</Text>
            </View>
          </View>
        </View>
        
        <View className="flex-1 rounded-2xl overflow-hidden bg-[#e5e5e5]">
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              latitudeDelta: 2.5,
              longitudeDelta: 2.5,
            }}
            mapType="none"
          >
            <UrlTile
              urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              zIndex={-1}
            />
            <Marker 
              coordinate={{ latitude: coordinates.latitude, longitude: coordinates.longitude }}
              pinColor="black"
            />
            {radarUrl && (
              <>
                <UrlTile
                  urlTemplate={radarUrl.replace('{layer}', 'temp_new') + '&palette=-65:821692;-55:821692;-45:821692;-40:821692;-30:8257db;-20:208cec;-10:20c4e8;0:23dddd;10:00ff00;20:ff8800;25:ff4400;30:fc8014'}
                  maximumZ={19}
                  opacity={0.35}
                  zIndex={1}
                />
                <UrlTile
                  urlTemplate={radarUrl.replace('{layer}', 'clouds_new')}
                  maximumZ={19}
                  opacity={0.6}
                  zIndex={2}
                />
                <UrlTile
                  urlTemplate={radarUrl.replace('{layer}', 'wind_new')}
                  maximumZ={19}
                  opacity={0.5}
                  zIndex={3}
                />
                <UrlTile
                  urlTemplate={radarUrl.replace('{layer}', 'precipitation_new')}
                  maximumZ={19}
                  opacity={0.9}
                  zIndex={4}
                />
              </>
            )}
          </MapView>
        </View>
      </View>
    </View>
  );
}
