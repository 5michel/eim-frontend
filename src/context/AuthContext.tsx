import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import api from '../services/api';
import { clearSession, getStoredSession, setSession, setStoredUser } from '../services/session';

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
  const { token, user } = getStoredSession<AuthUser>();
  return { token, user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadFromStorage();
  const [user, setUser] = useState<AuthUser | null>(stored.user);
  const [token, setToken] = useState<string | null>(stored.token);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/login', { email, password });
      const { token: t, user: u } = res.data.data;
      setSession(t, u);
      setToken(t);
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);
  const logout = useCallback(async () => {
    try { await api.post('/logout'); } catch {}
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((u: AuthUser) => {
    setUser(u);
    setStoredUser(u);
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
