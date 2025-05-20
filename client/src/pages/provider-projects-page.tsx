import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { ExtendedProject } from "@shared/schema";

// Custom interface to handle both camelCase and snake_case formats
interface ProjectWithTeamMember extends ExtendedProject {
  // Direct API format
  created_at?: string;  
  isTeamMember?: boolean;
  role?: string;
}
import { 
  BarChart3, 
  Building2,
  Calendar,
  CheckCircle,
  Eye,
  FileEdit,
  Filter,
  Home,
  Loader2,
  MapPin,
  Plus,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { Project } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { createPortal } from "react-dom";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProviderProjectsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("newest");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Redirect if not a service provider
  useEffect(() => {
    if (user && user.role !== 'service_provider') {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Fetch projects assigned to the service provider
  const { toast } = useToast();
  const [isDirectLoading, setIsDirectLoading] = useState(false);
  const [directError, setDirectError] = useState<Error | null>(null);
  
  // Regular API fetch via React Query
  const { 
    data: projects = [], 
    isLoading: isLoadingQuery,
    error: queryError,
    refetch: refetchProjects
  } = useQuery<ExtendedProject[]>({
    queryKey: ["/api/projects"],
    staleTime: 30000, // Cache for 30 seconds
    enabled: !!user && user.role === 'service_provider',
  });
  
  // Always use direct API regardless of regular API success
  const [directProjects, setDirectProjects] = useState<ProjectWithTeamMember[]>([]);
  
  // Using direct API to fetch all projects including team member projects
  useEffect(() => {
    // Create a ref for loading state to prevent excessive state updates
    const loading = { current: false };
    
    // Track if component is mounted to prevent state updates after unmounting
    let isMounted = true;
    
    const fetchFromDirectApi = async () => {
      // Prevent multiple simultaneous requests
      if (loading.current || !user || !isMounted) return;
      
      loading.current = true;
      setIsDirectLoading(true);
      setDirectError(null);
      
      try {
        console.log('Fetching projects via direct API');
        
        const response = await apiRequest("POST", "/api/provider-projects-direct", {
          userId: user.id,
          username: user.username,
          role: user.role
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Direct API error response:', errorData);
          throw new Error(errorData.message || 'Failed to fetch projects directly');
        }
        
        const fetchedProjects = await response.json();
        
        // Only update state if component is still mounted
        if (fetchedProjects && fetchedProjects.length && isMounted) {
          console.log(`Fetched ${fetchedProjects.length} projects via direct API`);
          setDirectProjects(fetchedProjects);
          
          // Count team member projects only if we're still mounted
          if (isMounted) {
            const teamMemberCount = fetchedProjects.filter((p: ProjectWithTeamMember) => p.isTeamMember).length;
            const mainContractorCount = fetchedProjects.filter((p: ProjectWithTeamMember) => !p.isTeamMember).length;
            
            // Only show toast on first load
            if (directProjects.length === 0) {
              toast({
                title: "Projects loaded successfully",
                description: `Found ${mainContractorCount} projects as contractor and ${teamMemberCount} as team member.`,
                variant: "default"
              });
            }
          }
        }
      } catch (error) {
        // Only update error state if still mounted
        if (isMounted) {
          console.error('Direct API error:', error);
          setDirectError(error as Error);
          toast({
            title: "Error loading projects",
            description: (error as Error).message,
            variant: "destructive"
          });
        }
      } finally {
        // Always reset loading state
        loading.current = false;
        
        // Only update loading state if still mounted
        if (isMounted) {
          setIsDirectLoading(false);
        }
      }
    };
    
    // Only fetch once when the component mounts with a valid user
    fetchFromDirectApi();
    
    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
    };
  }, [user]);  // IMPORTANT: only depend on user, not toast or any other state
  
  // Combine loading and error states
  const isLoadingProjects = isLoadingQuery || isDirectLoading;
  const projectsError = queryError || directError;

  // Always use direct projects as they include team memberships correctly
  const combinedProjects: ProjectWithTeamMember[] = 
    directProjects.length > 0 ? directProjects : projects as ProjectWithTeamMember[];
  
  // Filter projects based on search term and status
  const filteredProjects = combinedProjects ? combinedProjects.filter((project) => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      project.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  }) : [];

  // Sort projects based on selected option
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch(sortOption) {
      case "newest":
        return new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime();
      case "oldest":
        return new Date(a.createdAt || a.created_at).getTime() - new Date(b.createdAt || b.created_at).getTime();
      case "name":
        return a.name.localeCompare(b.name);
      case "progress":
        return b.progress - a.progress;
      default:
        return 0;
    }
  });
  
  // Get status badge based on project status
  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Active</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'on_hold':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">On Hold</Badge>;
      case 'delayed':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Delayed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <DashboardLayout title="My Projects">
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading user data...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Projects">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Building2 className="mr-2 h-6 w-6" />
          My Projects
        </h1>
        
        <Button
          onClick={() => setLocation('/create-project')}
        >
          <Plus className="mr-2 h-4 w-4" /> Create New Project
        </Button>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{combinedProjects?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {combinedProjects?.filter((p: ProjectWithTeamMember) => 
                p.status === 'active' || 
                p.status === 'in_progress'
              )?.length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {combinedProjects?.filter((p: ProjectWithTeamMember) => p.status === 'completed')?.length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {combinedProjects?.length ? 
                Math.round(combinedProjects.reduce((sum, p: ProjectWithTeamMember) => sum + p.progress, 0) / combinedProjects.length) + '%' 
                : '0%'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="grid gap-2 flex-1">
              <label htmlFor="search" className="text-sm font-medium">
                Search Projects
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="search"
                  placeholder="Search by name or location..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid gap-2 w-full md:w-48">
              <label htmlFor="status-filter" className="text-sm font-medium">
                Status
              </label>
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2 w-full md:w-48">
              <label htmlFor="sort" className="text-sm font-medium">
                Sort By
              </label>
              <Select 
                value={sortOption} 
                onValueChange={setSortOption}
              >
                <SelectTrigger id="sort">
                  <SelectValue placeholder="Sort projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="progress">Progress (High-Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Project Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingProjects ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading projects...</p>
                  </TableCell>
                </TableRow>
              ) : projectsError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-destructive">
                    Error loading projects: {(projectsError as Error).message}
                    <div className="mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => refetchProjects()}
                      >
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedProjects.length > 0 ? (
                sortedProjects.map((project) => (
                  <TableRow key={project.id} className="group hover:bg-muted/50">
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        {project.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={project.progress} className="h-2" />
                        <span className="text-xs text-muted-foreground">{project.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(project.status)}</TableCell>
                    <TableCell>{format(new Date(project.createdAt || project.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {project.isTeamMember ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                          Team Member
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                          Contractor
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs px-2 hidden group-hover:flex items-center"
                          asChild
                        >
                          <Link to={`/projects/${project.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs px-2 hidden group-hover:flex items-center"
                          asChild
                        >
                          <Link to={`/projects/${project.id}/edit`}>
                            <FileEdit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' ? 
                      "No projects match your filters" : 
                      "No projects found. Create your first project to get started."
                    }
                    {!searchTerm && statusFilter === 'all' && (
                      <div className="mt-4">
                        <Button 
                          onClick={() => setLocation('/create-project')}
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Create Project
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}