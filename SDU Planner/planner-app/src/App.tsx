import { useEffect, useState, useCallback } from 'react';
import { fetchSellers, fetchRounds, createRound, updateRoundStatus, updateUnitStatus, createSeller } from './lib/salesCore';
import { fetchResidents } from './lib/kasCore';
import { BUILDINGS, Resident, Round, RoundStatus, Seller, UnitVisitStatus } from './lib/types';

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  teal:    '#00827F',
  tealDk:  '#006663',
  tealLt:  '#E6F4F3',
  slate:   '#1E293B',
  gray50:  '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray400: '#94A3B8',
  gray600: '#475569',
  green:   '#16A34A',
  greenLt: '#DCFCE7',
  amber:   '#D97706',
  amberLt: '#FEF3C7',
  red:     '#DC2626',
  redLt:   '#FEE2E2',
  blue:    '#2563EB',
  blueLt:  '#DBEAFE',
};

// ─── Status helpers ───────────────────────────────────────────────────────────

const ROUND_STATUS_LABELS: Record<RoundStatus, string> = {
  draft: 'Utkast',
  active: 'Aktiv',
  completed: 'Fullført',
};

const ROUND_STATUS_COLORS: Record<RoundStatus, { bg: string; text: string }> = {
  draft:     { bg: T.gray200,  text: T.gray600 },
  active:    { bg: T.amberLt, text: T.amber },
  completed: { bg: T.greenLt, text: T.green },
};

const VISIT_STATUS_LABELS: Record<UnitVisitStatus, string> = {
  pending:     'Ikke besøkt',
  visited:     'Besøkt',
  not_home:    'Ikke hjemme',
  sold:        'Solgt',
  no_interest: 'Ikke interesse',
};

const VISIT_STATUS_COLORS: Record<UnitVisitStatus, { bg: string; text: string }> = {
  pending:     { bg: T.gray100,  text: T.gray600 },
  visited:     { bg: T.blueLt,  text: T.blue },
  not_home:    { bg: T.amberLt, text: T.amber },
  sold:        { bg: T.greenLt, text: T.green },
  no_interest: { bg: T.redLt,   text: T.red },
};

function StatusBadge({ status }: { status: RoundStatus }) {
  const c = ROUND_STATUS_COLORS[status];
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>
      {ROUND_STATUS_LABELS[status]}
    </span>
  );
}

function VisitBadge({ status }: { status: UnitVisitStatus }) {
  const c = VISIT_STATUS_COLORS[status];
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {VISIT_STATUS_LABELS[status]}
    </span>
  );
}

// ─── Today's date as ISO string ───────────────────────────────────────────────
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── New Round Modal ──────────────────────────────────────────────────────────

interface NewRoundModalProps {
  sellers: Seller[];
  managerName: string;
  onClose: () => void;
  onCreated: (round: Round) => void;
}

