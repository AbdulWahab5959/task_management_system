import axios from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    tenantScoped?: boolean;
  }
}

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  'http://localhost:8000/api';

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.tenantScoped) {
    const activeTenantId = localStorage.getItem('active_tenant_id');
    if (activeTenantId) {
      config.headers = config.headers ?? {};
      config.headers['X-Tenant-ID'] = activeTenantId;
    }
  }

  return config;
});
