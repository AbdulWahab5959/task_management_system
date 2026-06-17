import { createContext } from 'react';
import type { LoginCredentials, RegisterData, User } from '../types/auth.types';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ requires_email_verification?: boolean; message?: string }>;
  register: (data: RegisterData) => Promise<{ requires_email_verification?: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);