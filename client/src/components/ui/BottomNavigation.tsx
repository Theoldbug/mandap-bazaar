import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Home, Search, Calendar, LayoutDashboard, Package, BookOpen, User } from 'lucide-react';

const customerNavItems = [
  { path: '/', label: 'Home', icon: Home, exact: true },
  { path: '/search', label: 'Search', icon: Search, exact: false },
  { path: '/bookings', label: 'Bookings', icon: Calendar, exact: false },
] as const;

const vendorNavItems = [
  { path: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/vendor/packages', label: 'Packages', icon: Package, exact: false },
  { path: '/vendor/bookings', label: 'Bookings', icon: BookOpen, exact: false },
  { path: '/vendor/profile', label: 'Profile', icon: User, exact: false },
] as const;

interface BottomNavProps {
  items: typeof customerNavItems | typeof vendorNavItems;
}

export function BottomNavigation({ items }: BottomNavProps) {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-gray-200 safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className={cn('grid', items.length === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
        {items.map(({ path, label, icon: Icon, exact }) => {
          const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-3 px-2 transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                isActive
                  ? 'text-primary'
                  : 'text-gray-400 hover:text-gray-600'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export function CustomerBottomNav() {
  return <BottomNavigation items={customerNavItems} />;
}

export function VendorBottomNav() {
  return <BottomNavigation items={vendorNavItems} />;
}