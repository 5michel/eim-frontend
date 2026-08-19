import React, {
  useState, useEffect, useRef, useCallback, useMemo, type ReactNode,
} from 'react';
import {
  BrowserRouter, Routes, Route, Link, useNavigate, useParams, Navigate, useLocation,
} from 'react-router';
import {
  LayoutDashboard, FileText, Book, Users, Server, Layers, Settings, BarChart2,
  Bell, LogOut, ChevronDown, ChevronRight, X, Plus, Search, Filter, RefreshCw,
  AlertCircle, CheckCircle2, Clock, Zap, ArrowRight, Edit3, Trash2, Shield,
  UserCheck, User, ChevronUp, Eye, EyeOff, Hash, Calendar, Tag, MoreVertical,
  Activity, TrendingUp, AlertTriangle, Info, Menu, Building2, HardDrive,
  Send, Lock, Unlock, BookOpen, Check, XCircle, Printer,
} from 'lucide-react';
import { AuthProvider, useAuth, type AuthUser } from '../context/AuthContext';
import {
  useIncidents, useIncidentDetail, useUsers, useEquipes, useActifs,
  useArticles, useNotifications, useSlas, useImpactsUrgences, useRapportsPerformance,
} from '../hooks/index';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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

// ── Utility ───────────────────────────────────────────────────────────────────

const prioriteColor = (nom: string) => {
  switch (nom) {
    case 'Critique': return { bg: M.brick50, text: M.brick700, rail: M.brick500 };
    case 'Haute': return { bg: M.amber50, text: M.amber700, rail: M.amber500 };
    case 'Moyenne': return { bg: M.cobalt50, text: M.cobalt700, rail: M.cobalt500 };
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

const roleLabel = (r: string) => ({ admin: 'Administrateur', manager: 'Manager', agent: 'Agent', client: 'Client' }[r] ?? r);

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtMin = (m: number) => {
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${m / 60}h`;
  return `${m / 1440}j`;
};

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

const SLABar = ({ delaiMin, dateCreation }: { delaiMin: number; dateCreation: string }) => {
  const elapsed = (Date.now() - new Date(dateCreation).getTime()) / 60000;
  const pct = Math.min(100, (elapsed / delaiMin) * 100);
  const color = pct >= 100 ? M.brick500 : pct >= 75 ? M.amber500 : M.sage500;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#EFEFEC] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {fmtMin(Math.max(0, Math.round(delaiMin - elapsed)))}
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
  const { notifications, unreadCount, markRead, remove, clearAll } = useNotifications();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded hover:bg-[#EFEFEC] transition-colors">
        <Bell size={18} className="text-[#605F57]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#A8402F] text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-[#E2E1DC] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E1DC]">
            <span className="text-sm font-semibold text-[#1C1B18]">Notifications</span>
            {notifications.length > 0 && (
              <button onClick={clearAll} className="text-xs text-[#86847A] hover:text-[#A8402F] transition-colors">Tout effacer</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-[#EFEFEC]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#86847A]">Aucune notification</div>
            ) : notifications.map((n: any) => (
              <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-[#F7F7F5] transition-colors ${!n.date_lecture ? 'bg-[#EEF3FB]' : ''}`}>
                <button className="flex-1 text-left"
                  onClick={async () => {
                    if (!n.date_lecture) await markRead(n.id);
                    setOpen(false);
                    navigate(n.lien);
                  }}>
                  <p className="text-xs text-[#1C1B18]">{n.message}</p>
                  <p className="text-[10px] text-[#86847A] mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {fmtDate(n.date_lecture ?? new Date().toISOString())}
                  </p>
                </button>
                <button onClick={() => remove(n.id)} className="text-[#ADABA1] hover:text-[#A8402F] transition-colors flex-shrink-0 mt-0.5">
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
  { label: 'Tableau de bord', to: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'agent'] },
  { label: 'Incidents', to: '/incidents', icon: FileText, roles: ['admin', 'manager', 'agent'] },
  { label: 'Base de connaissances', to: '/articles', icon: Book, roles: ['admin', 'manager', 'agent'] },
  { label: 'Utilisateurs', to: '/users', icon: Users, roles: ['admin'] },
  { label: 'Équipes', to: '/equipes', icon: Building2, roles: ['admin'] },
  { label: 'Actifs', to: '/actifs', icon: HardDrive, roles: ['admin'] },
  { label: 'Rapports', to: '/rapports', icon: BarChart2, roles: ['admin', 'manager'] },
  { label: 'Paramètres', to: '/settings', icon: Settings, roles: ['admin'] },
];

function Sidebar({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const location = useLocation();
  const items = navItems.filter(n => n.roles.includes(user.role));
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: M.n900, minHeight: '100vh' }}>
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
    <header className="h-12 flex items-center px-6 border-b border-[#E2E1DC] bg-white gap-4 flex-shrink-0">
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
  { email: 'jean.dupont@client.tg', label: 'Client — Jean Dupont', role: 'client' },
];

