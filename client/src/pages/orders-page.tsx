import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { OrderTable } from "@/components/orders/order-table";
import { useAuth } from "@/hooks/use-auth";
import { Truck, Calendar, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Order, Project } from "@shared/schema";
import { format } from "date-fns";
import { Link } from "wouter";

export default function OrdersPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tab, setTab] = useState("all");

  // Fetch orders
  const { 
    data: orders = [], 
    isLoading: isLoadingOrders,
    error: ordersError,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Fetch projects for reference
  const { 
    data: projects = [],
  } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Helper to get project name
  const getProjectName = (projectId?: number) => {
    if (!projectId) return "N/A";
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : `Project #${projectId}`;
  };

  // Filter orders by tab, search term, and status
  const filteredOrders = orders.filter(order => {
    // Tab filter
    if (tab === "processing" && order.status !== "processing") return false;
    if (tab === "in_transit" && order.status !== "in_transit") return false;
    if (tab === "delivered" && order.status !== "delivered") return false;
    
    // Status filter (redundant with tabs but kept for flexibility)
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    
    // Search filter
    if (searchTerm) {
      const projectName = getProjectName(order.projectId);
      const searchableText = `${order.orderId} ${projectName} ${order.deliveryAddress}`.toLowerCase();
      if (!searchableText.includes(searchTerm.toLowerCase())) return false;
    }
    
    return true;
  });

  // Sort orders by date, newest first
  const sortedOrders = [...filteredOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get counts for tabs
  const processingCount = orders.filter(o => o.status === "processing").length;
  const inTransitCount = orders.filter(o => o.status === "in_transit").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;

  return (
    <DashboardLayout title="Track Orders">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Truck className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">Material Orders</h1>
        </div>
        
        <Link href="/materials">
          <Button>Order New Materials</Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Your Orders</CardTitle>
          <CardDescription>
            Track and manage your construction material orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="all">
                  All Orders ({orders.length})
                </TabsTrigger>
                <TabsTrigger value="processing">
                  Processing ({processingCount})
                </TabsTrigger>
                <TabsTrigger value="in_transit">
                  In Transit ({inTransitCount})
                </TabsTrigger>
                <TabsTrigger value="delivered">
                  Delivered ({deliveredCount})
                </TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders..."
                    className="pl-10 w-full sm:w-auto"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="all">
              {renderOrdersContent(sortedOrders, isLoadingOrders, ordersError)}
            </TabsContent>
            
            <TabsContent value="processing">
              {renderOrdersContent(
                sortedOrders.filter(o => o.status === "processing"),
                isLoadingOrders,
                ordersError
              )}
            </TabsContent>
            
            <TabsContent value="in_transit">
              {renderOrdersContent(
                sortedOrders.filter(o => o.status === "in_transit"),
                isLoadingOrders,
                ordersError
              )}
            </TabsContent>
            
            <TabsContent value="delivered">
              {renderOrdersContent(
                sortedOrders.filter(o => o.status === "delivered"),
                isLoadingOrders,
                ordersError
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Order Tracking Information */}
      <Card>
        <CardHeader>
          <CardTitle>Order Tracking Guide</CardTitle>
          <CardDescription>
            Understanding your order status and delivery process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-4 bg-blue-50 rounded-lg">
              <div className="bg-blue-100 p-3 rounded-full mb-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium mb-2">Processing</h3>
              <p className="text-sm text-gray-600">
                Your order has been received and is being prepared for shipment. Materials are being sourced and packaged.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 bg-yellow-50 rounded-lg">
              <div className="bg-yellow-100 p-3 rounded-full mb-3">
                <Truck className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="font-medium mb-2">In Transit</h3>
              <p className="text-sm text-gray-600">
                Your materials have been dispatched and are on their way to your construction site.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 bg-green-50 rounded-lg">
              <div className="bg-green-100 p-3 rounded-full mb-3">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">Delivered</h3>
              <p className="text-sm text-gray-600">
                Your order has been successfully delivered to your site and signed for by your team.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

// Helper function to render orders content
function renderOrdersContent(orders: Order[], isLoading: boolean, error: Error | null) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p>Loading orders...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error loading orders. Please try again.</p>
      </div>
    );
  }
  
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
        <p className="text-gray-500 mb-6">
          You don't have any orders matching your criteria.
        </p>
        <Link href="/materials">
          <Button>Order Materials</Button>
        </Link>
      </div>
    );
  }
  
  return <OrderTable orders={orders} />;
}
