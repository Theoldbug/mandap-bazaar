import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EVENT_CATEGORIES, type Addon, type EventCategory, type Package } from '@shared/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Chip } from '@/components/ui/Chip';
import { Toggle } from '@/components/ui/Toggle';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ApiError, api } from '@/lib/api';
import { ChevronLeft, Plus, Trash2, Image, X } from 'lucide-react';

type PackageWithAddons = Package & { addons: Addon[] };

interface AddonForm {
  id?: string;
  name: string;
  description: string;
  price: string;
  is_default: boolean;
}

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 400 * 1024; // keeps the request under the server's 2mb body limit

export function CreateEditPackageScreen() {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const isEditing = !!packageId;

  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [inclusions, setInclusions] = useState<string[]>(['']);
  const [images, setImages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [addons, setAddons] = useState<AddonForm[]>([]);

  // Load the existing package (from the vendor's own list, which includes
  // inactive packages) when editing.
  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      try {
        const res = await api.get<{ packages: PackageWithAddons[] }>('/packages');
        const pkg = res.packages.find((p) => p.id === packageId);
        if (!pkg) {
          setLoadError('Package not found');
        } else {
          setName(pkg.name);
          setCategories(pkg.category);
          setDescription(pkg.description);
          setStartingPrice(String(pkg.starting_price));
          setInclusions(pkg.inclusions.length ? pkg.inclusions : ['']);
          setImages(pkg.images);
          setIsActive(pkg.is_active);
          setAddons(
            pkg.addons.map((a) => ({
              id: a.id,
              name: a.name,
              description: a.description,
              price: String(a.price),
              is_default: a.is_default,
            }))
          );
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load package');
      }
      setLoading(false);
    })();
  }, [isEditing, packageId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSubmitError(null);
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_IMAGE_BYTES) {
        setSubmitError(`"${file.name}" is too large — please use images under 400 KB.`);
        continue;
      }
      if (images.length >= MAX_IMAGES) break;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImages((prev) => (prev.length < MAX_IMAGES ? [...prev, result] : prev));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const toggleCategory = (cat: EventCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    const price = parseInt(startingPrice, 10);
    if (!name.trim() || categories.length === 0 || Number.isNaN(price) || price < 0) {
      setSubmitError('Please fill the package name, at least one category, and a valid price.');
      return;
    }
    const parsedAddons = addons
      .filter((a) => a.name.trim())
      .map((a) => ({
        ...(a.id ? { id: a.id } : {}),
        name: a.name.trim(),
        description: a.description.trim(),
        price: parseInt(a.price, 10) || 0,
        is_default: a.is_default,
      }));

    const body = {
      name: name.trim(),
      description: description.trim(),
      category: categories,
      starting_price: price,
      images,
      inclusions: inclusions.map((i) => i.trim()).filter(Boolean),
      is_active: isActive,
      addons: parsedAddons,
    };

    setSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/packages/${packageId}`, body);
      } else {
        await api.post('/packages', body);
      }
      navigate('/vendor/packages');
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to save package');
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (loadError) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-600">{loadError}</p>
        <button onClick={() => navigate('/vendor/packages')} className="mt-3 text-sm font-medium text-primary hover:underline">
          Back to packages
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28">
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-background z-10 py-4 border-b border-gray-100">
        <button type="button" onClick={() => navigate('/vendor/packages')} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Back">
          <ChevronLeft className="h-5 w-5 text-text-secondary" />
        </button>
        <h1 className="text-xl font-bold text-text-secondary">{isEditing ? 'Edit Package' : 'Create New Package'}</h1>
        <div className="w-10" />
      </div>

      <Card className="p-4 space-y-6">
        <Input
          label="Package Name"
          placeholder="e.g. Grand Marriage Gold Decor"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div>
          <span className="block text-sm font-medium text-text-secondary mb-2">Categories</span>
          <div className="flex flex-wrap gap-2">
            {EVENT_CATEGORIES.map(({ value, label }) => (
              <Chip key={value} selected={categories.includes(value)} onClick={() => toggleCategory(value)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>

        <Textarea
          label="Description"
          placeholder="Describe what this package includes, style, theme, etc."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <Input
          label="Starting Price (₹)"
          type="number"
          min="0"
          placeholder="85000"
          value={startingPrice}
          onChange={(e) => setStartingPrice(e.target.value)}
          required
        />

        <div className="flex items-center justify-between">
          <div>
            <span className="block text-sm font-medium text-text-secondary">Visible to customers</span>
            <span className="text-xs text-gray-500">Inactive packages are hidden from the marketplace</span>
          </div>
          <Toggle checked={isActive} onChange={setIsActive} />
        </div>

        <div>
          <span className="block text-sm font-medium text-text-secondary mb-2">Visual Gallery</span>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {images.map((preview, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                <img src={preview} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/75"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                <Image className="h-8 w-8 text-gray-400" aria-hidden="true" />
                <span className="text-sm text-gray-500 mt-1">Add Photo</span>
              </label>
            )}
          </div>
          <p className="text-xs text-gray-500">Up to {MAX_IMAGES} images, 400 KB each. First image is the cover photo.</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-sm font-medium text-text-secondary">Inclusions</span>
            <button type="button" onClick={() => setInclusions((prev) => [...prev, ''])} className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Item
            </button>
          </div>
          <div className="space-y-2">
            {inclusions.map((inclusion, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="e.g. Premium floral arrangement"
                  value={inclusion}
                  onChange={(e) =>
                    setInclusions((prev) => prev.map((inc, idx) => (idx === i ? e.target.value : inc)))
                  }
                />
                {inclusions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setInclusions((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-red-500 self-end mb-1.5"
                    aria-label="Remove inclusion"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-sm font-medium text-text-secondary">Add-ons</span>
            <button
              type="button"
              onClick={() => setAddons((prev) => [...prev, { name: '', description: '', price: '', is_default: false }])}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Add-on
            </button>
          </div>
          <div className="space-y-3">
            {addons.map((addon, i) => (
              <div key={addon.id ?? `new-${i}`} className="p-3 border border-gray-200 rounded-card space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add-on name"
                    value={addon.name}
                    onChange={(e) =>
                      setAddons((prev) => prev.map((a, idx) => (idx === i ? { ...a, name: e.target.value } : a)))
                    }
                  />
                  <Input
                    placeholder="Price (₹)"
                    type="number"
                    min="0"
                    className="w-32"
                    value={addon.price}
                    onChange={(e) =>
                      setAddons((prev) => prev.map((a, idx) => (idx === i ? { ...a, price: e.target.value } : a)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setAddons((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-red-500 self-end mb-1.5"
                    aria-label="Remove add-on"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  placeholder="Short description (optional)"
                  value={addon.description}
                  onChange={(e) =>
                    setAddons((prev) => prev.map((a, idx) => (idx === i ? { ...a, description: e.target.value } : a)))
                  }
                />
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={addon.is_default}
                    onChange={(e) =>
                      setAddons((prev) => prev.map((a, idx) => (idx === i ? { ...a, is_default: e.target.checked } : a)))
                    }
                    className="rounded border-gray-300"
                  />
                  Pre-selected for customers
                </label>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-surface border-t border-gray-100 p-4 safe-area-bottom">
        {submitError && (
          <div className="mb-3 p-3 rounded-card bg-red-50 text-red-700 text-sm" role="alert">
            {submitError}
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Save & Publish Package'}
        </Button>
      </div>
    </form>
  );
}
