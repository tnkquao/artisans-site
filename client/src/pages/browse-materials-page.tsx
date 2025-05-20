import { useQuery } from "@tanstack/react-query";
import { Material } from "@shared/schema";
import { Link } from "wouter";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Filter, ShoppingBag, ShoppingCart, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/hooks/use-cart";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define material image mapping by category
const categoryImageMap: Record<string, string> = {
  cement: "https://images.unsplash.com/photo-1616932240232-602351611bd2?q=80&w=500",
  electrical: "https://images.unsplash.com/photo-1619032208107-4fa43191d0d7?q=80&w=500",
  plumbing: "https://images.unsplash.com/photo-1534427840435-6531bfa887a0?q=80&w=500",
  structure: "https://images.unsplash.com/photo-1603807617198-0876cb0c5681?q=80&w=500",
  roofing: "https://images.unsplash.com/photo-1622021211530-8c6af92d114b?q=80&w=500",
  tiles: "https://images.unsplash.com/photo-1585661034322-073a8f7a136d?q=80&w=500",
  tools: "https://images.unsplash.com/photo-1581166397057-235af2b3c6dd?q=80&w=500",
  lumber: "https://images.unsplash.com/photo-1501139083538-0139583c060f?q=80&w=500",
  paint: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=500",
  glass: "https://images.unsplash.com/photo-1553908839-cbe3e588536b?q=80&w=500",
  foundation: "https://images.unsplash.com/photo-1624806992066-b6f25221e37c?q=80&w=500",
  insulation: "https://images.unsplash.com/photo-1553856604-f1e8cfbf57bc?q=80&w=500",
  interior: "https://images.unsplash.com/photo-1585128993280-9456c19c5333?q=80&w=500"
};

// Set realistic default image if material has no image
const getImageForMaterial = (material: Material) => {
  if (material.imageUrl) return material.imageUrl;
  
  // Use category image mapping
  if (material.category.toLowerCase() in categoryImageMap) {
    return categoryImageMap[material.category.toLowerCase()];
  }
  
  // Default fallback image for any other categories
  return "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=500";
};

export default function BrowseMaterialsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const { addItem } = useCart();
  
  const { data: materials, isLoading } = useQuery<Material[]>({
    queryKey: ["/api/materials/public"],
  });

  // Create test materials if none exist
  useEffect(() => {
    if (!isLoading && (!materials || materials.length === 0)) {
      // We should notify the user that there are no materials yet
      console.log("No materials found. The system needs materials to be added.");
    }
  }, [materials, isLoading]);

  // Extract unique categories for the filter dropdown
  const categories = materials 
    ? [...new Set(materials.map(material => material.category))]
    : [];

  // Filter materials based on search term and category
  const filteredMaterials = materials
    ? materials.filter(material => {
        const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             material.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || material.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
    : [];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Browse Construction Materials</h1>
          <CartDrawer />
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search materials..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={undefined}>All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMaterials.map(material => {
              const materialImage = getImageForMaterial(material);
              
              return (
                <Card key={material.id} className="overflow-hidden flex flex-col group relative">
                  <div className="h-48 bg-muted flex items-center justify-center overflow-hidden">
                    {materialImage ? (
                      <img 
                        src={materialImage} 
                        alt={material.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <ShoppingBag className="h-16 w-16 text-muted-foreground" />
                    )}
                    
                    {/* Quick add to cart button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="icon" 
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addItem(material);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add to cart</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{material.name}</CardTitle>
                      {material.inStock ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          In Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Out of Stock
                        </Badge>
                      )}
                    </div>
                    <Badge className="w-fit mt-1">{material.category}</Badge>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-2">{material.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="font-semibold">
                        ₵{(material.price / 100).toFixed(2)}
                        <span className="text-xs text-muted-foreground ml-1">
                          / {material.unit}
                        </span>
                      </p>
                      {material.brand && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {material.brand}
                        </span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => addItem(material)}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart
                    </Button>
                    <Button asChild variant="default" className="w-full">
                      <Link to={`/materials/view/${material.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
            
            {filteredMaterials.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Filter className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium">No materials found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}