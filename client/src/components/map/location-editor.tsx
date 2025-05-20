import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface LocationEditorProps {
  project: Project;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationEditor({ project, isOpen, onOpenChange }: LocationEditorProps) {
  const { toast } = useToast();
  const [location, setLocation] = useState(project.location || "");
  const [latitude, setLatitude] = useState((project.coordinates as any)?.lat?.toString() || "");
  const [longitude, setLongitude] = useState((project.coordinates as any)?.lng?.toString() || "");
  const [error, setError] = useState("");
  
  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async () => {
      // Validate inputs
      if (!location.trim()) {
        throw new Error("Location name is required");
      }
      
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error("Latitude and longitude must be valid numbers");
      }
      
      if (lat < -90 || lat > 90) {
        throw new Error("Latitude must be between -90 and 90");
      }
      
      if (lng < -180 || lng > 180) {
        throw new Error("Longitude must be between -180 and 180");
      }
      
      const response = await apiRequest("PUT", `/api/projects/${project.id}/location`, {
        location: location.trim(),
        coordinates: { lat, lng }
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate project query to refresh location
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
      
      // Close dialog
      onOpenChange(false);
      
      toast({
        title: "Location updated",
        description: "Project location has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Function to get current GPS location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    
    toast({
      title: "Getting location",
      description: "Please allow location access when prompted.",
    });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        toast({
          title: "Location detected",
          description: "Your current location has been set.",
        });
      },
      (error) => {
        setError(`Error getting location: ${error.message}`);
        toast({
          title: "Location error",
          description: error.message,
          variant: "destructive",
        });
      }
    );
  };
  
  const handleSave = () => {
    setError("");
    updateLocationMutation.mutate();
  };
  
  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Reset form when opening
      setLocation(project.location || "");
      setLatitude((project.coordinates as any)?.lat?.toString() || "");
      setLongitude((project.coordinates as any)?.lng?.toString() || "");
      setError("");
    }
    onOpenChange(open);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Project Location</DialogTitle>
          <DialogDescription>
            Update the location details for this construction project.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 text-red-800 px-4 py-2 rounded-md flex items-center text-sm">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="location">Location Name</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Accra, East Legon"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g., 5.5600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g., -0.2057"
              />
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={getCurrentLocation}
            type="button"
            className="w-full"
          >
            <MapPin className="mr-2 h-4 w-4" /> Use Current Location
          </Button>
          
          {latitude && longitude && (
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span className="font-medium">Coordinates set</span>
              </div>
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs"
              >
                Verify on Google Maps
              </a>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateLocationMutation.isPending}
          >
            {updateLocationMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}