import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Review, VendorWithPackages } from '@shared/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState, ErrorState } from '@/components/VendorCard';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { ChevronLeft, MapPin, Check, Star, BadgeCheck } from 'lucide-react';

export function VendorDetailScreen() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useFetch(
    () => api.get<{ vendor: VendorWithPackages }>(`/vendors/${vendorId}`),
    [vendorId]
  );
  const { data: reviewData } = useFetch(
    () => api.get<{ reviews: Review[] }>(`/vendors/${vendorId}/reviews`),
    [vendorId]
  );

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const vendor = data.vendor;
  const reviews = reviewData?.reviews ?? [];
  const coverImage = vendor.packages[0]?.images[0];

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5 text-text-secondary" />
        </button>
        <h1 className="text-xl font-bold text-text-secondary flex-1 text-center truncate">
          {vendor.business_name}
        </h1>
        <div className="w-10" />
      </div>

      {coverImage && (
        <div className="relative aspect-[16/9] rounded-card overflow-hidden">
          <img src={coverImage} alt={vendor.business_name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-text-secondary">{vendor.business_name}</h2>
            {vendor.is_verified && (
              <BadgeCheck className="h-5 w-5 text-emerald" aria-label="Verified vendor" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span>{vendor.city}, {vendor.state}</span>
            {vendor.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
                {vendor.rating.toFixed(1)} ({vendor.total_reviews} reviews)
              </span>
            )}
          </div>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed">{vendor.description}</p>

        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-lg font-semibold text-text-secondary mb-4">Available Packages</h3>
          {vendor.packages.length === 0 && (
            <EmptyState title="No packages listed yet" />
          )}
          <div className="space-y-3">
            {vendor.packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`w-full p-4 rounded-card border-2 transition-all text-left ${
                  selectedPackage === pkg.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-text-secondary mb-1">{pkg.name}</h4>
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{pkg.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {pkg.inclusions.slice(0, 4).map((item, i) => (
                        <Badge key={i} variant="outline" size="sm">
                          <Check className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
                          {item}
                        </Badge>
                      ))}
                      {pkg.inclusions.length > 4 && (
                        <Badge variant="outline" size="sm">+{pkg.inclusions.length - 4} more</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-lg font-bold text-primary">{formatCurrency(pkg.starting_price)}</span>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedPackage === pkg.id ? 'border-primary bg-primary' : 'border-gray-300'
                      }`}
                      aria-hidden="true"
                    >
                      {selectedPackage === pkg.id && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-lg font-semibold text-text-secondary mb-4">Reviews</h3>
            <div className="space-y-3">
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="p-4 bg-surface rounded-card shadow-card">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                        {getInitials(review.customer_name || 'A')}
                      </span>
                      <span className="text-sm font-medium text-text-secondary">
                        {review.customer_name || 'Anonymous'}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-sm text-amber font-medium">
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      {review.rating}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{review.comment}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(review.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {vendor.packages.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-surface border-t border-gray-100 p-4 safe-area-bottom">
          <Button
            size="lg"
            className="w-full"
            disabled={!selectedPackage}
            onClick={() => selectedPackage && navigate(`/customize/${selectedPackage}`)}
          >
            Select & Customise Package
          </Button>
        </div>
      )}
    </div>
  );
}