function NewRoundModal({ sellers, managerName, onClose, onCreated }: NewRoundModalProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayISO());
  const [sellerId, setSellerId] = useState(sellers[0]?.id ?? '');
  const [buildingId, setBuildingId] = useState(BUILDINGS[0].id);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadResidents = useCallback(async (bid: string) => {
    setLoadingResidents(true);
    setSelectedUnits(new Set());
    try {
      const data = await fetchResidents(bid);
      setResidents(data);
    } catch {
      setResidents([]);
    } finally {
      setLoadingResidents(false);
    }
  }, []);

  useEffect(() => { void loadResidents(buildingId); }, [buildingId, loadResidents]);

  const toggleUnit = (unitId: string) => {
    setSelectedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const selectAll = () => setSelectedUnits(new Set(residents.map(r => r.unitId)));
  const clearAll  = () => setSelectedUnits(new Set());

  const handleCreate = async () => {
    if (!name.trim()) { setError('Gi runden et navn'); return; }
    if (!sellerId)    { setError('Velg en selger'); return; }
    if (selectedUnits.size === 0) { setError('Velg minst én enhet'); return; }
    const seller = sellers.find(s => s.id === sellerId);
    if (!seller) return;
    const building = BUILDINGS.find(b => b.id === buildingId)!;

    setSaving(true);
    try {
      const units = residents
        .filter(r => selectedUnits.has(r.unitId))
        .map(r => ({
          unitId:       r.unitId,
          buildingId:   r.buildingId,
          address:      `${building.address}, leil. ${r.unitNumber}`,
          residentName: r.name,
          visitStatus:  'pending' as UnitVisitStatus,
        }));
      const round = await createRound({
        name: name.trim(),
        date,
        seller: { id: seller.id, name: seller.name },
        units,
        createdBy: managerName,
      });
      onCreated(round);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feil ved oppretting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.gray200}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.slate }}>Ny besøksrunde</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: T.gray400 }}>×</button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.gray600, marginBottom: 6 }}>Rundenavn</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="f.eks. Storgata mandag"
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.gray200}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* Date + Seller */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.gray600, marginBottom: 6 }}>Dato</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.gray200}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.gray600, marginBottom: 6 }}>Selger</label>
              <select
                value={sellerId}
                onChange={e => setSellerId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.gray200}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              >
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Building picker */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.gray600, marginBottom: 6 }}>Bygg</label>
            <select
              value={buildingId}
              onChange={e => setBuildingId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.gray200}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
            >
              {BUILDINGS.map(b => (
                <option key={b.id} value={b.id}>{b.address}, {b.city}</option>
              ))}
            </select>
          </div>

          {/* Unit selector */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: T.gray600 }}>
                Enheter ({selectedUnits.size} valgt)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={selectAll} style={{ background: 'none', border: 'none', fontSize: 12, color: T.teal, cursor: 'pointer', fontWeight: 600 }}>Velg alle</button>
                <button onClick={clearAll} style={{ background: 'none', border: 'none', fontSize: 12, color: T.gray400, cursor: 'pointer' }}>Nullstill</button>
              </div>
            </div>
            <div style={{ border: `1px solid ${T.gray200}`, borderRadius: 8, maxHeight: 220, overflowY: 'auto' }}>
              {loadingResidents ? (
                <div style={{ padding: 16, textAlign: 'center', color: T.gray400, fontSize: 13 }}>Laster enheter…</div>
              ) : residents.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: T.gray400, fontSize: 13 }}>Ingen enheter funnet</div>
              ) : (
                residents.map((r, i) => (
                  <label key={r.unitId} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    cursor: 'pointer', borderTop: i > 0 ? `1px solid ${T.gray100}` : undefined,
                    background: selectedUnits.has(r.unitId) ? T.tealLt : undefined,
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedUnits.has(r.unitId)}
                      onChange={() => toggleUnit(r.unitId)}
                      style={{ accentColor: T.teal }}
                    />
                    <span style={{ flex: 1, fontSize: 13, color: T.slate }}>
                      Leil. {r.unitNumber} — {r.name}
                    </span>
                    {r.isExistingCustomer && (
                      <span style={{ fontSize: 11, background: T.blueLt, color: T.blue, padding: '2px 6px', borderRadius: 999 }}>Kunde</span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>

          {error && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.gray200}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: `1px solid ${T.gray200}`, borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14 }}>Avbryt</button>
          <button
            onClick={() => void handleCreate()}
            disabled={saving}
            style={{ padding: '10px 20px', background: saving ? T.gray400 : T.teal, color: 'white', border: 'none', borderRadius: 8, cursor: saving ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            {saving ? 'Oppretter…' : 'Opprett runde'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Round Detail View ────────────────────────────────────────────────────────

interface RoundDetailProps {
  round: Round;
  onBack: () => void;
  onUpdated: (round: Round) => void;
}

function RoundDetail({ round: initialRound, onBack, onUpdated }: RoundDetailProps) {
  const [round, setRound] = useState(initialRound);
  const [updatingUnit, setUpdatingUnit] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});

  const completedCount = round.units.filter(u => u.visitStatus !== 'pending').length;
  const soldCount = round.units.filter(u => u.visitStatus === 'sold').length;
  const progress = round.units.length > 0 ? Math.round((completedCount / round.units.length) * 100) : 0;

  const handleUnitStatus = async (unitId: string, visitStatus: UnitVisitStatus) => {
    setUpdatingUnit(unitId);
    try {
      const updated = await updateUnitStatus(round.id, unitId, visitStatus, noteInput[unitId]);
      setRound(updated);
      onUpdated(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingUnit(null);
    }
  };

  const handleRoundStatus = async (status: 'active' | 'completed') => {
    setUpdatingStatus(true);
    try {
      const updated = await updateRoundStatus(round.id, status);
      setRound(updated);
      onUpdated(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const VISIT_ACTIONS: { status: UnitVisitStatus; label: string; color: string }[] = [
    { status: 'sold',        label: 'Solgt',          color: T.green },
    { status: 'visited',     label: 'Besøkt',         color: T.blue },
    { status: 'not_home',    label: 'Ikke hjemme',    color: T.amber },
    { status: 'no_interest', label: 'Ikke interesse', color: T.red },
    { status: 'pending',     label: 'Tilbakestill',   color: T.gray400 },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: T.gray100, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14, color: T.slate }}>
          ← Tilbake
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.slate }}>{round.name}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: T.gray400 }}>
            {round.date} · {round.seller.name} · {round.units.length} enheter
          </p>
        </div>
        <StatusBadge status={round.status} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Totalt',    value: round.units.length },
          { label: 'Besøkt',   value: completedCount },
          { label: 'Solgt',    value: soldCount },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: T.gray50, border: `1px solid ${T.gray200}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.slate }}>{value}</div>
            <div style={{ fontSize: 12, color: T.gray400, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.gray400, marginBottom: 6 }}>
          <span>Fremdrift</span><span>{progress}%</span>
        </div>
        <div style={{ height: 8, background: T.gray100, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? T.green : T.teal, borderRadius: 999, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* Round status actions */}
      {round.status !== 'completed' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {round.status === 'draft' && (
            <button
              onClick={() => void handleRoundStatus('active')}
              disabled={updatingStatus}
              style={{ padding: '10px 20px', background: T.amber, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            >
              Sett aktiv
            </button>
          )}
          {round.status === 'active' && (
            <button
              onClick={() => void handleRoundStatus('completed')}
              disabled={updatingStatus}
              style={{ padding: '10px 20px', background: T.green, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            >
              Fullfør runde
            </button>
          )}
        </div>
      )}

      {/* Units list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {round.units.map(unit => (
          <div key={unit.unitId} style={{
            background: 'white', border: `1px solid ${T.gray200}`, borderRadius: 12, padding: 16,
            opacity: updatingUnit === unit.unitId ? 0.6 : 1, transition: 'opacity 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.slate }}>{unit.address}</div>
                {unit.residentName && <div style={{ fontSize: 12, color: T.gray400, marginTop: 2 }}>{unit.residentName}</div>}
                {unit.note && <div style={{ fontSize: 12, color: T.gray600, marginTop: 4, fontStyle: 'italic' }}>{unit.note}</div>}
              </div>
              <VisitBadge status={unit.visitStatus} />
            </div>

            {round.status !== 'completed' && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 6 }}>
                  <input
                    placeholder="Notat (valgfritt)"
                    value={noteInput[unit.unitId] ?? ''}
                    onChange={e => setNoteInput(prev => ({ ...prev, [unit.unitId]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', border: `1px solid ${T.gray200}`, borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {VISIT_ACTIONS.filter(a => a.status !== unit.visitStatus).map(({ status, label, color }) => (
                    <button
                      key={status}
                      onClick={() => void handleUnitStatus(unit.unitId, status)}
                      disabled={updatingUnit === unit.unitId}
                      style={{
                        padding: '5px 12px', fontSize: 12, fontWeight: 600,
                        border: `1px solid ${color}`, borderRadius: 999,
                        background: 'white', color, cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Add Seller Modal ─────────────────────────────────────────────────────────

interface AddSellerModalProps {
  onClose: () => void;
  onCreated: (seller: Seller) => void;
}

function AddSellerModal({ onClose, onCreated }: AddSellerModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'seller' | 'manager'>('seller');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) { setError('Navn og e-post er påkrevd'); return; }
    setSaving(true);
    try {
      const seller = await createSeller({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, role });
      onCreated(seller);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feil ved oppretting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.gray200}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.slate }}>Ny selger</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: T.gray400 }}>×</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Navn', value: name, set: setName, placeholder: 'Kari Nordmann' },
            { label: 'E-post', value: email, set: setEmail, placeholder: 'kari@telenor.com' },
            { label: 'Telefon', value: phone, set: setPhone, placeholder: '91234567' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.gray600, marginBottom: 6 }}>{label}</label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.gray200}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.gray600, marginBottom: 6 }}>Rolle</label>
            <select value={role} onChange={e => setRole(e.target.value as 'seller' | 'manager')}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${T.gray200}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
              <option value="seller">Selger</option>
              <option value="manager">Salgsleder</option>
            </select>
          </div>
          {error && <p style={{ margin: 0, fontSize: 13, color: T.red }}>{error}</p>}
        </div>
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.gray200}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: `1px solid ${T.gray200}`, borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 14 }}>Avbryt</button>
          <button onClick={() => void handleSave()} disabled={saving}
            style={{ padding: '10px 20px', background: saving ? T.gray400 : T.teal, color: 'white', border: 'none', borderRadius: 8, cursor: saving ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}>
            {saving ? 'Lagrer…' : 'Legg til'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rounds List ──────────────────────────────────────────────────────────────

interface RoundsPageProps {
  rounds: Round[];
  sellers: Seller[];
  managerName: string;
  loading: boolean;
  onSelectRound: (round: Round) => void;
  onRoundCreated: (round: Round) => void;
  onRoundUpdated: (round: Round) => void;
}

function RoundsPage({ rounds, sellers, managerName, loading, onSelectRound, onRoundCreated }: RoundsPageProps) {
  const [showModal, setShowModal] = useState(false);
  const [filterSeller, setFilterSeller] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const filtered = rounds.filter(r => {
    if (filterSeller && r.seller.id !== filterSeller) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterDate && r.date !== filterDate) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      {/* Filters + CTA */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterSeller} onChange={e => setFilterSeller(e.target.value)}
          style={{ padding: '9px 12px', border: `1px solid ${T.gray200}`, borderRadius: 8, fontSize: 13, color: T.slate }}>
          <option value="">Alle selgere</option>
          {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '9px 12px', border: `1px solid ${T.gray200}`, borderRadius: 8, fontSize: 13, color: T.slate }}>
          <option value="">Alle statuser</option>
          <option value="draft">Utkast</option>
          <option value="active">Aktiv</option>
          <option value="completed">Fullført</option>
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          style={{ padding: '9px 12px', border: `1px solid ${T.gray200}`, borderRadius: 8, fontSize: 13, color: T.slate }} />
        {(filterSeller || filterStatus || filterDate) && (
          <button onClick={() => { setFilterSeller(''); setFilterStatus(''); setFilterDate(''); }}
            style={{ background: 'none', border: 'none', fontSize: 13, color: T.gray400, cursor: 'pointer' }}>
            Nullstill
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowModal(true)}
          style={{ padding: '10px 18px', background: T.teal, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          + Ny runde
        </button>
      </div>

      {/* Round cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: T.gray400 }}>Laster runder…</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: T.gray400 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15 }}>Ingen runder funnet. Opprett en ny runde for å komme i gang.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map(round => {
            const done = round.units.filter(u => u.visitStatus !== 'pending').length;
            const sold = round.units.filter(u => u.visitStatus === 'sold').length;
            const pct  = round.units.length > 0 ? Math.round((done / round.units.length) * 100) : 0;
            return (
              <div key={round.id} onClick={() => onSelectRound(round)}
                style={{ background: 'white', border: `1px solid ${T.gray200}`, borderRadius: 12, padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.slate }}>{round.name}</div>
                    <div style={{ fontSize: 12, color: T.gray400, marginTop: 3 }}>
                      {round.date} · {round.seller.name} · {round.units.length} enheter
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.green }}>{sold} solgt</div>
                      <div style={{ fontSize: 11, color: T.gray400 }}>{done}/{round.units.length} besøkt</div>
                    </div>
                    <StatusBadge status={round.status} />
                  </div>
                </div>
                {round.units.length > 0 && (
                  <div style={{ marginTop: 12, height: 4, background: T.gray100, borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? T.green : T.teal, borderRadius: 999 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <NewRoundModal
          sellers={sellers}
          managerName={managerName}
          onClose={() => setShowModal(false)}
          onCreated={round => { onRoundCreated(round); setShowModal(false); }}
        />
      )}
    </div>
  );
}

// ─── Sellers Page ─────────────────────────────────────────────────────────────

interface SellersPageProps {
  sellers: Seller[];
  onSellerAdded: (seller: Seller) => void;
}

function SellersPage({ sellers, onSellerAdded }: SellersPageProps) {
  const [showModal, setShowModal] = useState(false);

  const roleSorter = (a: Seller, b: Seller) => {
    if (a.role === b.role) return a.name.localeCompare(b.name);
    return a.role === 'manager' ? -1 : 1;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => setShowModal(true)}
          style={{ padding: '10px 18px', background: T.teal, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          + Ny selger
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...sellers].sort(roleSorter).map(s => (
          <div key={s.id} style={{ background: 'white', border: `1px solid ${T.gray200}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: s.role === 'manager' ? T.teal : T.gray200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, color: s.role === 'manager' ? 'white' : T.slate, flexShrink: 0,
            }}>
              {s.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.slate }}>{s.name}</div>
              <div style={{ fontSize: 12, color: T.gray400, marginTop: 2 }}>{s.email}{s.phone ? ` · ${s.phone}` : ''}</div>
            </div>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
              background: s.role === 'manager' ? T.tealLt : T.gray100,
              color: s.role === 'manager' ? T.teal : T.gray600,
            }}>
              {s.role === 'manager' ? 'Salgsleder' : 'Selger'}
            </span>
          </div>
        ))}
      </div>
      {showModal && (
        <AddSellerModal
          onClose={() => setShowModal(false)}
          onCreated={s => { onSellerAdded(s); setShowModal(false); }}
        />
      )}
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

