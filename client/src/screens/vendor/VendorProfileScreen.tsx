import { useEffect, useState } from 'react';
import { EVENT_CATEGORIES, type EventCategory, type VendorProfile } from '@shared/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Chip } from '@/components/ui/Chip';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorState } from '@/components/VendorCard';
import { ApiError, api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';
import { Star, Clock, BadgeCheck, CheckCircle } from 'lucide-react';

export function VendorProfileScreen() {
  const { refreshUser } = useAuth();
  const { data, loading, error, refetch } = useFetch(
    () => api.get<{ profile: VendorProfile }>('/vendor'),
    []
  );

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const p = data?.profile;
    if (p) {
      setBusinessName(p.business_name);
      setDescription(p.description);
      setCategories(p.category);
      setAddress(p.address);
      setCity(p.city);
      setState(p.state);
      setPhone(p.phone);
      setEmail(p.email);
    }
  }, [data]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const profile = data.profile;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await api.put('/vendor', {
        business_name: businessName.trim(),
        description: description.trim(),
        category: categories,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      setSaveMessage({ ok: true, text: 'Profile saved.' });
      refetch();
      refreshUser();
    } catch (err) {
      setSaveMessage({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Failed to save profile',
      });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-secondary">Vendor Profile</h1>

      <Card className="p-0 overflow-hidden">
        <div className="bg-primary p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{getInitials(profile.business_name)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white">{profile.business_name}</h2>
                {profile.is_verified && (
                  <BadgeCheck className="h-5 w-5 text-white" aria-label="Verified vendor" />
                )}
              </div>
              <p className="text-white/80 text-sm mt-1">
                {profile.is_verified ? 'Verified vendor' : 'Verification pending'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-text-secondary">{profile.total_reviews}</p>
              <p className="text-xs text-gray-500">Reviews</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-secondary flex items-center justify-center gap-1">
                <Star className="h-5 w-5 text-amber" aria-hidden="true" />
                {profile.rating > 0 ? profile.rating.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-gray-500">Overall Rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-secondary flex items-center justify-center gap-1">
                <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
                {profile.response_time_minutes} min
              </p>
              <p className="text-xs text-gray-500">Response Speed</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-4">
          <h3 className="text-lg font-semibold text-text-secondary">Business Details</h3>

          <Input
            label="Business Name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Tell customers about your services..."
          />

          <div>
            <span className="block text-sm font-medium text-text-secondary mb-2">Service Categories</span>
            <div className="flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map(({ value, label }) => (
                <Chip
                  key={value}
                  selected={categories.includes(value)}
                  onClick={() =>
                    setCategories((prev) =>
                      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
                    )
                  }
                >
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Business Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          {saveMessage && (
            <div
              className={`p-3 rounded-card text-sm flex items-center gap-2 ${
                saveMessage.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
              }`}
              role={saveMessage.ok ? 'status' : 'alert'}
            >
              {saveMessage.ok && <CheckCircle className="h-4 w-4" aria-hidden="true" />}
              {saveMessage.text}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
