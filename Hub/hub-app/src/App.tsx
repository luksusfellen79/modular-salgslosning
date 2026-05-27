import { useState, useEffect, useCallback } from 'react';
import {
  login, fetchUsers, createUser, updateUser, deactivateUser, fetchStats,
  HubUser, AppPermission, UserRole, SalesStats, userHasAppPermission, normalizeHubUser,
} from './lib/api';
import { saveSession, getSession, clearSession } from './lib/session';

// ─── Env ──────────────────────────────────────────────────────────────────────
const APP_URLS: Record<AppPermission, string> = {
  mdu_crm:       (import.meta.env.VITE_MDU_CRM_URL       as string | undefined) ?? 'http://localhost:5174',
  mdu_leder:     (import.meta.env.VITE_MDU_LEDER_URL     as string | undefined) ?? 'http://localhost:5178',
  sdu_crm:       (import.meta.env.VITE_SDU_CRM_URL       as string | undefined) ?? 'http://localhost:5175',
  sdu_planner:   (import.meta.env.VITE_SDU_PLANNER_URL   as string | undefined) ?? 'http://localhost:5176',
  sdu_incentives:(import.meta.env.VITE_SDU_INCENTIVES_URL as string | undefined) ?? 'http://localhost:5177',
  case_app:      (import.meta.env.VITE_CASE_APP_URL      as string | undefined) ?? 'http://localhost:5179',
};

// ─── Design ───────────────────────────────────────────────────────────────────
const BLUE      = '#005A8E';
const BLUE_DARK = '#003D61';
const TEAL      = '#00827F';
const GRAY50    = '#F8FAFC';
const GRAY100   = '#F1F5F9';
const GRAY200   = '#E2E8F0';
const GRAY400   = '#94A3B8';
const GRAY600   = '#475569';
const SLATE     = '#1E293B';

// ─── App card config ──────────────────────────────────────────────────────────
interface AppCard {
  permission: AppPermission;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  gradient: string;
}

