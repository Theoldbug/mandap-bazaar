import { Link } from 'react-router-dom';
import { EVENT_CATEGORIES, type PaginatedResponse, type VendorProfile } from '@shared/types';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { CardSkeleton, EmptyState, ErrorState, VendorCard } from '@/components/VendorCard';

const categoryImages: Record<string, string> = {
  marriage_decor: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
  haldi_decor: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80',
  mehendi_sangeet: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&q=80',
  ring_ceremony: 'https://images.unsplash.com/photo-1603974701363-640b42b5e9b6?w=800&q=80',
  birthday_decor: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80',
  food_stalls: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
  dj_lighting: 'https://images.unsplash.com/photo-1514521293181-8b76d3f674b1?w=800&q=80',
};

export function HomeScreen() {
  const { data, loading, error, refetch } = useFetch(
    () => api.get<PaginatedResponse<VendorProfile>>('/vendors?limit=5'),
    []
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-text-secondary mb-4">Event Categories</h2>
        <p className="text-sm text-gray-500 mb-4">Select a category to explore top vendors and decor</p>
        <div className="grid grid-cols-2 gap-3">
          {EVENT_CATEGORIES.map(({ value, label, icon }) => (
            <Link
              key={value}
              to={`/category/${value}`}
              className="group relative aspect-square rounded-card overflow-hidden"
            >
              <img
                src={categoryImages[value]}
                alt={label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4">
                <span className="text-3xl mb-1">{icon}</span>
                <h3 className="text-white font-semibold text-center text-base">{label}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-secondary">Popular Vendors</h2>
          <Link to="/search" className="text-sm text-primary font-medium hover:underline">
            View All
          </Link>
        </div>
        <div className="space-y-3">
          {loading && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {data && data.data.length === 0 && (
            <EmptyState title="No vendors yet" subtitle="Check back soon!" />
          )}
          {data?.data.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </section>
    </div>
  );
}