function LoginPage() {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
            Gérez vos incidents informatiques de bout en bout — signalement, prise en charge, résolution et clôture.
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

          <div className="mb-6 p-4 rounded border border-[#E2E1DC] bg-[#EEF3FB]">
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
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'agent') return <AgentDashboard user={user} />;
  if (user.role === 'manager') return <ManagerDashboard user={user} />;
  return <AdminDashboard user={user} />;
}

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: string | number; sub?: string; color?: string; icon?: any }) {
  return (
    <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
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

function ManagerDashboard({ user }: { user: AuthUser }) {
  const { data, loading } = useIncidents({ statut: 'ouvert' });
  const { data: dataEnCours } = useIncidents({ statut: 'en_cours' });
  const ouvertsCount = data?.meta?.total ?? 0;
  const enCoursCount = dataEnCours?.meta?.total ?? 0;
  const incidents = data?.data ?? [];
  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-[#1C1B18] mb-6">Tableau de bord Manager</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Incidents ouverts" value={ouvertsCount} color={ouvertsCount > 0 ? M.brick500 : undefined} icon={AlertCircle} />
        <StatCard label="En cours" value={enCoursCount} icon={Clock} />
        <StatCard label="Disponible" value={user.disponible ? 'Oui' : 'Non'} icon={UserCheck} color={user.disponible ? M.sage500 : M.n500} />
      </div>
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
  const total = dataAll?.meta?.total ?? 0;
  const ouverts = dataOuverts?.meta?.total ?? 0;
  const enCours = dataEnCours?.meta?.total ?? 0;
  const clotures = dataClotures?.meta?.total ?? 0;
  const recents = (dataAll?.data ?? []).slice(0, 5);
  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1C1B18]">Tableau de bord</h1>
        <span className="text-xs text-[#86847A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total incidents" value={total} icon={FileText} />
        <StatCard label="Ouverts" value={ouverts} color={ouverts > 0 ? M.brick500 : undefined} icon={AlertCircle} />
        <StatCard label="En cours" value={enCours} icon={Clock} />
        <StatCard label="Clôturés" value={clotures} icon={CheckCircle2} color={M.sage500} />
      </div>
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
            <SLABar delaiMin={incident.delai_resolution} dateCreation={incident.date_creation} />
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({
    ...(search ? { search } : {}),
    ...(statutFilter ? { statut: statutFilter } : {}),
    page,
  }), [search, statutFilter, page]);

  const { data, loading } = useIncidents(params);
  const incidents = data?.data ?? [];
  const meta = data?.meta;
  console.log('incident :', incidents);
  console.log('data reçu :', data);
  console.log('incidents :', data?.data);
  console.log('meta :', data?.meta);

  return (
    <div className="max-w-5xl mx-auto" style={user?.role === 'client' ? { padding: '24px' } : {}}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1C1B18]">{user?.role === 'client' ? 'Mes incidents' : 'Incidents'}</h1>
        {user?.role === 'client' && <Btn onClick={() => navigate('/incidents/new')} size="sm"><Plus size={14} />Signaler un incident</Btn>}
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
          action={user?.role === 'client' ? <Btn size="sm" onClick={() => navigate('/incidents/new')}><Plus size={14} />Signaler un incident</Btn> : undefined} />
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
  const navigate = useNavigate();
  const { impacts, urgences } = useImpactsUrgences();
  const { data: actifData } = useActifs();
  const actifs = actifData?.data ?? [];

  const [form, setForm] = useState({ description: '', actif_concerne_id: '', impact_id: '', urgence_id: '', mots_clefs: '' });
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
    if (form.impact_id && form.urgence_id) {
      const iv = impacts.find((i: any) => i.id === form.impact_id)?.valeur ?? 0;
      const uv = urgences.find((u: any) => u.id === form.urgence_id)?.valeur ?? 0;
      const p = prioriteMapping[iv * uv];
      if (p) setPreview(p);
    } else {
      setPreview(null);
    }
  }, [form.impact_id, form.urgence_id, impacts, urgences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const errs: Record<string, string> = {};
    if (!form.description.trim()) errs.description = 'La description est requise.';
    if (!form.impact_id) errs.impact_id = "L'impact est requis.";
    if (!form.urgence_id) errs.urgence_id = "L'urgence est requise.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await api.post('/incidents', {
        description: form.description,
        actif_concerne_id: form.actif_concerne_id || null,
        impact_id: form.impact_id,
        urgence_id: form.urgence_id,
        mots_clefs: form.mots_clefs.split(',').map(k => k.trim()).filter(Boolean),
      });
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
      navigate('/incidents');
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
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#E2E1DC] p-6 space-y-5">
        <Textarea label="Description *" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} error={errors.description} placeholder="Décrivez le problème rencontré..." />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Impact *" value={form.impact_id} onChange={e => setForm(f => ({ ...f, impact_id: e.target.value }))} error={errors.impact_id} placeholder="— choisir —"
            options={impacts.map((i: any) => ({ value: i.id, label: `${i.nom} (${i.valeur})` }))} />
          <Select label="Urgence *" value={form.urgence_id} onChange={e => setForm(f => ({ ...f, urgence_id: e.target.value }))} error={errors.urgence_id} placeholder="— choisir —"
            options={urgences.map((u: any) => ({ value: u.id, label: `${u.nom} (${u.valeur})` }))} />
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
          options={actifs.map((a: any) => ({ value: a.id, label: a.nom }))} />
        <Input label="Mots-clés (séparés par des virgules)" value={form.mots_clefs} onChange={e => setForm(f => ({ ...f, mots_clefs: e.target.value }))} placeholder="réseau, connexion, vpn..." />
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

  const [commentText, setCommentText] = useState('');
  const [commentInterne, setCommentInterne] = useState(false);
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
      const res = await api.post(`/incidents/${id}/commentaires`, { contenu: commentText, est_interne: commentInterne });
      setComments(prev => [...prev, res.data.data]);
      setCommentText('');
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
  const canClientEdit = user?.role === 'client' && inc.statut === 'ouvert' && !inc.gestion_active;
  const canClientCloture = user?.role === 'client' && ['resolu', 'en_attente_cloture'].includes(inc.statut);
  const canPrendreEnCharge = isManagerOrAdmin && inc.statut === 'ouvert';
  const canPass = isManagerOrAdmin && inc.statut === 'en_cours';
  const canReassigner = isManagerOrAdmin && inc.statut === 'en_cours';
  const canCloturer = isManagerOrAdmin && ['en_cours', 'resolu'].includes(inc.statut);

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
        {user?.role === 'client' && inc.statut === 'ouvert' && !canClientEdit && (
          <Alert type="info">Cet incident est déjà pris en charge et ne peut plus être modifié.</Alert>
        )}
        {canClientEdit && <Btn variant="outline" size="sm" onClick={() => navigate(`/incidents/${id}/edit`)}><Edit3 size={13} />Modifier</Btn>}
        {canClientCloture && <Btn variant="secondary" size="sm" onClick={() => setShowClotureClient(true)}><CheckCircle2 size={13} />Clôturer l'incident</Btn>}
        {canPrendreEnCharge && <Btn size="sm" onClick={() => setShowPriseEnCharge(true)}><UserCheck size={13} />Prendre en charge</Btn>}
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
            <div className="flex items-start gap-3 mb-3">
              <div className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ background: pColor.rail }} />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-[#1C1B18] mb-2">{inc.resume ?? 'Sans titre'}</h2>
                <p className="text-sm text-[#45443E] leading-relaxed whitespace-pre-wrap">{inc.description}</p>
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
                        <span className="text-[10px] text-[#86847A] ml-auto font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmtDate(c.date_creation)}</span>
                      </div>
                      <p className="text-sm text-[#45443E] leading-relaxed">{c.contenu}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {inc.statut !== 'cloture' && (
              <div className="border-t border-[#EFEFEC] pt-4 space-y-2">
                <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={3} placeholder="Ajouter un commentaire..." error={commentError} />
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
          </div>
        </div>

        <div className="space-y-4">
          <InfoCard title="Informations">
            <InfoRow label="Demandeur" value={`${inc.demandeur?.prenom ?? ''} ${inc.demandeur?.nom ?? ''}`} />
            <InfoRow label="Créé le" value={fmtDate(inc.date_creation)} mono />
            {inc.date_prise_en_charge && <InfoRow label="Pris en charge" value={fmtDate(inc.date_prise_en_charge)} mono />}
            {inc.date_cloture && <InfoRow label="Clôturé le" value={fmtDate(inc.date_cloture)} mono />}
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
                <SLABar delaiMin={inc.delai_resolution} dateCreation={inc.date_creation} />
              </div>
            )}
          </InfoCard>

          {inc.gestion_active && (
            <InfoCard title="Prise en charge">
              <InfoRow label="Manager" value={`${inc.gestion_active.manager?.prenom ?? ''} ${inc.gestion_active.manager?.nom ?? ''}`} />
              <InfoRow label="Depuis" value={fmtDate(inc.gestion_active.date_debut)} mono />
            </InfoCard>
          )}

          {inc.prestation_active && (
            <InfoCard title="Agent assigné">
              <InfoRow label="Agent" value={`${inc.prestation_active.prestataire?.prenom ?? ''} ${inc.prestation_active.prestataire?.nom ?? ''}`} />
              {inc.prestation_active.equipe && <InfoRow label="Équipe" value={inc.prestation_active.equipe.nom} />}
              <InfoRow label="Depuis" value={fmtDate(inc.prestation_active.date_debut)} mono />
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

      <PriseEnChargeModal open={showPriseEnCharge} onClose={() => setShowPriseEnCharge(false)} users={allUsers} equipes={equipes} loading={actionLoading}
        onSubmit={async (body) => { const ok = await doAction('prise-en-charge', body); if (ok) setShowPriseEnCharge(false); }} />

      <PasserModal open={showPasser} onClose={() => setShowPasser(false)} users={allUsers} loading={actionLoading}
        onSubmit={async (body) => { const ok = await doAction('passer', body); if (ok) setShowPasser(false); }} />

      <ReassignerModal open={showReassigner} onClose={() => setShowReassigner(false)} users={allUsers} loading={actionLoading}
        onSubmit={async (body) => { const ok = await doAction('reassigner', body); if (ok) setShowReassigner(false); }} />

      <AssignerForceModal open={showAssignerForce} onClose={() => setShowAssignerForce(false)} users={allUsers} loading={actionLoading}
        onSubmit={async (body) => { const ok = await doAction('assigner-force', body); if (ok) setShowAssignerForce(false); }} />

      <Modal open={showCloture} title="Lancer la demande de clôture" onClose={() => setShowCloture(false)} size="sm"
        footer={<><Btn variant="secondary" onClick={() => setShowCloture(false)}>Annuler</Btn><Btn loading={actionLoading} onClick={async () => { const ok = await doAction('cloturer', {}); if (ok) setShowCloture(false); }}>Confirmer</Btn></>}>
        <p className="text-sm text-[#45443E]">Le client sera notifié et pourra valider la clôture. L'incident passera en statut <strong>En attente de clôture</strong>.</p>
      </Modal>

      <Modal open={showClotureClient} title="Clôturer l'incident" onClose={() => setShowClotureClient(false)} size="sm"
        footer={<><Btn variant="secondary" onClick={() => setShowClotureClient(false)}>Annuler</Btn><Btn variant="danger" loading={actionLoading} onClick={async () => { const ok = await doAction('cloture-utilisateur', {}); if (ok) { setShowClotureClient(false); navigate('/incidents'); } }}>Clôturer définitivement</Btn></>}>
        <p className="text-sm text-[#45443E]">Cette action est irréversible. L'incident sera marqué comme clôturé.</p>
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

function PriseEnChargeModal({ open, onClose, users, equipes, loading, onSubmit }: { open: boolean; onClose: () => void; users: any[]; equipes: any[]; loading: boolean; onSubmit: (body: any) => void }) {
  const [resume, setResume] = useState('');
  const [agentId, setAgentId] = useState('');
  const [equipeId, setEquipeId] = useState('');
  const availableAgents = users.filter((u: any) => u.role === 'agent' && u.disponible);

  useEffect(() => { if (!open) { setResume(''); setAgentId(''); setEquipeId(''); } }, [open]);

  return (
    <Modal open={open} title="Prendre en charge l'incident" onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} onClick={() => onSubmit({ resume, agent_id: agentId || undefined, equipe_id: equipeId || undefined })}>Confirmer</Btn></>}>
      <div className="space-y-4">
        {availableAgents.length === 0 && <Alert type="warning">Aucun agent disponible. Vous pouvez assigner par équipe.</Alert>}
        <Textarea label="Résumé" value={resume} onChange={e => setResume(e.target.value)} rows={3} placeholder="Résumé de la prise en charge..." />
        {availableAgents.length > 0 && (
          <Select label="Assigner à un agent" value={agentId} onChange={e => { setAgentId(e.target.value); if (e.target.value) setEquipeId(''); }}
            placeholder="— choisir un agent —" options={availableAgents.map((u: any) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))} />
        )}
        <Select label="Ou assigner à une équipe" value={equipeId} onChange={e => { setEquipeId(e.target.value); if (e.target.value) setAgentId(''); }}
          placeholder="— choisir une équipe —" options={equipes.map((e: any) => ({ value: e.id, label: e.nom }))} />
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
        <Select label="Manager cible *" value={managerId} onChange={e => setManagerId(e.target.value)} placeholder="— choisir —"
          options={managers.map((u: any) => ({ value: u.id, label: `${u.prenom} ${u.nom}${!u.disponible ? ' (Indisponible)' : ''}`, disabled: !u.disponible }))} />
        {selectedManager && !selectedManager.disponible && (
          <Alert type="warning">Ce manager est indisponible.</Alert>
        )}
        <Textarea label="Motif du transfert *" value={motif} onChange={e => setMotif(e.target.value)} rows={3} placeholder="Expliquez la raison du transfert..." />
      </div>
    </Modal>
  );
}

