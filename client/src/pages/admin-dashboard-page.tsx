import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import AdminDashboardLayout from "@/components/admin/admin-dashboard-layout";
import { 
  UsersRound, 
  Building2, 
  ClipboardCheck, 
  Clock, 
  UserCog,
  Search,
  Megaphone,
  Plus,
  LogOut,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Project, User, ServiceRequest } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

// Import direct admin components and hooks
import DirectAdminLogin from "@/components/admin/direct-admin-login";
import { DirectAdminAuthProvider, useDirectAdminAuth } from "@/hooks/use-direct-admin-auth";
import { DirectAdminNotificationsProvider } from "@/providers/direct-admin-notifications-provider";

function AdminDashboardContent() {
  // Define all hooks first, before any conditional logic
  const { adminUser } = useDirectAdminAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Define all query hooks upfront, but with enabled conditionally
  const { 
    data: serviceRequests, 
    isLoading: isLoadingRequests 
  } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/direct-admin/service-requests"],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') return [];
      const response = await fetch('/api/direct-admin/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: adminUser.username })
      });
      if (!response.ok) throw new Error('Failed to fetch service requests');
      return response.json();
    },
    staleTime: 30000,
    enabled: !!adminUser && adminUser.role === 'admin',
  });

  const { 
    data: clients, 
    isLoading: isLoadingClients 
  } = useQuery<User[]>({
    queryKey: ["/api/direct-admin/clients"],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') return [];
      const response = await fetch('/api/direct-admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: adminUser.username })
      });
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
    staleTime: 60000,
    enabled: !!adminUser && adminUser.role === 'admin',
  });

  const { 
    data: serviceProviders, 
    isLoading: isLoadingProviders 
  } = useQuery<User[]>({
    queryKey: ["/api/direct-admin/service-providers"],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') return [];
      const response = await fetch('/api/direct-admin/service-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: adminUser.username })
      });
      if (!response.ok) throw new Error('Failed to fetch service providers');
      return response.json();
    },
    staleTime: 60000,
    enabled: !!adminUser && adminUser.role === 'admin',
  });

  const { 
    data: projects, 
    isLoading: isLoadingProjects 
  } = useQuery<Project[]>({
    queryKey: ["/api/direct-admin/projects"],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') return [];
      const response = await fetch('/api/direct-admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: adminUser.username })
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const projectData = await response.json();
      
      // Debug: log all project statuses to help determine what should be counted as "active"
      if (projectData && projectData.length > 0) {
        console.log("Project statuses:", projectData.map((p: any) => ({ id: p.id, status: p.status })));
      }
      
      return projectData;
    },
    staleTime: 60000,
    enabled: !!adminUser && adminUser.role === 'admin',
  });
  
  // Combine isLoading states from all queries to show a single loading indicator
  const isDataLoading = isLoadingRequests || isLoadingClients || isLoadingProviders || isLoadingProjects;
  
  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <span className="ml-3 text-primary">Loading admin dashboard data...</span>
      </div>
    );
  }
  
  // Get stats for dashboard with null safety
  const stats = [
    { 
      title: "Total Clients", 
      value: clients?.length || 0,
      icon: <UsersRound className="text-primary" />,
      bgColor: "bg-primary-100",
      linkTo: "/admin-users",
      items: clients || []
    },
    { 
      title: "Service Providers", 
      value: serviceProviders?.length || 0,
      icon: <UserCog className="text-secondary" />,
      bgColor: "bg-orange-100",
      linkTo: "/admin-users",
      items: serviceProviders || []
    },
    { 
      title: "Active Projects", 
      value: projects ? projects.filter(p => p.status === "approved" || p.status === "in_progress" || p.status === "pending").length : 0,
      icon: <Building2 className="text-green-500" />,
      bgColor: "bg-green-100",
      linkTo: "/admin-projects",
      items: projects ? projects.filter(p => p.status === "approved" || p.status === "in_progress" || p.status === "pending") : []
    },
    { 
      title: "Pending Requests", 
      value: serviceRequests ? serviceRequests.filter(sr => sr.status === "pending" || sr.status === "pending_admin").length : 0,
      icon: <Clock className="text-purple-500" />,
      bgColor: "bg-purple-100",
      linkTo: "/admin-service-requests",
      items: serviceRequests ? serviceRequests.filter(sr => sr.status === "pending" || sr.status === "pending_admin") : []
    }
  ];

  // Filter and search service requests with null safety
  const filteredRequests = serviceRequests 
    ? serviceRequests
        .filter(request => filterStatus === 'all' || request.status === filterStatus)
        .filter(request => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            request.serviceType.toLowerCase().includes(query) ||
            request.requestType.toLowerCase().includes(query) ||
            request.description.toLowerCase().includes(query) ||
            request.location.toLowerCase().includes(query)
          );
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  // Find client name by ID with null safety
  const getClientName = (clientId: number) => {
    if (!clients) return 'Unknown Client';
    const client = clients.find(c => c.id === clientId);
    return client ? (client.fullName || client.username || 'Unknown Client') : 'Unknown Client';
  };

  // Handle service request status update
  const handleStatusUpdate = async (requestId: number, newStatus: string, adminNotes?: string) => {
    try {
      const updateData: { status: string; adminNotes?: string } = { status: newStatus };
      
      // If admin notes are provided, include them in the update
      if (adminNotes) {
        updateData.adminNotes = adminNotes;
      }
      
      const response = await apiRequest("PATCH", `/api/service-requests/${requestId}`, updateData);
      
      if (response.ok) {
        // Update the cache with the new status
        queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
        
        toast({
          title: "Service request updated",
          description: `Request status has been changed to ${newStatus.replace("_", " ")}.`,
        });
      }
    } catch (error) {
      console.error("Failed to update request status:", error);
      
      toast({
        title: "Update failed",
        description: "Failed to update service request status. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle publishing a service request to make it visible to service providers
  const handlePublishRequest = async (requestId: number) => {
    try {
      const response = await apiRequest("PATCH", `/api/service-requests/${requestId}`, {
        status: "published"
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
        
        toast({
          title: "Request published",
          description: "The service request is now visible to service providers for bidding.",
        });
      }
    } catch (error) {
      console.error("Failed to publish request:", error);
      
      toast({
        title: "Publication failed",
        description: "Failed to publish service request. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle publishing all service requests for bidding
  const handlePublishAllRequests = async () => {
    if (!serviceRequests || serviceRequests.length === 0) {
      toast({
        title: "No requests available",
        description: "There are no service requests to publish at this time.",
      });
      return;
    }
    
    try {
      // Filter requests that aren't already published or completed
      const requestsToPublish = serviceRequests.filter(
        req => req.status !== "published" && 
              req.status !== "completed" && 
              req.status !== "in_progress"
      );
      
      if (requestsToPublish.length === 0) {
        toast({
          title: "Nothing to publish",
          description: "All eligible service requests are already published or completed.",
        });
        return;
      }
      
      // Show confirmation toast
      toast({
        title: "Publishing requests",
        description: `Publishing ${requestsToPublish.length} service requests for bidding...`,
      });
      
      // Use batch update API endpoint to publish all requests that aren't already published
      const response = await apiRequest("POST", `/api/service-requests/publish-all`, {
        requestIds: requestsToPublish.map(req => req.id)
      });
      
      if (response.ok) {
        // Parse the response to show more detailed information
        const result = await response.json();
        
        // Invalidate the service requests to refresh the data
        queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
        
        toast({
          title: "Service Requests Published",
          description: `Successfully published ${result.published} requests. ${result.skipped} skipped. ${result.errors} failed.`,
        });
      } else {
        throw new Error("Failed to publish requests");
      }
    } catch (error) {
      console.error("Failed to publish all requests:", error);
      
      toast({
        title: "Publication failed",
        description: "Failed to publish service requests. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle project status update
  const handleProjectStatusUpdate = async (projectId: number, newStatus: string) => {
    try {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}`, {
        status: newStatus
      });
      
      if (response.ok) {
        // Update the cache with the new status
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        
        toast({
          title: "Project updated",
          description: `Project status has been changed to ${newStatus.replace("_", " ")}.`,
        });
      }
    } catch (error) {
      console.error("Failed to update project status:", error);
      
      toast({
        title: "Update failed",
        description: "Failed to update project status. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle assigning a service provider
  const handleAssignProvider = async (requestId: number, providerId: string) => {
    try {
      // If "unassigned" is selected, set it to null
      const providerIdValue = providerId === "unassigned" ? null : Number(providerId);
      
      const response = await apiRequest("PATCH", `/api/service-requests/${requestId}`, {
        assignedServiceProviderId: providerIdValue
      });
      
      if (response.ok) {
        // Update the cache with the new assignment
        queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
        
        toast({
          title: providerId === "unassigned" ? "Provider unassigned" : "Provider assigned",
          description: providerId === "unassigned" 
            ? "Service provider has been removed from this request." 
            : "Service provider has been assigned to this request.",
        });
      }
    } catch (error) {
      console.error("Failed to assign provider:", error);
      
      toast({
        title: "Assignment failed",
        description: "Failed to assign service provider. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_admin':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'published':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <AdminDashboardLayout title="">
      
      {/* Dashboard Stats */}
      <section className="mb-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <Link key={i} href={stat.linkTo || "#"} className="block">
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-5 transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center rounded-md ${stat.bgColor} h-12 w-12 mr-4`}>
                        {stat.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</p>
                      </div>
                    </div>
                    <div className="text-gray-400 hover:text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <path d="M9 18l6-6-6-6"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Service Requests Management */}
      <section className="mb-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Service Requests</h3>
                  <p className="text-sm text-gray-500 mt-1">Manage and track service requests from clients</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button 
                    onClick={() => handlePublishAllRequests()}
                    className="bg-primary hover:bg-primary/90 text-white font-medium w-full sm:w-auto"
                  >
                    <Megaphone className="mr-2 h-4 w-4" />
                    Publish All
                  </Button>
                  
                  <Link href="/service-requests/new">
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      New Request
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search service requests..."
                    className="pl-9 pr-4 h-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="w-full sm:w-48">
                  <Select
                    value={filterStatus}
                    onValueChange={setFilterStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              {/* Data loading and error states */}
              {(isLoadingRequests || isLoadingClients || isLoadingProviders) && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              )}
              
              {/* If data loaded but no requests found */}
              {!isLoadingRequests && (!serviceRequests || serviceRequests.length === 0) && (
                <div className="text-center py-12 px-4">
                  <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No service requests found</h3>
                  <p className="mt-2 text-sm text-gray-500">There are currently no service requests in the system.</p>
                  <div className="mt-6">
                    <Link href="/service-requests/new">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Request
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
              
              {/* Desktop table view for larger screens */}
              {!isLoadingRequests && serviceRequests && serviceRequests.length > 0 && (
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{request.id}</TableCell>
                          <TableCell>{getClientName(request.clientId)}</TableCell>
                          <TableCell>{request.serviceType}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {request.description}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusBadgeStyles(request.status)} border`}>
                              {request.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Link href={`/service-requests/${request.id}`}>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                              {request.status === 'pending' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handlePublishRequest(request.id)}
                                >
                                  Publish
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* Mobile card view for small screens */}
              {!isLoadingRequests && serviceRequests && serviceRequests.length > 0 && (
                <div className="md:hidden space-y-4 p-2">
                  {filteredRequests.slice(0, 4).map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">Request #{request.id}</p>
                          <p className="text-sm text-gray-500">{getClientName(request.clientId)}</p>
                        </div>
                        <Badge className={`${getStatusBadgeStyles(request.status)} border`}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700">
                          {request.serviceType} - {request.requestType}
                        </p>
                        <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex space-x-2">
                          <Link href={`/service-requests/${request.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          {request.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePublishRequest(request.id)}
                            >
                              Publish
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredRequests.length > 4 && (
                    <div className="text-center">
                      <Link href="/service-requests">
                        <Button variant="link">View All Service Requests</Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </AdminDashboardLayout>
  );
}

export default function AdminDashboardPage() {
  // We need to use the AdminDashboardLayout with our direct auth context providers
  return (
    <DirectAdminAuthProvider>
      <DirectAdminNotificationsProvider>
        <AdminDashboardFunction />
      </DirectAdminNotificationsProvider>
    </DirectAdminAuthProvider>
  );
}

// Function that can access the auth context after providers are set up
function AdminDashboardFunction() {
  const { adminUser, isLoading, logout } = useDirectAdminAuth();
  
  // Show loading state or login form if needed
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // If not authenticated or not admin, show direct login form
  if (!adminUser || adminUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <h1 className="text-2xl font-bold mb-6 text-primary">Admin Access Required</h1>
        <DirectAdminLogin />
      </div>
    );
  }
  
  // Handle logout function
  const handleLogout = () => {
    logout();
  };
  
  // If authenticated, show the dashboard within our layout
  return (
    <>
      <AdminDashboardLayout title="">
        <AdminDashboardContent />
      </AdminDashboardLayout>
    </>
  );
}