// Stockage de la session d'authentification.
//
// Le token est conservé dans `sessionStorage` (et non `localStorage`) : il disparaît donc
// à la fermeture du navigateur/de l'onglet. Il expire également au bout de 12 h même si
// l'onglet reste ouvert (borne côté client, alignée sur l'expiration Sanctum côté serveur),
// et il est effacé explicitement à la déconnexion.

const TOKEN_KEY = 'eim_token';
const USER_KEY = 'eim_user';
const EXPIRY_KEY = 'eim_token_expiry';

const TTL_MS = 12 * 60 * 60 * 1000; // 12 h

function store(): Storage | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(TOKEN_KEY);
    s.removeItem(USER_KEY);
    s.removeItem(EXPIRY_KEY);
  } catch {}
}

function isExpired(): boolean {
  const s = store();
  if (!s) return false;
  try {
    const raw = s.getItem(EXPIRY_KEY);
    if (!raw) return false;
    return Date.now() > Number(raw);
  } catch {
    return false;
  }
}

export function getToken(): string | null {
  if (isExpired()) {
    clearSession();
    return null;
  }
  const s = store();
  try {
    return s ? s.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function getStoredSession<T = unknown>(): { token: string | null; user: T | null } {
  if (isExpired()) {
    clearSession();
    return { token: null, user: null };
  }
  const s = store();
  try {
    const token = s?.getItem(TOKEN_KEY) ?? null;
    const userStr = s?.getItem(USER_KEY) ?? null;
    if (token && userStr) return { token, user: JSON.parse(userStr) as T };
  } catch {}
  return { token: null, user: null };
}

export function setSession(token: string, user: unknown): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(TOKEN_KEY, token);
    s.setItem(USER_KEY, JSON.stringify(user));
    s.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS));
  } catch {}
}

export function setStoredUser(user: unknown): void {
  const s = store();
  if (!s) return;
  try {
    s.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}
