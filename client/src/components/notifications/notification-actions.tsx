import React from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface NotificationActionProps {
  notificationId: number;
  invitationId?: number;
  inviteToken?: string;
  projectId?: number;
  onClose?: () => void;
}

export function NotificationActions({ 
  notificationId, 
  invitationId, 
  inviteToken, 
  projectId,
  onClose 
}: NotificationActionProps) {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/invitations/${inviteToken}`, { action: "accept" });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation accepted!",
        description: "You've successfully joined the project team.",
      });
      
      // Mark notification as read
      markNotificationReadMutation.mutate();
      
      // Invalidate projects query to refresh projects list
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      // Redirect to the project page
      if (projectId) {
        setLocation(`/projects/${projectId}`);
      }
      
      // Close the dropdown if a close handler was provided
      if (onClose) {
        onClose();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Decline invitation mutation
  const declineInvitationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/invitations/${inviteToken}`, { action: "decline" });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation declined",
        description: "You've declined the project invitation.",
      });
      
      // Mark notification as read
      markNotificationReadMutation.mutate();
      
      // Close the dropdown if a close handler was provided
      if (onClose) {
        onClose();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to decline invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mark notification as read
  const markNotificationReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
  
  return (
    <div className="flex flex-row space-x-2 mt-2">
      <Button
        variant="default"
        size="sm"
        className="w-full"
        onClick={() => acceptInvitationMutation.mutate()}
        disabled={acceptInvitationMutation.isPending || declineInvitationMutation.isPending}
      >
        {acceptInvitationMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <Check className="h-4 w-4 mr-1" />
        )}
        Accept
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => declineInvitationMutation.mutate()}
        disabled={acceptInvitationMutation.isPending || declineInvitationMutation.isPending}
      >
        {declineInvitationMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : (
          <X className="h-4 w-4 mr-1" />
        )}
        Decline
      </Button>
    </div>
  );
}