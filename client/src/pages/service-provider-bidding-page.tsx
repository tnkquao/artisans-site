import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  Gavel, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Search,
  DollarSign,
  Calendar,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Slider } from "@/components/ui/slider";

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
  userBidStatus?: string;
  bidAmount?: number;
  bidId?: number;
  bidPoints?: number;
}

interface BidFormData {
  amount: number;
  description: string;
  timeframe: number;
  pointsToUse: number;
  materialsCost: number;
  laborCost: number;
  equipmentCost: number;
  overheadCost: number;
  contingency: number;
  paymentSchedule: string;
}

export default function ServiceProviderBiddingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [bidFormData, setBidFormData] = useState<BidFormData>({
    amount: 0,
    description: '',
    timeframe: 30,
    pointsToUse: 50,
    materialsCost: 0,
    laborCost: 0,
    equipmentCost: 0,
    overheadCost: 0,
    contingency: 5,
    paymentSchedule: 'milestone'
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Redirect if not a service provider
  if (user && user.role !== 'service_provider') {
    setLocation('/');
    return null;
  }

  // State for direct API requests
  const [directRequests, setDirectRequests] = useState<ServiceRequest[]>([]);
  const [isDirectLoading, setIsDirectLoading] = useState(false);
  const [directError, setDirectError] = useState<Error | null>(null);
  const [isUsingDirectApi, setIsUsingDirectApi] = useState(false);
  
  // Fetch service requests available for bidding
  const { 
    data: availableRequests = [], 
    isLoading,
    error,
    isError
  } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests/bidding"],
    staleTime: 30000,
    onError: async (err) => {
      console.warn("Authentication error detected when user should be logged in:", err);
      await fetchBiddingRequestsDirectly();
    }
  });
  
  // Function to fetch bidding requests using direct API as fallback
  const fetchBiddingRequestsDirectly = async () => {
    try {
      console.log("Standard endpoint failed, falling back to direct endpoint");
      setIsDirectLoading(true);
      setDirectError(null);
      
      // Get stored user credentials
      const userInfo = localStorage.getItem('userInfo');
      if (!userInfo) {
        throw new Error("User credentials not found");
      }
      
      const { userId, username, role } = JSON.parse(userInfo);
      
      const response = await apiRequest("POST", "/api/provider-bidding-direct", {
        userId,
        username,
        role
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch bidding requests");
      }
      
      const data = await response.json();
      console.log(`Fetched ${data.length} bidding requests via direct API`);
      setDirectRequests(data);
      setIsUsingDirectApi(true);
    } catch (error) {
      console.error("Direct endpoint also failed");
      console.error("Error fetching service requests:", error);
      setDirectError(error instanceof Error ? error : new Error("Unknown error"));
    } finally {
      setIsDirectLoading(false);
    }
  };
  
  // Combine standard and direct requests, prioritizing direct when standard fails
  // Always ensure combinedRequests is an array to prevent null/undefined errors
  const combinedRequests = isUsingDirectApi ? (directRequests || []) : (availableRequests || []);
  const isCombinedLoading = (isLoading && !isUsingDirectApi) || isDirectLoading;
  const combinedError = isUsingDirectApi ? directError : error;
  
  // Fetch user points
  const { 
    data: userPointsData,
    isLoading: isLoadingPoints
  } = useQuery({
    queryKey: ["/api/user/points"],
    staleTime: 60000,
  });

  const userPoints = userPointsData?.points || 0;

  // Submit bid mutation
  const submitBidMutation = useMutation({
    mutationFn: async (data: { serviceRequestId: number } & BidFormData) => {
      const response = await apiRequest("POST", "/api/bids", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit bid");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bid Submitted",
        description: "Your bid has been successfully submitted.",
        variant: "default",
      });
      setDialogOpen(false);
      setSelectedRequest(null);
      // Reset form
      setBidFormData({
        amount: 0,
        description: '',
        timeframe: 30,
        pointsToUse: 50,
        materialsCost: 0,
        laborCost: 0,
        equipmentCost: 0,
        overheadCost: 0,
        contingency: 5,
        paymentSchedule: 'milestone'
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/bidding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/points"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Bid Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle bid submission
  const handleSubmitBid = () => {
    if (!selectedRequest) return;
    
    if (bidFormData.pointsToUse > userPoints) {
      toast({
        title: "Insufficient Points",
        description: `You only have ${userPoints} points available.`,
        variant: "destructive",
      });
      return;
    }

    if (bidFormData.amount <= 0) {
      toast({
        title: "Invalid Bid Amount",
        description: "Please enter a valid bid amount.",
        variant: "destructive",
      });
      return;
    }

    if (!bidFormData.description.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a detailed description of your proposal.",
        variant: "destructive",
      });
      return;
    }

    submitBidMutation.mutate({
      serviceRequestId: selectedRequest.id,
      ...bidFormData
    });
  };

  // Filter service requests - add safety checks for null values
  const filteredRequests = combinedRequests
    .filter(request => request && request.serviceType && 
      (selectedServiceType === 'all' || request.serviceType === selectedServiceType))
    .filter(request => {
      if (!searchQuery || !request) return true;
      
      const query = searchQuery.toLowerCase();
      const serviceType = request.serviceType || '';
      const requestType = request.requestType || '';
      const description = request.description || '';
      const location = request.location || '';
      
      return (
        serviceType.toLowerCase().includes(query) ||
        requestType.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query) ||
        location.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (!a || !a.createdAt) return 1;
      if (!b || !b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Get unique service types, ensuring we filter out any undefined values
  const serviceTypes = ['all', ...new Set(combinedRequests
    .filter(r => r && r.serviceType)
    .map(r => r.serviceType)
  )];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const calculateSubtotal = () => {
    return bidFormData.materialsCost + 
           bidFormData.laborCost + 
           bidFormData.equipmentCost + 
           bidFormData.overheadCost;
  };
  
  const calculateContingency = () => {
    const subtotal = calculateSubtotal();
    return Math.round(subtotal * (bidFormData.contingency / 100));
  };
  
  const calculateTotal = () => {
    return calculateSubtotal() + calculateContingency();
  };
  
  // Auto-update total bid amount when component costs change
  useEffect(() => {
    const calculatedTotal = calculateTotal();
    if (calculatedTotal > 0 && calculatedTotal !== bidFormData.amount) {
      setBidFormData(prev => ({
        ...prev,
        amount: calculatedTotal
      }));
    }
  }, [
    bidFormData.materialsCost,
    bidFormData.laborCost,
    bidFormData.equipmentCost,
    bidFormData.overheadCost,
    bidFormData.contingency
  ]);

  return (
    <DashboardLayout title="Bidding Opportunities">
      {/* Header Section */}
      <section className="mb-8">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            <div className="md:flex justify-between items-center">
              <div className="mb-4 md:mb-0">
                <h2 className="text-2xl font-bold text-gray-800">Service Request Bidding</h2>
                <p className="text-gray-600 mt-1">
                  Bid on open service requests and win projects
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-primary/10 px-4 py-2 rounded-lg flex items-center">
                  <Gavel className="text-primary mr-2 h-5 w-5" />
                  <div>
                    <p className="text-sm text-gray-600">Available Points</p>
                    <p className="font-semibold text-primary">{isLoadingPoints ? 'Loading...' : userPoints}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setLocation('/provider-dashboard')}
                  variant="outline"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Bidding Guidelines */}
      <section className="mb-6">
        <Card className="bg-primary/5 border border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start">
              <AlertCircle className="text-primary mt-1 mr-4 h-5 w-5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-primary mb-2">Bidding Guidelines</h3>
                <ul className="text-gray-700 space-y-1 text-sm">
                  <li>• Each bid requires a minimum of 50 points (you can use more for more competitive bids)</li>
                  <li>• Provide detailed proposal describing how you'll complete the work</li>
                  <li>• Be realistic with your timeline and cost estimates</li>
                  <li>• Points are deducted when you submit a bid, regardless of whether you win the project</li>
                  <li>• You earn points by completing projects successfully and receiving good ratings</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 w-full md:w-80"
          />
        </div>
        <div className="flex gap-4 items-center">
          <div className="w-full md:w-60">
            <Select
              value={selectedServiceType}
              onValueChange={(value) => setSelectedServiceType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by service type" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type === 'all' ? 'All Service Types' : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Available Service Requests */}
      <section className="mb-8">
        {isCombinedLoading ? (
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-gray-500">Loading bidding opportunities...</p>
            </div>
          </div>
        ) : combinedError && !combinedRequests?.length ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Requests</h3>
              <p className="text-red-600">Failed to load service requests. Please try again later.</p>
              {isUsingDirectApi && (
                <p className="text-yellow-600 mt-2">Both standard and direct API attempts failed.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredRequests.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Gavel className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No Bidding Opportunities Available</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    There are currently no service requests available for bidding that match your criteria.
                    {searchQuery && " Try adjusting your search or filters."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="h-full flex flex-col border-gray-200 hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-semibold">
                            {request.requestType}
                          </CardTitle>
                          <CardDescription className="mt-1 text-sm">
                            {request.serviceType}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${request.userBidStatus === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                              request.userBidStatus === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' : 
                              request.userBidStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                              'bg-blue-50 text-blue-700 border-blue-200'}
                          `}
                        >
                          {request.userBidStatus ? `Bid ${request.userBidStatus}` : "Open for bids"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Location</p>
                          <p className="text-gray-800">{request.location}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Description</p>
                          <p className="text-gray-800 line-clamp-3">{request.description}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Budget</p>
                            <p className="text-gray-800 font-medium">
                              {request.budget ? formatCurrency(request.budget) : 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Posted</p>
                            <p className="text-gray-800">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {request.userBidStatus && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-md">
                            <p className="text-sm font-medium text-gray-500">Your Bid</p>
                            <p className="text-gray-800 font-medium">
                              {formatCurrency(request.bidAmount || 0)} • {request.bidPoints} points used
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4">
                      {request.userBidStatus ? (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          disabled={request.userBidStatus !== 'pending'}
                          onClick={() => {
                            setSelectedRequest(request);
                            setBidFormData({
                              amount: request.bidAmount || 0,
                              description: '',
                              timeframe: 30,
                              pointsToUse: request.bidPoints || 50,
                              materialsCost: 0,
                              laborCost: 0,
                              equipmentCost: 0,
                              overheadCost: 0,
                              contingency: 5,
                              paymentSchedule: 'milestone'
                            });
                            setDialogOpen(true);
                          }}
                        >
                          {request.userBidStatus === 'pending' ? 'Update Bid' : 'View Bid Details'}
                        </Button>
                      ) : (
                        <Button 
                          className="w-full"
                          onClick={() => {
                            setSelectedRequest(request);
                            setBidFormData({
                              amount: request.budget || 0,
                              description: '',
                              timeframe: 30,
                              pointsToUse: 50,
                              materialsCost: 0,
                              laborCost: 0,
                              equipmentCost: 0,
                              overheadCost: 0,
                              contingency: 5,
                              paymentSchedule: 'milestone'
                            });
                            setDialogOpen(true);
                          }}
                        >
                          Submit Bid
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Bid Submission Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.userBidStatus ? 'Update Bid' : 'Submit Bid'} for Service Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && 
                `${selectedRequest.requestType} in ${selectedRequest.location}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bidAmount" className="text-lg font-semibold">Total Bid Amount (₵)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">₵</span>
                <Input 
                  id="bidAmount"
                  type="number"
                  placeholder="Enter your total bid amount"
                  className="pl-8"
                  value={bidFormData.amount}
                  onChange={(e) => setBidFormData({
                    ...bidFormData,
                    amount: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            </div>
            
            <div className="space-y-3 p-4 border rounded-md bg-slate-50">
              <h3 className="font-semibold text-base mb-2">Cost Breakdown</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="materialsCost">Materials Cost (₵)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₵</span>
                    <Input 
                      id="materialsCost"
                      type="number"
                      placeholder="Materials cost"
                      className="pl-8"
                      value={bidFormData.materialsCost}
                      onChange={(e) => setBidFormData({
                        ...bidFormData,
                        materialsCost: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="laborCost">Labor Cost (₵)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₵</span>
                    <Input 
                      id="laborCost"
                      type="number"
                      placeholder="Labor cost"
                      className="pl-8"
                      value={bidFormData.laborCost}
                      onChange={(e) => setBidFormData({
                        ...bidFormData,
                        laborCost: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="equipmentCost">Equipment Cost (₵)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₵</span>
                    <Input 
                      id="equipmentCost"
                      type="number"
                      placeholder="Equipment cost"
                      className="pl-8"
                      value={bidFormData.equipmentCost}
                      onChange={(e) => setBidFormData({
                        ...bidFormData,
                        equipmentCost: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="overheadCost">Overhead Cost (₵)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₵</span>
                    <Input 
                      id="overheadCost"
                      type="number"
                      placeholder="Overhead cost"
                      className="pl-8"
                      value={bidFormData.overheadCost}
                      onChange={(e) => setBidFormData({
                        ...bidFormData,
                        overheadCost: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 mt-2">
                <div className="flex justify-between">
                  <Label htmlFor="contingency">Contingency Percentage (%)</Label>
                  <span className="text-sm text-gray-500">{bidFormData.contingency}%</span>
                </div>
                <Slider
                  id="contingency"
                  min={0}
                  max={20}
                  step={1}
                  value={[bidFormData.contingency]}
                  onValueChange={(value) => setBidFormData({
                    ...bidFormData,
                    contingency: value[0]
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contingency covers unexpected costs during the project execution.
                </p>
              </div>
              
              <div className="space-y-2 mt-2">
                <Label htmlFor="paymentSchedule">Payment Schedule</Label>
                <Select
                  value={bidFormData.paymentSchedule}
                  onValueChange={(value) => setBidFormData({
                    ...bidFormData,
                    paymentSchedule: value
                  })}
                >
                  <SelectTrigger id="paymentSchedule">
                    <SelectValue placeholder="Select payment schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upfront">Upfront (100% before start)</SelectItem>
                    <SelectItem value="milestone">Milestone-based payments</SelectItem>
                    <SelectItem value="phase">Phase completion payments</SelectItem>
                    <SelectItem value="monthly">Monthly progress payments</SelectItem>
                    <SelectItem value="completion">Upon completion (100% at end)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Cost Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-base mb-2">Cost Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Materials</span>
                    <span>{formatCurrency(bidFormData.materialsCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Labor</span>
                    <span>{formatCurrency(bidFormData.laborCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Equipment</span>
                    <span>{formatCurrency(bidFormData.equipmentCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Overhead</span>
                    <span>{formatCurrency(bidFormData.overheadCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium pt-1 border-t">
                    <span className="text-gray-700">Subtotal</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Contingency ({bidFormData.contingency}%)</span>
                    <span>{formatCurrency(calculateContingency())}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t">
                    <span>Total Bid Amount</span>
                    <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="timeframe">Estimated Timeframe (days)</Label>
                <span className="text-sm text-gray-500">{bidFormData.timeframe} days</span>
              </div>
              <Slider
                id="timeframe"
                min={1}
                max={90}
                step={1}
                value={[bidFormData.timeframe]}
                onValueChange={(value) => setBidFormData({
                  ...bidFormData,
                  timeframe: value[0]
                })}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="pointsToUse">Points to Use</Label>
                <span className="text-sm text-gray-500">{bidFormData.pointsToUse} of {userPoints} available</span>
              </div>
              <Slider
                id="pointsToUse"
                min={50}
                max={Math.min(500, userPoints)}
                step={10}
                value={[bidFormData.pointsToUse]}
                onValueChange={(value) => setBidFormData({
                  ...bidFormData,
                  pointsToUse: value[0]
                })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Using more points can increase your chances of winning the bid. Minimum 50 points required.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Proposal Description</Label>
              <Textarea 
                id="description"
                placeholder="Describe your approach, qualifications, and why you should be selected for this project..."
                rows={5}
                value={bidFormData.description}
                onChange={(e) => setBidFormData({
                  ...bidFormData,
                  description: e.target.value
                })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitBid}
              disabled={submitBidMutation.isPending || bidFormData.amount <= 0 || !bidFormData.description.trim()}
            >
              {submitBidMutation.isPending ? 'Submitting...' : selectedRequest?.userBidStatus ? 'Update Bid' : 'Submit Bid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}