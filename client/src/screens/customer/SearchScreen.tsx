import { useEffect, useState } from 'react';
import { EVENT_CATEGORIES, type EventCategory, type PaginatedResponse, type VendorProfile } from '@shared/types';
import { Chip } from '@/components/ui/Chip';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { CardSkeleton, EmptyState, ErrorState, VendorCard } from '@/components/VendorCard';
import { Search } from 'lucide-react';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<EventCategory | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const params = new URLSearchParams();
  if (debounced) params.set('search', debounced);
  if (category) params.set('category', category);

  const { data, loading, error, refetch } = useFetch(
    () => api.get<PaginatedResponse<VendorProfile>>(`/vendors?${params.toString()}`),
    [debounced, category]
  );

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-text-secondary">Search Vendors</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or description..."
          autoFocus
          className="w-full pl-10 pr-4 py-3 rounded-full bg-gray-50 border border-gray-200 text-text-secondary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          aria-label="Search vendors"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" role="tablist" aria-label="Filter by category">
        {EVENT_CATEGORIES.map(({ value, label }) => (
          <Chip
            key={value}
            variant="filter"
            selected={category === value}
            onClick={() => setCategory(category === value ? null : value)}
            role="tab"
            aria-selected={category === value}
          >
            {label}
          </Chip>
        ))}
      </div>

      <div className="space-y-4" role="list" aria-label="Search results">
        {loading && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {data && data.data.length === 0 && (
          <EmptyState title="No vendors found" subtitle="Try a different search or category" />
        )}
        {data?.data.map((vendor) => (
          <VendorCard key={vendor.id} vendor={vendor} />
        ))}
      </div>
    </div>
  );
}