function ReassignerModal({ open, onClose, users, loading, onSubmit }: { open: boolean; onClose: () => void; users: any[]; loading: boolean; onSubmit: (body: any) => void }) {
  const [agentId, setAgentId] = useState('');
  const availableAgents = users.filter((u: any) => u.role === 'agent' && u.disponible);

  useEffect(() => { if (!open) setAgentId(''); }, [open]);

  return (
    <Modal open={open} title="Réassigner l'agent" onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} disabled={!agentId} onClick={() => onSubmit({ agent_id: agentId })}>Réassigner</Btn></>}>
      <div className="space-y-4">
        {availableAgents.length === 0 && <Alert type="warning">Aucun agent disponible actuellement.</Alert>}
        <Select label="Nouvel agent *" value={agentId} onChange={e => setAgentId(e.target.value)} placeholder="— choisir —"
          options={availableAgents.map((u: any) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))} />
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
          options={managers.map((u: any) => ({ value: u.id, label: `${u.prenom} ${u.nom}${!u.disponible ? ' (Indisponible)' : ''}` }))} />
        <Select label="Agent" value={agentId} onChange={e => setAgentId(e.target.value)} placeholder="— aucun —"
          options={agents.map((u: any) => ({ value: u.id, label: `${u.prenom} ${u.nom}${!u.disponible ? ' (Indisponible)' : ''}` }))} />
        <Textarea label="Résumé" value={resume} onChange={e => setResume(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}

// ── Edit Incident ─────────────────────────────────────────────────────────────

function EditIncidentPage() {
  const { id } = useParams<{ id: string }>();
  const { incident, loading } = useIncidentDetail(id ?? null);
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [motsCles, setMotsCles] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (incident) {
      setDescription(incident.description);
      setMotsCles(incident.mots_clefs?.join(', ') ?? '');
    }
  }, [incident]);

  if (loading) return <LoadingSpinner />;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/incidents/${id}`, { description, mots_clefs: motsCles.split(',').map((k: string) => k.trim()).filter(Boolean) });
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
        <Input label="Mots-clés (séparés par des virgules)" value={motsCles} onChange={e => setMotsCles(e.target.value)} />
        <div className="flex justify-end gap-3">
          <Btn variant="secondary" onClick={() => navigate(-1)}>Annuler</Btn>
          <Btn loading={saving} onClick={handleSave}>Sauvegarder</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Rapport de Prestation ─────────────────────────────────────────────────────

function RapportPrestationPage() {
  const { id } = useParams<{ id: string }>();
  const { incident } = useIncidentDetail(id ?? null);
  const navigate = useNavigate();
  const [form, setForm] = useState({ commentaires: '', actions_menees: '', cause_racine: '', solution_apportee: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/incidents/${id}/rapport-prestation`).then(r => {
      const d = r.data.data;
      setForm({ commentaires: d.commentaires, actions_menees: d.actions_menees, cause_racine: d.cause_racine, solution_apportee: d.solution_apportee });
    }).catch(() => {});
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post(`/incidents/${id}/rapport-prestation`, form);
      setSuccess(true);
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
          <h1 className="text-xl font-semibold">Rapport de prestation</h1>
          {incident && <p className="text-xs text-[#86847A] mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{incident.num_id}</p>}
        </div>
      </div>
      {success && <div className="mb-4"><Alert type="success">Rapport enregistré avec succès.</Alert></div>}
      {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#E2E1DC] p-6 space-y-5">
        <Textarea label="Commentaires" rows={3} value={form.commentaires} onChange={e => setForm(f => ({ ...f, commentaires: e.target.value }))} />
        <Textarea label="Actions menées" rows={4} value={form.actions_menees} onChange={e => setForm(f => ({ ...f, actions_menees: e.target.value }))} placeholder="Décrivez les étapes de l'intervention..." />
        <Textarea label="Cause racine" rows={3} value={form.cause_racine} onChange={e => setForm(f => ({ ...f, cause_racine: e.target.value }))} />
        <Textarea label="Solution apportée" rows={3} value={form.solution_apportee} onChange={e => setForm(f => ({ ...f, solution_apportee: e.target.value }))} />
        <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E1DC]">
          <Btn variant="secondary" type="button" onClick={() => navigate(-1)}>Retour</Btn>
          <Btn type="submit" loading={loading}>Enregistrer le rapport</Btn>
        </div>
      </form>
    </div>
  );
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

