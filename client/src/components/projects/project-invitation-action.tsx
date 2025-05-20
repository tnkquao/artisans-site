import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface ProjectInvitationActionProps {
  invitationId: number;
  inviteToken: string;
  projectId: number;
  projectName: string;
  role: string;
}

export default function ProjectInvitationAction({
  invitationId,
  inviteToken,
  projectId,
  projectName,
  role
}: ProjectInvitationActionProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [actionTaken, setActionTaken] = useState<'accepted' | 'declined' | null>(null);

  // Mutation for accepting the invitation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/invitations/accept", { token: inviteToken });
      return response.json();
    },
    onSuccess: () => {
      setActionTaken('accepted');
      toast({
        title: "Invitation Accepted",
        description: `You've joined the project "${projectName}" as ${role}`,
        variant: "default",
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      // Navigate to the project after a short delay
      setTimeout(() => {
        navigate(`/projects/${projectId}`);
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for declining the invitation
  const declineMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/invitations/decline", { token: inviteToken });
      return response.json();
    },
    onSuccess: () => {
      setActionTaken('declined');
      toast({
        title: "Invitation Declined",
        description: `You've declined the invitation to project "${projectName}"`,
        variant: "default",
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to decline invitation. Please try again.",
        variant: "destructive",
      });
    }
  });

  const isPending = acceptMutation.isPending || declineMutation.isPending;

  if (actionTaken === 'accepted') {
    return (
      <Card className="bg-green-50 border-green-200 p-4 flex items-center mb-4">
        <CheckCircle className="text-green-500 mr-2 h-5 w-5" />
        <span className="text-green-800">
          You've accepted this invitation. Redirecting to project...
        </span>
      </Card>
    );
  }

  if (actionTaken === 'declined') {
    return (
      <Card className="bg-gray-50 border-gray-200 p-4 flex items-center mb-4">
        <XCircle className="text-gray-500 mr-2 h-5 w-5" />
        <span className="text-gray-800">
          You've declined this invitation.
        </span>
      </Card>
    );
  }

  return (
    <Card className="bg-blue-50 border-blue-200 p-4 mb-4">
      <h3 className="font-medium text-blue-800 mb-2">
        You've been invited to join project "{projectName}" as {role}
      </h3>
      <p className="text-blue-600 text-sm mb-4">
        As a {role}, you'll be able to manage and update the project, add timeline entries, and interact with the project team.
      </p>
      <div className="flex space-x-3">
        <Button
          onClick={() => acceptMutation.mutate()}
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          {acceptMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Accepting...
            </>
          ) : (
            "Accept Invitation"
          )}
        </Button>
        <Button
          onClick={() => declineMutation.mutate()}
          disabled={isPending}
          variant="outline"
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          {declineMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Declining...
            </>
          ) : (
            "Decline"
          )}
        </Button>
      </div>
    </Card>
  );
}