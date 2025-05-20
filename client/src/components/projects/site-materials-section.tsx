import { useState, useEffect } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package2, ExternalLink, Boxes } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

interface SiteMaterialSectionProps {
  projectId: number;
}

interface Material {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
}

interface SiteMaterial {
  id: number;
  projectId: number;
  materialId: number;
  quantity: number;
  location: string;
  status: string;
  lastUpdated: string;
  materialDetails: Material | null;
}

export default function SiteMaterialsSection({ projectId }: SiteMaterialSectionProps) {
  const [materialsSeedCalled, setMaterialsSeedCalled] = useState(false);
  
  // Get site materials for this project
  const { data: siteMaterials, isLoading, refetch: refetchSiteMaterials } = useQuery({
    queryKey: ['/api/projects', projectId, 'site-materials'],
    queryFn: () => apiRequest('GET', `/api/projects/${projectId}/site-materials`).then(res => res.json()),
    enabled: !!projectId
  });
  
  // Also fetch all materials to potentially use for creating sample data
  const { data: allMaterials } = useQuery({
    queryKey: ['/api/materials/public'],
    queryFn: () => apiRequest('GET', '/api/materials/public').then(res => res.json()),
  });
  
  // Mutation for adding a site material
  const addSiteMaterialMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/site-materials`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'site-materials'] });
    }
  });
  
  // Mutation for seeding site materials
  const seedSiteMaterialsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/projects/${projectId}/seed-site-materials`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'site-materials'] });
    }
  });
  
  // Create sample site materials if none exist and we have materials to choose from
  useEffect(() => {
    if (
      siteMaterials && 
      siteMaterials.length === 0 && 
      allMaterials && 
      allMaterials.length > 0 && 
      !materialsSeedCalled && 
      !addSiteMaterialMutation.isPending
    ) {
      setMaterialsSeedCalled(true);
      
      // Only add a max of 3 sample materials
      const maxSamples = Math.min(3, allMaterials.length);
      const sampleLocations = ["Main storage", "North side", "Foundation area"];
      const statuses = ["available", "reserved"];
      
      // Add sample materials sequentially
      for (let i = 0; i < maxSamples; i++) {
        const material = allMaterials[i];
        
        // Don't add if material is undefined
        if (!material) continue;
        
        // Generate a somewhat random quantity between 5-35
        const quantity = Math.floor(Math.random() * 30) + 5;
        
        addSiteMaterialMutation.mutate({
          materialId: material.id,
          quantity: quantity,
          unit: material.unit || "piece",
          location: sampleLocations[i % sampleLocations.length],
          status: statuses[i % statuses.length],
          notes: "Sample material for demonstration",
          addedBy: 1 // Default to user ID 1 (client1) for sample data
        });
      }
    }
  }, [siteMaterials, allMaterials, projectId, materialsSeedCalled, addSiteMaterialMutation]);

  // Calculate total value of materials on site
  const totalValue = siteMaterials?.reduce((total: number, material: SiteMaterial) => {
    return total + (material.materialDetails?.price || 0) * material.quantity;
  }, 0) || 0;

  if (isLoading) {
    return (
      <Card className="col-span-full lg:col-span-2 p-4 lg:p-6">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Boxes className="h-5 w-5 mr-2" />
            Materials on Site
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-2 p-4 lg:p-6">
      <CardHeader className="px-0 pt-0">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <CardTitle className="text-xl flex items-center">
            <Boxes className="h-5 w-5 mr-2" />
            Materials on Site
          </CardTitle>
          <Link to={`/projects/${projectId}/site-materials`}>
            <Button variant="outline" size="sm" className="gap-1 w-full sm:w-auto">
              <span>View All</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {siteMaterials?.length > 0 ? (
          <>
            <div className="mb-4">
              <div className="text-sm text-muted-foreground mb-1">Total Value:</div>
              <div className="text-2xl font-semibold">{formatCurrency(totalValue)}</div>
            </div>
            <div className="space-y-4 mt-4">
              {siteMaterials.slice(0, 5).map((material: SiteMaterial) => (
                <div key={material.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Package2 className="h-9 w-9 p-1.5 bg-primary/10 text-primary rounded-md" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">
                        {material.materialDetails?.name || "Unknown Material"}
                      </h4>
                      <div className="flex flex-wrap items-center text-xs text-muted-foreground">
                        <span className="mr-2">{material.quantity} {material.materialDetails?.unit}</span>
                        <span className="mr-2 hidden sm:inline">•</span>
                        <span>{material.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end space-x-2 mt-2 sm:mt-0 ml-12 sm:ml-0">
                    <div className="text-sm font-medium">
                      {formatCurrency((material.materialDetails?.price || 0) * material.quantity)}
                    </div>
                    <Badge 
                      variant={
                        material.status === "available" ? "default" :
                        material.status === "reserved" ? "secondary" :
                        material.status === "depleted" ? "outline" : "destructive"
                      }
                      className="text-xs"
                    >
                      {material.status.charAt(0).toUpperCase() + material.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {siteMaterials.length > 5 && (
                <div className="text-center mt-4 pt-2">
                  <Link to={`/projects/${projectId}/site-materials`}>
                    <Button variant="ghost" size="sm">
                      View {siteMaterials.length - 5} more materials
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package2 className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-medium">No materials recorded</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Track materials available at the construction site to better manage resources.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button 
                variant="default" 
                onClick={() => seedSiteMaterialsMutation.mutate()} 
                disabled={seedSiteMaterialsMutation.isPending}
              >
                {seedSiteMaterialsMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
                ) : (
                  <>Add Sample Materials</>
                )}
              </Button>
              <Link to={`/projects/${projectId}/site-materials`}>
                <Button variant="outline">Track Manually</Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}