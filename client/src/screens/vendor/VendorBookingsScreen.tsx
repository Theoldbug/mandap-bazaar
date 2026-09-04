import { useState } from 'react';
import {
  EVENT_CATEGORIES,
  type BookingStatus,
  type BookingWithDetails,
  type PaginatedResponse,
  type TransitionResult,
} from '@shared/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { CardSkeleton, ErrorState } from '@/components/VendorCard';
import { ApiError, api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCurrency, formatDate, formatTimeSlot, getStatusColor } from '@/lib/utils';
import { Calendar, MapPin, User, CheckCircle, AlertTriangle } from 'lucide-react';

const TABS: { value: BookingStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface Notice {
  kind: 'success' | 'conflict' | 'error';
  message: string;
}

export function VendorBookingsScreen() {
  const [activeTab, setActiveTab] = useState<BookingStatus>('pending');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useFetch(
    () => api.get<PaginatedResponse<BookingWithDetails>>('/bookings?limit=50'),
    []
  );

  const bookings = data?.data ?? [];
  const counts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});
  const filtered = bookings.filter((b) => b.status === activeTab);

  const transition = async (booking: BookingWithDetails, status: BookingStatus) => {
    if (busyId) return;
    setBusyId(booking.id);
    setNotice(null);
    try {
      const result = await api.put<TransitionResult>(`/bookings/${booking.id}/status`, { status });
      if (status === 'accepted') {
        const declined = result.auto_declined_count ?? 0;
        setNotice({
          kind: 'success',
          message:
            declined > 0
              ? `Booking accepted — ${declined} conflicting pending request${declined > 1 ? 's were' : ' was'} automatically declined.`
              : 'Booking accepted.',
        });
      } else {
        setNotice({ kind: 'success', message: `Booking ${status}.` });
      }
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SLOT_CONFLICT') {
        setNotice({
          kind: 'conflict',
          message: 'You already have an accepted booking for that date and time slot — this request cannot be accepted.',
        });
      } else {
        setNotice({ kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong' });
      }
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-secondary">Booking Requests</h1>

      {notice && (
        <div
          className={`p-3 rounded-card text-sm flex items-start gap-2 ${
            notice.kind === 'success'
              ? 'bg-emerald-50 text-emerald-800'
              : notice.kind === 'conflict'
                ? 'bg-amber-50 text-amber-800'
                : 'bg-red-50 text-red-700'
          }`}
          role={notice.kind === 'success' ? 'status' : 'alert'}
        >
          {notice.kind === 'success' ? (
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          )}
          <span className="flex-1">{notice.message}</span>
          <button onClick={() => setNotice(null)} className="font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4" role="tablist" aria-label="Booking status">
        {TABS.map(({ value, label }) => (
          <Chip
            key={value}
            variant="filter"
            selected={activeTab === value}
            onClick={() => setActiveTab(value)}
            role="tab"
            aria-selected={activeTab === value}
          >
            {label}
            {counts[value] ? ` (${counts[value]})` : ''}
          </Chip>
        ))}
      </div>

      {loading && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && filtered.length === 0 && (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-text-secondary mb-1">
            No {activeTab} bookings
          </h3>
          <p className="text-sm text-gray-500">Requests from customers will show up here.</p>
        </Card>
      )}

      <div className="space-y-4" role="list" aria-label="Booking requests">
        {filtered.map((booking) => (
          <RequestCard
            key={booking.id}
            booking={booking}
            busy={busyId === booking.id}
            onTransition={transition}
          />
        ))}
      </div>
    </div>
  );
}

function RequestCard({
  booking,
  busy,
  onTransition,
}: {
  booking: BookingWithDetails;
  busy: boolean;
  onTransition: (booking: BookingWithDetails, status: BookingStatus) => void;
}) {
  const eventLabel =
    EVENT_CATEGORIES.find((c) => c.value === booking.event_type)?.label ?? booking.event_type;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <h3 className="font-semibold text-text-secondary truncate">
              {booking.customer?.full_name ?? 'Customer'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 mt-1.5 text-sm text-gray-500">
            <span className="px-2 py-0.5 bg-gray-100 rounded-full">{eventLabel}</span>
            {booking.package && <Badge variant="outline" size="sm">{booking.package.name}</Badge>}
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
          {booking.special_instructions && (
            <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-2 italic">
              "{booking.special_instructions}"
            </p>
          )}
        </div>
        <Badge className={getStatusColor(booking.status)} size="sm">
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
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

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
        <span className="text-sm text-gray-600">
          Total: <span className="font-semibold text-text-secondary">{formatCurrency(booking.total_amount)}</span>
        </span>
        <div className="flex gap-2">
          {booking.status === 'pending' && (
            <>
              <Button size="sm" disabled={busy} onClick={() => onTransition(booking, 'accepted')}>
                Accept
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onTransition(booking, 'declined')}>
                Decline
              </Button>
            </>
          )}
          {booking.status === 'accepted' && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onTransition(booking, 'completed')}>
              Mark Completed
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
