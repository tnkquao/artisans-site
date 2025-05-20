import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Search,
  Building,
  ArrowUpDown,
  Truck,
  Package,
  Warehouse,
  PhoneCall,
  Mail,
  MapPin,
  Plus,
  AlertCircle,
  Globe,
  User
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
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

// Type definitions for suppliers
interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  logoUrl?: string;
  status: 'active' | 'inactive' | 'pending';
  joinDate: string;
  productCategories: string[];
  materialCount: number;
  orderCount: number;
  rating: number;
  website?: string;
  description?: string;
}

interface Material {
  id: number;
  name: string;
  description: string;
  price: number;
  unit: string;
  category: string;
  imageUrl?: string;
  inStock: boolean;
  stockQuantity: number;
  supplierId: number;
  supplierName: string;
}

export default function AdminSuppliersPage() {
  const { adminUser } = useDirectAdminAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isViewSupplierOpen, setIsViewSupplierOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [supplierMaterials, setSupplierMaterials] = useState<Material[]>([]);

  // Query to get all suppliers
  const { 
    data: suppliers = [], 
    isLoading,
    error,
    refetch: refetchSuppliers
  } = useQuery<Supplier[]>({
    queryKey: ["/api/direct-admin/suppliers"],
    queryFn: async () => {
      if (!adminUser || adminUser.role !== 'admin') {
        return [];
      }
      
      try {
        const response = await apiRequest("POST", "/api/direct-admin/suppliers", {
          adminUsername: adminUser.username
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch suppliers: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        throw error;
      }
    },
    staleTime: 60000,
    enabled: false,
  });
  
  // Once admin authentication is complete, trigger the query
  useEffect(() => {
    if (adminUser && adminUser.role === 'admin') {
      refetchSuppliers();
    }
  }, [adminUser, refetchSuppliers]);

  // Query to get supplier materials when a supplier is selected
  const fetchSupplierMaterials = async (supplierId: number) => {
    if (!adminUser || adminUser.role !== 'admin') {
      return [];
    }
    
    try {
      const response = await apiRequest("POST", `/api/direct-admin/suppliers/${supplierId}/materials`, {
        adminUsername: adminUser.username
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch supplier materials: ${errorText}`);
      }
      
      const data = await response.json();
      setSupplierMaterials(data);
      return data;
    } catch (error) {
      console.error("Error fetching supplier materials:", error);
      setSupplierMaterials([]);
      return [];
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Filter suppliers based on search query and filters
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
    
    const matchesCategory = categoryFilter === "all" || 
      supplier.productCategories.some(category => 
        category.toLowerCase() === categoryFilter.toLowerCase()
      );
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Open supplier view
  const openSupplierView = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsViewSupplierOpen(true);
    await fetchSupplierMaterials(supplier.id);
  };

  // Get all product categories for filter
  const allCategories = Array.from(
    new Set(
      suppliers.flatMap(supplier => supplier.productCategories)
    )
  ).sort();

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Inactive</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
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

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get rating stars
  const getRatingStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <span key={i} className={i < rating ? "text-yellow-500" : "text-gray-300"}>
          ★
        </span>
      ));
  };

  return (
    <AdminDashboardLayout title="Suppliers Management">
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">
                  <Building className="inline-block mr-2 h-6 w-6" />
                  Suppliers Management
                </CardTitle>
                <CardDescription>
                  View and manage all material suppliers
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  Add Supplier
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <select 
                  className="border rounded p-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
                
                <select 
                  className="border rounded p-2 text-sm"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {allCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p>Failed to load suppliers. Please try again later.</p>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building className="mx-auto h-8 w-8 mb-2" />
                <p>No suppliers found</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center space-x-1">
                          <span>Supplier</span>
                          <ArrowUpDown size={16} />
                        </div>
                      </TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="hidden md:table-cell">Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Categories</TableHead>
                      <TableHead className="hidden md:table-cell">Materials</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              {supplier.logoUrl ? (
                                <AvatarImage src={supplier.logoUrl} alt={supplier.name} />
                              ) : (
                                <AvatarFallback>{getInitials(supplier.name)}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium">{supplier.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Since {formatDate(supplier.joinDate)}
                              </div>
                              <div className="text-xs">
                                {getRatingStars(supplier.rating)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{supplier.contactPerson}</div>
                          <div className="text-xs text-muted-foreground">
                            {supplier.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {supplier.phone}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>{supplier.city}</div>
                          <div className="text-xs text-muted-foreground">
                            {supplier.country}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(supplier.status)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {supplier.productCategories.slice(0, 2).map((category, idx) => (
                              <Badge 
                                key={idx} 
                                variant="secondary"
                                className="text-xs"
                              >
                                {category}
                              </Badge>
                            ))}
                            {supplier.productCategories.length > 2 && (
                              <HoverCard>
                                <HoverCardTrigger>
                                  <Badge 
                                    variant="outline"
                                    className="text-xs cursor-pointer"
                                  >
                                    +{supplier.productCategories.length - 2} more
                                  </Badge>
                                </HoverCardTrigger>
                                <HoverCardContent>
                                  <div className="flex flex-wrap gap-1">
                                    {supplier.productCategories.map((category, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {category}
                                      </Badge>
                                    ))}
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>{supplier.materialCount} items</div>
                          <div className="text-xs text-muted-foreground">
                            {supplier.orderCount} orders fulfilled
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openSupplierView(supplier)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier View Sheet */}
      <Sheet open={isViewSupplierOpen} onOpenChange={setIsViewSupplierOpen}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl">Supplier Details</SheetTitle>
            <SheetDescription>View and manage supplier information</SheetDescription>
          </SheetHeader>
          
          {selectedSupplier && (
            <div className="py-6 space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {selectedSupplier.logoUrl ? (
                    <AvatarImage src={selectedSupplier.logoUrl} alt={selectedSupplier.name} />
                  ) : (
                    <AvatarFallback className="text-lg">{getInitials(selectedSupplier.name)}</AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedSupplier.name}</h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    {getStatusBadge(selectedSupplier.status)}
                    <span>•</span>
                    <span>Since {formatDate(selectedSupplier.joinDate)}</span>
                  </div>
                  <div className="text-sm mt-1">
                    {getRatingStars(selectedSupplier.rating)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{selectedSupplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <PhoneCall className="h-4 w-4" />
                    <span>{selectedSupplier.phone}</span>
                  </div>
                  {selectedSupplier.website && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <a 
                        href={selectedSupplier.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedSupplier.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>
                      {selectedSupplier.address}, {selectedSupplier.city}, {selectedSupplier.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Contact: {selectedSupplier.contactPerson}</span>
                  </div>
                </div>
              </div>
              
              {selectedSupplier.description && (
                <div>
                  <h4 className="font-medium mb-1">About</h4>
                  <p className="text-sm text-muted-foreground">{selectedSupplier.description}</p>
                </div>
              )}
              
              <div>
                <h4 className="font-medium mb-2">Product Categories</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSupplier.productCategories.map((category, idx) => (
                    <Badge key={idx} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Materials ({supplierMaterials.length})</h4>
                {supplierMaterials.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No materials found for this supplier.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {supplierMaterials.map((material) => (
                      <div key={material.id} className="flex items-center gap-3 p-2 border rounded-lg">
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
                        <div className="flex-grow">
                          <div className="font-medium">{material.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {material.category} • {material.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(material.price)}</div>
                          <div className="text-xs">
                            {material.inStock ? (
                              <span className="text-green-600">In Stock ({material.stockQuantity})</span>
                            ) : (
                              <span className="text-red-600">Out of Stock</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <div>
                  <span className="block text-sm font-medium">Total Materials</span>
                  <span className="text-2xl font-bold">{selectedSupplier.materialCount}</span>
                </div>
                <div>
                  <span className="block text-sm font-medium">Orders Fulfilled</span>
                  <span className="text-2xl font-bold">{selectedSupplier.orderCount}</span>
                </div>
                <div>
                  <span className="block text-sm font-medium">Rating</span>
                  <span className="text-2xl font-bold">{selectedSupplier.rating}/5</span>
                </div>
              </div>
            </div>
          )}
          
          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
            <Button>Edit Supplier</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AdminDashboardLayout>
  );
}