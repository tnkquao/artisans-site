import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, UserPlus, X, Clock } from "lucide-react";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Define a type for the invitation data
interface TeamInvitation {
  id: number;
  projectId: number;
  projectName: string;
  inviteToken: string;
  inviteEmail: string;
  inviteStatus: string;
  role: string;
  invitedByUserId: number;
  invitedByUsername: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export default function JoinInvitationPage() {
  // Get token from URL parameters
  const params = useParams<{ inviteToken: string }>();
  const inviteToken = params.inviteToken;
  
  // For debugging
  console.log("Invitation token from URL:", inviteToken);
  
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(user ? "invitation" : "login");
  
  // Fetch the invitation data
  const { 
    data: invitation, 
    isLoading, 
    isError, 
    error 
  } = useQuery<TeamInvitation>({
    queryKey: [`/api/invitations/${inviteToken}`],
    queryFn: getQueryFn<TeamInvitation>({ on401: "returnNull" }),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/invitations/accept", { token: inviteToken });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation accepted",
        description: "You've successfully joined the project team!",
      });
      
      // Redirect to the project page if we have valid project ID
      if (invitation && invitation.projectId) {
        navigate(`/projects/${invitation.projectId}`);
      } else if (data && data.projectId) {
        // Fallback to use project ID from the API response
        navigate(`/projects/${data.projectId}`);
      } else {
        // If no project ID is available, just go to projects list
        navigate('/projects');
      }
      
      // Invalidate projects query to refresh projects list
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Debug log when invitation data changes
  useEffect(() => {
    if (!isLoading) {
      if (invitation) {
        console.log("Invitation data loaded:", { 
          id: invitation.id,
          projectId: invitation.projectId,
          projectName: invitation.projectName,
          token: invitation.inviteToken,
          email: invitation.inviteEmail,
          status: invitation.inviteStatus,
          role: invitation.role
        });
      } else if (isError) {
        console.error("Error loading invitation:", error);
      } else {
        console.warn("No invitation data found for token:", inviteToken);
      }
    }
  }, [invitation, isLoading, isError, error, inviteToken]);

  // Debug log when user state changes
  useEffect(() => {
    console.log("User state changed:", user ? { 
      id: user.id, 
      username: user.username,
      email: user.email,
      role: user.role 
    } : "Not logged in");
  }, [user]);
  
  // Redirect to dashboard if user is already logged in and we're not showing the invitation
  useEffect(() => {
    if (user && !isLoading && !invitation && !isError) {
      console.log("Redirecting to home - logged in but no valid invitation found");
      navigate("/");
    }
  }, [user, isLoading, invitation, isError, navigate]);

  // Switch to invitation tab when user logs in or registers
  useEffect(() => {
    if (user) {
      // Wait a brief moment to allow the user state to fully update
      setTimeout(() => {
        setActiveTab("invitation");
      }, 100);
    }
  }, [user]);
  
  // If invitation has expired
  const isExpired = invitation && invitation.expiresAt 
    ? new Date(invitation.expiresAt) < new Date() 
    : false;
  
  // If invitation is already accepted or declined
  const isProcessed = invitation && 
    (invitation.inviteStatus === "accepted" || invitation.inviteStatus === "declined");
  
  // Check if email matches logged in user
  const emailMatches = user?.email?.toLowerCase() === invitation?.inviteEmail?.toLowerCase();
  
  // If still loading auth or invitation
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg">Loading invitation...</p>
        </div>
      </div>
    );
  }
  
  // If there was an error loading the invitation
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invitation Error</CardTitle>
            <CardDescription>
              We couldn't load this invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <X className="h-16 w-16 text-destructive" />
              <p className="text-center text-muted-foreground">
                {(error as Error)?.message || "The invitation link appears to be invalid or has expired. Please contact the project owner for a new invitation."}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If invitation is expired
  if (isExpired && invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invitation Expired</CardTitle>
            <CardDescription>
              This invitation is no longer valid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <Clock className="h-16 w-16 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                This invitation expired {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}.
                Please ask the project owner to send you a new invitation.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // If invitation was already processed
  if (isProcessed && invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invitation {invitation.inviteStatus === "accepted" ? "Accepted" : "Declined"}</CardTitle>
            <CardDescription>
              This invitation has already been {invitation.inviteStatus}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              {invitation.inviteStatus === "accepted" ? (
                <CheckCircle className="h-16 w-16 text-success" />
              ) : (
                <X className="h-16 w-16 text-destructive" />
              )}
              <p className="text-center text-muted-foreground">
                {invitation.inviteStatus === "accepted" 
                  ? "You have already joined this project team."
                  : "You have declined this invitation."}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link href={invitation.inviteStatus === "accepted" ? `/projects/${invitation.projectId}` : "/"}>
                {invitation.inviteStatus === "accepted" ? "Go to Project" : "Go to Dashboard"}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // If no invitation data was found, show a generic error
  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Invalid Invitation</CardTitle>
            <CardDescription>
              We couldn't find this invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <X className="h-16 w-16 text-destructive" />
              <p className="text-center text-muted-foreground">
                The invitation link appears to be invalid or has expired. Please contact the project owner for a new invitation.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show login/register/invitation tabs with valid invitation data
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Project Invitation</CardTitle>
          <CardDescription>
            You've been invited to join <span className="font-medium">{invitation.projectName}</span>
          </CardDescription>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {!user && (
            <div className="flex justify-center mb-6">
              <TabsList>
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </div>
          )}

          {!user && (
            <TabsContent value="login" className="pt-2">
              <CardContent>
                <p className="mb-4 text-center text-sm text-muted-foreground">
                  Log in to your existing account to accept this invitation
                </p>
                <LoginForm 
                  onSuccess={() => setActiveTab("invitation")}
                  defaultEmail={invitation.inviteEmail}
                />
              </CardContent>
            </TabsContent>
          )}

          {!user && (
            <TabsContent value="register" className="pt-2">
              <CardContent>
                <p className="mb-4 text-center text-sm text-muted-foreground">
                  Create a new account to join this project
                </p>
                <RegisterForm 
                  onSuccess={() => setActiveTab("invitation")}
                  defaultEmail={invitation.inviteEmail}
                />
              </CardContent>
            </TabsContent>
          )}

          <TabsContent value="invitation" className="space-y-4 pt-4">
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium">Invitation Details</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <span className="text-muted-foreground">Project:</span>
                    <span>{invitation.projectName}</span>
                    
                    <span className="text-muted-foreground">Role:</span>
                    <span className="capitalize">{invitation.role.replace(/_/g, ' ')}</span>
                    
                    <span className="text-muted-foreground">Invited by:</span>
                    <span>{invitation.invitedByUsername}</span>
                    
                    <span className="text-muted-foreground">Expires:</span>
                    <span>{formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}</span>
                  </div>
                </div>

                {user && !emailMatches && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                    <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                      <strong>Important:</strong> This invitation was sent to {invitation.inviteEmail}, but you're currently logged in as {user.email}. To accept this invitation, please log in with the correct email address.
                    </p>
                  </div>
                )}

                {user && emailMatches && (
                  <div className="flex flex-col items-center space-y-4">
                    <UserPlus className="h-16 w-16 text-primary" />
                    <p className="text-center">
                      Click the button below to join <span className="font-medium">{invitation.projectName}</span> as a{" "}
                      <span className="capitalize">{invitation.role.replace(/_/g, ' ')}</span>.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-3">
              {user && emailMatches && (
                <Button 
                  className="w-full" 
                  onClick={() => acceptInvitationMutation.mutate()}
                  disabled={acceptInvitationMutation.isPending}
                >
                  {acceptInvitationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    "Accept Invitation"
                  )}
                </Button>
              )}
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/">Cancel</Link>
              </Button>
            </CardFooter>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}