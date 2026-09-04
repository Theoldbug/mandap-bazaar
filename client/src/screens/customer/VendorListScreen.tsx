import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EVENT_CATEGORIES, type EventCategory, type PaginatedResponse, type VendorProfile } from '@shared/types';
import { Chip } from '@/components/ui/Chip';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { CardSkeleton, EmptyState, ErrorState, VendorCard } from '@/components/VendorCard';
import { ChevronLeft } from 'lucide-react';

export function VendorListScreen() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>(
    (category as EventCategory) || 'marriage_decor'
  );

  const currentCategory = EVENT_CATEGORIES.find((c) => c.value === selectedCategory);
  const { data, loading, error, refetch } = useFetch(
    () => api.get<PaginatedResponse<VendorProfile>>(`/vendors?category=${selectedCategory}`),
    [selectedCategory]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5 text-text-secondary" />
        </button>
        <h1 className="text-xl font-bold text-text-secondary">{currentCategory?.label || 'Vendors'}</h1>
        <div className="w-10" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" role="tablist" aria-label="Event categories">
        {EVENT_CATEGORIES.map(({ value, label }) => (
          <Chip
            key={value}
            variant="filter"
            selected={selectedCategory === value}
            onClick={() => setSelectedCategory(value)}
            role="tab"
            aria-selected={selectedCategory === value}
          >
            {label}
          </Chip>
        ))}
      </div>

      <div className="space-y-4" role="list" aria-label="Vendors">
        {loading && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {data && data.data.length === 0 && (
          <EmptyState
            title={`No ${currentCategory?.label ?? ''} vendors yet`}
            subtitle="Try another category"
          />
        )}
        {data?.data.map((vendor) => (
          <VendorCard key={vendor.id} vendor={vendor} />
        ))}
      </div>
    </div>
  );
}