type Page = 'rounds' | 'sellers';

const HUB_URL = (import.meta.env.VITE_HUB_URL as string | undefined) ?? 'http://localhost:5173';

export default function App() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem('salgshub_session');
      if (!raw) { window.location.href = HUB_URL; return; }
      const user = JSON.parse(raw) as { permissions: string[] };
      if (!Array.isArray(user.permissions) || !user.permissions.includes('sdu_planner')) {
        window.location.href = HUB_URL;
      }
    } catch {
      window.location.href = HUB_URL;
    }
  }, []);

  const [page, setPage] = useState<Page>('rounds');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [error, setError] = useState('');

  // For now use first manager name as createdBy label
  const managerName = sellers.find(s => s.role === 'manager')?.name ?? 'Salgsleder';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, r] = await Promise.all([fetchSellers(), fetchRounds()]);
      setSellers(s);
      setRounds(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke laste data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRoundUpdated = (updated: Round) => {
    setRounds(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    setSelectedRound(updated);
  };

  const activeSellers = sellers.filter(s => s.role === 'seller');

  return (
    <div style={{ minHeight: '100vh', background: T.gray50, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top bar */}
      <header style={{ background: T.teal, color: 'white', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 24 }}>
        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}>SDU Planner</span>
        <nav style={{ display: 'flex', gap: 4 }}>
          {([['rounds', 'Runder'], ['sellers', 'Selgere']] as [Page, string][]).map(([p, label]) => (
            <button key={p} onClick={() => { setPage(p); setSelectedRound(null); }}
              style={{
                background: page === p ? 'rgba(255,255,255,0.2)' : 'none',
                border: 'none', color: 'white', padding: '6px 14px', borderRadius: 8,
                cursor: 'pointer', fontSize: 14, fontWeight: page === p ? 600 : 400,
              }}>
              {label}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, opacity: 0.7 }}>{managerName}</span>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px' }}>
        {error && (
          <div style={{ background: '#FEE2E2', color: T.red, padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
            {error} — <button onClick={() => void load()} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', textDecoration: 'underline', fontSize: 14 }}>Prøv igjen</button>
          </div>
        )}

        {page === 'rounds' && !selectedRound && (
          <RoundsPage
            rounds={rounds}
            sellers={activeSellers}
            managerName={managerName}
            loading={loading}
            onSelectRound={setSelectedRound}
            onRoundCreated={r => setRounds(prev => [r, ...prev])}
            onRoundUpdated={handleRoundUpdated}
          />
        )}

        {page === 'rounds' && selectedRound && (
          <RoundDetail
            round={selectedRound}
            onBack={() => setSelectedRound(null)}
            onUpdated={handleRoundUpdated}
          />
        )}

        {page === 'sellers' && (
          <SellersPage
            sellers={sellers}
            onSellerAdded={s => setSellers(prev => [...prev, s])}
          />
        )}
      </main>
    </div>
  );
}
