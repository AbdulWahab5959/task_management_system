import { ChevronLeft, ChevronRight, Eye, Inbox, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../../components/common/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import { adminContactMessagesService } from '../../services/admin-contact-messages.service';
import type { ContactMessage, ContactMessageStatus, PaginatedContactMessages } from '../../types/contact-message.types';
import { cn } from '../../utils/cn';

const statusOptions: ContactMessageStatus[] = ['new', 'read', 'replied'];

const statusBadgeClasses: Record<ContactMessageStatus, string> = {
  new: 'border-cyan-200 bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100',
  read: 'border-slate-200 bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  replied: 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
};

function formatStatus(status: ContactMessageStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getInitialPagination(): PaginatedContactMessages {
  return {
    data: [],
    current_page: 1,
    from: null,
    last_page: 1,
    per_page: 10,
    to: null,
    total: 0,
  };
}

function StatusBadge({ status }: { status: ContactMessageStatus }) {
  return (
    <span className={cn('dashboard-badge', statusBadgeClasses[status])}>
      {formatStatus(status)}
    </span>
  );
}

export default function ContactMessagesPage() {
  const [pagination, setPagination] = useState<PaginatedContactMessages>(getInitialPagination);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [viewLoadingId, setViewLoadingId] = useState<number | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const messages = pagination.data;
  const hasMessages = messages.length > 0;

  const listParams = useMemo(
    () => ({
      page,
      per_page: 10,
      search: search || undefined,
    }),
    [page, search],
  );

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await adminContactMessagesService.list(listParams);
      setPagination(response.data);
    } catch {
      setError('Unable to load contact messages.');
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await adminContactMessagesService.list(listParams);

        if (isMounted) {
          setPagination(response.data);
        }
      } catch {
        if (isMounted) {
          setError('Unable to load contact messages.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [listParams]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const handleView = async (message: ContactMessage) => {
    setViewLoadingId(message.id);
    setActionError('');

    try {
      const response = await adminContactMessagesService.get(message.id);
      setSelectedMessage(response.data);
    } catch {
      setActionError('Unable to open this message.');
    } finally {
      setViewLoadingId(null);
    }
  };

  const handleStatusChange = async (message: ContactMessage, status: ContactMessageStatus) => {
    if (message.status === status) {
      return;
    }

    setStatusLoadingId(message.id);
    setActionError('');

    try {
      const response = await adminContactMessagesService.updateStatus(message.id, status);
      const updatedMessage = response.data;

      setPagination((current) => ({
        ...current,
        data: current.data.map((item) => (item.id === updatedMessage.id ? updatedMessage : item)),
      }));
      setSelectedMessage((current) => (current?.id === updatedMessage.id ? updatedMessage : current));
    } catch {
      setActionError('Unable to update message status.');
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteLoading(true);
    setActionError('');

    try {
      await adminContactMessagesService.delete(deleteTarget.id);
      setDeleteTarget(null);
      setSelectedMessage((current) => (current?.id === deleteTarget.id ? null : current));

      if (messages.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadMessages();
      }
    } catch {
      setActionError('Unable to delete this message.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Contact Messages"
        description="Review, update, and remove contact form submissions."
      />

      <Card>
        <CardHeader>
          <form onSubmit={handleSearch} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-md">
              <Input
                label="Search messages"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Name, email, or subject"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" icon={<Search className="h-4 w-4" aria-hidden="true" />}>
                Search
              </Button>
              {search ? (
                <Button type="button" variant="secondary" onClick={handleClearSearch}>
                  Clear
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadMessages()}
                icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              >
                Refresh
              </Button>
            </div>
          </form>
        </CardHeader>

        <CardContent className="p-0">
          {actionError ? (
            <div className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm font-medium text-rose-800">
              {actionError}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <LoadingSpinner label="Loading contact messages" />
            </div>
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">{error}</p>
              <Button type="button" variant="secondary" onClick={() => void loadMessages()}>
                Try again
              </Button>
            </div>
          ) : hasMessages ? (
            <>
              <div className="dashboard-table-scroll">
                <table className="dashboard-table dashboard-table-wide">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Sender
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Subject
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Date
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {messages.map((message) => (
                      <tr key={message.id} className="align-top transition-colors duration-150 hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <p className="max-w-44 truncate text-sm font-semibold text-slate-900">{message.name}</p>
                          <p className="max-w-56 truncate text-sm text-slate-500">{message.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="max-w-md truncate text-sm font-semibold text-slate-800">{message.subject}</p>
                          <p className="mt-0.5 max-w-md truncate text-sm text-slate-500">{message.message}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <StatusBadge status={message.status} />
                            <select
                              value={message.status}
                              disabled={statusLoadingId === message.id}
                              onChange={(event) =>
                                void handleStatusChange(message, event.target.value as ContactMessageStatus)
                              }
                              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {formatStatus(status)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                          {formatDate(message.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              isLoading={viewLoadingId === message.id}
                              onClick={() => void handleView(message)}
                              icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                            >
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleteTarget(message)}
                              icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing {pagination.from} to {pagination.to} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={page >= pagination.last_page}
                    onClick={() => setPage((current) => current + 1)}
                    icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-6 py-12">
              <EmptyState
                icon={<Inbox className="h-6 w-6" aria-hidden="true" />}
                title={search ? 'No matching messages' : 'No contact messages'}
                description={search ? 'Try another name, email, or subject.' : 'New contact form submissions will appear here.'}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Message Modal */}
      {selectedMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6">
          <div className="max-h-full w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-indigo-600">{selectedMessage.email}</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-slate-900">{selectedMessage.subject}</h2>
              </div>
              <button
                type="button"
                aria-label="Close message"
                onClick={() => setSelectedMessage(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Name</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedMessage.name}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Status</p>
                  <div className="mt-2">
                    <StatusBadge status={selectedMessage.status} />
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Received</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selectedMessage.created_at)}</p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedMessage.message}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Delete message?</CardTitle>
                <p className="mt-0.5 text-sm text-slate-500">
                  This will permanently remove the message from <strong>{deleteTarget.email}</strong>.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button type="button" variant="danger" isLoading={deleteLoading} onClick={() => void handleDelete()}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
