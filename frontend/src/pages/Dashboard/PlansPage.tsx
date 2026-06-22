import { Eye, EyeOff, Pencil, Plus, RefreshCw, Star, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../../components/common/Button';
import { Card, CardContent, CardHeader } from '../../components/common/Card';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/dashboard/EmptyState';
import PageHeader from '../../components/dashboard/PageHeader';
import { adminPlansService } from '../../services/admin-plans.service';
import type { Plan, PlanFormData } from '../../types/plan.types';

interface PlanFormModalProps {
  plan: Plan | null;
  onClose: () => void;
  onSave: (data: PlanFormData) => Promise<void>;
  saving: boolean;
}

function PlanFormModal({ plan, onClose, onSave, saving }: PlanFormModalProps) {
  const [name, setName] = useState(plan?.name ?? '');
  const [slug, setSlug] = useState(plan?.slug ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [price, setPrice] = useState(plan?.price ?? '0');
  const [interval, setInterval_] = useState<'month' | 'year'>(plan?.interval ?? 'month');
  const [featuresText, setFeaturesText] = useState((plan?.features ?? []).join('\n'));
  const [limitsText, setLimitsText] = useState(
    plan?.limits ? Object.entries(plan.limits).map(([k, v]) => `${k}: ${v}`).join('\n') : '',
  );
  const [isPopular, setIsPopular] = useState(plan?.is_popular ?? false);
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(plan?.sort_order?.toString() ?? '0');
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    if (!slug.trim()) {
      setError('Slug is required.');
      return;
    }

    const features = featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    if (features.length === 0) {
      setError('At least one feature is required.');
      return;
    }

    const limits: Record<string, number | string> = {};
    for (const line of limitsText.split('\n').filter(Boolean)) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      if (key.trim()) {
        const num = Number(value);
        limits[key.trim()] = Number.isNaN(num) ? value : num;
      }
    }

    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        price: Number(price),
        interval,
        features,
        limits,
        is_popular: isPopular,
        is_active: isActive,
        sort_order: Number(sortOrder) || 0,
      });
    } catch {
      setError('Failed to save plan. Check your input.');
    }
  };

  const generateSlug = () => {
    const generated = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (generated) {
      setSlug(generated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm pt-10 pb-10">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            {plan ? 'Edit Plan' : 'Create Plan'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error ? (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Input
                label="Plan Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pro"
                required
              />
            </div>
            <div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. pro"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={generateSlug}
                  className="mb-0.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  title="Generate from name"
                >
                  Auto
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this plan"
              rows={2}
              className="h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Input
              label="Price ($)"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="plan-interval">
                Interval
              </label>
              <select
                id="plan-interval"
                value={interval}
                onChange={(e) => setInterval_(e.target.value as 'month' | 'year')}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            <Input
              label="Sort Order"
              type="number"
              min="0"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Features (one per line)
            </label>
            <textarea
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="Up to 10 Team Members&#10;50 Active Projects&#10;Priority Support"
              rows={5}
              className="h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none font-mono"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Limits (key: value, one per line)
            </label>
            <textarea
              value={limitsText}
              onChange={(e) => setLimitsText(e.target.value)}
              placeholder="users: 10&#10;projects: 50&#10;storage: 50&#10;support: priority"
              rows={3}
              className="h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none font-mono"
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-slate-700">Popular plan</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {plan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDate(value: string | undefined | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await adminPlansService.list();
        if (isMounted) {
          setPlans(response.data);
        }
      } catch {
        if (isMounted) {
          setError('Unable to load plans.');
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
  }, []);

  const loadPlans = async () => {
    try {
      const response = await adminPlansService.list();
      setPlans(response.data);
    } catch {
      setActionError('Unable to reload plans.');
    }
  };

  const filteredPlans = plans.filter((plan) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      plan.name.toLowerCase().includes(q) ||
      plan.slug.toLowerCase().includes(q) ||
      (plan.description ?? '').toLowerCase().includes(q)
    );
  });

  const handleCreate = async (data: PlanFormData) => {
    setSaving(true);
    setActionError('');

    try {
      await adminPlansService.create(data);
      setShowForm(false);
      setEditingPlan(null);
      await loadPlans();
    } catch {
      throw new Error('Failed to create plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data: PlanFormData) => {
    if (!editingPlan) return;
    setSaving(true);
    setActionError('');

    try {
      await adminPlansService.update(editingPlan.id, data);
      setShowForm(false);
      setEditingPlan(null);
      await loadPlans();
    } catch {
      throw new Error('Failed to update plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setActionError('');

    try {
      await adminPlansService.delete(id);
      setDeleteConfirmId(null);
      await loadPlans();
    } catch {
      setActionError('Failed to delete plan.');
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    setTogglingId(plan.id);
    setActionError('');

    try {
      await adminPlansService.update(plan.id, { is_active: !plan.is_active });
      await loadPlans();
    } catch {
      setActionError('Failed to update plan status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleTogglePopular = async (plan: Plan) => {
    setTogglingId(plan.id);
    setActionError('');

    try {
      await adminPlansService.update(plan.id, { is_popular: !plan.is_popular });
      await loadPlans();
    } catch {
      setActionError('Failed to update popular status.');
    } finally {
      setTogglingId(null);
    }
  };

  const openEditForm = (plan: Plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const openCreateForm = () => {
    setEditingPlan(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Plans"
        description="Create and manage subscription plans for your SaaS."
        action={
          <Button onClick={openCreateForm} icon={<Plus className="h-4 w-4" />}>
            New Plan
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search plans..."
                className="h-10 max-w-xs rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-700 outline-none transition-all duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void loadPlans()}
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {actionError ? (
            <div className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm font-medium text-rose-800">
              {actionError}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <LoadingSpinner label="Loading plans" />
            </div>
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">{error}</p>
              <Button variant="secondary" onClick={() => void loadPlans()}>
                Try again
              </Button>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="px-6 py-12">
              <EmptyState
                icon={<Star className="h-6 w-6" />}
                title={search ? 'No matching plans' : 'No plans yet'}
                description={search ? 'Try a different search term.' : 'Create your first plan to get started.'}
                action={
                  !search ? (
                    <Button size="sm" onClick={openCreateForm}>
                      Create Plan
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Plan
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Price
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Interval
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Popular
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Order
                      </th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Created
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredPlans.map((plan) => (
                      <tr key={plan.id} className="transition-colors duration-150 hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{plan.slug}</p>
                          {plan.description ? (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{plan.description}</p>
                          ) : null}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-900">
                            {Number(plan.price) === 0 ? 'Free' : `$${Number(plan.price).toFixed(2)}`}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 capitalize">
                            {plan.interval}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              plan.is_active
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {plan.is_popular ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                              <Star className="h-3 w-3 fill-amber-500" />
                              Popular
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{plan.sort_order}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                          {formatDate(plan.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(plan)}
                              disabled={togglingId === plan.id}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 transition-colors"
                              title={plan.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {plan.is_active ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePopular(plan)}
                              disabled={togglingId === plan.id}
                              className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${
                                plan.is_popular
                                  ? 'text-amber-500 hover:bg-amber-50 hover:text-amber-600'
                                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                              }`}
                              title={plan.is_popular ? 'Remove popular' : 'Mark as popular'}
                            >
                              <Star className={`h-4 w-4 ${plan.is_popular ? 'fill-amber-500' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(plan)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {deleteConfirmId === plan.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(plan.id)}
                                  className="rounded-lg bg-rose-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-rose-600 transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(plan.id)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 px-6 py-4">
                <p className="text-sm text-slate-500">
                  Showing {filteredPlans.length} of {plans.length} plan{plans.length !== 1 ? 's' : ''}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {showForm ? (
        <PlanFormModal
          plan={editingPlan}
          onClose={closeForm}
          onSave={editingPlan ? handleUpdate : handleCreate}
          saving={saving}
        />
      ) : null}
    </>
  );
}