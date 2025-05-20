import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Loader2, 
  Save, 
  Settings, 
  Database, 
  Globe, 
  Bell,
  Lock,
  FileJson,
  Palette
} from "lucide-react";
import AdminDashboardLayout from "@/components/admin/admin-dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useDirectAdminAuth } from "@/hooks/use-direct-admin-auth";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const { adminUser, isLoading: isLoadingAuth } = useDirectAdminAuth();
  const { toast } = useToast();

  // Placeholder query for system settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/direct-admin/settings"],
    queryFn: async () => {
      if (!adminUser) return null;
      
      // This is a placeholder. In the future, we'll implement the actual API endpoint.
      return {
        general: {
          siteName: "Artisans Ghana",
          siteDescription: "A trusted platform connecting Ghanaians abroad with local contractors",
          contactEmail: "admin@artisansghana.com",
          supportPhone: "+233 50 123 4567",
          maintenanceMode: false
        },
        appearance: {
          primaryColor: "#1E40AF",
          logo: "/assets/logo.png",
          theme: "light",
          borderRadius: 8,
          fontFamily: "Inter"
        },
        notifications: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          digestEmails: true,
          notificationSound: true
        },
        security: {
          twoFactorAuth: false,
          passwordPolicy: "medium",
          sessionTimeout: 30,
          ipRestriction: false,
          allowedIPs: ""
        },
        database: {
          backupFrequency: "daily",
          lastBackup: "2025-04-26T08:30:00Z",
          retentionPeriod: 30
        }
      };
    },
    enabled: !!adminUser
  });

  const isLoading = isLoadingAuth || isLoadingSettings;

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your system settings have been updated successfully.",
    });
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout title="Admin Settings">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Loading settings...</span>
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout title="System Settings">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">System Configuration</h1>
        <p className="text-muted-foreground">
          Manage global settings for the Artisans Ghana platform
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic information about your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input 
                    id="siteName" 
                    defaultValue={settings?.general.siteName}
                    placeholder="Site Name" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input 
                    id="contactEmail" 
                    defaultValue={settings?.general.contactEmail}
                    placeholder="contact@example.com" 
                    type="email"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea 
                  id="siteDescription" 
                  defaultValue={settings?.general.siteDescription}
                  placeholder="Brief description of your site"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supportPhone">Support Phone</Label>
                  <Input 
                    id="supportPhone" 
                    defaultValue={settings?.general.supportPhone}
                    placeholder="+233 XX XXX XXXX" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="Africa/Accra">
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Accra">Africa/Accra (GMT+0)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT+0/+1)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (GMT-5/-4)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GMT+4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="maintenanceMode" 
                  checked={settings?.general.maintenanceMode}
                />
                <Label htmlFor="maintenanceMode" className="cursor-pointer">
                  Maintenance Mode
                </Label>
                <span className="text-xs text-muted-foreground ml-auto">
                  Puts the site in maintenance mode, showing a maintenance page to visitors
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how your application looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="primaryColor" 
                      defaultValue={settings?.appearance.primaryColor}
                      className="flex-1"
                    />
                    <input 
                      type="color" 
                      value={settings?.appearance.primaryColor}
                      className="h-10 w-10 border rounded cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select defaultValue={settings?.appearance.theme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="logo">Logo Image</Label>
                <div className="flex items-center gap-4">
                  <img 
                    src={settings?.appearance.logo} 
                    alt="Logo" 
                    className="h-12 w-auto border rounded p-1" 
                  />
                  <Input type="file" id="logo" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="borderRadius">Border Radius</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="borderRadius" 
                      type="number" 
                      min="0" 
                      max="24" 
                      defaultValue={settings?.appearance.borderRadius.toString()}
                    />
                    <span className="text-sm text-muted-foreground">px</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Select defaultValue={settings?.appearance.fontFamily}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how notifications are sent and displayed to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications to users
                    </p>
                  </div>
                  <Switch 
                    checked={settings?.notifications.emailNotifications}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send text message notifications to users
                    </p>
                  </div>
                  <Switch 
                    checked={settings?.notifications.smsNotifications}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send browser push notifications to users
                    </p>
                  </div>
                  <Switch 
                    checked={settings?.notifications.pushNotifications}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Digest Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Send periodic digest emails with activity summaries
                    </p>
                  </div>
                  <Switch 
                    checked={settings?.notifications.digestEmails}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notification Sound</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound when new notifications arrive
                    </p>
                  </div>
                  <Switch 
                    checked={settings?.notifications.notificationSound}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security settings for your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all admin users
                  </p>
                </div>
                <Switch 
                  checked={settings?.security.twoFactorAuth}
                />
              </div>
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="passwordPolicy">Password Policy</Label>
                <Select defaultValue={settings?.security.passwordPolicy}>
                  <SelectTrigger id="passwordPolicy">
                    <SelectValue placeholder="Select password policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Minimum 6 characters</SelectItem>
                    <SelectItem value="medium">Medium - Minimum 8 characters with numbers</SelectItem>
                    <SelectItem value="high">High - Minimum 10 characters with numbers and symbols</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input 
                  id="sessionTimeout" 
                  type="number" 
                  min="5" 
                  max="1440"
                  defaultValue={settings?.security.sessionTimeout.toString()}
                />
                <p className="text-xs text-muted-foreground">
                  How long before inactive sessions are logged out automatically
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>IP Restriction</Label>
                  <p className="text-sm text-muted-foreground">
                    Restrict admin access to specific IP addresses
                  </p>
                </div>
                <Switch 
                  checked={settings?.security.ipRestriction}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="allowedIPs">Allowed IP Addresses</Label>
                <Textarea 
                  id="allowedIPs" 
                  placeholder="Enter IP addresses, one per line"
                  defaultValue={settings?.security.allowedIPs}
                  disabled={!settings?.security.ipRestriction}
                />
                <p className="text-xs text-muted-foreground">
                  Enter one IP address per line, e.g. 192.168.1.1
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Database Settings */}
        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Management</CardTitle>
              <CardDescription>
                Configure database backups and maintenance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backupFrequency">Backup Frequency</Label>
                <Select defaultValue={settings?.database.backupFrequency}>
                  <SelectTrigger id="backupFrequency">
                    <SelectValue placeholder="Select backup frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Last Backup</Label>
                <div className="p-2 bg-muted rounded text-sm">
                  {new Date(settings?.database.lastBackup).toLocaleString()}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="retentionPeriod">Retention Period (days)</Label>
                <Input 
                  id="retentionPeriod" 
                  type="number" 
                  min="1" 
                  max="365"
                  defaultValue={settings?.database.retentionPeriod.toString()}
                />
                <p className="text-xs text-muted-foreground">
                  How long to keep database backups before automatic deletion
                </p>
              </div>
              
              <div className="flex flex-col gap-4 pt-4">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Database className="mr-2 h-4 w-4" />
                  Backup Now
                </Button>
                
                <Button variant="outline" className="w-full sm:w-auto">
                  <FileJson className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
                
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Globe className="mr-2 h-4 w-4" />
                  Clear Cache
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminDashboardLayout>
  );
}