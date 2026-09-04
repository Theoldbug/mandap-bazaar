import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthResponse, User, VendorProfile } from '@shared/types';
import { api, clearToken, getToken, setToken } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  vendorProfile: VendorProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'vendor'
  ) => Promise<{ error: Error | null }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.get<{ user: User; vendorProfile: VendorProfile | null }>('/auth/me');
        setUser(me.user);
        setVendorProfile(me.vendorProfile);
      } catch {
        clearToken();
      }
      setLoading(false);
    };
    initAuth();

    const onLogout = () => {
      setUser(null);
      setVendorProfile(null);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const applyAuth = (auth: AuthResponse) => {
    setToken(auth.token);
    setUser(auth.user);
    setVendorProfile(auth.vendorProfile);
  };

  const signIn = async (email: string, password: string) => {
    try {
      applyAuth(await api.post<AuthResponse>('/auth/login', { email, password }));
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'vendor'
  ) => {
    try {
      applyAuth(await api.post<AuthResponse>('/auth/signup', { email, password, fullName, role }));
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = () => {
    clearToken();
    setUser(null);
    setVendorProfile(null);
  };

  const refreshUser = async () => {
    if (!getToken()) return;
    try {
      const me = await api.get<{ user: User; vendorProfile: VendorProfile | null }>('/auth/me');
      setUser(me.user);
      setVendorProfile(me.vendorProfile);
    } catch {
      // token expired — the api client already cleared it and fired auth:logout
    }
  };

  return (
    <AuthContext.Provider value={{ user, vendorProfile, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
