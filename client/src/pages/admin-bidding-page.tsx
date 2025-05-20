import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Search,
  Gavel,
  ArrowUpDown,
  Clock,
  AlertCircle,
  Calendar,
  Filter,
  User,
  MapPin,
  Calendar as CalendarIcon,
  Star,
  BarChart,
  UserCheck,
  Tag,
  Award
} from "lucide-react";
import AdminDashboardLayout from "@/components/admin/admin-dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { useDirectAdminAuth } from "@/hooks/use-direct-admin-auth";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Type definitions for service request and bids
interface ServiceProvider {
  id: number;
  username: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  profileImage?: string;
  rating?: number;
  completedProjects?: number;
  specialties?: string[];
  joinDate?: string;
}

interface Bid {
  id: number;
  serviceRequestId: number;
  serviceProviderId: number;
  bidAmount: number;
  proposedTimeline: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  serviceProvider?: ServiceProvider;
}

interface ServiceRequestWithBids {
  id: number;
  clientId: number;
  clientName?: string;
  serviceType: string;
  description: string;
  budget?: number;
  location?: string;
  status: string;
  adminNotes?: string;
  deadline?: string;
  createdAt: string;
  updatedAt?: string;
  bids?: Bid[];
  bidCount?: number; // Count of bids
}

