import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Download,
  Search,
  ShoppingBag,
  ArrowUpDown,
  Truck,
  PackageCheck,
  Clock,
  ClipboardCheck,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  MapPin,
  DollarSign
} from "lucide-react";
import AdminDashboardLayout from "@/components/admin/admin-dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Type definitions for orders
interface OrderItem {
  id: number;
  materialId: number;
  materialName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image?: string;
}

interface Order {
  id: number;
  userId: number;
  username: string;
  userFullName?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  items: OrderItem[];
  shippingAddress: string;
  phoneNumber?: string;
  email?: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
  updatedAt: string;
  deliveryDate?: string;
  trackingNumber?: string;
  projectId?: number;
  projectName?: string;
  notes?: string;
}

export default function AdminOrdersPage() {
  const { adminUser } = useDirectAdminAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedTab, setSelectedTab] = useState("all");
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<{ [key: number]: boolean }>({});

  // Query to get all orders
  const { 
    data: orders = [], 
    isLoading,
    error,
    refetch: refetchOrders
  } = useQuery<Order[]>({
    queryKey: ["/api/direct-admin/orders"],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') {
        return [];
      }
      
      try {
        const response = await apiRequest("POST", "/api/direct-admin/orders", {
          adminUsername: adminUser.username
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch orders: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching orders:", error);
        throw error;
      }
    },
    staleTime: 60000,
    enabled: false,
  });
  
  // Once admin authentication is complete, trigger the query
  useEffect(() => {
    if (adminUser && adminUser.role === 'admin') {
      refetchOrders();
    }
  }, [adminUser, refetchOrders]);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Toggle order details expansion
  const toggleOrderExpand = (orderId: number) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Filter orders based on search query and tab
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.userFullName && order.userFullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      order.id.toString().includes(searchQuery) ||
      (order.trackingNumber && order.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.projectName && order.projectName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTab = selectedTab === "all" || order.status === selectedTab;
    
    return matchesSearch && matchesTab;
  });

  // Open view dialog
  const openViewDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  // Get progress value based on order status
  const getOrderProgress = (status: string): number => {
    switch (status) {
      case 'pending':
        return 25;
      case 'processing':
        return 50;
      case 'shipped':
        return 75;
      case 'delivered':
        return 100;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Processing</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Shipped</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Format currency with Ghana Cedi symbol
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Handle export to CSV
  const handleExportCSV = () => {
    try {
      // Create CSV content
      let csvContent = "Order ID,Customer,Status,Items,Total,Payment Status,Date\n";
      
      filteredOrders.forEach(order => {
        const itemCount = order.items.length;
        const row = [
          order.id,
          order.username,
          order.status,
          itemCount,
          order.totalAmount,
          order.paymentStatus,
          formatDate(order.createdAt)
        ];
        csvContent += row.join(",") + "\n";
      });
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `orders-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      
      toast({
        title: "Export Successful",
        description: `${filteredOrders.length} orders exported to CSV`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not export orders to CSV",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminDashboardLayout title="Orders Management">
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">
                  <ShoppingBag className="inline-block mr-2 h-6 w-6" />
                  Orders Management
                </CardTitle>
                <CardDescription>
                  View and manage all customer orders
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full md:w-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="processing">Processing</TabsTrigger>
                  <TabsTrigger value="shipped">Shipped</TabsTrigger>
                  <TabsTrigger value="delivered">Delivered</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>Failed to load orders. Please try again later.</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingBag className="mx-auto h-8 w-8 mb-2" />
                <p>No orders found</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>
                        <div className="flex items-center space-x-1">
                          <span>Order</span>
                          <ArrowUpDown size={16} />
                        </div>
                      </TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <>
                        <TableRow key={order.id}>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => toggleOrderExpand(order.id)}
                              className="p-0 h-8 w-8"
                            >
                              {expandedOrders[order.id] ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">#{order.id}</div>
                            <div className="text-xs text-muted-foreground">
                              {order.items.length} items
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{order.username}</div>
                            {order.projectName && (
                              <div className="text-xs text-muted-foreground">
                                Project: {order.projectName}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDate(order.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(order.status)}
                              <Progress 
                                value={getOrderProgress(order.status)} 
                                className="h-1.5 w-16"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {getPaymentStatusBadge(order.paymentStatus)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(order.totalAmount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openViewDialog(order)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedOrders[order.id] && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30 p-0">
                              <div className="p-4">
                                <div className="text-sm font-medium mb-2">Order Details</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <div className="flex items-start gap-2 mb-2">
                                      <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                      <div>
                                        <div className="text-sm font-medium">Order Date</div>
                                        <div className="text-sm">{formatDate(order.createdAt)}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2 mb-2">
                                      <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                      <div>
                                        <div className="text-sm font-medium">Customer</div>
                                        <div className="text-sm">{order.username}</div>
                                        {order.email && <div className="text-sm">{order.email}</div>}
                                        {order.phoneNumber && <div className="text-sm">{order.phoneNumber}</div>}
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-start gap-2 mb-2">
                                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                      <div>
                                        <div className="text-sm font-medium">Shipping Address</div>
                                        <div className="text-sm">{order.shippingAddress}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                      <div>
                                        <div className="text-sm font-medium">Payment Method</div>
                                        <div className="text-sm">{order.paymentMethod}</div>
                                        <div className="text-sm">{getPaymentStatusBadge(order.paymentStatus)}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-4">
                                  <div className="text-sm font-medium mb-2">Items</div>
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Item</TableHead>
                                          <TableHead className="text-right">Quantity</TableHead>
                                          <TableHead className="text-right">Unit Price</TableHead>
                                          <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {order.items.map((item) => (
                                          <TableRow key={item.id}>
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                {item.image && (
                                                  <img 
                                                    src={item.image} 
                                                    alt={item.materialName}
                                                    className="h-8 w-8 object-cover rounded" 
                                                  />
                                                )}
                                                <span>{item.materialName}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                                          </TableRow>
                                        ))}
                                        <TableRow>
                                          <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                                          <TableCell className="text-right font-bold">{formatCurrency(order.totalAmount)}</TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-screen overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Placed on {selectedOrder && formatDate(selectedOrder.createdAt)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <ScrollArea className="flex-grow pr-4 -mr-4 max-h-[calc(80vh-120px)]">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        <User className="h-4 w-4 inline mr-2" />
                        Customer Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                          <dd>{selectedOrder.username}</dd>
                        </div>
                        {selectedOrder.email && (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                            <dd>{selectedOrder.email}</dd>
                          </div>
                        )}
                        {selectedOrder.phoneNumber && (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                            <dd>{selectedOrder.phoneNumber}</dd>
                          </div>
                        )}
                        {selectedOrder.projectName && (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Project</dt>
                            <dd>{selectedOrder.projectName}</dd>
                          </div>
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        <Truck className="h-4 w-4 inline mr-2" />
                        Shipping Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Address</dt>
                          <dd>{selectedOrder.shippingAddress}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                          <dd>{getStatusBadge(selectedOrder.status)}</dd>
                        </div>
                        {selectedOrder.trackingNumber && (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Tracking</dt>
                            <dd>{selectedOrder.trackingNumber}</dd>
                          </div>
                        )}
                        {selectedOrder.deliveryDate && (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Delivery Date</dt>
                            <dd>{formatDate(selectedOrder.deliveryDate)}</dd>
                          </div>
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <PackageCheck className="h-4 w-4 inline mr-2" />
                      Order Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {item.image && (
                                  <img 
                                    src={item.image} 
                                    alt={item.materialName}
                                    className="h-10 w-10 object-cover rounded" 
                                  />
                                )}
                                <span>{item.materialName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="text-right py-2 font-medium">Total</td>
                          <td className="text-right py-2 font-bold">{formatCurrency(selectedOrder.totalAmount)}</td>
                        </tr>
                      </tfoot>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <DollarSign className="h-4 w-4 inline mr-2" />
                      Payment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Payment Method</dt>
                        <dd>{selectedOrder.paymentMethod}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Payment Status</dt>
                        <dd>{getPaymentStatusBadge(selectedOrder.paymentStatus)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Total Amount</dt>
                        <dd className="font-bold">{formatCurrency(selectedOrder.totalAmount)}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                {selectedOrder.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        <ClipboardCheck className="h-4 w-4 inline mr-2" />
                        Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>{selectedOrder.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
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