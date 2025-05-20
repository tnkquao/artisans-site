import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowLeft, Pencil, Package, ShoppingCart, Truck, Calendar, Info, Plus, Loader2, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Material, Inventory, insertMaterialSchema } from "@shared/schema";
import { useState } from "react";

// Define update material schema
const updateMaterialSchema = insertMaterialSchema.extend({
  id: z.number(),
}).partial();

type UpdateMaterial = z.infer<typeof updateMaterialSchema>;

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const materialId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Define form for updating material
  const form = useForm<UpdateMaterial>({
    resolver: zodResolver(updateMaterialSchema),
    defaultValues: {
      id: materialId,
      name: "",
      description: "",
      category: "",
      price: 0,
      unit: "",
    },
  });

  // Fetch material details
  const { data: material, isLoading: isLoadingMaterial } = useQuery<Material>({
    queryKey: ["/api/materials", materialId],
    queryFn: async () => {
      const response = await fetch(`/api/materials/${materialId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch material");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Update form with material data
      form.reset({
        id: data.id,
        name: data.name,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory || undefined,
        price: data.price,
        discountPrice: data.discountPrice,
        unit: data.unit,
        weight: data.weight,
        brand: data.brand,
        imageUrl: data.imageUrl,
        productCode: data.productCode,
        warrantyInfo: data.warrantyInfo,
        featured: data.featured,
        inStock: data.inStock,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch inventory for this material
  const { data: inventory, isLoading: isLoadingInventory } = useQuery<Inventory[]>({
    queryKey: ["/api/inventory/material", materialId],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/material/${materialId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
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

  // Update material mutation
  const updateMaterial = useMutation({
    mutationFn: async (data: UpdateMaterial) => {
      const result = await apiRequest("PATCH", `/api/materials/${materialId}`, data);
      return result.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setIsEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["/api/materials", materialId] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/materials"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete material mutation
  const deleteMaterial = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/materials/${materialId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      navigate("/materials");
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/materials"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update inventory mutation
  const updateInventory = useMutation({
    mutationFn: async (data: { id: number; quantityAvailable: number; status: string }) => {
      const result = await apiRequest("PATCH", `/api/inventory/${data.id}`, data);
      return result.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/material", materialId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateMaterial) => {
    updateMaterial.mutate(data);
  };

  const handleInventoryUpdate = (inventoryId: number, quantity: number, status: string) => {
    updateInventory.mutate({
      id: inventoryId,
      quantityAvailable: quantity,
      status,
    });
  };

  const handleDelete = () => {
    deleteMaterial.mutate();
  };

  if (isLoadingMaterial) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/materials")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-bold">Product Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Button className="mt-6" onClick={() => navigate("/materials")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/materials")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditMode ? "Edit Product" : "Product Details"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setIsEditMode(false);
                  form.reset({
                    id: material.id,
                    name: material.name,
                    description: material.description,
                    category: material.category,
                    subcategory: material.subcategory || undefined,
                    price: material.price,
                    discountPrice: material.discountPrice,
                    unit: material.unit,
                    weight: material.weight,
                    brand: material.brand,
                    imageUrl: material.imageUrl,
                    productCode: material.productCode,
                    warrantyInfo: material.warrantyInfo,
                    featured: material.featured,
                    inStock: material.inStock,
                  });
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateMaterial.isPending}
              >
                {updateMaterial.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button onClick={() => setIsEditMode(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Product
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditMode ? (
        <Form {...form}>
          <form className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Essential product details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Product name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Product description" 
                            className="min-h-32"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="electrical">Electrical</SelectItem>
                              <SelectItem value="plumbing">Plumbing</SelectItem>
                              <SelectItem value="structure">Structure</SelectItem>
                              <SelectItem value="roofing">Roofing</SelectItem>
                              <SelectItem value="tiles">Tiles</SelectItem>
                              <SelectItem value="cement">Cement</SelectItem>
                              <SelectItem value="tools">Tools</SelectItem>
                              <SelectItem value="lumber">Lumber</SelectItem>
                              <SelectItem value="paint">Paint</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcategory</FormLabel>
                          <FormControl>
                            <Input placeholder="Subcategory" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="Brand name" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="productCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Code/SKU</FormLabel>
                          <FormControl>
                            <Input placeholder="SKU-000" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Inventory</CardTitle>
                  <CardDescription>
                    Manage product pricing and availability
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (GHS)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt((parseFloat(e.target.value) * 100).toString()))}
                              value={field.value ? (field.value / 100).toFixed(2) : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discountPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Price (GHS)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field}
                              onChange={(e) => e.target.value ? field.onChange(parseInt((parseFloat(e.target.value) * 100).toString())) : field.onChange(undefined)}
                              value={field.value ? (field.value / 100).toFixed(2) : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="piece">Piece</SelectItem>
                              <SelectItem value="bag">Bag</SelectItem>
                              <SelectItem value="box">Box</SelectItem>
                              <SelectItem value="meter">Meter</SelectItem>
                              <SelectItem value="kg">Kilogram</SelectItem>
                              <SelectItem value="liter">Liter</SelectItem>
                              <SelectItem value="bundle">Bundle</SelectItem>
                              <SelectItem value="sq_meter">Square Meter</SelectItem>
                              <SelectItem value="set">Set</SelectItem>
                              <SelectItem value="roll">Roll</SelectItem>
                              <SelectItem value="pair">Pair</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (grams)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              placeholder="Weight" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => e.target.value ? field.onChange(parseInt(e.target.value)) : field.onChange(undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          Enter a URL for the product image
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="inStock"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">In Stock</FormLabel>
                            <FormDescription>
                              Mark if this product is in stock
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Featured</FormLabel>
                            <FormDescription>
                              Feature this product in the store
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>
                  Extra product details and specifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="warrantyInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warranty Information</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., 1 year manufacturer warranty" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </form>
        </Form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                {material.imageUrl ? (
                  <div className="relative h-80 lg:h-full w-full">
                    <img
                      src={material.imageUrl}
                      alt={material.name}
                      className="w-full h-full object-cover object-center rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none"
                    />
                    {material.featured && (
                      <Badge className="absolute top-4 left-4 bg-primary">
                        Featured
                      </Badge>
                    )}
                    {material.discountPrice && material.discountPrice < material.price && (
                      <Badge className="absolute top-4 right-4 bg-red-500">
                        Sale
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-80 lg:h-full bg-muted rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none">
                    <Package className="h-24 w-24 text-muted-foreground opacity-50" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">{material.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{material.category}</Badge>
                      {material.subcategory && (
                        <Badge variant="outline">{material.subcategory}</Badge>
                      )}
                      {material.brand && <span className="text-sm text-muted-foreground">{material.brand}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {material.discountPrice && material.discountPrice < material.price ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">₵{(material.discountPrice / 100).toFixed(2)}</span>
                          <span className="text-lg text-muted-foreground line-through">₵{(material.price / 100).toFixed(2)}</span>
                        </div>
                        <span className="text-sm text-green-600 font-medium">
                          {Math.round((1 - material.discountPrice / material.price) * 100)}% OFF
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">₵{(material.price / 100).toFixed(2)}</span>
                    )}
                    <span className="text-sm text-muted-foreground">per {material.unit}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <div>
                    <p className="whitespace-pre-line">{material.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">
                        Status: 
                        <span className={material.inStock ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                          {material.inStock ? "In Stock" : "Out of Stock"}
                        </span>
                      </span>
                    </div>

                    {material.productCode && (
                      <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">
                          SKU: <span className="font-normal ml-1">{material.productCode}</span>
                        </span>
                      </div>
                    )}

                    {material.weight && (
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">
                          Weight: <span className="font-normal ml-1">{material.weight}g</span>
                        </span>
                      </div>
                    )}

                    {material.warrantyInfo && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">
                          Warranty: <span className="font-normal ml-1">{material.warrantyInfo}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Management</CardTitle>
                <CardDescription>
                  Manage stock levels and inventory status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingInventory ? (
                  <Skeleton className="h-20 w-full" />
                ) : inventory && inventory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stock ID</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">#{item.id}</TableCell>
                          <TableCell>{item.quantityAvailable}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={cn(
                                item.status === "in_stock" 
                                  ? "bg-green-100 text-green-800" 
                                  : item.status === "low_stock" 
                                  ? "bg-yellow-100 text-yellow-800"
                                  : item.status === "out_of_stock"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              )}
                            >
                              {item.status.replace("_", " ").split(" ").map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(" ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(item.lastUpdated).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">Update</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Update Inventory</DialogTitle>
                                  <DialogDescription>
                                    Update the stock level and status for this product.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Quantity</Label>
                                    <Input
                                      id="quantity"
                                      type="number"
                                      min="0"
                                      defaultValue={item.quantityAvailable}
                                      className="col-span-3"
                                    />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Status</Label>
                                    <Select defaultValue={item.status}>
                                      <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="in_stock">In Stock</SelectItem>
                                        <SelectItem value="low_stock">Low Stock</SelectItem>
                                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                        <SelectItem value="discontinued">Discontinued</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button type="submit">Save changes</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No inventory records</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add inventory records to track stock levels for this product
                    </p>
                    <Button className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Inventory Record
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteMaterial.isPending}
            >
              {deleteMaterial.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}