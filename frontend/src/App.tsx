import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './components/public/PublicLayout';
import HealthCheckPage from './pages/HealthCheckPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ProfilePage from './pages/Dashboard/ProfilePage';
import SettingsPage from './pages/Dashboard/SettingsPage';
import AdminPage from './pages/Dashboard/AdminPage';
import ActivityLogsPage from './pages/Dashboard/ActivityLogsPage';
import ContactMessagesPage from './pages/Dashboard/ContactMessagesPage';
import PlansPage from './pages/Dashboard/PlansPage';
import UsersPage from './pages/Dashboard/UsersPage';
import UserDetailPage from './pages/Dashboard/UserDetailPage';
import EmailVerificationRequiredPage from './pages/EmailVerificationRequiredPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/Public/Home';
import AboutPage from './pages/Public/About';
import PricingPage from './pages/Public/PricingPage';
import ContactPage from './pages/Public/Contact';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>
        <Route path="/health" element={<HealthCheckPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/email-verification-required" element={<EmailVerificationRequiredPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireVerified>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route
            path="admin"
            element={
              <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminPage />
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
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;