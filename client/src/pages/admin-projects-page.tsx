import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminDashboardLayout from "@/components/admin/admin-dashboard-layout";
import { useDirectAdminAuth } from "@/hooks/use-direct-admin-auth";
import { Project } from "@shared/schema";
import { Loader2, Search, Building2, Plus, ArrowUpDown, FileEdit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function AdminProjectsPage() {
  const { adminUser, isLoading: isLoadingAuth } = useDirectAdminAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("newest");
  
  // Fetch all projects
  const { 
    data: projects, 
    isLoading: isLoadingProjects,
    error: projectsError
  } = useQuery<Project[]>({
    queryKey: ["/api/direct-admin/projects"],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') return [];
      const response = await fetch('/api/direct-admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: adminUser.username })
      });
      if (!response.ok) {
        console.error("Failed to fetch projects:", response.status, response.statusText);
        throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    staleTime: 60000,
    enabled: !!adminUser && adminUser.role === 'admin',
  });
  
  // Get status badge based on project status
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Filter and sort projects
  const filteredProjects = projects
    ? projects.filter(project => {
        // Filter by search term
        const searchMatch = !searchTerm || 
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description.toLowerCase().includes(searchTerm.toLowerCase());
          
        // Filter by status
        const statusMatch = statusFilter === 'all' || project.status === statusFilter;
        
        return searchMatch && statusMatch;
      })
    : [];
    
  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch(sortOption) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'alphabetical':
        return a.name.localeCompare(b.name);
      case 'progress':
        return b.progress - a.progress;
      default:
        return 0;
    }
  });
  
  const isLoading = isLoadingAuth || isLoadingProjects;
  
  if (isLoading) {
    return (
      <AdminDashboardLayout title="Projects Management">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Loading projects data...</span>
        </div>
      </AdminDashboardLayout>
    );
  }
  
  if (projectsError) {
    return (
      <AdminDashboardLayout title="Projects Management">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive mb-4">Error loading projects: {projectsError.message}</p>
              <Button 
                onClick={() => {
                  window.location.reload();
                }}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </AdminDashboardLayout>
    );
  }
  
  return (
    <AdminDashboardLayout title="Projects Management">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Building2 className="mr-2 h-6 w-6" />
          Projects Management
        </h1>
        
        <Button variant="default">
          <Plus className="mr-2 h-4 w-4" /> Add New Project
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search projects..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                  <SelectItem value="progress">Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Project Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProjects.length > 0 ? (
                sortedProjects.map(project => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <Link to={`/admin-projects/${project.id}`}>
                        <span className="text-primary hover:underline cursor-pointer">{project.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {project.clientDetails ? (
                        <div className="flex flex-col">
                          <span>{project.clientDetails.username || `Client #${project.clientId}`}</span>
                          {project.clientDetails.email && (
                            <span className="text-xs text-muted-foreground">{project.clientDetails.email}</span>
                          )}
                        </div>
                      ) : (
                        `Client #${project.clientId}`
                      )}
                    </TableCell>
                    <TableCell>{project.location}</TableCell>
                    <TableCell>{getStatusBadge(project.status)}</TableCell>
                    <TableCell>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs">{project.progress}%</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2 flex items-center gap-1"
                          asChild
                        >
                          <Link to={`/admin-projects/${project.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          title="Edit Project"
                        >
                          <FileEdit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' ? 
                      "No projects match your filters" : 
                      "No projects found"
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminDashboardLayout>
  );
}