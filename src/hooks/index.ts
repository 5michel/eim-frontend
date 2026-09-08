import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

function unwrapPayload(body: any) {
  if (body == null) return body;
  const payload = body.data !== undefined ? body.data : body;
  if (payload && Array.isArray(payload.data) && payload.meta) {
    return payload;
  }
  if (payload && Array.isArray(payload.data) && (payload.current_page !== undefined || payload.total !== undefined)) {
    return {
      data: payload.data,
      meta: {
        current_page: payload.current_page,
        last_page: payload.last_page,
        per_page: payload.per_page,
        total: payload.total,
      },
    };
  }
  return payload;
}

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
      setData(unwrapPayload(res.data) as T);
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
    return res.data;
  }, [refetch]);

  const resendInvitation = useCallback(async (id: string) => {
    const res = await api.post(`/users/${id}/invitation`);
    refetch();
    return res.data;
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
    await api.patch(`/users/${id}/disponibilite`, { disponible });
    refetch();
  }, [refetch]);

  const setActif = useCallback(async (id: string, actif: boolean) => {
    await api.patch(`/users/${id}/activer`, { actif });
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, create, update, remove, setDisponibilite, setActif, resendInvitation };
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

export function useArticle(id: string | null) {
  const { data, loading, error, refetch } = useFetch<any>(id ? `/articles/${id}` : null);
  return { article: data, loading, error, refetch };
}

// ── Notifications ─────────────────────────────────────────────────────────

export function useNotifications() {
  const { data, loading, error, refetch } = useFetch<any[]>('/notifications');

  const unreadCount = (data ?? []).filter((n: any) => !n.date_lecture).length;

  useEffect(() => {
    const t = window.setInterval(() => { refetch(); }, 20000);
    return () => window.clearInterval(t);
  }, [refetch]);

  const markRead = useCallback(async (id: string) => {
    await api.patch(`/notifications/${id}/lire`);
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

export function useMotsClefs() {
  const { data, loading, error, refetch } = useFetch<any[]>('/mots-clefs');

  const create = useCallback(async (nom: string) => {
    const res = await api.post('/mots-clefs', { nom });
    refetch();
    return res.data.data;
  }, [refetch]);

  const update = useCallback(async (id: string, nom: string) => {
    const res = await api.put(`/mots-clefs/${id}`, { nom });
    refetch();
    return res.data.data;
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/mots-clefs/${id}`);
    refetch();
  }, [refetch]);

  return { motsClefs: data ?? [], loading, error, refetch, create, update, remove };
}

export function useTypesActifs() {
  const { data, loading, error, refetch } = useFetch<any[]>('/types-actifs');

  const create = useCallback(async (nom: string) => {
    const res = await api.post('/types-actifs', { nom });
    refetch();
    return res.data.data;
  }, [refetch]);

  const update = useCallback(async (id: string, nom: string) => {
    const res = await api.put(`/types-actifs/${id}`, { nom });
    refetch();
    return res.data.data;
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await api.delete(`/types-actifs/${id}`);
    refetch();
  }, [refetch]);

  return { types: data ?? [], loading, error, refetch, create, update, remove };
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
  const { data: matrice, loading: lm } = useFetch<any[]>('/matrice-priorites');
  return {
    impacts: impacts ?? [],
    urgences: urgences ?? [],
    priorites: priorites ?? [],
    matrice: matrice ?? [],
    loading: li || lu || lp || lm,
  };
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
      setData(unwrapPayload(res.data));
    } catch (e: any) {
      setError(e.response?.data?.message ?? e.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);  // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, generate };
}
