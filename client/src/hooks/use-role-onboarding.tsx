import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

// Define the context type
type RoleOnboardingContextType = {
  showRoleOnboarding: boolean;
  setShowRoleOnboarding: (show: boolean) => void;
  currentRole: string | null;
  setCurrentRole: (role: string | null) => void;
  completedRoles: string[];
  completeRoleOnboarding: (role: string) => void;
};

// Create context with default values
const RoleOnboardingContext = createContext<RoleOnboardingContextType>({
  showRoleOnboarding: false,
  setShowRoleOnboarding: () => {},
  currentRole: null,
  setCurrentRole: () => {},
  completedRoles: [],
  completeRoleOnboarding: () => {},
});

type RoleOnboardingProviderProps = {
  children: ReactNode;
};

export function RoleOnboardingProvider({ children }: RoleOnboardingProviderProps) {
  const { user } = useAuth();
  const [showRoleOnboarding, setShowRoleOnboarding] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [completedRoles, setCompletedRoles] = useState<string[]>([]);

  // Check localStorage for completed roles on mount
  useEffect(() => {
    if (user) {
      try {
        const savedCompletedRoles = localStorage.getItem(`completedRoles_${user.id}`);
        if (savedCompletedRoles) {
          setCompletedRoles(JSON.parse(savedCompletedRoles));
        }
      } catch (error) {
        console.error("Failed to load completed roles from localStorage", error);
      }
    }
  }, [user]);

  // Mark a role as completed and save to localStorage
  const completeRoleOnboarding = (role: string) => {
    if (!completedRoles.includes(role)) {
      const updatedRoles = [...completedRoles, role];
      setCompletedRoles(updatedRoles);
      
      if (user) {
        try {
          localStorage.setItem(`completedRoles_${user.id}`, JSON.stringify(updatedRoles));
        } catch (error) {
          console.error("Failed to save completed roles to localStorage", error);
        }
      }
    }
  };

  return (
    <RoleOnboardingContext.Provider
      value={{
        showRoleOnboarding,
        setShowRoleOnboarding,
        currentRole,
        setCurrentRole,
        completedRoles,
        completeRoleOnboarding,
      }}
    >
      {children}
    </RoleOnboardingContext.Provider>
  );
}

export function useRoleOnboarding() {
  const context = useContext(RoleOnboardingContext);
  
  if (!context) {
    throw new Error("useRoleOnboarding must be used within a RoleOnboardingProvider");
  }
  
  return context;
}