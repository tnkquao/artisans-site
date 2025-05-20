import DashboardLayout from "@/components/layouts/dashboard-layout";
import { RealTimeChat } from "@/components/chat/real-time-chat";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, Users, User } from "lucide-react";

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  return (
    <DashboardLayout title="Messages">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <MessageSquare className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-2xl font-bold">Communications</h1>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full sm:w-auto mb-6">
          <TabsTrigger value="all" className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-2" />
            All Messages
          </TabsTrigger>
          <TabsTrigger value="direct" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Direct Messages
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Project Conversations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <RealTimeChat mode="full" maxHeight="70vh" />
        </TabsContent>

        <TabsContent value="direct" className="space-y-4">
          <RealTimeChat mode="full" maxHeight="70vh" />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <RealTimeChat mode="full" maxHeight="70vh" />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}