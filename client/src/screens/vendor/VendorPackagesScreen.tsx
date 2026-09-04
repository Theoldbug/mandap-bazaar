import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EVENT_CATEGORIES, type Addon, type Package } from '@shared/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { CardSkeleton, ErrorState } from '@/components/VendorCard';
import { ApiError, api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2 } from 'lucide-react';

type PackageWithAddons = Package & { addons: Addon[] };

export function VendorPackagesScreen() {
  const { data, loading, error, refetch } = useFetch(
    () => api.get<{ packages: PackageWithAddons[] }>('/packages'),
    []
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleActive = async (pkg: PackageWithAddons, active: boolean) => {
    setActionError(null);
    try {
      await api.put(`/packages/${pkg.id}`, { is_active: active });
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update package');
    }
  };

  const deletePackage = async (pkg: PackageWithAddons) => {
    if (!window.confirm(`Deactivate "${pkg.name}"? Customers will no longer see it.`)) return;
    setActionError(null);
    try {
      await api.del(`/packages/${pkg.id}`);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to delete package');
    }
  };

  const packages = data?.packages ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-secondary">My Packages</h1>
        <Link to="/vendor/packages/new">
          <Button size="sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Package
          </Button>
        </Link>
      </div>

      {actionError && (
        <div className="p-3 rounded-card bg-red-50 text-red-700 text-sm" role="alert">
          {actionError}
        </div>
      )}

      {loading && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && packages.length === 0 && (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Plus className="h-8 w-8 text-gray-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-medium text-text-secondary mb-2">No packages yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first package to start getting bookings</p>
          <Link to="/vendor/packages/new">
            <Button>Create Package</Button>
          </Link>
        </Card>
      )}

      <div className="space-y-4" role="list" aria-label="Packages">
        {packages.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} onToggle={toggleActive} onDelete={deletePackage} />
        ))}
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  onToggle,
  onDelete,
}: {
  pkg: PackageWithAddons;
  onToggle: (pkg: PackageWithAddons, active: boolean) => void;
  onDelete: (pkg: PackageWithAddons) => void;
}) {
  const categoryLabels = pkg.category.map(
    (c) => EVENT_CATEGORIES.find((e) => e.value === c)?.label ?? c
  );

  return (
    <Card className="p-3" hover>
      <div className="flex gap-4">
        {pkg.images[0] && (
          <img src={pkg.images[0]} alt={pkg.name} className="w-24 h-24 object-cover rounded-lg flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0 p-1">
          <h3 className="font-semibold text-text-secondary truncate">{pkg.name}</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {categoryLabels.map((cat, i) => (
              <Badge key={i} variant="outline" size="sm">{cat}</Badge>
            ))}
          </div>
          <p className="text-lg font-bold text-primary mt-2">{formatCurrency(pkg.starting_price)}</p>
          {pkg.addons.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{pkg.addons.length} add-on{pkg.addons.length > 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex flex-col items-center justify-between px-2">
          <Toggle
            checked={pkg.is_active}
            onChange={(checked) => onToggle(pkg, checked)}
            label={pkg.is_active ? 'Active' : 'Inactive'}
          />
          <div className="flex gap-1">
            <Link
              to={`/vendor/packages/${pkg.id}/edit`}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors inline-flex"
              aria-label={`Edit ${pkg.name}`}
            >
              <Edit className="h-4 w-4 text-gray-500" />
            </Link>
            <button
              onClick={() => onDelete(pkg)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-red-500"
              aria-label={`Delete ${pkg.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
