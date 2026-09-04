import { Outlet, useNavigate } from 'react-router-dom';
import { CustomerBottomNav } from '../components/ui/BottomNavigation';
import { Avatar } from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { LogOut, Search } from 'lucide-react';

export function CustomerLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-surface border-b border-gray-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-secondary">Hello, {user?.full_name?.split(' ')[0] || 'User'} 👋</h1>
            <p className="text-sm text-gray-500">Find Your Perfect Pandal</p>
          </div>
          <div className="flex items-center gap-1">
            <Avatar name={user?.full_name} size="sm" />
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

        <div className="px-4 pb-4">
          <button
            onClick={() => navigate('/search')}
            className="w-full flex items-center gap-3 pl-3 pr-4 py-3 rounded-full bg-gray-50 border border-gray-200 text-gray-400 text-left hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Search vendors"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            <span>Search for event types, vendors, locations...</span>
          </button>
        </div>
      </header>

      <main className="pb-24 px-4 pt-4">
        <Outlet />
      </main>

      <CustomerBottomNav />
    </div>
  );
}
