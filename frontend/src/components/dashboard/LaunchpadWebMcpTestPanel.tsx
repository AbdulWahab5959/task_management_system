import { useEffect, useRef, useState } from 'react';
import { Monitor, ShieldCheck, ShieldOff, FileText, Code, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../common/Card';

/* ──────────────────────────────────────────────
   LaunchpadWebMcpTestPanel
   Client-side WebMCP test panel — Tools only.
   No backend MCP server, no SSE, no stdio,
   no Resources, no Prompts.
   ────────────────────────────────────────────── */

type ExecutionStatus = 'idle' | 'success' | 'error';
interface ExecutionResult {
  status: ExecutionStatus;
  message: string;
  data?: unknown;
}

interface PreviewSettings {
  project_name: string;
  debug_enabled: boolean;
  dashboard_note: string;
}

const DECLARATIVE_TOOL_NAME = 'update-launchpad-preview-settings';
const DECLARATIVE_TOOL_DESCRIPTION =
  'Updates harmless preview-only Launchpad UI settings for testing browser-native AI tool interaction.';
const declarativeToolAttributes = {
  toolname: DECLARATIVE_TOOL_NAME,
  tooldescription: DECLARATIVE_TOOL_DESCRIPTION,
} as Record<string, string>;

const JS_TOOL_NAME = 'update-launchpad-preview-settings-js';
const JS_TOOL_DESCRIPTION = 'JS-registered tool for updating harmless preview-only Launchpad UI settings.';

/** JSON Schema for the JS‑registered tool */
const jsToolSchema = {
  type: 'object',
  properties: {
    project_name: { type: 'string', description: 'The project name to set' },
    debug_enabled: { type: 'boolean', description: 'Enable debug mode' },
    dashboard_note: { type: 'string', description: 'A preview note for the dashboard' },
  },
  required: ['project_name'],
};

function getModelContext() {
  return (document as any).modelContext || (navigator as any).modelContext || null;
}


export default function LaunchpadWebMcpTestPanel() {
  const [preview, setPreview] = useState<PreviewSettings>({
    project_name: '',
    debug_enabled: false,
    dashboard_note: '',
  });

  const [webMcpAvailable, setWebMcpAvailable] = useState(false);
  const [secureContext, setSecureContext] = useState(false);
  const [jsToolRegistered, setJsToolRegistered] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult>({ status: 'idle', message: 'No execution yet.' });

  const controllerRef = useRef<AbortController | null>(null);
  const registeredRef = useRef(false);

  const [debugInfo, setDebugInfo] = useState({
    typeofDocumentModelContext: typeof (document as any).modelContext,
    typeofNavigatorModelContext: typeof (navigator as any).modelContext,
    typeofRegisterTool: 'not_checked' as string,
    registrationAttemptCount: 0,
    lastRegistrationError: '',
    currentUrl: window.location.href,
    isSecureContext: window.isSecureContext,
  });

  useEffect(() => {
    const isSecure = window.isSecureContext;
    setSecureContext(isSecure);

    console.log('[WebMCP] Panel mounted');

    const ctx = getModelContext();
    console.log('[WebMCP] modelContext object found:', ctx !== null);

    const hasRegister = ctx !== null && typeof ctx.registerTool === 'function';
    console.log('[WebMCP] registerTool function found:', hasRegister);

    setWebMcpAvailable(hasRegister);

    setDebugInfo((prev) => ({
      ...prev,
      typeofDocumentModelContext: typeof (document as any).modelContext,
      typeofNavigatorModelContext: typeof (navigator as any).modelContext,
      typeofRegisterTool: hasRegister ? 'function' : typeof ctx?.registerTool,
    }));

    if (!hasRegister) {
      setJsToolRegistered(false);
      return;
    }

    // Guard: prevent duplicate registration from React Strict Mode / Vite dev double-mount
    if (registeredRef.current) {
      console.log('[WebMCP] Tool already registered by this component instance, skipping re-registration');
      setJsToolRegistered(true);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    console.log('[WebMCP] Tool registration started for:', JS_TOOL_NAME);
    setDebugInfo((prev) => ({
      ...prev,
      registrationAttemptCount: prev.registrationAttemptCount + 1,
    }));

    try {
      ctx.registerTool(
        {
          name: JS_TOOL_NAME,
          description: JS_TOOL_DESCRIPTION,
          inputSchema: jsToolSchema,
          handler: (params: Record<string, unknown>) => {
            const { project_name, debug_enabled, dashboard_note } = (params ?? {}) as Record<string, unknown>;

            if (!project_name || typeof project_name !== 'string' || project_name.trim().length === 0) {
              return JSON.stringify({ success: false, error: 'project_name is required and must be a non-empty string.' });
            }

            const sanitised: PreviewSettings = {
              project_name: project_name.trim(),
              debug_enabled: Boolean(debug_enabled),
              dashboard_note: typeof dashboard_note === 'string' ? dashboard_note.trim() : '',
            };

            setPreview(sanitised);
            setExecutionResult({
              status: 'success',
              message: 'Preview settings updated for project "' + sanitised.project_name + '".',
              data: sanitised,
            });

            return JSON.stringify({ success: true, data: sanitised });
          },
        },
        { signal: controller.signal },
      );

      setJsToolRegistered(true);
      registeredRef.current = true;
      console.log('[WebMCP] Tool registration success');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('[WebMCP] Tool registration failed:', e);
      setJsToolRegistered(false);
      setDebugInfo((prev) => ({
        ...prev,
        lastRegistrationError: errorMessage,
      }));
    }

    return () => {
      console.log('[WebMCP] AbortController cleanup ran');
      controller.abort();
      controllerRef.current = null;
      registeredRef.current = false;
    };
  }, []);


  const statusIcon = (ok: boolean) =>
    ok
      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
      : <XCircle className="h-4 w-4 text-rose-500" aria-hidden="true" />;

  const executionIcon = (status: ExecutionStatus) => {
    if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />;
    if (status === 'error') return <AlertTriangle className="h-4 w-4 text-rose-500" aria-hidden="true" />;
    return <Monitor className="h-4 w-4 text-slate-400" aria-hidden="true" />;
  };


  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left column — status + execution result */}
      <div className="space-y-6">
        {/* Status card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                <Monitor className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>WebMCP Status</CardTitle>
                <CardDescription>Client-side Model Context Protocol availability.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* WebMCP available */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm">
              <span className="font-medium text-slate-700">WebMCP available</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                {statusIcon(webMcpAvailable)}
                {webMcpAvailable ? 'Yes' : 'No'}
              </span>
            </div>

            {/* Secure context */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm">
              <span className="font-medium text-slate-700">Secure context</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                {secureContext
                  ? <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  : <ShieldOff className="h-4 w-4 text-amber-500" aria-hidden="true" />
                }
                {secureContext ? 'Yes' : 'No'}
              </span>
            </div>

            {/* Declarative form present */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm">
              <span className="font-medium text-slate-700">Declarative form present</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                {statusIcon(true)}
                Yes
              </span>
            </div>

            {/* JS tool registered */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm">
              <span className="font-medium text-slate-700">JS tool registered</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                {webMcpAvailable ? statusIcon(jsToolRegistered) : statusIcon(false)}
                {webMcpAvailable ? (jsToolRegistered ? 'Yes' : 'No') : 'N/A'}
              </span>
            </div>

            {/* Debug info */}
            <details className="group rounded-lg border border-slate-200 px-4 py-3 text-sm">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-400 select-none">
                Debug Info
              </summary>
              <pre className="mt-3 overflow-x-auto text-[11px] leading-relaxed text-slate-600">
{`typeof document.modelContext  → ${debugInfo.typeofDocumentModelContext}
typeof navigator.modelContext → ${debugInfo.typeofNavigatorModelContext}
typeof registerTool           → ${debugInfo.typeofRegisterTool}
registration attempt count    → ${debugInfo.registrationAttemptCount}
last registration error       → ${debugInfo.lastRegistrationError || '(none)'}
current page URL              → ${debugInfo.currentUrl}
window.isSecureContext        → ${String(debugInfo.isSecureContext)}`}
              </pre>
            </details>
          </CardContent>
        </Card>

        {/* Last execution result */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Last Execution</CardTitle>
                <CardDescription>Result from the most recent tool invocation.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              {executionIcon(executionResult.status)}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">
                  {executionResult.status === 'idle' ? 'Idle' : executionResult.status === 'success' ? 'Success' : 'Error'}
                </p>
                <p className="mt-0.5 text-slate-500">{executionResult.message}</p>
                {executionResult.data ? (
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100">
                    {JSON.stringify(executionResult.data, null, 2)}
                  </pre>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Right column — declarative tool form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
              <Code className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Declarative Tool Form</CardTitle>
              <CardDescription>
                Tool: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-semibold text-slate-800">{DECLARATIVE_TOOL_NAME}</code>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            {...declarativeToolAttributes}
            className="space-y-5"
            onSubmit={(e) => e.preventDefault()}
          >
            {/* project_name */}
            <div>
              <label htmlFor="mcp-project-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Project name <span className="text-rose-500">*</span>
              </label>
              <input
                id="mcp-project-name"
                name="project_name"
                type="text"
                required
                value={preview.project_name}
                onChange={(e) => setPreview((p) => ({ ...p, project_name: e.target.value }))}
                placeholder="e.g. my-cool-project"
                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* debug_enabled */}
            <div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Debug enabled</p>
                  <p className="mt-0.5 text-sm text-slate-500">Enable verbose debug output.</p>
                </div>
                <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center" aria-label="Toggle debug">
                  <input
                    type="checkbox"
                    name="debug_enabled"
                    className="peer sr-only"
                    checked={preview.debug_enabled}
                    onChange={(e) => setPreview((p) => ({ ...p, debug_enabled: e.target.checked }))}
                  />
                  <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors duration-200 peer-checked:bg-indigo-600" />
                  <span className="relative left-0.5 inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 peer-checked:translate-x-5" />
                </label>
              </div>
            </div>

            {/* dashboard_note */}
            <div>
              <label htmlFor="mcp-dashboard-note" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Dashboard note
              </label>
              <textarea
                id="mcp-dashboard-note"
                name="dashboard_note"
                rows={3}
                value={preview.dashboard_note}
                onChange={(e) => setPreview((p) => ({ ...p, dashboard_note: e.target.value }))}
                placeholder="Optional preview note for the dashboard."
                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
              />
            </div>

            {/* Current preview values display */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Current preview values</p>
              <pre className="mt-2 overflow-x-auto text-xs text-indigo-900">
{JSON.stringify({ project_name: preview.project_name || '(empty)', debug_enabled: preview.debug_enabled, dashboard_note: preview.dashboard_note || '(empty)' }, null, 2)}
              </pre>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

