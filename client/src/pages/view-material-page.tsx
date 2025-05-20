import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { getQueryFn } from "@/lib/queryClient";
import { Loader2, ArrowLeft, Star, Package, ShoppingBag, TruckIcon, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";

// Define a typesafe Material with Inventory type
type MaterialWithDetails = {
  id: number;
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  price: number;
  discountPrice: number | null;
  unit: string;
  brand: string | null;
  imageUrl: string | null;
  inStock: boolean;
  supplierName: string | null;
  supplierVerified: boolean;
  weight: number | null;
  warrantyInfo: string | null;
  productCode: string | null;
  featured: boolean | null;
  rating: number | null;
  reviewCount: number | null;
  inventory: {
    id: number;
    quantityAvailable: number;
    status: string;
    minOrderQuantity: number | null;
    expectedRestockDate: string | null;
  }[];
};

export default function ViewMaterialPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  
  const materialId = parseInt(id);
  
  const { data: material, isLoading, error } = useQuery<MaterialWithDetails>({
    queryKey: [`/api/materials/public/${materialId}`],
    queryFn: getQueryFn(),
  });
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (error || !material) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-4">
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <h2 className="text-2xl font-bold mb-4">Material Not Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find the requested material. It may have been removed or is no longer available.
            </p>
            <Button asChild>
              <Link to="/materials/browse">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Browse Materials
              </Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  const inventory = material.inventory && material.inventory.length > 0 ? material.inventory[0] : null;
  const isAvailable = material.inStock && inventory && inventory.quantityAvailable > 0;
  
  const handleAddToCart = () => {
    if (!isAvailable) return;
    
    // Here you would implement your cart logic
    toast({
      title: "Added to cart",
      description: `${quantity} ${material.unit}${quantity > 1 ? 's' : ''} of ${material.name} added to cart`,
    });
  };
  
  const formattedPrice = `₵${(material.price / 100).toFixed(2)}`;
  
  const formattedDiscountPrice = material.discountPrice ? `₵${(material.discountPrice / 100).toFixed(2)}` : null;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <Button variant="outline" asChild className="mb-4">
            <Link to="/materials/browse">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Materials
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Material image */}
          <div className="bg-muted rounded-lg flex items-center justify-center h-[400px] overflow-hidden">
            {material.imageUrl ? (
              <img 
                src={material.imageUrl} 
                alt={material.name} 
                className="w-full h-full object-contain"
              />
            ) : (
              <ShoppingBag className="h-32 w-32 text-muted-foreground opacity-30" />
            )}
          </div>
          
          {/* Material details */}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className="font-normal">{material.category}</Badge>
              {material.subcategory && (
                <Badge variant="outline" className="font-normal">{material.subcategory}</Badge>
              )}
              {material.featured && (
                <Badge variant="secondary" className="font-normal">Featured</Badge>
              )}
            </div>
            
            <h1 className="text-3xl font-bold mb-2">{material.name}</h1>
            
            <div className="flex items-center mb-3">
              {material.rating ? (
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="font-medium mr-2">{material.rating.toFixed(1)}</span>
                  {material.reviewCount && (
                    <span className="text-muted-foreground">({material.reviewCount} reviews)</span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">No ratings yet</span>
              )}
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline">
                {formattedDiscountPrice ? (
                  <>
                    <span className="text-3xl font-bold text-primary mr-2">{formattedDiscountPrice}</span>
                    <span className="text-xl text-muted-foreground line-through">{formattedPrice}</span>
                  </>
                ) : (
                  <span className="text-3xl font-bold">{formattedPrice}</span>
                )}
                <span className="text-sm ml-2">/ {material.unit}</span>
              </div>
              
              {material.brand && (
                <div className="mt-1 text-sm">
                  Brand: <span className="font-medium">{material.brand}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center mb-8 space-x-4">
              <div className="flex-grow max-w-xs">
                <div className="border rounded-md flex">
                  <Button 
                    variant="ghost" 
                    className="rounded-r-none h-full" 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={!isAvailable}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="border-0 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    disabled={!isAvailable}
                  />
                  <Button 
                    variant="ghost" 
                    className="rounded-l-none h-full" 
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={!isAvailable}
                  >
                    +
                  </Button>
                </div>
              </div>
              
              <Button
                size="lg"
                className="flex-grow"
                onClick={handleAddToCart}
                disabled={!isAvailable}
              >
                Add to Cart
              </Button>
            </div>
            
            <div className="flex flex-col space-y-4">
              <div className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>
                  {isAvailable ? (
                    <span className="text-green-600 font-medium">In Stock</span>
                  ) : (
                    <span className="text-red-600 font-medium">Out of Stock</span>
                  )}
                  {inventory && inventory.quantityAvailable > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({inventory.quantityAvailable} {material.unit}{inventory.quantityAvailable > 1 ? 's' : ''} available)
                    </span>
                  )}
                </span>
              </div>
              
              {inventory && inventory.expectedRestockDate && !isAvailable && (
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span>
                    Expected restock: {new Date(inventory.expectedRestockDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {material.supplierName && (
                <div className="flex items-center">
                  <TruckIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span>
                    Sold by: <span className="font-medium">{material.supplierName}</span>
                    {material.supplierVerified && (
                      <Badge variant="outline" className="ml-2 py-0 h-5">Verified</Badge>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <Separator className="my-8" />
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="warranty">Warranty & Returns</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-6">
            <h3 className="text-xl font-semibold mb-3">Product Description</h3>
            <div className="text-muted-foreground whitespace-pre-line">
              {material.description}
            </div>
          </TabsContent>
          
          <TabsContent value="specs" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Physical Attributes</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {material.weight && (
                    <>
                      <div className="text-muted-foreground">Weight</div>
                      <div>{material.weight} g</div>
                    </>
                  )}
                  <div className="text-muted-foreground">Unit</div>
                  <div>{material.unit}</div>
                  {material.productCode && (
                    <>
                      <div className="text-muted-foreground">Product Code</div>
                      <div>{material.productCode}</div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Inventory & Supply</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  <div className="text-muted-foreground">Status</div>
                  <div>{inventory?.status || "Unknown"}</div>
                  {inventory?.minOrderQuantity && (
                    <>
                      <div className="text-muted-foreground">Min. Order</div>
                      <div>{inventory.minOrderQuantity} {material.unit}{inventory.minOrderQuantity > 1 ? 's' : ''}</div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="warranty" className="mt-6">
            {material.warrantyInfo ? (
              <div className="whitespace-pre-line">
                {material.warrantyInfo}
              </div>
            ) : (
              <div className="text-muted-foreground">
                No warranty information available for this product. Please contact the supplier for details.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}