import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { BookingWithDetails, PaginatedResponse, TransitionResult } from '@shared/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { CardSkeleton, ErrorState } from '@/components/VendorCard';
import { ApiError, api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { EVENT_CATEGORIES } from '@shared/types';
import { formatCurrency, formatDate, formatTimeSlot, getStatusColor } from '@/lib/utils';
import { Calendar, MapPin, CheckCircle } from 'lucide-react';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function MyBookingsScreen() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const location = useLocation();
  const [justBooked, setJustBooked] = useState<boolean>(Boolean(location.state?.justBooked));
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useFetch(
    () => api.get<PaginatedResponse<BookingWithDetails>>('/bookings?limit=50'),
    []
  );

  const bookings = data?.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const filteredBookings = bookings.filter((b) =>
    activeTab === 'upcoming' ? b.event_date >= today : b.event_date < today
  );

  const cancelBooking = async (id: string) => {
    if (!window.confirm('Cancel this booking request?')) return;
    setActionError(null);
    try {
      await api.post<TransitionResult>(`/bookings/${id}/cancel`);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to cancel booking');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-secondary">My Bookings</h1>

      {justBooked && (
        <div
          className="p-3 rounded-card bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2"
          role="status"
        >
          <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1">Booking requested! The vendor will confirm shortly.</span>
          <button onClick={() => setJustBooked(false)} className="font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-card bg-red-50 text-red-700 text-sm" role="alert">
          {actionError}
        </div>
      )}

      <div className="flex gap-2" role="tablist" aria-label="Booking period">
        <Chip
          variant="filter"
          selected={activeTab === 'upcoming'}
          onClick={() => setActiveTab('upcoming')}
          role="tab"
          aria-selected={activeTab === 'upcoming'}
        >
          Upcoming
        </Chip>
        <Chip
          variant="filter"
          selected={activeTab === 'past'}
          onClick={() => setActiveTab('past')}
          role="tab"
          aria-selected={activeTab === 'past'}
        >
          Past Bookings
        </Chip>
      </div>

      {loading && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && filteredBookings.length === 0 && (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-text-secondary mb-1">
            {activeTab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
          </h3>
          <p className="text-sm text-gray-500">
            {activeTab === 'upcoming'
              ? 'Start exploring vendors and book your dream event!'
              : 'Your completed bookings will appear here.'}
          </p>
        </Card>
      )}

      <div className="space-y-4" role="list" aria-label="Bookings">
        {filteredBookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} onCancel={cancelBooking} />
        ))}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
}: {
  booking: BookingWithDetails;
  onCancel: (id: string) => void;
}) {
  const eventLabel =
    EVENT_CATEGORIES.find((c) => c.value === booking.event_type)?.label ?? booking.event_type;
  const cancellable = booking.status === 'pending' || booking.status === 'accepted';

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        {booking.package?.images?.[0] && (
          <img
            src={booking.package.images[0]}
            alt={booking.package?.name ?? 'Package'}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-secondary truncate">
            {booking.vendor?.business_name ?? 'Vendor'}
          </h3>
          <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-500">
            <span className="px-2 py-0.5 bg-gray-100 rounded-full">{eventLabel}</span>
            {booking.package && (
              <Badge variant="outline" size="sm">{booking.package.name}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {formatDate(booking.event_date)} · {formatTimeSlot(booking.event_time)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate">{booking.venue_address}, {booking.venue_city}</span>
          </div>
        </div>
        <Badge className={getStatusColor(booking.status)} size="sm">
          {statusLabels[booking.status]}
        </Badge>
      </div>

      {booking.addons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {booking.addons.map((a) => (
            <Badge key={a.addon_id} variant="outline" size="sm">
              {a.name} (+{formatCurrency(a.price)})
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Total: <span className="font-semibold text-text-secondary">{formatCurrency(booking.total_amount)}</span>
        </span>
        {cancellable && (
          <button
            onClick={() => onCancel(booking.id)}
            className="text-sm text-red-600 font-medium hover:underline"
          >
            Cancel Booking
          </button>
        )}
      </div>
    </Card>
  );
}
