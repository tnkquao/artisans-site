import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { LocationMap } from "@/components/map/location-map";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, Plus, Search, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Project, insertProjectSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { GoogleMapsLink, MapCard } from "@/components/map/google-maps-link";

export default function LocationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number }>({
    lat: 5.5600, // Default to Accra, Ghana
    lng: -0.2057,
  });

  // Form schema for new location/project
  const newLocationSchema = insertProjectSchema
    .omit({ clientId: true, companyId: true })
    .extend({
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    });

  // Fetch projects
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Project/location form
  const form = useForm<z.infer<typeof newLocationSchema>>({
    resolver: zodResolver(newLocationSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "residential",
      status: "pending",
      location: "",
      coordinates: selectedLocation,
    },
  });

  // Update form when selected location changes
  useState(() => {
    form.setValue("coordinates", selectedLocation);
  });

  // Create project/location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof newLocationSchema>) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: (newProject: Project) => {
      queryClient.setQueryData(
        ["/api/projects"],
        (oldData: Project[] = []) => [...oldData, newProject]
      );
      
      toast({
        title: "Location added",
        description: "Your new site location has been added successfully.",
      });
      
      setIsAddLocationOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding location",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof newLocationSchema>) => {
    data.coordinates = selectedLocation;
    createLocationMutation.mutate(data);
  };

  // Filter projects by search term
  const filteredProjects = projects.filter(project => {
    if (searchTerm) {
      return (
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  // Function to handle getting user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Error",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Finding your location",
      description: "Please allow location access when prompted."
    });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedLocation({ lat: latitude, lng: longitude });
        form.setValue("coordinates", { lat: latitude, lng: longitude });
        
        toast({
          title: "Location found",
          description: "Map coordinates updated to your current location."
        });
      },
      (error) => {
        toast({
          title: "Location Error",
          description: error.message,
          variant: "destructive"
        });
      }
    );
  }

  return (
    <DashboardLayout title="Site Locations">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <MapPin className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">Construction Site Locations</h1>
        </div>
        
        {user?.role === "client" && (
          <Button onClick={() => setIsAddLocationOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add New Location
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* All Locations Map */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <CardTitle>Construction Sites Map</CardTitle>
                <CardDescription>View all your project locations</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search locations..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px]">
                <LocationMap projects={filteredProjects} onAddLocation={() => setIsAddLocationOpen(true)} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location List */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Site Locations</CardTitle>
              <CardDescription>List of all your construction sites</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProjects ? (
                <div className="text-center py-8">
                  <p>Loading locations...</p>
                </div>
              ) : projectsError ? (
                <div className="text-center py-8 text-red-600">
                  <p>Error loading locations. Please try again.</p>
                </div>
              ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((project) => {
                    const coordinates = project.coordinates as { lat: number; lng: number };
                    return (
                      <Card key={project.id} className="overflow-hidden">
                        <div className="h-40 relative">
                          <div 
                            className="h-full bg-gray-100 flex flex-col items-center justify-center cursor-pointer"
                            onClick={() => window.open(`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`, '_blank')}
                          >
                            <MapPin className="h-8 w-8 text-primary mb-1" />
                            <div className="text-sm font-medium">View on Google Maps</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                            </div>
                            <div className="absolute bottom-2 right-2">
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium text-lg">{project.name}</h3>
                          <p className="text-sm text-gray-500">{project.location}</p>
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <span className="mr-2">Type: {project.type.charAt(0).toUpperCase() + project.type.slice(1)}</span>
                            <span>Status: {project.status.replace('_', ' ').charAt(0).toUpperCase() + project.status.replace('_', ' ').slice(1)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No locations found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm
                      ? "No locations match your search criteria."
                      : "Add your first construction site location to get started."}
                  </p>
                  {user?.role === "client" && (
                    <Button onClick={() => setIsAddLocationOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Add New Location
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Location Dialog */}
      <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Site Location</DialogTitle>
            <DialogDescription>
              Pin your construction site on the map and provide details.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-gray-100 h-[250px] flex flex-col items-center justify-center rounded-md overflow-hidden mb-4">
            <div className="text-center mb-4">
              <p className="font-medium">Selected Location</p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={getCurrentLocation}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Use My Location
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.open(`https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lng}`, '_blank')}
              >
                <MapPin className="mr-2 h-4 w-4" />
                Preview on Google Maps
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            Use the "Use My Location" button or enter coordinates manually below.
          </p>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Riverside Commercial Plaza" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 123 Business District, Downtown" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="coordinates.lat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001"
                          value={selectedLocation.lat}
                          onChange={(e) => {
                            const newLat = parseFloat(e.target.value);
                            setSelectedLocation(prev => ({ ...prev, lat: newLat }));
                            field.onChange(newLat);
                          }} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="coordinates.lng"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001"
                          value={selectedLocation.lng}
                          onChange={(e) => {
                            const newLng = parseFloat(e.target.value);
                            setSelectedLocation(prev => ({ ...prev, lng: newLng }));
                            field.onChange(newLng);
                          }} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <FormControl>
                      <select 
                        {...field}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="residential">Residential Building</option>
                        <option value="commercial">Commercial Building</option>
                        <option value="industrial">Industrial Building</option>
                        <option value="infrastructure">Infrastructure</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Provide details about this construction site"
                        rows={3} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddLocationOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createLocationMutation.isPending}
                >
                  {createLocationMutation.isPending ? "Adding..." : "Add Location"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
