import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { UsersRound, Search, Edit2, Trash2, Eye, UserCog, Building2, Filter, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Password reset schema
const passwordResetSchema = z.object({
  newPassword: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  confirmPassword: z.string()
    .min(1, "Please confirm the password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

export default function UserManagementPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState<boolean>(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState<boolean>(false);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const { toast } = useToast();
  
  // Redirect if not admin
  if (user && user.role !== 'admin') {
    setLocation('/');
    return null;
  }

  // Fetch all users
  const { 
    data: users = [], 
    isLoading: isLoadingUsers
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
    staleTime: 30000,
  });

  // Filter users based on search and role filter
  const filteredUsers = users.filter(userItem => {
    // First apply role filter
    if (filterRole !== "all" && userItem.role !== filterRole) {
      return false;
    }
    
    // Then apply search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      userItem.username?.toLowerCase().includes(query) ||
      userItem.email?.toLowerCase().includes(query) ||
      userItem.fullName?.toLowerCase().includes(query) ||
      userItem.phone?.toLowerCase().includes(query) ||
      userItem.role?.toLowerCase().includes(query)
    );
  });

  // Setup password reset form
  const passwordResetForm = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number, newPassword: string }) => {
      const response = await apiRequest("POST", "/api/admin/reset-user-password", {
        userId,
        newPassword
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset password");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password Reset Successful",
        description: `${data.user.username}'s password has been reset successfully.`,
        variant: "default",
      });
      setShowResetPasswordDialog(false);
      passwordResetForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Password Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle opening the reset password dialog
  const handleResetPassword = (user: User) => {
    setUserToResetPassword(user);
    setShowResetPasswordDialog(true);
    passwordResetForm.reset();
  };

  // Handle password reset form submission
  const onResetPasswordSubmit = (data: PasswordResetFormValues) => {
    if (userToResetPassword) {
      resetPasswordMutation.mutate({
        userId: userToResetPassword.id,
        newPassword: data.newPassword
      });
    }
  };

  // Format role for display
  const formatRole = (role: string) => {
    switch(role) {
      case 'admin':
        return { label: "Administrator", icon: <UserCog className="h-4 w-4 mr-1" />, class: "bg-purple-100 text-purple-800 border-purple-300" };
      case 'client':
        return { label: "Client", icon: <UsersRound className="h-4 w-4 mr-1" />, class: "bg-blue-100 text-blue-800 border-blue-300" };
      case 'service_provider':
        return { label: "Service Provider", icon: <Building2 className="h-4 w-4 mr-1" />, class: "bg-green-100 text-green-800 border-green-300" };
      case 'supplier':
        return { label: "Supplier", icon: <Building2 className="h-4 w-4 mr-1" />, class: "bg-amber-100 text-amber-800 border-amber-300" };
      default:
        return { label: role, icon: null, class: "bg-gray-100 text-gray-800 border-gray-300" };
    }
  };

  // Handle viewing user details
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowDetailsDialog(true);
  };

  return (
    <DashboardLayout title="User Management">
      {/* Header Section */}
      <section className="mb-8">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-6">
            <div className="md:flex justify-between items-center">
              <div className="mb-4 md:mb-0">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <UsersRound className="mr-2 h-6 w-6 text-primary" />
                  User Management
                </h2>
                <p className="text-gray-600 mt-1">
                  View and manage all users across the platform
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* User List Section */}
      <section className="mb-8">
        <Card className="bg-white border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle>Platform Users</CardTitle>
            <CardDescription>
              All registered users across different roles
            </CardDescription>
            <div className="mt-4 flex justify-between items-center flex-wrap gap-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex items-center">
                <Filter className="h-4 w-4 text-gray-500 mr-2" />
                <Select
                  value={filterRole}
                  onValueChange={(value) => setFilterRole(value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Administrators</SelectItem>
                    <SelectItem value="client">Clients</SelectItem>
                    <SelectItem value="service_provider">Service Providers</SelectItem>
                    <SelectItem value="supplier">Suppliers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <div className="flex justify-center py-8">
                <p>Loading users...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userItem) => {
                    const roleInfo = formatRole(userItem.role);
                    return (
                      <TableRow key={userItem.id}>
                        <TableCell className="font-medium">{userItem.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarFallback className="bg-primary text-white">
                                {userItem.fullName?.charAt(0) || userItem.username?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{userItem.fullName}</p>
                              <p className="text-xs text-gray-500">@{userItem.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{userItem.email}</p>
                            <p className="text-xs text-gray-500">{userItem.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`flex items-center w-fit ${roleInfo.class}`}>
                            {roleInfo.icon}
                            {roleInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {userItem.points} pts
                        </TableCell>
                        <TableCell>
                          {new Date(userItem.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewUser(userItem)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleResetPassword(userItem)}>
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <UsersRound className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p>No users found matching your criteria.</p>
                {(searchQuery || filterRole !== "all") && <p className="mt-2">Try adjusting your search or filter settings.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* User Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[550px]">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback className="bg-primary text-white">
                      {selectedUser.fullName?.charAt(0) || selectedUser.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  User Details: {selectedUser.fullName}
                </DialogTitle>
                <DialogDescription>
                  Complete information about this user
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Full Name</p>
                  <p className="text-sm text-gray-700">{selectedUser.fullName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Username</p>
                  <p className="text-sm text-gray-700">@{selectedUser.username}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-gray-700">{selectedUser.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-gray-700">{selectedUser.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Role</p>
                  <Badge className={`${formatRole(selectedUser.role).class}`}>
                    {formatRole(selectedUser.role).label}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Points</p>
                  <p className="text-sm text-gray-700">{selectedUser.points} points</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Created At</p>
                  <p className="text-sm text-gray-700">
                    {new Date(selectedUser.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <DialogFooter className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    handleResetPassword(selectedUser);
                    setShowDetailsDialog(false);
                  }}
                  className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                >
                  <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDetailsDialog(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="sm:max-w-[450px]">
          {userToResetPassword && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <KeyRound className="mr-2 h-5 w-5 text-yellow-500" />
                  Reset Password for {userToResetPassword.username}
                </DialogTitle>
                <DialogDescription>
                  Set a new password for this user. They will need to use this password for their next login.
                </DialogDescription>
              </DialogHeader>
              
              <Alert className="my-4 border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Important Security Action</AlertTitle>
                <AlertDescription className="text-amber-700">
                  This will immediately change the user's password. Make sure to communicate the new password to them securely.
                </AlertDescription>
              </Alert>

              <Form {...passwordResetForm}>
                <form onSubmit={passwordResetForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordResetForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordResetForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowResetPasswordDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={resetPasswordMutation.isPending} 
                      className="bg-primary"
                    >
                      {resetPasswordMutation.isPending ? (
                        <>Resetting Password...</>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Reset Password
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}