import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Check, Clock, Filter, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import AdminDashboardLayout from "@/layouts/admin-dashboard-layout";
import { Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Type definitions for service requests and bids
interface ServiceRequest {
  id: number;
  clientId: number;
  serviceType: string;
  requestType: string;
  description: string;
  location: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  coordinates: any;
  attachments: any;
  timeline: string | null;
  budget: number | null;
  adminNotes: string | null;
  assignedServiceProviderId: number | null;
  client?: User;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  address?: string;
  businessName?: string;
  serviceType?: string;
  bio?: string;
  profileImageUrl?: string;
  points?: number;
}

interface ServiceRequestBid {
  id: number;
  serviceRequestId: number;
  serviceProviderId: number;
  amount: number;
  description: string;
  timeframe: number;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  pointsToUse: number;
  materialsIncluded: boolean;
  materialsCost: number;
  laborCost: number;
  equipmentCost: number;
  overheadCost: number;
  contingency: number;
  paymentSchedule: string;
  anonymousIdentifier: string;
  selectedByAdmin: boolean;
  selectedByClient: boolean;
  adminNotes: string | null;
  serviceProvider?: User;
}

const AdminBidManagementPage: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin } = useAdminAuth();
  const [selectedServiceRequestId, setSelectedServiceRequestId] = useState<number | null>(null);
  const [selectedBids, setSelectedBids] = useState<number[]>([]);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("pending_bids");
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);

  // Fetch all service requests
  const { data: serviceRequests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["/api/service-requests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/service-requests");
      const data = await response.json();
      return data as ServiceRequest[];
    },
  });

  // Fetch all service request bids
  const { data: bids, isLoading: isLoadingBids } = useQuery({
    queryKey: ["/api/service-request-bids"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/service-request-bids");
      const data = await response.json();
      return data as ServiceRequestBid[];
    },
  });

  // Fetch service request bids by service request ID
  const { data: requestBids, isLoading: isLoadingRequestBids } = useQuery({
    queryKey: ["/api/service-request-bids/request", selectedServiceRequestId],
    queryFn: async () => {
      if (!selectedServiceRequestId) return [];
      const response = await apiRequest(
        "GET",
        `/api/service-request-bids/request/${selectedServiceRequestId}`
      );
      const data = await response.json();
      return data as ServiceRequestBid[];
    },
    enabled: !!selectedServiceRequestId,
  });

  // Mutation for forwarding selected bids to client
  const forwardBidsMutation = useMutation({
    mutationFn: async ({ serviceRequestId, bidIds, notes }: { serviceRequestId: number; bidIds: number[]; notes: string }) => {
      const response = await apiRequest(
        "POST",
        `/api/service-requests/${serviceRequestId}/forward-bids`,
        { bidIds, adminNotes: notes }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bids forwarded successfully",
        description: "The selected bids have been forwarded to the client",
        variant: "default",
      });
      // Reset state and refetch data
      setSelectedBids([]);
      setAdminNotes("");
      setIsForwardDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/service-request-bids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/service-request-bids/request", selectedServiceRequestId] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error forwarding bids",
        description: error.message || "There was an error forwarding the bids",
        variant: "destructive",
      });
    },
  });

  // Filter service requests based on active tab
  const filteredServiceRequests = serviceRequests?.filter((req) => {
    if (activeTab === "pending_bids") {
      return req.status === "pending" || req.status === "reviewing_bids";
    } else if (activeTab === "forwarded_bids") {
      return req.status === "bids_forwarded";
    } else if (activeTab === "assigned") {
      return req.status === "assigned";
    }
    return true;
  });

  // Handle forwarding selected bids to client
  const handleForwardBids = () => {
    if (!selectedServiceRequestId) {
      toast({
        title: "No service request selected",
        description: "Please select a service request first",
        variant: "destructive",
      });
      return;
    }

    if (selectedBids.length === 0) {
      toast({
        title: "No bids selected",
        description: "Please select at least one bid to forward",
        variant: "destructive",
      });
      return;
    }

    if (selectedBids.length > 4) {
      toast({
        title: "Too many bids selected",
        description: "Please select a maximum of 4 bids to forward",
        variant: "destructive",
      });
      return;
    }

    forwardBidsMutation.mutate({
      serviceRequestId: selectedServiceRequestId,
      bidIds: selectedBids,
      notes: adminNotes,
    });
  };

  // Handle checkbox selection
  const handleBidSelection = (bidId: number) => {
    if (selectedBids.includes(bidId)) {
      setSelectedBids(selectedBids.filter((id) => id !== bidId));
    } else {
      setSelectedBids([...selectedBids, bidId]);
    }
  };

  if (!isAdmin) {
    return (
      <AdminDashboardLayout>
        <div className="flex flex-col items-center justify-center h-[80vh]">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600">
            You do not have permission to view this page
          </p>
        </div>
      </AdminDashboardLayout>
    );
  }

  if (isLoadingRequests || isLoadingBids) {
    return (
      <AdminDashboardLayout>
        <div className="flex flex-col items-center justify-center h-[80vh]">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p>Loading bid management system...</p>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Bid Management System</h1>
        <p className="text-gray-600 mb-6">
          Review and manage bids for service requests. Select and forward the most
          suitable bids to clients.
        </p>

        <Tabs defaultValue="pending_bids" onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending_bids">Pending Bids</TabsTrigger>
            <TabsTrigger value="forwarded_bids">Forwarded Bids</TabsTrigger>
            <TabsTrigger value="assigned">Assigned Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="pending_bids" className="space-y-4">
            <h2 className="text-xl font-bold mt-4">Service Requests with Pending Bids</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServiceRequests?.length === 0 ? (
                <p className="text-gray-500 col-span-3">No service requests with pending bids found.</p>
              ) : (
                filteredServiceRequests?.map((request) => (
                  <Card 
                    key={request.id} 
                    className={`${
                      selectedServiceRequestId === request.id ? "border-primary" : "border-gray-200"
                    } cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => setSelectedServiceRequestId(request.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{request.serviceType}</CardTitle>
                        <Badge variant={
                          request.status === "pending" ? "outline" :
                          request.status === "reviewing_bids" ? "secondary" :
                          "default"
                        }>
                          {request.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <CardDescription>
                        Request #{request.id} • {new Date(request.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm mb-1">{request.description.slice(0, 100)}...</p>
                      <p className="text-xs text-gray-500 mt-2">Location: {request.location}</p>
                      {request.budget && (
                        <p className="text-xs text-gray-500">Budget: GHC {request.budget.toLocaleString()}</p>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <p className="text-xs text-gray-500">
                        Client: {request.client?.fullName || request.clientId}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {bids?.filter(b => b.serviceRequestId === request.id).length || 0} Bids
                      </Badge>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="forwarded_bids" className="space-y-4">
            <h2 className="text-xl font-bold mt-4">Service Requests with Forwarded Bids</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServiceRequests?.length === 0 ? (
                <p className="text-gray-500 col-span-3">No service requests with forwarded bids found.</p>
              ) : (
                filteredServiceRequests?.map((request) => (
                  <Card 
                    key={request.id} 
                    className={`${
                      selectedServiceRequestId === request.id ? "border-primary" : "border-gray-200"
                    } cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => setSelectedServiceRequestId(request.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{request.serviceType}</CardTitle>
                        <Badge variant="default">
                          {request.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <CardDescription>
                        Request #{request.id} • {new Date(request.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm mb-1">{request.description.slice(0, 100)}...</p>
                      <p className="text-xs text-gray-500 mt-2">Location: {request.location}</p>
                      {request.budget && (
                        <p className="text-xs text-gray-500">Budget: GHC {request.budget.toLocaleString()}</p>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <p className="text-xs text-gray-500">
                        Client: {request.client?.fullName || request.clientId}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        Awaiting Client Selection
                      </Badge>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="assigned" className="space-y-4">
            <h2 className="text-xl font-bold mt-4">Assigned Service Requests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServiceRequests?.length === 0 ? (
                <p className="text-gray-500 col-span-3">No assigned service requests found.</p>
              ) : (
                filteredServiceRequests?.map((request) => (
                  <Card 
                    key={request.id} 
                    className={`${
                      selectedServiceRequestId === request.id ? "border-primary" : "border-gray-200"
                    } cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => setSelectedServiceRequestId(request.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{request.serviceType}</CardTitle>
                        <Badge variant="success" className="bg-green-100 text-green-800">
                          Assigned
                        </Badge>
                      </div>
                      <CardDescription>
                        Request #{request.id} • {new Date(request.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm mb-1">{request.description.slice(0, 100)}...</p>
                      <p className="text-xs text-gray-500 mt-2">Location: {request.location}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <p className="text-xs text-gray-500">
                        Client: {request.client?.fullName || request.clientId}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Provider ID: {request.assignedServiceProviderId}
                      </Badge>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {selectedServiceRequestId && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Bids for Request #{selectedServiceRequestId}
              </h2>
              
              {activeTab === "pending_bids" && requestBids && requestBids.length > 0 && (
                <Button
                  onClick={() => setIsForwardDialogOpen(true)}
                  disabled={selectedBids.length === 0 || selectedBids.length > 4}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Forward Selected Bids to Client
                </Button>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium mb-2">Request Details</h3>
              {serviceRequests?.find(r => r.id === selectedServiceRequestId) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Service Type</p>
                    <p className="font-medium">
                      {serviceRequests.find(r => r.id === selectedServiceRequestId)?.serviceType}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Request Type</p>
                    <p className="font-medium">
                      {serviceRequests.find(r => r.id === selectedServiceRequestId)?.requestType}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Budget</p>
                    <p className="font-medium">
                      {serviceRequests.find(r => r.id === selectedServiceRequestId)?.budget 
                        ? `GHC ${serviceRequests.find(r => r.id === selectedServiceRequestId)?.budget?.toLocaleString()}`
                        : "Not specified"}
                    </p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="font-medium">
                      {serviceRequests.find(r => r.id === selectedServiceRequestId)?.description}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isLoadingRequestBids ? (
              <div className="text-center py-10">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Loading bids...</p>
              </div>
            ) : (
              <>
                {(!requestBids || requestBids.length === 0) ? (
                  <div className="text-center py-10 border rounded-lg">
                    <p className="text-gray-500">No bids available for this service request</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableCaption>List of bids for this service request</TableCaption>
                      <TableHeader>
                        <TableRow>
                          {activeTab === "pending_bids" && (
                            <TableHead className="w-[50px]">Select</TableHead>
                          )}
                          <TableHead>Provider ID</TableHead>
                          <TableHead>Anonymous Identifier</TableHead>
                          <TableHead>Bid Amount</TableHead>
                          <TableHead>Timeframe (Days)</TableHead>
                          <TableHead>Points Used</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted on</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requestBids.map((bid) => (
                          <TableRow key={bid.id}>
                            {activeTab === "pending_bids" && (
                              <TableCell>
                                <Checkbox
                                  checked={selectedBids.includes(bid.id)}
                                  onCheckedChange={() => handleBidSelection(bid.id)}
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-medium">
                              {bid.serviceProviderId}
                            </TableCell>
                            <TableCell>{bid.anonymousIdentifier}</TableCell>
                            <TableCell>GHC {bid.amount.toLocaleString()}</TableCell>
                            <TableCell>{bid.timeframe} days</TableCell>
                            <TableCell>{bid.pointsToUse}</TableCell>
                            <TableCell>
                              <Badge variant={
                                bid.status === "pending" ? "outline" :
                                bid.status === "forwarded_to_client" ? "secondary" :
                                bid.status === "accepted" ? "default" :
                                "outline"
                              }>
                                {bid.status.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(bid.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">View Details</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle>Bid Details</DialogTitle>
                                    <DialogDescription>
                                      Comprehensive details of bid #{bid.id} for service request #{bid.serviceRequestId}
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                                    <div className="space-y-4">
                                      <div>
                                        <h3 className="font-medium text-sm">Provider Information</h3>
                                        <p className="text-gray-600">ID: {bid.serviceProviderId}</p>
                                        <p className="text-gray-600">Anonymous ID: {bid.anonymousIdentifier}</p>
                                      </div>
                                      
                                      <div>
                                        <h3 className="font-medium text-sm">Bid Details</h3>
                                        <p className="text-gray-600">Status: {bid.status.replace("_", " ")}</p>
                                        <p className="text-gray-600">Points Used: {bid.pointsToUse}</p>
                                        <p className="text-gray-600">Submitted: {new Date(bid.createdAt).toLocaleString()}</p>
                                        <p className="text-gray-600">Updated: {new Date(bid.updatedAt).toLocaleString()}</p>
                                      </div>
                                      
                                      <div>
                                        <h3 className="font-medium text-sm">Financial Details</h3>
                                        <p className="text-gray-600">Total Bid Amount: GHC {bid.amount.toLocaleString()}</p>
                                        <p className="text-gray-600">Materials Cost: GHC {bid.materialsCost.toLocaleString()}</p>
                                        <p className="text-gray-600">Labor Cost: GHC {bid.laborCost.toLocaleString()}</p>
                                        <p className="text-gray-600">Equipment Cost: GHC {bid.equipmentCost.toLocaleString()}</p>
                                        <p className="text-gray-600">Overhead Cost: GHC {bid.overheadCost.toLocaleString()}</p>
                                        <p className="text-gray-600">Contingency: {bid.contingency}%</p>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                      <div>
                                        <h3 className="font-medium text-sm">Timeline</h3>
                                        <p className="text-gray-600">Estimated Timeframe: {bid.timeframe} days</p>
                                        <p className="text-gray-600">Payment Schedule: {bid.paymentSchedule}</p>
                                      </div>
                                      
                                      <div>
                                        <h3 className="font-medium text-sm">Proposal Description</h3>
                                        <p className="text-gray-600 whitespace-pre-line">{bid.description}</p>
                                      </div>
                                      
                                      {bid.adminNotes && (
                                        <div>
                                          <h3 className="font-medium text-sm">Admin Notes</h3>
                                          <p className="text-gray-600 whitespace-pre-line">{bid.adminNotes}</p>
                                        </div>
                                      )}
                                      
                                      <div>
                                        <h3 className="font-medium text-sm">Selection Status</h3>
                                        <div className="flex space-x-4 mt-1">
                                          <Badge variant={bid.selectedByAdmin ? "default" : "outline"}>
                                            {bid.selectedByAdmin ? 
                                              <><Check className="w-3 h-3 mr-1" /> Selected by Admin</> : 
                                              "Not selected by Admin"}
                                          </Badge>
                                          <Badge variant={bid.selectedByClient ? "secondary" : "outline"}>
                                            {bid.selectedByClient ? 
                                              <><Check className="w-3 h-3 mr-1" /> Selected by Client</> : 
                                              "Not selected by Client"}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {/* Dialog for forwarding bids to client */}
            <Dialog open={isForwardDialogOpen} onOpenChange={setIsForwardDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Forward Bids to Client</DialogTitle>
                  <DialogDescription>
                    You are about to forward {selectedBids.length} selected bid{selectedBids.length !== 1 ? "s" : ""} to the client.
                    The client will be notified and can choose one of these bids.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="mb-4">
                    <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
                    <Textarea
                      id="adminNotes"
                      placeholder="Add notes about these bids for the client..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="text-sm font-medium mb-2">Selected Bids</h3>
                    <ul className="space-y-1">
                      {requestBids
                        ?.filter((bid) => selectedBids.includes(bid.id))
                        .map((bid) => (
                          <li key={bid.id} className="text-sm flex justify-between">
                            <span>Provider {bid.anonymousIdentifier}</span>
                            <span>GHC {bid.amount.toLocaleString()}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsForwardDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleForwardBids}
                    disabled={forwardBidsMutation.isPending}
                  >
                    {forwardBidsMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Forwarding...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Forward Bids
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminBidManagementPage;