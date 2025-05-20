import { useState, useEffect } from 'react';

type GeolocationPosition = {
  lat: number;
  lng: number;
};

type GeolocationState = {
  position: GeolocationPosition | null;
  error: string | null;
  loading: boolean;
};

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        position: null,
        error: "Geolocation is not supported by your browser",
        loading: false,
      });
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        position: {
          lat: position.lat,
          lng: position.lng,
        },
        error: null,
        loading: false,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      setState({
        position: null,
        error: error.message,
        loading: false,
      });
    };

    // Browser Geolocation API
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSuccess({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      onError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  return state;
}