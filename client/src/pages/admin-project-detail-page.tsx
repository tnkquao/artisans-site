import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminDashboardLayout from "@/components/admin/admin-dashboard-layout";
import { useDirectAdminAuth } from "@/hooks/use-direct-admin-auth";
import { Loader2, ChevronLeft, Map, Edit, User, Calendar, FileText, Clock, CheckSquare, AlertTriangle, Package, FileImage, Phone, Mail, Building, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AdminProjectDetailPage() {
  const { id } = useParams();
  const projectId = parseInt(id);
  const { adminUser, isLoading: isLoadingAuth } = useDirectAdminAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch single project with client details
  const { 
    data: project, 
    isLoading: isLoadingProject,
    error: projectError
  } = useQuery({
    queryKey: [`/api/direct-admin/projects/${projectId}`],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') return null;
      
      const response = await fetch(`/api/direct-admin/projects/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: adminUser.username })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 60000,
    enabled: !!adminUser && adminUser.role === 'admin' && !isNaN(projectId),
  });
  
  // Fetch service requests related to this project
  const {
    data: serviceRequests,
    isLoading: isLoadingServiceRequests
  } = useQuery({
    queryKey: [`/api/direct-admin/service-requests`, projectId],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') return [];
      
      const response = await fetch(`/api/direct-admin/service-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminUsername: adminUser.username,
          projectId: projectId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch service requests: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    },
    staleTime: 60000,
    enabled: !!adminUser && adminUser.role === 'admin' && !isNaN(projectId),
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
  
  // Format date helper function
  const formatDate = (dateString: string | Date | null): string => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  const isLoading = isLoadingAuth || isLoadingProject;
  
  if (isLoading) {
    return (
      <AdminDashboardLayout title="Project Details">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Loading project details...</span>
        </div>
      </AdminDashboardLayout>
    );
  }
  
  if (projectError) {
    return (
      <AdminDashboardLayout title="Project Details">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive mb-4">Error loading project: {projectError.message}</p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </AdminDashboardLayout>
    );
  }
  
  if (!project) {
    return (
      <AdminDashboardLayout title="Project Details">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Project not found or you don't have permission to view it.</p>
              <Button asChild>
                <Link to="/admin-projects">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Projects
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </AdminDashboardLayout>
    );
  }
  
  return (
    <AdminDashboardLayout title={`Project: ${project.name}`}>
      <div className="mb-6">
        <Button asChild variant="outline" className="mb-4">
          <Link to="/admin-projects">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <Map className="h-4 w-4" />
              <span>{project.location}</span>
              <span className="mx-2">•</span>
              {getStatusBadge(project.status)}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Project
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="client">Client Details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left Column - Project Details */}
            <div className="col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium text-muted-foreground mb-2">Description</h3>
                    <p>{project.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-muted-foreground mb-2">Created Date</h3>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{formatDate(project.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-muted-foreground mb-2">Estimated Completion</h3>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{formatDate(project.estimatedCompletion)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-muted-foreground mb-2">Project Type</h3>
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{project.type || 'Not specified'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-muted-foreground mb-2">Budget</h3>
                      <div className="flex items-center">
                        <span className="font-medium">₵{project.budget?.toLocaleString() || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-muted-foreground mb-2">Progress</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{project.progress}% Complete</span>
                        <span>{project.status === 'completed' ? 'Completed' : 'In Progress'}</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  </div>
                  
                  {project.permits && (
                    <div>
                      <h3 className="font-medium text-muted-foreground mb-2">Permits</h3>
                      <div className="flex flex-wrap gap-2">
                        {project.permits.map((permit, index) => (
                          <Badge key={index} variant="outline" className="bg-primary/10">
                            {permit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Project Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.timeline && project.timeline.length > 0 ? (
                    <div className="space-y-4">
                      {project.timeline.map((event, index) => (
                        <div key={index} className="flex">
                          <div className="mr-4 flex flex-col items-center">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <CheckSquare className="h-3 w-3" />
                            </div>
                            {index < project.timeline.length - 1 && (
                              <div className="h-full w-px bg-border" />
                            )}
                          </div>
                          <div className="space-y-1 pb-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium leading-none">
                                {event.title}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {event.date ? formatDate(event.date) : 'No date'}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No timeline events recorded for this project.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column - Service Requests, Images */}
            <div className="space-y-4">
              {/* Service Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingServiceRequests ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : serviceRequests && serviceRequests.length > 0 ? (
                    <div className="space-y-3">
                      {serviceRequests.map((request) => (
                        <div 
                          key={request.id} 
                          className="flex items-start p-3 border rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium">{request.serviceType} Service</h4>
                              <Badge variant={request.status === 'pending' ? 'outline' : 'default'}>
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {request.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No service requests for this project.
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" asChild className="w-full">
                    <Link to={`/admin-bidding?projectId=${projectId}`}>
                      View All Service Requests
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Project Images */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Images</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.images && project.images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {project.images.slice(0, 4).map((image, index) => (
                        <div key={index} className="relative aspect-square overflow-hidden rounded-md">
                          <img 
                            src={image.url} 
                            alt={`Project ${index + 1}`} 
                            className="object-cover w-full h-full" 
                          />
                        </div>
                      ))}
                      {project.images.length > 4 && (
                        <div className="col-span-2 mt-2">
                          <Button variant="outline" className="w-full">
                            <FileImage className="mr-2 h-4 w-4" />
                            View All {project.images.length} Images
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-md">
                      <FileImage className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No images uploaded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Site Issues */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Open Issues</CardTitle>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                      {project.issues?.filter(issue => issue.status !== 'resolved').length || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.issues && project.issues.length > 0 ? (
                    <div className="space-y-3">
                      {project.issues
                        .filter(issue => issue.status !== 'resolved')
                        .slice(0, 3)
                        .map((issue, index) => (
                          <div key={index} className="flex items-start p-3 border rounded-md">
                            <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                              <AlertTriangle className="h-4 w-4 text-yellow-800" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">{issue.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {issue.description?.substring(0, 100)}
                                {issue.description?.length > 100 ? '...' : ''}
                              </p>
                              <div className="mt-2 flex items-center text-xs text-muted-foreground">
                                <Clock className="mr-1 h-3 w-3" />
                                <span>Reported: {formatDate(issue.reportedAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      
                      {project.issues.filter(issue => issue.status !== 'resolved').length > 3 && (
                        <Button variant="ghost" className="w-full text-xs">
                          View All Issues
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No open issues for this project.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Client Details Tab */}
        <TabsContent value="client" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>Contact details and information about the client</CardDescription>
            </CardHeader>
            <CardContent>
              {project.clientDetails ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 text-primary text-2xl font-bold">
                      {project.clientDetails.username?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{project.clientDetails.username}</h3>
                      <p className="text-muted-foreground">Client ID: #{project.clientId}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Email Address</h4>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{project.clientDetails.email || 'Not provided'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Phone Number</h4>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{project.clientDetails.phone || 'Not provided'}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Address</h4>
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{project.clientDetails.address || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Member Since</h4>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{formatDate(project.clientDetails.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Projects</h4>
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{project.clientDetails.totalProjects || '1'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Notes</h4>
                    <textarea 
                      className="w-full min-h-[100px] p-2 border rounded-md" 
                      placeholder="Add notes about this client..."
                      value={project.clientDetails.notes || ''}
                      readOnly
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Client details not available</p>
                  <Button variant="outline">View Client #{project.clientId}</Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Project History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* List of client's projects */}
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Project Name</th>
                        <th className="text-left p-3 text-sm font-medium">Status</th>
                        <th className="text-left p-3 text-sm font-medium">Created</th>
                        <th className="text-left p-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-muted/20">
                        <td className="p-3 text-sm">
                          <Link to={`/admin-projects/${project.id}`} className="text-primary hover:underline font-medium">
                            {project.name}
                          </Link>
                        </td>
                        <td className="p-3 text-sm">
                          {getStatusBadge(project.status)}
                        </td>
                        <td className="p-3 text-sm">{formatDate(project.createdAt)}</td>
                        <td className="p-3 text-sm">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                      {/* We would normally show other projects by this client here */}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Documents</CardTitle>
              <CardDescription>Building plans, contracts, and other documents</CardDescription>
            </CardHeader>
            <CardContent>
              {project.attachments && project.attachments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.attachments.map((doc, index) => (
                    <div key={index} className="flex items-start p-4 border rounded-md">
                      <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-medium">{doc.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(doc.uploadedAt)} • {(doc.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        </div>
                        {doc.uploadedBy && (
                          <div className="mt-2 flex items-center text-xs text-muted-foreground">
                            <User className="mr-1 h-3 w-3" />
                            <span>Uploaded by: {doc.uploadedBy.username || "Client #" + doc.uploadedBy.userId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-md">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No documents have been uploaded for this project</p>
                  <Button variant="outline" className="mt-4">
                    Upload Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle>Project Tasks</CardTitle>
                  <CardDescription>Track and manage project tasks</CardDescription>
                </div>
                <Button size="sm">
                  <ListTodo className="mr-2 h-4 w-4" />
                  Add New Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {project.tasks && project.tasks.length > 0 ? (
                <div className="space-y-4">
                  {/* Task status summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-muted-foreground">Total</h4>
                      <p className="text-2xl font-bold">{project.tasks.length}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-green-600">Completed</h4>
                      <p className="text-2xl font-bold text-green-700">
                        {project.tasks.filter(task => task.status === 'completed').length}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-600">In Progress</h4>
                      <p className="text-2xl font-bold text-blue-700">
                        {project.tasks.filter(task => task.status === 'in_progress').length}
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-yellow-600">Pending</h4>
                      <p className="text-2xl font-bold text-yellow-700">
                        {project.tasks.filter(task => task.status === 'pending').length}
                      </p>
                    </div>
                  </div>
                  
                  {/* Task list */}
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">Task</th>
                          <th className="text-left p-3 text-sm font-medium">Assigned To</th>
                          <th className="text-left p-3 text-sm font-medium">Due Date</th>
                          <th className="text-left p-3 text-sm font-medium">Status</th>
                          <th className="text-left p-3 text-sm font-medium">Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.tasks.map((task, index) => (
                          <tr key={index} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                            <td className="p-3 text-sm font-medium">{task.title}</td>
                            <td className="p-3 text-sm">
                              {task.assignedTo ? task.assignedTo.name : 'Unassigned'}
                            </td>
                            <td className="p-3 text-sm">{formatDate(task.dueDate)}</td>
                            <td className="p-3 text-sm">
                              <Badge 
                                variant="outline" 
                                className={
                                  task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  task.status === 'blocked' ? 'bg-red-100 text-red-800' :
                                  ''
                                }
                              >
                                {task.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">
                              <Badge 
                                variant="outline" 
                                className={
                                  task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                {task.priority}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-md">
                  <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No tasks have been created for this project</p>
                  <Button variant="outline" className="mt-4">
                    Create First Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminDashboardLayout>
  );
}