import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  LogOut,
  Settings,
  MessageSquare,
  Bell,
  Shield,
  Menu,
  X
} from "lucide-react";
import { useDirectAdminAuth } from "@/hooks/use-direct-admin-auth";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AdminDashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

// Ultra simple admin dashboard layout component without any external dependencies
export default function AdminDashboardLayout({ 
  children, 
  title = "Admin Dashboard"
}: AdminDashboardLayoutProps) {
  const { adminUser, logout } = useDirectAdminAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // List of navigation items for the admin
  const navItems = [
    { path: "/admin-dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: "/admin-users", label: "User Management", icon: <Users className="w-5 h-5" /> },
    { path: "/admin-projects", label: "Projects", icon: <Building2 className="w-5 h-5" /> },
    { path: "/admin-service-requests", label: "Service Requests", icon: <ClipboardList className="w-5 h-5" /> },
    { path: "/admin-bidding", label: "Bidding System", icon: <Shield className="w-5 h-5" /> },
    { path: "/admin-orders", label: "Orders", icon: <MessageSquare className="w-5 h-5" /> },
    { path: "/admin-management", label: "Admin Management", icon: <Shield className="w-5 h-5" /> },
    { path: "/admin-settings", label: "Settings", icon: <Settings className="w-5 h-5" /> }
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <div className="hidden md:block w-64 bg-primary text-white h-full">
        <div className="p-4 border-b border-primary-foreground/20">
          <h2 className="text-xl font-bold">Admin Portal</h2>
          <p className="text-sm opacity-70">Artisans Construction</p>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link 
                  href={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    location === item.path 
                      ? "bg-white text-primary font-medium" 
                      : "text-gray-100 hover:bg-primary-foreground/10"
                  }`}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 pt-4 border-t border-primary-foreground/20">
            <button 
              onClick={logout}
              className="flex items-center w-full px-3 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">SIGN OUT</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 flex flex-col w-3/4 max-w-xs bg-primary text-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-primary-foreground/20">
              <h2 className="text-xl font-bold">Admin Portal</h2>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full text-white hover:bg-primary-foreground/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link 
                      href={item.path}
                      className={`flex items-center px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                        location === item.path 
                          ? "bg-white text-primary font-medium" 
                          : "text-gray-100 hover:bg-primary-foreground/10"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.icon}
                      <span className="ml-3">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-4 border-t border-primary-foreground/20">
                <button 
                  onClick={logout}
                  className="flex items-center w-full px-3 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="ml-3">SIGN OUT</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm p-4">
          <div className="flex justify-end items-center">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}