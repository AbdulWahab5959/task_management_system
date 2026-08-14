import { useContext } from 'react';
import { TenantContext } from '../context/tenant.context';

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }

  return context;
}
