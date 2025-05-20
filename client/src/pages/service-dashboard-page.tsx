import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Calendar, User, Clock, Wrench, Info, ArrowRight } from "lucide-react";
import { ServiceRequest } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function ServiceDashboardPage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("pending");
  
  // Get service type from URL
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
  const serviceType = currentPath.split("/").pop() || "";
  const formattedServiceType = serviceType.replace(/-/g, "_").toLowerCase();
  
  // Display name for service type
  const getServiceDisplayName = (type: string) => {
    const map: Record<string, string> = {
      "contractor": "Contractor Services",
      "real_estate": "Real Estate Development",
      "electrician": "Electrical Services",
      "plumber": "Plumbing Services",
      "carpenter": "Carpentry Services",
      "mason": "Masonry Services",
      "painter": "Painting Services",
      "roofer": "Roofing Services",
      "architect": "Architectural Services"
    };
    return map[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
  };

  // Fetch service requests
  const { data: serviceRequests = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests"],
  });
  
  // Filter requests by service type and status
  const filteredRequests = serviceRequests.filter(
    request => request.serviceType === formattedServiceType && 
    (activeTab === "all" || request.status.toLowerCase() === activeTab)
  );
  
  // Get status variant for badge
  const getStatusVariant = (status: string) => {
    const statusMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "pending": "secondary",
      "approved": "default",
      "in_progress": "default",
      "completed": "default",
      "rejected": "destructive"
    };
    return statusMap[status.toLowerCase()] || "outline";
  };
  
  // Format date
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <DashboardLayout title={getServiceDisplayName(formattedServiceType)}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Wrench className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">{getServiceDisplayName(formattedServiceType)} Dashboard</h1>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Service Requests Overview</CardTitle>
          <CardDescription>
            Manage all {getServiceDisplayName(formattedServiceType).toLowerCase()} requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Requests</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-0">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : filteredRequests.length > 0 ? (
                <div className="space-y-4">
                  {filteredRequests.map(request => (
                    <Card key={request.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                      <div className="border-l-4 border-primary">
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <Badge variant={getStatusVariant(request.status)} className="mr-2">
                                  {request.status.replace(/_/g, " ").toUpperCase()}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  {formatDate(request.createdAt)}
                                </span>
                              </div>
                              
                              <h3 className="text-lg font-medium mb-1">
                                {request.requestType.replace(/_/g, " ")}
                              </h3>
                              
                              <div className="flex items-center text-sm text-gray-600 mb-2">
                                <MapPin className="h-3 w-3 mr-1" /> 
                                {request.location}
                              </div>
                              
                              <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                                {request.description}
                              </p>
                              
                              <div className="flex flex-wrap gap-2 text-xs">
                                {request.budget && (
                                  <div className="bg-gray-100 px-2 py-1 rounded">
                                    Budget: ${request.budget}
                                  </div>
                                )}
                                {request.timeline && (
                                  <div className="bg-gray-100 px-2 py-1 rounded">
                                    Timeline: {request.timeline}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col justify-center items-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="w-full md:w-auto"
                                onClick={() => setLocation(`/service-requests/${request.id}`)}
                              >
                                View Details <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                              
                              {request.status === "pending" && user?.role === "admin" && (
                                <div className="flex gap-2 w-full md:w-auto">
                                  <Button size="sm" className="flex-1">Approve</Button>
                                  <Button size="sm" variant="outline" className="flex-1">Reject</Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                  <p className="text-gray-500 mb-6">
                    There are no {activeTab !== "all" ? activeTab : ""} service requests for {getServiceDisplayName(formattedServiceType).toLowerCase()}.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>Requests awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center mb-2">
              {serviceRequests.filter(r => r.serviceType === formattedServiceType && r.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>In Progress</CardTitle>
            <CardDescription>Currently active requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center mb-2">
              {serviceRequests.filter(r => r.serviceType === formattedServiceType && r.status === "in_progress").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>Successfully fulfilled requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center mb-2">
              {serviceRequests.filter(r => r.serviceType === formattedServiceType && r.status === "completed").length}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}