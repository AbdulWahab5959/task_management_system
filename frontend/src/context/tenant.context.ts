import { createContext } from 'react';
import type { Tenant } from '../types/tenant.types';
import type { TenantInvitation } from '../types/team-invitation.types';

export interface TenantContextType {
  tenants: Tenant[];
  activeTenant: Tenant | null;
  loading: boolean;
  error: string;
  selectTenant: (tenantId: number) => void;
  refreshTenants: () => Promise<Tenant[]>;
  createTenant: (data: { name: string; industry: string; website: string; contact_email: string; description?: string }) => Promise<Tenant>;
  pendingInvitations: TenantInvitation[];
  pendingInvitationsLoading: boolean;
  refreshPendingInvitations: () => Promise<TenantInvitation[]>;
}

export const TenantContext = createContext<TenantContextType | undefined>(undefined);
