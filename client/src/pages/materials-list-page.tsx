import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ExternalLink, Filter, MoreHorizontal, Package, Pencil, Plus, Search, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Material } from "@shared/schema";

export default function MaterialsListPage() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  // Fetch materials for the supplier
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

  // Filter materials based on search query and filters
  const filteredMaterials = materials?.filter((material) => {
    // Search query filter
    const matchesSearch =
      searchQuery === "" ||
      material.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (material.brand && material.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (material.productCode && material.productCode.toLowerCase().includes(searchQuery.toLowerCase()));

    // Category filter
    const matchesCategory = categoryFilter === "all" || material.category === categoryFilter;

    // Stock filter
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "in_stock" && material.inStock) ||
      (stockFilter === "out_of_stock" && !material.inStock);

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Get unique categories for filter dropdown
  const categories = materials
    ? [...new Set(materials.map((material) => material.category))]
    : [];

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your products and inventory
          </p>
        </div>

        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <Button asChild>
            <Link href="/materials/new">
              <Plus className="mr-2 h-4 w-4" />
              Add New Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <span>{categoryFilter === "all" ? "All Categories" : categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center">
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center">
                  <Package className="mr-2 h-4 w-4" />
                  <span>
                    {stockFilter === "all"
                      ? "All Stock"
                      : stockFilter === "in_stock"
                      ? "In Stock"
                      : "Out of Stock"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue={viewMode} onValueChange={(value) => setViewMode(value)}>
            <TabsList className="h-10">
              <TabsTrigger value="grid" className="px-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
                <span className="sr-only">Grid view</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="px-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <line x1="8" x2="21" y1="6" y2="6" />
                  <line x1="8" x2="21" y1="12" y2="12" />
                  <line x1="8" x2="21" y1="18" y2="18" />
                  <line x1="3" x2="3.01" y1="6" y2="6" />
                  <line x1="3" x2="3.01" y1="12" y2="12" />
                  <line x1="3" x2="3.01" y1="18" y2="18" />
                </svg>
                <span className="sr-only">List view</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoadingMaterials ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-square relative bg-muted">
                  <Skeleton className="h-full w-full" />
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded" />
                            <Skeleton className="h-5 w-40" />
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      ) : filteredMaterials && filteredMaterials.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMaterials.map((material) => (
              <Card key={material.id} className="overflow-hidden group">
                <div 
                  className="aspect-square relative bg-muted cursor-pointer"
                  onClick={() => navigate(`/materials/${material.id}`)}
                >
                  {material.imageUrl ? (
                    <img
                      src={material.imageUrl}
                      alt={material.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full">
                      <Package className="h-16 w-16 text-muted-foreground opacity-50" />
                    </div>
                  )}
                  {material.featured && (
                    <Badge className="absolute top-2 left-2 bg-primary">
                      Featured
                    </Badge>
                  )}
                  {material.discountPrice && material.discountPrice < material.price && (
                    <Badge className="absolute top-2 right-2 bg-red-500">
                      Sale
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 
                    className="font-semibold text-lg line-clamp-1 hover:text-primary cursor-pointer"
                    onClick={() => navigate(`/materials/${material.id}`)}
                  >
                    {material.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="outline"
                      className="font-normal text-xs"
                    >
                      {material.category}
                    </Badge>
                    {material.inStock ? (
                      <Badge 
                        variant="outline"
                        className="bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800 font-normal text-xs"
                      >
                        In Stock
                      </Badge>
                    ) : (
                      <Badge 
                        variant="outline"
                        className="bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800 font-normal text-xs"
                      >
                        Out of Stock
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2">
                    {material.discountPrice && material.discountPrice < material.price ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold">₵{(material.discountPrice / 100).toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground line-through">₵{(material.price / 100).toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="font-bold">₵{(material.price / 100).toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      Per {material.unit}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate(`/materials/${material.id}`)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/materials/${material.id}?edit=true`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {material.imageUrl ? (
                              <img
                                src={material.imageUrl}
                                alt={material.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{material.name}</div>
                              {material.brand && (
                                <div className="text-xs text-muted-foreground">
                                  {material.brand}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {material.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {material.inStock ? (
                            <Badge 
                              variant="outline"
                              className="bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800"
                            >
                              In Stock
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline"
                              className="bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800"
                            >
                              Out of Stock
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {material.discountPrice && material.discountPrice < material.price ? (
                            <div>
                              <div className="font-medium">₵{(material.discountPrice / 100).toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground line-through">
                                ₵{(material.price / 100).toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <div className="font-medium">₵{(material.price / 100).toFixed(2)}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/materials/${material.id}`}>
                                View
                              </Link>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/materials/${material.id}?edit=true`}>
                                Edit
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-lg font-medium">No products found</h2>
          <p className="mt-2 text-muted-foreground">
            {searchQuery || categoryFilter !== "all" || stockFilter !== "all"
              ? "Try changing your search or filters"
              : "Get started by adding your first product"}
          </p>
          {!searchQuery && categoryFilter === "all" && stockFilter === "all" && (
            <Button className="mt-4" asChild>
              <Link href="/materials/new">
                <Plus className="mr-2 h-4 w-4" />
                Add New Product
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}