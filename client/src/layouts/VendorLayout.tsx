import { Outlet, useNavigate } from 'react-router-dom';
import { VendorBottomNav } from '../components/ui/BottomNavigation';
import { Avatar } from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export function VendorLayout() {
  const { vendorProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-surface border-b border-gray-100">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-secondary">{vendorProfile?.business_name || 'Vendor Dashboard'}</h1>
            <p className="text-sm text-gray-500">Vendor mode · Manage your business</p>
          </div>
          <div className="flex items-center gap-1">
            <Avatar name={vendorProfile?.business_name} size="sm" />
            <button
              onClick={handleSignOut}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="pb-24 px-4 pt-4">
        <Outlet />
      </main>

      <VendorBottomNav />
    </div>
  );
}
