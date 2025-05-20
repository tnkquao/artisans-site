import { useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useGeolocation } from './use-geolocation';

// Custom icon for current location
const CurrentLocationIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'current-location-marker'
});

interface CurrentLocationMarkerProps {
  onLocationFound?: (location: { lat: number; lng: number }) => void;
  panToLocation?: boolean;
}

export function CurrentLocationMarker({ 
  onLocationFound, 
  panToLocation = true 
}: CurrentLocationMarkerProps) {
  const map = useMap();
  const { position, error, loading } = useGeolocation();

  useEffect(() => {
    if (position && !loading) {
      if (onLocationFound) {
        onLocationFound(position);
      }
      
      if (panToLocation) {
        map.setView(position, 16);
      }
    }
  }, [position, loading, map, onLocationFound, panToLocation]);

  if (!position || loading) {
    return null;
  }

  return (
    <Marker 
      position={position} 
      icon={CurrentLocationIcon}
    >
      <Popup>
        <div>
          <h3 className="font-medium">Your Current Location</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Latitude: {position.lat.toFixed(6)}, Longitude: {position.lng.toFixed(6)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}