import { useLocation } from "wouter";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Construction, Lightbulb, Droplet, Hammer, TrendingUp, PaintBucket, Home, Building, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function ServicesPage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  
  // Services catalog
  const services = [
    {
      id: "contractor",
      name: "Contractor Services",
      description: "General contracting services for construction projects",
      icon: <Construction className="h-12 w-12 text-primary" />,
      path: "/services/contractor"
    },
    {
      id: "real_estate",
      name: "Real Estate Development",
      description: "Property development and real estate services",
      icon: <Building className="h-12 w-12 text-primary" />,
      path: "/services/real-estate"
    },
    {
      id: "electrician",
      name: "Electrical Services",
      description: "All electrical installations, repairs, and maintenance",
      icon: <Lightbulb className="h-12 w-12 text-primary" />,
      path: "/services/electrician"
    },
    {
      id: "plumber",
      name: "Plumbing Services",
      description: "Plumbing installations, repairs, and maintenance",
      icon: <Droplet className="h-12 w-12 text-primary" />,
      path: "/services/plumber"
    },
    {
      id: "carpenter",
      name: "Carpentry Services",
      description: "Custom carpentry work for all construction needs",
      icon: <Hammer className="h-12 w-12 text-primary" />,
      path: "/services/carpenter"
    },
    {
      id: "mason",
      name: "Masonry Services",
      description: "Professional masonry work for walls, foundations, and more",
      icon: <TrendingUp className="h-12 w-12 text-primary" />,
      path: "/services/mason"
    },
    {
      id: "painter",
      name: "Painting Services",
      description: "Interior and exterior painting services",
      icon: <PaintBucket className="h-12 w-12 text-primary" />,
      path: "/services/painter"
    },
    {
      id: "roofer",
      name: "Roofing Services",
      description: "Roof installation, repair, and maintenance",
      icon: <Home className="h-12 w-12 text-primary" />,
      path: "/services/roofer"
    },
    {
      id: "architect",
      name: "Architectural Services",
      description: "Architectural design and planning",
      icon: <Wrench className="h-12 w-12 text-primary" />,
      path: "/services/architect"
    }
  ];
  
  return (
    <DashboardLayout title="Artisans Services">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Wrench className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">Available Services</h1>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Service Categories</CardTitle>
          <CardDescription>
            Browse through our extensive list of construction and property development services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(service => (
              <Card 
                key={service.id} 
                className="overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer" 
                onClick={() => setLocation(service.path)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-center mb-4">
                    {service.icon}
                  </div>
                  <CardTitle className="text-center">{service.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-600">{service.description}</p>
                </CardContent>
                <CardFooter className="flex justify-center pb-6">
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(service.path);
                    }}
                  >
                    View Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Need a Custom Service?</CardTitle>
          <CardDescription>
            Don't see what you need? You can always request a custom service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Our network of trusted professionals extends beyond the categories listed above. If you need a specialized service or have a unique project requirement, we can help you find the right professionals.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => setLocation("/service-requests")}
          >
            Request Custom Service
          </Button>
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
}