function ArticlesPage() {
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
        {['agent', 'manager', 'admin'].includes(user?.role ?? '') && (
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
            <div key={a.id} className="bg-white rounded-lg border border-[#E2E1DC] p-5 hover:shadow-sm transition-shadow">
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
                      {a.mots_clefs.map((k: string) => (
                        <span key={k} className="text-[10px] px-2 py-0.5 rounded" style={{ background: M.n100, color: M.n600 }}>{k}</span>
                      ))}
                    </div>
                  )}
                </div>
                {['agent', 'manager', 'admin'].includes(user?.role ?? '') && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Btn variant="ghost" size="sm" onClick={() => { setEditArticle(a); setShowForm(true); }}><Edit3 size={12} /></Btn>
                    {['manager', 'admin'].includes(user?.role ?? '') && (
                      <Btn variant="ghost" size="sm" onClick={async () => { if (window.confirm('Supprimer cet article ?')) await remove(a.id); }}><Trash2 size={12} /></Btn>
                    )}
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
  const [form, setForm] = useState({ titre: '', contenu: '', mots_clefs: '', statut: 'brouillon' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (article) setForm({ titre: article.titre, contenu: article.contenu, mots_clefs: article.mots_clefs.join(', '), statut: article.statut });
    else setForm({ titre: '', contenu: '', mots_clefs: '', statut: 'brouillon' });
  }, [article, open]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({ ...form, mots_clefs: form.mots_clefs.split(',').map((k: string) => k.trim()).filter(Boolean) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title={article ? "Modifier l'article" : 'Nouvel article'} onClose={onClose} size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} onClick={handleSave}>Enregistrer</Btn></>}>
      <div className="space-y-4">
        <Input label="Titre *" value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
        <Textarea label="Contenu (Markdown)" rows={10} value={form.contenu} onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))} />
        <Input label="Mots-clés (séparés par des virgules)" value={form.mots_clefs} onChange={e => setForm(f => ({ ...f, mots_clefs: e.target.value }))} />
        <Select label="Statut" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
          options={[{ value: 'brouillon', label: 'Brouillon' }, { value: 'publie', label: 'Publié' }, { value: 'archive', label: 'Archivé' }]} />
      </div>
    </Modal>
  );
}

