import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import api from '../lib/api';
import { clearToken, getToken, setToken } from '../lib/authToken';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface SessionResponse {
  token: string;
  user: User;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, a stored token is confirmed with the server rather than
  // trusted: it may have expired, or the account may be gone.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: User }>('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const startSession = useCallback((data: SessionResponse) => {
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<SessionResponse>('/auth/login', { email, password });
    startSession(res.data);
  };

  const signup = async (email: string, password: string, displayName?: string) => {
    const res = await api.post<SessionResponse>('/auth/signup', { email, password, displayName });
    startSession(res.data);
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await api.post<SessionResponse>('/auth/google', { credential });
    startSession(res.data);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
