import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AdminDashboardLayout from "@/components/admin/admin-dashboard-layout";
import { 
  Search,
  UserCog,
  Pencil,
  Trash2,
  Key,
  Lock,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { useDirectAdminAuth } from "@/hooks/use-direct-admin-auth";
import { 
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Password reset form schema
const passwordResetSchema = z.object({
  newPassword: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),
});

// User update form schema
const userUpdateSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters",
  }),
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
  role: z.enum(["client", "service_provider", "supplier", "admin"]),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  points: z.number().optional(),
});

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;
type UserUpdateFormValues = z.infer<typeof userUpdateSchema>;

export default function AdminUsersPage() {
  const { adminUser } = useDirectAdminAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Create form for password reset
  const passwordResetForm = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: "",
    },
  });

  // Create form for user editing
  const userEditForm = useForm<UserUpdateFormValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      username: "",
      email: "",
      role: "client",
      fullName: "",
      phone: "",
      address: "",
      points: 0,
    },
  });

  // Query to get all users
  const { 
    data: users = [], 
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers
  } = useQuery<User[]>({
    queryKey: ["/api/direct-admin/all-users"],
    queryFn: async () => {
      console.log("Attempting to fetch users with admin:", adminUser);
      if (!adminUser || adminUser.role !== 'admin') {
        console.log("Admin user not available or not admin role, returning empty list");
        return [];
      }
      
      try {
        // Use the apiRequest utility from queryClient which handles headers properly
        console.log(`Making API request to fetch users with admin username: ${adminUser.username}`);
        const response = await apiRequest("POST", "/api/direct-admin/all-users", {
          adminUsername: adminUser.username
        });
        
        console.log(`API response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch users:", errorText);
          throw new Error(`Failed to fetch users: ${errorText}`);
        }
        
        const data = await response.json();
        console.log(`Retrieved ${data.length} users from API`);
        return data;
      } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
      }
    },
    staleTime: 60000,
    // Initially disable the query until admin authentication is complete
    enabled: false,
  });
  
  // Once admin authentication is complete, trigger the query
  useEffect(() => {
    if (adminUser && adminUser.role === 'admin' && !isLoadingUsers) {
      console.log("Admin user authenticated, triggering user data fetch");
      refetchUsers();
    }
  }, [adminUser, refetchUsers]);
  
  // Log any query errors
  useEffect(() => {
    if (usersError) {
      console.error("Users query error:", usersError);
    }
  }, [usersError]);

  // Mutation for resetting user password
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { userId: number; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/admin/reset-user-password", {
        userId: data.userId,
        newPassword: data.newPassword,
        adminUsername: adminUser?.username
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset password");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Reset Successful",
        description: `Password has been reset for ${selectedUser?.username}`,
      });
      setIsResetPasswordOpen(false);
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

  // Mutation for updating user
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserUpdateFormValues & { userId: number }) => {
      const response = await apiRequest("PATCH", `/api/direct-admin/users/${data.userId}`, {
        ...data,
        adminUsername: adminUser?.username
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: `User ${selectedUser?.username} has been updated successfully`,
      });
      setIsEditUserOpen(false);
      userEditForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/direct-admin/all-users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/direct-admin/users/${userId}`, {
        adminUsername: adminUser?.username
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: `User ${selectedUser?.username} has been deleted`,
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/direct-admin/all-users'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle password reset
  const handleResetPassword = (values: PasswordResetFormValues) => {
    if (selectedUser) {
      resetPasswordMutation.mutate({
        userId: selectedUser.id,
        newPassword: values.newPassword,
      });
    }
  };

  // Handle user update
  const handleUpdateUser = (values: UserUpdateFormValues) => {
    if (selectedUser) {
      updateUserMutation.mutate({
        ...values,
        userId: selectedUser.id,
      });
    }
  };

  // Handle user deletion
  const handleDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  // Open edit dialog and populate form with user data
  const openEditUserDialog = (user: User) => {
    setSelectedUser(user);
    userEditForm.reset({
      username: user.username,
      email: user.email || "",
      role: user.role as "client" | "service_provider" | "supplier" | "admin",
      fullName: user.fullName || "",
      phone: user.phone || "",
      address: user.address || "",
      points: user.points || 0,
    });
    setIsEditUserOpen(true);
  };

  // Open reset password dialog
  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    passwordResetForm.reset();
    setIsResetPasswordOpen(true);
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  // Debug users array
  console.log("Users data:", users);
  
  // Filter users based on search query
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  console.log("Filtered users:", filteredUsers);

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'client':
        return 'bg-blue-100 text-blue-800';
      case 'service_provider':
        return 'bg-green-100 text-green-800';
      case 'supplier':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminDashboardLayout title="User Management">
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">
                <UserCog className="inline-block mr-2 h-6 w-6" />
                User Management
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8 w-[250px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <div className="flex justify-center my-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.fullName || "-"}</TableCell>
                        <TableCell>{user.email || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.points || 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditUserDialog(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openResetPasswordDialog(user)}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            {user.id !== adminUser?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => openDeleteDialog(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for user: <strong>{selectedUser?.username}</strong>
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordResetForm}>
            <form onSubmit={passwordResetForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={passwordResetForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter new password" {...field} />
                    </FormControl>
                    <FormDescription>
                      Password must be at least 6 characters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={resetPasswordMutation.isPending}>
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Lock className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update information for user: <strong>{selectedUser?.username}</strong>
            </DialogDescription>
          </DialogHeader>
          <Form {...userEditForm}>
            <form onSubmit={userEditForm.handleSubmit(handleUpdateUser)} className="space-y-4">
              <FormField
                control={userEditForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userEditForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userEditForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="service_provider">Service Provider</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userEditForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userEditForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userEditForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userEditForm.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Points" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditUserOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                      Updating...
                    </>
                  ) : (
                    "Update User"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user <strong>{selectedUser?.username}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminDashboardLayout>
  );
}