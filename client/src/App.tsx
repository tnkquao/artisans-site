import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import RegisterPage from "@/pages/register-page";
import DirectRegisterPage from "@/pages/direct-register-page";
import { ProtectedRoute } from "@/lib/protected-route";
import DashboardPage from "@/pages/dashboard-page";
import ProjectsPage from "@/pages/projects-page";
import MaterialsPage from "@/pages/materials-page";
import OrdersPage from "@/pages/orders-page";
import MessagesPage from "@/pages/messages-page";
import LocationsPage from "@/pages/locations-page";
import ProjectDetailPage from "@/pages/project-detail-page";
import ProjectInvitationsPage from "@/pages/project-invitations-page";
import ServiceRequestsPage from "@/pages/service-requests-page";
import ServiceDashboardPage from "@/pages/service-dashboard-page";
import ServicesPage from "@/pages/services-page";
import AdminDashboardPage from "@/pages/admin-dashboard-page";
import AdminBasicDashboard from "@/pages/admin-basic-dashboard";
import AdminManagementPage from "@/pages/admin-management-page";
import AdminUsersPage from "@/pages/admin-users-page";
import AdminBiddingPage from "@/pages/admin-bidding-page";
import AdminServiceRequestsPage from "@/pages/admin-service-requests-page";
import AdminProjectsPage from "@/pages/admin-projects-page";
import AdminProjectDetailPage from "@/pages/admin-project-detail-page";
import AdminOrdersPage from "@/pages/admin-orders-page";
import AdminSuppliersPage from "@/pages/admin-suppliers-page";
import AdminReportsPage from "@/pages/admin-reports-page";
import AdminSettingsPage from "@/pages/admin-settings-page";
import UserManagementPage from "@/pages/user-management-page";
import ProviderDashboardPage from "@/pages/provider-dashboard-page";
import ProviderProjectsPage from "@/pages/provider-projects-page";
import SupplierDashboardPage from "@/pages/supplier-dashboard-page";
import MaterialsListPage from "@/pages/materials-list-page";
import MaterialDetailPage from "@/pages/material-detail-page";
import AddMaterialPage from "@/pages/add-material-page";
import AnalyticsPage from "@/pages/analytics-page";
import BrowseMaterialsPage from "@/pages/browse-materials-page";
import ViewMaterialPage from "@/pages/view-material-page";
import SkillsManagementPage from "@/pages/skills-management-page";
import JoinInvitationPage from "@/pages/join-invitation-page";
import ExpensesPage from "@/pages/expenses-page";
import ReportsPage from "@/pages/reports-page";
import CartPage from "@/pages/cart-page";
import SiteMaterialsPage from "@/pages/site-materials-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import ProfileSettingsPage from "@/pages/profile-settings-page";
import ServiceProviderBiddingPage from "@/pages/service-provider-bidding-page";
import { AuthProvider } from "./hooks/use-auth";
import { OnboardingProvider } from "./hooks/use-onboarding";
import { RoleOnboardingProvider } from "./hooks/use-role-onboarding";
import { ChatProvider } from "./hooks/use-chat";
import { CartProvider } from "./hooks/use-cart";
import { DirectAdminAuthProvider } from "./hooks/use-direct-admin-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/register-new" component={RegisterPage} />
      <Route path="/direct-register" component={DirectRegisterPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route path="/join/:inviteToken" component={JoinInvitationPage} />
      {/* Make sure join page works with query params too */}
      <Route path="/join/invitation/:inviteToken" component={JoinInvitationPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/projects" component={ProjectsPage} />
      <ProtectedRoute path="/project-invitations" component={ProjectInvitationsPage} />
      <ProtectedRoute path="/projects/:id" component={ProjectDetailPage} />
      <ProtectedRoute path="/materials" component={MaterialsPage} />
      <ProtectedRoute path="/orders" component={OrdersPage} />
      <ProtectedRoute path="/messages" component={MessagesPage} />
      <ProtectedRoute path="/locations" component={LocationsPage} />
      <ProtectedRoute path="/service-requests" component={ServiceRequestsPage} />
      <ProtectedRoute path="/services" component={ServicesPage} />
      <ProtectedRoute path="/services/:serviceType" component={ServiceDashboardPage} />
      <Route path="/admin-dashboard" component={AdminDashboardPage} />
      <Route path="/admin-basic" component={AdminBasicDashboard} />
      <Route path="/admin-management" component={AdminManagementPage} />
      <Route path="/admin-users" component={AdminUsersPage} />
      <Route path="/admin-bidding" component={AdminBiddingPage} />
      <Route path="/admin-service-requests" component={AdminServiceRequestsPage} />
      <Route path="/admin-projects" component={AdminProjectsPage} />
      <Route path="/admin-projects/:id" component={AdminProjectDetailPage} />
      <Route path="/admin-orders" component={AdminOrdersPage} />
      <Route path="/admin-suppliers" component={AdminSuppliersPage} />
      <Route path="/admin-reports" component={AdminReportsPage} />
      <Route path="/admin-settings" component={AdminSettingsPage} />
      <ProtectedRoute path="/user-management" component={UserManagementPage} />
      {/* Service Provider Routes */}
      <Route path="/provider-dashboard" component={ProviderDashboardPage} />
      <Route path="/provider-projects" component={ProviderProjectsPage} />
      <ProtectedRoute path="/supplier-dashboard" component={SupplierDashboardPage} />
      <ProtectedRoute path="/service-provider-bidding" component={ServiceProviderBiddingPage} />
      
      {/* Project expense, reports, and materials routes */}
      <ProtectedRoute path="/projects/:projectId/expenses" component={ExpensesPage} />
      <ProtectedRoute path="/projects/:projectId/reports" component={ReportsPage} />
      <ProtectedRoute path="/projects/:projectId/site-materials" component={SiteMaterialsPage} />
      
      {/* Cart route */}
      <ProtectedRoute path="/cart" component={CartPage} />
      
      {/* Supplier material management routes */}
      <ProtectedRoute path="/materials/list" component={MaterialsListPage} />
      <ProtectedRoute path="/materials/new" component={AddMaterialPage} />
      <ProtectedRoute path="/materials/:id" component={MaterialDetailPage} />
      
      {/* Public material browsing routes - accessible to all logged in users */}
      <ProtectedRoute path="/materials/browse" component={BrowseMaterialsPage} />
      <ProtectedRoute path="/materials/view/:id" component={ViewMaterialPage} />
      
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/skills" component={SkillsManagementPage} />
      <ProtectedRoute path="/profile-settings" component={ProfileSettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <DirectAdminAuthProvider>
        <ChatProvider>
          <CartProvider>
            <OnboardingProvider>
              <RoleOnboardingProvider>
                <Router />
                <Toaster />
              </RoleOnboardingProvider>
            </OnboardingProvider>
          </CartProvider>
        </ChatProvider>
      </DirectAdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
