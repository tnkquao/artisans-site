import { MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleMapsLinkProps {
  latitude: number;
  longitude: number;
  label?: string;
  buttonText?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  showIcon?: boolean;
  showCoordinates?: boolean;
}

export function GoogleMapsLink({
  latitude,
  longitude,
  label = "View on Google Maps",
  buttonText = "Open in Google Maps",
  className = "",
  variant = "outline",
  showIcon = true,
  showCoordinates = false
}: GoogleMapsLinkProps) {
  // Generate Google Maps URL
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <div className="text-sm font-medium text-primary flex items-center">
        {showIcon && <MapPin className="mr-2 h-4 w-4" />}
        {label}
      </div>}
      
      {showCoordinates && (
        <div className="text-xs bg-gray-50 p-2 rounded-md border border-gray-100 mb-2 font-mono">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      )}
      
      <Button 
        variant={variant} 
        size="sm" 
        className="w-full shadow-sm hover:shadow-md transition-shadow duration-200"
        onClick={() => window.open(googleMapsUrl, '_blank')}
      >
        {showIcon && <MapPin className="mr-2 h-4 w-4" />}
        {buttonText}
        <ExternalLink className="ml-2 h-3 w-3" />
      </Button>
    </div>
  );
}

interface GoogleMapsStaticImageProps {
  latitude: number;
  longitude: number;
  width?: number;
  height?: number;
  zoom?: number;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

export function GoogleMapsStaticImage({
  latitude,
  longitude,
  width = 400,
  height = 200,
  zoom = 14,
  className = "",
  alt = "Map location",
  onClick
}: GoogleMapsStaticImageProps) {
  // Create location placeholder with coordinates display instead of actual Google Maps static image
  // (Google Maps Static API requires an API key and billing account)
  
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(googleMapsUrl, '_blank');
    }
  };
  
  return (
    <div 
      className={`relative bg-gray-50 border border-gray-100 shadow-sm rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors duration-200 ${className}`} 
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={handleClick}
    >
      <div className="absolute top-3 left-3 bg-white p-1.5 rounded-md shadow-sm">
        <MapPin className="h-5 w-5 text-primary" />
      </div>
      
      <MapPin className="h-8 w-8 text-primary mb-2 drop-shadow-sm" />
      <div className="text-sm font-medium">View on Google Maps</div>
      <div className="text-xs bg-white px-2 py-1 rounded-md shadow-sm mt-2 font-mono">
        {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </div>
      
      <div className="absolute bottom-3 right-3 bg-primary text-white p-1.5 rounded-full shadow-sm">
        <ExternalLink className="h-4 w-4" />
      </div>
    </div>
  );
}

export function MapCard({
  latitude,
  longitude,
  title,
  description,
  className = ""
}: {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  className?: string;
}) {
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  
  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      <div 
        className="h-40 bg-gray-100 flex flex-col items-center justify-center cursor-pointer relative"
        onClick={() => window.open(googleMapsUrl, '_blank')}
      >
        <MapPin className="h-8 w-8 text-primary mb-2" />
        <div className="text-sm font-medium">View on Google Maps</div>
        <div className="text-xs text-muted-foreground mt-1">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
        <div className="absolute bottom-2 right-2">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      {(title || description) && (
        <div className="p-4">
          {title && <h3 className="font-medium text-lg">{title}</h3>}
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      )}
    </div>
  );
}