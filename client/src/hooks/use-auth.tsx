import { createContext, ReactNode, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  isLoggedIn: boolean;
};

// Define a type for login credentials that supports either username or email
type LoginData = {
  username?: string;
  email?: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Force navigation with a hard redirect to ensure immediate page change
 */
function forceNavigation(path: string) {
  window.location.href = path;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Check localStorage for saved login state to help during page reloads
  const hasLocalStorageLoginFlag = localStorage.getItem("isLoggedIn") === "true";
  const savedUserData = JSON.parse(localStorage.getItem("userData") || "null");
  
  // Create unique cache key that includes a timestamp to prevent stale data
  const cacheKey = ["/api/user", new Date().getTime().toString().slice(0, -3)];
  
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<SelectUser | null, Error>({
    queryKey: cacheKey,
    queryFn: async ({ queryKey }) => {
      try {
        // First, verify authentication state
        const verifyRes = await fetch('/api/auth/verify', {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        // If authentication check is successful, fetch the user data
        if (verifyRes.ok) {
          console.log("Authentication verified, fetching user data...");
          const res = await fetch('/api/user', {
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (res.ok) {
            return await res.json();
          }
          
          throw new Error("Failed to fetch user data");
        }
        
        // If verification fails but we think we're logged in, log the error for debugging
        if (hasLocalStorageLoginFlag) {
          const verifyData = await verifyRes.json();
          console.error("Authentication verification failed:", verifyData);
        }
        
        return null;
      } catch (error) {
        console.error("Error in auth verification:", error);
        return null;
      }
    },
    staleTime: 1000 * 60, // Consider data fresh for 60 seconds
    // If we have a localStorage flag indicating the user is logged in,
    // we want to retry to recover from temporary network issues
    retry: hasLocalStorageLoginFlag ? 3 : 0, // Retry more times if we believe we're logged in
    retryDelay: 1000,
    // Use fallback data from localStorage if available
    initialData: savedUserData,
  });
  
  // Computed property for logged in state - check both user data and localStorage
  const isLoggedIn = Boolean(user) || hasLocalStorageLoginFlag;
  
  // Update userData in localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("userData", JSON.stringify(user));
    }
  }, [user]);
  
  // If localStorage says we're logged in but we don't have user data, retry the fetch
  useEffect(() => {
    const checkLoginState = async () => {
      if (hasLocalStorageLoginFlag && !user && !isLoading) {
        // Try to fetch the user data again with a forced reload
        console.log("Local storage indicates logged in state, retrying user fetch...");
        await refetch();
        
        // After maxRetries, if we still can't get a user, clear the localStorage flag
        // to prevent infinite retry loops
        if (!user) {
          console.log("Failed to retrieve user data after multiple retries, clearing login state");
          localStorage.removeItem("isLoggedIn");
          localStorage.removeItem("userData");
        }
      }
    };
    
    const retryTimer = setTimeout(checkLoginState, 1000);
    return () => clearTimeout(retryTimer);
  }, [hasLocalStorageLoginFlag, user, isLoading, refetch]);
  
  // Handle redirection to auth page if user is not logged in
  useEffect(() => {
    if (!isLoading && !isLoggedIn && !location.startsWith('/auth')) {
      // Only redirect to auth if we're not already there and not on an invitation page
      if (!location.startsWith('/join/')) {
        console.log('Not logged in, redirecting to auth page');
        navigate('/auth');
      }
    }
  }, [isLoggedIn, isLoading, location, navigate]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        // Determine if user is logging in with email or username
        const loginMethod = credentials.email ? 'email' : 'username';
        const identifier = credentials.email || credentials.username;
        
        console.log(`Attempting login with ${loginMethod}:`, identifier);
        
        // Create a safe copy of credentials to log (without password)
        const safeCredentials = { 
          username: credentials.username, 
          email: credentials.email,
          hasPassword: Boolean(credentials.password) 
        };
        
        // Make request with better error handling
        const response = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Requested-With": "XMLHttpRequest"
          },
          body: JSON.stringify(credentials),
          credentials: "include",
          cache: "no-store",
          mode: "same-origin"
        });
        
        // Handle error responses
        if (!response.ok) {
          let errorMessage = "Login failed";
          
          try {
            // Try to parse error response as JSON
            const errorData = await response.json();
            errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;
          } catch (parseError) {
            // If JSON parsing fails, try getting text
            try {
              const errorText = await response.text();
              errorMessage = errorText || `Error ${response.status}: ${response.statusText}`;
            } catch (textError) {
              // If all fails, use generic error with status
              errorMessage = `Login failed with status ${response.status}`;
            }
          }
          
          console.error("Login error:", {
            status: response.status,
            statusText: response.statusText,
            credentials: safeCredentials
          });
          
          throw new Error(errorMessage);
        }
        
        // Parse successful response
        const userData = await response.json();
        
        // Check if we got valid user data
        if (!userData || !userData.id || !userData.username || !userData.role) {
          console.error("Invalid user data received:", userData);
          throw new Error("Invalid response from server");
        }
        
        console.log("Login successful for", userData.username);
        return userData;
      } catch (error) {
        console.error("Login error:", error);
        throw error; 
      }
    },
    onSuccess: (user: SelectUser) => {
      try {
        console.log("Login successful, storing user data");
        
        // Update the query cache immediately with the user data
        queryClient.setQueryData(["/api/user"], user);
        queryClient.setQueryData(cacheKey, user);
        
        // Set a flag in localStorage to indicate the user is logged in
        // and save user data for offline access
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userData", JSON.stringify(user));
        localStorage.setItem("lastLogin", new Date().toISOString());
        
        // Initialize everything that depends on user being logged in
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        
        // Show toast for successful login
        toast({
          title: "Welcome back!",
          description: `You've successfully logged in as ${user.fullName || user.username}.`,
        });

        // Get the current URL path to check if we're on an invitation page
        const currentPath = window.location.pathname;
        
        // If we're on an invitation page (/join/...), don't redirect
        // This allows invitation pages to handle their own redirects
        if (!currentPath.startsWith('/join/')) {
          console.log("Redirecting to appropriate dashboard");
          
          // Immediately navigate based on user role
          const path = user.role === "admin" 
            ? "/admin-dashboard"
            : user.role === "service_provider" 
              ? "/provider-dashboard" 
              : user.role === "supplier"
                ? "/supplier-dashboard"
                : "/";
          
          // Use hard redirect for immediate navigation
          forceNavigation(path);
        }
      } catch (error) {
        console.error("Navigation error:", error);
      }
    },
    onError: (error: Error) => {
      // Clear any stale login state
      localStorage.removeItem("isLoggedIn");
      
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Registration failed. Please try again with a different username.");
      }
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      try {
        // Update the query cache immediately
        queryClient.setQueryData(["/api/user"], user);
        queryClient.setQueryData(cacheKey, user);
        
        // Save user data to localStorage for offline access
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userData", JSON.stringify(user));
        localStorage.setItem("lastLogin", new Date().toISOString());
        
        // Invalidate to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        // Initialize everything that depends on user being logged in
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

        // Show toast for successful registration
        toast({
          title: "Account created",
          description: `Welcome to Artisans, ${user.fullName || user.username}!`,
        });

        // Get the current URL path to check if we're on an invitation page
        const currentPath = window.location.pathname;
        
        // If we're on an invitation page (/join/...), don't redirect
        // This allows invitation pages to handle their own redirects
        if (!currentPath.startsWith('/join/')) {
          // Immediately navigate based on user role
          const path = user.role === "admin" 
            ? "/admin-dashboard"
            : user.role === "service_provider" 
              ? "/provider-dashboard" 
              : user.role === "supplier"
                ? "/supplier-dashboard"
                : "/";
          
          // Force navigation for immediate effect
          forceNavigation(path);
        }
      } catch (error) {
        console.error("Navigation error after registration:", error);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        throw new Error("Logout failed. Please try again.");
      }
    },
    onSuccess: () => {
      // Clear user data immediately
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(cacheKey, null);
      
      // Clear all user data from localStorage
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userData");
      localStorage.removeItem("lastLogin");
      
      // Clean up all app-related localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('artisans-') || 
            key.includes('user') || 
            key.includes('auth') || 
            key.includes('login') ||
            key.includes('session')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear all query cache
      queryClient.clear();
      
      // Add a small delay before navigation to allow cleanup
      setTimeout(() => {
        toast({
          title: "Logged out",
          description: "You've been successfully logged out.",
        });
        
        // Force immediate navigation to auth page
        forceNavigation("/auth");
      }, 100); // Short delay to allow for cleanup
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        isLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}