import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: number;
  username: string;
  role: string;
  fullName?: string;
}

interface DirectAdminAuthContextType {
  adminUser: AdminUser | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const DirectAdminAuthContext = createContext<DirectAdminAuthContextType | null>(null);

export function DirectAdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  console.log("DirectAdminAuthProvider initializing");

  // Check for stored admin auth on mount
  useEffect(() => {
    const checkStoredAuth = async () => {
      console.log("Checking stored admin auth");
      try {
        const storedAdmin = localStorage.getItem("admin_auth");
        if (storedAdmin) {
          console.log("Found stored admin auth in localStorage");
          const parsedAdmin = JSON.parse(storedAdmin);
          console.log("Parsed admin data:", parsedAdmin);
          
          // Verify admin status with the server
          try {
            console.log("Verifying admin status with server for:", parsedAdmin.username);
            const verifyResponse = await apiRequest("POST", "/api/direct-admin/verify", {
              adminUsername: parsedAdmin.username
            });
            
            if (verifyResponse.ok) {
              console.log("Admin verification successful");
              const adminData = await verifyResponse.json();
              console.log("Admin data from server:", adminData);
              setAdminUser({
                id: adminData.adminId || parsedAdmin.id,
                username: adminData.adminUsername || parsedAdmin.username,
                role: "admin", // Force role to admin since verification endpoint confirmed it
                fullName: adminData.fullName || parsedAdmin.fullName
              });
              console.log("Admin user state updated");
            } else {
              console.warn("Admin verification failed with status:", verifyResponse.status);
              // Clear invalid stored auth
              localStorage.removeItem("admin_auth");
            }
          } catch (err) {
            console.error("Admin verification error:", err);
            // Keep the stored admin data even if verification fails temporarily
            // This allows admin to use dashboard features even during network issues
            console.log("Using cached admin data due to verification error");
            setAdminUser({
              id: parsedAdmin.id,
              username: parsedAdmin.username,
              role: parsedAdmin.role,
              fullName: parsedAdmin.fullName
            });
          }
        } else {
          console.log("No stored admin auth found in localStorage");
        }
      } catch (err) {
        console.error("Error checking stored admin auth:", err);
      } finally {
        console.log("Admin auth check complete, setting isLoading to false");
        setIsLoading(false);
      }
    };

    checkStoredAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest("POST", "/api/direct-admin/login", {
        username,
        password
      });
      
      if (!response.ok) {
        throw new Error("Authentication failed");
      }
      
      const adminData = await response.json();
      
      // Store admin auth data in localStorage for persistence
      localStorage.setItem("admin_auth", JSON.stringify({
        id: adminData.id, 
        username: adminData.username,
        role: adminData.role,
        fullName: adminData.fullName,
        token: adminData.token
      }));
      
      setAdminUser({
        id: adminData.id,
        username: adminData.username,
        role: adminData.role,
        fullName: adminData.fullName
      });
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${adminData.username}!`,
      });
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Authentication failed"));
      toast({
        title: "Login failed",
        description: "Invalid credentials or server error",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_auth");
    setAdminUser(null);
    
    toast({
      title: "Logged out",
      description: "You have been logged out of the admin dashboard",
    });
    
    // Attempt to notify server, but don't wait for response
    apiRequest("POST", "/api/direct-admin/logout").catch(err => {
      console.error("Logout notification error:", err);
    });
  };

  return (
    <DirectAdminAuthContext.Provider value={{ adminUser, isLoading, error, login, logout }}>
      {children}
    </DirectAdminAuthContext.Provider>
  );
}

export function useDirectAdminAuth() {
  const context = useContext(DirectAdminAuthContext);
  if (!context) {
    throw new Error("useDirectAdminAuth must be used within a DirectAdminAuthProvider");
  }
  return context;
}