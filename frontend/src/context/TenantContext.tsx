import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { tenantService } from '../services/tenant.service';
import type { Tenant } from '../types/tenant.types';
import { TenantContext } from './tenant.context';
import { useAuth } from '../hooks/useAuth';
import { teamInvitationsService } from '../services/team-invitations.service';
import type { TenantInvitation } from '../types/team-invitation.types';

const ACTIVE_TENANT_KEY = 'active_tenant_id';

function selectInitialTenant(tenants: Tenant[]): Tenant | null {
  const storedId = Number(localStorage.getItem(ACTIVE_TENANT_KEY));
  const storedTenant = tenants.find((tenant) => tenant.id === storedId && tenant.status === 'active');
  return storedTenant ?? tenants.find((tenant) => tenant.status === 'active') ?? tenants[0] ?? null;
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<TenantInvitation[]>([]);
  const [pendingInvitationsLoading, setPendingInvitationsLoading] = useState(false);

  const applyTenants = useCallback((nextTenants: Tenant[]) => {
    setTenants(nextTenants);
    const nextActive = selectInitialTenant(nextTenants);
    setActiveTenant(nextActive);

    if (nextActive) {
      localStorage.setItem(ACTIVE_TENANT_KEY, String(nextActive.id));
    } else {
      localStorage.removeItem(ACTIVE_TENANT_KEY);
    }

    return nextActive;
  }, []);

  const refreshTenants = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await tenantService.list();
      const nextTenants = response.data.data ?? [];
      applyTenants(nextTenants);
      return nextTenants;
    } catch {
      setError('Unable to load your organizations.');
      throw new Error('Unable to load tenants');
    } finally {
      setLoading(false);
    }
  }, [applyTenants]);

  const refreshPendingInvitations = useCallback(async () => {
    if (!user) {
      setPendingInvitations([]);
      return [];
    }

    setPendingInvitationsLoading(true);
    try {
      const response = await teamInvitationsService.listForUser();
      const invitations = response.data.data ?? [];
      setPendingInvitations(invitations);
      return invitations;
    } catch {
      setPendingInvitations([]);
      return [];
    } finally {
      setPendingInvitationsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setTenants([]);
        setActiveTenant(null);
        setPendingInvitations([]);
        setError('');
      });
      localStorage.removeItem(ACTIVE_TENANT_KEY);
      return;
    }

    queueMicrotask(() => {
      void refreshTenants().then((nextTenants) => {
        if (nextTenants.length === 0) void refreshPendingInvitations();
      });
    });
  }, [refreshPendingInvitations, refreshTenants, user]);

  const selectTenant = useCallback(
    (tenantId: number) => {
      const tenant = tenants.find((candidate) => candidate.id === tenantId && candidate.status === 'active');
      if (!tenant) {
        return;
      }

      setActiveTenant(tenant);
      localStorage.setItem(ACTIVE_TENANT_KEY, String(tenant.id));
    },
    [tenants],
  );

  const createTenant = useCallback(
    async (name: string) => {
      const response = await tenantService.create(name);
      const createdTenant = response.data.data;
      let currentCreatedTenant = createdTenant;

      try {
        const nextTenants = await refreshTenants();
        currentCreatedTenant = nextTenants.find((tenant) => tenant.id === createdTenant.id) ?? createdTenant;
      } catch {
        // The create request already succeeded. Keep the returned tenant
        // usable if a follow-up list refresh briefly fails.
        setTenants((current) => current.some((tenant) => tenant.id === createdTenant.id)
          ? current
          : [...current, createdTenant]);
      }

      setActiveTenant(currentCreatedTenant);
      localStorage.setItem(ACTIVE_TENANT_KEY, String(currentCreatedTenant.id));
      return currentCreatedTenant;
    },
    [refreshTenants],
  );

  const contextValue = useMemo(
    () => ({ tenants, activeTenant, loading, error, selectTenant, refreshTenants, createTenant, pendingInvitations, pendingInvitationsLoading, refreshPendingInvitations }),
    [activeTenant, createTenant, error, loading, pendingInvitations, pendingInvitationsLoading, refreshPendingInvitations, refreshTenants, selectTenant, tenants],
  );

  return <TenantContext.Provider value={contextValue}>{children}</TenantContext.Provider>;
};
