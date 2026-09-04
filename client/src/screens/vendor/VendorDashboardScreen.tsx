import { Link } from 'react-router-dom';
import type { DashboardStats } from '@shared/types';
import { Card } from '@/components/ui/Card';
import { CardSkeleton, ErrorState } from '@/components/VendorCard';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/useFetch';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Calendar, Star, Inbox } from 'lucide-react';

export function VendorDashboardScreen() {
  const { data, loading, error, refetch } = useFetch(
    () => api.get<{ stats: DashboardStats }>('/vendor/dashboard'),
    []
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const stats = data.stats;
  const maxRevenue = Math.max(1, ...stats.revenue_trend.map((d) => d.revenue));

  const tiles = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.total_revenue),
      icon: TrendingUp,
      color: 'text-emerald',
      bg: 'bg-emerald/10',
    },
    {
      label: 'Active Bookings',
      value: String(stats.active_bookings),
      icon: Calendar,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Pending Requests',
      value: String(stats.pending_requests),
      icon: Inbox,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Average Rating',
      value: stats.average_rating > 0 ? `${stats.average_rating.toFixed(1)} ⭐` : 'New',
      icon: Star,
      color: 'text-amber',
      bg: 'bg-amber/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-secondary">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back! Here's your business overview.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-4" padding="md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{tile.label}</p>
                <p className="text-xl font-bold text-text-secondary mt-1">{tile.value}</p>
              </div>
              <div className={`${tile.bg} p-2.5 rounded-lg`}>
                <tile.icon className={`h-5 w-5 ${tile.color}`} aria-hidden="true" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-text-secondary mb-4">Revenue Trend (last 6 months)</h3>
        <div className="h-40 flex items-end justify-between gap-2">
          {stats.revenue_trend.map((point) => (
            <div key={point.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div
                className="w-full bg-primary rounded-t transition-all duration-300"
                style={{ height: `${Math.max(2, (point.revenue / maxRevenue) * 100)}%` }}
                title={formatCurrency(point.revenue)}
              />
              <span className="text-xs text-gray-500">{point.month}</span>
            </div>
          ))}
        </div>
      </Card>

      {stats.pending_requests > 0 && (
        <Card className="p-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-text-secondary">
              {stats.pending_requests} pending booking request{stats.pending_requests > 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-gray-500">Review and respond to keep customers happy.</p>
          </div>
          <Link to="/vendor/bookings" className="text-sm text-primary font-medium hover:underline flex-shrink-0">
            View Requests
          </Link>
        </Card>
      )}
    </div>
  );
}
