import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Register form schema
const registerSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must not exceed 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string()
    .email("Please enter a valid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters"),
  fullName: z.string()
    .min(3, "Full name must be at least 3 characters"),
  role: z.enum(["client", "service_provider", "supplier"]),
  serviceType: z.string().optional(),
  phone: z.string()
    .min(10, "Phone number must be at least 10 characters")
    .optional()
    .or(z.literal("")),
}).refine(data => {
  // If role is service_provider, serviceType is required
  return data.role !== 'service_provider' || (data.role === 'service_provider' && data.serviceType);
}, {
  message: "Service type is required for service providers",
  path: ["serviceType"]
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess?: () => void;
  defaultEmail?: string;
}

export default function RegisterForm({ onSuccess, defaultEmail }: RegisterFormProps) {
  const { registerMutation } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form with react-hook-form
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: defaultEmail || "",
      password: "",
      fullName: "",
      role: "client",
      serviceType: "",
      phone: "",
    },
  });

  // Watch role field to show different fields based on role
  const role = form.watch("role");
  
  // Debug log when role changes
  console.log("Current role:", role);
  
  // Available service types
  const serviceTypes = [
    "contractor",
    "real_estate",
    "electrician",
    "plumber",
    "carpenter",
    "mason",
    "painter",
    "roofer",
    "architect"
  ];
  
  // Display name for service type
  const getServiceDisplayName = (type: string) => {
    const map: Record<string, string> = {
      "contractor": "Contractor Services",
      "real_estate": "Real Estate Development",
      "electrician": "Electrical Services",
      "plumber": "Plumbing Services",
      "carpenter": "Carpentry Services",
      "mason": "Masonry Services",
      "painter": "Painting Services",
      "roofer": "Roofing Services",
      "architect": "Architectural Services"
    };
    return map[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
  };

  // Form submission handler
  const onSubmit = async (data: RegisterFormValues) => {
    setErrorMessage(null);
    
    try {
      // Pre-registration user data debug log
      console.log("Attempting registration with data:", {
        ...data,
        password: "[REDACTED]" // Don't log the password
      });
      
      await registerMutation.mutateAsync({
        ...data,
        points: 500 // Default starting points
      });
      
      console.log("Registration successful, calling onSuccess callback");
      
      // Call onSuccess callback if provided (e.g., to switch to invitation tab)
      if (onSuccess) {
        // Slight delay to ensure the user state is properly updated
        setTimeout(() => {
          onSuccess();
        }, 300);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setErrorMessage(error.message || "Registration failed. Please try again.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-md">
            {errorMessage}
          </div>
        )}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  placeholder="Choose a username"
                  {...field}
                  autoComplete="username"
                  disabled={registerMutation.isPending}
                />
              </FormControl>
              <FormDescription>This will be your login name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  {...field}
                  autoComplete="email"
                  disabled={registerMutation.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your full name"
                  {...field}
                  autoComplete="name"
                  disabled={registerMutation.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Create a password"
                  {...field}
                  autoComplete="new-password"
                  disabled={registerMutation.isPending}
                />
              </FormControl>
              <FormDescription>At least 6 characters</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type</FormLabel>
              <Select 
                disabled={registerMutation.isPending}
                onValueChange={field.onChange} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your account type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="client">Client - Building Owner</SelectItem>
                  <SelectItem value="service_provider">Service Provider - Contractor, Engineer, etc.</SelectItem>
                  <SelectItem value="supplier">Supplier - Materials Provider</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                This determines the type of access you will have on the platform
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Service Type field - only shown for service providers */}
        {role === "service_provider" && (
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type</FormLabel>
                <Select 
                  disabled={registerMutation.isPending}
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your service type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {serviceTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {getServiceDisplayName(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  This determines what service requests will be available to you
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="+233501234567"
                  {...field}
                  autoComplete="tel"
                  disabled={registerMutation.isPending}
                />
              </FormControl>
              <FormDescription>
                Optional but recommended for account recovery
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </Form>
  );
}