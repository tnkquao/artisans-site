import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mails, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import ProjectInvitationAction from "@/components/projects/project-invitation-action";

export default function ProjectInvitationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Fetch pending invitations for the current user
  const { data: invitations, isLoading, error } = useQuery({
    queryKey: ["/api/invitations/pending"],
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/invitations/pending", { signal });
      if (!res.ok) {
        throw new Error("Failed to fetch invitations");
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Project Invitations">
        <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Project Invitations">
        <div className="container mx-auto py-8">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error Loading Invitations
              </CardTitle>
              <CardDescription className="text-red-500">
                {error instanceof Error ? error.message : "An unknown error occurred"}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Project Invitations">
      <div className="container mx-auto py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mails className="h-5 w-5 mr-2" />
              Project Invitations
            </CardTitle>
            <CardDescription>
              Review and respond to your project invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations && invitations.length > 0 ? (
              <div className="space-y-4">
                {invitations.map((invitation: any) => (
                  <ProjectInvitationAction
                    key={invitation.id}
                    invitationId={invitation.id}
                    inviteToken={invitation.inviteToken}
                    projectId={invitation.projectId}
                    projectName={invitation.projectName}
                    role={invitation.role}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Mails className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
                <p className="text-gray-500">
                  You don't have any pending project invitations at the moment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}