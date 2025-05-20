import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, Users, Building, ClipboardList, 
  UserPlus, FileEdit, Hammer, PackageCheck,
  Settings, Globe, ListChecks, HelpCircle,
  Bell, Menu, X, Home, Calendar, ShoppingCart,
  MessageSquare, Map, BarChart, Briefcase, FileText,
  Package, User, Truck, Mail
} from "lucide-react";
import { Link, useLocation } from "wouter";

// Types
interface ServiceRequest {
  id: number;
  clientId: number;
  serviceType: string;
  requestType: string;
  description: string;
  location: string;
  budget: number | null;
  status: string;
  createdAt: string;
  adminNotes?: string;
  assignedServiceProviderId?: number;
}

interface Project {
  id: number;
  name: string;
  clientId: number;
  description: string;
  status: string;
  createdAt: string;
  progress: number;
  location: string;
}

interface User {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  role: string;
}

interface RecentActivity {
  id: number;
  type: string;
  title: string;
  time: string;
  timeAgo: string;
}

// A very simple admin dashboard that doesn't rely on complex hooks or components
export default function AdminBasicDashboard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [stats, setStats] = useState({
    clients: 0,
    providers: 0,
    projects: 0,
    requests: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [location] = useLocation();

  // Load admin user and fetch data more robustly 
  useEffect(() => {
    // First check if we're already logged in by checking auth status
    fetch('/api/auth/verify')
      .then(res => res.json())
      .catch(() => ({ authenticated: false }))
      .then(data => {
        if (data.authenticated && data.role === 'admin') {
          // Fetch full user data if we're authenticated
          return fetch('/api/user')
            .then(res => {
              if (!res.ok) throw new Error('Failed to fetch user data');
              return res.json();
            })
            .then(userData => {
              if (userData && userData.role === 'admin') {
                setAdminUser(userData);
                console.log('Admin user fetched from API:', userData.username);
                
                // Store in localStorage as backup
                localStorage.setItem('admin_user', JSON.stringify(userData));
                
                // Fetch additional data
                fetchBasicStats();
                fetchRecentActivities();
                return true;
              }
              return false;
            });
        } else {
          // Fall back to localStorage if API auth check fails
          try {
            const storedUser = localStorage.getItem('admin_user');
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              if (parsedUser && parsedUser.role === 'admin') {
                setAdminUser(parsedUser);
                console.log('Admin user loaded from localStorage:', parsedUser.username);
                
                // Fetch data
                fetchBasicStats();
                fetchRecentActivities();
                return true;
              }
            }
          } catch (err) {
            console.error('Error loading admin user from localStorage:', err);
          }
          return false;
        }
      })
      .catch(err => {
        console.error('Error during admin authentication:', err);
        return false;
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);
  
  // Format relative time (e.g., "2 hours ago")
  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 1) return 'just now';
      if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    } catch (e) {
      return 'unknown time';
    }
  };
  
  // Fetch recent activities
  const fetchRecentActivities = async () => {
    try {
      if (!adminUser || !adminUser.username) return;
      
      // First try to get recent service requests
      const requestsRes = await fetch('/api/direct-admin-service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: adminUser.username })
      });
      
      // Then try to get recent projects
      const projectsRes = await fetch('/api/direct-admin-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: adminUser.username })
      });
      
      // Then try to get users for new registrations
      const usersRes = await fetch('/api/direct-admin-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: adminUser.username })
      });
      
      // Parse the responses
      const [requests, projects, users] = await Promise.all([
        requestsRes.ok ? requestsRes.json() : [],
        projectsRes.ok ? projectsRes.json() : [],
        usersRes.ok ? usersRes.json() : []
      ]);
      
      // Create activity entries from the data
      const activities: RecentActivity[] = [];
      
      // Add recent service requests
      if (Array.isArray(requests)) {
        requests
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .forEach((request: ServiceRequest, index) => {
            activities.push({
              id: index,
              type: 'service_request',
              title: `New ${request.serviceType} service request submitted`,
              time: request.createdAt,
              timeAgo: getRelativeTime(request.createdAt)
            });
          });
      }
      
      // Add recent projects
      if (Array.isArray(projects)) {
        projects
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .forEach((project: Project, index) => {
            activities.push({
              id: activities.length + index,
              type: 'project',
              title: `New project "${project.name}" created`,
              time: project.createdAt,
              timeAgo: getRelativeTime(project.createdAt)
            });
          });
      }
      
      // Add recent user registrations
      if (Array.isArray(users)) {
        users
          .sort((a, b) => b.id - a.id) // Assuming higher ID = newer user
          .slice(0, 3)
          .forEach((user: User, index) => {
            // Use an estimated time if createdAt is not available
            const time = new Date();
            time.setDate(time.getDate() - (index + 1)); // Just for presentation
            
            activities.push({
              id: activities.length + index,
              type: 'user_registration',
              title: `New client ${user.fullName || user.username} registered`,
              time: time.toISOString(),
              timeAgo: getRelativeTime(time.toISOString())
            });
          });
      }
      
      // Sort all activities by time (newest first) and take top 5
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivities(activities.slice(0, 5));
      
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  // Fetch real stats from direct admin endpoints
  const fetchBasicStats = async () => {
    try {
      if (!adminUser || !adminUser.username) return;
      
      // Use the direct admin endpoints to get real data
      const adminUsername = adminUser.username;
      
      // Parallel requests with Promise.all
      const [clientsRes, providersRes, projectsRes, requestsRes] = await Promise.all([
        fetch('/api/direct-admin-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUsername })
        }),
        fetch('/api/direct-admin-service-providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUsername })
        }),
        fetch('/api/direct-admin-projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUsername })
        }),
        fetch('/api/direct-admin-service-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUsername })
        })
      ]);
      
      // Parse all responses
      const [clients, providers, projects, requests] = await Promise.all([
        clientsRes.ok ? clientsRes.json() : [],
        providersRes.ok ? providersRes.json() : [],
        projectsRes.ok ? projectsRes.json() : [],
        requestsRes.ok ? requestsRes.json() : []
      ]);
      
      // Update stats with real counts
      setStats({
        clients: Array.isArray(clients) ? clients.length : 0,
        providers: Array.isArray(providers) ? providers.length : 0,
        projects: Array.isArray(projects) ? projects.length : 0,
        requests: Array.isArray(requests) ? requests.length : 0
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Use safe default values on error
      setStats({
        clients: 0,
        providers: 0,
        projects: 0,
        requests: 0
      });
    }
  };

  // Simple logout function
  const handleLogout = () => {
    localStorage.removeItem('admin_user');
    setAdminUser(null);
    
    // Also try the regular logout endpoint
    fetch('/api/logout', { method: 'POST' })
      .catch(err => console.error('Error during logout:', err));
      
    toast({
      title: 'Logged Out',
      description: 'You have been logged out successfully.',
    });
    
    // Redirect to login
    window.location.href = '/admin-login';
  };

  // Show login form if not authenticated
  if (!adminUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const username = formData.get('username') as string;
                const password = formData.get('password') as string;
                
                setIsLoading(true);
                
                // Try the regular login endpoint first
                fetch('/api/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username, password })
                })
                .then(res => {
                  if (!res.ok) throw new Error('Login failed');
                  return res.json();
                })
                .then(user => {
                  if (user.role !== 'admin') {
                    throw new Error('Admin access required');
                  }
                  
                  // Store admin user
                  localStorage.setItem('admin_user', JSON.stringify(user));
                  setAdminUser(user);
                  
                  toast({
                    title: 'Login Successful',
                    description: 'Welcome to the admin dashboard.',
                  });
                  
                  // Immediately fetch data to populate the dashboard
                  fetchBasicStats();
                  fetchRecentActivities();
                })
                .catch(err => {
                  console.error('Login error:', err);
                  
                  // Fallback attempt: Try direct admin API endpoint if regular login fails
                  return fetch('/api/direct-admin-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                  })
                  .then(res => {
                    if (!res.ok) throw err; // Throw original error if this also fails
                    return res.json();
                  })
                  .then(user => {
                    if (user.role !== 'admin') {
                      throw new Error('Admin access required');
                    }
                    
                    // Store admin user
                    localStorage.setItem('admin_user', JSON.stringify(user));
                    setAdminUser(user);
                    
                    toast({
                      title: 'Login Successful (Direct)',
                      description: 'Using backup authentication system.',
                    });
                    
                    // Immediately fetch data
                    fetchBasicStats();
                    fetchRecentActivities();
                  })
                  .catch(backupErr => {
                    // Both login attempts failed
                    console.error('Backup login also failed:', backupErr);
                    toast({
                      title: 'Login Failed',
                      description: err.message || 'Please check your credentials and try again.',
                      variant: 'destructive'
                    });
                  });
                })
                .finally(() => {
                  setIsLoading(false);
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // UI state already defined at the top of the component

  // Admin menu items for sidebar
  const menuItems = [
    { name: 'Dashboard', icon: <Home className="h-5 w-5" />, href: '/admin-basic' },
    { name: 'Projects', icon: <Building className="h-5 w-5" />, href: '/admin/projects' },
    { name: 'Service Requests', icon: <FileText className="h-5 w-5" />, href: '/service-requests' },
    { name: 'Clients', icon: <Users className="h-5 w-5" />, href: '/admin/users' },
    { name: 'Service Providers', icon: <Briefcase className="h-5 w-5" />, href: '/admin/service-providers' },
    { name: 'Suppliers', icon: <Truck className="h-5 w-5" />, href: '/admin/suppliers' },
    { name: 'Materials', icon: <Package className="h-5 w-5" />, href: '/materials' },
    { name: 'Orders', icon: <ShoppingCart className="h-5 w-5" />, href: '/orders' },
    { name: 'Messages', icon: <MessageSquare className="h-5 w-5" />, href: '/messages' },
    { name: 'Locations', icon: <Map className="h-5 w-5" />, href: '/locations' },
    { name: 'Analytics', icon: <BarChart className="h-5 w-5" />, href: '/analytics' },
    { name: 'Settings', icon: <Settings className="h-5 w-5" />, href: '/admin/settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-4 border-b">
            <Link href="/admin-basic" className="flex items-center space-x-2">
                <Building className="h-7 w-7 text-primary" />
                <span className="text-xl font-bold">Artisans Admin</span>
            </Link>
            <button 
              className="p-1 rounded-md lg:hidden hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Sidebar menu */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <li key={item.name}>
                    <Link href={item.href}
                      className={`flex items-center px-4 py-3 space-x-3 rounded-md cursor-pointer ${
                        isActive 
                          ? 'bg-primary text-white' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}>
                        {item.icon}
                        <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          {/* Sidebar footer */}
          <div className="p-4 border-t">
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-sm text-red-600 rounded-md border border-red-200 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top navigation */}
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            {/* Mobile menu button */}
            <button 
              className="p-1 rounded-md lg:hidden hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <h1 className="text-xl font-semibold text-gray-800 lg:hidden">
              Admin Dashboard
            </h1>
            
            {/* Right side buttons */}
            <div className="flex items-center space-x-3">
              <button 
                className="relative p-2 rounded-full hover:bg-gray-100"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden md:inline-block font-medium">
                  {adminUser.fullName || adminUser.username}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Notification panel */}
        {notificationsOpen && (
          <div className="absolute right-4 top-16 w-80 bg-white rounded-md shadow-lg z-20 p-4">
            <h3 className="font-semibold mb-2">Notifications</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {recentActivities && recentActivities.length > 0 ? recentActivities.map((activity) => (
                <div key={activity.id} className="p-3 border rounded-md hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      activity.type === 'service_request' 
                        ? 'bg-blue-100 text-blue-800' 
                        : activity.type === 'project' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                    }`}>
                      {activity.type === 'service_request' 
                        ? 'Request' 
                        : activity.type === 'project' 
                          ? 'Project'
                          : 'User'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{activity.timeAgo}</p>
                </div>
              )) : (
                <p className="text-center text-gray-500 py-4">No notifications</p>
              )}
            </div>
          </div>
        )}
        
        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-gray-600">Overview and quick access to admin functions</p>
            </div>
            
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600 mr-3">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Clients</p>
                      <p className="text-2xl font-bold">{stats.clients}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-green-100 text-green-600 mr-3">
                      <UserPlus className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Service Providers</p>
                      <p className="text-2xl font-bold">{stats.providers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-purple-100 text-purple-600 mr-3">
                      <Building className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Projects</p>
                      <p className="text-2xl font-bold">{stats.projects}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-amber-100 text-amber-600 mr-3">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Service Requests</p>
                      <p className="text-2xl font-bold">{stats.requests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.length > 0 ? (
                      recentActivities.map((activity) => (
                        <div key={activity.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <p className="font-medium">{activity.title}</p>
                            <span className={`text-xs px-2 py-1 rounded ${
                              activity.type === 'service_request' 
                                ? 'bg-blue-100 text-blue-800' 
                                : activity.type === 'project' 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-purple-100 text-purple-800'
                            }`}>
                              {activity.type === 'service_request' 
                                ? 'Request' 
                                : activity.type === 'project' 
                                  ? 'Project'
                                  : 'User'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{activity.timeAgo}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="mb-2 text-2xl">📭</p>
                        <p>No recent activities found</p>
                        <p className="text-xs mt-1">Check back later for updates</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="w-full h-auto py-6 flex flex-col items-center" 
                      asChild
                    >
                      <Link href="/admin/users" className="w-full">
                        <Users className="h-6 w-6 mb-2" />
                        <span>Manage Users</span>
                      </Link>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full h-auto py-6 flex flex-col items-center" 
                      asChild
                    >
                      <Link href="/service-requests" className="w-full">
                        <ClipboardList className="h-6 w-6 mb-2" />
                        <span>Service Requests</span>
                      </Link>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full h-auto py-6 flex flex-col items-center" 
                      asChild
                    >
                      <Link href="/admin/projects" className="w-full">
                        <Building className="h-6 w-6 mb-2" />
                        <span>View Projects</span>
                      </Link>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full h-auto py-6 flex flex-col items-center" 
                      asChild
                    >
                      <Link href="/admin-dashboard" className="w-full">
                        <Settings className="h-6 w-6 mb-2" />
                        <span>Full Dashboard</span>
                      </Link>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full h-auto py-6 flex flex-col items-center" 
                      asChild
                    >
                      <Link href="/materials" className="w-full">
                        <PackageCheck className="h-6 w-6 mb-2" />
                        <span>Materials</span>
                      </Link>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full h-auto py-6 flex flex-col items-center" 
                      asChild
                    >
                      <Link href="/analytics" className="w-full">
                        <BarChart className="h-6 w-6 mb-2" />
                        <span>Analytics</span>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Extra Content Section - Recent Service Requests */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Recent Service Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 text-sm font-medium text-gray-500">Type</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-500">Location</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-500">Status</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-500">Client</th>
                        <th className="px-4 py-3 text-sm font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {/* Show actual requests if available */}
                      {recentActivities
                        .filter(activity => activity.type === 'service_request')
                        .slice(0, 3)
                        .map((activity, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{activity.title.split(' ')[1] || 'Service'}</td>
                            <td className="px-4 py-3 text-sm">Ghana</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">Client</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{activity.timeAgo}</td>
                          </tr>
                        ))}
                      
                      {/* Show placeholder if no service requests */}
                      {recentActivities.filter(activity => activity.type === 'service_request').length === 0 && (
                        <tr className="hover:bg-gray-50">
                          <td colSpan={5} className="px-4 py-3 text-sm text-center text-gray-500">
                            No recent service requests found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}