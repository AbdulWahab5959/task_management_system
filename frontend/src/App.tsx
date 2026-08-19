import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './components/public/PublicLayout';
import HealthCheckPage from './pages/HealthCheckPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import OrganizationsPage from './pages/Dashboard/OrganizationsPage';
import ProfilePage from './pages/Dashboard/ProfilePage';
import SettingsPage from './pages/Dashboard/SettingsPage';
import UserSettingsPage from './pages/Dashboard/UserSettingsPage';
import AdminPage from './pages/Dashboard/AdminPage';
import ActivityLogsPage from './pages/Dashboard/ActivityLogsPage';
import ContactMessagesPage from './pages/Dashboard/ContactMessagesPage';
import PlansPage from './pages/Dashboard/PlansPage';
import UsersPage from './pages/Dashboard/UsersPage';
import UserDetailPage from './pages/Dashboard/UserDetailPage';
import BillingPage from './pages/Dashboard/BillingPage';
import CheckoutPage from './pages/Dashboard/CheckoutPage';
import BillingSuccessPage from './pages/Dashboard/BillingSuccessPage';
import WebMcpTestPage from './pages/Dashboard/WebMcpTestPage';

import BillingCancelPage from './pages/Dashboard/BillingCancelPage';
import AdminSubscriptionsPage from './pages/Dashboard/AdminSubscriptionsPage';
import AdminPaymentsPage from './pages/Dashboard/AdminPaymentsPage';
import EmailVerificationRequiredPage from './pages/EmailVerificationRequiredPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/Public/Home';
import AboutPage from './pages/Public/About';
import ContactPage from './pages/Public/Contact';
import Pricing from './pages/Pricing';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutCancel from './pages/CheckoutCancel';
import TeamPage from './pages/Dashboard/TeamPage';
import InvitationAcceptPage from './pages/InvitationAcceptPage';

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>
        <Route path="/health" element={<HealthCheckPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/email-verification-required" element={<EmailVerificationRequiredPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite/accept" element={<InvitationAcceptPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireVerified>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="organizations/*" element={<OrganizationsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="billing/checkout/:planId" element={<CheckoutPage />} />
          <Route path="billing/success" element={<BillingSuccessPage />} />
          <Route path="billing/cancel" element={<BillingCancelPage />} />
          <Route
            path="admin"
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="admin/subscriptions"
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminSubscriptionsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="admin/payments"
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminPaymentsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="activity-logs"
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <ActivityLogsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="contact-messages"
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <ContactMessagesPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="plans"
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <PlansPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <UsersPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="users/:id"
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <UserDetailPage />
              </RoleProtectedRoute>
            }
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="webmcp-test" element={<WebMcpTestPage />} />

          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/account" element={<UserSettingsPage />} />
          <Route path="team" element={<TeamPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
