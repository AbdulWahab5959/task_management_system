import { api } from './api';
import type {
  AuthResponse,
  AvatarUploadResponse,
  ForgotPasswordData,
  LoginCredentials,
  MessageResponse,
  RegisterData,
  ResetPasswordData,
  UpdatePasswordData,
  UpdateProfileData,
  UpdateProfileResponse,
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

  updateProfile(payload: UpdateProfileData) {
    return api.put<UpdateProfileResponse>('/auth/profile', payload);
  },

  updateAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post<AvatarUploadResponse>('/auth/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updatePassword(payload: UpdatePasswordData) {
    return api.put<MessageResponse>('/auth/password', payload);
  },
};
