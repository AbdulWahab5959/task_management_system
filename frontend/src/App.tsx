import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './components/public/PublicLayout';
import ProfessionalLoader from './components/common/ProfessionalLoader';
const HealthCheckPage = lazy(() => import('./pages/HealthCheckPage'));
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const OrganizationsPage = lazy(() => import('./pages/Dashboard/OrganizationsPage'));
const ProfilePage = lazy(() => import('./pages/Dashboard/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/Dashboard/SettingsPage'));
const UserSettingsPage = lazy(() => import('./pages/Dashboard/UserSettingsPage'));
const AdminPage = lazy(() => import('./pages/Dashboard/AdminPage'));
const ActivityLogsPage = lazy(() => import('./pages/Dashboard/ActivityLogsPage'));
const ContactMessagesPage = lazy(() => import('./pages/Dashboard/ContactMessagesPage'));
const PlansPage = lazy(() => import('./pages/Dashboard/PlansPage'));
const UsersPage = lazy(() => import('./pages/Dashboard/UsersPage'));
const UserDetailPage = lazy(() => import('./pages/Dashboard/UserDetailPage'));
const BillingPage = lazy(() => import('./pages/Dashboard/BillingPage'));
const CheckoutPage = lazy(() => import('./pages/Dashboard/CheckoutPage'));
const BillingSuccessPage = lazy(() => import('./pages/Dashboard/BillingSuccessPage'));
const WebMcpTestPage = lazy(() => import('./pages/Dashboard/WebMcpTestPage'));
const BillingCancelPage = lazy(() => import('./pages/Dashboard/BillingCancelPage'));
const AdminSubscriptionsPage = lazy(() => import('./pages/Dashboard/AdminSubscriptionsPage'));
const AdminPaymentsPage = lazy(() => import('./pages/Dashboard/AdminPaymentsPage'));
const EmailVerificationRequiredPage = lazy(() => import('./pages/EmailVerificationRequiredPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const HomePage = lazy(() => import('./pages/Public/Home'));
const AboutPage = lazy(() => import('./pages/Public/About'));
const ContactPage = lazy(() => import('./pages/Public/Contact'));
const ChatbotsPage = lazy(() => import('./pages/Public/Chatbots'));
const PrivacyPolicyPage = lazy(() => import('./pages/Public/PrivacyPolicy'));
const TermsOfServicePage = lazy(() => import('./pages/Public/TermsOfService'));
const Pricing = lazy(() => import('./pages/Pricing'));
const CheckoutSuccess = lazy(() => import('./pages/CheckoutSuccess'));
const CheckoutCancel = lazy(() => import('./pages/CheckoutCancel'));
const TeamPage = lazy(() => import('./pages/Dashboard/TeamPage'));
const ProjectsPage = lazy(() => import('./pages/Dashboard/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/Dashboard/ProjectDetailPage'));
const MyTasksPage = lazy(() => import('./pages/Dashboard/MyTasksPage'));
const InvitationAcceptPage = lazy(() => import('./pages/InvitationAcceptPage'));
const SupportInboxPage = lazy(() => import('./pages/Dashboard/SupportInboxPage'));

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <Suspense fallback={<ProfessionalLoader label="Loading page" detail="Preparing the selected workspace" />}>
        <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancel" element={<CheckoutCancel />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/chatbots" element={<ChatbotsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
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
          <Route path="billing" element={<RoleProtectedRoute allowedRoles={['user', 'admin']}><BillingPage /></RoleProtectedRoute>} />
          <Route path="billing/checkout/:planId" element={<RoleProtectedRoute allowedRoles={['user', 'admin']}><CheckoutPage /></RoleProtectedRoute>} />
          <Route path="billing/success" element={<RoleProtectedRoute allowedRoles={['user', 'admin']}><BillingSuccessPage /></RoleProtectedRoute>} />
          <Route path="billing/cancel" element={<RoleProtectedRoute allowedRoles={['user', 'admin']}><BillingCancelPage /></RoleProtectedRoute>} />
          <Route
            path="admin"
            element={
              <RoleProtectedRoute allowedRoles={['super_admin']}>
                <AdminPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="admin/subscriptions"
            element={
              <RoleProtectedRoute allowedRoles={['super_admin']}>
                <AdminSubscriptionsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="admin/payments"
            element={
              <RoleProtectedRoute allowedRoles={['super_admin']}>
                <AdminPaymentsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="activity-logs"
            element={
              <RoleProtectedRoute allowedRoles={['super_admin']}>
                <ActivityLogsPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="contact-messages"
            element={
              <RoleProtectedRoute allowedRoles={['super_admin']}>
                <ContactMessagesPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="plans"
            element={
              <RoleProtectedRoute allowedRoles={['super_admin']}>
                <PlansPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <RoleProtectedRoute allowedRoles={['super_admin']}>
                <UsersPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="users/:id"
            element={
              <RoleProtectedRoute allowedRoles={['super_admin']}>
                <UserDetailPage />
              </RoleProtectedRoute>
            }
          />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="webmcp-test"
            element={
              <RoleProtectedRoute allowedRoles={['super_admin']}>
                <WebMcpTestPage />
              </RoleProtectedRoute>
            }
          />
          <Route path="support" element={<RoleProtectedRoute allowedRoles={['super_admin']}><SupportInboxPage /></RoleProtectedRoute>} />

          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/account" element={<UserSettingsPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="tasks" element={<MyTasksPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
