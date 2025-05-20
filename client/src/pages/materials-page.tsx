import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { MaterialCard } from "@/components/orders/material-card";
import { useAuth } from "@/hooks/use-auth";
import { ShoppingCart, Package, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Material, Project, insertOrderSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export default function MaterialsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState<Array<{ material: Material; quantity: number }>>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Fetch materials
  const { 
    data: materials = [], 
    isLoading: isLoadingMaterials,
    error: materialsError,
  } = useQuery<Material[]>({
    queryKey: ["/api/materials/public"],
  });

  // Fetch projects for delivery selection
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects,
  } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: user?.role === "client",
  });

  // Calculate total items and amount
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.material.price * item.quantity), 0);

  // Create order schema (simplified from the insertOrderSchema)
  const orderFormSchema = z.object({
    projectId: z.number().optional(),
    deliveryAddress: z.string().min(1, "Delivery address is required"),
    deliveryDate: z.string().optional(),
  });

  // Order form
  const form = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      projectId: projects[0]?.id,
      deliveryAddress: "",
      deliveryDate: "",
    },
  });

  // Handle adding item to cart
  const addToCart = (material: Material) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.material.id === material.id);
      
      if (existingItem) {
        return prevCart.map(item => 
          item.material.id === material.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        return [...prevCart, { material, quantity: 1 }];
      }
    });

    toast({
      title: "Added to cart",
      description: `${material.name} has been added to your cart.`,
    });
  };

  // Handle removing item from cart
  const removeFromCart = (materialId: number) => {
    setCart(prevCart => prevCart.filter(item => item.material.id !== materialId));
  };

  // Handle updating item quantity
  const updateQuantity = (materialId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setCart(prevCart => 
      prevCart.map(item => 
        item.material.id === materialId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  };

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async (data: z.infer<typeof orderFormSchema>) => {
      // Prepare order data
      const orderItems = cart.map(item => ({
        materialId: item.material.id,
        name: item.material.name,
        quantity: item.quantity,
        price: item.material.price,
      }));

      const orderData = {
        projectId: data.projectId,
        items: orderItems,
        totalAmount: totalAmount,
        deliveryAddress: data.deliveryAddress,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      };

      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order placed successfully",
        description: "Your order has been placed and is being processed.",
      });
      
      // Clear cart after successful order
      setCart([]);
      setIsCheckoutOpen(false);
      form.reset();
      
      // Invalidate orders query to refresh the orders list
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error placing order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof orderFormSchema>) => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before checkout.",
        variant: "destructive",
      });
      return;
    }
    
    placeOrderMutation.mutate(data);
  };

  // Filter materials by search term and category
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = 
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || material.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const uniqueCategories = Array.from(new Set(materials.map(material => material.category)));
  const categories = ["all", ...uniqueCategories];

  return (
    <DashboardLayout title="Order Materials">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <ShoppingCart className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">Construction Materials</h1>
        </div>
        
        <Button 
          variant="outline" 
          className="flex items-center" 
          onClick={() => setIsCheckoutOpen(true)}
          disabled={cart.length === 0}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          <span>Cart</span>
          {totalItems > 0 && (
            <Badge className="ml-2 bg-secondary">{totalItems}</Badge>
          )}
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search materials..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoadingMaterials ? (
        <div className="text-center py-8">
          <p>Loading materials...</p>
        </div>
      ) : materialsError ? (
        <div className="text-center py-8 text-red-600">
          <p>Error loading materials. Please try again.</p>
        </div>
      ) : filteredMaterials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredMaterials.map((material) => (
            <MaterialCard 
              key={material.id} 
              material={material}
              onAddToOrder={addToCart}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
          <p className="text-gray-500">
            {searchTerm || categoryFilter !== "all" 
              ? "Try adjusting your search or filter" 
              : "Please check back later for available materials"}
          </p>
        </div>
      )}

      {/* Shopping Cart / Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Your Order</DialogTitle>
            <DialogDescription>
              Review your cart items and complete your order.
            </DialogDescription>
          </DialogHeader>
          
          {cart.length > 0 ? (
            <>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {cart.map((item) => (
                  <Card key={item.material.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded overflow-hidden">
                            <img
                              src={item.material.imageUrl || `https://source.unsplash.com/random/100x100/?material,${item.material.id}`}
                              alt={item.material.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium">{item.material.name}</h4>
                            <p className="text-sm text-gray-500">
                              ₵{(item.material.price / 100).toFixed(2)} / {item.material.unit}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => updateQuantity(item.material.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => updateQuantity(item.material.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500"
                            onClick={() => removeFromCart(item.material.id)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="py-4 border-t border-b border-gray-200">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₵{(totalAmount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>₵{(totalAmount / 100).toFixed(2)}</span>
                </div>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {projects.length > 0 && (
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Project (Optional)</FormLabel>
                          <Select 
                            value={field.value?.toString()} 
                            onValueChange={(value) => field.onChange(parseInt(value) || undefined)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project for this order" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No specific project</SelectItem>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id.toString()}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter the delivery address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Delivery Date (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" min={new Date().toISOString().split('T')[0]} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCheckoutOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={placeOrderMutation.isPending}
                    >
                      {placeOrderMutation.isPending ? "Processing..." : "Place Order"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Add some materials to your cart before checkout.</p>
              <Button onClick={() => setIsCheckoutOpen(false)}>
                Continue Shopping
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
