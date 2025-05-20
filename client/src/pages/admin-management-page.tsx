import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Loader2, 
  Search, 
  Plus, 
  Shield, 
  Mail, 
  User,
  MoreHorizontal,
  CheckCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import AdminDashboardLayout from "@/components/admin/admin-dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDirectAdminAuth } from "@/hooks/use-direct-admin-auth";

export default function AdminManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { adminUser, isLoading: isLoadingAuth } = useDirectAdminAuth();

  // Placeholder query for admin users
  const { data: adminUsers, isLoading: isLoadingAdmins } = useQuery({
    queryKey: ["/api/direct-admin/admins"],
    queryFn: async () => {
      if (!adminUser) return [];
      
      // This is a placeholder. In the future, we'll implement the actual API endpoint.
      return [
        {
          id: 1,
          username: "admin",
          email: "admin@artisansghana.com",
          fullName: "Main Administrator",
          role: "super_admin",
          lastLoginAt: new Date(2025, 3, 26, 9, 15),
          status: "active",
          permissions: ["all"]
        },
        {
          id: 2,
          username: "sarah_admin",
          email: "sarah@artisansghana.com",
          fullName: "Sarah Amoah",
          role: "admin",
          lastLoginAt: new Date(2025, 3, 25, 14, 30),
          status: "active",
          permissions: ["users", "projects", "orders"]
        },
        {
          id: 3,
          username: "daniel_admin",
          email: "daniel@artisansghana.com",
          fullName: "Daniel Mensah",
          role: "admin",
          lastLoginAt: new Date(2025, 3, 24, 10, 45),
          status: "active",
          permissions: ["service_requests", "bidding", "reports"]
        },
        {
          id: 4,
          username: "grace_admin",
          email: "grace@artisansghana.com",
          fullName: "Grace Akoto",
          role: "admin",
          lastLoginAt: new Date(2025, 3, 20, 16, 15),
          status: "inactive",
          permissions: ["suppliers", "materials"]
        }
      ];
    },
    enabled: !!adminUser
  });

  const isLoading = isLoadingAuth || isLoadingAdmins;

  // Filter admin users based on search term
  const filteredAdmins = adminUsers?.filter(admin => {
    const searchString = searchTerm.toLowerCase();
    return (
      admin.username.toLowerCase().includes(searchString) ||
      admin.email.toLowerCase().includes(searchString) ||
      admin.fullName.toLowerCase().includes(searchString) ||
      admin.role.toLowerCase().includes(searchString)
    );
  });

  // Helper function to render status badge
  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Inactive
        </Badge>
      );
    }
  };

  return (
    <AdminDashboardLayout title="Admin Management">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Admin User Management</h1>
        <p className="text-muted-foreground">
          Manage administrator accounts and permissions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Admins
            </CardTitle>
            <div className="text-3xl font-bold">{adminUsers?.length || 0}</div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total number of administrator accounts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Admins
            </CardTitle>
            <div className="text-3xl font-bold">
              {adminUsers?.filter(admin => admin.status === "active").length || 0}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Admins with active account status
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Super Admins
            </CardTitle>
            <div className="text-3xl font-bold">
              {adminUsers?.filter(admin => admin.role === "super_admin").length || 0}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Administrators with full system access
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search administrators..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Admin
        </Button>
      </div>

      {/* Admin Users Table */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Loading administrator accounts...</span>
        </div>
      ) : !filteredAdmins?.length ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground/60" />
            <h3 className="mt-4 text-lg font-semibold">No Administrators Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm 
                ? "Try adjusting your search" 
                : "No administrator accounts have been created yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`/assets/admin-avatar-${admin.id}.png`} alt={admin.fullName} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {admin.fullName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{admin.fullName}</p>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <User className="mr-1 h-3 w-3" />
                            {admin.username}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Mail className="mr-1 h-3 w-3" />
                            {admin.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={admin.role === "super_admin" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(admin.status)}</TableCell>
                    <TableCell>
                      {format(new Date(admin.lastLoginAt), "PP p")}
                    </TableCell>
                    <TableCell>
                      {admin.permissions[0] === "all" ? (
                        <span className="text-sm">All permissions</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {admin.permissions.slice(0, 2).map((perm, i) => (
                            <Badge key={i} variant="outline" className="text-xs capitalize">
                              {perm.replace("_", " ")}
                            </Badge>
                          ))}
                          {admin.permissions.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{admin.permissions.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit Admin</DropdownMenuItem>
                          <DropdownMenuItem>View Activity</DropdownMenuItem>
                          <DropdownMenuItem>Manage Permissions</DropdownMenuItem>
                          <DropdownMenuItem>Reset Password</DropdownMenuItem>
                          {admin.status === "active" ? (
                            <DropdownMenuItem className="text-amber-600">Deactivate</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-green-600">Activate</DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600">
                            Remove Admin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AdminDashboardLayout>
  );
}