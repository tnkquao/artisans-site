import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Truck, Package2, AlertTriangle, Search, ArrowLeft, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { formatCurrency } from "@/lib/utils";

// Define the shape of a site material
interface Material {
  id: number;
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  price: number;
  unit: string;
  brand: string | null;
  image: string | null;
}

interface SiteMaterial {
  id: number;
  projectId: number;
  materialId: number;
  quantity: number;
  location: string;
  notes: string | null;
  status: string;
  lastUpdated: string;
  createdAt: string;
  materialDetails: Material | null;
}

// Form schema for adding a new site material
const addSiteMaterialSchema = z.object({
  materialId: z.number({
    required_error: "Please select a material",
  }),
  quantity: z.number({
    required_error: "Please enter a quantity",
  }).positive("Quantity must be greater than 0"),
  location: z.string().min(1, "Please specify a location on the site"),
  notes: z.string().optional(),
  status: z.string().default("available"),
});

type AddSiteMaterialFormValues = z.infer<typeof addSiteMaterialSchema>;

// Component for the Site Materials page
export default function SiteMaterialsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch project details
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ['/api/projects', parseInt(projectId)],
    queryFn: () => apiRequest('GET', `/api/projects/${projectId}`).then(res => res.json()),
    enabled: !!projectId && !isNaN(parseInt(projectId))
  });

  // Fetch all materials for selection in the add dialog
  const { data: allMaterials, isLoading: isLoadingMaterials } = useQuery({
    queryKey: ['/api/materials/public'],
    queryFn: () => apiRequest('GET', '/api/materials/public').then(res => res.json()),
  });

  // Fetch site materials for this project
  const { data: siteMaterials, isLoading: isLoadingSiteMaterials } = useQuery({
    queryKey: ['/api/projects', parseInt(projectId), 'site-materials'],
    queryFn: () => apiRequest('GET', `/api/projects/${projectId}/site-materials`).then(res => res.json()),
    enabled: !!projectId && !isNaN(parseInt(projectId))
  });

  // Mutation for adding a new site material
  const addSiteMaterialMutation = useMutation({
    mutationFn: async (data: AddSiteMaterialFormValues) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/site-materials`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Material added",
        description: "The material has been added to the site inventory.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', parseInt(projectId), 'site-materials'] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to add material",
        description: error.message || "An error occurred while adding the material.",
        variant: "destructive",
      });
    }
  });

  // Mutation for removing a site material
  const removeSiteMaterialMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/site-materials/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Material removed",
        description: "The material has been removed from the site inventory.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', parseInt(projectId), 'site-materials'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove material",
        description: error.message || "An error occurred while removing the material.",
        variant: "destructive",
      });
    }
  });

  // Form handling for adding a new site material
  const form = useForm<AddSiteMaterialFormValues>({
    resolver: zodResolver(addSiteMaterialSchema),
    defaultValues: {
      quantity: 1,
      location: "",
      notes: "",
      status: "available",
    },
  });

  // Filter materials based on search term and category
  const filteredMaterials = siteMaterials?.filter((material: SiteMaterial) => {
    const matchesSearch = searchTerm === "" || 
      material.materialDetails?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.notes && material.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === "" || 
      material.materialDetails?.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Handle adding a new site material
  const onSubmit = (data: AddSiteMaterialFormValues) => {
    addSiteMaterialMutation.mutate(data);
  };

  // Get unique categories for filter dropdown
  const categories = allMaterials ? 
    Array.from(new Set(allMaterials.map((m: Material) => m.category))) : 
    [];

  // If project or materials are loading, show a loading indicator
  if (isLoadingProject || isLoadingMaterials || isLoadingSiteMaterials) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // If project doesn't exist, show an error
  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Project Not Found</h2>
          <p className="text-muted-foreground">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate("/projects")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Site Materials - {project.name}</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage materials available at the construction site
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate(`/projects/${projectId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Material to Site
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Material to Site</DialogTitle>
                  <DialogDescription>
                    Record a new material available at the construction site.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="materialId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allMaterials?.map((material: Material) => (
                                <SelectItem key={material.id} value={material.id.toString()}>
                                  {material.name} ({material.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location on Site</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., North side, Storage area, etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Any additional information" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                              <SelectItem value="depleted">Depleted</SelectItem>
                              <SelectItem value="damaged">Damaged</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button 
                        type="submit"
                        disabled={addSiteMaterialMutation.isPending}
                      >
                        {addSiteMaterialMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add to Site
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and filter section */}
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
          <Select
            value={filterCategory}
            onValueChange={setFilterCategory}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Site materials list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials?.length > 0 ? (
            filteredMaterials.map((material: SiteMaterial) => (
              <Card key={material.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{material.materialDetails?.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {material.materialDetails?.brand}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={
                        material.status === "available" ? "default" :
                        material.status === "reserved" ? "secondary" :
                        material.status === "depleted" ? "outline" : "destructive"
                      }
                    >
                      {material.status.charAt(0).toUpperCase() + material.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center text-muted-foreground mb-2">
                    <Package2 className="h-4 w-4 mr-2" />
                    <span className="font-medium">{material.quantity} {material.materialDetails?.unit}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{material.location}</span>
                  </div>
                  {material.notes && (
                    <p className="text-sm mt-2 text-muted-foreground">
                      {material.notes}
                    </p>
                  )}
                  <div className="mt-3 text-sm text-muted-foreground">
                    Value: {formatCurrency(material.quantity * (material.materialDetails?.price || 0))}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex justify-between">
                  <div className="text-xs text-muted-foreground">
                    Last updated: {new Date(material.lastUpdated).toLocaleDateString()}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to remove this material from the site?")) {
                        removeSiteMaterialMutation.mutate(material.id);
                      }
                    }}
                    disabled={removeSiteMaterialMutation.isPending}
                  >
                    {removeSiteMaterialMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Remove"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <Package2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium">No materials on site</h3>
              <p className="text-muted-foreground mt-2 max-w-md">
                {searchTerm || filterCategory ? 
                  "No materials match your search criteria. Try adjusting your filters." : 
                  "There are no materials recorded at this construction site yet. Add your first material to start tracking."}
              </p>
              {!searchTerm && !filterCategory && (
                <Button onClick={() => setIsAddDialogOpen(true)} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Material
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}