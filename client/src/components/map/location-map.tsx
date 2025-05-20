import { Project } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MapPin, Navigation, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { GoogleMapsLink } from "./google-maps-link";

interface LocationMapProps {
  projects: Project[];
  onAddLocation?: () => void;
}

export function LocationMap({ projects, onAddLocation }: LocationMapProps) {
  const [showCurrentLocation, setShowCurrentLocation] = useState(false);
  const [customCenter, setCustomCenter] = useState<{lat: number, lng: number} | null>(null);
  const { toast } = useToast();
  
  // Default to center of Ghana if no projects
  const defaultCenter = { lat: 5.5600, lng: -0.2057 }; // Accra, Ghana
  
  // Find an average center point for the projects if available
  const findMapCenter = () => {
    // If user has set their current location, use that
    if (customCenter) {
      return customCenter;
    }
    
    if (!projects.length) return defaultCenter;
    
    // If only one project, use its coordinates
    if (projects.length === 1) {
      const coords = projects[0].coordinates as { lat: number, lng: number };
      return coords;
    }
    
    // Calculate average of all locations
    let totalLat = 0;
    let totalLng = 0;
    
    projects.forEach(project => {
      const coords = project.coordinates as { lat: number, lng: number };
      totalLat += coords.lat;
      totalLng += coords.lng;
    });
    
    return {
      lat: totalLat / projects.length,
      lng: totalLng / projects.length
    };
  };
  
  // Prepare markers for the map
  const mapMarkers = projects.map(project => ({
    id: project.id,
    position: project.coordinates as { lat: number, lng: number },
    title: project.name,
    description: project.location
  }));
  
  const handleShowCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Error",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive"
      });
      return;
    }

    setShowCurrentLocation(true);
    toast({
      title: "Finding your location",
      description: "Please allow location access when prompted."
    });
  };

  const handleLocationFound = (location: {lat: number, lng: number}) => {
    setCustomCenter(location);
    toast({
      title: "Location found",
      description: "Map centered to your current location."
    });
  };
  
  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="flex justify-between items-center p-6">
        <CardTitle className="text-lg font-semibold text-gray-800">Site Locations</CardTitle>
        <div className="flex space-x-2">
          {onAddLocation && (
            <Button 
              onClick={onAddLocation}
              variant="ghost" 
              className="text-sm text-primary hover:text-primary-dark"
            >
              <PlusCircle className="w-4 h-4 mr-1" /> Add New
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* If showing a single project location, provide a direct Google Maps link */}
        {projects.length === 1 && (
          <div className="bg-gray-50 rounded-lg p-4 flex flex-col items-center">
            <div className="mb-4 text-center">
              <h3 className="font-medium">{projects[0].name}</h3>
              <p className="text-sm text-gray-500">{projects[0].location}</p>
            </div>
            
            <GoogleMapsLink 
              latitude={(projects[0].coordinates as {lat: number, lng: number}).lat}
              longitude={(projects[0].coordinates as {lat: number, lng: number}).lng}
              buttonText="View on Google Maps"
              showCoordinates={true}
              variant="default"
            />
          </div>
        )}

        {/* If showing multiple projects, list them with Google Maps links */}
        {projects.length > 1 && (
          <div className="space-y-3">
            {projects.map((project, index) => {
              const coordinates = project.coordinates as {lat: number, lng: number};
              return (
                <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-6 h-6 ${index === 0 ? 'bg-secondary' : 'bg-primary'} rounded-full flex items-center justify-center text-xs text-white mr-3`}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{project.name}</h4>
                      <p className="text-xs text-gray-500">{project.location}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary"
                    onClick={() => window.open(`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`, '_blank')}
                  >
                    <MapPin className="h-4 w-4 mr-1" /> 
                    Map
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
          
        {projects.length === 0 && (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium mb-2">No Locations Added</h3>
            <p className="text-gray-500 mb-4">
              Start by adding a construction site location
            </p>
            {onAddLocation && (
              <Button 
                onClick={onAddLocation}
                variant="default" 
              >
                <PlusCircle className="w-4 h-4 mr-1" /> Add First Location
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
