import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowLeft, ClipboardCheck, Calendar, User, Plus, FileText } from "lucide-react";

export default function ReportsPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const id = Number(projectId);
  
  const { data: project, isLoading, error } = useQuery({
    queryKey: [`/api/projects/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!id && !isNaN(id),
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Loading Project...">
        <div className="container py-10 flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout title="Project Not Found">
        <div className="container py-10">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The project you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button variant="default" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Determine user's role and permissions
  const isClient = user?.id === project.clientId;
  const isAdmin = user?.role === "admin";
  
  const userTeamMember = project.teamMembers?.find(member => member.userId === user?.id);
  const userRole = userTeamMember?.role || (isClient ? "client" : null) || (isAdmin ? "admin" : null);
  
  // Permissions
  const canCreateReport = isAdmin || userRole === "contractor" || userRole === "project_manager" || userRole === "inspector";

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6">
          <div className="flex items-center">
            <Button 
              variant="outline" 
              onClick={() => window.history.back()} 
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Site Reports: {project.name}</h1>
          </div>
          
          {canCreateReport && (
            <Button className="mt-4 sm:mt-0">
              <Plus className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          )}
        </div>
        
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <ClipboardCheck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Site Reports Coming Soon</h3>
          <p className="text-gray-500 mb-6 max-w-lg mx-auto">
            This feature is currently being implemented. Soon you'll be able to view and create detailed site reports including on-site activities, safety observations, and progress documentation.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mt-8 px-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <Calendar className="h-8 w-8 text-blue-500 mb-3" />
                  <h3 className="font-semibold mb-2">Daily Activity Reports</h3>
                  <p className="text-sm text-center text-muted-foreground">
                    Record daily activities on the construction site
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <User className="h-8 w-8 text-green-500 mb-3" />
                  <h3 className="font-semibold mb-2">Safety Inspections</h3>
                  <p className="text-sm text-center text-muted-foreground">
                    Document safety checks and compliance reviews
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <FileText className="h-8 w-8 text-amber-500 mb-3" />
                  <h3 className="font-semibold mb-2">Quality Assurance</h3>
                  <p className="text-sm text-center text-muted-foreground">
                    Track progress against quality standards
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}