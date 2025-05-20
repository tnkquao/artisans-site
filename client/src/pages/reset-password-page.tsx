import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useParams, useLocation } from "wouter";
import ResetPasswordForm from "@/components/auth/reset-password-form";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  // If the user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Validate token on component mount
  useEffect(() => {
    // Quick client-side validation first
    if (!token || token.length < 32) {
      setIsTokenValid(false);
      setIsLoading(false);
      return;
    }

    // More validation could be done here by checking with the server
    // We're keeping it simple for now
    setIsTokenValid(true);
    setIsLoading(false);
  }, [token]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Validating your password reset link...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token
  if (!isTokenValid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <XCircle className="h-12 w-12 text-destructive" />
            <h1 className="text-lg font-medium">Invalid Reset Link</h1>
            <p className="text-center text-sm text-muted-foreground">
              The password reset link is invalid or has expired. Please request a new link.
            </p>
            <Button asChild>
              <Link href="/auth">Return to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid token
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <ResetPasswordForm token={token} />
        </CardContent>
      </Card>
    </div>
  );
}