// ── Users Page ────────────────────────────────────────────────────────────────

function UsersPage() {
  const { data, loading, create, update, remove, setDisponibilite, setActif } = useUsers();
  const users = data?.data ?? [];
  const { data: equipesData } = useEquipes();
  const equipes = equipesData?.data ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [actionError, setActionError] = useState('');

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
        <Btn size="sm" onClick={() => { setEditUser(null); setShowForm(true); }}><Plus size={14} />Inviter un utilisateur</Btn>
      </div>
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
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3"><span className="text-xs text-[#605F57]">{equipe?.nom ?? '—'}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={async () => {
                        try { await setActif(u.id, !u.actif); }
                        catch (e: any) { setActionError(e.response?.data?.message ?? 'Erreur.'); }
                      }}>
                        <span className={`text-xs font-medium ${u.actif ? 'text-[#5C7A4C]' : 'text-[#A8402F]'}`}>{u.actif ? 'Actif' : 'Inactif'}</span>
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
                        <Btn variant="ghost" size="sm" onClick={() => { setEditUser(u); setShowForm(true); }}><Edit3 size={12} /></Btn>
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

      <UserFormModal open={showForm} onClose={() => setShowForm(false)} user={editUser} equipes={equipes}
        onSave={async (body) => { if (editUser) await update(editUser.id, body); else await create(body); setShowForm(false); }} />

      <Modal open={!!confirmDelete} title="Supprimer l'utilisateur" onClose={() => { setConfirmDelete(null); setDeleteError(''); }} size="sm"
        footer={<><Btn variant="secondary" onClick={() => { setConfirmDelete(null); setDeleteError(''); }}>Annuler</Btn><Btn variant="danger" onClick={() => handleDelete(confirmDelete)}>Supprimer</Btn></>}>
        {deleteError && <div className="mb-3"><Alert type="error">{deleteError}</Alert></div>}
        <p className="text-sm text-[#45443E]">Voulez-vous supprimer <strong>{confirmDelete?.prenom} {confirmDelete?.nom}</strong> ? Cette action est irréversible.</p>
      </Modal>
    </div>
  );
}

