import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Search,
  Wrench,
  ArrowUpDown,
  Check,
  X,
  ExternalLink,
  Clock,
  AlertCircle,
  Send,
  Filter,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import AdminDashboardLayout from "@/components/admin/admin-dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ServiceRequest } from "@shared/schema";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Type extensions for service request with client details
interface ServiceRequestWithClient {
  id: number;
  clientId: number;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientLocation?: string;
  serviceType: string;
  description: string;
  status: string;
  budget?: number;
  location?: string;
  adminNotes?: string;
  deadline?: string;
  createdAt?: string;
  additionalDetails?: string;
  assignedServiceProviderId?: number;
}

// Form schema for forwarding service request to bidding
const forwardToBiddingSchema = z.object({
  adminNotes: z.string().optional(),
  deadline: z.string().optional(),
  budget: z.number().nullable().optional().transform(v => v === null ? undefined : v),
});

type ForwardToBiddingFormValues = z.infer<typeof forwardToBiddingSchema>;

export default function AdminServiceRequestsPage() {
  const { adminUser } = useDirectAdminAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<ServiceRequestWithClient | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Create form for forwarding to bidding
  const forwardToBiddingForm = useForm<ForwardToBiddingFormValues>({
    resolver: zodResolver(forwardToBiddingSchema),
    defaultValues: {
      adminNotes: "",
      deadline: undefined,
      budget: undefined,
    },
  });

  // Query to get service requests
  const { 
    data: serviceRequests = [], 
    isLoading,
    error,
    refetch: refetchServiceRequests
  } = useQuery<ServiceRequestWithClient[]>({
    queryKey: ["/api/direct-admin/service-requests"],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') {
        return [];
      }
      
      try {
        const response = await apiRequest("POST", "/api/direct-admin/service-requests", {
          adminUsername: adminUser.username
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch service requests: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching service requests:", error);
        throw error;
      }
    },
    staleTime: 60000,
    enabled: false,
  });
  
  // Once admin authentication is complete, trigger the query
  useEffect(() => {
    if (adminUser && adminUser.role === 'admin') {
      refetchServiceRequests();
    }
  }, [adminUser, refetchServiceRequests]);

  // Mutation for forwarding to bidding system
  const forwardToBiddingMutation = useMutation({
    mutationFn: async (data: { serviceRequestId: number; adminNotes?: string; deadline?: string; budget?: number }) => {
      const response = await apiRequest("PATCH", `/api/direct-admin/service-requests/${data.serviceRequestId}/forward-to-bidding`, {
        adminUsername: adminUser?.username,
        ...data
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to forward request to bidding system");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Forwarded",
        description: "Service request has been forwarded to bidding system",
      });
      setIsForwardDialogOpen(false);
      forwardToBiddingForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/direct-admin/service-requests'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Forward",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle forwarding to bidding
  const handleForwardToBidding = (values: ForwardToBiddingFormValues) => {
    if (selectedServiceRequest) {
      forwardToBiddingMutation.mutate({
        serviceRequestId: selectedServiceRequest.id,
        adminNotes: values.adminNotes,
        deadline: values.deadline,
        budget: values.budget
      });
    }
  };

  // Open view dialog
  const openViewDialog = (request: ServiceRequestWithClient) => {
    setSelectedServiceRequest(request);
    setIsViewDialogOpen(true);
  };

  // Open forward dialog
  const openForwardDialog = (request: ServiceRequestWithClient) => {
    setSelectedServiceRequest(request);
    forwardToBiddingForm.reset({
      adminNotes: request.adminNotes || "",
      deadline: request.deadline || undefined,
      budget: request.budget || undefined
    });
    setIsForwardDialogOpen(true);
  };

  // Filter service requests based on search query and filters
  const filteredRequests = serviceRequests
    .filter(request => request.status !== 'bidding') // Filter out requests already in bidding
    .filter(request => {
      const matchesSearch = 
        request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (request.clientName && request.clientName.toLowerCase().includes(searchQuery.toLowerCase()));
      
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
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Approved</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
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

  return (
    <AdminDashboardLayout title="Service Requests">
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold">
                  <Wrench className="inline-block mr-2 h-6 w-6" />
                  Service Requests
                </CardTitle>
                <CardDescription>
                  View and manage service requests from clients
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
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
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
                <p>Failed to load service requests. Please try again later.</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wrench className="mx-auto h-8 w-8 mb-2" />
                <p>No service requests found</p>
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
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">#{request.id}</TableCell>
                        <TableCell>{request.clientName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{request.serviceType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{request.description}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openViewDialog(request)}
                              title="View details"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openForwardDialog(request)}
                              title="Forward to bidding"
                              disabled={request.status === 'bidding'}
                            >
                              <Send className="h-4 w-4" />
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

      {/* View Service Request Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Service Request #{selectedServiceRequest?.id}</DialogTitle>
            <DialogDescription>
              View details for service request #{selectedServiceRequest?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedServiceRequest && (
            <ScrollArea className="flex-grow pr-4 -mr-4 max-h-[calc(90vh-170px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Client Information
                    </h3>
                    <div className="bg-muted/50 rounded-md p-3 space-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">Name:</span>
                        <p>{selectedServiceRequest.clientName}</p>
                      </div>
                      {selectedServiceRequest.clientEmail && (
                        <div>
                          <span className="text-sm text-muted-foreground">Email:</span>
                          <p className="flex items-center">
                            <Mail className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                            {selectedServiceRequest.clientEmail}
                          </p>
                        </div>
                      )}
                      {selectedServiceRequest.clientPhone && (
                        <div>
                          <span className="text-sm text-muted-foreground">Phone:</span>
                          <p className="flex items-center">
                            <Phone className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                            {selectedServiceRequest.clientPhone}
                          </p>
                        </div>
                      )}
                      {selectedServiceRequest.clientLocation && (
                        <div>
                          <span className="text-sm text-muted-foreground">Location:</span>
                          <p className="flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                            {selectedServiceRequest.clientLocation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Wrench className="h-4 w-4 mr-2" />
                      Service Details
                    </h3>
                    <div className="bg-muted/50 rounded-md p-3 space-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">Type:</span>
                        <p><Badge variant="secondary">{selectedServiceRequest.serviceType}</Badge></p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <p>{getStatusBadge(selectedServiceRequest.status)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Created:</span>
                        <p className="flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          {formatDate(selectedServiceRequest.createdAt)}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Budget:</span>
                        <p>{formatCurrency(selectedServiceRequest.budget)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Description</h3>
                  <div className="bg-muted/50 rounded-md p-3">
                    <p className="whitespace-pre-wrap">{selectedServiceRequest.description}</p>
                  </div>
                </div>
                
                {selectedServiceRequest.location && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Service Location
                    </h3>
                    <div className="bg-muted/50 rounded-md p-3">
                      <p>{selectedServiceRequest.location}</p>
                    </div>
                  </div>
                )}
                
                {selectedServiceRequest.additionalDetails && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Additional Details</h3>
                    <div className="bg-muted/50 rounded-md p-3">
                      <p className="whitespace-pre-wrap">{selectedServiceRequest.additionalDetails}</p>
                    </div>
                  </div>
                )}

                {selectedServiceRequest.adminNotes && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Admin Notes</h3>
                    <div className="bg-muted/50 rounded-md p-3">
                      <p className="whitespace-pre-wrap">{selectedServiceRequest.adminNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter className="mt-4 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setIsViewDialogOpen(false)}
            >
              Close
            </Button>
            
            {selectedServiceRequest && selectedServiceRequest.status !== 'bidding' && (
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  openForwardDialog(selectedServiceRequest);
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Forward to Bidding
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward to Bidding Dialog */}
      <Dialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Forward to Bidding System</DialogTitle>
            <DialogDescription>
              Forward this service request to the bidding system for service providers
            </DialogDescription>
          </DialogHeader>
          
          <Form {...forwardToBiddingForm}>
            <form onSubmit={forwardToBiddingForm.handleSubmit(handleForwardToBidding)} className="space-y-4">
              <FormField
                control={forwardToBiddingForm.control}
                name="adminNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes for service providers"
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      These notes will be visible to service providers bidding on this request
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={forwardToBiddingForm.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bidding Deadline</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>
                        Last date for receiving bids
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={forwardToBiddingForm.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (GHS)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? undefined : Number(value));
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Estimated budget for the service
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => setIsForwardDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={forwardToBiddingMutation.isPending}
                >
                  {forwardToBiddingMutation.isPending && (
                    <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-white rounded-full" />
                  )}
                  Forward to Bidding
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}