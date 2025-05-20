import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RegisterForm from "@/components/auth/register-form";

// This page has no auth checks at all - it's purely for testing the registration form
export default function DirectRegisterPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side: Registration form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription>
              Sign up for a new Artisans account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
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