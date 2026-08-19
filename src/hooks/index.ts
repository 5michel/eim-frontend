import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

// ── Generic fetch hook ────────────────────────────────────────────────────

export function useFetch<T>(url: string | null, params?: Record<string, unknown>, deps?: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async (overrideUrl?: string, overrideParams?: Record<string, unknown>) => {
    const target = overrideUrl ?? url;
    if (!target) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(target, { params: overrideParams ?? params, signal: abortRef.current.signal });
      setData(res.data.data);
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.response?.data?.message ?? e.message ?? 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(params)]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch();
    return () => abortRef.current?.abort();
  }, [fetch, ...(deps ?? [])]);  // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: fetch };
}

// ── Paginated response shape ───────────────────────────────────────────────

export interface PaginatedData<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

// ── Incidents ─────────────────────────────────────────────────────────────----

export function useIncidents(params?: Record<string, unknown>) {
  const { data, loading, error, refetch } = useFetch<PaginatedData<any>>('/incidents', params);
  //console.log(data);
  return { data, loading, error, refetch };
}


export function useIncidentDetail(id: string | null) {
  const { data, loading, error, refetch } = useFetch<any>(id ? `/incidents/${id}` : null);
  return { incident: data, loading, error, refetch };
}

// ── Users ────────────────────────────────────────────────────────────────

export function useUsers(params?: Record<string, unknown>) {
  const { data, loading, error, refetch } = useFetch<PaginatedData<any>>('/users', params);

  const create = useCallback(async (body: Record<string, unknown>) => {
    const res = await api.post('/users', body);
    refetch();
    return res.data.data;
  }, [refetch]);

  const update = useCallback(async (id: string, body: Record<string, unknown>) => {
    const res = await api.put(`/users/${id}`, body);
    refetch();
    return res.data.data;
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/users/${id}`);
    refetch();
  }, [refetch]);

  const setDisponibilite = useCallback(async (id: string, disponible: boolean) => {
    await api.put(`/users/${id}/disponibilite`, { disponible });
    refetch();
  }, [refetch]);

  const setActif = useCallback(async (id: string, actif: boolean) => {
    await api.put(`/users/${id}/activer`, { actif });
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, create, update, remove, setDisponibilite, setActif };
}

// ── Équipes ───────────────────────────────────────────────────────────────

export function useEquipes() {
  const { data, loading, error, refetch } = useFetch<PaginatedData<any>>('/equipes');

  const create = useCallback(async (body: Record<string, unknown>) => {
    const res = await api.post('/equipes', body);
    refetch();
    return res.data.data;
  }, [refetch]);

  const update = useCallback(async (id: string, body: Record<string, unknown>) => {
    const res = await api.put(`/equipes/${id}`, body);
    refetch();
    return res.data.data;
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/equipes/${id}`);
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, create, update, remove };
}

// ── Actifs ────────────────────────────────────────────────────────────────

export function useActifs() {
  const { data, loading, error, refetch } = useFetch<PaginatedData<any>>('/actifs');

  const create = useCallback(async (body: Record<string, unknown>) => {
    const res = await api.post('/actifs', body);
    refetch();
    return res.data.data;
  }, [refetch]);

  const update = useCallback(async (id: string, body: Record<string, unknown>) => {
    const res = await api.put(`/actifs/${id}`, body);
    refetch();
    return res.data.data;
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/actifs/${id}`);
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, create, update, remove };
}

// ── Articles ──────────────────────────────────────────────────────────────

export function useArticles(params?: Record<string, unknown>) {
  const { data, loading, error, refetch } = useFetch<PaginatedData<any>>('/articles', params);

  const create = useCallback(async (body: Record<string, unknown>) => {
    const res = await api.post('/articles', body);
    refetch();
    return res.data.data;
  }, [refetch]);

  const update = useCallback(async (id: string, body: Record<string, unknown>) => {
    const res = await api.put(`/articles/${id}`, body);
    refetch();
    return res.data.data;
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/articles/${id}`);
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, create, update, remove };
}

// ── Notifications ─────────────────────────────────────────────────────────

export function useNotifications() {
  const { data, loading, error, refetch } = useFetch<any[]>('/notifications');

  const unreadCount = (data ?? []).filter((n: any) => !n.date_lecture).length;

  const markRead = useCallback(async (id: string) => {
    await api.put(`/notifications/${id}/lire`);
    refetch();
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/notifications/${id}`);
    refetch();
  }, [refetch]);

  const clearAll = useCallback(async () => {
    await api.delete('/notifications');
    refetch();
  }, [refetch]);

  return { notifications: data ?? [], unreadCount, loading, error, refetch, markRead, remove, clearAll };
}

// ── SLAs ──────────────────────────────────────────────────────────────────

export function useSlas() {
  const { data, loading, error, refetch } = useFetch<any[]>('/slas');

  const updateSlas = useCallback(async (slas: unknown[]) => {
    const res = await api.put('/slas', slas);
    refetch();
    return res.data.data;
  }, [refetch]);

  return { slas: data ?? [], loading, error, refetch, updateSlas };
}

// ── Impacts / Urgences / Priorités ────────────────────────────────────────

export function useImpactsUrgences() {
  const { data: impacts, loading: li } = useFetch<any[]>('/impacts');
  const { data: urgences, loading: lu } = useFetch<any[]>('/urgences');
  const { data: priorites, loading: lp } = useFetch<any[]>('/priorites');
  return { impacts: impacts ?? [], urgences: urgences ?? [], priorites: priorites ?? [], loading: li || lu || lp };
}

// ── Reports ───────────────────────────────────────────────────────────────

export function useRapportsPerformance(params?: Record<string, unknown>) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (p?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/rapports/performance', { params: p ?? params });
      setData(res.data.data);
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);  // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, generate };
}
