import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerLayout } from './layouts/CustomerLayout';
import { VendorLayout } from './layouts/VendorLayout';
import { HomeScreen } from './screens/customer/HomeScreen';
import { SearchScreen } from './screens/customer/SearchScreen';
import { VendorListScreen } from './screens/customer/VendorListScreen';
import { VendorDetailScreen } from './screens/customer/VendorDetailScreen';
import { PackageCustomizeScreen } from './screens/customer/PackageCustomizeScreen';
import { MyBookingsScreen } from './screens/customer/MyBookingsScreen';
import { VendorDashboardScreen } from './screens/vendor/VendorDashboardScreen';
import { VendorPackagesScreen } from './screens/vendor/VendorPackagesScreen';
import { CreateEditPackageScreen } from './screens/vendor/CreateEditPackageScreen';
import { VendorBookingsScreen } from './screens/vendor/VendorBookingsScreen';
import { VendorProfileScreen } from './screens/vendor/VendorProfileScreen';
import { LoginScreen } from './screens/auth/LoginScreen';
import { SignupScreen } from './screens/auth/SignupScreen';
import { LoadingScreen } from './components/ui/LoadingScreen';

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'customer' | 'vendor' }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'vendor' ? '/vendor/dashboard' : '/'} replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user) {
    return <Navigate to={user.role === 'vendor' ? '/vendor/dashboard' : '/'} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginScreen /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupScreen /></PublicRoute>} />

      <Route
        path="/"
        element={
          <ProtectedRoute requiredRole="customer">
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeScreen />} />
        <Route path="search" element={<SearchScreen />} />
        <Route path="category/:category" element={<VendorListScreen />} />
        <Route path="vendors/:vendorId" element={<VendorDetailScreen />} />
        <Route path="customize/:packageId" element={<PackageCustomizeScreen />} />
        <Route path="bookings" element={<MyBookingsScreen />} />
      </Route>

      <Route
        path="/vendor"
        element={
          <ProtectedRoute requiredRole="vendor">
            <VendorLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<VendorDashboardScreen />} />
        <Route path="packages" element={<VendorPackagesScreen />} />
        <Route path="packages/new" element={<CreateEditPackageScreen />} />
        <Route path="packages/:packageId/edit" element={<CreateEditPackageScreen />} />
        <Route path="bookings" element={<VendorBookingsScreen />} />
        <Route path="profile" element={<VendorProfileScreen />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;