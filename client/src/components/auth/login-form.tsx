import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import ForgotPasswordForm from "./forgot-password-form";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// We'll handle email detection in the submit handler

interface LoginFormProps {
  onSuccess?: () => void;
  defaultEmail?: string;
}

export default function LoginForm({ onSuccess, defaultEmail }: LoginFormProps) {
  const { loginMutation } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Initialize form with react-hook-form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      // Only use defaultEmail if it doesn't contain @ symbol, otherwise leave blank
      // This is because we use usernames for login, not email addresses
      username: defaultEmail && !defaultEmail.includes('@') ? defaultEmail : "",
      password: "",
    },
  });

  // Form submission handler
  const onSubmit = async (data: LoginFormValues) => {
    setErrorMessage(null);
    
    try {
      // Normalize input to lowercase for consistent login experience
      const usernameOrEmail = data.username.toLowerCase();
      
      // Determine if the input is an email by checking for @ symbol
      const isEmail = usernameOrEmail.includes('@');
      
      // Create the login data object based on whether it's an email or username
      const loginData = isEmail 
        ? { email: usernameOrEmail, password: data.password }
        : { username: usernameOrEmail, password: data.password };
      
      console.log(`Attempting login with ${isEmail ? 'email' : 'username'}:`, isEmail ? usernameOrEmail : '(hidden)');
      
      await loginMutation.mutateAsync(loginData);
      
      console.log("Login successful, calling onSuccess callback");
      
      // Call onSuccess callback if provided (e.g., to switch to invitation tab)
      if (onSuccess) {
        // Slight delay to ensure the user state is properly updated
        setTimeout(() => {
          onSuccess();
        }, 300);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setErrorMessage(error.message || "Login failed. Please check your credentials and try again.");
    }
  };

  // If showing forgot password form, render that instead
  if (showForgotPassword) {
    return <ForgotPasswordForm onCancel={() => setShowForgotPassword(false)} />;
  }

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
              <FormLabel>Username or Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your username or email"
                  {...field}
                  autoComplete="username email"
                  disabled={loginMutation.isPending}
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
                  placeholder="Enter your password"
                  {...field}
                  autoComplete="current-password"
                  disabled={loginMutation.isPending}
                />
              </FormControl>
              <FormMessage />
              <div className="text-right">
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-xs text-primary" 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot your password?
                </Button>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </Form>
  );
}