function UserFormModal({ open, onClose, user, equipes, onSave }: { open: boolean; onClose: () => void; user: any; equipes: any[]; onSave: (b: any) => Promise<void> }) {
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', role: 'client', id_equipe: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setForm({ nom: user.nom, prenom: user.prenom, email: user.email, role: user.role, id_equipe: user.id_equipe ?? '' });
    else setForm({ nom: '', prenom: '', email: '', role: 'client', id_equipe: '' });
  }, [user, open]);

  const handleSave = async () => {
    setLoading(true);
    try { await onSave({ ...form, id_equipe: form.id_equipe || null }); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} title={user ? "Modifier l'utilisateur" : 'Inviter un utilisateur'} onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} onClick={handleSave}>Enregistrer</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Prénom *" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
          <Input label="Nom *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
        </div>
        <Input label="Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <Select label="Rôle *" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          options={[{ value: 'client', label: 'Client' }, { value: 'agent', label: 'Agent' }, { value: 'manager', label: 'Manager' }, { value: 'admin', label: 'Administrateur' }]} />
        {form.role === 'agent' && (
          <Select label="Équipe" value={form.id_equipe} onChange={e => setForm(f => ({ ...f, id_equipe: e.target.value }))} placeholder="— aucune —"
            options={equipes.map((e: any) => ({ value: e.id, label: e.nom }))} />
        )}
        {!user && <Alert type="info">Un lien d'invitation (valable 5h) sera envoyé par e-mail.</Alert>}
      </div>
    </Modal>
  );
}

