import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useAuth } from "./use-auth";

type OnboardingContextType = {
  showOnboarding: boolean;
  onboardingComplete: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  
  useEffect(() => {
    if (user) {
      // Check if user has completed onboarding before
      const hasSeenOnboarding = localStorage.getItem(`onboarding-complete-${user.id}`);
      
      if (!hasSeenOnboarding) {
        // Show onboarding for new users
        setShowOnboarding(true);
        setOnboardingComplete(false);
      }
    }
  }, [user]);
  
  const completeOnboarding = () => {
    if (user) {
      // Mark onboarding as complete for this user
      localStorage.setItem(`onboarding-complete-${user.id}`, "true");
      setShowOnboarding(false);
      setOnboardingComplete(true);
    }
  };
  
  const resetOnboarding = () => {
    if (user) {
      // Remove the completed flag to show onboarding again
      localStorage.removeItem(`onboarding-complete-${user.id}`);
      setShowOnboarding(true);
      setOnboardingComplete(false);
    }
  };
  
  return (
    <OnboardingContext.Provider
      value={{
        showOnboarding,
        onboardingComplete,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}