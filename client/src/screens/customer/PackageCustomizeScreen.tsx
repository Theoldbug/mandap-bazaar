import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  EVENT_CATEGORIES,
  TIME_SLOTS,
  type Addon,
  type EventCategory,
  type Package,
  type TimeSlot,
} from '@shared/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Toggle } from '@/components/ui/Toggle';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/VendorCard';
import { ApiError, api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCurrency } from '@/lib/utils';
import { ChevronLeft, CheckCircle, AlertTriangle } from 'lucide-react';

type PackageDetail = Package & {
  addons: Addon[];
  vendor?: { business_name: string };
};

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function PackageCustomizeScreen() {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useFetch(
    () => api.get<{ package: PackageDetail }>(`/packages/${packageId}`),
    [packageId]
  );
  const pkg = data?.package;

  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [eventType, setEventType] = useState<EventCategory | ''>('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState<TimeSlot>('evening');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; conflict?: boolean } | null>(null);

  // Pre-check default addons and default the event type once the package loads.
  useEffect(() => {
    if (pkg) {
      setSelectedAddons(pkg.addons.filter((a) => a.is_default).map((a) => a.id));
      setEventType(pkg.category[0] ?? '');
    }
  }, [pkg]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!pkg) return null;

  const addonTotal = pkg.addons
    .filter((a) => selectedAddons.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const total = pkg.starting_price + addonTotal;

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const formValid = eventType && eventDate && venueAddress.trim().length >= 5 && venueCity.trim().length >= 2;

  const handleSubmit = async () => {
    if (!formValid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post('/bookings', {
        package_id: pkg.id,
        event_type: eventType,
        event_date: eventDate,
        event_time: eventTime,
        venue_address: venueAddress.trim(),
        venue_city: venueCity.trim(),
        selected_addon_ids: selectedAddons,
        special_instructions: notes.trim() || undefined,
      });
      navigate('/bookings', { state: { justBooked: true } });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SLOT_CONFLICT') {
        setSubmitError({
          message: 'This vendor is already booked for that date and time slot. Please pick a different date or slot.',
          conflict: true,
        });
      } else {
        setSubmitError({ message: err instanceof Error ? err.message : 'Failed to request booking' });
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-64">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5 text-text-secondary" />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-bold text-text-secondary">Customise Package</h1>
          {pkg.vendor && <p className="text-sm text-gray-500">{pkg.vendor.business_name}</p>}
        </div>
        <div className="w-10" />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text-secondary">{pkg.name}</h3>
          <span className="text-lg font-bold text-primary">{formatCurrency(pkg.starting_price)}</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">Included in base package:</p>
        <div className="space-y-2">
          {pkg.inclusions.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-emerald flex-shrink-0" aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </Card>

      {pkg.addons.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text-secondary mb-4">Add-ons</h3>
          <div className="space-y-3">
            {pkg.addons.map((addon) => (
              <Card key={addon.id} className="p-4" hover>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-text-secondary mb-1">{addon.name}</h4>
                    <p className="text-sm text-gray-500">{addon.description || 'Additional enhancement for your event'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-text-secondary">{formatCurrency(addon.price)}</span>
                    <Toggle checked={selectedAddons.includes(addon.id)} onChange={() => toggleAddon(addon.id)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-text-secondary">Event Details</h3>

        <div>
          <label htmlFor="event-type" className="block text-sm font-medium text-text-secondary mb-1.5">
            Event Type
          </label>
          <select
            id="event-type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventCategory)}
            className="w-full px-4 py-3 rounded-card border border-gray-200 bg-surface text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="" disabled>Select event type</option>
            {EVENT_CATEGORIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <Input
          label="Event Date"
          type="date"
          min={tomorrow()}
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />

        <div>
          <span className="block text-sm font-medium text-text-secondary mb-1.5">Time Slot</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Time slot">
            {TIME_SLOTS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={eventTime === value}
                onClick={() => setEventTime(value)}
                className={`px-3 py-2.5 rounded-card border-2 text-sm font-medium transition-colors text-left ${
                  eventTime === value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Venue Address"
          placeholder="Hall name, street, landmark..."
          value={venueAddress}
          onChange={(e) => setVenueAddress(e.target.value)}
        />
        <Input
          label="City"
          placeholder="e.g. Mumbai"
          value={venueCity}
          onChange={(e) => setVenueCity(e.target.value)}
        />
        <Textarea
          label="Special Instructions"
          placeholder="Any specific requirements, color themes, or special requests for the vendor..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-surface border-t border-gray-100 p-4 safe-area-bottom">
        {submitError && (
          <div
            className={`mb-3 p-3 rounded-card text-sm flex items-start gap-2 ${
              submitError.conflict ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-700'
            }`}
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{submitError.message}</span>
          </div>
        )}
        <div className="mb-4 p-4 bg-gray-50 rounded-card">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Base Package</span>
            <span className="font-medium text-text-secondary">{formatCurrency(pkg.starting_price)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Add-ons ({selectedAddons.length})</span>
            <span className="font-medium text-text-secondary">+{formatCurrency(addonTotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-text-secondary border-t border-gray-200 pt-2">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
        <Button size="lg" className="w-full" disabled={!formValid || submitting} onClick={handleSubmit}>
          {submitting ? 'Requesting...' : 'Confirm & Request Booking'}
        </Button>
      </div>
    </div>
  );
}
