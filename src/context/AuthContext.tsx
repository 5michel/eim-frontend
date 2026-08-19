import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import api from '../services/api';

export interface AuthUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'manager' | 'agent' | 'client';
  actif: boolean;
  disponible: boolean;
  id_equipe: string | null;
  date_derniere_connexion: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadFromStorage(): { user: AuthUser | null; token: string | null } {
  try {
    const token = localStorage.getItem('eim_token');
    const userStr = localStorage.getItem('eim_user');
    if (token && userStr) return { token, user: JSON.parse(userStr) };
  } catch {}
  return { user: null, token: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadFromStorage();
  const [user, setUser] = useState<AuthUser | null>(stored.user);
  const [token, setToken] = useState<string | null>(stored.token);
  const [loading, setLoading] = useState(false);
/* //== Old version ==
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/login', { email, password });
      const { token: t, user: u } = res.data.data;
      localStorage.setItem('eim_token', t);
      localStorage.setItem('eim_user', JSON.stringify(u));
      setToken(t);
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);
*/
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/login', { email, password });
      // La réponse du backend est : { success: true, data: { token, user } }
      const { token, user } = res.data.data;
      localStorage.setItem('eim_token', token);
      localStorage.setItem('eim_user', JSON.stringify(user));
      setToken(token);
      setUser(user);
    } catch (err) {
      // ...
    } finally {
      setLoading(false);
    }
  };
  const logout = useCallback(async () => {
    try { await api.post('/logout'); } catch {}
    localStorage.removeItem('eim_token');
    localStorage.removeItem('eim_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((u: AuthUser) => {
    setUser(u);
    localStorage.setItem('eim_user', JSON.stringify(u));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
