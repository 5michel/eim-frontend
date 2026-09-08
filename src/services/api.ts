// Fetch-based API client — drop-in replacement for Axios.
// Exposes the same shape: api.get/post/put/delete return { data: responseBody }.
// Interceptors: request adds Bearer token, response handles 401 auto-logout.

import { clearSession, getToken as readToken } from './session';

const BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  '/api';

interface RequestConfig {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
}

class ApiError extends Error {
  response: { data: any; status: number };
  constructor(data: any, status: number) {
    super(data?.message ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.response = { data, status };
  }
}

function getToken(): string | null {
  return readToken();
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${BASE_URL}${normalized}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function request<T = any>(
  method: string,
  path: string,
  body?: unknown,
  config?: RequestConfig,
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(config?.headers ?? {}),
  };

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(buildUrl(path, config?.params), {
    method,
    headers,
    body: body !== undefined ? (isFormData ? body as FormData : JSON.stringify(body)) : undefined,
    signal: config?.signal,
  });

  let data: any;
  try { data = await res.json(); } catch { data = {}; }

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined' && !path.includes('/login') && !path.includes('/invitation')) {
      window.location.href = '/login';
    }
  }

  if (!res.ok) throw new ApiError(data, res.status);

  return { data, status: res.status };
}

const api = {
  get: <T = any>(path: string, config?: RequestConfig) =>
    request<T>('GET', path, undefined, config),
  post: <T = any>(path: string, body?: unknown, config?: RequestConfig) =>
    request<T>('POST', path, body, config),
  put: <T = any>(path: string, body?: unknown, config?: RequestConfig) =>
    request<T>('PUT', path, body, config),
  patch: <T = any>(path: string, body?: unknown, config?: RequestConfig) =>
    request<T>('PATCH', path, body, config),
  delete: <T = any>(path: string, config?: RequestConfig) =>
    request<T>('DELETE', path, undefined, config),
};

export default api;
