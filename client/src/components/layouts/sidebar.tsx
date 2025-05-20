import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Building2, 
  ShoppingCart, 
  Truck, 
  MessageSquare, 
  MapPin, 
  LogOut,
  User,
  ClipboardList,
  Wrench,
  BarChart,
  UsersRound,
  Shield,
  UserCog,
  HardHat
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };
  
  // Handle swipe to close on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touchStartX = e.touches[0].clientX;
    const minSwipeDistance = 50;
    
    const handleTouchMove = (e: TouchEvent) => {
      const touchMoveX = e.touches[0].clientX;
      const distance = touchStartX - touchMoveX;
      
      if (distance > minSwipeDistance && onClose) {
        // Swiped left, close the menu
        onClose();
        document.removeEventListener('touchmove', handleTouchMove);
      }
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', () => {
      document.removeEventListener('touchmove', handleTouchMove);
    }, { once: true });
  };

  // Define role-specific navigation items
  const clientNavItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: "/projects", label: "My Projects", icon: <Building2 className="w-5 h-5" /> },
    { path: "/service-requests", label: "Service Requests", icon: <ClipboardList className="w-5 h-5" /> },
    // Services menu item removed as requested
    { path: "/materials", label: "Order Materials", icon: <ShoppingCart className="w-5 h-5" /> },
    { path: "/orders", label: "Track Orders", icon: <Truck className="w-5 h-5" /> },
    { path: "/messages", label: "Messages", icon: <MessageSquare className="w-5 h-5" /> },
    { path: "/locations", label: "Site Locations", icon: <MapPin className="w-5 h-5" /> },
    { path: "/analytics", label: "Analytics", icon: <BarChart className="w-5 h-5" /> },
    { path: "/profile-settings", label: "Profile Settings", icon: <User className="w-5 h-5" /> },
  ];

  const adminNavItems = [
    { path: "/admin-dashboard", label: "Admin Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: "/admin-server", label: "Alternative Dashboard", icon: <Shield className="w-5 h-5" /> },
    { path: "/service-requests", label: "Service Requests", icon: <ClipboardList className="w-5 h-5" /> },
    { path: "/projects", label: "All Projects", icon: <Building2 className="w-5 h-5" /> },
    // Services menu item removed as requested
    { path: "/messages", label: "Messages", icon: <MessageSquare className="w-5 h-5" /> },
    { path: "/materials", label: "Materials", icon: <ShoppingCart className="w-5 h-5" /> },
    { path: "/orders", label: "Orders", icon: <Truck className="w-5 h-5" /> },
    { path: "/locations", label: "Locations", icon: <MapPin className="w-5 h-5" /> },
    { path: "/skills", label: "Manage Skills", icon: <UserCog className="w-5 h-5" /> },
    { path: "/analytics", label: "Analytics", icon: <BarChart className="w-5 h-5" /> },
    { path: "/admin-management", label: "Admin Management", icon: <Shield className="w-5 h-5" /> },
    { path: "/user-management", label: "User Management", icon: <UsersRound className="w-5 h-5" /> },
    { path: "/profile-settings", label: "Profile Settings", icon: <User className="w-5 h-5" /> },
  ];

  const providerNavItems = [
    { path: "/provider-dashboard", label: "Provider Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: "/service-requests", label: "Assigned Requests", icon: <ClipboardList className="w-5 h-5" /> },
    { path: "/messages", label: "Admin Messages", icon: <MessageSquare className="w-5 h-5" /> },
    { path: "/locations", label: "Project Locations", icon: <MapPin className="w-5 h-5" /> },
    { path: "/skills", label: "My Skills", icon: <UserCog className="w-5 h-5" /> },
    { path: "/analytics", label: "Project Analytics", icon: <BarChart className="w-5 h-5" /> },
    { path: "/profile-settings", label: "Profile Settings", icon: <User className="w-5 h-5" /> },
  ];

  // Select navigation items based on user role
  const navItems = user?.role === 'admin' 
    ? adminNavItems 
    : user?.role === 'service_provider' 
      ? providerNavItems 
      : clientNavItems;

  return (
    <aside 
      className={`bg-primary text-white w-full sm:w-64 flex-shrink-0 shadow-lg flex flex-col ${isMobile ? "" : "min-h-screen"}`}
      onTouchStart={handleTouchStart}
    >
      {!isMobile && (
        <div className="p-4 border-b border-primary-light">
          <div className="flex items-center">
            <HardHat className="text-secondary text-2xl mr-2" />
            <h1 className="text-xl font-bold">ARTISANS</h1>
          </div>
          <p className="text-xs text-gray-300 mt-1">Construction Management Platform</p>
        </div>
      )}
      
      {/* Navigation */}
      <div className={`py-2 flex-1 overflow-y-auto ${isMobile ? "pt-0" : "pt-2"}`}>
        <p className="px-4 py-2 text-xs text-gray-400 uppercase font-medium">
          {user?.role === 'client' ? 'Client Dashboard' : 
           user?.role === 'service_provider' ? 'Service Provider' : 'Admin Dashboard'}
        </p>
        <nav className={`${isMobile ? "space-y-1 px-2" : "space-y-0.5"}`}>
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                onClick={handleLinkClick}
                className={`flex items-center px-4 ${isMobile ? "py-4" : "py-3"} cursor-pointer rounded-md ${
                  location === item.path
                    ? "text-white bg-primary-light font-medium"
                    : "text-gray-300 hover:bg-primary-light hover:bg-opacity-70"
                }`}
              >
                <span className={`${isMobile ? "w-7 mr-4" : "w-6 mr-3"} flex items-center justify-center`}>
                  {item.icon}
                </span>
                <span className={`${isMobile ? "text-base" : "text-sm"}`}>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>
      
      {/* User Profile */}
      <div className="px-4 py-4 border-t border-primary-light mt-auto">
        <div className="flex items-center">
          <Avatar className={`${isMobile ? "w-10 h-10" : "w-8 h-8"} mr-3`}>
            <AvatarFallback className="bg-secondary text-white">
              {user?.fullName?.charAt(0) || <User size={isMobile ? 20 : 16} />}
            </AvatarFallback>
          </Avatar>
          <div className="truncate">
            <p className={`${isMobile ? "text-base" : "text-sm"} font-medium truncate`}>
              {user?.fullName || user?.username}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className={`mt-4 w-full ${isMobile ? "py-3.5 text-base" : "py-2.5 text-sm"} px-3 bg-red-600 rounded-md text-white flex items-center justify-center hover:bg-red-700 transition-colors duration-200`}
        >
          <LogOut className={`${isMobile ? "w-5 h-5" : "w-4 h-4"} mr-2`} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