// ── Équipes Page ──────────────────────────────────────────────────────────────

function EquipesPage() {
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
      setSelectedAgents(members.map((m: any) => m.id ?? m));
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
                <input type="checkbox" checked={selectedAgents.includes(a.id)} onChange={() => toggleAgent(a.id)} className="rounded" />
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
  const { data, loading, create, update, remove } = useActifs();
  const actifs = data?.data ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editActif, setEditActif] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async (a: any) => {
    setDeleteError('');
    try { await remove(a.id); setConfirmDelete(null); }
    catch (err: any) { setDeleteError(err.response?.data?.message ?? 'Erreur.'); }
  };

  const statutStyle = (s: string) => s === 'actif' ? { bg: M.sage50, text: M.sage700 } : s === 'hors_service' ? { bg: M.brick50, text: M.brick700 } : { bg: M.amber50, text: M.amber700 };
  const statutLbl = (s: string) => ({ actif: 'Actif', hors_service: 'Hors service', maintenance: 'Maintenance' }[s] ?? s);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1C1B18]">Actifs</h1>
        <Btn size="sm" onClick={() => { setEditActif(null); setShowForm(true); }}><Plus size={14} />Nouvel actif</Btn>
      </div>
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-lg border border-[#E2E1DC] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E2E1DC]">
                {['Nom', 'Type', 'Statut', 'Description', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#86847A] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEFEC]">
              {actifs.map((a: any) => {
                const sc = statutStyle(a.statut);
                return (
                  <tr key={a.id} className="hover:bg-[#F7F7F5]">
                    <td className="px-4 py-3 text-sm font-medium text-[#1C1B18]">{a.nom}</td>
                    <td className="px-4 py-3 text-xs text-[#605F57]">{a.type}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{statutLbl(a.statut)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#86847A]">{a.description}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="sm" onClick={() => { setEditActif(a); setShowForm(true); }}><Edit3 size={12} /></Btn>
                        <Btn variant="ghost" size="sm" onClick={() => setConfirmDelete(a)}><Trash2 size={12} /></Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ActifFormModal open={showForm} onClose={() => setShowForm(false)} actif={editActif}
        onSave={async (body) => { if (editActif) await update(editActif.id, body); else await create(body); setShowForm(false); }} />

      <Modal open={!!confirmDelete} title="Supprimer l'actif" onClose={() => { setConfirmDelete(null); setDeleteError(''); }} size="sm"
        footer={<><Btn variant="secondary" onClick={() => { setConfirmDelete(null); setDeleteError(''); }}>Annuler</Btn><Btn variant="danger" onClick={() => handleDelete(confirmDelete)}>Supprimer</Btn></>}>
        {deleteError && <div className="mb-3"><Alert type="error">{deleteError}</Alert></div>}
        <p className="text-sm text-[#45443E]">Supprimer <strong>{confirmDelete?.nom}</strong> ? Les incidents liés ne seront pas supprimés.</p>
      </Modal>
    </div>
  );
}

function ActifFormModal({ open, onClose, actif, onSave }: { open: boolean; onClose: () => void; actif: any; onSave: (b: any) => Promise<void> }) {
  const [form, setForm] = useState({ nom: '', type: '', description: '', statut: 'actif' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (actif) setForm({ nom: actif.nom, type: actif.type, description: actif.description, statut: actif.statut });
    else setForm({ nom: '', type: '', description: '', statut: 'actif' });
  }, [actif, open]);

  const handleSave = async () => { setLoading(true); try { await onSave(form); } finally { setLoading(false); } };

  return (
    <Modal open={open} title={actif ? "Modifier l'actif" : 'Nouvel actif'} onClose={onClose} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Annuler</Btn><Btn loading={loading} onClick={handleSave}>Enregistrer</Btn></>}>
      <div className="space-y-4">
        <Input label="Nom *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
        <Input label="Type *" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="Serveur, Réseau, Logiciel..." />
        <Textarea label="Description" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <Select label="Statut" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
          options={[{ value: 'actif', label: 'Actif' }, { value: 'hors_service', label: 'Hors service' }, { value: 'maintenance', label: 'Maintenance' }]} />
      </div>
    </Modal>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────

function SettingsPage() {
  const [tab, setTab] = useState<'sla' | 'matrix'>('sla');
  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-[#1C1B18] mb-6">Paramètres</h1>
      <div className="flex gap-1 mb-6 bg-[#EFEFEC] rounded-lg p-1 w-fit">
        {(['sla', 'matrix'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm transition-colors ${tab === t ? 'bg-white font-medium text-[#1C1B18] shadow-sm' : 'text-[#605F57]'}`}>
            {t === 'sla' ? 'Configuration SLA' : 'Matrice de priorité'}
          </button>
        ))}
      </div>
      {tab === 'sla' ? <SLAConfig /> : <PriorityMatrix />}
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
    setLocalSlas(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
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
  const { impacts, urgences, priorites, loading } = useImpactsUrgences();
  if (loading) return <LoadingSpinner />;
  return (
    <div className="bg-white rounded-lg border border-[#E2E1DC] p-6">
      <h3 className="text-sm font-semibold text-[#1C1B18] mb-6">Matrice Impact × Urgence → Priorité</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-[#86847A] font-medium">Impact \ Urgence</th>
              {urgences.map((u: any) => <th key={u.id} className="px-3 py-2 text-center text-[#86847A] font-medium">{u.nom} ({u.valeur})</th>)}
            </tr>
          </thead>
          <tbody>
            {impacts.map((imp: any) => (
              <tr key={imp.id} className="border-t border-[#EFEFEC]">
                <td className="px-3 py-3 font-medium text-[#45443E]">{imp.nom} ({imp.valeur})</td>
                {urgences.map((urg: any) => {
                  const pv = imp.valeur * urg.valeur;
                  const p = priorites.find((p: any) => p.valeur === pv);
                  const pc = prioriteColor(p?.nom ?? '');
                  return (
                    <td key={urg.id} className="px-3 py-3 text-center">
                      {p ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: pc.bg, color: pc.text }}>
                          {p.nom} ({pv})
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
  const { generate, data, loading, error } = useRapportsPerformance();
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const CHART_COLORS = [M.cobalt500, M.sage500, M.amber500, M.brick500, M.n400];

  useEffect(() => { generate({}); }, []);

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-[#1C1B18] mb-6">Rapport de performance</h1>
      <div className="bg-white rounded-lg border border-[#E2E1DC] p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#605F57] uppercase tracking-wide">Date début</label>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="px-3 py-2 text-sm border border-[#E2E1DC] rounded focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#605F57] uppercase tracking-wide">Date fin</label>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="px-3 py-2 text-sm border border-[#E2E1DC] rounded focus:outline-none" />
          </div>
          <Btn loading={loading} onClick={() => generate({ date_debut: dateDebut || undefined, date_fin: dateFin || undefined })}><BarChart2 size={14} />Générer</Btn>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E2E1DC] rounded hover:bg-[#F7F7F5] text-[#45443E]">
            <Printer size={14} />Imprimer
          </button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {loading && <LoadingSpinner />}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total incidents" value={data.total} icon={FileText} />
            <StatCard label="Clôturés" value={data.cloturesCount} icon={CheckCircle2} color={M.sage500} />
            <StatCard label="Taux de résolution" value={`${data.tauxResolution}%`} icon={TrendingUp} color={data.tauxResolution >= 70 ? M.sage500 : M.amber500} />
            <StatCard label="En cours" value={data.byStatut.find((s: any) => s.statut === 'en_cours')?.count ?? 0} icon={Clock} />
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E1DC] p-5">
            <h3 className="text-sm font-semibold text-[#45443E] mb-4">Performance par agent</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E1DC]">
                  <th className="text-left px-4 py-2 text-[10px] text-[#86847A] uppercase">Agent</th>
                  <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Prestations</th>
                  <th className="text-right px-4 py-2 text-[10px] text-[#86847A] uppercase">Résolus</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Profile Page ──────────────────────────────────────────────────────────────

function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) setForm({ nom: user.nom, prenom: user.prenom, email: user.email });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess(false);
    try {
      const res = await api.put('/profile', form);
      updateUser(res.data.data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur.');
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

function AppRouter() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={
        !user ? <Navigate to="/login" /> : (
          <AppLayout>
            <Routes>
              <Route path="/" element={user.role === 'client' ? <Navigate to="/incidents" /> : <DashboardPage />} />
              <Route path="/incidents" element={<IncidentListPage />} />
              <Route path="/incidents/new" element={<RequireRole roles={['client']}><CreateIncidentPage /></RequireRole>} />
              <Route path="/incidents/:id" element={<IncidentDetailPage />} />
              <Route path="/incidents/:id/edit" element={<EditIncidentPage />} />
              <Route path="/incidents/:id/rapport" element={<RapportPrestationPage />} />
              <Route path="/articles" element={<ArticlesPage />} />
              <Route path="/users" element={<RequireRole roles={['admin']}><UsersPage /></RequireRole>} />
              <Route path="/equipes" element={<RequireRole roles={['admin']}><EquipesPage /></RequireRole>} />
              <Route path="/actifs" element={<RequireRole roles={['admin']}><ActifsPage /></RequireRole>} />
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

