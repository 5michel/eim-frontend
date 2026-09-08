import React, {
  useState, useEffect, useRef, useCallback, useMemo, type ReactNode,
} from 'react';
import {
  BrowserRouter, Routes, Route, Link, useNavigate, useParams, Navigate, useLocation, useSearchParams,
} from 'react-router';
import {
  LayoutDashboard, FileText, Book, Users, Server, Layers, Settings, BarChart2,
  Bell, LogOut, ChevronDown, ChevronRight, X, Plus, Search, Filter, RefreshCw,
  AlertCircle, CheckCircle2, Clock, Zap, ArrowRight, ArrowLeft, Edit3, Trash2, Shield,
  UserCheck, User, ChevronUp, Eye, EyeOff, Hash, Calendar, Tag, MoreVertical,
  Activity, TrendingUp, AlertTriangle, Info, Menu, Building2, HardDrive,
  Send, Lock, Unlock, BookOpen, Check, XCircle, Printer, Paperclip, Star, FileSpreadsheet, Mail,
} from 'lucide-react';
import { AuthProvider, useAuth, type AuthUser } from '../context/AuthContext';
import {
  useIncidents, useIncidentDetail, useUsers, useEquipes, useActifs,
  useArticles, useArticle, useNotifications, useSlas, useImpactsUrgences, useRapportsPerformance,
  useMotsClefs, useTypesActifs,
} from '../hooks/index';
import api from '../services/api';
import { getToken as getSessionToken } from '../services/session';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import * as XLSX from 'xlsx';

// ── MSW startup ──────────────────────────────────────────────────────────────
/*
let _mswStarted = false;
let _mswPromise: Promise<void> | null = null;

async function startMSW() {
  if (_mswStarted) return;
  if (!_mswPromise) {
    _mswPromise = import('../mocks/browser').then(({ worker }) =>
      worker.start({ onUnhandledRequest: 'bypass' })
    ).then(() => { _mswStarted = true; });
  }
  return _mswPromise;
}
*/
// ── Meridian palette ─────────────────────────────────────────────────────────

const M = {
  n0: '#FFFFFF', n50: '#F7F7F5', n100: '#EFEFEC', n200: '#E2E1DC',
  n300: '#CFCEC7', n400: '#ADABA1', n500: '#86847A', n600: '#605F57',
  n700: '#45443E', n800: '#2E2D29', n900: '#1C1B18',
  cobalt50: '#EEF3FB', cobalt100: '#D7E3F5', cobalt500: '#3D5F8A', cobalt600: '#2E4A6E', cobalt700: '#23374F',
  brick50: '#FBEEEC', brick500: '#A8402F', brick700: '#7A2E22',
  amber50: '#FBF3E6', amber500: '#B8842E', amber700: '#8A6221',
  sage50: '#EEF3EA', sage500: '#5C7A4C', sage700: '#435A37',
};

// Formats de pièce jointe pris en charge (section 10, point 3) — doit rester cohérent avec la
// liste blanche appliquée côté serveur (config/pieces_jointes.php, PieceJointeService). Purement
// indicatif : le filtre du sélecteur de fichier peut être outrepassé par l'utilisateur, la
// validation qui compte est celle du backend.
const ACCEPTED_FILE_TYPES = '.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.pdf,.doc,.docx,.odt,.rtf,.txt,.md,.csv,.xls,.xlsx,.ods,.ppt,.pptx,.odp,.zip,.json,.log';

// ── Utility ───────────────────────────────────────────────────────────────────

const prioriteColor = (nom: string) => {
  switch (nom) {
    case 'Critique': return { bg: M.brick50, text: M.brick700, rail: M.brick500 };
    case 'Haute': return { bg: M.amber50, text: M.amber700, rail: M.amber500 };
    case 'Moyenne': return { bg: M.cobalt50, text: M.cobalt700, rail: M.cobalt500 };
    case 'Basse': return { bg: M.sage50, text: M.sage700, rail: M.sage500 };
    case 'Planifiée': return { bg: M.n100, text: M.n600, rail: M.n300 };
    default: return { bg: M.n100, text: M.n600, rail: M.n300 };
  }
};

const statutColor = (statut: string) => {
  switch (statut) {
    case 'ouvert': return { bg: M.n100, text: M.n700 };
    case 'en_cours': return { bg: M.cobalt50, text: M.cobalt700 };
    case 'resolu': return { bg: M.sage50, text: M.sage700 };
    case 'en_attente_cloture': return { bg: M.amber50, text: M.amber700 };
    case 'cloture': return { bg: M.n100, text: M.n500 };
    default: return { bg: M.n100, text: M.n600 };
  }
};

const statutLabel = (s: string) => {
  const m: Record<string, string> = {
    ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Résolu',
    en_attente_cloture: 'En attente de clôture', cloture: 'Clôturé',
  };
  return m[s] ?? s;
};

const roleLabel = (r: string) => ({ admin: 'Administrateur', manager: 'Manager', agent: 'Agent', client: 'Utilisateur' }[r] ?? r);

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtMin = (m: number | string | null | undefined) => {
  const n = Number(m);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n < 60) return `${Math.round(n)} min`;
  if (n < 1440) return `${Math.round(n / 60)}h`;
  return `${Math.round(n / 1440)}j`;
};

function useDocumentTitle(title: string) {
  useEffect(() => { document.title = title ? `${title} — EIM` : 'EIM'; }, [title]);
}

