import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  Building2, 
  ShoppingCart, 
  Truck, 
  MessageSquare, 
  Plus,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectCard } from "@/components/projects/project-card";
import { OrderTable } from "@/components/orders/order-table";
import { LocationMap } from "@/components/map/location-map";
import { MessageList } from "@/components/messaging/message-list";
import { ChatPanel } from "@/components/chat/chat-panel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Project, User, Order, Message } from "@shared/schema";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  
  // Fetch projects
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects 
  } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 60000, // 1 minute
  });
  
  // Fetch orders
  const { 
    data: orders = [], 
    isLoading: isLoadingOrders 
  } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    staleTime: 60000,
  });
  
  // Fetch messages
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages 
  } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    staleTime: 30000, // 30 seconds
  });
  
  // Fetch companies (for project company info)
  const { 
    data: companies = [], 
    isLoading: isLoadingCompanies 
  } = useQuery<User[]>({
    queryKey: ["/api/users/companies"],
    staleTime: 300000, // 5 minutes
  });
  
  // Transform companies array to record for easy lookup
  const companiesRecord = companies?.length ? companies.reduce(
    (acc, company) => ({ ...acc, [company.id]: company }), 
    {} as Record<number, User>
  ) : {} as Record<number, User>;
  
  // Get all users involved in messages
  const messageUsers = messages?.length ? messages.reduce(
    (acc, message) => {
      if (!acc[message.senderId]) {
        // If the sender is the current user, use full user data
        if (user?.id === message.senderId) {
          acc[message.senderId] = user as User;
        } else {
          // Create a placeholder user object with required fields from User type
          acc[message.senderId] = {
            id: message.senderId,
            username: `user_${message.senderId}`,
            password: '',
            email: '',
            fullName: "Unknown User", // Using default since senderName might not exist
            role: "unknown",
            serviceType: null,
            businessName: null,
            phone: null,
            address: null,
            bio: null,
            verificationStatus: null,
            points: 0,
            createdAt: new Date()
          };
        }
      }
      
      if (!acc[message.receiverId]) {
        // If the receiver is the current user, use full user data
        if (user?.id === message.receiverId) {
          acc[message.receiverId] = user as User;
        } else {
          // Create a placeholder user object with required fields from User type
          acc[message.receiverId] = {
            id: message.receiverId,
            username: `user_${message.receiverId}`,
            password: '',
            email: '',
            fullName: "Unknown User", // Using default since receiverName might not exist
            role: "unknown",
            serviceType: null,
            businessName: null,
            phone: null,
            address: null,
            bio: null,
            verificationStatus: null,
            points: 0,
            createdAt: new Date()
          };
        }
      }
      
      return acc;
    },
    {} as Record<number, User>
  ) : {} as Record<number, User>;
  
  // Get stats for dashboard
  const stats = [
    { 
      title: "Active Projects", 
      value: projects?.filter(p => p.status === "in_progress")?.length || 0,
      icon: <Building2 className="text-accent" />,
      bgColor: "bg-blue-100"
    },
    { 
      title: "Pending Orders", 
      value: orders?.filter(o => o.status === "processing")?.length || 0,
      icon: <ShoppingCart className="text-secondary" />,
      bgColor: "bg-orange-100"
    },
    { 
      title: "Deliveries", 
      value: orders?.filter(o => o.status === "in_transit")?.length || 0,
      icon: <Truck className="text-green-500" />,
      bgColor: "bg-green-100"
    },
    { 
      title: "New Messages", 
      value: messages?.filter(m => !m.read && m.receiverId === user?.id)?.length || 0,
      icon: <MessageSquare className="text-purple-500" />,
      bgColor: "bg-purple-100"
    }
  ];
  
  // Handle sending message
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !user) return;
    
    try {
      // In a real app, you would select a specific receiver
      // For now, we'll just send to an admin or the first company
      const receiverId = companies?.length > 0 ? companies[0].id : 1;
      
      const response = await apiRequest("POST", "/api/messages", {
        receiverId,
        content: content.trim(),
        projectId: projects?.length > 0 ? projects[0].id : null
      });
      
      const newMessage = await response.json();
      
      // Update messages cache
      queryClient.setQueryData(
        ["/api/messages"], 
        (oldData: Message[] = []) => [newMessage, ...oldData]
      );
      
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };
  
  // Redirect to role-specific dashboard
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setLocation('/admin-dashboard');
      } else if (user.role === 'service_provider') {
        setLocation('/provider-dashboard');
      }
    }
  }, [user, setLocation]);

  return (
    <DashboardLayout title={`${user?.role === 'client' ? 'Client' : user?.role === 'service_provider' ? 'Service Provider' : 'Admin'} Dashboard`}>
      {/* Welcome Section */}
      <section className="mb-8">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            <div className="md:flex justify-between items-center">
              <div className="mb-4 md:mb-0">
                <h2 className="text-2xl font-bold text-gray-800">Welcome back, {user?.fullName?.split(' ')[0]}</h2>
                <p className="text-gray-600 mt-1">
                  Here's an overview of your {user?.role === 'client' ? 'construction projects' : 'activities'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/projects">
                  <Button className="bg-primary hover:bg-primary-dark text-white">
                    <Plus className="mr-2 h-4 w-4" /> <span className="sm:inline">New Project</span>
                  </Button>
                </Link>
                <Link href="/materials">
                  <Button className="bg-secondary hover:bg-secondary-light text-white">
                    <ShoppingCart className="mr-2 h-4 w-4" /> <span className="sm:inline">Order Materials</span>
                  </Button>
                </Link>
                <Link href="/service-requests">
                  <Button variant="outline">
                    <ClipboardList className="mr-2 h-4 w-4" /> <span className="sm:inline">Request Service</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Dashboard Stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-white border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className={`rounded-full ${stat.bgColor} p-3 mr-4`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-xl font-bold text-gray-800">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Current Projects */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Current Projects</h3>
          <Link href="/projects">
            <div className="text-accent hover:text-blue-700 text-sm cursor-pointer">View All Projects</div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isLoadingProjects ? (
            <p>Loading projects...</p>
          ) : projects?.length > 0 ? (
            projects.slice(0, 2).map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                company={project.companyId ? companiesRecord[project.companyId] : undefined}
              />
            ))
          ) : (
            <p className="text-gray-500 col-span-2 text-center py-8">
              No projects found. Start by creating a new project!
            </p>
          )}
        </div>
      </section>

      {/* Recent Orders and Site Location */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <section className="lg:col-span-2">
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 sm:mb-0">Recent Material Orders</h3>
                <Link href="/orders">
                  <div className="text-accent hover:text-blue-700 text-sm cursor-pointer">View All Orders</div>
                </Link>
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                {isLoadingOrders ? (
                  <p className="p-4">Loading orders...</p>
                ) : (
                  <OrderTable orders={orders?.slice(0, 3) || []} />
                )}
              </div>

              <div className="mt-6">
                <Link href="/orders">
                  <Button 
                    variant="outline" 
                    className="w-full py-2 bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100 text-sm"
                  >
                    Load More Orders
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Site Locations */}
        <section className="lg:col-span-1 min-h-[300px]">
          <LocationMap 
            projects={projects?.slice(0, 2) || []}
            onAddLocation={() => {
              // Navigate to locations page
              window.location.href = "/locations";
            }}
          />
        </section>
      </div>

      {/* Messages & Communication */}
      <div className="mt-6">
        <MessageList 
          messages={messages?.slice(0, 5) || []}
          users={messageUsers || []}
          currentUser={user || {id: 0, username: '', role: ''} as any}
          onSendMessage={handleSendMessage}
          isLoading={isLoadingMessages}
        />
      </div>
      
      {/* Real-time Chat Panel */}
      {user && companies?.length > 0 && (
        <ChatPanel userId={companies[0].id} position="right" />
      )}
    </DashboardLayout>
  );
}
