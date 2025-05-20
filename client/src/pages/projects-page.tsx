import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { ProjectCard } from "@/components/projects/project-card";
import { useAuth } from "@/hooks/use-auth";
import { Building2, Plus, Filter, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TryAgain } from "@/components/ui/try-again";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Project, User, insertProjectSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { FileUpload } from "@/components/ui/file-upload";
import { Attachment, useFileUpload } from "@/hooks/use-file-upload";

export default function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [filter, setFilter] = useState("all"); // all, in_progress, completed, pending
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Form schema for new project
  const newProjectSchema = insertProjectSchema
    .omit({ clientId: true, companyId: true })
    .extend({
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
      attachments: z.array(z.object({
        name: z.string(),
        url: z.string(),
        type: z.string(),
        size: z.number(),
      })).optional(),
    });

  // Fetch projects with explicit error handling and retry logic
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects,
    error: projectsError,
    refetch: refetchProjects,
    isError: isProjectsError
  } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 0, // Always refetch on mount
    refetchOnMount: true,
    retry: 3, // Increase retry attempts
    retryDelay: 1500, // Longer delay between retries to avoid rate limiting
    gcTime: 0, // Don't cache error responses
    
    // Enhanced query function with better error handling
    queryFn: async ({ signal }) => {
      if (!user || !user.id) {
        console.log("No authenticated user available, not fetching projects");
        throw new Error("Authentication required");
      }
      
      try {
        console.log("Fetching projects with authenticated user:", user.username);
        
        // Use a timestamp query parameter to prevent caching
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/projects?t=${timestamp}`, {
          method: "GET",
          credentials: "include",
          signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Requested-With': 'XMLHttpRequest' // Helps identify AJAX requests on the server
          }
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Projects fetch failed: ${res.status} - ${errorText}`);
          
          if (res.status === 401) {
            throw new Error("Authentication required");
          }
          
          throw new Error(`Error fetching projects: ${res.status} ${errorText}`);
        }
        
        const data = await res.json();
        console.log(`Successfully loaded ${data.length} projects`);
        return data;
      } catch (error) {
        console.error("Error in projects fetch:", error);
        // Re-throw to allow React Query's retry logic to work
        throw error;
      }
    }
  });
  
  // Fetch companies with improved error handling
  const { 
    data: companies = [], 
    isLoading: isLoadingCompanies,
  } = useQuery<User[]>({
    queryKey: ["/api/users/companies"],
    // Explicitly using apiRequest to handle credentials properly
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/users/companies");
        return await res.json();
      } catch (error) {
        console.error("Error fetching companies:", error);
        return [];
      }
    },
    retry: 2
  });
  
  // Transform companies array to record for easy lookup
  const companiesRecord = companies.reduce(
    (acc, company) => ({ ...acc, [company.id]: company }), 
    {} as Record<number, User>
  );
  
  // Enhanced authentication recovery system
  // Use refs to track recovery state
  const redirectInProgress = React.useRef(false);
  const recoveryAttempts = React.useRef(0);
  const lastRecoveryTime = React.useRef(0);
  const MAX_RECOVERY_ATTEMPTS = 3;
  const RECOVERY_COOLDOWN_MS = 10000; // 10 second cooldown between recovery attempts

  useEffect(() => {
    // If we have a projects error but user is supposedly logged in
    if (projectsError && user && !redirectInProgress.current) {
      // Check cooldown to prevent rapid recovery attempts
      const now = Date.now();
      if (now - lastRecoveryTime.current < RECOVERY_COOLDOWN_MS) {
        console.log(`Recovery on cooldown. Please wait ${Math.ceil((RECOVERY_COOLDOWN_MS - (now - lastRecoveryTime.current)) / 1000)} seconds.`);
        return;
      }
      
      // Check if we've hit the maximum recovery attempts
      const currentAttempt = recoveryAttempts.current;
      if (currentAttempt >= MAX_RECOVERY_ATTEMPTS) {
        console.log(`Exceeded max recovery attempts (${MAX_RECOVERY_ATTEMPTS}). Use the refresh button to try again.`);
        return;
      }
      
      console.log(`Projects error detected with logged in user. Recovery attempt ${currentAttempt + 1}/${MAX_RECOVERY_ATTEMPTS}`);
      recoveryAttempts.current += 1;
      lastRecoveryTime.current = now;
      
      // First try the new verification endpoint for a faster check
      fetch('/api/auth/verify', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Recovery-Attempt': String(currentAttempt + 1)
        }
      })
      .then(res => {
        if (res.ok) {
          // If auth is verified, try to refresh user data and projects
          console.log("Authentication verified with /api/auth/verify, fetching fresh user data");
          return fetch('/api/user', {
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
        } else {
          throw new Error("Authentication verification failed");
        }
      })
      .then(userRes => {
        if (!userRes || !userRes.ok) {
          throw new Error("User data fetch failed");
        }
        
        // Process user data to update the cache
        return userRes.json().then(userData => {
          console.log("User data refreshed successfully, updating cache and refetching projects");
          
          // Update local storage with fresh user data
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("userData", JSON.stringify(userData));
          
          // Update ReactQuery cache with fresh user data
          queryClient.setQueryData(['/api/user'], userData);
          
          // Delay slightly then refetch all relevant data
          setTimeout(() => {
            // Invalidate all queries to force a fresh fetch
            queryClient.invalidateQueries();
            
            // Specifically refetch projects
            refetchProjects().catch(err => {
              console.error("Error refetching projects after recovery:", err);
            });
          }, 500);
        });
      })
      .catch(error => {
        console.error("Recovery process error:", error.message);
        
        // Only proceed with redirect if not already in progress
        if (!redirectInProgress.current) {
          redirectInProgress.current = true;
          
          // For first attempt, just try to refresh the page
          if (currentAttempt === 0) {
            console.log("First recovery attempt failed, refreshing page");
            setTimeout(() => {
              window.location.reload();
            }, 300);
            return;
          }
          
          // For second attempt, try a manual auth verification but keep localStorage
          if (currentAttempt === 1) {
            console.log("Second recovery attempt failed, trying auth verification");
            fetch('/api/auth/verify', { 
              method: 'GET',
              credentials: 'include',
              cache: 'no-store'
            }).finally(() => {
              // Reload regardless of result
              window.location.reload();
            });
            return;
          }
          
          // Final attempt, clear storage and redirect to auth
          console.log("All recovery attempts failed, clearing auth state and redirecting to login");
          localStorage.removeItem("isLoggedIn");
          localStorage.removeItem("userData");
          localStorage.removeItem("lastLogin");
          
          // Clear query cache completely
          queryClient.clear();
          
          // Redirect to auth page
          window.location.href = '/auth';
        }
      });
    }
  }, [projectsError, user, refetchProjects, queryClient]);
  
  // Create project form
  const form = useForm<z.infer<typeof newProjectSchema>>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "residential",
      status: "pending",
      location: "",
      coordinates: {
        lat: 37.7749, // Default to San Francisco
        lng: -122.4194,
      },
    },
  });
  
  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: z.infer<typeof newProjectSchema>) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: (newProject: Project) => {
      queryClient.setQueryData(
        ["/api/projects"],
        (oldData: Project[] = []) => [...oldData, newProject]
      );
      
      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
      });
      
      setIsNewProjectOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle file upload complete
  const handleUploadComplete = (uploadedAttachments: Attachment[]) => {
    setAttachments(uploadedAttachments);
    form.setValue('attachments', uploadedAttachments);
  };
  
  // Handle form submission
  const onSubmit = (data: z.infer<typeof newProjectSchema>) => {
    // Add attachments to form data
    const formData = {
      ...data,
      attachments: attachments.length > 0 ? attachments : undefined
    };
    createProjectMutation.mutate(formData);
  };
  
  // Filter projects
  const filteredProjects = projects.filter(project => {
    if (filter === "all") return true;
    return project.status === filter;
  });
  
  return (
    <DashboardLayout title="My Projects">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3">
        <div className="flex items-center">
          <Building2 className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Projects</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
            </SelectContent>
          </Select>
          
          {user?.role === "client" && (
            <Button 
              onClick={() => setIsNewProjectOpen(true)} 
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          )}
        </div>
      </div>

      {isLoadingProjects ? (
        <div className="text-center py-6 sm:py-8">
          <div className="animate-spin w-8 h-8 sm:w-10 sm:h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3 sm:mb-4"></div>
          <p>Loading projects...</p>
        </div>
      ) : projectsError ? (
        <div className="flex justify-center py-6 sm:py-8">
          <TryAgain
            message={
              `Error loading projects: ${projectsError.message || "Authentication error. Please verify your login and try again."}`
            }
            onRetry={() => {
              // Check if we've already attempted recovery multiple times
              if (recoveryAttempts.current >= MAX_RECOVERY_ATTEMPTS) {
                // Clear local storage to force a clean login
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("userData");
                localStorage.removeItem("lastLogin");
                
                // Redirect to login page
                window.location.href = '/auth';
                return Promise.reject("Authentication required");
              }
              
              // Increment the recovery attempts counter
              recoveryAttempts.current += 1;
              
              // First try to check if we're still authenticated
              fetch('/api/user', {
                credentials: 'include',
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                }
              })
              .then(res => {
                if (res.ok) {
                  // If authenticated, try to refetch projects
                  setTimeout(() => {
                    console.log("Authentication verified, refetching projects via TryAgain component");
                    refetchProjects().catch(err => {
                      console.error("Error refetching projects:", err);
                    });
                  }, 1000);
                } else {
                  // If not authenticated, redirect to login
                  console.log("Authentication failed in TryAgain, redirecting to login");
                  window.location.href = '/auth';
                }
              })
              .catch(err => {
                console.error("Error checking authentication in TryAgain:", err);
                // Try to refetch anyway as a last resort
                refetchProjects().catch(() => {
                  // If refetch fails too, reload the page
                  window.location.reload();
                });
              });
            }}
            buttonText="Refresh Data"
          />
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project}
              company={project.companyId ? companiesRecord[project.companyId] : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 sm:py-10 bg-gray-50 rounded-lg border border-gray-200 px-3 sm:px-6">
          <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-500 mb-4 sm:mb-6">
            {filter !== "all" 
              ? `You don't have any ${filter.replace('_', ' ')} projects.` 
              : "Start by creating your first construction project."}
          </p>
          {user?.role === "client" && (
            <Button onClick={() => setIsNewProjectOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create New Project
            </Button>
          )}
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new construction project.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Riverside Commercial Plaza" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="residential">Residential Building</SelectItem>
                        <SelectItem value="commercial">Commercial Building</SelectItem>
                        <SelectItem value="industrial">Industrial Building</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe your construction project in detail"
                        rows={3} 
                      />
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
                    <FormLabel>Project Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 123 Business District, Downtown" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))} 
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
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Project files and images */}
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Files & Images</FormLabel>
                    <FormDescription>
                      Upload site plans, design documents, and reference images for your project.
                    </FormDescription>
                    <FormControl>
                      <FileUpload 
                        onUploadComplete={handleUploadComplete}
                        maxFiles={5}
                        maxSize={10}
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewProjectOpen(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
