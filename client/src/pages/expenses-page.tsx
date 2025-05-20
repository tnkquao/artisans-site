import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowLeft } from "lucide-react";
import { ProjectExpenses } from "@/components/projects/project-expenses";

export default function ExpensesPage() {
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
  const canEditProject = isClient || isAdmin || userRole === "contractor" || userRole === "project_manager";

  return (
    <DashboardLayout title={`Project Expenses: ${project.name}`}>
      <div className="container py-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()} 
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Project Expenses: {project.name}</h1>
        </div>
        
        <ProjectExpenses 
          project={project} 
          canEdit={canEditProject}
        />
      </div>
    </DashboardLayout>
  );
}