import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  ClipboardCheck, 
  BarChart3, 
  MessageSquare, 
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Search,
  LogOut,
  Loader2,
  Gavel,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageList } from "@/components/messaging/message-list";
import { Project, ServiceRequest, Message, User } from "@shared/schema";

export default function ProviderDashboardPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newMessage, setNewMessage] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  
  // Redirect if not a service provider
  useEffect(() => {
    if (user && user.role !== 'service_provider') {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Fetch assigned service requests
  const { 
    data: assignedRequests = [], 
    isLoading: isLoadingRequests,
    isError: isRequestsError
  } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests/assigned"],
    staleTime: 30000,
    enabled: !!user
  });

  // Fetch admin users (for messaging)
  const { 
    data: admins = [], 
    isLoading: isLoadingAdmins,
    isError: isAdminsError
  } = useQuery<User[]>({
    queryKey: ["/api/users/admins"],
    staleTime: 300000,
    enabled: !!user,
    onSuccess: (data) => {
      console.log("Admin users loaded successfully:", data ? data.length : 0);
    },
    onError: (error) => {
      console.error("Error loading admin users:", error);
    }
  });
  
  // Default admin ID for messaging if no admins are loaded yet
  const defaultAdminId = 3; // Assuming admin has ID 3 based on logs

  // Fetch messages
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages,
    isError: isMessagesError
  } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    staleTime: 30000,
    enabled: !!user
  });
  
  // Fetch available bidding opportunities
  const { 
    data: biddingOpportunities = [], 
    isLoading: isLoadingBidding,
    isError: isBiddingError
  } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests/bidding"],
    staleTime: 60000,
    enabled: !!user
  });
  
  // Fetch user points
  const { 
    data: userPointsData,
    isLoading: isLoadingPoints
  } = useQuery({
    queryKey: ["/api/user/points"],
    staleTime: 60000,
    enabled: !!user
  });

  const userPoints = userPointsData?.points || 0;

  // Wait until data is loaded to prevent rendering issues
  useEffect(() => {
    if (user && user.role === 'service_provider') {
      if ((!isLoadingRequests || isRequestsError) && 
          (!isLoadingAdmins || isAdminsError) && 
          (!isLoadingMessages || isMessagesError) &&
          (!isLoadingBidding || isBiddingError)) {
        setIsReady(true);
      }
    }
  }, [
    user,
    isLoadingRequests, 
    isLoadingAdmins, 
    isLoadingMessages, 
    isLoadingBidding,
    isRequestsError, 
    isAdminsError, 
    isMessagesError,
    isBiddingError
  ]);

  // If user is not logged in or doesn't have the service_provider role, don't render
  if (!user) {
    return (
      <DashboardLayout title="Service Provider Dashboard">
        <div className="flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading user data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Double-check role to avoid rendering for non-service providers
  if (user.role !== 'service_provider') {
    return (
      <DashboardLayout title="Access Denied">
        <div className="flex flex-col justify-center items-center h-[80vh]">
          <div className="text-center mb-6">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              This dashboard is only accessible to service providers.
            </p>
          </div>
          <Button onClick={() => window.location.href = "/"}>Go to Homepage</Button>
        </div>
      </DashboardLayout>
    );
  }
  
  // If not fully ready yet, show loading state
  if (!isReady) {
    return (
      <DashboardLayout title="Service Provider Dashboard">
        <div className="flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading dashboard content...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // All users involved in messages
  const messageUsers: Record<number, User> = {};
  if (user) {
    messageUsers[user.id] = user;
  }
  
  // Only iterate through admins if data is loaded
  if (admins && admins.length > 0) {
    admins.forEach(admin => {
      messageUsers[admin.id] = admin;
    });
  }

  // Get stats for dashboard
  const stats = [
    { 
      title: "Assigned Requests", 
      value: assignedRequests ? assignedRequests.length : 0,
      icon: <ClipboardCheck className="text-primary" />,
      bgColor: "bg-primary-100"
    },
    { 
      title: "In Progress", 
      value: assignedRequests ? assignedRequests.filter(r => r.status === "in_progress").length : 0,
      icon: <Clock className="text-orange-500" />,
      bgColor: "bg-orange-100"
    },
    { 
      title: "Completed", 
      value: assignedRequests ? assignedRequests.filter(r => r.status === "completed").length : 0,
      icon: <CheckCircle className="text-green-500" />,
      bgColor: "bg-green-100"
    },
    { 
      title: "New Messages", 
      value: messages ? messages.filter(m => !m.read && m.receiverId === user?.id).length : 0,
      icon: <MessageSquare className="text-purple-500" />,
      bgColor: "bg-purple-100"
    }
  ];

  // Filter and search service requests - only if assignedRequests is available
  const filteredRequests = assignedRequests 
    ? assignedRequests
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
  
  // Handle service request status update
  const handleUpdateStatus = async (requestId: number, status: string) => {
    try {
      const response = await apiRequest("PATCH", `/api/service-requests/${requestId}`, {
        status
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/service-requests/assigned"] });
      }
    } catch (error) {
      console.error("Failed to update request status:", error);
    }
  };

  // Handle sending message
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !user) return;
    
    try {
      // Use admins if available, otherwise use default admin ID
      let receiverId: number;
      
      if (admins && admins.length > 0) {
        console.log("Using first admin from list:", admins[0]);
        receiverId = admins[0].id;
      } else {
        console.log("No admins found in list, using default admin ID:", defaultAdminId);
        receiverId = defaultAdminId;
      }
      
      console.log("Sending message to admin ID:", receiverId);
      
      const response = await apiRequest("POST", "/api/messages", {
        receiverId,
        content: content.trim(),
        projectId: null // Could link to a specific project if relevant
      });
      
      if (!response.ok) {
        console.error("Failed to send message. Status:", response.status);
        const errorText = await response.text();
        console.error("Error details:", errorText);
        throw new Error(`Failed to send message: ${response.status} ${errorText}`);
      }
      
      const newMessage = await response.json();
      console.log("Message sent successfully:", newMessage);
      
      // Update messages cache
      queryClient.setQueryData(
        ["/api/messages"], 
        (oldData: Message[] = []) => [newMessage, ...oldData]
      );
      
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <DashboardLayout title="Service Provider Dashboard">
      {/* Welcome Section */}
      <section className="mb-8">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            <div className="md:flex justify-between items-center">
              <div className="mb-4 md:mb-0">
                <h2 className="text-2xl font-bold text-gray-800">Welcome, {user?.fullName?.split(' ')[0] || user?.username}</h2>
                <p className="text-gray-600 mt-1">
                  Manage your assigned service requests and communicate with the admin
                </p>
                <div className="mt-2">
                  <Badge variant="outline" className="text-primary border-primary bg-primary/10 capitalize">
                    {user?.serviceType || 'General Service Provider'}
                  </Badge>
                  <Badge variant="outline" className={`ml-2 capitalize ${user?.verificationStatus === 'verified' ? 
                    'text-green-600 border-green-600 bg-green-50' : 
                    'text-yellow-600 border-yellow-600 bg-yellow-50'}`}
                  >
                    {user?.verificationStatus || 'Pending Verification'}
                  </Badge>
                </div>
              </div>
              <div className="flex space-x-2 flex-wrap gap-2">
                <Link href="/messages">
                  <Button className="bg-primary hover:bg-primary-dark text-white">
                    <MessageSquare className="mr-2 h-4 w-4" /> Message Admin
                  </Button>
                </Link>
                <Link href="/provider-projects">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                    My Projects
                  </Button>
                </Link>
                <Link href="/service-requests">
                  <Button variant="outline" className="border-gray-300">
                    <ClipboardCheck className="mr-2 h-4 w-4" /> View All Requests
                  </Button>
                </Link>
                <Link href="/service-provider-bidding">
                  <Button variant="outline" className="border-gray-300 bg-accent text-accent-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                    Bidding Opportunities
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Dashboard Stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-white border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className={`rounded-full ${stat.bgColor} p-3 mr-4`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-xl font-bold text-gray-800">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Assigned Service Requests */}
      <section className="mb-8">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Assigned Service Requests</h3>
              <div className="flex space-x-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-60"
                  />
                </div>
                <Select
                  value={filterStatus}
                  onValueChange={(value) => setFilterStatus(value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingRequests ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <p>Loading requests...</p>
              </div>
            ) : isRequestsError ? (
              <div className="text-center py-8 text-destructive">
                <AlertCircle className="mx-auto h-12 w-12 mb-3" />
                <p>Failed to load service requests</p>
                <Button 
                  variant="outline" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/service-requests/assigned"] })}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            ) : filteredRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date Assigned</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {request.requestType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {request.location}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {request.description}
                        </TableCell>
                        <TableCell>
                          {new Date(request.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusBadgeStyles(request.status)} capitalize`}>
                            {request.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {request.status === 'approved' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateStatus(request.id, 'in_progress')}
                              >
                                Start Work
                              </Button>
                            )}
                            {request.status === 'in_progress' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateStatus(request.id, 'completed')}
                              >
                                Mark Complete
                              </Button>
                            )}
                            <Link href={`/service-requests/${request.id}`}>
                              <Button size="sm" variant="outline">View Details</Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p>No service requests assigned to you.</p>
                {searchQuery && <p className="mt-2">Try adjusting your search or filters.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Schedule & Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Upcoming Schedule */}
        <Card className="bg-white border border-gray-200 lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Upcoming Schedule</h3>
              <Button variant="ghost" size="sm">
                <Calendar className="h-4 w-4 mr-1" /> View Calendar
              </Button>
            </div>
            
            {isLoadingRequests ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !assignedRequests || assignedRequests.filter(r => r.status === 'approved' || r.status === 'in_progress').length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">No upcoming work scheduled</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedRequests
                  .filter(r => r.status === 'approved' || r.status === 'in_progress')
                  .slice(0, 4)
                  .map((request, index) => (
                    <div key={request.id} className="border-b pb-3 last:border-0">
                      <div className="flex items-start">
                        <div className="min-w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-primary">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{request.requestType}</p>
                          <p className="text-sm text-gray-500 truncate max-w-[220px]">{request.location}</p>
                          <div className="mt-1 flex items-center">
                            <Badge className={getStatusBadgeStyles(request.status)}>
                              {request.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Messages */}
        <Card className="bg-white border border-gray-200 lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Admin Messages</h3>
              <div className="flex space-x-2">
                <Link href="/messages">
                  <Button variant="ghost" size="sm">
                    <MessageSquare className="h-4 w-4 mr-1" /> View All
                  </Button>
                </Link>
              </div>
            </div>
            
            {isLoadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <p>Loading messages...</p>
              </div>
            ) : isMessagesError ? (
              <div className="text-center py-6 text-destructive">
                <AlertCircle className="mx-auto h-10 w-10 mb-2" />
                <p>Failed to load messages</p>
                <Button 
                  variant="outline" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/messages"] })}
                  className="mt-3 text-xs px-2 py-0 h-8"
                >
                  Retry
                </Button>
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="h-[300px]">
                <MessageList 
                  messages={messages.slice(0, 5)} 
                  users={messageUsers} 
                  currentUser={user}
                />
                
                <div className="mt-4 flex items-center space-x-2">
                  <Input
                    placeholder="Send a message to the admin..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(newMessage);
                      }
                    }}
                  />
                  <Button 
                    onClick={() => handleSendMessage(newMessage)}
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <MessageSquare className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm">No messages yet</p>
                <p className="text-green-700 mt-1">
                  Send a message to the admin using the form below
                </p>
                
                <div className="mt-4 flex items-center space-x-2">
                  <Input
                    placeholder="Send a message to the admin..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(newMessage);
                      }
                    }}
                  />
                  <Button 
                    onClick={() => handleSendMessage(newMessage)}
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}