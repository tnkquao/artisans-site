import React from 'react';
import { useDirectAdminAuth } from '@/hooks/use-direct-admin-auth';
import DirectAdminLogin from './direct-admin-login';
import DirectAdminNotificationPanel from './direct-admin-notification-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, CheckCircle, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const DirectAdminStatusPanel: React.FC = () => {
  const { adminUser, isLoading, logout } = useDirectAdminAuth();
  const isAuthenticated = !!adminUser;
  const adminUsername = adminUser?.username;
  
  async function handlePublishAll() {
    try {
      const response = await fetch('/api/direct-publish-all-requests');
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Published Successfully",
          description: `Published ${result.count} pending service requests for bidding`,
          variant: "default",
        });
      } else {
        toast({
          title: "Action Failed",
          description: result.message || "Failed to publish service requests",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error publishing requests:', error);
      toast({
        title: "Action Failed",
        description: "An error occurred while publishing service requests",
        variant: "destructive",
      });
    }
  }
  
  if (isLoading) {
    return null;
  }
  
  if (!isAuthenticated || !adminUsername) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Admin Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DirectAdminLogin />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Admin Access
            <Badge variant="outline" className="ml-2">Active</Badge>
          </div>
          <div className="flex items-center gap-2">
            <DirectAdminNotificationPanel adminUsername={adminUsername} />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className="text-xs"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => window.open('/admin-emergency.html', '_blank')}>
            <ShieldAlert className="h-4 w-4 mr-1" />
            Emergency Dashboard
          </Button>
          
          <Button size="sm" onClick={handlePublishAll}>
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Publish All Requests
          </Button>
          
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DirectAdminStatusPanel;