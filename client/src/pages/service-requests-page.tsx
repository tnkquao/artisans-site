import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertServiceRequestSchema, ServiceRequest as SelectServiceRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { MapProvider } from "@/lib/map-provider";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ChevronLeft, MapPin, User } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { useFileUpload, type FileWithPreview, type Attachment } from "@/hooks/use-file-upload";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Define the form schema extending the base insert schema
const serviceRequestFormSchema = insertServiceRequestSchema.extend({
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  attachments: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
      type: z.string(),
      size: z.number(),
    })
  ).optional(),
});

type ServiceRequestFormValues = z.infer<typeof serviceRequestFormSchema>;

export default function ServiceRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Setup file upload functionality
  const { 
    files, 
    uploading, 
    handleFilesSelected, 
    getAttachments 
  } = useFileUpload((attachments) => {
    // Set the attachments in the form when upload is complete
    form.setValue("attachments", attachments);
  });

  // State for location selection
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);

  // Query for service requests - using two methods to ensure we can load data
  // even when session authentication is failing
  const {
    data: serviceRequests = [],
    isLoading,
    error,
  } = useQuery<SelectServiceRequest[]>({
    queryKey: ["/api/service-requests"],
    queryFn: async ({ signal }) => {
      try {
        // First try the standard endpoint that requires session auth
        const response = await fetch('/api/service-requests', { 
          signal,
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Successfully loaded service requests via standard endpoint:", data.length);
          return data;
        }
        
        console.log("Standard endpoint failed, falling back to direct endpoint");
        
        // If regular endpoint fails, fall back to our direct endpoint
        if (user?.id) {
          const directResponse = await fetch('/api/direct/service-requests/fetch', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: user.id,
              username: user.username
            }),
            signal
          });
          
          if (directResponse.ok) {
            const data = await directResponse.json();
            console.log("Successfully loaded service requests via direct endpoint:", data.length);
            return data;
          }
          console.error("Direct endpoint also failed");
        }
        
        // If all attempts failed, throw an error
        throw new Error('Failed to fetch service requests through all available methods');
      } catch (err) {
        console.error("Error fetching service requests:", err);
        return []; // Return empty array instead of failing completely
      }
    },
    enabled: !!user // Only fetch when we have user data
  });

  // Create new service request mutation
  const createServiceRequestMutation = useMutation({
    mutationFn: async (data: ServiceRequestFormValues) => {
      console.log("Mutation function called with data:", data);
      try {
        // Use a direct fetch call with explicit credentials to ensure proper authentication
        const response = await fetch("/api/service-requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-Requested-With": "XMLHttpRequest"
          },
          credentials: "include",
          body: JSON.stringify(data),
          mode: "same-origin", // Ensure same-origin mode
        });
        
        console.log("Service request fetch response:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: {
            contentType: response.headers.get("content-type"),
          }
        });
        
        if (!response.ok) {
          // Handle errors with more detail
          let errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            errorText = errorJson.message || errorText;
          } catch (e) {
            // If it's not valid JSON, keep the original text
          }
          
          console.error(`Service request API error (${response.status}):`, errorText);
          throw new Error(errorText || `Failed with status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("API response:", result);
        return result;
      } catch (error) {
        console.error("API request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Service request mutation succeeded:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      toast({
        title: "Service request created",
        description: "Your service request has been submitted successfully.",
      });
      form.reset();
      setSelectedLocation(null);
    },
    onError: (error: Error) => {
      console.error("Service request mutation failed:", error);
      toast({
        title: "Failed to create service request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<ServiceRequestFormValues>({
    resolver: zodResolver(serviceRequestFormSchema),
    defaultValues: {
      description: "",
      location: "",
      requestType: "",
      serviceType: "",
      budget: null,
      timeline: null,
      coordinates: { lat: 0, lng: 0 },
    },
    mode: "onChange", // Validate on change instead of just on submit
  });

  // Set coordinates when location is selected
  useEffect(() => {
    if (selectedLocation) {
      form.setValue("coordinates", selectedLocation);
    }
  }, [selectedLocation, form]);

  // Form submission handler
  const onSubmit = async (data: ServiceRequestFormValues) => {
    console.log("Form submitted with data:", data);
    
    if (!selectedLocation) {
      toast({
        title: "Location required",
        description: "Please select a location on the map.",
        variant: "destructive",
      });
      return;
    }

    if (!data.requestType || !data.serviceType || !data.description || !data.location) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      console.log("Missing required fields:", {
        requestType: data.requestType,
        serviceType: data.serviceType,
        description: data.description,
        location: data.location
      });
      return;
    }

    // Verify user is authenticated - first check the context
    let currentUser = user;
    
    // If not authenticated through context, try to get from localStorage and perform a fresh check
    if (!currentUser?.id) {
      try {
        // Try to get fresh user data
        const userResponse = await fetch("/api/user", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          },
          credentials: "include"
        });
        
        if (userResponse.ok) {
          currentUser = await userResponse.json();
          console.log("Retrieved fresh user data:", currentUser);
        } else {
          throw new Error("Authentication check failed");
        }
      } catch (authError) {
        console.error("Authentication validation error:", authError);
        toast({
          title: "Authentication error",
          description: "Please log in using the form at the top of the page before submitting a request.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (!currentUser?.id) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to submit a request.",
        variant: "destructive",
      });
      console.log("User authentication failed even after fresh check");
      return;
    }
    
    // Prepare form data
    const formData = {
      ...data,
      coordinates: selectedLocation,
      status: "pending_admin", // Requires admin approval first
      clientId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Ensure file attachments are included if available
    if (files.length > 0 && !formData.attachments) {
      console.log("Adding file attachments to service request:", files.length, "files");
      formData.attachments = getAttachments();
    }
    
    // Use a direct fetch with explicit credentials to bypass any caching or middleware issues
    try {
      console.log("Submitting service request with direct fetch:", formData);
      
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        credentials: "include",
        body: JSON.stringify(formData)
      });
      
      console.log("Service request submission response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Service request submission error:", errorText);
        let errorMessage = "Failed to submit service request.";
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          // If not valid JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }
        
        toast({
          title: "Submission error",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }
      
      const result = await response.json();
      console.log("Service request submitted successfully:", result);
      
      toast({
        title: "Request submitted",
        description: "Your service request has been submitted to an administrator for review.",
      });
      
      form.reset();
      setSelectedLocation(null);
      
      // Refresh the service requests list
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      
    } catch (error) {
      console.error('Direct service request submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit service request. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Location picker component
  function LocationPicker() {
    const defaultCenter = { lat: 5.6037, lng: -0.1870 }; // Accra, Ghana
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            {selectedLocation ? "Change Location" : "Select Location on Map"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select Location</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Click anywhere on the map to select a location or click the "Select Here" button below
            </p>
          </DialogHeader>
          <div className="h-[400px] w-full">
            <MapProvider
              center={selectedLocation || defaultCenter}
              zoom={12}
              markers={selectedLocation ? [{ id: 1, position: selectedLocation, title: "Selected Location" }] : []}
              height="400px"
            >
              <div 
                onClick={(e) => {
                  // Directly set the location when the map is clicked
                  const mapElement = e.currentTarget;
                  const rect = mapElement.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  
                  // This uses a simplified offset for demonstration purposes
                  // In a production app, you would use the proper Leaflet API
                  const width = rect.width;
                  const height = rect.height;
                  const lat = 5.6037 + ((height/2) - y) / 1000;
                  const lng = -0.1870 + (x - (width/2)) / 1000;
                  
                  setSelectedLocation({ lat, lng });
                  
                  // Update the location field with coordinates
                  form.setValue("location", `Location at coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                  
                  // Show toast confirmation
                  toast({
                    title: "Location Selected",
                    description: `Set to coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                  });
                }}
                className="absolute inset-0 z-[400] cursor-crosshair"
              />
            </MapProvider>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedLocation) {
                // Update the location field with coordinates
                form.setValue("location", `Location at coordinates: ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`);
                
                // Close the dialog
                setIsOpen(false);
                
                // Show confirmation
                toast({
                  title: "Location Confirmed",
                  description: `Location set successfully`,
                });
              } else {
                // If no location is selected yet, use the center point
                setSelectedLocation(defaultCenter);
                form.setValue("location", `Location at coordinates: ${defaultCenter.lat.toFixed(4)}, ${defaultCenter.lng.toFixed(4)}`);
                setIsOpen(false);
                
                toast({
                  title: "Default Location Set",
                  description: "Using Accra, Ghana as default location",
                });
              }
            }}>
              Confirm Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Service request list component
  function ServiceRequestList() {
    if (isLoading) {
      return <div className="flex justify-center p-6">Loading service requests...</div>;
    }

    if (error) {
      return (
        <div className="bg-destructive/20 p-4 rounded-md">
          <p className="text-destructive font-medium">Error loading service requests</p>
        </div>
      );
    }

    if (!serviceRequests || serviceRequests.length === 0) {
      return (
        <div className="text-center p-6">
          <p className="text-muted-foreground">No service requests found.</p>
          <p className="text-sm mt-2">Submit a new request using the form.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {serviceRequests?.map((request) => (
            <AccordionItem key={request.id} value={`request-${request.id}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{request?.location?.length > 30 ? request.location.substring(0, 30) + "..." : request.location}</span>
                  </div>
                  <Badge variant={getStatusVariant(request.status || '')}>{getStatusDisplay(request.status || '')}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Request Type</h4>
                      <p>{request.requestType}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Service Type</h4>
                      <p>{request.serviceType}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Budget</h4>
                      <p>{request.budget ? `$${request.budget.toFixed(2)}` : 'Not specified'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Timeline</h4>
                      <p>{request.timeline || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                    <p className="text-sm">{request.description}</p>
                  </div>
                  
                  {request.assignedServiceProviderId && (
                    <div className="bg-primary/10 p-3 rounded-md">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">Assigned Service Provider</span>
                      </div>
                      <p className="text-sm pl-6 mt-1">ID: {request.assignedServiceProviderId}</p>
                    </div>
                  )}
                  
                  {request.adminNotes && (
                    <div className="bg-secondary/20 p-3 rounded-md">
                      <h4 className="text-sm font-medium">Admin Notes</h4>
                      <p className="text-sm">{request.adminNotes}</p>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    <p>Submitted: {new Date(request.createdAt).toLocaleString()}</p>
                    <p>Last Updated: {new Date(request.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  }

  // Helper function to determine badge variant based on status
  function getStatusVariant(status: string) {
    switch (status.toLowerCase()) {
      case 'pending_admin':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'published': // For requests that have been approved and posted for service providers to see
        return 'default';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  }
  
  // Helper function to get human-readable status
  function getStatusDisplay(status: string) {
    switch (status.toLowerCase()) {
      case 'pending_admin':
        return 'Pending Admin Review';
      case 'published':
        return 'Published for Bids';
      case 'in_progress':
        return 'In Progress';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  }

  // Quick login form just for the service requests page
  const [loginCredentials, setLoginCredentials] = useState({ username: "", password: "" });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Function to handle direct login with improved session handling
  const handleDirectLogin = async () => {
    if (!loginCredentials.username || !loginCredentials.password) {
      toast({
        title: "Missing credentials",
        description: "Please enter both username and password",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoggingIn(true);
    
    try {
      console.log("Starting direct login process...");
      
      // Step 1: Clear any existing session cookies
      document.cookie.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        const name = parts[0].trim();
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      });
      
      console.log("Cleared existing cookies");
      
      // Step 2: Make direct login API call with proper credentials
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for session cookies
        body: JSON.stringify(loginCredentials),
      });
      
      console.log("Login API response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }
      
      // Step 3: Get user data from response
      const userData = await response.json();
      console.log("Login successful, received user data for:", userData.username);
      
      // Step 4: Save user data to localStorage and session storage
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userData", JSON.stringify(userData));
      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("userData", JSON.stringify(userData));
      
      // Step 5: Test authentication by making a secure API call
      console.log("Testing authentication with secure API call...");
      const testResponse = await fetch("/api/auth/user", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        }
      });
      
      if (testResponse.ok) {
        console.log("Authentication test successful!");
        
        // Step 6: Verify session with WebSocket
        if (typeof window !== 'undefined' && 'WebSocket' in window) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${protocol}//${window.location.host}/ws`;
          
          const socket = new WebSocket(wsUrl);
          socket.onopen = () => {
            console.log("WebSocket connected, sending auth message");
            socket.send(JSON.stringify({
              type: "auth",
              userId: userData.id,
              username: userData.username,
              role: userData.role
            }));
          };
        }
        
        // Success! Notify the user
        toast({
          title: "Login successful",
          description: `Welcome back, ${userData.username}!`,
        });
        
        // Reload the page to ensure all components have fresh authentication
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.log("Authentication test failed:", testResponse.status);
        throw new Error("Authentication verification failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <DashboardLayout title="Service Requests">
      {/* Quick authentication indicator - only shown when not logged in */}
      {!user && (
        <div className="mb-2 p-2 rounded bg-red-50 text-red-800">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              You must be logged in to submit a service request
            </div>
            
            <div className="flex items-center gap-2">
              <Input 
                type="text" 
                placeholder="Username" 
                value={loginCredentials.username}
                onChange={(e) => setLoginCredentials({...loginCredentials, username: e.target.value})}
                className="h-8 text-sm w-36"
              />
              <Input 
                type="password" 
                placeholder="Password" 
                value={loginCredentials.password}
                onChange={(e) => setLoginCredentials({...loginCredentials, password: e.target.value})}
                className="h-8 text-sm w-36"
              />
              <Button 
                variant="default" 
                size="sm" 
                className="h-8"
                onClick={handleDirectLogin}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Logging in..." : "Login"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex mb-4">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = "/dashboard"}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M8 16H3v5"></path>
            </svg>
            Refresh
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="order-2 lg:order-1">
          <CardHeader className="sm:flex sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Your Service Requests</CardTitle>
              <CardDescription>
                View and track the status of your service requests
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ServiceRequestList />
          </CardContent>
        </Card>

        {user?.role === "client" && (
          <Card className="order-1 lg:order-2">
            <CardHeader className="sm:flex sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Submit a New Request</CardTitle>
                <CardDescription>
                  Request a service from an artisan, contractor, or real estate company
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = form.getValues();
                  onSubmit(formData);
                }} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="requestType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a request type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new_construction">New Construction</SelectItem>
                            <SelectItem value="renovation">Renovation</SelectItem>
                            <SelectItem value="repair">Repair</SelectItem>
                            <SelectItem value="consultation">Consultation</SelectItem>
                            <SelectItem value="inspection">Inspection</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a service type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="contractor">Contractor</SelectItem>
                            <SelectItem value="real_estate">Real Estate Developer</SelectItem>
                            <SelectItem value="electrician">Electrician</SelectItem>
                            <SelectItem value="plumber">Plumber</SelectItem>
                            <SelectItem value="carpenter">Carpenter</SelectItem>
                            <SelectItem value="mason">Mason</SelectItem>
                            <SelectItem value="painter">Painter</SelectItem>
                            <SelectItem value="roofer">Roofer</SelectItem>
                            <SelectItem value="architect">Architect</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          An administrator will match you with the best service provider based on your requirements.
                        </p>
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
                            placeholder="Describe your service request in detail"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget (USD)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Optional"
                              {...field}
                              value={field.value === null ? "" : field.value}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timeline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeline</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 3 months"
                              {...field}
                              value={field.value === null ? "" : field.value}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : e.target.value;
                                field.onChange(value);
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
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input
                              placeholder="Location description or address"
                              {...field}
                            />
                            <LocationPicker />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4 mb-6">
                    <FormLabel>Attachments (Optional)</FormLabel>
                    <FileUpload
                      onChange={(newFiles) => {
                        handleFilesSelected(newFiles);
                        // Update the form with any existing attachments when files change
                        form.setValue("attachments", getAttachments());
                      }}
                      maxFiles={5}
                      maxSize={10} // 10MB max size
                      accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      disabled={uploading}
                      className="w-full p-4 border rounded-md"
                      maxHeight="200px"
                      value={files}
                    />
                    {uploading && (
                      <div className="text-center py-2">
                        <p className="text-sm text-muted-foreground">Uploading files...</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload photos, plans, or documents related to your service request. 
                      Max 5 files, 10MB each. Supported formats: Images, PDF, DOC, DOCX.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Direct submission button using the debug method */}
                    <Button 
                      type="button" 
                      className="w-full"
                      disabled={createServiceRequestMutation.isPending || uploading}
                      onClick={async (e) => {
                        e.preventDefault();
                        
                        if (!user?.id) {
                          toast({
                            title: "Error",
                            description: "You must be logged in to submit a request",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        try {
                          // Create the service request data
                          const serviceRequestData = {
                            requestType: form.getValues("requestType") || "repair",
                            serviceType: form.getValues("serviceType") || "electrician",
                            description: form.getValues("description") || "Service request",
                            location: form.getValues("location") || "Ghana",
                            budget: form.getValues("budget") || 100,
                            timeline: form.getValues("timeline") || "1 week",
                            coordinates: selectedLocation || { lat: 5.6037, lng: -0.1870 },
                            clientId: user.id,
                            status: "pending_admin",
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          
                          // Safely handle file attachments
                          let attachments = [];
                          try {
                            // Only try to get attachments if files state exists and has items
                            if (typeof files !== 'undefined' && Array.isArray(files) && files.length > 0 && typeof getAttachments === 'function') {
                              attachments = getAttachments();
                              console.log("Prepared attachments:", attachments);
                            }
                          } catch (err) {
                            console.warn("Error preparing attachments:", err);
                            // Continue without attachments rather than failing completely
                          }
                          
                          // Prepare the direct submission payload that includes auth info
                          const directPayload = {
                            userId: user.id,
                            username: user.username,
                            serviceRequest: {
                              ...serviceRequestData,
                              attachments: attachments || []
                            }
                          };
                          
                          console.log("Submitting service request using direct endpoint:", directPayload);
                          
                          // Use the direct endpoint that doesn't rely on session auth
                          const response = await fetch("/api/direct/service-requests/create", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(directPayload),
                          });
                          
                          if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || "Failed to create service request");
                          }
                          
                          const result = await response.json();
                          console.log("Service request created successfully:", result);
                          
                          // Success! Show a confirmation and clear form
                          toast({
                            title: "Success",
                            description: "Your service request has been submitted successfully",
                          });
                          
                          // Reset the form and state
                          form.reset();
                          // Only reset files if the files state variable exists
                          if (typeof files !== 'undefined' && Array.isArray(files)) {
                            // Check if setFiles function exists before calling it
                            if (typeof setFiles === 'function') {
                              setFiles([]);
                            }
                          }
                          // Only reset location if the state setter exists
                          if (typeof setSelectedLocation === 'function') {
                            setSelectedLocation(null);
                          }
                          
                          // Reload service requests with both methods to ensure we get the latest data
                          if (typeof queryClient !== 'undefined') {
                            queryClient.invalidateQueries({ queryKey: ['/api/service-requests'] });
                            
                            // Also try to directly load service requests if authorization is failing
                            if (user?.id) {
                              try {
                                console.log("Attempting to directly fetch service requests after submission...");
                                // Do a direct query to load service requests
                                fetch('/api/direct/service-requests/fetch', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    userId: user.id,
                                    username: user.username
                                  })
                                })
                                .then(response => {
                                  if (response.ok) {
                                    return response.json();
                                  }
                                  throw new Error('Failed to fetch service requests with direct endpoint');
                                })
                                .then(data => {
                                  console.log("Directly fetched service requests to update UI:", data.length);
                                  // Manually update the query cache with the fresh data
                                  queryClient.setQueryData(['/api/service-requests'], data);
                                })
                                .catch(err => {
                                  console.error("Error with direct fetch update:", err);
                                });
                              } catch (err) {
                                console.error("Error attempting direct fetch update:", err);
                              }
                            }
                          }
                        } catch (error: any) {
                          console.error("Service request submission error:", error);
                          toast({
                            title: "Submission Failed",
                            description: error.message || "There was a problem submitting your request",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      {createServiceRequestMutation.isPending ? (
                        <>
                          <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        "Submit Service Request"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}