// ── Base UI components ────────────────────────────────────────────────────────

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Btn = ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }: BtnProps) => {
  const base = 'inline-flex items-center gap-2 font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  const variants: Record<string, string> = {
    primary: 'bg-[#2E4A6E] text-white hover:bg-[#23374F] focus:ring-[#2E4A6E]',
    secondary: 'bg-[#EFEFEC] text-[#2E2D29] hover:bg-[#E2E1DC] focus:ring-[#CFCEC7]',
    ghost: 'bg-transparent text-[#605F57] hover:bg-[#EFEFEC] focus:ring-[#CFCEC7]',
    danger: 'bg-[#A8402F] text-white hover:bg-[#7A2E22] focus:ring-[#A8402F]',
    outline: 'border border-[#E2E1DC] text-[#45443E] bg-white hover:bg-[#F7F7F5] focus:ring-[#CFCEC7]',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <RefreshCw size={12} className="animate-spin" /> : null}
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = ({ label, error, hint, className = '', id, ...props }: InputProps) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '_');
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-[#605F57] uppercase tracking-wide">{label}</label>}
      <input
        id={inputId}
        className={`px-3 py-2 text-sm border rounded bg-white text-[#1C1B18] placeholder-[#ADABA1] focus:outline-none focus:ring-2 focus:ring-[#2E4A6E]/30 focus:border-[#2E4A6E] transition-colors ${error ? 'border-[#A8402F]' : 'border-[#E2E1DC]'} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[#A8402F]">{error}</span>}
      {hint && !error && <span className="text-xs text-[#86847A]">{hint}</span>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

const Select = ({ label, error, options, placeholder, className = '', id, ...props }: SelectProps) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '_');
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-[#605F57] uppercase tracking-wide">{label}</label>}
      <select
        id={inputId}
        className={`px-3 py-2 text-sm border rounded bg-white text-[#1C1B18] focus:outline-none focus:ring-2 focus:ring-[#2E4A6E]/30 focus:border-[#2E4A6E] transition-colors ${error ? 'border-[#A8402F]' : 'border-[#E2E1DC]'} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
      {error && <span className="text-xs text-[#A8402F]">{error}</span>}
    </div>
  );
};

function KeywordMultiSelect({ label, options, value, onChange }: { label?: string; options: { id: string | number; nom: string }[]; value: (string | number)[]; onChange: (ids: (string | number)[]) => void }) {
  const selected = value.map(String);
  const toggle = (id: string | number) => {
    const key = String(id);
    onChange(selected.includes(key) ? value.filter(v => String(v) !== key) : [...value, id]);
  };
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-[#605F57] uppercase tracking-wide">{label}</span>}
      <div className="flex flex-wrap gap-1.5 min-h-[38px] px-2 py-2 border border-[#E2E1DC] rounded bg-white">
        {options.length === 0 ? (
          <span className="text-xs text-[#ADABA1]">Aucun mot-clé défini</span>
        ) : options.map(o => {
          const on = selected.includes(String(o.id));
          return (
            <button type="button" key={o.id} onClick={() => toggle(o.id)}
              className={`px-2 py-0.5 rounded text-xs border transition-colors ${on ? 'bg-[#2E4A6E] text-white border-[#2E4A6E]' : 'bg-[#F7F7F5] text-[#45443E] border-[#E2E1DC]'}`}>
              {o.nom}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = ({ label, error, className = '', id, ...props }: TextareaProps) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '_');
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-[#605F57] uppercase tracking-wide">{label}</label>}
      <textarea
        id={inputId}
        className={`px-3 py-2 text-sm border rounded bg-white text-[#1C1B18] placeholder-[#ADABA1] focus:outline-none focus:ring-2 focus:ring-[#2E4A6E]/30 focus:border-[#2E4A6E] transition-colors resize-none ${error ? 'border-[#A8402F]' : 'border-[#E2E1DC]'} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[#A8402F]">{error}</span>}
    </div>
  );
};

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
}

const Modal = ({ open, title, onClose, children, size = 'md', footer }: ModalProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(28,27,24,0.5)' }}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${widths[size]} flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E1DC]">
          <h3 className="text-base font-semibold text-[#1C1B18]">{title}</h3>
          <button onClick={onClose} className="text-[#86847A] hover:text-[#1C1B18] transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[#E2E1DC] flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

const Avatar = ({ user, size = 'md' }: { user: { prenom: string; nom: string; role?: string }; size?: 'xs' | 'sm' | 'md' | 'lg' }) => {
  const roleColors: Record<string, string> = { admin: '#2E4A6E', manager: '#5C7A4C', agent: '#B8842E', client: '#86847A' };
  const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  const bg = roleColors[user.role ?? 'client'] ?? '#86847A';
  const initials = `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase();
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`} style={{ background: bg }}>
      {initials}
    </div>
  );
};

const StatusBadge = ({ statut }: { statut: string }) => {
  const { bg, text } = statutColor(statut);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: bg, color: text }}>
      {statutLabel(statut)}
    </span>
  );
};

const PriorityBadge = ({ nom }: { nom: string }) => {
  const { bg, text } = prioriteColor(nom);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: bg, color: text }}>
      {nom}
    </span>
  );
};

const RoleBadge = ({ role }: { role: string }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    admin: { bg: M.cobalt50, text: M.cobalt700 },
    manager: { bg: M.sage50, text: M.sage700 },
    agent: { bg: M.amber50, text: M.amber700 },
    client: { bg: M.n100, text: M.n600 },
  };
  const c = colors[role] ?? colors.client;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.text }}>
      {roleLabel(role)}
    </span>
  );
};

const EmptyState = ({ icon: Icon = FileText, title, description, action }: { icon?: any; title: string; description?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
    <div className="w-12 h-12 rounded-full bg-[#EFEFEC] flex items-center justify-center">
      <Icon size={22} className="text-[#86847A]" />
    </div>
    <div>
      <p className="text-sm font-medium text-[#45443E]">{title}</p>
      {description && <p className="text-xs text-[#86847A] mt-1">{description}</p>}
    </div>
    {action}
  </div>
);

const SLABar = ({ delaiReponse, delaiResolution, echeanceReponse, echeanceResolution, statut }: { delaiReponse: number | string | null; delaiResolution: number | string | null; echeanceReponse?: string | null; echeanceResolution?: string | null; statut?: string }) => {
  // Tant que le ticket n'est pas pris en charge, l'échéance qui compte est le temps de réponse,
  // pas le temps de résolution (qui ne redevient pertinent qu'une fois la prise en charge faite).
  const enAttente = statut === 'ouvert';
  const total = Number(enAttente ? delaiReponse : delaiResolution);
  const echeance = enAttente ? echeanceReponse : echeanceResolution;
  if (!Number.isFinite(total) || total <= 0 || !echeance) return null;
  // On se base sur l'échéance absolue renvoyée par l'API plutôt que sur un calcul local
  // (date de création + durée) : l'échéance est recalculée côté serveur à chaque réévaluation
  // du SLA (prise en charge, réévaluation, escalade), donc s'appuyer dessus fait automatiquement
  // repartir la barre de progression à zéro dans ces cas au lieu de rester bloquée sur l'ancienne
  // fenêtre calculée depuis la création de l'incident.
  const remaining = (new Date(echeance).getTime() - Date.now()) / 60000;
  const pct = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  const color = pct >= 100 ? M.brick500 : pct >= 75 ? M.amber500 : M.sage500;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#EFEFEC] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {enAttente ? 'Réponse : ' : ''}{fmtMin(Math.max(0, Math.round(remaining)))}
      </span>
    </div>
  );
};

const Alert = ({ type, children }: { type: 'error' | 'warning' | 'info' | 'success'; children: ReactNode }) => {
  const styles = {
    error: { bg: M.brick50, border: M.brick500, text: M.brick700, Icon: AlertCircle },
    warning: { bg: M.amber50, border: M.amber500, text: M.amber700, Icon: AlertTriangle },
    info: { bg: M.cobalt50, border: M.cobalt500, text: M.cobalt700, Icon: Info },
    success: { bg: M.sage50, border: M.sage500, text: M.sage700, Icon: CheckCircle2 },
  }[type];
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded border-l-4 text-sm" style={{ background: styles.bg, borderColor: styles.border, color: styles.text }}>
      <styles.Icon size={16} className="flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
};

// ── Notification Bell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState('');
  const { notifications, unreadCount, markRead, remove, clearAll, refetch } = useNotifications();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openNotif = async (n: any) => {
    setInfo('');
    try {
      if (!n.date_lecture) await markRead(n.id);
      setOpen(false);
      if (n.lien) navigate(n.lien);
    } catch (e: any) {
      setInfo(e.response?.data?.message ?? "Cette notification n'existe plus ou a été supprimée.");
      refetch();
    }
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(!open); setInfo(''); }} className="relative p-2 rounded hover:bg-[#EFEFEC] transition-colors" aria-label="Notifications">
        <Bell size={18} className="text-[#605F57]" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#A8402F] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-[#E2E1DC] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E1DC]">
            <span className="text-sm font-semibold text-[#1C1B18]">Notifications</span>
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-xs text-[#86847A] hover:text-[#A8402F] transition-colors">Tout effacer</button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#86847A] hover:text-[#1C1B18]" aria-label="Fermer"><X size={14} /></button>
            </div>
          </div>
          {info && <div className="px-4 py-2 text-xs text-[#8A6221] bg-[#FBF3E6]">{info}</div>}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#EFEFEC]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#86847A]">Aucune notification</div>
            ) : notifications.map((n: any) => (
              <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-[#F7F7F5] transition-colors ${!n.date_lecture ? 'bg-[#EEF3FB]' : ''}`}>
                <button className="flex-1 text-left" onClick={() => openNotif(n)}>
                  <p className="text-xs text-[#1C1B18]">{n.message}</p>
                  <p className="text-[10px] text-[#86847A] mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {fmtDate(n.created_at ?? n.date_creation)}
                  </p>
                </button>
                <button onClick={async () => { try { await remove(n.id); } catch { setInfo("Cette notification n'existe plus ou a été supprimée."); refetch(); } }} className="text-[#ADABA1] hover:text-[#A8402F] transition-colors flex-shrink-0 mt-0.5">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Layouts ───────────────────────────────────────────────────────────────────

interface NavItem { label: string; to: string; icon: any; roles: string[] }

const navItems: NavItem[] = [
  { label: 'Accueil', to: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'agent'] },
  { label: 'Incidents', to: '/incidents', icon: FileText, roles: ['admin', 'manager', 'agent'] },
  { label: 'Base de connaissances', to: '/articles', icon: Book, roles: ['admin', 'manager', 'agent'] },
  { label: 'Utilisateurs', to: '/users', icon: Users, roles: ['admin'] },
  { label: 'Équipes', to: '/equipes', icon: Building2, roles: ['admin'] },
  { label: 'Actifs', to: '/actifs', icon: HardDrive, roles: ['admin', 'manager', 'agent', 'client'] },
  { label: 'Statistiques', to: '/rapports', icon: BarChart2, roles: ['admin', 'manager'] },
  { label: 'Paramètres', to: '/settings', icon: Settings, roles: ['admin'] },
];

function Sidebar({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const location = useLocation();
  const items = navItems.filter(n => n.roles.includes(user.role));
  return (
    <aside className="no-print w-56 flex-shrink-0 flex flex-col" style={{ background: M.n900, minHeight: '100vh' }}>
      <div className="px-5 py-5 border-b border-[#2E2D29]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#2E4A6E] flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">EIM</span>
        </div>
        <p className="text-[10px] text-[#605F57] mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Efficient Issues Manager</p>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {items.map(item => {
          const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link key={item.to} to={item.to}
              className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded text-sm transition-colors ${active ? 'bg-[#2E4A6E] text-white' : 'text-[#CFCEC7] hover:bg-[#2E2D29] hover:text-white'}`}>
              <item.icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[#2E2D29] px-3 py-3">
        <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[#2E2D29] transition-colors">
          <Avatar user={user} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white truncate">{user.prenom} {user.nom}</p>
            <p className="text-[10px] text-[#86847A]">{roleLabel(user.role)}</p>
          </div>
        </Link>
        <button onClick={onLogout} className="flex items-center gap-3 px-3 py-2 rounded w-full text-left text-sm text-[#605F57] hover:text-[#A8402F] hover:bg-[#2E2D29] transition-colors mt-1">
          <LogOut size={14} /> Déconnexion
        </button>
      </div>
    </aside>
  );
}

function TopBar({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <header className="no-print h-12 flex items-center px-6 border-b border-[#E2E1DC] bg-white gap-4 flex-shrink-0">
      <div className="flex-1" />
      <NotificationBell />
      <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Avatar user={user} size="sm" />
        <span className="text-sm text-[#45443E] hidden sm:block">{user.prenom} {user.nom}</span>
      </Link>
      <button onClick={onLogout} className="flex items-center gap-1.5 text-sm text-[#86847A] hover:text-[#A8402F] transition-colors">
        <LogOut size={14} />
      </button>
    </header>
  );
}

function ClientNav({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const location = useLocation();
  const links = [
    { label: 'Mes incidents', to: '/incidents' },
    { label: 'Mes actifs', to: '/actifs' },
    { label: 'Base de connaissances', to: '/articles' },
  ];
  return (
    <header className="h-14 flex items-center px-6 border-b border-[#E2E1DC] bg-white gap-6 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-[#2E4A6E] flex items-center justify-center">
          <Shield size={14} className="text-white" />
        </div>
        <span className="font-semibold text-sm text-[#1C1B18]">EIM</span>
      </div>
      <nav className="flex items-center gap-1">
        {links.map(l => {
          const active = location.pathname === l.to || location.pathname.startsWith(l.to + '/');
          return (
            <Link key={l.to} to={l.to}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${active ? 'bg-[#EEF3FB] text-[#2E4A6E] font-medium' : 'text-[#605F57] hover:bg-[#F7F7F5]'}`}>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <NotificationBell />
      <Link to="/profile"><Avatar user={user} size="sm" /></Link>
      <button onClick={onLogout} className="text-sm text-[#86847A] hover:text-[#A8402F] transition-colors"><LogOut size={14} /></button>
    </header>
  );
}

function LogoutModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal open={open} title="Confirmer la déconnexion" onClose={onClose} size="sm"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn variant="danger" onClick={onConfirm}>Déconnecter</Btn></>}>
      <p className="text-sm text-[#45443E]">Voulez-vous vraiment vous déconnecter de EIM ?</p>
    </Modal>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (user.role === 'client') {
    return (
      <div className="flex flex-col min-h-screen bg-[#F7F7F5]">
        <ClientNav user={user} onLogout={() => setShowLogoutModal(true)} />
        <main className="flex-1 overflow-auto">{children}</main>
        <LogoutModal open={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F7F7F5]">
      <Sidebar user={user} onLogout={() => setShowLogoutModal(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} onLogout={() => setShowLogoutModal(true)} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <LogoutModal open={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} />
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

const DEMO_ACCOUNTS = [
  { email: 'sophie.martin@eim.tg', label: 'Administrateur — Sophie Martin', role: 'admin' },
  { email: 'koffi.agbeko@eim.tg', label: 'Manager — Koffi Agbeko', role: 'manager' },
  { email: 'kofi.mensah@eim.tg', label: 'Agent — Kofi Mensah', role: 'agent' },
  { email: 'jean.dupont@client.tg', label: 'Utilisateur — Jean Dupont', role: 'client' },
];

function LoginPage() {
  useDocumentTitle('Connexion');
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice] = useState(() => (location.state as { notice?: string } | null)?.notice ?? '');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === 'client' ? '/incidents' : '/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Identifiants invalides.');
    }
  };

  const selectDemo = (e: string) => { setEmail(e); setPassword('password'); setError(''); };

  return (
    <div className="min-h-screen flex" style={{ background: M.n50 }}>
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12" style={{ background: M.n900 }}>
        <div className="max-w-xs">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded bg-[#2E4A6E] flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <span className="text-2xl font-semibold text-white">EIM</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">Efficient Issues Manager</h2>
          <p className="text-sm text-[#605F57] leading-relaxed">
            Gérez vos incidents informatiques de bout en bout <br></br> Signalement, prise en charge, résolution et clôture.
          </p>
          <div className="mt-10 space-y-3">
            {['Suivi en temps réel', 'Gestion des SLA', 'Base de connaissances', 'Rapports de performance'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle2 size={14} className="text-[#5C7A4C]" />
                <span className="text-sm text-[#86847A]">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded bg-[#2E4A6E] flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="text-lg font-semibold">EIM</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1C1B18] mb-1">Connexion</h1>
          <p className="text-sm text-[#86847A] mb-8">Accédez à votre espace de gestion des incidents.</p>

          <div hidden className="mb-6 p-4 rounded border border-[#E2E1DC] bg-[#EEF3FB]">
            <p className="text-xs font-medium text-[#2E4A6E] mb-3">Comptes de démonstration</p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map(a => (
                <button key={a.email} onClick={() => selectDemo(a.email)}
                  className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${email === a.email ? 'bg-[#2E4A6E] text-white' : 'bg-white text-[#45443E] hover:bg-[#EFEFEC]'}`}>
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#86847A] mt-2">Mot de passe : <code className="font-mono">password</code></p>
          </div>

          {notice && <div className="mb-4"><Alert type="success">{notice}</Alert></div>}
          {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Adresse e-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.tg" required />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#605F57] uppercase tracking-wide">Mot de passe</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 text-sm border border-[#E2E1DC] rounded bg-white text-[#1C1B18] focus:outline-none focus:ring-2 focus:ring-[#2E4A6E]/30 focus:border-[#2E4A6E] transition-colors" required />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86847A]">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <Btn type="submit" loading={loading} className="w-full justify-center">Se connecter</Btn>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function DashboardPage() {
  useDocumentTitle('Accueil');
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'agent') return <AgentDashboard user={user} />;
  if (user.role === 'manager') return <ManagerDashboard user={user} />;
  return <AdminDashboard user={user} />;
}

function StatCard({ label, value, sub, color, icon: Icon, to }: { label: string; value: string | number; sub?: string; color?: string; icon?: any; to?: string }) {
  const content = (
    <div className={`bg-white rounded-lg border border-[#E2E1DC] p-5 h-full ${to ? 'transition-colors hover:border-[#2E4A6E] hover:bg-[#F7F9FC]' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#86847A] uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-semibold text-[#1C1B18]" style={{ color }}>{value}</p>
          {sub && <p className="text-xs text-[#86847A] mt-1">{sub}</p>}
        </div>
        {Icon && <div className="w-9 h-9 rounded-lg bg-[#EFEFEC] flex items-center justify-center"><Icon size={18} className="text-[#86847A]" /></div>}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{content}</Link> : content;
}

function AgentDashboard({ user }: { user: AuthUser }) {
  const { data, loading } = useIncidents();
  const incidents = data?.data ?? [];
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-[#1C1B18] mb-6">Mes prestations actives</h1>
      {loading ? <LoadingSpinner /> : incidents.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Aucune prestation active" description="Vous n'avez pas d'incident assigné en ce moment." />
      ) : (
        <div className="space-y-3">
          {incidents.map((inc: any) => <IncidentRow key={inc.id} incident={inc} />)}
        </div>
      )}
    </div>
  );
}

function PerformancesGlobalesBlock({ perf }: { perf: any }) {
  if (!perf) return null;
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-[#45443E] mb-1">Performances globales</h2>
      <p className="text-xs text-[#86847A] mb-3">{perf.perimetre_label ?? 'Ensemble du service'}</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard label="Taux de résolution" value={`${perf.tauxResolution}%`} icon={TrendingUp} color={perf.tauxResolution >= 70 ? M.sage500 : M.amber500} />
        <StatCard label="Clôturés (période)" value={perf.cloturesCount} icon={CheckCircle2} />
        <StatCard label="Volume" value={perf.total} icon={BarChart2} />
      </div>
      {(perf.byManager?.length ?? 0) > 0 && (
        <div className="bg-white rounded-lg border border-[#E2E1DC] p-4">
          <h3 className="text-xs font-semibold text-[#86847A] uppercase tracking-wide mb-3">Par manager</h3>
          <div className="space-y-2">
            {perf.byManager.map((row: any) => (
              <div key={row.manager.id} className="flex items-center justify-between text-sm">
                <span className="text-[#45443E]">{row.manager.prenom} {row.manager.nom}</span>
                <span className="text-xs text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {row.clotures}/{row.incidents} clôturés{row.dureeMoyenneMinutes != null ? ` · ${formatDuree(row.dureeMoyenneMinutes)} moy.` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ManagerDashboard({ user }: { user: AuthUser }) {
  const { data, loading } = useIncidents({ statut: 'ouvert' });
  const { data: dataEnCours } = useIncidents({ statut: 'en_cours' });
  const { generate, data: perf } = useRapportsPerformance();
  const ouvertsCount = data?.meta?.total ?? 0;
  const enCoursCount = dataEnCours?.meta?.total ?? 0;
  const incidents = data?.data ?? [];
  useEffect(() => { generate({}); }, [generate]);
  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-[#1C1B18] mb-6">Tableau de bord Manager</h1>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Incidents ouverts" value={ouvertsCount} color={ouvertsCount > 0 ? M.brick500 : undefined} icon={AlertCircle} to="/incidents?statut=ouvert" />
        <StatCard label="En cours" value={enCoursCount} icon={Clock} to="/incidents?statut=en_cours" />
      </div>
      <PerformancesGlobalesBlock perf={perf} />
      <h2 className="text-sm font-semibold text-[#45443E] mb-3">Incidents à prendre en charge</h2>
      {loading ? <LoadingSpinner /> : incidents.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Aucun incident en attente" description="Tous les incidents sont pris en charge." />
      ) : (
        <div className="space-y-2">
          {incidents.slice(0, 10).map((inc: any) => <IncidentRow key={inc.id} incident={inc} />)}
          {ouvertsCount > 10 && <Link to="/incidents?statut=ouvert" className="text-sm text-[#2E4A6E] hover:underline">Voir tous les incidents ({ouvertsCount})</Link>}
        </div>
      )}
    </div>
  );
}

function AdminDashboard({ user }: { user: AuthUser }) {
  const { data: dataAll } = useIncidents();
  const { data: dataOuverts } = useIncidents({ statut: 'ouvert' });
  const { data: dataEnCours } = useIncidents({ statut: 'en_cours' });
  const { data: dataClotures } = useIncidents({ statut: 'cloture' });
  const { generate, data: perf } = useRapportsPerformance();
  const total = dataAll?.meta?.total ?? 0;
  const ouverts = dataOuverts?.meta?.total ?? 0;
  const enCours = dataEnCours?.meta?.total ?? 0;
  const clotures = dataClotures?.meta?.total ?? 0;
  const recents = (dataAll?.data ?? []).slice(0, 5);
  useEffect(() => { generate({}); }, [generate]);
  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1C1B18]">Tableau de bord</h1>
        <span className="text-xs text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total incidents" value={total} icon={FileText} to="/incidents" />
        <StatCard label="Ouverts" value={ouverts} color={ouverts > 0 ? M.brick500 : undefined} icon={AlertCircle} to="/incidents?statut=ouvert" />
        <StatCard label="En cours" value={enCours} icon={Clock} to="/incidents?statut=en_cours" />
        <StatCard label="Clôturés" value={clotures} icon={CheckCircle2} color={M.sage500} to="/incidents?statut=cloture" />
      </div>
      <PerformancesGlobalesBlock perf={perf} />
      <h2 className="text-sm font-semibold text-[#45443E] mb-3">Incidents récents</h2>
      <div className="space-y-2">
        {recents.map((inc: any) => <IncidentRow key={inc.id} incident={inc} />)}
        {total > 5 && <Link to="/incidents" className="text-sm text-[#2E4A6E] hover:underline block mt-2">Voir tous les incidents →</Link>}
      </div>
    </div>
  );
}

// ── Incident List ─────────────────────────────────────────────────────────────

function IncidentRow({ incident }: { incident: any }) {
  const pColor = prioriteColor(incident.priorite?.nom ?? '');
  return (
    <Link to={`/incidents/${incident.id}`} className="flex items-center gap-4 bg-white rounded border border-[#E2E1DC] px-4 py-3 hover:shadow-sm transition-shadow group">
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: pColor.rail }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-mono text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{incident.num_id}</span>
          {incident.priorite && <PriorityBadge nom={incident.priorite.nom} />}
          <StatusBadge statut={incident.statut} />
        </div>
        <p className="text-sm text-[#1C1B18] truncate">{incident.resume ?? incident.description}</p>
        {incident.statut !== 'cloture' && (
          <div className="mt-2 max-w-xs">
            <SLABar delaiReponse={incident.delai_reponse} delaiResolution={incident.delai_resolution} echeanceReponse={incident.echeance_reponse} echeanceResolution={incident.echeance_resolution} statut={incident.statut} />
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-xs text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmtDate(incident.date_creation)}</p>
      </div>
      <ChevronRight size={14} className="text-[#CFCEC7] group-hover:text-[#2E4A6E] flex-shrink-0" />
    </Link>
  );
}

function IncidentListPage() {
  useDocumentTitle('Incidents');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState(() => new URLSearchParams(location.search).get('statut') ?? '');
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({
    ...(search ? { search } : {}),
    ...(statutFilter ? { statut: statutFilter } : {}),
    page,
  }), [search, statutFilter, page]);

  const { data, loading } = useIncidents(params);
  const incidents = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="max-w-5xl mx-auto" style={user?.role === 'client' ? { padding: '24px' } : {}}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1C1B18]">{user?.role === 'client' ? 'Mes incidents' : 'Incidents'}</h1>
        <Btn onClick={() => navigate('/incidents/new')} size="sm"><Plus size={14} />Signaler un incident</Btn>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ADABA1]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E1DC] rounded bg-white text-[#1C1B18] focus:outline-none focus:ring-2 focus:ring-[#2E4A6E]/30 focus:border-[#2E4A6E]" />
        </div>
        <select value={statutFilter} onChange={e => { setStatutFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-[#E2E1DC] rounded bg-white text-[#45443E] focus:outline-none">
          <option value="">Tous les statuts</option>
          <option value="ouvert">Ouvert</option>
          <option value="en_cours">En cours</option>
          <option value="resolu">Résolu</option>
          <option value="en_attente_cloture">En attente de clôture</option>
          <option value="cloture">Clôturé</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : incidents.length === 0 ? (
        <EmptyState icon={FileText} title="Aucun incident" description="Aucun incident ne correspond à vos critères."
          action={<Btn size="sm" onClick={() => navigate('/incidents/new')}><Plus size={14} />Signaler un incident</Btn>} />
      ) : (
        <>
          <div className="space-y-2">
            {incidents.map((inc: any) => <IncidentRow key={inc.id} incident={inc} />)}
          </div>
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-[#86847A]">{meta.total} résultats — page {meta.current_page}/{meta.last_page}</p>
              <div className="flex gap-2">
                <Btn variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Précédent</Btn>
                <Btn variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Suivant</Btn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Create Incident ───────────────────────────────────────────────────────────

function CreateIncidentPage() {
  useDocumentTitle('Signaler un incident');
  const navigate = useNavigate();
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const { impacts, urgences } = useImpactsUrgences();
  const { data: actifData } = useActifs();
  const { motsClefs } = useMotsClefs();
  const actifs = actifData?.data ?? [];

  const [form, setForm] = useState({ description: '', actif_concerne_id: '', impact_id: '', urgence_id: '' });
  const [motClefIds, setMotClefIds] = useState<(string | number)[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ priorite: string; sla_reponse: number; sla_resolution: number } | null>(null);

  const prioriteMapping: Record<number, { nom: string; sla_reponse: number; sla_resolution: number }> = {
    1: { nom: 'Basse', sla_reponse: 240, sla_resolution: 2880 },
    2: { nom: 'Basse', sla_reponse: 240, sla_resolution: 2880 },
    3: { nom: 'Moyenne', sla_reponse: 120, sla_resolution: 1440 },
    4: { nom: 'Moyenne', sla_reponse: 120, sla_resolution: 1440 },
    6: { nom: 'Haute', sla_reponse: 60, sla_resolution: 480 },
    9: { nom: 'Critique', sla_reponse: 15, sla_resolution: 240 },
  };

  useEffect(() => {
    if (!isClient && form.impact_id && form.urgence_id) {
      const iv = impacts.find((i: any) => String(i.id) === String(form.impact_id))?.valeur ?? 0;
      const uv = urgences.find((u: any) => String(u.id) === String(form.urgence_id))?.valeur ?? 0;
      const p = prioriteMapping[iv * uv];
      if (p) setPreview(p);
    } else {
      setPreview(null);
    }
  }, [form.impact_id, form.urgence_id, impacts, urgences, isClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const errs: Record<string, string> = {};
    if (!form.description.trim()) errs.description = 'La description est requise.';
    if (!form.urgence_id) errs.urgence_id = "L'urgence est requise.";
    if (!isClient && !form.impact_id) errs.impact_id = "L'impact est requis.";
    if (motClefIds.length === 0) errs.mot_clef_ids = 'Au moins un mot-clé est requis.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        description: form.description,
        actif_concerne_id: form.actif_concerne_id || null,
        urgence_id: form.urgence_id,
        mot_clef_ids: motClefIds.map(Number),
      };
      if (!isClient) payload.impact_id = form.impact_id;
      const res = await api.post('/incidents', payload);
      const inc = res.data.data;
      const keywords = inc.mots_clefs?.join(',') ?? '';
      if (keywords) {
        const artRes = await api.get('/articles', { params: { mots_clefs: keywords } });
        const matchingArticles = artRes.data.data?.data ?? [];
        if (matchingArticles.length > 0) {
          navigate(`/articles?mots_clefs=${encodeURIComponent(keywords)}&from_incident=${inc.id}`);
          return;
        }
      }
      navigate(`/incidents/${inc.id}`);
    } catch (err: any) {
      const apiErrors = err.response?.data?.errors ?? {};
      const mapped: Record<string, string> = {};
      Object.entries(apiErrors).forEach(([k, v]) => { mapped[k] = (v as string[]).join(' '); });
      if (Object.keys(mapped).length) setErrors(mapped);
      else setErrors({ _: err.response?.data?.message ?? 'Erreur lors de la création.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-[#86847A] hover:text-[#1C1B18] transition-colors"><ChevronRight size={16} className="rotate-180" /></button>
        <h1 className="text-xl font-semibold text-[#1C1B18]">Signaler un incident</h1>
      </div>
      {errors._ && <div className="mb-4"><Alert type="error">{errors._}</Alert></div>}
      {isClient && (
        <div className="mb-4"><Alert type="info">Indiquez uniquement l'urgence. Un SLA par défaut s'applique jusqu'à la prise en charge par un manager. Sans prise en charge dans les délais, l'incident est escaladé.</Alert></div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#E2E1DC] p-6 space-y-5">
        <Textarea label="Description *" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} error={errors.description} placeholder="Décrivez le problème rencontré..." />
        <div className={`grid ${isClient ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          {!isClient && (
            <Select label="Impact *" value={form.impact_id} onChange={e => setForm(f => ({ ...f, impact_id: e.target.value }))} error={errors.impact_id} placeholder="— choisir —"
              options={impacts.map((i: any) => ({ value: String(i.id), label: `${i.nom} (${i.valeur})` }))} />
          )}
          <Select label="Urgence *" value={form.urgence_id} onChange={e => setForm(f => ({ ...f, urgence_id: e.target.value }))} error={errors.urgence_id} placeholder="— choisir —"
            options={urgences.map((u: any) => ({ value: String(u.id), label: `${u.nom} (${u.valeur})` }))} />
        </div>
        {preview && (
          <div className="flex items-center gap-4 p-3 rounded border" style={{ background: M.cobalt50, borderColor: M.cobalt100 }}>
            <div>
              <p className="text-xs text-[#2E4A6E] mb-1">Priorité calculée</p>
              <PriorityBadge nom={preview.priorite} />
            </div>
            <div className="w-px h-8 bg-[#D7E3F5]" />
            <div className="text-xs text-[#3D5F8A]">
              <p>Réponse : <strong>{fmtMin(preview.sla_reponse)}</strong></p>
              <p>Résolution : <strong>{fmtMin(preview.sla_resolution)}</strong></p>
            </div>
          </div>
        )}
        <Select label="Actif concerné (optionnel)" value={form.actif_concerne_id} onChange={e => setForm(f => ({ ...f, actif_concerne_id: e.target.value }))} placeholder="— aucun —"
          options={actifs.map((a: any) => ({ value: String(a.id), label: a.nom }))} />
        <div>
          <KeywordMultiSelect label="Mots-clés *" options={motsClefs} value={motClefIds} onChange={setMotClefIds} />
          {errors.mot_clef_ids && <p className="text-xs mt-1" style={{ color: M.brick500 }}>{errors.mot_clef_ids}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E1DC]">
          <Btn type="button" variant="secondary" onClick={() => navigate(-1)}>Annuler</Btn>
          <Btn type="submit" loading={loading}>Soumettre l'incident</Btn>
        </div>
      </form>
    </div>
  );
}

// ── Incident Detail ───────────────────────────────────────────────────────────

function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { incident, loading, error, refetch } = useIncidentDetail(id ?? null);
  const navigate = useNavigate();
  useDocumentTitle(incident?.num_id ? `Incident ${incident.num_id}` : 'Incident');

  const [commentText, setCommentText] = useState('');
  const [commentInterne, setCommentInterne] = useState(false);
  const [commentPieceJointeIds, setCommentPieceJointeIds] = useState<(string | number)[]>([]);
  const [viewingCommentPiece, setViewingCommentPiece] = useState<any | null>(null);
  const [commentError, setCommentError] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  const [showPriseEnCharge, setShowPriseEnCharge] = useState(false);
  const [showPasser, setShowPasser] = useState(false);
  const [showReassigner, setShowReassigner] = useState(false);
  const [showAssignerForce, setShowAssignerForce] = useState(false);
  const [showCloture, setShowCloture] = useState(false);
  const [showClotureClient, setShowClotureClient] = useState(false);
  const [clotureNote, setClotureNote] = useState<number | null>(null);
  const [showReopen, setShowReopen] = useState(false);
  const [reopenComment, setReopenComment] = useState('');
  const [showReevaluer, setShowReevaluer] = useState(false);
  const [showGestionEdit, setShowGestionEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data: usersData } = useUsers();
  const allUsers = usersData?.data ?? [];
  const { data: equipesData } = useEquipes();
  const equipes = equipesData?.data ?? [];

  useEffect(() => {
    if (!id) return;
    setCommentsLoading(true);
    api.get(`/incidents/${id}/commentaires`).then(r => setComments(r.data.data)).catch(() => {}).finally(() => setCommentsLoading(false));
  }, [id]);

  const sendComment = async () => {
    if (!commentText.trim()) { setCommentError('Le commentaire ne peut pas être vide.'); return; }
    setCommentError('');
    setCommentLoading(true);
    try {
      const res = await api.post(`/incidents/${id}/commentaires`, { contenu: commentText, est_interne: commentInterne, piece_jointe_ids: commentPieceJointeIds.map(Number) });
      setComments(prev => [...prev, res.data.data]);
      setCommentText('');
      setCommentPieceJointeIds([]);
    } catch (e: any) {
      setCommentError(e.response?.data?.message ?? "Erreur lors de l'envoi.");
    } finally {
      setCommentLoading(false);
    }
  };

  const doAction = async (endpoint: string, body: object) => {
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/incidents/${id}/${endpoint}`, body);
      refetch();
      return true;
    } catch (e: any) {
      setActionError(e.response?.data?.message ?? 'Erreur.');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error || !incident) return <div className="p-6"><Alert type="error">{error ?? 'Incident introuvable.'}</Alert></div>;

  const inc = incident;
  const pColor = prioriteColor(inc.priorite?.nom ?? '');
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';
  const isDemandeur = String(inc.demandeur_id) === String(user?.id);
  const canDemandeurEdit = isDemandeur && inc.statut === 'ouvert' && !inc.gestion_active;
  const isAgentIntervenant = user?.role === 'agent' && (inc.prestations ?? []).some((p: any) => String(p.prestataire_id) === String(user?.id));
  const isManagerIntervenant = user?.role === 'manager' && String(inc.gestion_active?.manager_id ?? '') === String(user?.id);
  const canDemandeurCloture = (isDemandeur || isAgentIntervenant || isManagerIntervenant || user?.role === 'admin') && inc.statut !== 'cloture';
  const canReouvrir = isDemandeur && inc.peut_etre_rouvert;
  const canPrendreEnCharge = isManagerOrAdmin && inc.statut === 'ouvert';
  const canPass = isManagerOrAdmin && inc.statut === 'en_cours';
  const canReassigner = isManagerOrAdmin && inc.statut === 'en_cours';
  const canCloturer = isManagerOrAdmin && ['en_cours', 'resolu'].includes(inc.statut);
  const canManagerEdit = isManagerOrAdmin && inc.gestion_active && inc.statut !== 'cloture';

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-[#86847A] hover:text-[#1C1B18] transition-colors"><ChevronRight size={16} className="rotate-180" /></button>
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
          <span className="text-xs font-mono text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{inc.num_id}</span>
          <StatusBadge statut={inc.statut} />
          {inc.priorite && <PriorityBadge nom={inc.priorite.nom} />}
        </div>
      </div>

      {actionError && <div className="mb-4"><Alert type="error">{actionError}</Alert></div>}

      <div className="flex flex-wrap gap-2 mb-6">
        {isDemandeur && inc.statut === 'ouvert' && !canDemandeurEdit && (
          <Alert type="info">Cet incident est déjà pris en charge et ne peut plus être modifié par le demandeur.</Alert>
        )}
        {canDemandeurEdit && <Btn variant="outline" size="sm" onClick={() => navigate(`/incidents/${id}/edit`)}><Edit3 size={13} />Modifier</Btn>}
        {canDemandeurCloture && <Btn variant="secondary" size="sm" onClick={() => setShowClotureClient(true)}><CheckCircle2 size={13} />Clôturer l'incident</Btn>}
        {canReouvrir && <Btn variant="outline" size="sm" onClick={() => setShowReopen(true)}><Unlock size={13} />Rouvrir l'incident</Btn>}
        {canPrendreEnCharge && <Btn size="sm" onClick={() => setShowPriseEnCharge(true)}><UserCheck size={13} />Prendre en charge</Btn>}
        {canManagerEdit && <Btn variant="outline" size="sm" onClick={() => setShowReevaluer(true)}><Zap size={13} />Réévaluer (urgence / impact)</Btn>}
        {canManagerEdit && <Btn variant="ghost" size="sm" onClick={() => setShowGestionEdit(true)}><Tag size={13} />Résumé et mots-clés</Btn>}
        {canPass && <Btn variant="secondary" size="sm" onClick={() => setShowPasser(true)}><ArrowRight size={13} />Passer à un manager</Btn>}
        {canReassigner && <Btn variant="secondary" size="sm" onClick={() => setShowReassigner(true)}><RefreshCw size={13} />Réassigner</Btn>}
        {canCloturer && <Btn variant="outline" size="sm" onClick={() => setShowCloture(true)}><CheckCircle2 size={13} />Lancer la clôture</Btn>}
        {user?.role === 'admin' && inc.statut === 'ouvert' && <Btn variant="ghost" size="sm" onClick={() => setShowAssignerForce(true)}><Lock size={13} />Assigner de force</Btn>}
        {(user?.role === 'agent' || isManagerOrAdmin) && ['en_cours', 'resolu'].includes(inc.statut) && (
          <Btn variant="ghost" size="sm" onClick={() => navigate(`/incidents/${id}/rapport`)}><FileText size={13} />Rapport de prestation</Btn>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
            <div className="flex items-start gap-3">
              <div className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ background: pColor.rail }} />
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <span className="text-[10px] font-semibold text-[#86847A] uppercase tracking-wide">Description du demandeur</span>
                  <p className="text-sm text-[#45443E] leading-relaxed whitespace-pre-wrap mt-1">{inc.description}</p>
                </div>
                {inc.resume && (
                  <div className="pt-4 border-t border-[#EFEFEC]">
                    <span className="text-[10px] font-semibold text-[#86847A] uppercase tracking-wide">Résumé du manager</span>
                    <p className="text-sm text-[#45443E] leading-relaxed whitespace-pre-wrap mt-1">{inc.resume}</p>
                  </div>
                )}
              </div>
            </div>
            {inc.mots_clefs?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-[#EFEFEC]">
                {inc.mots_clefs.map((k: string) => (
                  <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: M.n100, color: M.n600 }}>
                    <Tag size={10} />{k}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
            <h3 className="text-sm font-semibold text-[#45443E] mb-4">Commentaires</h3>
            {commentsLoading ? <LoadingSpinner size="sm" /> : comments.length === 0 ? (
              <p className="text-sm text-[#86847A] mb-4">Aucun commentaire.</p>
            ) : (
              <div className="space-y-4 mb-4">
                {comments.map((c: any) => (
                  <div key={c.id} className={`flex gap-3 ${c.est_interne ? 'opacity-75' : ''}`}>
                    <Avatar user={c.auteur ?? { prenom: '?', nom: '?' }} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-[#45443E]">{c.auteur?.prenom} {c.auteur?.nom}</span>
                        {c.est_interne && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: M.amber50, color: M.amber700 }}>Interne</span>}
                        {c.source === 'email' && <span className="text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: M.cobalt50, color: M.cobalt600 }} title="Commentaire créé automatiquement depuis une réponse par email"><Mail size={9} />Par email</span>}
                        <span className="text-[10px] text-[#86847A] ml-auto font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmtDate(c.date_creation)}</span>
                      </div>
                      <p className="text-sm text-[#45443E] leading-relaxed">{c.contenu}</p>
                      {c.pieces_jointes?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {c.pieces_jointes.map((p: any) => (
                            <button key={p.id} type="button" onClick={() => setViewingCommentPiece(p)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-[#E2E1DC] text-[#2E4A6E] hover:underline">
                              <Paperclip size={10} />{p.nom_original}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {inc.statut !== 'cloture' && (
              <div className="border-t border-[#EFEFEC] pt-4 space-y-2">
                <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={3} placeholder="Ajouter un commentaire..." error={commentError} />
                {(inc.pieces_jointes?.length ?? 0) > 0 && (
                  <KeywordMultiSelect label="Référencer une pièce jointe" options={inc.pieces_jointes.map((p: any) => ({ id: p.id, nom: p.nom_original }))} value={commentPieceJointeIds} onChange={setCommentPieceJointeIds} />
                )}
                <div className="flex items-center justify-between">
                  {(user?.role === 'agent' || isManagerOrAdmin) && (
                    <label className="flex items-center gap-2 text-xs text-[#605F57] cursor-pointer">
                      <input type="checkbox" checked={commentInterne} onChange={e => setCommentInterne(e.target.checked)} className="rounded" />
                      Commentaire interne
                    </label>
                  )}
                  <Btn size="sm" loading={commentLoading} onClick={sendComment} className="ml-auto"><Send size={12} />Envoyer</Btn>
                </div>
              </div>
            )}
            <PieceJointeViewerModal piece={viewingCommentPiece} fileUrl={viewingCommentPiece ? apiFileUrl(`/incidents/${id}/documents/${viewingCommentPiece.id}`) : null} onClose={() => setViewingCommentPiece(null)} />
          </div>

          <DocumentsIncident incidentId={id!} documents={inc.pieces_jointes ?? []} onChanged={refetch} disabled={inc.statut === 'cloture'} />
        </div>

        <div className="space-y-4">
          <InfoCard title="Informations">
            <InfoRow label="Demandeur" value={`${inc.demandeur?.prenom ?? ''} ${inc.demandeur?.nom ?? ''}`} />
            <InfoRow label="Créé le" value={fmtDate(inc.date_creation)} mono />
            {inc.date_prise_en_charge && <InfoRow label="Pris en charge" value={fmtDate(inc.date_prise_en_charge)} mono />}
            {inc.date_cloture && <InfoRow label="Clôturé le" value={fmtDate(inc.date_cloture)} mono />}
            {inc.date_reouverture && <InfoRow label="Réouvert le" value={fmtDate(inc.date_reouverture)} mono />}
            {inc.actif && <InfoRow label="Actif concerné" value={inc.actif.nom} />}
          </InfoCard>

          <InfoCard title="SLA">
            <InfoRow label="Impact" value={inc.impact?.nom} />
            <InfoRow label="Urgence" value={inc.urgence?.nom} />
            <InfoRow label="Temps de réponse" value={fmtMin(inc.delai_reponse)} mono />
            <InfoRow label="Temps de résolution" value={fmtMin(inc.delai_resolution)} mono />
            {inc.statut !== 'cloture' && (
              <div className="mt-3 pt-3 border-t border-[#EFEFEC]">
                <p className="text-[10px] text-[#86847A] mb-1">Progression SLA</p>
                <SLABar delaiReponse={inc.delai_reponse} delaiResolution={inc.delai_resolution} echeanceReponse={inc.echeance_reponse} echeanceResolution={inc.echeance_resolution} statut={inc.statut} />
              </div>
            )}
          </InfoCard>

          {inc.gestion_active && (
            <InfoCard title="Prise en charge">
              <InfoRow label="Manager" value={`${inc.gestion_active.manager?.prenom ?? ''} ${inc.gestion_active.manager?.nom ?? ''}`} />
              {inc.gestion_active.equipe && <InfoRow label="Équipe assignée" value={inc.gestion_active.equipe.nom} />}
              <InfoRow label="Depuis" value={fmtDate(inc.gestion_active.date_debut)} mono />
            </InfoCard>
          )}

          {(inc.prestations_actives?.length ?? 0) > 0 && (
            <InfoCard title={inc.prestations_actives.length > 1 ? 'Agents intervenants' : 'Agent assigné'}>
              {inc.prestations_actives.map((p: any) => (
                <InfoRow key={p.id} label={p.prestataire ? `${p.prestataire.prenom ?? ''} ${p.prestataire.nom ?? ''}` : 'Agent'} value={fmtDate(p.date_debut)} mono />
              ))}
            </InfoCard>
          )}

          {(inc.historique_gestions?.length ?? 0) > 1 && (
            <InfoCard title="Historique des gestions">
              {inc.historique_gestions.map((g: any) => (
                <div key={g.id} className="text-xs text-[#605F57] py-1 border-b border-[#EFEFEC] last:border-0">
                  <p className="font-medium">{g.manager?.prenom} {g.manager?.nom}</p>
                  <p className="text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmtDate(g.date_debut)}</p>
                  {g.motif && <p className="italic">{g.motif}</p>}
                </div>
              ))}
            </InfoCard>
          )}
        </div>
      </div>

      <PriseEnChargeModal open={showPriseEnCharge} onClose={() => setShowPriseEnCharge(false)} users={allUsers} equipes={equipes} loading={actionLoading} incident={inc}
        onSubmit={async (body) => { const ok = await doAction('prise-en-charge', body); if (ok) setShowPriseEnCharge(false); }} />

      <ReevaluerModal open={showReevaluer} onClose={() => setShowReevaluer(false)} incident={inc} loading={actionLoading}
        onSubmit={async (body) => {
          setActionLoading(true); setActionError('');
          try { await api.put(`/incidents/${id}/reevaluer`, body); refetch(); setShowReevaluer(false); }
          catch (e: any) { setActionError(e.response?.data?.message ?? 'Erreur.'); }
          finally { setActionLoading(false); }
        }} />

      <GestionEditModal open={showGestionEdit} onClose={() => setShowGestionEdit(false)} incident={inc} loading={actionLoading}
        onSubmit={async (body) => {
          setActionLoading(true); setActionError('');
          try { await api.put(`/incidents/${id}`, body); refetch(); setShowGestionEdit(false); }
          catch (e: any) { setActionError(e.response?.data?.message ?? 'Erreur.'); }
          finally { setActionLoading(false); }
        }} />

      <PasserModal open={showPasser} onClose={() => setShowPasser(false)} users={allUsers} loading={actionLoading}
        onSubmit={async (body) => { const ok = await doAction('passer', body); if (ok) setShowPasser(false); }} />

      <ReassignerModal open={showReassigner} onClose={() => setShowReassigner(false)} users={allUsers} equipes={equipes} loading={actionLoading}
        onSubmit={async (body) => { const ok = await doAction('reassigner', body); if (ok) setShowReassigner(false); }} />

      <AssignerForceModal open={showAssignerForce} onClose={() => setShowAssignerForce(false)} users={allUsers} loading={actionLoading}
        onSubmit={async (body) => { const ok = await doAction('assigner-force', body); if (ok) setShowAssignerForce(false); }} />

      <Modal open={showCloture} title="Lancer la demande de clôture" onClose={() => setShowCloture(false)} size="sm"
        footer={<><Btn variant="secondary" onClick={() => setShowCloture(false)}>Annuler</Btn><Btn loading={actionLoading} onClick={async () => { const ok = await doAction('cloturer', {}); if (ok) setShowCloture(false); }}>Confirmer</Btn></>}>
        <p className="text-sm text-[#45443E]">Le demandeur sera notifié et pourra valider la clôture. L'incident passera en statut <strong>En attente de clôture</strong>.</p>
      </Modal>

      <Modal open={showClotureClient} title="Clôturer l'incident" onClose={() => { setShowClotureClient(false); setClotureNote(null); }} size="sm"
        footer={<><Btn variant="secondary" onClick={() => { setShowClotureClient(false); setClotureNote(null); }}>Annuler</Btn><Btn variant="danger" loading={actionLoading} onClick={async () => { const ok = await doAction('cloture-utilisateur', isDemandeur && clotureNote ? { note: clotureNote } : {}); if (ok) { setShowClotureClient(false); setClotureNote(null); navigate('/incidents'); } }}>Clôturer définitivement</Btn></>}>
        <p className="text-sm text-[#45443E] mb-4">
          {isDemandeur
            ? "Cette action est irréversible. L'incident sera marqué comme clôturé."
            : "L'incident sera marqué comme clôturé. Le demandeur pourra le rouvrir pendant le délai configuré, puisque ce n'est pas lui qui clôture."}
        </p>
        {isDemandeur && (
          <div hidden>
            <p className="text-xs text-[#86847A] mb-2">Note de la prestation (optionnel)</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setClotureNote(clotureNote === n ? null : n)}>
                  <Star size={20} fill={clotureNote != null && n <= clotureNote ? '#E0A83E' : 'none'} color={clotureNote != null && n <= clotureNote ? '#E0A83E' : '#C9C7BE'} />
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showReopen} title="Rouvrir l'incident" onClose={() => { setShowReopen(false); setReopenComment(''); }} size="sm"
        footer={<><Btn variant="secondary" onClick={() => { setShowReopen(false); setReopenComment(''); }}>Annuler</Btn>
          <Btn loading={actionLoading} disabled={reopenComment.trim().length < 10} onClick={async () => { const ok = await doAction('reopen', { commentaire: reopenComment }); if (ok) { setShowReopen(false); setReopenComment(''); } }}>Rouvrir</Btn></>}>
        <p className="text-sm text-[#45443E] mb-3">Expliquez pourquoi cet incident doit être rouvert (10 caractères minimum).</p>
        <Textarea value={reopenComment} onChange={e => setReopenComment(e.target.value)} rows={3} placeholder="Le problème persiste..." />
      </Modal>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-[#E2E1DC] p-4">
      <h4 className="text-xs font-semibold text-[#86847A] uppercase tracking-wide mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-[#86847A] flex-shrink-0">{label}</span>
      <span className="text-xs text-[#45443E] text-right" style={mono ? { fontFamily: "'IBM Plex Mono', monospace" } : {}}>{value ?? '—'}</span>
    </div>
  );
}

// ── Action Modals ─────────────────────────────────────────────────────────────

function getFileExt(nom: string): string {
  return (nom.split('.').pop() ?? '').toLowerCase();
}

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];

function apiFileUrl(path: string): string {
  const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || '/api';
  return `${base}${path}`;
}

function downloadBlob(blobUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = blobUrl; a.download = filename; a.click();
}

/**
 * Modale de lecture d'une pièce jointe : aperçu inline pour images/PDF, message de repli sinon.
 */
const DOCX_EXTS = ['docx'];

function PieceJointeViewerModal({ piece, fileUrl, onClose }: { piece: any | null; fileUrl: string | null; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!piece || !fileUrl) { setBlobUrl(null); setDocxHtml(null); return; }
    const ext = getFileExt(piece.nom_original);
    const isDocx = DOCX_EXTS.includes(ext);
    const token = getSessionToken();
    let currentUrl: string | null = null;
    setLoading(true); setError(''); setDocxHtml(null);
    fetch(fileUrl, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
      .then(r => { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
      .then(async (buffer) => {
        currentUrl = URL.createObjectURL(new Blob([buffer]));
        setBlobUrl(currentUrl);
        if (isDocx) {
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
            setDocxHtml(DOMPurify.sanitize(result.value));
          } catch { /* pas d'aperçu docx disponible, le repli "Télécharger" reste utilisable */ }
        }
      })
      .catch(() => setError('Impossible de charger la pièce jointe.'))
      .finally(() => setLoading(false));
    return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [piece, fileUrl]);

  if (!piece) return null;
  const ext = getFileExt(piece.nom_original);
  const isImage = IMAGE_EXTS.includes(ext);
  const isPdf = ext === 'pdf';
  const isDocx = DOCX_EXTS.includes(ext);

  return (
    <Modal open={!!piece} title={piece.nom_original} onClose={onClose} size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Fermer</Btn>{blobUrl && <Btn onClick={() => downloadBlob(blobUrl, piece.nom_original)}>Télécharger</Btn>}</>}>
      {loading && <LoadingSpinner />}
      {error && <Alert type="error">{error}</Alert>}
      {blobUrl && isImage && <img src={blobUrl} alt={piece.nom_original} className="max-w-full max-h-[65vh] mx-auto rounded" />}
      {blobUrl && isPdf && <iframe src={blobUrl} title={piece.nom_original} className="w-full h-[65vh] rounded border border-[#E2E1DC]" />}
      {blobUrl && isDocx && docxHtml && (
        <div className="max-h-[65vh] overflow-y-auto rounded border border-[#E2E1DC] p-5 text-sm text-[#1C1B18] prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: docxHtml }} />
      )}
      {blobUrl && isDocx && !docxHtml && !loading && (
        <div className="text-sm text-[#605F57] text-center py-10">Aperçu indisponible pour ce document. Utilisez « Télécharger » pour l'ouvrir.</div>
      )}
      {blobUrl && !isImage && !isPdf && !isDocx && (
        <div className="text-sm text-[#605F57] text-center py-10">
          Aperçu non disponible pour ce type de fichier ({ext ? `.${ext}` : '?'}). Utilisez « Télécharger » pour l'ouvrir.
        </div>
      )}
    </Modal>
  );
}

function DocumentsIncident({ incidentId, documents, onChanged, disabled }: { incidentId: string; documents: any[]; onChanged: () => void; disabled?: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<any | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('fichier', file);
      await api.post(`/incidents/${incidentId}/documents`, fd);
      onChanged();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Impossible d\'ajouter le document.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#45443E]">Documents</h3>
        {!disabled && (
          <>
            <input ref={fileRef} type="file" accept={ACCEPTED_FILE_TYPES} className="hidden" onChange={upload} />
            <Btn variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}><Paperclip size={12} />Ajouter</Btn>
          </>
        )}
      </div>
      {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
      {documents.length === 0 ? (
        <p className="text-sm text-[#86847A]">Aucun document.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((d: any) => (
            <li key={d.id} className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setViewing(d)} className="text-[#45443E] truncate hover:underline text-left">{d.nom_original}</button>
              <button type="button" onClick={() => setViewing(d)} className="text-xs text-[#2E4A6E] hover:underline flex-shrink-0">Ouvrir</button>
            </li>
          ))}
        </ul>
      )}
      <PieceJointeViewerModal piece={viewing} fileUrl={viewing ? apiFileUrl(`/incidents/${incidentId}/documents/${viewing.id}`) : null} onClose={() => setViewing(null)} />
    </div>
  );
}

function PriseEnChargeModal({ open, onClose, users, equipes, loading, onSubmit, incident }: { open: boolean; onClose: () => void; users: any[]; equipes: any[]; loading: boolean; onSubmit: (body: any) => void; incident?: any }) {
  const [resume, setResume] = useState('');
  const [agentId, setAgentId] = useState('');
  const [equipeId, setEquipeId] = useState('');
  const [impactId, setImpactId] = useState('');
  const [urgenceId, setUrgenceId] = useState('');
  const { impacts, urgences } = useImpactsUrgences();
  const availableAgents = users.filter((u: any) => u.role === 'agent' && u.disponible);

  useEffect(() => {
    if (!open) { setResume(''); setAgentId(''); setEquipeId(''); setImpactId(''); setUrgenceId(''); }
    else {
      setImpactId(incident?.impact_id ? String(incident.impact_id) : '');
      setUrgenceId(incident?.urgence_id ? String(incident.urgence_id) : '');
      setResume(incident?.resume ?? '');
    }
  }, [open, incident]);

  return (
    <Modal open={open} title="Prendre en charge l'incident" onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} disabled={!impactId || !urgenceId} onClick={() => onSubmit({ resume, agent_id: agentId || undefined, equipe_id: equipeId || undefined, impact_id: impactId, urgence_id: urgenceId })}>Confirmer</Btn></>}>
      <div className="space-y-4">
        <Alert type="info">Définissez (ou redéfinissez) l'urgence et l'impact. Un nouveau SLA sera appliqué.</Alert>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Impact *" value={impactId} onChange={e => setImpactId(e.target.value)} placeholder="— choisir —"
            options={impacts.map((i: any) => ({ value: String(i.id), label: `${i.nom} (${i.valeur})` }))} />
          <Select label="Urgence *" value={urgenceId} onChange={e => setUrgenceId(e.target.value)} placeholder="— choisir —"
            options={urgences.map((u: any) => ({ value: String(u.id), label: `${u.nom} (${u.valeur})` }))} />
        </div>
        {availableAgents.length === 0 && <Alert type="warning">Aucun agent disponible. Vous pouvez assigner par équipe.</Alert>}
        <Textarea label="Résumé" value={resume} onChange={e => setResume(e.target.value)} rows={3} placeholder="Résumé de la prise en charge..." />
        {availableAgents.length > 0 && (
          <Select label="Assigner à un agent" value={agentId} onChange={e => { setAgentId(e.target.value); if (e.target.value) setEquipeId(''); }}
            placeholder="— choisir un agent —" options={availableAgents.map((u: any) => ({ value: String(u.id), label: `${u.prenom} ${u.nom}` }))} />
        )}
        <Select label="Ou assigner à une équipe (tous ses agents pourront intervenir)" value={equipeId} onChange={e => { setEquipeId(e.target.value); if (e.target.value) setAgentId(''); }}
          placeholder="— choisir une équipe —" options={equipes.map((e: any) => ({ value: String(e.id), label: e.nom }))} />
      </div>
    </Modal>
  );
}

function ReevaluerModal({ open, onClose, incident, loading, onSubmit }: { open: boolean; onClose: () => void; incident: any; loading: boolean; onSubmit: (body: any) => void }) {
  const { impacts, urgences } = useImpactsUrgences();
  const { motsClefs } = useMotsClefs();
  const [impactId, setImpactId] = useState('');
  const [urgenceId, setUrgenceId] = useState('');
  const [resume, setResume] = useState('');
  const [ids, setIds] = useState<(string | number)[]>([]);

  useEffect(() => {
    if (!open || !incident) return;
    setImpactId(incident.impact_id ? String(incident.impact_id) : '');
    setUrgenceId(incident.urgence_id ? String(incident.urgence_id) : '');
    setResume(incident.resume ?? '');
    const noms = (incident.mots_clefs ?? []).map((n: string) => n.toLowerCase());
    setIds(motsClefs.filter((m: any) => noms.includes(String(m.nom).toLowerCase())).map((m: any) => m.id));
  }, [open, incident, motsClefs]);

  return (
    <Modal open={open} title="Réévaluer l'incident" onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} disabled={!impactId || !urgenceId} onClick={() => onSubmit({ impact_id: impactId, urgence_id: urgenceId, resume, mot_clef_ids: ids.map(Number) })}>Appliquer</Btn></>}>
      <div className="space-y-4">
        <Alert type="info">Un nouvel SLA sera calculé à partir de l'urgence et de l'impact.</Alert>
        <div className="grid grid-cols-2 gap-4">
          <Select label="Impact *" value={impactId} onChange={e => setImpactId(e.target.value)} placeholder="— choisir —"
            options={impacts.map((i: any) => ({ value: String(i.id), label: i.nom }))} />
          <Select label="Urgence *" value={urgenceId} onChange={e => setUrgenceId(e.target.value)} placeholder="— choisir —"
            options={urgences.map((u: any) => ({ value: String(u.id), label: u.nom }))} />
        </div>
        <Textarea label="Résumé" value={resume} onChange={e => setResume(e.target.value)} rows={3} />
        <KeywordMultiSelect label="Mots-clés" options={motsClefs} value={ids} onChange={setIds} />
      </div>
    </Modal>
  );
}

function GestionEditModal({ open, onClose, incident, loading, onSubmit }: { open: boolean; onClose: () => void; incident: any; loading: boolean; onSubmit: (body: any) => void }) {
  const { motsClefs } = useMotsClefs();
  const [resume, setResume] = useState('');
  const [ids, setIds] = useState<(string | number)[]>([]);

  useEffect(() => {
    if (!open || !incident) return;
    setResume(incident.resume ?? '');
    const noms = (incident.mots_clefs ?? []).map((n: string) => n.toLowerCase());
    setIds(motsClefs.filter((m: any) => noms.includes(String(m.nom).toLowerCase())).map((m: any) => m.id));
  }, [open, incident, motsClefs]);

  return (
    <Modal open={open} title="Mettre à jour le résumé et les mots-clés" onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} onClick={() => onSubmit({ resume, mot_clef_ids: ids.map(Number) })}>Enregistrer</Btn></>}>
      <div className="space-y-4">
        <Textarea label="Résumé" value={resume} onChange={e => setResume(e.target.value)} rows={3} />
        <KeywordMultiSelect label="Mots-clés" options={motsClefs} value={ids} onChange={setIds} />
      </div>
    </Modal>
  );
}

function PasserModal({ open, onClose, users, loading, onSubmit }: { open: boolean; onClose: () => void; users: any[]; loading: boolean; onSubmit: (body: any) => void }) {
  const [managerId, setManagerId] = useState('');
  const [motif, setMotif] = useState('');
  const { user } = useAuth();
  const managers = users.filter((u: any) => u.role === 'manager' && u.id !== user?.id);

  useEffect(() => { if (!open) { setManagerId(''); setMotif(''); } }, [open]);

  const selectedManager = managers.find((u: any) => u.id === managerId);

  return (
    <Modal open={open} title="Passer à un autre manager" onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} disabled={!managerId || !motif} onClick={() => onSubmit({ manager_id: managerId, motif })}>Transférer</Btn></>}>
      <div className="space-y-4">
        <Select label="Manager cible *" value={managerId} onChange={e => setManagerId(e.target.value)}           placeholder="— choisir —"
          options={managers.map((u: any) => ({ value: String(u.id), label: `${u.prenom} ${u.nom}${!u.disponible ? ' (Indisponible)' : ''}`, disabled: !u.disponible }))} />
        {selectedManager && !selectedManager.disponible && (
          <Alert type="warning">Ce manager est indisponible.</Alert>
        )}
        <Textarea label="Motif du transfert *" value={motif} onChange={e => setMotif(e.target.value)} rows={3} placeholder="Expliquez la raison du transfert..." />
      </div>
    </Modal>
  );
}

function EditRoleModal({ open, user, loading, onClose, onSubmit }: { open: boolean; user: any; loading: boolean; onClose: () => void; onSubmit: (role: string) => void }) {
  const [role, setRole] = useState('');

  useEffect(() => { setRole(user?.role ?? ''); }, [user, open]);

  return (
    <Modal open={open} title="Modifier le rôle" onClose={onClose} size="sm"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} disabled={!role || role === user?.role} onClick={() => onSubmit(role)}>Enregistrer</Btn></>}>
      <div className="space-y-4">
        <p className="text-sm text-[#45443E]">Utilisateur : <strong>{user?.prenom} {user?.nom}</strong> ({user?.email})</p>
        <Select label="Rôle *" value={role} onChange={e => setRole(e.target.value)}
          options={[
            { value: 'client', label: 'Utilisateur' },
            { value: 'agent', label: 'Agent' },
            { value: 'manager', label: 'Manager' },
            { value: 'admin', label: 'Administrateur' },
          ]} />
      </div>
    </Modal>
  );
}

function ReassignerModal({ open, onClose, users, equipes, loading, onSubmit }: { open: boolean; onClose: () => void; users: any[]; equipes: any[]; loading: boolean; onSubmit: (body: any) => void }) {
  const [agentId, setAgentId] = useState('');
  const [equipeId, setEquipeId] = useState('');
  const availableAgents = users.filter((u: any) => u.role === 'agent' && u.disponible);

  useEffect(() => { if (!open) { setAgentId(''); setEquipeId(''); } }, [open]);

  return (
    <Modal open={open} title="Réassigner" onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} disabled={!agentId && !equipeId} onClick={() => onSubmit({ agent_id: agentId || undefined, equipe_id: equipeId || undefined })}>Réassigner</Btn></>}>
      <div className="space-y-4">
        {availableAgents.length === 0 && <Alert type="warning">Aucun agent disponible actuellement. Vous pouvez réassigner à une équipe.</Alert>}
        <Select label="Nouvel agent" value={agentId} onChange={e => { setAgentId(e.target.value); if (e.target.value) setEquipeId(''); }} placeholder="— choisir —"
            options={availableAgents.map((u: any) => ({ value: String(u.id), label: `${u.prenom} ${u.nom}` }))} />
        <Select label="Ou réassigner à une équipe (tous ses agents pourront intervenir)" value={equipeId} onChange={e => { setEquipeId(e.target.value); if (e.target.value) setAgentId(''); }}
          placeholder="— choisir une équipe —" options={equipes.map((e: any) => ({ value: String(e.id), label: e.nom }))} />
      </div>
    </Modal>
  );
}

function AssignerForceModal({ open, onClose, users, loading, onSubmit }: { open: boolean; onClose: () => void; users: any[]; loading: boolean; onSubmit: (body: any) => void }) {
  const [managerId, setManagerId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [resume, setResume] = useState('');
  const managers = users.filter((u: any) => u.role === 'manager');
  const agents = users.filter((u: any) => u.role === 'agent');

  useEffect(() => { if (!open) { setManagerId(''); setAgentId(''); setResume(''); } }, [open]);

  return (
    <Modal open={open} title="Assignation forcée (Admin)" onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn variant="danger" loading={loading} disabled={!managerId && !agentId} onClick={() => onSubmit({ manager_id: managerId || undefined, agent_id: agentId || undefined, resume })}>Assigner de force</Btn></>}>
      <div className="space-y-4">
        <Alert type="warning">Cette action outrepasse les contraintes de disponibilité. Choisissez au moins un manager ou un agent.</Alert>
        <Select label="Manager" value={managerId} onChange={e => setManagerId(e.target.value)} placeholder="— aucun —"
          options={managers.map((u: any) => ({ value: String(u.id), label: `${u.prenom} ${u.nom}${!u.disponible ? ' (Indisponible)' : ''}` }))} />
        <Select label="Agent" value={agentId} onChange={e => setAgentId(e.target.value)} placeholder="— aucun —"
          options={agents.map((u: any) => ({ value: String(u.id), label: `${u.prenom} ${u.nom}${!u.disponible ? ' (Indisponible)' : ''}` }))} />
        <Textarea label="Résumé" value={resume} onChange={e => setResume(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}

// ── Edit Incident ─────────────────────────────────────────────────────────────

function EditIncidentPage() {
  useDocumentTitle('Modifier l\'incident');
  const { id } = useParams<{ id: string }>();
  const { incident, loading } = useIncidentDetail(id ?? null);
  const { motsClefs } = useMotsClefs();
  const { urgences } = useImpactsUrgences();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [urgenceId, setUrgenceId] = useState('');
  const [ids, setIds] = useState<(string | number)[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (incident) {
      setDescription(incident.description);
      setUrgenceId(incident.urgence_id ? String(incident.urgence_id) : '');
      const noms = (incident.mots_clefs ?? []).map((n: string) => n.toLowerCase());
      setIds(motsClefs.filter((m: any) => noms.includes(String(m.nom).toLowerCase())).map((m: any) => m.id));
    }
  }, [incident, motsClefs]);

  if (loading) return <LoadingSpinner />;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = { description, mot_clef_ids: ids.map(Number) };
      if (user?.role === 'client') body.urgence_id = urgenceId || null;
      await api.put(`/incidents/${id}`, body);
      navigate(`/incidents/${id}`);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-[#86847A] hover:text-[#1C1B18]"><ChevronRight size={16} className="rotate-180" /></button>
        <h1 className="text-xl font-semibold">Modifier l'incident</h1>
      </div>
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      <div className="bg-white rounded-lg border border-[#E2E1DC] p-6 space-y-4">
        <Textarea label="Description" rows={5} value={description} onChange={e => setDescription(e.target.value)} />
        {user?.role === 'client' && (
          <Select label="Urgence" value={urgenceId} onChange={e => setUrgenceId(e.target.value)} placeholder="— choisir —"
            options={urgences.map((u: any) => ({ value: String(u.id), label: u.nom }))} />
        )}
        <KeywordMultiSelect label="Mots-clés" options={motsClefs} value={ids} onChange={setIds} />
        <div className="flex justify-end gap-3">
          <Btn variant="secondary" onClick={() => navigate(-1)}>Annuler</Btn>
          <Btn loading={saving} onClick={handleSave}>Sauvegarder</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Rapport de Prestation ─────────────────────────────────────────────────────

function formatDuree(minutes: number | null) {
  if (minutes == null) return 'en cours';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

function PrestationDocuments({ prestationId, canUpload }: { prestationId: number; canUpload: boolean }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<any | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/prestations/${prestationId}/documents`).then(r => setDocs(r.data.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, [prestationId]);

  useEffect(() => { load(); }, [load]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('fichier', file);
      await api.post(`/prestations/${prestationId}/documents`, fd);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Impossible d'ajouter la pièce jointe.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#EFEFEC]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#86847A] uppercase tracking-wide">Pièces jointes</span>
        {canUpload && (
          <>
            <input ref={fileRef} type="file" accept={ACCEPTED_FILE_TYPES} className="hidden" onChange={upload} />
            <Btn variant="ghost" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}><Paperclip size={11} />Ajouter</Btn>
          </>
        )}
      </div>
      {error && <div className="mb-2"><Alert type="error">{error}</Alert></div>}
      {loading ? null : docs.length === 0 ? (
        <p className="text-xs text-[#ADABA1] italic">Aucune pièce jointe.</p>
      ) : (
        <ul className="space-y-1">
          {docs.map((d: any) => (
            <li key={d.id}>
              <button type="button" onClick={() => setViewing(d)} className="text-xs text-[#2E4A6E] hover:underline flex items-center gap-1">
                <Paperclip size={10} />{d.nom_original}
              </button>
            </li>
          ))}
        </ul>
      )}
      <PieceJointeViewerModal piece={viewing} fileUrl={viewing ? apiFileUrl(`/prestations/${prestationId}/documents/${viewing.id}`) : null} onClose={() => setViewing(null)} />
    </div>
  );
}

function RapportPrestationPage() {
  useDocumentTitle('Rapport de prestation');
  const { id } = useParams<{ id: string }>();
  const { incident } = useIncidentDetail(id ?? null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const canWrite = user?.role === 'agent' || user?.role === 'admin';
  const [prestations, setPrestations] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [form, setForm] = useState({ commentaires: '', actions_menees: '', cause_racine: '', solution_apportee: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const loadPrestations = useCallback(() => {
    if (!id) return;
    setListLoading(true);
    api.get(`/incidents/${id}/rapport-prestation`).then(r => {
      setPrestations(r.data.data ?? []);
    }).catch(() => {}).finally(() => setListLoading(false));
  }, [id]);

  useEffect(() => { loadPrestations(); }, [loadPrestations]);

  const prestationActive = prestations.find(p => p.active);
  const peutPublier = canWrite && prestationActive && !prestationActive.rapport;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rempli = Object.values(form).some(v => v.trim() !== '');
    if (!rempli) { setError('Renseignez au moins un champ (à défaut, le commentaire).'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post(`/incidents/${id}/rapport-prestation`, form);
      setSuccess(true);
      setForm({ commentaires: '', actions_menees: '', cause_racine: '', solution_apportee: '' });
      loadPrestations();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-[#86847A] hover:text-[#1C1B18]"><ChevronRight size={16} className="rotate-180" /></button>
        <div>
          <h1 className="text-xl font-semibold">Rapports de prestation</h1>
          {incident && <p className="text-xs text-[#86847A] mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{incident.num_id}</p>}
        </div>
      </div>
      {success && <div className="mb-4"><Alert type="success">Rapport publié avec succès. La prestation est terminée.</Alert></div>}
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}

      {listLoading ? <LoadingSpinner /> : prestations.length === 0 ? (
        <EmptyState icon={FileText} title="Aucune prestation" description="Cet incident n'a pas encore de prestation." />
      ) : (
        <div className="space-y-4 mb-6">
          {prestations.map(p => (
            <div key={p.id} className="bg-white rounded-lg border border-[#E2E1DC] p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-[#1C1B18]">{p.prestataire ? `${p.prestataire.prenom ?? ''} ${p.prestataire.nom ?? ''}`.trim() : '—'}</p>
                  <p className="text-xs text-[#86847A]">{formatDuree(p.duree_minutes)}{p.active ? ' · en cours' : ''}</p>
                </div>
                {p.note != null && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: M.amber50, color: M.amber700 }}>Note client : {p.note}/5</span>
                )}
              </div>
              {p.rapport ? (
                <div className="text-xs text-[#45443E] border-t border-[#EFEFEC] pt-3">
                  <div className="space-y-2">
                    {p.rapport.commentaires && <p><strong>Commentaires :</strong> {p.rapport.commentaires}</p>}
                    {p.rapport.actions_menees && <p><strong>Actions menées :</strong> {p.rapport.actions_menees}</p>}
                    {p.rapport.cause_racine && <p><strong>Cause racine :</strong> {p.rapport.cause_racine}</p>}
                    {p.rapport.solution_apportee && <p><strong>Solution apportée :</strong> {p.rapport.solution_apportee}</p>}
                  </div>
                  <PrestationDocuments prestationId={p.id} canUpload={false} />
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#ADABA1] italic">Aucun rapport publié{p.active ? ' pour le moment' : ''}.</p>
                  {p.active && <PrestationDocuments prestationId={p.id} canUpload={canWrite} />}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {peutPublier && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#E2E1DC] p-6 space-y-5">
          <h2 className="text-sm font-semibold text-[#1C1B18]">Publier le rapport de la prestation en cours</h2>
          <Alert type="info">La publication met fin à cette prestation. Ajoutez vos pièces jointes ci-dessus avant de publier : il ne sera plus possible d'en ajouter après.</Alert>
          <Textarea label="Commentaires" rows={3} value={form.commentaires} onChange={e => setForm(f => ({ ...f, commentaires: e.target.value }))} />
          <Textarea label="Actions menées" rows={4} value={form.actions_menees} onChange={e => setForm(f => ({ ...f, actions_menees: e.target.value }))} placeholder="Décrivez les étapes de l'intervention..." />
          <Textarea label="Cause racine" rows={3} value={form.cause_racine} onChange={e => setForm(f => ({ ...f, cause_racine: e.target.value }))} />
          <Textarea label="Solution apportée" rows={3} value={form.solution_apportee} onChange={e => setForm(f => ({ ...f, solution_apportee: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E1DC]">
            <Btn variant="secondary" type="button" onClick={() => navigate(-1)}>Retour</Btn>
            <Btn type="submit" loading={loading}>Publier le rapport</Btn>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

function ArticlesPage() {
  useDocumentTitle('Base de connaissances');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const fromIncident = urlParams.get('from_incident');
  const initKeywords = urlParams.get('mots_clefs') ?? '';

  const [search, setSearch] = useState('');
  const [motsFilter, setMotsFilter] = useState(initKeywords);
  const [showForm, setShowForm] = useState(false);
  const [editArticle, setEditArticle] = useState<any | null>(null);

  const queryParams = useMemo(() => ({
    ...(search ? { search } : {}),
    ...(motsFilter ? { mots_clefs: motsFilter } : {}),
  }), [search, motsFilter]);

  const { data, loading, create, update, remove } = useArticles(queryParams);
  const articles = data?.data ?? [];

  return (
    <div className="max-w-5xl mx-auto" style={user?.role === 'client' ? { padding: '24px' } : {}}>
      {fromIncident && (
        <div className="mb-6">
          <Alert type="info">
            Des articles correspondent à votre incident.{' '}
            <button className="underline" onClick={() => navigate(`/incidents/${fromIncident}`)}>Consulter l'incident →</button>
          </Alert>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1C1B18]">Base de connaissances</h1>
        {['agent', 'manager'].includes(user?.role ?? '') && (
          <Btn size="sm" onClick={() => { setEditArticle(null); setShowForm(true); }}><Plus size={14} />Nouvel article</Btn>
        )}
      </div>

      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ADABA1]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E1DC] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#2E4A6E]/30 focus:border-[#2E4A6E]" />
        </div>
        {initKeywords && (
          <Btn variant="outline" size="sm" onClick={() => setMotsFilter('')}><X size={12} />Effacer filtre</Btn>
        )}
      </div>

      {loading ? <LoadingSpinner /> : articles.length === 0 ? (
        <EmptyState icon={Book} title="Aucun article" description="La base de connaissances est vide." />
      ) : (
        <div className="grid gap-4">
          {articles.map((a: any) => (
            <div key={a.id} className="bg-white rounded-lg border border-[#E2E1DC] p-5 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => navigate(`/articles/${a.id}`)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-[#1C1B18]">{a.titre}</h3>
                    {a.statut !== 'publie' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: a.statut === 'brouillon' ? M.amber50 : M.n100, color: a.statut === 'brouillon' ? M.amber700 : M.n500 }}>
                        {a.statut === 'brouillon' ? 'Brouillon' : 'Archivé'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#86847A] line-clamp-2">{a.contenu.replace(/#+\s/g, '').slice(0, 200)}</p>
                  {a.mots_clefs?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {a.mots_clefs.map((k: any) => (
                        <span key={k.id ?? k.nom} className="text-[10px] px-2 py-0.5 rounded" style={{ background: M.n100, color: M.n600 }}>{k.nom ?? k}</span>
                      ))}
                    </div>
                  )}
                </div>
                {['agent', 'manager'].includes(user?.role ?? '') && (
                  <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Btn variant="ghost" size="sm" onClick={() => { setEditArticle(a); setShowForm(true); }}><Edit3 size={12} /></Btn>
                    {user?.role === 'manager' && (
                      <Btn variant="ghost" size="sm" onClick={async () => { if (window.confirm('Supprimer cet article ?')) await remove(a.id); }}><Trash2 size={12} /></Btn>
                    )}
                  </div>
                )}
                {user?.role === 'admin' && (
                  <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Btn variant="ghost" size="sm" onClick={() => { setEditArticle(a); setShowForm(true); }}><Lock size={12} /></Btn>
                    <Btn variant="ghost" size="sm" onClick={async () => { if (window.confirm('Supprimer cet article ?')) await remove(a.id); }}><Trash2 size={12} /></Btn>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ArticleFormModal open={showForm} onClose={() => setShowForm(false)} article={editArticle}
        onSave={async (body) => {
          if (editArticle) await update(editArticle.id, body);
          else await create(body);
          setShowForm(false);
        }} />
    </div>
  );
}

function ArticleFormModal({ open, onClose, article, onSave }: { open: boolean; onClose: () => void; article: any; onSave: (b: any) => Promise<void> }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { motsClefs } = useMotsClefs();
  const [form, setForm] = useState({ titre: '', contenu: '', statut: 'brouillon' });
  const [ids, setIds] = useState<(string | number)[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (article) {
      setForm({ titre: article.titre, contenu: article.contenu, statut: article.statut });
      const noms = (article.mots_clefs ?? []).map((n: string) => String(n).toLowerCase());
      setIds(motsClefs.filter((m: any) => noms.includes(String(m.nom).toLowerCase())).map((m: any) => m.id));
    } else {
      setForm({ titre: '', contenu: '', statut: 'brouillon' });
      setIds([]);
    }
  }, [article, open, motsClefs]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (isAdmin) await onSave({ statut: form.statut });
      else await onSave({ titre: form.titre, contenu: form.contenu, mot_clef_ids: ids.map(Number) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title={isAdmin ? "Statut de l'article" : (article ? "Modifier l'article" : 'Nouvel article')} onClose={onClose} size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} onClick={handleSave}>Enregistrer</Btn></>}>
      <div className="space-y-4">
        {isAdmin ? (
          <>
            <p className="text-sm text-[#45443E]"><strong>{article?.titre}</strong></p>
            <Select label="Statut" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
              options={[{ value: 'brouillon', label: 'Brouillon' }, { value: 'publie', label: 'Publié' }, { value: 'archive', label: 'Archivé' }]} />
            <Alert type="info">Seul l'administrateur peut changer le statut. Le contenu n'est pas modifiable ici.</Alert>
          </>
        ) : (
          <>
            <Input label="Titre *" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
            <Textarea label="Contenu (Markdown)" rows={10} value={form.contenu} onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))} />
            <KeywordMultiSelect label="Mots-clés" options={motsClefs} value={ids} onChange={setIds} />
            <Alert type="info">L'article est créé en brouillon. Un administrateur doit le publier.</Alert>
          </>
        )}
      </div>
    </Modal>
  );
}

function ArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { article, loading, error } = useArticle(id ?? null);
  useDocumentTitle(article?.titre ?? 'Article');

  return (
    <div className="max-w-3xl mx-auto">
      <button className="flex items-center gap-1 text-xs text-[#605F57] hover:text-[#1C1B18] mb-4" onClick={() => navigate('/articles')}>
        <ArrowLeft size={14} />Retour à la base de connaissances
      </button>
      {loading ? <LoadingSpinner /> : error ? (
        <Alert type="error">{error}</Alert>
      ) : !article ? (
        <Alert type="error">Article introuvable.</Alert>
      ) : (
        <div className="bg-white rounded-lg border border-[#E2E1DC] p-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-[#1C1B18]">{article.titre}</h1>
            {article.statut !== 'publie' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: article.statut === 'brouillon' ? M.amber50 : M.n100, color: article.statut === 'brouillon' ? M.amber700 : M.n500 }}>
                {article.statut === 'brouillon' ? 'Brouillon' : 'Archivé'}
              </span>
            )}
          </div>
          {article.mots_clefs?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 mb-5">
              {article.mots_clefs.map((k: any) => (
                <span key={k.id ?? k.nom} className="text-[10px] px-2 py-0.5 rounded" style={{ background: M.n100, color: M.n600 }}>{k.nom ?? k}</span>
              ))}
            </div>
          )}
          <p className="text-sm text-[#45443E] whitespace-pre-wrap leading-relaxed">{article.contenu}</p>
        </div>
      )}
    </div>
  );
}

// ── Users Page ────────────────────────────────────────────────────────────────

function UsersPage() {
  useDocumentTitle('Utilisateurs');
  const { data, loading, create, update, remove, setDisponibilite, setActif, resendInvitation } = useUsers();
  const users = data?.data ?? [];
  const { data: equipesData } = useEquipes();
  const equipes = equipesData?.data ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [actionError, setActionError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [resendingId, setResendingId] = useState<string | number | null>(null);
  const [editRoleUser, setEditRoleUser] = useState<any | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  const handleDelete = async (u: any) => {
    setDeleteError('');
    try {
      await remove(u.id);
      setConfirmDelete(null);
    } catch (e: any) {
      setDeleteError(e.response?.data?.message ?? 'Erreur.');
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1C1B18]">Utilisateurs</h1>
        <Btn size="sm" onClick={() => { setEditUser(null); setInviteSuccess(''); setShowForm(true); }}><Plus size={14} />Inviter un utilisateur</Btn>
      </div>
      {inviteSuccess && <div className="mb-4"><Alert type="success">{inviteSuccess}</Alert></div>}
      {actionError && <div className="mb-4"><Alert type="error">{actionError}</Alert></div>}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-lg border border-[#E2E1DC] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E2E1DC]">
                {['Utilisateur', 'Rôle', 'Équipe', 'Statut', 'Dispo.', 'Dernière connexion', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#86847A] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEFEC]">
              {users.map((u: any) => {
                const equipe = equipes.find((e: any) => e.id === u.id_equipe);
                return (
                  <tr key={u.id} className="hover:bg-[#F7F7F5] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-[#1C1B18]">{u.prenom} {u.nom}</p>
                          <p className="text-xs text-[#86847A]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditRoleUser(u)} className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity" title="Modifier le rôle">
                        <RoleBadge role={u.role} /><Edit3 size={11} className="text-[#ADABA1]" />
                      </button>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs text-[#605F57]">{equipe?.nom ?? '—'}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={async () => {
                        try { await setActif(u.id, !u.actif); }
                        catch (e: any) { setActionError(e.response?.data?.message ?? 'Erreur.'); }
                      }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ background: u.actif ? M.sage50 : M.brick50, color: u.actif ? M.sage700 : M.brick700 }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.actif ? M.sage500 : M.brick500 }} />
                        {u.actif ? 'Actif' : (u.invitation_en_attente ? 'Inactif — invitation' : 'Inactif')}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {['agent', 'manager'].includes(u.role) ? (
                        <button onClick={() => setDisponibilite(u.id, !u.disponible)} className="flex items-center">
                          <div className={`w-8 h-4 rounded-full transition-colors relative ${u.disponible ? 'bg-[#5C7A4C]' : 'bg-[#CFCEC7]'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${u.disponible ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </div>
                        </button>
                      ) : <span className="text-xs text-[#ADABA1]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {u.date_derniere_connexion ? new Date(u.date_derniere_connexion).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!u.actif && (
                          <Btn variant="ghost" size="sm" loading={resendingId === u.id} onClick={async () => {
                            setActionError(''); setInviteSuccess(''); setResendingId(u.id);
                            try {
                              await resendInvitation(u.id);
                              setInviteSuccess("L'invitation a été envoyée.");
                            } catch (e: any) {
                              setActionError(e.response?.data?.message ?? "L'email d'invitation n'a pas pu être envoyé. Veuillez réessayer.");
                            } finally { setResendingId(null); }
                          }}><Send size={12} /></Btn>
                        )}
                        <Btn variant="ghost" size="sm" onClick={() => setConfirmDelete(u)}><Trash2 size={12} /></Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UserFormModal open={showForm} onClose={() => setShowForm(false)}
        onSave={async (body) => {
          const res = await create(body);
          setInviteSuccess(res?.message ?? "L'invitation a été envoyée.");
          setShowForm(false);
        }} />

      <EditRoleModal open={!!editRoleUser} user={editRoleUser} loading={roleLoading} onClose={() => setEditRoleUser(null)}
        onSubmit={async (role) => {
          setActionError(''); setRoleLoading(true);
          try {
            await update(editRoleUser.id, { role });
            setEditRoleUser(null);
          } catch (e: any) {
            setActionError(e.response?.data?.message ?? 'Erreur.');
          } finally { setRoleLoading(false); }
        }} />

      <Modal open={!!confirmDelete} title="Supprimer l'utilisateur" onClose={() => { setConfirmDelete(null); setDeleteError(''); }} size="sm"
        footer={<><Btn variant="secondary" onClick={() => { setConfirmDelete(null); setDeleteError(''); }}>Annuler</Btn><Btn variant="danger" onClick={() => handleDelete(confirmDelete)}>Supprimer</Btn></>}>
        {deleteError && <div className="mb-3"><Alert type="error">{deleteError}</Alert></div>}
        <p className="text-sm text-[#45443E]">Voulez-vous supprimer <strong>{confirmDelete?.prenom} {confirmDelete?.nom}</strong> ? Cette action est irréversible.</p>
      </Modal>
    </div>
  );
}

function UserFormModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (b: any) => Promise<void> }) {
  const [form, setForm] = useState({ email: '', role: 'client' });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormError('');
    setFieldErrors({});
    setForm({ email: '', role: 'client' });
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    setFormError('');
    setFieldErrors({});
    try {
      await onSave(form);
    } catch (e: any) {
      const data = e.response?.data;
      const emailErr = data?.errors?.email?.[0];
      if (emailErr) setFieldErrors({ email: emailErr });
      setFormError(data?.message ?? "L'email d'invitation n'a pas pu être envoyé. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title="Inviter un utilisateur" onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} onClick={handleSave}>Envoyer l'invitation</Btn></>}>
      <div className="space-y-4">
        {formError && <Alert type="error">{formError}</Alert>}
        <Input label="Email *" type="email" value={form.email} error={fieldErrors.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <Select label="Rôle *" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          options={[{ value: 'client', label: 'Utilisateur' }, { value: 'agent', label: 'Agent' }, { value: 'manager', label: 'Manager' }, { value: 'admin', label: 'Administrateur' }]} />
        <Alert type="info">Seul l'e-mail est nécessaire. Le destinataire renseignera ses informations à l'activation du compte.</Alert>
      </div>
    </Modal>
  );
}

// ── Équipes Page ──────────────────────────────────────────────────────────────

function EquipesPage() {
  useDocumentTitle('Équipes');
  const { data, loading, create, update, remove } = useEquipes();
  const { data: usersData } = useUsers();
  const equipes = data?.data ?? [];
  const agents = (usersData?.data ?? []).filter((u: any) => u.role === 'agent');
  const [showForm, setShowForm] = useState(false);
  const [editEquipe, setEditEquipe] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async (e: any) => {
    setDeleteError('');
    try { await remove(e.id); setConfirmDelete(null); }
    catch (err: any) { setDeleteError(err.response?.data?.message ?? 'Erreur.'); }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1C1B18]">Équipes</h1>
        <Btn size="sm" onClick={() => { setEditEquipe(null); setShowForm(true); }}><Plus size={14} />Nouvelle équipe</Btn>
      </div>
      {loading ? <LoadingSpinner /> : equipes.length === 0 ? <EmptyState icon={Building2} title="Aucune équipe" /> : (
        <div className="grid gap-4">
          {equipes.map((eq: any) => (
            <div key={eq.id} className="bg-white rounded-lg border border-[#E2E1DC] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#1C1B18]">{eq.nom}</h3>
                  <p className="text-xs text-[#86847A] mt-1">{eq.description}</p>
                </div>
                <div className="flex gap-1">
                  <Btn variant="ghost" size="sm" onClick={() => { setEditEquipe(eq); setShowForm(true); }}><Edit3 size={12} /></Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setConfirmDelete(eq)}><Trash2 size={12} /></Btn>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(eq.membres ?? []).length === 0
                  ? <span className="text-xs text-[#86847A]">Aucun membre</span>
                  : (eq.membres ?? []).map((m: any) => (
                    <div key={m.id ?? m} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs" style={{ background: M.n100 }}>
                      <Avatar user={m.prenom ? m : { prenom: '?', nom: '?' }} size="xs" />
                      <span className="text-[#45443E]">{m.prenom} {m.nom}</span>
                      {m.disponible === false && <span className="text-[10px] text-[#A8402F]">(indisponible)</span>}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EquipeFormModal open={showForm} onClose={() => setShowForm(false)} equipe={editEquipe} agents={agents}
        onSave={async (body) => { if (editEquipe) await update(editEquipe.id, body); else await create(body); setShowForm(false); }} />

      <Modal open={!!confirmDelete} title="Supprimer l'équipe" onClose={() => { setConfirmDelete(null); setDeleteError(''); }} size="sm"
        footer={<><Btn variant="secondary" onClick={() => { setConfirmDelete(null); setDeleteError(''); }}>Annuler</Btn><Btn variant="danger" onClick={() => handleDelete(confirmDelete)}>Supprimer</Btn></>}>
        {deleteError && <div className="mb-3"><Alert type="error">{deleteError}</Alert></div>}
        <p className="text-sm text-[#45443E]">Voulez-vous supprimer l'équipe <strong>{confirmDelete?.nom}</strong> ?</p>
      </Modal>
    </div>
  );
}

function EquipeFormModal({ open, onClose, equipe, agents, onSave }: { open: boolean; onClose: () => void; equipe: any; agents: any[]; onSave: (b: any) => Promise<void> }) {
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (equipe) {
      setNom(equipe.nom);
      setDescription(equipe.description);
      const members = equipe.membres ?? [];
      setSelectedAgents(members.map((m: any) => String(m.id ?? m)));
    } else {
      setNom(''); setDescription(''); setSelectedAgents([]);
    }
  }, [equipe, open]);

  const toggleAgent = (id: string) => setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);

  const handleSave = async () => {
    setLoading(true);
    try { await onSave({ nom, description, membres: selectedAgents }); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} title={equipe ? "Modifier l'équipe" : 'Nouvelle équipe'} onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} onClick={handleSave}>Enregistrer</Btn></>}>
      <div className="space-y-4">
        <Input label="Nom *" value={nom} onChange={e => setNom(e.target.value)} />
        <Textarea label="Description" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        <div>
          <p className="text-xs font-medium text-[#605F57] uppercase tracking-wide mb-2">Membres (agents)</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {agents.map((a: any) => (
              <label key={a.id} className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer hover:bg-[#F7F7F5]">
                <input type="checkbox" checked={selectedAgents.map(String).includes(String(a.id))} onChange={() => toggleAgent(String(a.id))} className="rounded" />
                <Avatar user={a} size="xs" />
                <span className="text-sm text-[#45443E]">{a.prenom} {a.nom}</span>
                {!a.disponible && <span className="text-[10px] text-[#86847A] ml-auto">(indisponible)</span>}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Actifs Page ───────────────────────────────────────────────────────────────

function ActifsPage() {
  useDocumentTitle('Actifs');
  const { user } = useAuth();
  const canManage = user?.role === 'admin';
  const { data, loading, create, update, remove } = useActifs();
  const actifs = data?.data ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editActif, setEditActif] = useState<any | null>(null);
  const [viewActif, setViewActif] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [showTypes, setShowTypes] = useState(false);

  const handleDelete = async (a: any) => {
    setDeleteError('');
    try { await remove(a.id); setConfirmDelete(null); }
    catch (err: any) { setDeleteError(err.response?.data?.message ?? 'Erreur.'); }
  };

  const statutStyle = (s: string) => s === 'actif' ? { bg: M.sage50, text: M.sage700 } : s === 'hors_service' ? { bg: M.brick50, text: M.brick700 } : { bg: M.amber50, text: M.amber700 };
  const statutLbl = (s: string) => ({ actif: 'Actif', hors_service: 'Hors service', maintenance: 'Maintenance' }[s] ?? s);

  return (
    <div className="max-w-5xl mx-auto" style={user?.role === 'client' ? { padding: '24px' } : {}}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-[#1C1B18]">Actifs</h1>
        {canManage && (
          <div className="flex gap-2">
            <Btn size="sm" variant="secondary" onClick={() => setShowTypes(true)}><Tag size={14} />Types d'actifs</Btn>
            <Btn size="sm" onClick={() => { setEditActif(null); setShowForm(true); }}><Plus size={14} />Nouvel actif</Btn>
          </div>
        )}
      </div>
      {loading ? <LoadingSpinner /> : actifs.length === 0 ? (
        <EmptyState icon={HardDrive} title="Aucun actif" description="Aucun actif à afficher." />
      ) : (
        <div className="bg-white rounded-lg border border-[#E2E1DC] overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[#E2E1DC]">
                {(canManage ? ['Nom', 'Type', 'Statut', 'Description', ''] : ['Nom', 'Type', 'Statut', 'Description']).map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#86847A] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEFEC]">
              {actifs.map((a: any) => {
                const sc = statutStyle(a.statut);
                return (
                  <tr key={a.id} className="hover:bg-[#F7F7F5] cursor-pointer" onClick={() => setViewActif(a)}>
                    <td className="px-4 py-3 text-sm font-medium text-[#1C1B18]">{a.nom}</td>
                    <td className="px-4 py-3 text-xs text-[#605F57]">{a.typeActif?.nom ?? a.type}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{statutLbl(a.statut)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#86847A]">{a.description}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Btn variant="ghost" size="sm" onClick={() => { setEditActif(a); setShowForm(true); }}><Edit3 size={12} /></Btn>
                          <Btn variant="ghost" size="sm" onClick={() => setConfirmDelete(a)}><Trash2 size={12} /></Btn>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ActifDetailModal actif={viewActif} onClose={() => setViewActif(null)} statutLbl={statutLbl} statutStyle={statutStyle} />

      {canManage && (
        <>
          <ActifFormModal open={showForm} onClose={() => setShowForm(false)} actif={editActif}
            onSave={async (body) => { if (editActif) await update(editActif.id, body); else await create(body); setShowForm(false); }} />

          <Modal open={!!confirmDelete} title="Supprimer l'actif" onClose={() => { setConfirmDelete(null); setDeleteError(''); }} size="sm"
            footer={<><Btn variant="secondary" onClick={() => { setConfirmDelete(null); setDeleteError(''); }}>Annuler</Btn><Btn variant="danger" onClick={() => handleDelete(confirmDelete)}>Supprimer</Btn></>}>
            {deleteError && <div className="mb-3"><Alert type="error">{deleteError}</Alert></div>}
            <p className="text-sm text-[#45443E]">Supprimer <strong>{confirmDelete?.nom}</strong> ? Les incidents liés ne seront pas supprimés.</p>
          </Modal>

          <TypesActifsModal open={showTypes} onClose={() => setShowTypes(false)} />
        </>
      )}
    </div>
  );
}

function TypesActifsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { types, loading, create, update, remove } = useTypesActifs();
  const [nouveau, setNouveau] = useState('');
  const [editing, setEditing] = useState<{ id: string; nom: string } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!nouveau.trim()) return;
    setSaving(true); setError('');
    try { await create(nouveau.trim()); setNouveau(''); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Erreur.'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editing || !editing.nom.trim()) return;
    setSaving(true); setError('');
    try { await update(editing.id, editing.nom.trim()); setEditing(null); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Erreur.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try { await remove(id); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Erreur.'); }
  };

  return (
    <Modal open={open} title="Types d'actifs" onClose={onClose} size="sm" footer={<Btn variant="secondary" onClick={onClose}>Fermer</Btn>}>
      {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
      <div className="flex gap-2 mb-3">
        <Input placeholder="Nouveau type" value={nouveau} onChange={e => setNouveau(e.target.value)} />
        <Btn loading={saving} onClick={handleCreate}><Plus size={14} /></Btn>
      </div>
      {loading ? <LoadingSpinner /> : (
        <div className="divide-y divide-[#EFEFEC] border-t border-[#EFEFEC]">
          {types.map((t: any) => (
            <div key={t.id} className="flex items-center gap-2 py-2">
              {editing?.id === String(t.id) ? (
                <>
                  <Input value={editing.nom} onChange={e => setEditing({ id: editing.id, nom: e.target.value })} className="flex-1" />
                  <Btn size="sm" loading={saving} onClick={handleUpdate}>OK</Btn>
                  <Btn size="sm" variant="secondary" onClick={() => setEditing(null)}>Annuler</Btn>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-[#45443E]">{t.nom}</span>
                  <Btn size="sm" variant="ghost" onClick={() => setEditing({ id: String(t.id), nom: t.nom })}><Edit3 size={12} /></Btn>
                  <Btn size="sm" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 size={12} /></Btn>
                </>
              )}
            </div>
          ))}
          {types.length === 0 && <p className="text-sm text-[#86847A] py-2">Aucun type défini.</p>}
        </div>
      )}
    </Modal>
  );
}

function ActifDetailModal({ actif, onClose, statutLbl, statutStyle }: { actif: any | null; onClose: () => void; statutLbl: (s: string) => string; statutStyle: (s: string) => { bg: string; text: string } }) {
  if (!actif) return null;
  const sc = statutStyle(actif.statut);
  return (
    <Modal open={!!actif} title={actif.nom} onClose={onClose} size="md" footer={<Btn variant="secondary" onClick={onClose}>Fermer</Btn>}>
      <div className="space-y-1">
        <InfoRow label="Type" value={actif.typeActif?.nom ?? actif.type} />
        <InfoRow label="Statut" value={<span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{statutLbl(actif.statut)}</span>} />
        <InfoRow label="Propriétaire(s)" value={actif.proprietaires?.length ? actif.proprietaires.map((p: any) => `${p.prenom ?? ''} ${p.nom ?? ''}`.trim()).join(', ') : '—'} />
        <InfoRow label="Description" value={actif.description || '—'} />
      </div>
    </Modal>
  );
}

function ActifFormModal({ open, onClose, actif, onSave }: { open: boolean; onClose: () => void; actif: any; onSave: (b: any) => Promise<void> }) {
  const { types: typesActifs } = useTypesActifs();
  const { data: usersData } = useUsers();
  const users = usersData?.data ?? [];
  const [form, setForm] = useState({ nom: '', type_actif_id: '', description: '', statut: 'actif' });
  const [proprietaireIds, setProprietaireIds] = useState<(string | number)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (actif) {
      setForm({ nom: actif.nom, type_actif_id: String(actif.type_actif_id ?? ''), description: actif.description ?? '', statut: actif.statut });
      setProprietaireIds((actif.proprietaires ?? []).map((p: any) => p.id));
    } else {
      setForm({ nom: '', type_actif_id: '', description: '', statut: 'actif' });
      setProprietaireIds([]);
    }
  }, [actif, open]);

  const handleSave = async () => {
    if (!form.type_actif_id) { setError('Le type est requis.'); return; }
    setLoading(true);
    setError('');
    try { await onSave({ ...form, proprietaire_ids: proprietaireIds.map(Number) }); }
    catch (err: any) { setError(err.response?.data?.message ?? 'Erreur lors de l’enregistrement.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} title={actif ? "Modifier l'actif" : 'Nouvel actif'} onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} onClick={handleSave}>Enregistrer</Btn></>}>
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <Input label="Nom *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
        <Select label="Type *" value={form.type_actif_id} onChange={e => setForm(f => ({ ...f, type_actif_id: e.target.value }))} placeholder="— choisir —"
          options={typesActifs.map((t: any) => ({ value: String(t.id), label: t.nom }))} />
        <Textarea label="Description" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <Select label="Statut" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
          options={[{ value: 'actif', label: 'Actif' }, { value: 'hors_service', label: 'Hors service' }, { value: 'maintenance', label: 'Maintenance' }]} />
        <KeywordMultiSelect label="Propriétaire(s)" options={users.map((u: any) => ({ id: u.id, nom: `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || u.email }))} value={proprietaireIds} onChange={setProprietaireIds} />
      </div>
    </Modal>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────

function SettingsPage() {
  useDocumentTitle('Paramètres');
  const [tab, setTab] = useState<'sla' | 'matrix' | 'motsClefs' | 'general'>('sla');
  const labels: Record<string, string> = { sla: 'Configuration SLA', matrix: 'Matrice de priorité', motsClefs: 'Mots-clés', general: 'Général' };
  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-[#1C1B18] mb-6">Paramètres</h1>
      <div className="flex gap-1 mb-6 bg-[#EFEFEC] rounded-lg p-1 w-fit">
        {(['sla', 'matrix', 'motsClefs', 'general'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm transition-colors ${tab === t ? 'bg-white font-medium text-[#1C1B18] shadow-sm' : 'text-[#605F57]'}`}>
            {labels[t]}
          </button>
        ))}
      </div>
      {tab === 'sla' ? <SLAConfig /> : tab === 'matrix' ? <PriorityMatrix /> : tab === 'motsClefs' ? <MotsClefsConfig /> : <GeneralConfig />}
    </div>
  );
}

function MotsClefsConfig() {
  const { motsClefs, loading, create, update, remove } = useMotsClefs();
  const [nouveau, setNouveau] = useState('');
  const [editing, setEditing] = useState<{ id: string; nom: string } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!nouveau.trim()) return;
    setSaving(true); setError('');
    try { await create(nouveau.trim()); setNouveau(''); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Erreur.'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editing || !editing.nom.trim()) return;
    setSaving(true); setError('');
    try { await update(editing.id, editing.nom.trim()); setEditing(null); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Erreur.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try { await remove(id); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Erreur.'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-lg border border-[#E2E1DC] p-5 space-y-4 max-w-lg">
      {error && <Alert type="error">{error}</Alert>}
      <div className="flex gap-2">
        <Input placeholder="Nouveau mot-clé" value={nouveau} onChange={e => setNouveau(e.target.value)} />
        <Btn loading={saving} onClick={handleCreate}><Plus size={14} />Ajouter</Btn>
      </div>
      <div className="divide-y divide-[#EFEFEC] border-t border-[#EFEFEC]">
        {motsClefs.map((m: any) => (
          <div key={m.id} className="flex items-center gap-2 py-2">
            {editing?.id === String(m.id) ? (
              <>
                <Input value={editing.nom} onChange={e => setEditing({ id: editing.id, nom: e.target.value })} className="flex-1" />
                <Btn size="sm" loading={saving} onClick={handleUpdate}>Enregistrer</Btn>
                <Btn size="sm" variant="secondary" onClick={() => setEditing(null)}>Annuler</Btn>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-[#45443E]">{m.nom}</span>
                <Btn size="sm" variant="ghost" onClick={() => setEditing({ id: String(m.id), nom: m.nom })}><Edit3 size={12} /></Btn>
                <Btn size="sm" variant="ghost" onClick={() => handleDelete(m.id)}><Trash2 size={12} /></Btn>
              </>
            )}
          </div>
        ))}
        {motsClefs.length === 0 && <p className="text-sm text-[#86847A] py-2">Aucun mot-clé défini.</p>}
      </div>
    </div>
  );
}

function GeneralConfig() {
  const [delai, setDelai] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/parametres').then(r => setDelai(r.data.data.delai_reouverture_jours)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess(false);
    try {
      await api.put('/parametres', { delai_reouverture_jours: delai });
      setSuccess(true);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erreur.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-lg border border-[#E2E1DC] p-5 space-y-4 max-w-md">
      {success && <Alert type="success">Paramètre enregistré.</Alert>}
      {error && <Alert type="error">{error}</Alert>}
      <Input type="number" min={1} max={365} label="Délai de réouverture d'un incident clôturé (jours)"
        value={delai} onChange={e => setDelai(Number(e.target.value))} />
      <p className="text-xs text-[#86847A]">
        Une fois un incident clôturé par un agent ou un manager, le demandeur peut le rouvrir pendant ce délai.
        Si la clôture vient du demandeur lui-même, l'incident ne peut jamais être rouvert.
      </p>
      <div className="flex justify-end">
        <Btn loading={saving} onClick={handleSave}>Enregistrer</Btn>
      </div>
    </div>
  );
}

function SLAConfig() {
  const { slas, loading, updateSlas } = useSlas();
  const [localSlas, setLocalSlas] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => { if (slas.length) setLocalSlas(slas.map((s: any) => ({ ...s }))); }, [slas]);

  const updateField = (id: string, field: string, val: number) => {
    setLocalSlas(prev => prev.map(s => String(s.id) === String(id) ? { ...s, [field]: val } : s));
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess(false);
    try { await updateSlas(localSlas); setSuccess(true); }
    catch (e: any) { setError(e.response?.data?.message ?? 'Erreur.'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      {success && <Alert type="success">Configuration SLA enregistrée.</Alert>}
      {error && <Alert type="error">{error}</Alert>}
      {localSlas.map((sla: any) => (
        <div key={sla.id} className="bg-white rounded-lg border border-[#E2E1DC] p-5">
          <h3 className="text-sm font-semibold text-[#1C1B18] mb-4">{sla.nom}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#605F57] uppercase tracking-wide block mb-1">Temps de réponse (min)</label>
              <input type="number" min={1} value={sla.temps_reponse}
                onChange={e => updateField(sla.id, 'temps_reponse', parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-[#E2E1DC] rounded focus:outline-none focus:ring-2 focus:ring-[#2E4A6E]/30" />
              <p className="text-xs text-[#86847A] mt-1">{fmtMin(sla.temps_reponse)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-[#605F57] uppercase tracking-wide block mb-1">Temps de résolution (min)</label>
              <input type="number" min={1} value={sla.temps_resolution}
                onChange={e => updateField(sla.id, 'temps_resolution', parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-[#E2E1DC] rounded focus:outline-none focus:ring-2 focus:ring-[#2E4A6E]/30" />
              <p className="text-xs text-[#86847A] mt-1">{fmtMin(sla.temps_resolution)}</p>
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <Btn loading={saving} onClick={handleSave}>Enregistrer les SLA</Btn>
      </div>
    </div>
  );
}

function PriorityMatrix() {
  const { impacts, urgences, priorites, matrice, loading } = useImpactsUrgences();
  if (loading) return <LoadingSpinner />;
  const prioriteParCombo = new Map<string, any>();
  for (const m of matrice) {
    const p = priorites.find((pr: any) => pr.id === m.priorite_id);
    if (p) prioriteParCombo.set(`${m.impact_id}-${m.urgence_id}`, p);
  }
  return (
    <div className="bg-white rounded-lg border border-[#E2E1DC] p-6">
      <h3 className="text-sm font-semibold text-[#1C1B18] mb-1">Matrice Impact × Urgence → Priorité</h3>
      <p className="text-xs text-[#86847A] mb-6">Grille de référence ITIL4 (non calculée par produit — deux combinaisons peuvent aboutir à la même priorité).</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-[#86847A] font-medium">Impact \ Urgence</th>
              {urgences.map((u: any) => <th key={u.id} className="px-3 py-2 text-center text-[#86847A] font-medium">{u.nom}</th>)}
            </tr>
          </thead>
          <tbody>
            {impacts.map((imp: any) => (
              <tr key={imp.id} className="border-t border-[#EFEFEC]">
                <td className="px-3 py-3 font-medium text-[#45443E]">{imp.nom}</td>
                {urgences.map((urg: any) => {
                  const p = prioriteParCombo.get(`${imp.id}-${urg.id}`);
                  const pc = prioriteColor(p?.nom ?? '');
                  return (
                    <td key={urg.id} className="px-3 py-3 text-center">
                      {p ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: pc.bg, color: pc.text }}>
                          {p.nom}
                        </span>
                      ) : <span className="text-[#A8402F]">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Reports Page ──────────────────────────────────────────────────────────────

function RapportsPage() {
  useDocumentTitle('Statistiques');
  const { generate, data, loading, error } = useRapportsPerformance();
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [tab, setTab] = useState<'ensemble' | 'sla' | 'agents' | 'equipes' | 'qualite' | 'connaissance' | 'utilisateurs'>('ensemble');
  const tabLabels: Record<string, string> = {
    ensemble: 'Vue d’ensemble', sla: 'SLA & délais', agents: 'Agents', equipes: 'Managers & équipes',
    qualite: 'Qualité', connaissance: 'Connaissances & actifs', utilisateurs: 'Utilisateurs',
  };
  const CHART_COLORS = [M.cobalt500, M.brick500, M.sage500, '#7B5EA7', M.amber500, '#2E8B8B', '#B3467C', '#8A8A3D', M.n400];

  useEffect(() => { generate({}); }, []);

  // Nom de fichier commun aux deux exports : section pointée (cette page = "statistiques-eim",
  // la période filtrée si renseignée) + horodatage de génération, pour distinguer plusieurs
  // exports successifs et savoir à quel moment les données ont été extraites (MaP.md section 12).
  const nomFichierExport = (extension: string) => {
    const periode = (dateDebut || dateFin) ? `_${dateDebut || 'debut'}_${dateFin || 'fin'}` : '';
    const horodatage = new Date().toISOString().replace(/:/g, '-').replace(/\..+$/, '');
    return `statistiques-eim${periode}_${horodatage}.${extension}`;
  };

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const resume = [
      ['Total incidents', data.total],
      ['Clôturés', data.cloturesCount],
      ['Taux de résolution (%)', data.tauxResolution],
      ...data.byStatut.map((s: any) => [`Statut : ${statutLabel(s.statut)}`, s.count]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resume), 'Résumé');

    const priorites = [['Priorité', 'Nombre'], ...data.byPriorite.map((p: any) => [p.nom, p.count])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(priorites), 'Par priorité');

    const agents = [
      ['Agent', 'Prestations', 'Résolus', 'Durée moy. (min)', 'Ratio global (%)', 'Note moy.'],
      ...data.byAgent.map((row: any) => [
        `${row.agent.prenom} ${row.agent.nom}`,
        row.prestations,
        row.resolus,
        row.dureeMoyenneMinutes ?? '',
        row.ratioGlobal ?? '',
        row.noteMoyenne ?? '',
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(agents), 'Performance agents');

    XLSX.writeFile(wb, nomFichierExport('xlsx'));
  };

  // CSV = extraction de données brutes (une ligne par enregistrement, sans mise en forme),
  // complémentaire de l'Excel ci-dessus qui reste réservé aux résumés/graphes (MaP.md section 12).
  // Un bloc par table, séparés par une ligne vide, dans un seul fichier plat.
  const exportCsv = () => {
    if (!data) return;
    const blocs: string[] = [];
    const ajouterBloc = (titre: string, aoa: (string | number)[][]) => {
      if (!aoa.length) return;
      const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(aoa));
      blocs.push(`${titre}\n${csv}`);
    };

    ajouterBloc('Résumé', [
      ['Indicateur', 'Valeur'],
      ['Total incidents', data.total],
      ['Clôturés', data.cloturesCount],
      ["Taux de résolution (%)", data.tauxResolution],
      ...data.byStatut.map((s: any) => [`Statut : ${statutLabel(s.statut)}`, s.count]),
    ]);
    ajouterBloc('Par priorité', [['Priorité', 'Nombre'], ...data.byPriorite.map((p: any) => [p.nom, p.count])]);
    if (data.byImpact?.length) ajouterBloc('Par impact', [['Impact', 'Nombre'], ...data.byImpact.map((r: any) => [r.nom, r.count])]);
    if (data.byUrgence?.length) ajouterBloc('Par urgence', [['Urgence', 'Nombre'], ...data.byUrgence.map((r: any) => [r.nom, r.count])]);
    if (data.byActif?.length) ajouterBloc('Par actif (top 10)', [['Actif', 'Nombre'], ...data.byActif.map((r: any) => [r.nom, r.count])]);
    if (data.byMotClef?.length) ajouterBloc('Par mot-clé (top 10)', [['Mot-clé', 'Nombre'], ...data.byMotClef.map((r: any) => [r.nom, r.count])]);
    ajouterBloc('Performance agents', [
      ['Agent', 'Prestations', 'Résolus', 'Durée moy. (min)', 'Durée médiane (min)', 'Ratio global (%)', 'Note moy.', 'Charge actuelle'],
      ...data.byAgent.map((row: any) => [
        `${row.agent.prenom} ${row.agent.nom}`, row.prestations, row.resolus,
        row.dureeMoyenneMinutes ?? '', row.dureeMedianeMinutes ?? '', row.ratioGlobal ?? '',
        row.noteMoyenne ?? '', row.chargeActuelle ?? '',
      ]),
    ]);
    if (data.byManager?.length) ajouterBloc('Performance managers', [
      ['Manager', 'Incidents gérés', 'Clôturés', 'Durée moy. (min)', 'Durée médiane (min)', 'Réévaluations'],
      ...data.byManager.map((row: any) => [
        `${row.manager.prenom} ${row.manager.nom}`, row.incidents, row.clotures,
        row.dureeMoyenneMinutes ?? '', row.dureeMedianeMinutes ?? '', row.nbReevaluations ?? '',
      ]),
    ]);
    if (data.byEquipe?.length) ajouterBloc('Par équipe', [
      ['Équipe', 'Effectif', 'Incidents traités', 'Prestations actives'],
      ...data.byEquipe.map((r: any) => [r.equipe?.nom ?? '', r.effectif ?? '', r.incidents ?? '', r.prestationsActives ?? '']),
    ]);

    // BOM UTF-8 en tête : nécessaire pour qu'Excel/LibreOffice affichent correctement les accents.
    const blob = new Blob(['﻿' + blocs.join('\n\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichierExport('csv');
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-semibold text-[#1C1B18] mb-6">Statistiques</h1>
      <div className="no-print bg-white rounded-lg border border-[#E2E1DC] p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#605F57] uppercase tracking-wide">Date début</label>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="px-3 py-2 text-sm border border-[#E2E1DC] rounded focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#605F57] uppercase tracking-wide">Date fin</label>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="px-3 py-2 text-sm border border-[#E2E1DC] rounded focus:outline-none" />
          </div>
          <Btn loading={loading} onClick={() => generate({ date_debut: dateDebut || undefined, date_fin: dateFin || undefined })}><BarChart2 size={14} />Rafraîchir les statistiques</Btn>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E2E1DC] rounded hover:bg-[#F7F7F5] text-[#45443E]">
            <Printer size={14} />Imprimer la page
          </button>
          <button onClick={exportExcel} disabled={!data} className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E2E1DC] rounded hover:bg-[#F7F7F5] text-[#45443E] disabled:opacity-50">
            <FileSpreadsheet size={14} />Exporter en Excel
          </button>
          <button onClick={exportCsv} disabled={!data} className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E2E1DC] rounded hover:bg-[#F7F7F5] text-[#45443E] disabled:opacity-50">
            <FileText size={14} />Exporter en CSV
          </button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {loading && <LoadingSpinner />}

      {data && (
        <div className="space-y-6">
          <div className="no-print flex flex-wrap gap-1 bg-[#EFEFEC] rounded-lg p-1 w-fit">
            {(['ensemble', 'sla', 'agents', 'equipes', 'qualite', 'connaissance', 'utilisateurs'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded text-sm transition-colors ${tab === t ? 'bg-white font-medium text-[#1C1B18] shadow-sm' : 'text-[#605F57]'}`}>
                {tabLabels[t]}
              </button>
            ))}
          </div>

          {tab === 'ensemble' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total incidents" value={data.total} icon={FileText} />
                <StatCard label="Clôturés" value={data.cloturesCount} icon={CheckCircle2} color={M.sage500} />
                <StatCard label="Taux de résolution" value={`${data.tauxResolution}%`} icon={TrendingUp} color={data.tauxResolution >= 70 ? M.sage500 : M.amber500} />
                <StatCard label="Taux de réouverture" value={`${data.tauxReouverture}%`} icon={RefreshCw} color={data.tauxReouverture > 10 ? M.brick500 : M.n500} />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-4">Incidents par statut</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.byStatut}>
                      <CartesianGrid strokeDasharray="3 3" stroke={M.n100} />
                      <XAxis dataKey="statut" tick={{ fontSize: 10, fill: M.n500 }} tickFormatter={statutLabel} />
                      <YAxis tick={{ fontSize: 10, fill: M.n500 }} />
                      <Tooltip formatter={(v: any) => [v, 'Incidents']} labelFormatter={statutLabel} />
                      <Bar dataKey="count" fill={M.cobalt500} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-4">Répartition par priorité</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.byPriorite.filter((p: any) => p.count > 0)} dataKey="count" nameKey="nom" cx="50%" cy="50%" outerRadius={75}>
                        {data.byPriorite.filter((p: any) => p.count > 0).map((_: any, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                <h3 className="text-sm font-semibold text-[#45443E] mb-4">Nouveaux incidents par jour</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.tendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke={M.n100} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: M.n500 }} tickFormatter={(d: string) => d.slice(5)} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: M.n500 }} allowDecimals={false} />
                    <Tooltip formatter={(v: any) => [v, 'Incidents']} />
                    <Bar dataKey="count" fill={M.cobalt500} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-4">Répartition par impact</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data.byImpact} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={M.n100} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: M.n500 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="nom" tick={{ fontSize: 11, fill: M.n600 }} width={70} />
                      <Tooltip />
                      <Bar dataKey="count" fill={M.amber500} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-4">Répartition par urgence</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data.byUrgence} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={M.n100} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: M.n500 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="nom" tick={{ fontSize: 11, fill: M.n600 }} width={70} />
                      <Tooltip />
                      <Bar dataKey="count" fill={M.brick500} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Ancienneté des incidents ouverts</h3>
                  <div className="space-y-2">
                    {data.ancienneteOuverts.map((a: any) => (
                      <div key={a.tranche} className="flex items-center justify-between text-sm">
                        <span className="text-[#605F57]">{a.tranche}</span>
                        <span className="font-medium text-[#1C1B18]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{a.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Origine du signalement</h3>
                  <div className="space-y-2">
                    {data.parOrigine.map((o: any) => (
                      <div key={o.origine} className="flex items-center justify-between text-sm">
                        <span className="text-[#605F57]">{o.origine}</span>
                        <span className="font-medium text-[#1C1B18]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{o.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Top mots-clés</h3>
                  <div className="space-y-2">
                    {data.byMotClef.length === 0 && <p className="text-sm text-[#86847A]">Aucun</p>}
                    {data.byMotClef.map((m: any) => (
                      <div key={m.nom} className="flex items-center justify-between text-sm">
                        <span className="text-[#605F57] truncate">{m.nom}</span>
                        <span className="font-medium text-[#1C1B18]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{m.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                <h3 className="text-sm font-semibold text-[#45443E] mb-3">Actifs les plus concernés</h3>
                {data.byActif.length === 0 ? <p className="text-sm text-[#86847A]">Aucun actif lié aux incidents de la période.</p> : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                    {data.byActif.map((a: any) => (
                      <div key={a.nom} className="flex items-center justify-between text-sm">
                        <span className="text-[#605F57] truncate">{a.nom}</span>
                        <span className="font-medium text-[#1C1B18]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{a.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'sla' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Respect SLA réponse" value={data.sla.tauxRespectReponse != null ? `${data.sla.tauxRespectReponse}%` : '—'} icon={Zap} color={data.sla.tauxRespectReponse == null ? undefined : data.sla.tauxRespectReponse >= 90 ? M.sage500 : M.amber500} />
                <StatCard label="Respect SLA résolution" value={data.sla.tauxRespectResolution != null ? `${data.sla.tauxRespectResolution}%` : '—'} icon={CheckCircle2} color={data.sla.tauxRespectResolution == null ? undefined : data.sla.tauxRespectResolution >= 90 ? M.sage500 : M.amber500} />
                <StatCard label="En retard actuellement" value={data.sla.enRetardActuellement} icon={AlertTriangle} color={data.sla.enRetardActuellement > 0 ? M.brick500 : M.sage500} />
                <StatCard label="Escalades (période)" value={data.sla.nbEscalades} icon={TrendingUp} color={data.sla.nbEscalades > 0 ? M.amber500 : M.sage500} />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Temps de réponse réel</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#605F57]">Moyenne</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.sla.reponseMoyenMinutes != null ? formatDuree(data.sla.reponseMoyenMinutes) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-[#605F57]">Médiane</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.sla.reponseMedianMinutes != null ? formatDuree(data.sla.reponseMedianMinutes) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-[#605F57]">Maximum</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.sla.reponseMaxMinutes != null ? formatDuree(data.sla.reponseMaxMinutes) : '—'}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Temps de résolution réel</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#605F57]">Moyenne</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.sla.resolutionMoyenMinutes != null ? formatDuree(data.sla.resolutionMoyenMinutes) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-[#605F57]">Médiane</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.sla.resolutionMedianMinutes != null ? formatDuree(data.sla.resolutionMedianMinutes) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-[#605F57]">Maximum</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.sla.resolutionMaxMinutes != null ? formatDuree(data.sla.resolutionMaxMinutes) : '—'}</span></div>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Escalades</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#605F57]">Nombre d'escalades (période)</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.sla.nbEscalades}</span></div>
                    <div className="flex justify-between"><span className="text-[#605F57]">Délai moyen avant 1ère escalade</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.sla.delaiMoyenAvantEscaladeHeures != null ? `${data.sla.delaiMoyenAvantEscaladeHeures} h` : '—'}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Écart global durée réelle / SLA</h3>
                  <p className="text-2xl font-semibold" style={{ color: data.sla.ecartMoyenDureeVsSlaPourcent == null ? M.n400 : data.sla.ecartMoyenDureeVsSlaPourcent <= 100 ? M.sage500 : data.sla.ecartMoyenDureeVsSlaPourcent <= 150 ? M.amber500 : M.brick500 }}>
                    {data.sla.ecartMoyenDureeVsSlaPourcent != null ? `${data.sla.ecartMoyenDureeVsSlaPourcent}%` : '—'}
                  </p>
                  <p className="text-xs text-[#86847A] mt-1">100 % = prestations dans les temps du SLA de résolution, en moyenne.</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Incidents par SLA appliqué</h3>
                  <div className="space-y-2 text-sm">
                    {data.configuration.incidentsParSla.length === 0 && <p className="text-[#86847A]">Aucun SLA appliqué sur la période.</p>}
                    {data.configuration.incidentsParSla.map((s: any) => (
                      <div key={s.nom} className="flex justify-between"><span className="text-[#605F57]">{s.nom}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.count}</span></div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-[#EFEFEC]"><span className="text-[#605F57]">Sur SLA par défaut (non pris en charge)</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.configuration.incidentsSurSlaDefaut}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Historique des changements de priorité</h3>
                  <div className="space-y-2 text-sm">
                    {data.configuration.historiqueParMotif.map((m: any) => (
                      <div key={m.motif} className="flex justify-between"><span className="text-[#605F57]">{m.motif === 'prise_en_charge' ? 'Prise en charge' : m.motif === 'reevaluation' ? 'Réévaluation' : 'Escalade SLA'}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{m.count}</span></div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-[#EFEFEC]"><span className="text-[#605F57]">Moyenne de changements par incident</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.configuration.nbMoyenChangementsPrioriteParIncident}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'qualite' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Note de satisfaction moyenne" value={data.qualite.noteMoyenneGlobale != null ? `${data.qualite.noteMoyenneGlobale}/5` : '—'} icon={Star} color={M.amber500} />
                <StatCard label="Commentaires / incident" value={data.qualite.commentairesMoyenParIncident} icon={FileText} />
                <StatCard label="Pièces jointes / incident" value={data.qualite.piecesJointesMoyenParIncident} icon={Paperclip} />
                <StatCard label="Taux de réutilisation PJ" value={`${data.qualite.tauxReutilisationPiecesJointes}%`} icon={Layers} />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-4">Évolution de la note moyenne</h3>
                  {data.qualite.evolutionNoteMoyenne.length === 0 ? <p className="text-sm text-[#86847A]">Aucune prestation notée sur la période.</p> : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={data.qualite.evolutionNoteMoyenne}>
                        <CartesianGrid strokeDasharray="3 3" stroke={M.n100} />
                        <XAxis dataKey="mois" tick={{ fontSize: 10, fill: M.n500 }} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: M.n500 }} />
                        <Tooltip formatter={(v: any) => [`${v}/5`, 'Note moyenne']} />
                        <Bar dataKey="noteMoyenne" fill={M.amber500} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Clôture par le demandeur vs un intervenant</h3>
                  <div className="space-y-2 text-sm">
                    {data.qualite.tauxClotureOrigine.map((o: any) => (
                      <div key={o.origine} className="flex justify-between"><span className="text-[#605F57]">{o.origine}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{o.count}</span></div>
                    ))}
                  </div>
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3 mt-5">Commentaires</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#605F57]">Internes</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.qualite.commentairesInternes}</span></div>
                    <div className="flex justify-between"><span className="text-[#605F57]">Visibles client</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.qualite.commentairesVisibles}</span></div>
                    <div className="flex justify-between"><span className="text-[#605F57]">Délai moyen entre 2 commentaires</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.qualite.reactiviteMoyenneMinutes != null ? formatDuree(data.qualite.reactiviteMoyenneMinutes) : '—'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'connaissance' && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Articles par statut</h3>
                  <div className="space-y-2 text-sm">
                    {data.baseConnaissance.articlesParStatut.map((s: any) => (
                      <div key={s.statut} className="flex justify-between"><span className="text-[#605F57] capitalize">{s.statut}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.count}</span></div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-[#EFEFEC]"><span className="text-[#605F57]">Actifs couverts par la documentation</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.baseConnaissance.actifsCouvertsParDoc}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Articles publiés par auteur</h3>
                  <div className="space-y-2 text-sm">
                    {data.baseConnaissance.articlesParAuteur.length === 0 && <p className="text-[#86847A]">Aucun article publié.</p>}
                    {data.baseConnaissance.articlesParAuteur.map((a: any) => (
                      <div key={a.auteur} className="flex justify-between"><span className="text-[#605F57]">{a.auteur}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{a.count}</span></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Actifs par statut</h3>
                  <div className="space-y-2 text-sm">
                    {data.actifs.actifsParStatut.map((s: any) => (
                      <div key={s.statut} className="flex justify-between"><span className="text-[#605F57]">{({ actif: 'Actif', hors_service: 'Hors service', maintenance: 'Maintenance' } as Record<string, string>)[s.statut] ?? s.statut}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.count}</span></div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Actifs par type</h3>
                  <div className="space-y-2 text-sm">
                    {data.actifs.actifsParType.map((t: any) => (
                      <div key={t.nom} className="flex justify-between"><span className="text-[#605F57]">{t.nom}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t.count}</span></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Propriétaires / actif (moy.)" value={data.actifs.moyenneProprietairesParActif} icon={Users} />
                <StatCard label="Actifs sans incident déclaré" value={`${data.actifs.tauxActifsSansIncident}%`} icon={Server} color={M.sage500} />
              </div>

              <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                <h3 className="text-sm font-semibold text-[#45443E] mb-3">Charge d'incidents par propriétaire d'actif</h3>
                {data.actifs.chargeParProprietaire.length === 0 ? <p className="text-sm text-[#86847A]">Aucun incident lié à un actif possédé sur la période.</p> : (
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {data.actifs.chargeParProprietaire.map((p: any) => (
                      <div key={p.proprietaire} className="flex justify-between text-sm"><span className="text-[#605F57] truncate">{p.proprietaire}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.incidents}</span></div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'utilisateurs' && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Utilisateurs par rôle</h3>
                  <div className="space-y-2 text-sm">
                    {data.utilisateurs.utilisateursParRole.map((r: any) => (
                      <div key={r.role} className="flex justify-between"><span className="text-[#605F57] capitalize">{r.role === 'client' ? 'Utilisateur' : r.role}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.count}</span></div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-[#EFEFEC]"><span className="text-[#605F57]">Actifs / Inactifs</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.utilisateurs.utilisateursActifsInactifs.actifs} / {data.utilisateurs.utilisateursActifsInactifs.inactifs}</span></div>
                    <div className="flex justify-between"><span className="text-[#605F57]">Sans connexion depuis 30j</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{data.utilisateurs.utilisateursInactifsDepuis30j}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                  <h3 className="text-sm font-semibold text-[#45443E] mb-3">Notifications par type</h3>
                  <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
                    {data.utilisateurs.notificationsParType.map((n: any) => (
                      <div key={n.type} className="flex justify-between"><span className="text-[#605F57]">{n.type}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{n.count}</span></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Taux de lecture des notifications" value={data.utilisateurs.tauxLectureNotifications != null ? `${data.utilisateurs.tauxLectureNotifications}%` : '—'} icon={Bell} />
                <StatCard label="Délai moyen avant lecture" value={data.utilisateurs.delaiMoyenLectureMinutes != null ? formatDuree(data.utilisateurs.delaiMoyenLectureMinutes) : '—'} icon={Clock} />
              </div>

              <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                <h3 className="text-sm font-semibold text-[#45443E] mb-3">Volume de notifications par destinataire</h3>
                {data.utilisateurs.notificationsParDestinataire.length === 0 ? <p className="text-sm text-[#86847A]">Aucune notification sur la période.</p> : (
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {data.utilisateurs.notificationsParDestinataire.map((n: any) => (
                      <div key={n.destinataire} className="flex justify-between text-sm"><span className="text-[#605F57] truncate">{n.destinataire}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{n.count}</span></div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'agents' && (
            <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
              <h3 className="text-sm font-semibold text-[#45443E] mb-4">Performance par agent</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E1DC]">
                      <th className="text-left px-4 py-2 text-[10px] text-[#86847A] uppercase">Agent</th>
                      <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Prestations</th>
                      <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Résolus</th>
                      <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Charge actuelle</th>
                      <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Durée moy.</th>
                      <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Durée médiane</th>
                      <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Ratio global</th>
                      <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Rapports complétés</th>
                      <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Note moy.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byAgent.map((row: any) => (
                      <tr key={row.agent.id} className="border-b border-[#EFEFEC]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar user={row.agent} size="xs" />
                            <span className="text-[#45443E]">{row.agent.prenom} {row.agent.nom}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.prestations}</td>
                        <td className="px-4 py-3 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace", color: row.resolus > 0 ? M.sage500 : M.n400 }}>{row.resolus}</td>
                        <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.chargeActuelle}</td>
                        <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.dureeMoyenneMinutes != null ? formatDuree(row.dureeMoyenneMinutes) : '—'}</td>
                        <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.dureeMedianeMinutes != null ? formatDuree(row.dureeMedianeMinutes) : '—'}</td>
                        <td className="px-4 py-3 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace", color: row.ratioGlobal == null ? M.n400 : row.ratioGlobal <= 100 ? M.sage500 : row.ratioGlobal <= 150 ? M.amber500 : M.brick500 }}>{row.ratioGlobal != null ? `${row.ratioGlobal}%` : '—'}</td>
                        <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.tauxCompletudeRapports != null ? `${row.tauxCompletudeRapports}%` : '—'}</td>
                        <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.noteMoyenne != null ? `${row.noteMoyenne}/5` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'equipes' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                <h3 className="text-sm font-semibold text-[#45443E] mb-4">Performance par manager</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E1DC]">
                        <th className="text-left px-4 py-2 text-[10px] text-[#86847A] uppercase">Manager</th>
                        <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Incidents gérés</th>
                        <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Clôturés</th>
                        <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Durée moy.</th>
                        <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Durée médiane</th>
                        <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Réévaluations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byManager.map((row: any) => (
                        <tr key={row.manager.id} className="border-b border-[#EFEFEC]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar user={row.manager} size="xs" />
                              <span className="text-[#45443E]">{row.manager.prenom} {row.manager.nom}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.incidents}</td>
                          <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.clotures}</td>
                          <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.dureeMoyenneMinutes != null ? formatDuree(row.dureeMoyenneMinutes) : '—'}</td>
                          <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.dureeMedianeMinutes != null ? formatDuree(row.dureeMedianeMinutes) : '—'}</td>
                          <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.nbReevaluations}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
                <h3 className="text-sm font-semibold text-[#45443E] mb-4">Performance par équipe</h3>
                {data.byEquipe.length === 0 ? <p className="text-sm text-[#86847A]">Aucune équipe avec activité sur la période.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E2E1DC]">
                          <th className="text-left px-4 py-2 text-[10px] text-[#86847A] uppercase">Équipe</th>
                          <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Effectif</th>
                          <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Incidents traités</th>
                          <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Prestations actives</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byEquipe.map((row: any) => (
                          <tr key={row.equipe.id} className="border-b border-[#EFEFEC]">
                            <td className="px-4 py-3 text-[#45443E]">{row.equipe.nom}</td>
                            <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.effectif}</td>
                            <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.incidents}</td>
                            <td className="px-4 py-3 text-right text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.prestationsActives}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Profile Page ──────────────────────────────────────────────────────────────

function ProfilePage() {
  useDocumentTitle('Profil');
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '' });
  const [pwdForm, setPwdForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) setForm({ nom: user.nom, prenom: user.prenom, email: user.email });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(false); setFieldErrors({});

    const changingPassword = pwdForm.password.length > 0;
    if (changingPassword) {
      const errors: Record<string, string> = {};
      if (!pwdForm.current_password) errors.current_password = 'Requis pour changer de mot de passe.';
      if (pwdForm.password.length < 8) errors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
      if (pwdForm.password !== pwdForm.password_confirmation) errors.password_confirmation = 'Les mots de passe ne correspondent pas.';
      if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    }

    setLoading(true);
    try {
      const payload = changingPassword ? { ...form, ...pwdForm } : form;
      const res = await api.put('/profile', payload);
      updateUser(res.data.data);
      setSuccess(true);
      setPwdForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err: any) {
      const data = err.response?.data;
      setFieldErrors({
        current_password: data?.errors?.current_password?.[0] ?? '',
        password: data?.errors?.password?.[0] ?? '',
      });
      setError(data?.message ?? 'Erreur.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-[#1C1B18] mb-6">Mon profil</h1>
      <div className="bg-white rounded-lg border border-[#E2E1DC] p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#EFEFEC]">
          <Avatar user={user} size="lg" />
          <div>
            <p className="text-base font-semibold text-[#1C1B18]">{user.prenom} {user.nom}</p>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={user.role} />
              {['agent', 'manager'].includes(user.role) && (
                <span className="text-xs" style={{ color: user.disponible ? M.sage500 : M.n400 }}>
                  {user.disponible ? 'Disponible' : 'Indisponible'}
                </span>
              )}
            </div>
          </div>
        </div>
        {success && <div className="mb-4"><Alert type="success">Profil mis à jour.</Alert></div>}
        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prénom" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
            <Input label="Nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />

          <div className="pt-4 mt-2 border-t border-[#EFEFEC]">
            <p className="text-sm font-medium text-[#1C1B18] mb-1">Changer de mot de passe</p>
            <p className="text-xs text-[#86847A] mb-4">Laissez ces champs vides pour ne pas modifier votre mot de passe.</p>
            <div className="space-y-4">
              <Input label="Mot de passe actuel" type={showPwd ? 'text' : 'password'} value={pwdForm.current_password} error={fieldErrors.current_password} onChange={e => setPwdForm(f => ({ ...f, current_password: e.target.value }))} />
              <div className="relative">
                <Input label="Nouveau mot de passe" type={showPwd ? 'text' : 'password'} value={pwdForm.password} error={fieldErrors.password} onChange={e => setPwdForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-8 text-[#86847A]">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <Input label="Confirmation du nouveau mot de passe" type={showPwd ? 'text' : 'password'} value={pwdForm.password_confirmation} error={fieldErrors.password_confirmation} onChange={e => setPwdForm(f => ({ ...f, password_confirmation: e.target.value }))} />
            </div>
          </div>

          <div className="flex justify-end">
            <Btn type="submit" loading={loading}>Enregistrer</Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'py-4' : 'py-16';
  return (
    <div className={`flex items-center justify-center ${s}`}>
      <RefreshCw size={20} className="animate-spin text-[#2E4A6E]" />
    </div>
  );
}

function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
}

// ── Router ────────────────────────────────────────────────────────────────────

const LIEN_INVALIDE = "Ce lien n'est pas ou plus valide. Si vous tenter de créer un compte, veuillez contacter l'administrateur de ce service pour disposer d'un autre lien.";

function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', password_confirmation: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    api.get(`/invitation/${encodeURIComponent(token)}`)
      .then(res => {
        const u = res.data.data;
        setForm(f => ({ ...f, nom: u.nom ?? '', prenom: u.prenom ?? '', email: u.email ?? '' }));
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const errors: Record<string, string> = {};
    if (!form.prenom) errors.prenom = 'Requis.';
    if (!form.nom) errors.nom = 'Requis.';
    if (!form.email) errors.email = 'Requis.';
    if (!form.password || form.password.length < 8) errors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
    if (form.password !== form.password_confirmation) errors.password_confirmation = 'Les mots de passe ne correspondent pas.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setShowConfirm(true);
  };

  const confirmActivate = async () => {
    setSaving(true);
    setFormError('');
    try {
      await api.post(`/invitation/${encodeURIComponent(token)}/activer`, {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        confirmation: true,
      });
      setShowConfirm(false);
      navigate('/login', { state: { notice: 'Votre compte a été activé. Vous pouvez vous connecter.' } });
    } catch (e: any) {
      const data = e.response?.data;
      if (e.response?.status === 410) {
        setInvalid(true);
        setShowConfirm(false);
        return;
      }
      const nextErrors: Record<string, string> = {};
      if (data?.errors?.email?.[0]) nextErrors.email = data.errors.email[0];
      if (data?.errors?.password?.[0]) nextErrors.password = data.errors.password[0];
      setFieldErrors(nextErrors);
      setFormError(data?.message ?? 'Impossible d\'activer le compte.');
      setShowConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: M.n50 }}><LoadingSpinner /></div>;
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: M.n50 }}>
        <div className="max-w-md w-full bg-white rounded-lg border border-[#E2E1DC] p-6">
          <Alert type="error">{LIEN_INVALIDE}</Alert>
          <div className="mt-6">
            <Btn variant="secondary" onClick={() => navigate('/login')}>Retour à la connexion</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: M.n50 }}>
      <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E1DC] p-8">
        <h1 className="text-2xl font-semibold text-[#1C1B18] mb-1">Activer mon compte</h1>
        <p className="text-sm text-[#86847A] mb-6">Définissez vos informations et votre mot de passe pour activer votre compte.</p>
        {formError && <div className="mb-4"><Alert type="error">{formError}</Alert></div>}
        <form onSubmit={submitForm} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prénom *" value={form.prenom} error={fieldErrors.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
            <Input label="Nom *" value={form.nom} error={fieldErrors.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
          </div>
          <Input label="Email *" type="email" value={form.email} error={fieldErrors.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <div className="relative">
            <Input label="Mot de passe *" type={showPwd ? 'text' : 'password'} value={form.password} error={fieldErrors.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-8 text-[#86847A]">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Input label="Confirmation du mot de passe *" type={showPwd ? 'text' : 'password'} value={form.password_confirmation} error={fieldErrors.password_confirmation} onChange={e => setForm(f => ({ ...f, password_confirmation: e.target.value }))} />
          <div className="flex justify-end pt-2">
            <Btn type="submit">Valider</Btn>
          </div>
        </form>
      </div>
      <Modal open={showConfirm} title="Confirmer l'activation" onClose={() => setShowConfirm(false)} size="sm"
        footer={<><Btn variant="secondary" onClick={() => setShowConfirm(false)}>Annuler</Btn><Btn loading={saving} onClick={confirmActivate}>Confirmer</Btn></>}>
        <p className="text-sm text-[#45443E]">Vous allez activer le compte associé à <strong>{form.email}</strong>. Continuer ?</p>
      </Modal>
    </div>
  );
}

function AppRouter() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/activer-compte" element={<ActivateAccountPage />} />
      <Route path="*" element={
        !user ? <Navigate to="/login" /> : (
          <AppLayout>
            <Routes>
              <Route path="/" element={user.role === 'client' ? <Navigate to="/incidents" /> : <DashboardPage />} />
              <Route path="/incidents" element={<IncidentListPage />} />
              <Route path="/incidents/new" element={<RequireRole roles={['admin', 'manager', 'agent', 'client']}><CreateIncidentPage /></RequireRole>} />
              <Route path="/incidents/:id" element={<IncidentDetailPage />} />
              <Route path="/incidents/:id/edit" element={<EditIncidentPage />} />
              <Route path="/incidents/:id/rapport" element={<RapportPrestationPage />} />
              <Route path="/articles" element={<ArticlesPage />} />
              <Route path="/articles/:id" element={<ArticleDetailPage />} />
              <Route path="/users" element={<RequireRole roles={['admin']}><UsersPage /></RequireRole>} />
              <Route path="/equipes" element={<RequireRole roles={['admin']}><EquipesPage /></RequireRole>} />
              <Route path="/actifs" element={<RequireRole roles={['admin', 'manager', 'agent', 'client']}><ActifsPage /></RequireRole>} />
              <Route path="/settings" element={<RequireRole roles={['admin']}><SettingsPage /></RequireRole>} />
              <Route path="/rapports" element={<RequireRole roles={['admin', 'manager']}><RapportsPage /></RequireRole>} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AppLayout>
        )
      } />
    </Routes>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
/* ==old==
function AppShell() {
  const [ready, setReady] = useState(_mswStarted);

  useEffect(() => {
    if (!_mswStarted) {
      startMSW().then(() => setReady(true));
    }
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: M.n900 }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#2E4A6E] flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="text-white font-semibold">EIM</span>
        </div>
        <RefreshCw size={20} className="animate-spin text-[#86847A]" />
        <p className="text-xs text-[#605F57]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Initialisation du service…</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
export default AppShell;
*/
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

