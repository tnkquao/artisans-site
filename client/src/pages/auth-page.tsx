import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { RouteComponentProps } from "wouter";

interface AuthPageProps extends RouteComponentProps {
  forceRegister?: boolean;
}

export default function AuthPage({ params }: RouteComponentProps) {
  // This component no longer needs the forceRegister prop
  const forceRegister = false;
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();

  // Redirect to role-specific dashboard if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      const path = user.role === "admin" 
        ? "/admin-dashboard"
        : user.role === "service_provider" 
          ? "/provider-dashboard" 
          : "/";
      
      navigate(path);
    }
  }, [user, isLoading, navigate]);

  // If still checking authentication status, show loading
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // If not logged in, show auth page
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side: Auth forms */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome to Artisans</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={forceRegister ? "register" : "login"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" disabled={forceRegister}>Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <LoginForm />
              </TabsContent>
              
              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right side: Hero/Information */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 hidden md:flex flex-col justify-center p-10">
        <div className="max-w-lg mx-auto space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold">
            Trusted Intermediary for Construction Projects in Ghana
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Artisans Platform connects Ghanaians abroad with trusted contractors and suppliers, 
            providing comprehensive tracking and transparency for your construction projects.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Project Oversight</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time updates and comprehensive tracking for your construction projects.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Secure Payments</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Trustworthy payment processing for international transactions.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Verified Contractors</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Work with pre-vetted, reliable service providers in Ghana.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="font-medium mb-2">Material Sourcing</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Direct access to quality building materials from trusted suppliers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}