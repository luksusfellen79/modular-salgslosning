import { useState, useEffect, useCallback } from 'react';
import {
  login, fetchUsers, createUser, updateUser, deactivateUser, fetchStats,
  HubUser, AppPermission, UserRole, SalesStats,
} from './lib/api';
import { saveSession, getSession, clearSession } from './lib/session';

// ─── Env ──────────────────────────────────────────────────────────────────────
const APP_URLS: Record<AppPermission, string> = {
  mdu_crm:       (import.meta.env.VITE_MDU_CRM_URL       as string | undefined) ?? 'http://localhost:5174',
  mdu_leder:     (import.meta.env.VITE_MDU_LEDER_URL     as string | undefined) ?? 'http://localhost:5178',
  sdu_crm:       (import.meta.env.VITE_SDU_CRM_URL       as string | undefined) ?? 'http://localhost:5175',
  sdu_planner:   (import.meta.env.VITE_SDU_PLANNER_URL   as string | undefined) ?? 'http://localhost:5176',
  sdu_incentives:(import.meta.env.VITE_SDU_INCENTIVES_URL as string | undefined) ?? 'http://localhost:5177',
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
];

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin:  'Superadmin',
  salgsleder:  'Salgsleder',
  selger_sdu:  'Selger (SDU)',
  selger_mdu:  'Selger (MDU)',
};

const PERMISSION_LABELS: Record<AppPermission, string> = {
  mdu_crm:        'MDU CRM',
  mdu_leder:      'MDU Leder',
  sdu_crm:        'Feltsalg',
  sdu_planner:    'SDU Planner',
  sdu_incentives: 'Incentiver',
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
  const token = encodeURIComponent(JSON.stringify(user));
  return `${baseUrl}?hub_session=${token}`;
}

function Dashboard({ user, stats, onAdmin, onLogout }: { user: HubUser; stats: SalesStats | null; onAdmin: () => void; onLogout: () => void }) {
  const userCards = APP_CARDS.filter(c => user.permissions.includes(c.permission));

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

// ─── App Root ─────────────────────────────────────────────────────────────────
type Screen = 'login' | 'dashboard' | 'admin';

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
  return <Dashboard user={user} stats={stats} onAdmin={() => setScreen('admin')} onLogout={handleLogout} />;
}
