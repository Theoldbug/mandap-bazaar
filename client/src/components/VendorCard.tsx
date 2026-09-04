import { Link } from 'react-router-dom';
import type { VendorProfile } from '@shared/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Star, MapPin, BadgeCheck } from 'lucide-react';

export function VendorCard({ vendor }: { vendor: VendorProfile }) {
  return (
    <Link to={`/vendors/${vendor.id}`} className="block">
      <Card className="p-4" hover>
        <div className="flex gap-4 items-start">
          <Avatar name={vendor.business_name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-text-secondary truncate">{vendor.business_name}</h3>
              {vendor.is_verified && (
                <BadgeCheck className="h-4 w-4 text-emerald flex-shrink-0" aria-label="Verified vendor" />
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="truncate">{vendor.city}, {vendor.state}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{vendor.description}</p>
          </div>
          <Badge variant="success" className="flex items-center gap-1 flex-shrink-0">
            <Star className="h-3 w-3" aria-hidden="true" />
            {vendor.rating > 0 ? vendor.rating.toFixed(1) : 'New'}
          </Badge>
        </div>
      </Card>
    </Link>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center py-12 text-gray-500">
      <p className="font-medium text-text-secondary">{title}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm font-medium text-primary hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-surface rounded-card p-4 shadow-card">
      <div className="flex gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
