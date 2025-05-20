import { ReactNode, useState } from "react";
import { Sidebar } from "@/components/layouts/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Menu, X, LogOut, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartNotificationPanel } from "@/components/notifications/smart-notification-panel";
import { WelcomeScreen } from "@/components/onboarding/welcome-screen";
import { useOnboarding } from "@/hooks/use-onboarding";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { showOnboarding, completeOnboarding } = useOnboarding();

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Onboarding Welcome Screen */}
      {showOnboarding && user && (
        <WelcomeScreen 
          onComplete={completeOnboarding} 
          username={user.username} 
        />
      )}
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-primary text-white p-3 fixed top-0 w-full z-30 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <HardHat className="text-secondary text-xl mr-2" />
            <h1 className="text-lg font-bold">ARTISANS</h1>
          </div>
          <div className="flex items-center space-x-4">
            <SmartNotificationPanel />
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              className="text-white hover:bg-primary-light p-2 rounded-md focus:outline-none"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
        {/* Page title for mobile */}
        <div className="text-sm font-medium text-gray-200 mt-1 truncate">
          {title}
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      <div 
        className={`fixed inset-0 bg-gray-900 transition-opacity duration-300 z-40 md:hidden ${
          mobileMenuOpen ? "opacity-60 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        {/* Empty overlay div */}
      </div>
      
      {/* Mobile Menu */}
      <div 
        className={`fixed top-0 bottom-0 right-0 w-[85%] max-w-xs z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-primary h-full w-full p-0 shadow-xl flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-primary-light">
            <div className="flex items-center">
              <HardHat className="text-secondary text-xl mr-2" />
              <h1 className="text-lg font-bold text-white">ARTISANS</h1>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-white p-1.5 hover:bg-primary-light rounded-full"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Sidebar isMobile={true} onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col w-full">
        {/* Header - Desktop */}
        <header className="bg-white shadow-sm py-4 px-6 hidden md:block">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            <div className="flex items-center space-x-4">
              <SmartNotificationPanel />
              <Button 
                variant="outline" 
                className="border-red-300 text-red-600"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 bg-gray-100 p-4 md:p-6 mt-20 md:mt-0 overflow-auto">
          <div className="max-w-full">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Artisans Construction Management Platform. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