export default function AdminBiddingPage() {
  const { adminUser } = useDirectAdminAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestWithBids | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [bidsTab, setBidsTab] = useState<string>("all");
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);

  // Query to get service requests with bids
  const { 
    data: serviceRequests = [], 
    isLoading,
    error,
    refetch: refetchRequests
  } = useQuery<ServiceRequestWithBids[]>({
    queryKey: ["/api/direct-admin/service-requests-with-bids"],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') {
        return [];
      }
      
      try {
        const response = await apiRequest("POST", "/api/direct-admin/service-requests-with-bids", {
          adminUsername: adminUser.username
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch service requests: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching service requests with bids:", error);
        throw error;
      }
    },
    staleTime: 60000,
    enabled: false,
  });
  
  // Once admin authentication is complete, trigger the query
  useEffect(() => {
    if (adminUser && adminUser.role === 'admin') {
      refetchRequests();
    }
  }, [adminUser, refetchRequests]);

  // Award service request mutation
  const awardServiceRequestMutation = useMutation({
    mutationFn: async (data: { serviceRequestId: number; bidId: number; serviceProviderId: number }) => {
      console.log("Award service request mutation called with data:", data);
      // Ensure we're using the correct URL format that matches the server route
      const response = await apiRequest("PATCH", `/api/direct-admin/service-requests/${data.serviceRequestId}/award`, {
        adminUsername: adminUser?.username,
        bidId: data.bidId,
        serviceProviderId: data.serviceProviderId
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to award service request");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Service Request Awarded",
        description: "The service request has been awarded to the selected provider and they have been notified.",
      });
      setIsViewDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/direct-admin/service-requests-with-bids'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Award Service Request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle awarding service request to provider
  const handleAwardServiceRequest = (bid: Bid) => {
    if (selectedRequest) {
      // Set selected bid for UI updates
      setSelectedBid(bid);
      
      // Confirm with admin before awarding
      if (window.confirm(`Are you sure you want to award this service request to ${bid.serviceProvider?.name || bid.serviceProvider?.username}?`)) {
        console.log(`Awarding service request ${selectedRequest.id} to provider ${bid.serviceProviderId}`);
        awardServiceRequestMutation.mutate({
          serviceRequestId: selectedRequest.id,
          bidId: bid.id,
          serviceProviderId: bid.serviceProviderId
        });
      }
    }
  };
  
  // For UI compatibility - will be removed in full refactor
  const handleAcceptBid = () => {};
  
  // Mock mutation for UI compatibility - will be removed in full refactor
  const acceptBidMutation = {
    isPending: false
  };

  // Open view dialog
  const openViewDialog = (request: ServiceRequestWithBids) => {
    setSelectedRequest(request);
    setBidsTab("all");
    setIsViewDialogOpen(true);
  };

  // Filter service requests
  const filteredRequests = serviceRequests
    .filter(request => request.status === 'bidding' || request.status === 'published') // Only show requests in bidding
    .filter(request => {
      const matchesSearch = 
        request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.serviceType.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const matchesType = typeFilter === "all" || request.serviceType === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });

  // Get service types for filter
  const serviceTypes = Array.from(new Set(serviceRequests.map(req => req.serviceType)));

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not specified';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Published</Badge>;
      case 'bidding':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Bidding</Badge>;
      case 'awarded':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Awarded</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Get bid status badge
  const getBidStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Format currency with Ghana Cedi symbol
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'Not specified';
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get filtered bids based on tab
  const getFilteredBids = (bids?: Bid[]) => {
    if (!bids) return [];
    
    switch (bidsTab) {
      case "pending":
        return bids.filter(bid => bid.status === 'pending');
      case "accepted":
        return bids.filter(bid => bid.status === 'accepted');
      case "rejected":
        return bids.filter(bid => bid.status === 'rejected');
      default:
        return bids;
    }
  };

  // Get initials for avatar
  const getInitials = (name: string = "User") => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get star rating component
  const getRatingStars = (rating: number = 0) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <span key={i} className={i < rating ? "text-yellow-500" : "text-gray-300"}>
          ★
        </span>
      ));
  };

  return (
    <AdminDashboardLayout title="Bidding System">
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold">
                  <Gavel className="inline-block mr-2 h-6 w-6" />
                  Bidding System
                </CardTitle>
                <CardDescription>
                  Manage service requests available for bidding by service providers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <select 
                  className="border rounded p-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="bidding">Bidding</option>
                  <option value="awarded">Awarded</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                
                <select 
                  className="border rounded p-2 text-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {serviceTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>Failed to load bidding data. Please try again later.</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Gavel className="mx-auto h-8 w-8 mb-2" />
                <p>No service requests in bidding system</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center space-x-1">
                          <span>ID</span>
                          <ArrowUpDown size={16} />
                        </div>
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bids</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">#{request.id}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{request.serviceType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{request.description}</TableCell>
                        <TableCell>{formatCurrency(request.budget)}</TableCell>
                        <TableCell>
                          {request.deadline ? (
                            <span className="flex items-center">
                              <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                              {formatDate(request.deadline)}
                            </span>
                          ) : (
                            'No deadline'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            {request.bidCount || request.bids?.length || 0} bids
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openViewDialog(request)}
                              title="View bids"
                            >
                              View Bids
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Bids Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Service Request #{selectedRequest?.id} - Bids</DialogTitle>
            <DialogDescription>
              View and manage bids for this service request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    Request Details
                  </h3>
                  <div className="bg-muted/50 rounded-md p-3 space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <p><Badge variant="secondary">{selectedRequest.serviceType}</Badge></p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Description:</span>
                      <p className="text-sm">{selectedRequest.description}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Budget:</span>
                      <p>{formatCurrency(selectedRequest.budget)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Deadline:</span>
                      <p>{formatDate(selectedRequest.deadline)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <p>{getStatusBadge(selectedRequest.status)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Location & Notes
                  </h3>
                  <div className="bg-muted/50 rounded-md p-3 space-y-2">
                    {selectedRequest.location ? (
                      <div>
                        <span className="text-sm text-muted-foreground">Location:</span>
                        <p>{selectedRequest.location}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No location specified</p>
                    )}
                    {selectedRequest.adminNotes ? (
                      <div>
                        <span className="text-sm text-muted-foreground">Admin Notes:</span>
                        <p className="text-sm whitespace-pre-wrap">{selectedRequest.adminNotes}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No admin notes</p>
                    )}
                    <div>
                      <span className="text-sm text-muted-foreground">Created:</span>
                      <p className="flex items-center">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        {formatDate(selectedRequest.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Tabs value={bidsTab} onValueChange={setBidsTab} className="w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <BarChart className="h-4 w-4 mr-2" />
                    Bids ({selectedRequest.bids?.length || 0})
                  </h3>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="accepted">Accepted</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                  </TabsList>
                </div>
                
                <ScrollArea className="h-[400px] pr-4 -mr-4">
                  <TabsContent value={bidsTab} className="m-0">
                    {!selectedRequest.bids || selectedRequest.bids.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Gavel className="mx-auto h-8 w-8 mb-2" />
                        <p>No bids available yet</p>
                      </div>
                    ) : getFilteredBids(selectedRequest.bids).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Gavel className="mx-auto h-8 w-8 mb-2" />
                        <p>No {bidsTab} bids found</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {getFilteredBids(selectedRequest.bids).map((bid) => (
                          <Card key={bid.id} className={`overflow-hidden ${bid.status === 'accepted' ? 'border-green-300 bg-green-50' : ''}`}>
                            <CardContent className="p-4">
                              <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-shrink-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Avatar className="h-10 w-10">
                                      {bid.serviceProvider?.profileImage ? (
                                        <AvatarImage src={bid.serviceProvider.profileImage} alt={bid.serviceProvider.name || bid.serviceProvider.username} />
                                      ) : (
                                        <AvatarFallback>{getInitials(bid.serviceProvider?.name || bid.serviceProvider?.username)}</AvatarFallback>
                                      )}
                                    </Avatar>
                                    <div>
                                      <h4 className="font-medium">{bid.serviceProvider?.name || bid.serviceProvider?.username}</h4>
                                      <div className="flex items-center text-xs">
                                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                                        <span>{bid.serviceProvider?.rating || 0}/5</span>
                                        <span className="mx-1">•</span>
                                        <span>{bid.serviceProvider?.completedProjects || 0} projects</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                      <span className="text-xs text-muted-foreground">Bid Amount</span>
                                      <p className="font-semibold">{formatCurrency(bid.bidAmount)}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-muted-foreground">Timeline</span>
                                      <p className="text-sm">{bid.proposedTimeline}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-muted-foreground">Status</span>
                                      <p>{getBidStatusBadge(bid.status)}</p>
                                    </div>
                                    <div>
                                      <span className="text-xs text-muted-foreground">Date</span>
                                      <p className="text-sm">{formatDate(bid.createdAt)}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <Separator orientation="vertical" className="hidden md:inline-block" />
                                <Separator className="md:hidden" />
                                
                                <div className="flex-grow">
                                  <h4 className="font-medium mb-1">Proposal</h4>
                                  <p className="text-sm whitespace-pre-wrap">{bid.description}</p>
                                  
                                  {bid.status === 'pending' && (
                                    <div className="flex justify-end mt-4 gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => {
                                          // Reject bid functionality would go here
                                          toast({
                                            title: "Feature Not Available",
                                            description: "Bid rejection functionality is not implemented yet.",
                                          });
                                        }}
                                      >
                                        Reject
                                      </Button>
                                      <Button 
                                        size="sm"
                                        onClick={() => handleAwardServiceRequest(bid)}
                                        disabled={awardServiceRequestMutation.isPending}
                                      >
                                        {awardServiceRequestMutation.isPending && bid.id === selectedBid?.id && (
                                          <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-white rounded-full" />
                                        )}
                                        <Award className="h-4 w-4 mr-1" />
                                        Award Project
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {bid.status === 'accepted' && (
                                    <div className="mt-4 p-2 bg-green-100 text-green-800 rounded-md flex items-center">
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      <span className="text-sm">This bid has been accepted and the service provider has been notified.</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          )}
          
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}