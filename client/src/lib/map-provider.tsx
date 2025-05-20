import { createContext, useContext, ReactNode } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon, LatLngExpression } from 'leaflet';
import { HardHat } from 'lucide-react';

// Fix Leaflet icon issue
import L from 'leaflet';

// Define marker icon manually
const DefaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Map Context
type MapContextType = {
  setView: (center: LatLngExpression, zoom: number) => void;
};

const MapContext = createContext<MapContextType | null>(null);

export function useMapContext() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}

// Map Controller Component
function MapController() {
  const map = useMap();
  
  const setView = (center: LatLngExpression, zoom: number) => {
    map.setView(center, zoom);
  };
  
  return (
    <MapContext.Provider value={{ setView }}>
      {null}
    </MapContext.Provider>
  );
}

// Map Provider Component
type MapProviderProps = {
  children: ReactNode;
  center: LatLngExpression;
  zoom: number;
  markers?: Array<{
    id: number;
    position: LatLngExpression;
    title: string;
    description?: string;
  }>;
  height?: string;
  className?: string;
};

export function MapProvider({
  children,
  center,
  zoom,
  markers = [],
  height = '400px',
  className = '',
}: MapProviderProps) {
  return (
    <div style={{ height }} className={`rounded-lg overflow-hidden ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={marker.position}
            icon={DefaultIcon}
          >
            <Popup>
              <div>
                <h3 className="font-medium">{marker.title}</h3>
                {marker.description && <p className="text-sm">{marker.description}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
        
        <MapController />
        {children}
      </MapContainer>
    </div>
  );
}
