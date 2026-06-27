import { FlaskConical } from 'lucide-react';
import PageHeader from '../../components/dashboard/PageHeader';
import LaunchpadWebMcpTestPanel from '../../components/dashboard/LaunchpadWebMcpTestPanel';

export default function WebMcpTestPage() {
  return (
    <>
      <PageHeader
        eyebrow="Developer Tools"
        title="WebMCP Test Panel"
        description="Client‑side Model Context Protocol (WebMCP) sandbox for testing browser‑native AI tool interaction. No backend, no SSE, no subscriptions."
        action={
          <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            Tools only
          </span>
        }
      />
      <LaunchpadWebMcpTestPanel />
    </>
  );
}