const APP_CARDS: AppCard[] = [
  {
    permission: 'mdu_crm',
    title: 'MDU CRM',
    subtitle: 'Pipeline, tilbud og borettslag',
    icon: '🏢',
    color: BLUE,
    gradient: 'linear-gradient(135deg, #005A8E 0%, #003D61 100%)',
  },
  {
    permission: 'mdu_leder',
    title: 'MDU Leder',
    subtitle: 'War Room, forecast og rapporter',
    icon: '🛡️',
    color: '#0F766E',
    gradient: 'linear-gradient(135deg, #0F766E 0%, #064E3B 100%)',
  },
  {
    permission: 'sdu_crm',
    title: 'Feltsalg',
    subtitle: 'Dørsalg og kundeprofiler',
    icon: '🚪',
    color: TEAL,
    gradient: 'linear-gradient(135deg, #00827F 0%, #005553 100%)',
  },
  {
    permission: 'sdu_planner',
    title: 'SDU Planner',
    subtitle: 'Besøksrunder og selgertildeling',
    icon: '📋',
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
  },
  {
    permission: 'sdu_incentives',
    title: 'Incentiver',
    subtitle: 'Kampanjer og bonus-ladder',
    icon: '🎯',
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
  },
  {
    permission: 'case_app',
    title: 'Case',
    subtitle: 'Saksbehandling og kundeservice',
    icon: '🎫',
    color: '#BE185D',
    gradient: 'linear-gradient(135deg, #BE185D 0%, #831843 100%)',
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin:  'Superadmin',
  salgsleder:  'Salgsleder',
  selger_sdu:  'Selger (SDU)',
  selger_mdu:  'Selger (MDU)',
  kundeservice: 'Kundeservice',
  case_admin:  'Case-admin',
  case_teknisk: 'Teknisk (Case)',
};

const PERMISSION_LABELS: Record<AppPermission, string> = {
  mdu_crm:        'MDU CRM',
  mdu_leder:      'MDU Leder',
  sdu_crm:        'Feltsalg',
  sdu_planner:    'SDU Planner',
  sdu_incentives: 'Incentiver',
  case_app:       'Case App',
};

// ─── Telenor Logo ─────────────────────────────────────────────────────────────
function TelenorLogo({ size = 32, white = false }: { size?: number; white?: boolean }) {
  return (
    <svg width={size} height={size * (128.73 / 139.82)} viewBox="0 0 139.82 128.73">
      <path fill={white ? '#fff' : '#01ACFB'} d="M70.67,39.37c2,.31,2.4-.1,2.67-2a45.17,45.17,0,0,1,3.89-12.75C79.85,19.24,84,13.33,89.85,9.36a62.78,62.78,0,0,1,19.2-8.26,46.83,46.83,0,0,1,14-.93c8.42.76,13.08,3.16,15.42,6.27A6.75,6.75,0,0,1,139.81,10c.07,1.55-.6,3.56-2.83,5.54s-6.77,4.33-13.06,6.44c-6.52,2.17-15.44,4.47-24.33,6.51a137.22,137.22,0,0,0-15.22,4.37c-5.88,2-7.65,7.85-4,9.64A54.92,54.92,0,0,1,91.82,50,101.32,101.32,0,0,1,107.08,65c5.53,6.76,14.59,19.66,17.84,32.18,3.61,13.75,1.36,26.78-6.42,30.42-7.63,3.58-17.79-1.58-24.93-9-6.78-7-11.52-15.29-16-28-3.86-11-5.42-26.87-5.42-35.19,0-2.77,0-3.36.07-5.86.26-2.18-5.62-4-11.94.08-7.19,4.63-14.23,13-18.39,17.88-1.81,2.13-4.27,5.25-6.86,8.52-3.43,4.3-7.21,8.78-10.66,11.28C19.2,91,10.87,92.6,5,88.44c-3.25-2.32-5-6.7-5-11.16a16.91,16.91,0,0,1,2.3-8.77c2-3.43,5.17-7.12,10.28-11.34A90.51,90.51,0,0,1,34.73,44.54c12.88-5.19,26.75-6.82,35.94-5.17Z" />
    </svg>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: (user: HubUser) => void }) {
  const [users, setUsers] = useState<HubUser[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch((import.meta.env.VITE_SALES_CORE_URL as string | undefined ?? 'http://localhost:3005') + '/api/auth/users')
      .then(r => r.json())
      .then((data: HubUser[]) => setUsers(data.filter(u => u.isActive)))
      .catch(() => setError('Kunne ikke koble til Sales Core'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!selectedName || !pin) { setError('Velg navn og skriv inn PIN'); return; }
    setSubmitting(true);
    setError('');
    try {
      const user = await login(selectedName, pin);
      saveSession(user);
      onLogin(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Innlogging feilet');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(160deg, ${BLUE_DARK} 0%, ${BLUE} 50%, ${TEAL} 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TelenorLogo size={48} white />
          <span style={{ fontSize: 32, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>Telenor</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Salgsplattform</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Logg inn for å fortsette</div>
        </div>
      </div>

      {/* Card */}
      <div style={{ background: 'white', borderRadius: 20, padding: 36, width: '100%', maxWidth: 400, boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700, color: SLATE }}>Hvem er du?</h2>

        {loading ? (
          <div style={{ textAlign: 'center', color: GRAY400, padding: '20px 0' }}>Laster brukere…</div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: GRAY600, marginBottom: 8 }}>Navn</label>
              <select
                value={selectedName}
                onChange={e => { setSelectedName(e.target.value); setError(''); }}
                style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${selectedName ? BLUE : GRAY200}`, borderRadius: 10, fontSize: 15, color: SLATE, boxSizing: 'border-box', outline: 'none' }}
              >
                <option value="">Velg navn…</option>
                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: GRAY600, marginBottom: 8 }}>PIN-kode</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && void handleSubmit()}
                placeholder="••••"
                style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${pin ? BLUE : GRAY200}`, borderRadius: 10, fontSize: 24, letterSpacing: 8, textAlign: 'center', color: SLATE, boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {error && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              onClick={() => void handleSubmit()}
              disabled={submitting || !selectedName || pin.length < 4}
              style={{
                width: '100%', padding: '14px', background: submitting || !selectedName || pin.length < 4 ? GRAY200 : `linear-gradient(135deg, ${BLUE} 0%, ${TEAL} 100%)`,
                color: submitting || !selectedName || pin.length < 4 ? GRAY400 : 'white',
                border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: submitting || !selectedName || pin.length < 4 ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {submitting ? 'Logger inn…' : 'Logg inn →'}
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 32, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
        Telenor Salgsplattform · Pilot 2026
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function appUrl(baseUrl: string, user: HubUser): string {
  const normalized = normalizeHubUser(user);
  const token = encodeURIComponent(JSON.stringify(normalized));
  return `${baseUrl}?hub_session=${token}`;
}

function Dashboard({ user, stats, onAdmin, onLogout, onInsights, onNBA }: { user: HubUser; stats: SalesStats | null; onAdmin: () => void; onLogout: () => void; onInsights: () => void; onNBA: () => void }) {
  const userCards = APP_CARDS.filter(c => userHasAppPermission(user, c.permission));

  const statItems = [
    { label: 'Aktive MDU-muligheter', value: stats?.activeOpportunities ?? '–', color: BLUE },
    { label: 'Tilbud venter svar', value: stats?.pendingOffers ?? '–', color: '#D97706' },
    { label: 'Aktive SDU-runder', value: stats?.activeRounds ?? '–', color: TEAL },
    { label: 'Registrerte selgere', value: stats?.totalSellers ?? '–', color: '#7C3AED' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: GRAY50, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TelenorLogo size={28} white />
          <span style={{ color: 'white', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>Salgsplattform</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user.role === 'superadmin' && (
            <button onClick={onAdmin} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              ⚙️ Admin
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
              {user.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{ROLE_LABELS[user.role]}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13 }}>Logg ut</button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: SLATE }}>
            God kveld, {user.name.split(' ')[0]} 👋
          </h1>
          <p style={{ margin: '6px 0 0', color: GRAY400, fontSize: 15 }}>
            Her er en oversikt over plattformen din i dag.
          </p>
        </div>

        {/* Stats row */}
        {user.role === 'superadmin' || user.role === 'salgsleder' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
            {statItems.map(({ label, value, color }) => (
              <div key={label} style={{ background: 'white', border: `1px solid ${GRAY200}`, borderRadius: 14, padding: '20px 22px', borderTop: `3px solid ${color}` }}>
                <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 12, color: GRAY400, marginTop: 4, lineHeight: 1.3 }}>{label}</div>
              </div>
            ))}
          </div>
        ) : null}

        {/* App cards */}
        <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: GRAY600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Dine apper
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {userCards.map(card => (
            <a
              key={card.permission}
              href={appUrl(APP_URLS[card.permission], user)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'block', borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; }}
            >
              {/* Card top */}
              <div style={{ background: card.gradient, padding: '28px 24px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.15 }}>{card.icon}</div>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{card.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{card.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{card.subtitle}</div>
              </div>
              {/* Card bottom */}
              <div style={{ background: 'white', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: card.color }}>Åpne →</span>
                <span style={{ fontSize: 11, color: GRAY400, background: GRAY100, padding: '3px 8px', borderRadius: 99 }}>Live</span>
              </div>
            </a>
          ))}
        </div>

        {userCards.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: GRAY400 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 15 }}>Du har ikke tilgang til noen apper ennå. Kontakt administrator.</div>
          </div>
        )}

        {/* Insights card — visible to salgsleder + superadmin */}
        {(user.role === 'superadmin' || user.role === 'salgsleder') && (
          <div style={{ marginTop: 36 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: GRAY600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI-verktøy
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                onClick={onInsights}
                style={{ background: `linear-gradient(135deg, #1E293B 0%, #0F172A 100%)`, borderRadius: 18, padding: '24px 28px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; }}
              >
                <div style={{ fontSize: 40, flexShrink: 0 }}>🧠</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 4 }}>Innsikt-agent</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                    Analyserer salg og interaksjoner på tvers av SDU og MDU. Identifiserer churn-mønstre, vinnerformler og produkt-trender.
                  </div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 22, flexShrink: 0 }}>→</div>
              </div>

              <div
                onClick={onNBA}
                style={{ background: `linear-gradient(135deg, #1C3A5E 0%, #0F2744 100%)`, borderRadius: 18, padding: '24px 28px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; }}
              >
                <div style={{ fontSize: 40, flexShrink: 0 }}>🎯</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 4 }}>NBA-agent — Next Best Action</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                    Lytter til hvert salgsbesøk og lærer av reelle utfall. Rapport over treffsikkerhet, avvik og produktmønstre.
                  </div>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 22, flexShrink: 0 }}>→</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ currentUser, onBack }: { currentUser: HubUser; onBack: () => void }) {
  const [users, setUsers] = useState<HubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await fetchUsers()); }
    catch { setError('Kunne ikke hente brukere'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deaktivere denne brukeren?')) return;
    try { await deactivateUser(id); void load(); }
    catch { setError('Kunne ikke deaktivere bruker'); }
  };

  const handleReactivate = async (id: string) => {
    try { await updateUser(id, { isActive: true }); void load(); }
    catch { setError('Feil'); }
  };

  const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleString('no-NO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';

  return (
    <div style={{ minHeight: '100vh', background: GRAY50, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>← Tilbake</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TelenorLogo size={24} white />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Brukeradministrasjon</span>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: SLATE }}>Brukere ({users.length})</h1>
          <button onClick={() => setShowNew(true)} style={{ background: BLUE, color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Ny bruker
          </button>
        </div>

        {error && <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: GRAY400 }}>Laster…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map(u => (
              <div key={u.id} style={{ background: 'white', border: `1px solid ${GRAY200}`, borderRadius: 14, padding: '16px 20px', opacity: u.isActive ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: u.role === 'superadmin' ? BLUE : u.role === 'salgsleder' ? TEAL : GRAY200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: ['superadmin','salgsleder'].includes(u.role) ? 'white' : SLATE, flexShrink: 0 }}>
                    {u.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: SLATE }}>{u.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: u.role === 'superadmin' ? '#EEF2FF' : GRAY100, color: u.role === 'superadmin' ? '#4338CA' : GRAY600 }}>
                        {ROLE_LABELS[u.role]}
                      </span>
                      {!u.isActive && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#FEE2E2', color: '#DC2626', fontWeight: 600 }}>Inaktiv</span>}
                    </div>
                    <div style={{ fontSize: 12, color: GRAY400, marginTop: 3 }}>{u.email}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {(Object.keys(PERMISSION_LABELS) as AppPermission[]).map(p => (
                        <span key={p} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, background: u.permissions.includes(p) ? '#DCFCE7' : GRAY100, color: u.permissions.includes(p) ? '#15803D' : GRAY400, fontWeight: 600 }}>
                          {u.permissions.includes(p) ? '✓' : '–'} {PERMISSION_LABELS[p]}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: GRAY400, marginTop: 6 }}>
                      Sist innlogget: {formatDate(u.lastLoginAt)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {u.id !== currentUser.id && (
                      <>
                        <button onClick={() => setEditId(u.id)} style={{ background: GRAY100, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: GRAY600 }}>
                          Rediger
                        </button>
                        {u.isActive ? (
                          <button onClick={() => void handleDeactivate(u.id)} style={{ background: '#FEE2E2', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#DC2626' }}>
                            Deaktiver
                          </button>
                        ) : (
                          <button onClick={() => void handleReactivate(u.id)} style={{ background: '#DCFCE7', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#15803D' }}>
                            Aktiver
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <UserModal
          mode="create"
          currentUserId={currentUser.id}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); void load(); }}
        />
      )}

      {editId && (
        <UserModal
          mode="edit"
          userId={editId}
          initialData={users.find(u => u.id === editId)}
          currentUserId={currentUser.id}
          onClose={() => setEditId(null)}
          onSaved={() => { setEditId(null); void load(); }}
        />
      )}
    </div>
  );
}

// ─── User Modal ───────────────────────────────────────────────────────────────
function UserModal({ mode, userId, initialData, currentUserId, onClose, onSaved }: {
  mode: 'create' | 'edit';
  userId?: string;
  initialData?: HubUser;
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>(initialData?.role ?? 'selger_sdu');
  const [permissions, setPermissions] = useState<AppPermission[]>(initialData?.permissions ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const togglePerm = (p: AppPermission) =>
    setPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (mode === 'create') {
        if (!name || !email || !pin || pin.length !== 4) { setError('Alle felt må fylles ut, PIN må være 4 siffer'); setSaving(false); return; }
        await createUser({ name, email, pin, role, permissions, createdBy: currentUserId });
      } else if (userId) {
        const data: Parameters<typeof updateUser>[1] = { name, email, role, permissions };
        if (pin.length === 4) data.pin = pin;
        await updateUser(userId, data);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${GRAY200}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: SLATE }}>{mode === 'create' ? 'Ny bruker' : 'Rediger bruker'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: GRAY400 }}>×</button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Navn', value: name, set: setName, placeholder: 'Kari Nordmann' },
            { label: 'E-post', value: email, set: setEmail, placeholder: 'kari@telenor.com' },
            { label: mode === 'create' ? 'PIN (4 siffer)' : 'Ny PIN (la stå tom for å beholde)', value: pin, set: setPin, placeholder: '••••', maxLen: 4 },
          ].map(({ label, value, set, placeholder, maxLen }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: GRAY600, marginBottom: 6 }}>{label}</label>
              <input
                type={label.includes('PIN') ? 'password' : 'text'}
                inputMode={label.includes('PIN') ? 'numeric' : undefined}
                value={value} onChange={e => set(e.target.value.replace(label.includes('PIN') ? /\D/g : '', ''))}
                placeholder={placeholder} maxLength={maxLen}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${GRAY200}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: GRAY600, marginBottom: 6 }}>Rolle</label>
            <select value={role} onChange={e => setRole(e.target.value as UserRole)}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${GRAY200}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([r, l]) => (
                <option key={r} value={r}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: GRAY600, marginBottom: 8 }}>Apptilganger</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(Object.entries(PERMISSION_LABELS) as [AppPermission, string][]).map(([p, l]) => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, background: permissions.includes(p) ? '#EFF8FF' : GRAY50, border: `1px solid ${permissions.includes(p) ? '#0085C3' : GRAY200}` }}>
                  <input type="checkbox" checked={permissions.includes(p)} onChange={() => togglePerm(p)} style={{ accentColor: BLUE }} />
                  <span style={{ fontSize: 14, color: SLATE, fontWeight: 500 }}>{l}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>{error}</div>}
        </div>

        <div style={{ padding: '16px 24px', borderTop: `1px solid ${GRAY200}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: `1px solid ${GRAY200}`, borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14 }}>Avbryt</button>
          <button onClick={() => void handleSave()} disabled={saving}
            style={{ padding: '10px 20px', background: saving ? GRAY200 : BLUE, color: saving ? GRAY400 : 'white', border: 'none', borderRadius: 8, cursor: saving ? 'default' : 'pointer', fontSize: 14, fontWeight: 700 }}>
            {saving ? 'Lagrer…' : mode === 'create' ? 'Opprett' : 'Lagre'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Insights Page ────────────────────────────────────────────────────────────
const AI_CORE_URL  = (import.meta.env.VITE_AI_CORE_URL   as string | undefined) ?? 'http://localhost:3000';
const SALES_CORE_URL = (import.meta.env.VITE_SALES_CORE_URL as string | undefined) ?? 'http://localhost:3005';

// Extract product category from name (first word: "Internett", "Mobil", "TV", etc.)
function productCategory(name: string): string {
  return name?.split(' ')[0]?.toLowerCase() ?? 'ukjent';
}

interface NBAOutcome {
  unitId: string;
  buildingId: string;
  recommendedProduct: string;
  recommendedCampaign: string;
  actualOutcome: string;
  actualProducts: string[];
  hitRecommendation: boolean;
  loggedAt: string;
}

interface NBAStats {
  total: number;
  exactHits: number;
  nearHits: number;
  differentSales: number;
  noSale: number;
  followup: number;
  hitRate: number;
  conversionRate: number;
  topRecommended: Array<{ product: string; count: number; hitRate: number }>;
  topSold: Array<{ product: string; count: number }>;
  divergent: Array<{ recommended: string; sold: string; count: number }>;
}

function computeNBAStats(outcomes: NBAOutcome[]): NBAStats {
  const total = outcomes.length;
  const exactHits = outcomes.filter(o => o.hitRecommendation).length;

  const soldButDifferent = outcomes.filter(
    o => o.actualOutcome === 'sold' && !o.hitRecommendation
  );
  const nearHits = soldButDifferent.filter(o =>
    o.actualProducts.some(p => productCategory(p) === productCategory(o.recommendedProduct))
  ).length;
  const differentSales = soldButDifferent.length - nearHits;

  const noSale = outcomes.filter(o => o.actualOutcome === 'rejected' || o.actualOutcome === 'no_answer').length;
  const followup = outcomes.filter(o => o.actualOutcome === 'followup' || o.actualOutcome === 'marketing').length;

  // Top recommended products
  const recMap: Record<string, { count: number; hits: number }> = {};
  for (const o of outcomes) {
    if (!recMap[o.recommendedProduct]) recMap[o.recommendedProduct] = { count: 0, hits: 0 };
    recMap[o.recommendedProduct].count++;
    if (o.hitRecommendation) recMap[o.recommendedProduct].hits++;
  }
  const topRecommended = Object.entries(recMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([product, { count, hits }]) => ({ product, count, hitRate: Math.round((hits / count) * 100) }));

  // Top actually sold
  const soldMap: Record<string, number> = {};
  for (const o of outcomes) {
    for (const p of o.actualProducts) {
      soldMap[p] = (soldMap[p] ?? 0) + 1;
    }
  }
  const topSold = Object.entries(soldMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([product, count]) => ({ product, count }));

  // Most common divergent pairs (recommended X → sold Y)
  const divMap: Record<string, number> = {};
  for (const o of soldButDifferent) {
    for (const p of o.actualProducts) {
      const key = `${o.recommendedProduct} → ${p}`;
      divMap[key] = (divMap[key] ?? 0) + 1;
    }
  }
  const divergent = Object.entries(divMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => {
      const [recommended, sold] = key.split(' → ');
      return { recommended, sold, count };
    });

  return {
    total, exactHits, nearHits, differentSales, noSale, followup,
    hitRate: total > 0 ? Math.round((exactHits / total) * 100) : 0,
    conversionRate: total > 0 ? Math.round(((exactHits + nearHits + differentSales) / total) * 100) : 0,
    topRecommended, topSold, divergent,
  };
}


interface InsightItem { reason?: string; product?: string; trend?: string; signal?: string; frequency?: string; detail?: string; }
interface InsightsReport {
  churnReasons:   Array<{ reason: string; frequency: string; detail: string }>;
  winReasons:     Array<{ reason: string; frequency: string; detail: string }>;
  productTrends:  Array<{ product: string; trend: string; signal: string }>;
  keyInsights:    string[];
  recommendations: string[];
  dataNote:       string;
}

const FREQ_COLOR: Record<string, string> = { høy: '#DC2626', middels: '#D97706', lav: '#16A34A' };
const TREND_COLOR: Record<string, string> = { voksende: '#16A34A', stabil: '#2563EB', synkende: '#DC2626' };

function InsightCard({ title, emoji, items, color, renderItem }: {
  title: string; emoji: string; items: InsightItem[]; color: string;
  renderItem: (item: InsightItem, i: number) => React.ReactNode;
}) {
  return (
    <div style={{ background: 'white', border: `1px solid ${GRAY200}`, borderRadius: 16, padding: 24, borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: SLATE }}>{title}</span>
      </div>
      {items.length === 0
        ? <p style={{ fontSize: 13, color: GRAY400, margin: 0 }}>Ikke nok data ennå.</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item, i) => renderItem(item, i))}
          </div>
      }
    </div>
  );
}

// ─── NBA Page ─────────────────────────────────────────────────────────────────
function NBAPage({ onBack }: { user: HubUser; onBack: () => void }) {
  const [stats, setStats] = useState<NBAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${AI_CORE_URL}/nba/outcomes`)
      .then(r => r.json())
      .then((data: NBAOutcome[]) => setStats(computeNBAStats(data)))
      .catch(() => setError('Kunne ikke hente NBA-data'))
      .finally(() => setLoading(false));
  }, []);

  const statBoxes = stats ? [
    { label: 'Tips vist', value: stats.total, color: BLUE, emoji: '📊', sub: 'Totalt antall anbefalinger gitt' },
    { label: 'Eksakt treff', value: stats.exactHits, color: '#16A34A', emoji: '🎯', sub: `${stats.hitRate}% treffsikkerhet` },
    { label: 'Nær treff', value: stats.nearHits, color: '#D97706', emoji: '🔸', sub: 'Solgte i samme kategori' },
    { label: 'Annet salg', value: stats.differentSales, color: '#7C3AED', emoji: '↔️', sub: 'Solgte noe helt annet' },
    { label: 'Ingen salg', value: stats.noSale, color: GRAY400, emoji: '❌', sub: 'Avvist eller ikke hjemme' },
    { label: 'Oppfølging', value: stats.followup, color: TEAL, emoji: '🔁', sub: 'Potensielle fremtidige salg' },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: GRAY50, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>← Tilbake</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TelenorLogo size={24} white />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>NBA — Next Best Action</span>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* What is this agent */}
        <div style={{ background: 'white', border: `1px solid ${GRAY200}`, borderRadius: 18, padding: 28, marginBottom: 32, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 40, flexShrink: 0 }}>🎯</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: SLATE }}>Next Best Action-agent</h1>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: GRAY600, lineHeight: 1.8 }}>
              NBA-agenten <strong>lytter til hvert salgsbesøk, observerer hva som faktisk ble solgt</strong>, og justerer sine anbefalinger deretter.
              Den starter uten fordommer — og blir gradvis klokere for hvert utfall som logges.
              Over tid lærer den hvilke produkter som treffer i hvilke bygg, hvilke kampanjer som resonerer med hvilke kundetyper,
              og hvilke anbefalinger som konsekvent leder til ja.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { icon: '👂', label: 'Lytter', desc: 'Registrerer hvert salgsbesøk — hva ble anbefalt, hva ble solgt, hva skjedde.' },
                { icon: '🔍', label: 'Observerer', desc: 'Ser mønstre på tvers av bygg, selgere og produkter — ikke bare enkelttilfeller.' },
                { icon: '📈', label: 'Lærer', desc: 'Blir mer presis for hvert datapunkt. Nabolagseffekter og kampanjehistorikk vektes inn automatisk.' },
              ].map(({ icon, label, desc }) => (
                <div key={label} style={{ background: GRAY50, border: `1px solid ${GRAY200}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: SLATE, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 12, color: GRAY400, lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: GRAY400, lineHeight: 1.6 }}>
              📌 Anbefalingene vises direkte til selger i Feltsalg-appen på adressenivå. Utfall logges automatisk etter hvert besøk og
              brukes som læringssignal til neste runde. Jo mer data, jo bedre anbefalinger.
            </p>
          </div>
        </div>

        {loading && <p style={{ textAlign: 'center', color: GRAY400, padding: 40 }}>Laster NBA-data…</p>}
        {error && <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '14px 18px', borderRadius: 10, marginBottom: 24, fontSize: 13 }}>{error}</div>}

        {stats && stats.total === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: GRAY400 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Ingen utfall logget ennå</div>
            <div style={{ fontSize: 13, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              Utfall logges automatisk etter hvert besøk i Feltsalg-appen. Kom tilbake hit etter første salgsdøgn.
            </div>
          </div>
        )}

        {stats && stats.total > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Stat grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {statBoxes.map(({ label, value, color, emoji, sub }) => (
                <div key={label} style={{ background: 'white', border: `1px solid ${GRAY200}`, borderRadius: 14, padding: '20px 22px', borderLeft: `4px solid ${color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    <span style={{ fontSize: 12, color: GRAY600, fontWeight: 600 }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 11, color: GRAY400, marginTop: 6 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ background: 'white', border: `1px solid ${GRAY200}`, borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: SLATE, marginBottom: 12 }}>Fordeling av alle {stats.total} anbefalinger</div>
              <div style={{ display: 'flex', height: 14, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
                {[
                  { value: stats.exactHits, color: '#16A34A', label: `Eksakt treff (${stats.exactHits})` },
                  { value: stats.nearHits, color: '#D97706', label: `Nær treff (${stats.nearHits})` },
                  { value: stats.differentSales, color: '#7C3AED', label: `Annet salg (${stats.differentSales})` },
                  { value: stats.followup, color: TEAL, label: `Oppfølging (${stats.followup})` },
                  { value: stats.noSale, color: GRAY200, label: `Ingen salg (${stats.noSale})` },
                ].map(({ value, color }, i) => (
                  <div key={i} style={{ flex: value, background: color, minWidth: value > 0 ? 6 : 0, transition: 'flex 0.3s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
                {[
                  { label: `Eksakt treff`, color: '#16A34A' },
                  { label: `Nær treff`, color: '#D97706' },
                  { label: `Annet salg`, color: '#7C3AED' },
                  { label: `Oppfølging`, color: TEAL },
                  { label: `Ingen salg`, color: GRAY200 },
                ].map(({ label, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: color === GRAY200 ? `1px solid ${GRAY400}` : 'none' }} />
                    <span style={{ fontSize: 12, color: GRAY600 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top recommended vs top sold */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ background: 'white', border: `1px solid ${GRAY200}`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: GRAY600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Mest anbefalte produkter</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.topRecommended.map(({ product, count, hitRate }) => (
                    <div key={product} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: SLATE, fontWeight: 500, marginBottom: 3 }}>{product}</div>
                        <div style={{ height: 4, borderRadius: 99, background: GRAY100, overflow: 'hidden' }}>
                          <div style={{ width: `${hitRate}%`, height: '100%', background: hitRate >= 50 ? '#16A34A' : hitRate >= 25 ? '#D97706' : '#DC2626', borderRadius: 99 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: GRAY400 }}>{count}× anbefalt</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: hitRate >= 50 ? '#16A34A' : hitRate >= 25 ? '#D97706' : '#DC2626' }}>{hitRate}% treff</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'white', border: `1px solid ${GRAY200}`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: GRAY600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Mest solgte produkter</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.topSold.map(({ product, count }, i) => (
                    <div key={product} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: i === 0 ? '#16A34A' : i === 1 ? '#D97706' : GRAY200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i < 2 ? 'white' : GRAY600, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, color: SLATE, fontWeight: 500 }}>{product}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>{count}× solgt</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Divergent pairs */}
            {stats.divergent.length > 0 && (
              <div style={{ background: 'white', border: `1px solid ${GRAY200}`, borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: SLATE, marginBottom: 4 }}>Hvor selgerne avviker fra anbefalingen</div>
                <div style={{ fontSize: 12, color: GRAY400, marginBottom: 14 }}>Disse produktparene dukker oftest opp: anbefalt X → selgeren solgte Y. Kan signalisere at NBA-modellen mangler noe, eller at selgeren vet noe AI ikke vet ennå.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.divergent.map(({ recommended, sold, count }, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#FFF7ED', border: `1px solid #FED7AA`, borderRadius: 10 }}>
                      <span style={{ fontSize: 13, color: '#92400E', flex: 1 }}>
                        <strong>{recommended}</strong>
                        <span style={{ margin: '0 8px', color: '#D97706' }}>→</span>
                        {sold}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706', flexShrink: 0 }}>{count} ganger</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}

// ─── Insights Page ─────────────────────────────────────────────────────────────
function InsightsPage({ onBack }: { user: HubUser; onBack: () => void }) {
  const [report, setReport] = useState<InsightsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch MDU deals and SDU outcomes in parallel
      const [mduRes, sduRes] = await Promise.all([
        fetch(`${SALES_CORE_URL}/api/opportunities`),
        fetch(`${AI_CORE_URL}/nba/outcomes`),
      ]);

      const mduDeals = mduRes.ok ? await mduRes.json() : [];
      const sduOutcomes = sduRes.ok ? await sduRes.json() : [];

      // Summarise MDU deals for the payload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mduSummary = (mduDeals as any[]).map((d: any) => ({
        navn: d.accountName,
        fase: d.stage,
        enheter: d.units,
        arsverdi: d.estimatedAnnualValue,
        lukkedato: d.closeDate,
        selger: d.salesRepName,
        warRoom: d.warRoomStatus,
      }));

      const analyzeRes = await fetch(`${AI_CORE_URL}/insights/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mduDeals: mduSummary, sduOutcomes }),
      });

      if (!analyzeRes.ok) throw new Error(`Analyse feilet: ${analyzeRes.status}`);
      const data = await analyzeRes.json() as InsightsReport;
      setReport(data);
      setLastRun(new Date().toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: GRAY50, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>← Tilbake</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TelenorLogo size={24} white />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Innsikt</span>
        </div>
        {lastRun && <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginLeft: 'auto' }}>Sist kjørt: {lastRun}</span>}
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* What is this agent */}
        <div style={{ background: 'white', border: `1px solid ${GRAY200}`, borderRadius: 18, padding: 28, marginBottom: 32, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 40, flexShrink: 0 }}>🧠</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: SLATE }}>Innsikt-agent</h1>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: GRAY600, lineHeight: 1.7 }}>
              Denne agenten analyserer alle salg og interaksjoner på tvers av <strong>SDU (feltsalg/dørsalg)</strong> og <strong>MDU (borettslag og sameier)</strong> — og lærer av dem.
              Den ser etter mønstre i hva vi selger, hva vi taper, og hva kundene faktisk snakker om.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { icon: '📉', label: 'Churn-årsaker', desc: 'Hvorfor avvises vi? Hva er de vanligste innvendingene?' },
                { icon: '✅', label: 'Vinnerformelen', desc: 'Hva gjør at kunden sier ja? Mønstre på tvers av selgere og kanaler.' },
                { icon: '📦', label: 'Produkt-trender', desc: 'Hvilke produkter og behov snakker kundene om? Hva stiger eller synker?' },
              ].map(({ icon, label, desc }) => (
                <div key={label} style={{ background: GRAY50, border: `1px solid ${GRAY200}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: SLATE, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 12, color: GRAY400, lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
            <p style={{ margin: '16px 0 0', fontSize: 12, color: GRAY400 }}>
              📌 I dag bruker agenten salgsresultater og pipeline-data. Fremtidig støtte: samtalelogger, e-poster og møtereferater.
              Læringen er delt mellom SDU og MDU — slik at hele organisasjonen drar nytte av den.
            </p>
          </div>
        </div>

        {/* Run button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <button
            onClick={() => void runAnalysis()}
            disabled={loading}
            style={{
              background: loading ? GRAY200 : `linear-gradient(135deg, ${BLUE} 0%, ${TEAL} 100%)`,
              color: loading ? GRAY400 : 'white',
              border: 'none', borderRadius: 14, padding: '16px 36px',
              fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              boxShadow: loading ? 'none' : '0 8px 24px rgba(0,90,142,0.3)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(0,0,0,0.15)', borderTop: '2px solid #94A3B8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Analyserer data…
              </>
            ) : (
              <>🔍 Kjør analyse</>
            )}
          </button>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '14px 18px', borderRadius: 10, marginBottom: 24, fontSize: 13 }}>{error}</div>
        )}

        {/* Results */}
        {report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Key insights banner */}
            <div style={{ background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 100%)`, borderRadius: 16, padding: '22px 28px' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Viktigste funn</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {report.keyInsights.map((insight, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ color: '#60A5FA', fontSize: 16, marginTop: 1, flexShrink: 0 }}>→</span>
                    <span style={{ color: 'white', fontSize: 14, lineHeight: 1.5 }}>{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3-column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <InsightCard
                title="Churn-årsaker" emoji="📉" color="#DC2626"
                items={report.churnReasons}
                renderItem={(item, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: GRAY50, borderRadius: 10, borderLeft: `3px solid ${FREQ_COLOR[item.frequency ?? 'lav'] ?? GRAY200}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: SLATE }}>{item.reason}</span>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: FREQ_COLOR[item.frequency ?? 'lav'] + '20', color: FREQ_COLOR[item.frequency ?? 'lav'], fontWeight: 700 }}>
                        {item.frequency}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: GRAY600, lineHeight: 1.5 }}>{item.detail}</p>
                  </div>
                )}
              />

              <InsightCard
                title="Vinnerformelen" emoji="✅" color="#16A34A"
                items={report.winReasons}
                renderItem={(item, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: GRAY50, borderRadius: 10, borderLeft: `3px solid ${FREQ_COLOR[item.frequency ?? 'lav'] ?? GRAY200}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: SLATE }}>{item.reason}</span>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: FREQ_COLOR[item.frequency ?? 'lav'] + '20', color: FREQ_COLOR[item.frequency ?? 'lav'], fontWeight: 700 }}>
                        {item.frequency}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: GRAY600, lineHeight: 1.5 }}>{item.detail}</p>
                  </div>
                )}
              />
            </div>

            <InsightCard
              title="Produkt- og behovstrender" emoji="📦" color={BLUE}
              items={report.productTrends}
              renderItem={(item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: GRAY50, borderRadius: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: SLATE }}>{item.product}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: TREND_COLOR[item.trend ?? 'stabil'] + '20', color: TREND_COLOR[item.trend ?? 'stabil'], fontWeight: 700 }}>
                        {item.trend}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: GRAY600 }}>{item.signal}</p>
                  </div>
                </div>
              )}
            />

            {/* Recommendations */}
            <div style={{ background: 'white', border: `1px solid ${GRAY200}`, borderRadius: 16, padding: 24, borderTop: `3px solid ${TEAL}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>💡</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: SLATE }}>Anbefalte tiltak</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {report.recommendations.map((rec, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: '#F0FDF4', borderRadius: 10 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: TEAL, color: 'white', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: SLATE, lineHeight: 1.5 }}>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data note */}
            <div style={{ background: GRAY100, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16 }}>ℹ️</span>
              <p style={{ margin: 0, fontSize: 12, color: GRAY600, lineHeight: 1.6 }}><strong>Datanote:</strong> {report.dataNote}</p>
            </div>

          </div>
        )}

        {!report && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: GRAY400 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Klar til å lære</div>
            <div style={{ fontSize: 13 }}>Klikk "Kjør analyse" for å hente innsikt fra tvers av SDU og MDU.</div>
          </div>
        )}

      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
type Screen = 'login' | 'dashboard' | 'admin' | 'insights' | 'nba';

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => getSession() ? 'dashboard' : 'login');
  const [user, setUser] = useState<HubUser | null>(() => getSession());
  const [stats, setStats] = useState<SalesStats | null>(null);

  useEffect(() => {
    if (screen === 'dashboard') {
      fetchStats().then(setStats).catch(() => {});
    }
  }, [screen]);

  const handleLogin = (u: HubUser) => { setUser(u); setScreen('dashboard'); };
  const handleLogout = () => { clearSession(); setUser(null); setScreen('login'); };

  if (screen === 'login') return <LoginPage onLogin={handleLogin} />;
  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (screen === 'admin') return <AdminPanel currentUser={user} onBack={() => setScreen('dashboard')} />;
  if (screen === 'insights') return <InsightsPage user={user} onBack={() => setScreen('dashboard')} />;
  if (screen === 'nba') return <NBAPage user={user} onBack={() => setScreen('dashboard')} />;
  return <Dashboard user={user} stats={stats} onAdmin={() => setScreen('admin')} onLogout={handleLogout} onInsights={() => setScreen('insights')} onNBA={() => setScreen('nba')} />;
}
