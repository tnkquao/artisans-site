import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Bell, 
  Building2, 
  Check, 
  Computer, 
  Home, 
  LogOut, 
  Menu, 
  Users, 
  X,
  HardHat,
  Shield,
  ShoppingCart, 
  FileStack, 
  GanttChart,
  Truck,
  Hammer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDirectAdminAuth } from "@/hooks/use-direct-admin-auth";
import { SmartNotificationPanel } from "@/components/notifications/smart-notification-panel";

interface AdminDashboardLayoutProps {
  title: string;
  children: ReactNode;
}

// Define all possible admin navigation items
const navigationItems = [
  { name: "Dashboard", href: "/admin-dashboard", icon: <Home className="h-5 w-5" /> },
  { name: "User Management", href: "/admin-users", icon: <Users className="h-5 w-5" /> },
  { name: "Projects", href: "/admin-projects", icon: <Building2 className="h-5 w-5" /> },
  { name: "Service Requests", href: "/admin-service-requests", icon: <Check className="h-5 w-5" /> },
  { name: "Bidding System", href: "/admin-bidding", icon: <Hammer className="h-5 w-5" /> },
  { name: "Orders", href: "/admin-orders", icon: <ShoppingCart className="h-5 w-5" /> },
  { name: "Reports", href: "/admin-reports", icon: <FileStack className="h-5 w-5" /> },
  { name: "Suppliers", href: "/admin-suppliers", icon: <Truck className="h-5 w-5" /> },
  { name: "Admin Management", href: "/admin-management", icon: <GanttChart className="h-5 w-5" /> },
  { name: "Settings", href: "/admin-settings", icon: <Computer className="h-5 w-5" /> },
];

export default function AdminDashboardLayout({ title, children }: AdminDashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { adminUser, logout } = useDirectAdminAuth();

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 bg-primary text-white h-screen fixed">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center mb-8">
            <HardHat className="text-secondary text-xl mr-2" />
            <h1 className="text-lg font-bold">ARTISANS ADMIN</h1>
          </div>

          <nav className="flex-1 space-y-1">
            {navigationItems.map((item) => (
              <Link 
                href={item.href} 
                key={item.name}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-md transition-colors text-white",
                  location === item.href
                    ? "bg-primary-dark font-medium"
                    : "hover:bg-primary-dark/50"
                )}
              >
                {item.icon}
                <span className="ml-2">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="pt-6 border-t border-primary-dark mt-6">
            <div className="flex items-center mb-6">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src="/assets/admin-avatar.png" alt="Admin" />
                <AvatarFallback className="bg-primary-dark text-white">
                  {adminUser && adminUser.username ? adminUser.username.substring(0, 2).toUpperCase() : "AD"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{adminUser && adminUser.username ? adminUser.username : "Admin"}</p>
                <Badge variant="secondary" className="mt-1">Administrator</Badge>
              </div>
            </div>
            <Button 
              variant="destructive" 
              className="w-full font-bold text-white border-2 border-red-400 hover:bg-red-700 transition-colors"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-5 w-5" /> SIGN OUT
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-primary text-white p-3 fixed top-0 w-full z-30 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <HardHat className="text-secondary text-xl mr-2" />
            <h1 className="text-lg font-bold">ARTISANS ADMIN</h1>
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
              <Shield className="text-secondary text-xl mr-2" />
              <h1 className="text-lg font-bold text-white">ADMIN PANEL</h1>
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
            <nav className="flex flex-col p-4 space-y-1">
              {navigationItems.map((item) => (
                <Link 
                  href={item.href} 
                  key={item.name}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors text-white",
                    location === item.href
                      ? "bg-primary-dark"
                      : "hover:bg-primary-dark/50"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-primary-dark">
                <Button
                  variant="destructive"
                  className="w-full font-bold text-white border-2 border-red-400 hover:bg-red-700 transition-colors"
                  onClick={() => logout()}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  SIGN OUT
                </Button>
              </div>
            </nav>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col w-full md:ml-64">
        {/* Header - Desktop */}
        <header className="bg-white shadow-sm py-4 px-6 hidden md:block">
          <div className="flex justify-end items-center">
            <SmartNotificationPanel />
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
          <p>&copy; {new Date().getFullYear()} Artisans Ghana Admin Panel. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}