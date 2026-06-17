import { api } from './api';
import type {
  AuthResponse,
  ForgotPasswordData,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
  User,
} from '../types/auth.types';

export const authService = {
  register(payload: RegisterData) {
    return api.post<AuthResponse>('/auth/register', payload);
  },

  login(payload: LoginCredentials) {
    return api.post<AuthResponse>('/auth/login', payload);
  },

  me() {
    return api.get<User>('/auth/me');
  },

  logout() {
    return api.post('/auth/logout');
  },

  sendVerificationNotification() {
    return api.post('/auth/email/verification-notification');
  },

  verifyEmail(verificationUrl: string) {
    return api.get(verificationUrl);
  },

  forgotPassword(payload: ForgotPasswordData) {
    return api.post('/auth/forgot-password', payload);
  },

  resetPassword(payload: ResetPasswordData) {
    return api.post('/auth/reset-password', payload);
  },
};