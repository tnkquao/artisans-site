import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { DollarSign, Package, ShoppingCart, TrendingUp, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Material, Order, Supplier } from "@shared/schema";

export default function SupplierDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch supplier profile
  const { data: supplierData, isLoading: isLoadingSupplier } = useQuery<Supplier>({
    queryKey: ["/api/suppliers/profile"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers/profile");
      if (!response.ok) {
        throw new Error("Failed to fetch supplier profile");
      }
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch materials
  const { data: materials, isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: ["/api/suppliers/materials"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers/materials");
      if (!response.ok) {
        throw new Error("Failed to fetch materials");
      }
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch orders
  const { data: orders, isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/suppliers/orders"],
    queryFn: async () => {
      const response = await fetch("/api/suppliers/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Monthly sales data for chart
  const monthlySalesData = [
    { name: "Jan", sales: 4000 },
    { name: "Feb", sales: 3000 },
    { name: "Mar", sales: 5000 },
    { name: "Apr", sales: 2780 },
    { name: "May", sales: 1890 },
    { name: "Jun", sales: 2390 },
    { name: "Jul", sales: 3490 },
  ];

  // Product category data for chart
  const categorySalesData = [
    { name: "Cement", sales: 4000 },
    { name: "Roofing", sales: 3000 },
    { name: "Electrical", sales: 2000 },
    { name: "Plumbing", sales: 2780 },
    { name: "Lumber", sales: 1890 },
    { name: "Tiles", sales: 2390 },
    { name: "Tools", sales: 3490 },
  ];

  // Calculate summary statistics
  const totalProducts = materials?.length || 0;
  const totalOrders = orders?.length || 0;
  const pendingOrders = orders?.filter(order => order.status === "processing").length || 0;
  const totalRevenue = orders?.reduce((sum, order) => sum + order.totalAmount, 0) || 0;

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your products, inventory, and monitor your sales
          </p>
        </div>

        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <Button asChild>
            <Link href="/materials/new">
              <Package className="mr-2 h-4 w-4" />
              Add New Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Products</p>
              {isLoadingMaterials ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{totalProducts}</p>
              )}
            </div>
            <Package className="h-8 w-8 text-primary opacity-80" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
              {isLoadingOrders ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{totalOrders}</p>
              )}
            </div>
            <ShoppingCart className="h-8 w-8 text-primary opacity-80" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
              {isLoadingOrders ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{pendingOrders}</p>
              )}
            </div>
            <Truck className="h-8 w-8 text-primary opacity-80" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              {isLoadingOrders ? (
                <Skeleton className="h-7 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-bold">₵{(totalRevenue / 100).toFixed(2)}</p>
              )}
            </div>
            <DollarSign className="h-8 w-8 text-primary opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Analytics</CardTitle>
          <CardDescription>
            View your sales performance and product statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="monthly">Monthly Sales</TabsTrigger>
              <TabsTrigger value="category">Category Sales</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlySalesData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₵${value}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    name="Sales (GHS)"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="category" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categorySalesData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₵${value}`} />
                  <Legend />
                  <Bar
                    dataKey="sales"
                    name="Sales (GHS)"
                    fill="#8884d8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Products */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Products</CardTitle>
          <CardDescription>
            Your most recently added products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMaterials ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : materials && materials.length > 0 ? (
            <div className="space-y-4">
              {materials.slice(0, 5).map((material) => (
                <div key={material.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded border">
                  <div className="flex items-center gap-4">
                    {material.imageUrl ? (
                      <img
                        src={material.imageUrl}
                        alt={material.name}
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium">{material.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ₵{(material.price / 100).toFixed(2)} per {material.unit}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <div className={cn(
                      badgeVariants({ variant: "outline" }),
                      "font-normal"
                    )}>
                      {material.category}
                    </div>
                    {material.inStock ? (
                      <div className={cn(
                        badgeVariants({ variant: "default" }),
                        "bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800"
                      )}>
                        In Stock
                      </div>
                    ) : (
                      <div className={cn(
                        badgeVariants({ variant: "default" }),
                        "bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800"
                      )}>
                        Out of Stock
                      </div>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/materials/${material.id}`}>
                        Manage
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Package className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No products yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first product to start selling
              </p>
              <Button className="mt-4" asChild>
                <Link href="/materials/new">
                  Add New Product
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            The most recent orders for your products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOrders ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                  <Skeleton className="h-8 w-24 ml-auto" />
                </div>
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded border">
                  <div>
                    <h4 className="font-medium">Order #{order.orderId}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} - ₵{(order.totalAmount / 100).toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <div className={cn(
                      badgeVariants({ variant: "outline" }),
                      order.status === "processing" 
                        ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800" 
                        : order.status === "delivered"
                        ? "bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800"
                        : "bg-blue-100 text-blue-800 hover:bg-blue-100 hover:text-blue-800"
                    )}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/orders/${order.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No orders yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Orders will appear here when customers purchase your products
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}