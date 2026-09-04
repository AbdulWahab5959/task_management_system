import React, { useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth.service';
import { AuthContext } from './auth.context';
import type { LoginCredentials, RegisterData, User } from '../types/auth.types';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authService.me();
        setUser(response.data);
      } catch {
        localStorage.removeItem('auth_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    if (response.data.token && response.data.user) {
      localStorage.setItem('auth_token', response.data.token);
      setUser(response.data.user);
    }
    return response.data;
  };

  const register = async (data: RegisterData) => {
    const response = await authService.register(data);
    localStorage.setItem('auth_token', response.data.token!);
    setUser(response.data.user!);
    return response.data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const response = await authService.me();
    setUser(response.data);
  };

  const contextValue = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [loading, user],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
