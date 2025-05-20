import { useState } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Custom hook for direct login functionality in components
export function useDirectLogin() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { toast } = useToast();

  const login = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    setIsLoggingIn(true);
    setLoginError(null);
    
    try {
      console.log("Attempting direct login for user:", usernameOrEmail);
      
      // Determine if the input is an email or username by checking for @ symbol
      const isEmail = usernameOrEmail.includes('@');
      const requestBody = isEmail
        ? { email: usernameOrEmail, password }
        : { username: usernameOrEmail, password };
      
      console.log(`Login attempt using ${isEmail ? 'email' : 'username'}`);
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Login failed");
      }
      
      // Get user data
      const user = await response.json();
      
      // Store in localStorage for client-side auth checks
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userData", JSON.stringify(user));
      
      // Invalidate all queries to force refetch with new auth
      queryClient.invalidateQueries();
      
      // Show success message
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
      
      console.log("Login successful for user:", user.username);
      return true;
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError(error.message || "Login failed. Please try again.");
      
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  };

  return {
    login,
    isLoggingIn,
    loginError,
    clearLoginError: () => setLoginError(null)
  };
}