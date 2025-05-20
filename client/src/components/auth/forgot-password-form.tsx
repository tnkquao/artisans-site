import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schema with email validation
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordForm({ onCancel }: { onCancel: () => void }) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast } = useToast();

  // Initialize form with react-hook-form
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest("POST", "/api/forgot-password", data);
      return response.json();
    },
    onSuccess: () => {
      setStatus("success");
      form.reset();
      
      toast({
        title: "Password Reset Email Sent",
        description: "If an account with that email exists, we've sent password reset instructions.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      setStatus("error");
      
      toast({
        title: "Request Failed",
        description: error.message || "An error occurred while processing your request.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: ForgotPasswordFormValues) => {
    setStatus("idle");
    forgotPasswordMutation.mutate({ email: data.email });
  };

  if (status === "success") {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="text-lg font-medium">Check Your Email</h3>
        <p className="text-sm text-muted-foreground">
          If an account exists with the email you provided, we've sent instructions on how to reset your password.
        </p>
        <p className="text-sm text-muted-foreground">
          The email may take a few minutes to arrive. Be sure to check your spam folder.
        </p>
        <Button onClick={onCancel} className="mt-4">
          Return to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium">Forgot Your Password?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {status === "error" && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-md flex items-start">
              <XCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>
                There was a problem processing your request. Please try again later.
              </span>
            </div>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    {...field}
                    disabled={forgotPasswordMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex space-x-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={onCancel}
              disabled={forgotPasswordMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}