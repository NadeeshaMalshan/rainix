import dynamic from 'next/dynamic';

// Dynamically import the MapLayer component to avoid SSR issues with Leaflet
const MapLayer = dynamic(() => import('./MapLayer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-2xl border border-white/10">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
        <span className="text-white/60 text-sm font-medium">Loading map...</span>
      </div>
    </div>
  )
});

interface Station {
  name: string;
  lat: number | null;
  lon: number | null;
  status?: string;
  currentLevel?: number | string;
}

interface StationsMapProps {
  stations: Station[];
  activeStationIdx: number;
}

export default function StationsMap({ stations, activeStationIdx }: StationsMapProps) {
  return (
    <div className="w-full h-full min-h-[300px] relative z-20">
      <MapLayer stations={stations} activeStationIdx={activeStationIdx} />
    </div>
  );
}
