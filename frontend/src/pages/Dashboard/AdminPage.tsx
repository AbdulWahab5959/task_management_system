import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/Card';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import { useAuth } from '../../hooks/useAuth';

function formatRole(role?: string) {
  return role?.replace('_', ' ') ?? 'admin';
}

export default function AdminPage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Admin"
        description="Platform access controls are ready for the next admin module."
      />

      <Card>
        <CardHeader>
          <CardTitle>Access granted</CardTitle>
          <CardDescription>Your current role is {formatRole(user?.role)}.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            title="No admin modules yet"
            description="Future admin pages can be added under this protected route."
          />
        </CardContent>
      </Card>
    </>
  );
}
