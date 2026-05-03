import { useState, useEffect } from 'react';
import {
  fetchSDUProducts,
  addProductIncentive,
  removeProductIncentive,
  SDUProduct,
  Incentive,
  IncentiveType,
  ProductCategory,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from './lib/kasCore';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  blue:        '#0095d9', blueDark: '#005fa3', blueLight: '#e6f5fc', blueMid: '#b3dff5',
  green:       '#00a651', greenLight: '#e6f7ee',
  red:         '#d0021b', redLight: '#fdecea',
  amber:       '#f59e0b', amberLight: '#fffbeb',
  purple:      '#7c3aed', purpleLight: '#f3f0ff',
  gray50:      '#f7f7f7', gray100: '#ebebeb', gray200: '#d4d4d4',
  gray400:     '#9e9e9e', gray600: '#616161', gray800: '#2d2d2d',
  white:       '#ffffff',
};

// ─── AGENCIES (in-memory — will connect to agency registry later) ─────────────
const INIT_AGENCIES = [
  { id: 'ag1', name: 'Byrå 1', sfId: '001XX000003GYn1', email: 'kontakt@byra1.no' },
  { id: 'ag2', name: 'Byrå 2', sfId: '001XX000003GYn2', email: 'post@byra2.no' },
  { id: 'ag3', name: 'Byrå 3', sfId: '001XX000003GYn3', email: '' },
  { id: 'ag4', name: 'Byrå 4', sfId: '001XX000003GYn4', email: '' },
  { id: 'ag5', name: 'Byrå 5', sfId: '001XX000003GYn5', email: '' },
];

const BONUS_BASE: Record<string, number> = {
  '3': 500, '4': 750, '5': 1100, '6': 1500,
  '7': 2000, '8': 2600, '9': 3300, '10': 4200,
};

let _uid = 300;
const uid = () => `id_${++_uid}`;
const nowStr = () => new Date().toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' });

interface Agency { id: string; name: string; sfId: string; email: string; }

interface ProductProposal {
  type: 'product';
  id: string;
  agencyId: string;
  agencyName: string;
  productId: string;
  productName: string;
  category: string;
  incentive: Omit<Incentive, 'id'>;
  status: 'pending' | 'approved' | 'rejected' | 'live';
  createdAt: string;
  note?: string;
}

interface BonusProposal {
  type: 'bonus';
  id: string;
  agencyId: string;
  agencyName: string;
  tier: string;
  oldVal: number;
  newVal: number;
  status: 'pending' | 'approved' | 'rejected' | 'live';
  createdAt: string;
  note?: string;
}

type Proposal = ProductProposal | BonusProposal;

interface AuditEntry {
  id: string;
  ts: string;
  agencyName: string;
  productName: string;
  category: string;
  incentiveName: string;
  action: 'live' | 'rejected' | 'removed';
  changedBy: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:  { label: 'Til godkjenning', bg: T.amberLight, color: '#92400e', border: `${T.amber}60` },
  approved: { label: 'Godkjent',        bg: T.greenLight, color: '#065f46', border: `${T.green}50` },
  rejected: { label: 'Avvist',          bg: T.redLight,   color: T.red,     border: `${T.red}40` },
  live:     { label: 'Live',            bg: T.blueLight,  color: T.blueDark, border: T.blueMid },
};

function badge(status: keyof typeof STATUS_META) {
  const m = STATUS_META[status];
  return {
    display: 'inline-block', padding: '3px 10px', borderRadius: 5,
    fontSize: 11, fontWeight: 700,
    background: m.bg, color: m.color, border: `1px solid ${m.border}`,
  } as React.CSSProperties;
}

function formatIncentive(inc: Incentive | Omit<Incentive, 'id'>): string {
  switch (inc.type) {
    case 'discount_percent': return `${inc.value}% rabatt`;
    case 'discount_months':  return `${inc.value} mnd rabatt`;
    case 'bonus_per_sale':   return `${inc.value.toLocaleString('nb-NO')} kr/salg`;
    case 'free_period':      return `${inc.value} mnd gratis`;
    default: return `${inc.value}`;
  }
}

function isActive(inc: Incentive): boolean {
  const now = new Date().toISOString();
  return inc.validFrom <= now && inc.validUntil >= now;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = {
  root: { fontFamily: "'Trebuchet MS','Segoe UI',Arial,sans-serif", background: T.gray50, minHeight: '100vh', color: T.gray800, fontSize: 15 } as React.CSSProperties,
  nav:  { background: T.white, borderBottom: `3px solid ${T.blue}`, padding: '0 32px', display: 'flex', alignItems: 'center', height: 58, gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 10 } as React.CSSProperties,
  navLogoBox: { width: 34, height: 34, background: T.blue, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.white, fontWeight: 700, fontSize: 13, letterSpacing: -0.5 } as React.CSSProperties,
  navTitle:   { fontWeight: 700, fontSize: 16, color: T.gray800, letterSpacing: -0.3 } as React.CSSProperties,
  navDivider: { width: 1, height: 22, background: T.gray200, margin: '0 4px' } as React.CSSProperties,
  navSub:     { fontSize: 13, color: T.gray400 } as React.CSSProperties,
  navRight:   { marginLeft: 'auto', display: 'flex', gap: 8 } as React.CSSProperties,
  navTab: (a: boolean) => ({ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: a ? 700 : 400, background: a ? T.blue : 'transparent', color: a ? T.white : T.gray600, transition: 'all 0.15s' }) as React.CSSProperties,
  pendingBadge: { background: T.amber, color: T.white, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700, marginLeft: 4 } as React.CSSProperties,
  kasCoreBanner: (ok: boolean) => ({ background: ok ? T.greenLight : T.amberLight, borderBottom: `1px solid ${ok ? T.green : T.amber}50`, padding: '7px 32px', fontSize: 12, color: ok ? '#065f46' : '#92400e', display: 'flex', alignItems: 'center', gap: 6 }) as React.CSSProperties,
  agencyTabsWrap: { background: T.white, borderBottom: `1px solid ${T.gray100}`, padding: '0 32px', display: 'flex', gap: 0, overflowX: 'auto' } as React.CSSProperties,
  agencyTab: (a: boolean) => ({ padding: '15px 22px', border: 'none', borderBottom: a ? `3px solid ${T.blue}` : '3px solid transparent', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: a ? 700 : 400, color: a ? T.blue : T.gray600, whiteSpace: 'nowrap', transition: 'all 0.15s', marginBottom: -1 }) as React.CSSProperties,
  page: { maxWidth: 1100, margin: '0 auto', padding: '28px 32px 56px' } as React.CSSProperties,
  pageHeading:    { fontSize: 22, fontWeight: 700, color: T.gray800, margin: '0 0 4px', letterSpacing: -0.4 } as React.CSSProperties,
  pageSubheading: { fontSize: 14, color: T.gray400, margin: '0 0 24px' } as React.CSSProperties,
  catPills: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' } as React.CSSProperties,
  catPill: (a: boolean) => ({ padding: '7px 20px', borderRadius: 24, border: `1.5px solid ${a ? T.blue : T.gray200}`, background: a ? T.blue : T.white, color: a ? T.white : T.gray600, fontSize: 13, fontWeight: a ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', boxShadow: a ? `0 2px 8px ${T.blue}30` : 'none' }) as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 } as React.CSSProperties,
  card: { background: T.white, border: `1px solid ${T.gray100}`, borderRadius: 12, padding: '22px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' } as React.CSSProperties,
  cardHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${T.gray100}` } as React.CSSProperties,
  cardIconWrap: (bg: string) => ({ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }) as React.CSSProperties,
  cardTitle:    { fontSize: 15, fontWeight: 700, color: T.gray800 } as React.CSSProperties,
  cardSubtitle: { fontSize: 12, color: T.gray400, marginTop: 2 } as React.CSSProperties,
  row: (last: boolean) => ({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '13px 0', borderBottom: last ? 'none' : `1px solid ${T.gray100}`, gap: 8 }) as React.CSSProperties,
  productName: { fontSize: 14, color: T.gray800, fontWeight: 600 } as React.CSSProperties,
  productMeta: { fontSize: 11, color: T.gray400, marginTop: 2, fontFamily: 'monospace' } as React.CSSProperties,
  blueChip: { background: T.blueLight, border: `1px solid ${T.blueMid}`, color: T.blueDark, borderRadius: 8, padding: '4px 11px', fontSize: 13, fontWeight: 700, flexShrink: 0 } as React.CSSProperties,
  proposeBtn: { padding: '5px 12px', borderRadius: 6, border: `1px solid ${T.blue}`, background: 'transparent', color: T.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' } as React.CSSProperties,
  removeBtn:  { padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.red}30`, background: `${T.red}10`, color: T.red, fontSize: 11, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
  incTag: (active: boolean) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: active ? T.greenLight : T.gray50, color: active ? '#065f46' : T.gray400, border: `1px solid ${active ? T.green : T.gray200}40` }) as React.CSSProperties,
  bonusTable: { width: '100%', borderCollapse: 'collapse' } as React.CSSProperties,
  bonusTh: { fontSize: 11, fontWeight: 700, color: T.gray400, letterSpacing: 0.6, textTransform: 'uppercase', padding: '0 8px 12px', borderBottom: `1px solid ${T.gray100}`, textAlign: 'left' } as React.CSSProperties,
  bonusTd: { padding: '10px 8px', fontSize: 14, borderBottom: `1px solid ${T.gray100}` } as React.CSSProperties,
  tierBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, background: T.blueLight, border: `1px solid ${T.blueMid}`, fontWeight: 700, fontSize: 13, color: T.blue } as React.CSSProperties,
  bonusAmt: { color: T.green, fontWeight: 700, textAlign: 'right' } as React.CSSProperties,
  meta: { marginTop: 20, padding: '12px 16px', background: T.white, border: `1px solid ${T.gray100}`, borderRadius: 8, fontSize: 12, color: T.gray400, display: 'flex', gap: 24, flexWrap: 'wrap' } as React.CSSProperties,
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
  modal: { background: T.white, borderRadius: 14, padding: '28px 32px', width: 480, maxWidth: '95vw', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: `1px solid ${T.gray100}` } as React.CSSProperties,
  modalTitle:    { fontSize: 17, fontWeight: 700, color: T.gray800, marginBottom: 4 } as React.CSSProperties,
  modalSubtitle: { fontSize: 13, color: T.gray400, marginBottom: 20 } as React.CSSProperties,
  formGroup: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 } as React.CSSProperties,
  formLabel: { fontSize: 11, fontWeight: 700, color: T.gray600, letterSpacing: 0.4, textTransform: 'uppercase' } as React.CSSProperties,
  formInput:  { padding: '9px 11px', borderRadius: 7, border: `1px solid ${T.gray200}`, fontSize: 14, color: T.gray800, outline: 'none', fontFamily: 'inherit' } as React.CSSProperties,
  formSelect: { padding: '9px 11px', borderRadius: 7, border: `1px solid ${T.gray200}`, fontSize: 14, color: T.gray800, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' } as React.CSSProperties,
  formRow: { display: 'flex', gap: 8, marginTop: 4 } as React.CSSProperties,
  saveBtn: (color: string) => ({ flex: 1, padding: '10px', borderRadius: 7, background: color, color: T.white, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }) as React.CSSProperties,
  cancelBtn: { padding: '10px 18px', borderRadius: 7, background: 'transparent', color: T.gray600, border: `1px solid ${T.gray200}`, fontSize: 14, cursor: 'pointer' } as React.CSSProperties,
  emptyState: { textAlign: 'center', padding: '24px 0', color: T.gray400, fontSize: 13 } as React.CSSProperties,
  adminGrid:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 } as React.CSSProperties,
  adminCard:       { background: T.white, border: `1px solid ${T.gray100}`, borderRadius: 12, padding: '22px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' } as React.CSSProperties,
  adminCardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${T.gray100}` } as React.CSSProperties,
  adminCardTitleRow: { display: 'flex', alignItems: 'center', gap: 10 } as React.CSSProperties,
  adminCardTitle:  { fontSize: 15, fontWeight: 700, color: T.gray800 } as React.CSSProperties,
  countBadge: { background: T.blueLight, color: T.blue, border: `1px solid ${T.blueMid}`, borderRadius: 12, padding: '2px 9px', fontSize: 12, fontWeight: 700 } as React.CSSProperties,
  addBtn: { padding: '7px 14px', borderRadius: 7, background: T.blue, color: T.white, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
  listItem: (last: boolean) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: last ? 'none' : `1px solid ${T.gray100}` }) as React.CSSProperties,
  listItemName: { fontSize: 14, fontWeight: 500, color: T.gray800 } as React.CSSProperties,
  listItemMeta: { fontSize: 11, color: T.gray400, marginTop: 2, fontFamily: 'monospace' } as React.CSSProperties,
  iconBtn: (color: string) => ({ width: 30, height: 30, borderRadius: 6, border: `1px solid ${color}30`, background: `${color}10`, color, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }) as React.CSSProperties,
  inlineForm: { background: T.blueLight, border: `1px solid ${T.blueMid}`, borderRadius: 9, padding: '14px 16px', marginBottom: 14 } as React.CSSProperties,
  inlineFormTitle: { fontSize: 13, fontWeight: 700, color: T.blueDark, marginBottom: 10 } as React.CSSProperties,
  inlineFormRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' } as React.CSSProperties,
  inlineFg: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 110 } as React.CSSProperties,
  inlineLabel: { fontSize: 11, fontWeight: 700, color: T.gray600, letterSpacing: 0.4, textTransform: 'uppercase' } as React.CSSProperties,
  inlineInput:  { padding: '8px 10px', borderRadius: 7, border: `1px solid ${T.blueMid}`, background: T.white, fontSize: 13, color: T.gray800, outline: 'none', fontFamily: 'inherit' } as React.CSSProperties,
  inlineSave:   { padding: '8px 16px', borderRadius: 7, background: T.blue, color: T.white, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' } as React.CSSProperties,
  inlineCancel: { padding: '8px 14px', borderRadius: 7, background: 'transparent', color: T.gray600, border: `1px solid ${T.gray200}`, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' } as React.CSSProperties,
  logTable: { width: '100%', borderCollapse: 'collapse' } as React.CSSProperties,
  logTh: { fontSize: 11, fontWeight: 700, color: T.gray400, letterSpacing: 0.5, textTransform: 'uppercase', padding: '0 10px 10px', borderBottom: `1px solid ${T.gray100}`, textAlign: 'left' } as React.CSSProperties,
  logTd: { padding: '10px', fontSize: 13, borderBottom: `1px solid ${T.gray100}`, color: T.gray600 } as React.CSSProperties,
  toast: { position: 'fixed', bottom: 28, right: 28, background: T.green, color: T.white, borderRadius: 9, padding: '11px 20px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 100, display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
  spinner: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: T.gray400, fontSize: 14 } as React.CSSProperties,
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  return msg ? <div style={s.toast}>✓ {msg}</div> : null;
}

function Chip({ status }: { status: keyof typeof STATUS_META }) {
  return <span style={badge(status)}>{STATUS_META[status]?.label || status}</span>;
}

// ─── PROPOSE MODAL ────────────────────────────────────────────────────────────
interface ProposeTarget {
  product: SDUProduct;
  agency: Agency;
}

function ProposeModal({ target, onSave, onClose }: {
  target: ProposeTarget;
  onSave: (inc: Omit<Incentive, 'id'>, note: string) => void;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<IncentiveType>('bonus_per_sale');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [value, setValue] = useState(200);
  const [validFrom, setValidFrom] = useState(today);
  const [validUntil, setValidUntil] = useState('');
  const [visibleToSeller, setVisibleToSeller] = useState(true);
  const [note, setNote] = useState('');

  const currencyForType: Record<IncentiveType, string> = {
    bonus_per_sale:   'NOK',
    discount_months:  'months',
    discount_percent: 'percent',
    free_period:      'months',
  };

  const valuePlaceholder: Record<IncentiveType, string> = {
    bonus_per_sale:   '200 (kr per salg)',
    discount_months:  '3 (antall måneder)',
    discount_percent: '20 (prosent rabatt)',
    free_period:      '2 (antall gratis måneder)',
  };

  const handleSave = () => {
    if (!name.trim() || !validUntil) return;
    onSave({
      name, description: desc,
      type, value,
      currency: currencyForType[type] as Incentive['currency'],
      validFrom, validUntil,
      visibleToSeller,
    }, note);
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalTitle}>Foreslå insentiv</div>
        <div style={s.modalSubtitle}>{target.agency.name} · {target.product.name}</div>

        <div style={s.formGroup}>
          <label style={s.formLabel}>Type</label>
          <select style={s.formSelect} value={type} onChange={e => setType(e.target.value as IncentiveType)}>
            <option value="bonus_per_sale">Selgerbonus per salg (NOK)</option>
            <option value="discount_months">Rabatt måneder til kunde</option>
            <option value="discount_percent">Prosentrabatt til kunde</option>
            <option value="free_period">Gratis periode til kunde</option>
          </select>
        </div>
        <div style={s.formGroup}>
          <label style={s.formLabel}>Navn</label>
          <input style={s.formInput} placeholder="f.eks. «Q3 selgerbonus»" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={s.formGroup}>
          <label style={s.formLabel}>Beskrivelse (vises i CRM)</label>
          <input style={s.formInput} placeholder="Kort beskrivelse" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div style={s.formGroup}>
          <label style={s.formLabel}>Verdi</label>
          <input style={s.formInput} type="number" placeholder={valuePlaceholder[type]} value={value} onChange={e => setValue(Number(e.target.value))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={s.formGroup}>
            <label style={s.formLabel}>Gyldig fra</label>
            <input style={s.formInput} type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
          </div>
          <div style={s.formGroup}>
            <label style={s.formLabel}>Gyldig til</label>
            <input style={s.formInput} type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </div>
        </div>
        <div style={{ ...s.formGroup, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="vis-selger" checked={visibleToSeller} onChange={e => setVisibleToSeller(e.target.checked)} />
          <label htmlFor="vis-selger" style={{ fontSize: 13, color: T.gray800, cursor: 'pointer' }}>Synlig for selger i SDU CRM</label>
        </div>
        <div style={s.formGroup}>
          <label style={s.formLabel}>Notat til byrå</label>
          <input style={s.formInput} placeholder="Begrunnelse (valgfri)" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div style={s.formRow}>
          <button style={s.cancelBtn} onClick={onClose}>Avbryt</button>
          <button style={s.saveBtn(T.blue)} onClick={handleSave} disabled={!name.trim() || !validUntil}>
            Send til byrå for godkjenning
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PROPOSE BONUS MODAL ─────────────────────────────────────────────────────
interface ProposeBonusTarget {
  agency: Agency;
  tier: string;
  currentVal: number;
}

function ProposeBonusModal({ target, onSave, onClose }: {
  target: ProposeBonusTarget;
  onSave: (newVal: number, note: string) => void;
  onClose: () => void;
}) {
  const [newVal, setNewVal] = useState(target.currentVal);
  const [note, setNote]     = useState('');

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, width: 400 }} onClick={e => e.stopPropagation()}>
        <div style={s.modalTitle}>Endre bonusnivå</div>
        <div style={s.modalSubtitle}>{target.agency.name} · Trinn {target.tier} salg</div>

        <div style={s.formGroup}>
          <label style={s.formLabel}>Gjeldende bonus på nivå</label>
          <div style={{ ...s.formInput, background: T.gray50, color: T.gray400 }}>
            + {target.currentVal.toLocaleString('nb-NO')} kr
          </div>
        </div>
        <div style={s.formGroup}>
          <label style={s.formLabel}>Ny bonus på nivå (NOK)</label>
          <input style={s.formInput} type="number" step="50" value={newVal}
            onChange={e => setNewVal(Number(e.target.value))} />
          <span style={{ fontSize: 11, color: T.gray400, marginTop: 2 }}>
            Differanse: {(newVal - target.currentVal >= 0 ? '+' : '')}{(newVal - target.currentVal).toLocaleString('nb-NO')} kr
          </span>
        </div>
        <div style={s.formGroup}>
          <label style={s.formLabel}>Notat til byrå</label>
          <input style={s.formInput} placeholder="Begrunnelse (valgfri)"
            value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div style={s.formRow}>
          <button style={s.cancelBtn} onClick={onClose}>Avbryt</button>
          <button style={s.saveBtn(T.blue)} onClick={() => onSave(newVal, note)}
            disabled={newVal === target.currentVal}>
            Send til byrå for godkjenning
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AGENCY APPROVAL VIEW ─────────────────────────────────────────────────────
function AgencyApprovalView({ agency, proposals, onApprove, onReject }: {
  agency: Agency;
  proposals: Proposal[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const mine = proposals.filter(p => p.agencyId === agency.id && p.status === 'pending');
  if (!mine.length) return (
    <div style={{ ...s.emptyState, padding: '40px 0' }}>
      Ingen ventende forslag for godkjenning
    </div>
  );
  return (
    <div style={s.page}>
      <h1 style={s.pageHeading}>Ventende godkjenninger</h1>
      <p style={s.pageSubheading}>Forslag fra Telenor som venter på din godkjenning</p>
      {mine.map(p => (
        <div key={p.id} style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {p.type === 'bonus' ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Bonustrapp — trinn {p.tier} salg</div>
                  <div style={{ fontSize: 13, color: T.gray400 }}>Volum-bonus endring</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{p.productName}</div>
                  <div style={{ fontSize: 13, color: T.gray400 }}>{p.category} · {p.incentive.name}</div>
                </>
              )}
              {p.note && <div style={{ fontSize: 13, color: T.gray600, marginTop: 6, fontStyle: 'italic' }}>"{p.note}"</div>}
            </div>
            <Chip status="pending" />
          </div>

          {p.type === 'bonus' ? (
            <div style={{ display: 'flex', gap: 24, marginTop: 14, padding: '14px', background: T.gray50, borderRadius: 8, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: T.gray400 }}>Nåværende bonus</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.gray600 }}>+ {p.oldVal.toLocaleString('nb-NO')} kr</div>
              </div>
              <div style={{ fontSize: 20, color: T.gray200 }}>→</div>
              <div>
                <div style={{ fontSize: 12, color: T.gray400 }}>Foreslått bonus</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: T.blue }}>+ {p.newVal.toLocaleString('nb-NO')} kr</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 13, color: p.newVal > p.oldVal ? T.green : T.red, fontWeight: 700 }}>
                {p.newVal > p.oldVal ? '+' : ''}{(p.newVal - p.oldVal).toLocaleString('nb-NO')} kr
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 14, padding: '12px 14px', background: T.gray50, borderRadius: 8, fontSize: 13 }}>
              <div><span style={{ color: T.gray400 }}>Type: </span>{p.incentive.type}</div>
              <div style={{ marginTop: 4 }}><span style={{ color: T.gray400 }}>Verdi: </span><strong>{formatIncentive(p.incentive)}</strong></div>
              <div style={{ marginTop: 4, color: T.gray400, fontSize: 12 }}>
                {p.incentive.validFrom} → {p.incentive.validUntil}
                {p.incentive.visibleToSeller && <span style={{ marginLeft: 8, color: T.blue }}>· Synlig i CRM</span>}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.gray100}` }}>
            <button style={{ ...s.saveBtn(T.red), flex: 'none', padding: '9px 20px' }} onClick={() => onReject(p.id)}>Avvis</button>
            <button style={{ ...s.saveBtn(T.green), flex: 'none', padding: '9px 20px' }} onClick={() => onApprove(p.id)}>Godkjenn og sett live</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── INCENTIVE VIEW (Telenor) ─────────────────────────────────────────────────
function IncentiveView({ agencies, products, loading, proposals, bonusLadder, onPropose, onProposeBonus, activeAgencyId, setActiveAgencyId, onRemoveIncentive }: {
  agencies: Agency[];
  products: SDUProduct[];
  loading: boolean;
  proposals: Proposal[];
  bonusLadder: Record<string, Record<string, number>>;
  onPropose: (target: ProposeTarget) => void;
  onProposeBonus: (target: ProposeBonusTarget) => void;
  activeAgencyId: string;
  setActiveAgencyId: (id: string) => void;
  onRemoveIncentive: (product: SDUProduct, inc: Incentive) => void;
}) {
  const categories = Array.from(new Set(products.map(p => p.category))) as ProductCategory[];
  const [activeCategory, setActiveCategory] = useState<ProductCategory | null>(null);

  const effectiveCategory = activeCategory ?? categories[0] ?? null;
  const filtered = products.filter(p => p.category === effectiveCategory);
  const agency = agencies.find(a => a.id === activeAgencyId) ?? agencies[0];

  const getPendingForProduct = (productId: string) =>
    proposals.filter(p => p.type === 'product' && p.agencyId === activeAgencyId && p.productId === productId && p.status === 'pending') as ProductProposal[];

  if (!agencies.length) return <div style={s.page}><div style={s.emptyState}>Ingen byråer. Gå til Admin.</div></div>;

  return (
    <>
      <div style={s.agencyTabsWrap}>
        {agencies.map(ag => (
          <button key={ag.id} style={s.agencyTab(activeAgencyId === ag.id)} onClick={() => setActiveAgencyId(ag.id)}>
            {ag.name}
            {proposals.filter(p => p.agencyId === ag.id && p.status === 'pending').length > 0 && (
              <span style={s.pendingBadge}>
                {proposals.filter(p => p.agencyId === ag.id && p.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={s.page}>
        <h1 style={s.pageHeading}>{agency?.name}</h1>
        <p style={s.pageSubheading}>
          {agency?.email ? `Kontakt: ${agency.email} · ` : ''}
          Insentivstruktur per SDU-produkt og bonustrapp
        </p>

        <div style={s.catPills}>
          {categories.map(cat => (
            <button key={cat} style={s.catPill(effectiveCategory === cat)} onClick={() => setActiveCategory(cat)}>
              {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={s.spinner}>Laster produkter fra KAS Core…</div>
        ) : (
          <div style={s.grid2}>
            {/* Products + incentives */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardIconWrap(T.blueLight)}>{effectiveCategory ? CATEGORY_ICONS[effectiveCategory] : '📦'}</div>
                <div style={{ flex: 1 }}>
                  <div style={s.cardTitle}>Produktinsentiver</div>
                  <div style={s.cardSubtitle}>{effectiveCategory ? CATEGORY_LABELS[effectiveCategory] : ''} · {agency?.name}</div>
                </div>
              </div>
              {filtered.map((prod, i) => {
                const pending = getPendingForProduct(prod.productId);
                return (
                  <div key={prod.productId} style={s.row(i === filtered.length - 1)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.productName}>{prod.name}</div>
                      <div style={s.productMeta}>{prod.productId} · {prod.monthlyPrice > 0 ? `${prod.monthlyPrice} kr/md` : 'Inkludert'} · {prod.commissionRate}% provisjon</div>
                      {/* Live incentives */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {prod.incentives.map(inc => (
                          <span key={inc.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={s.incTag(isActive(inc))}>{formatIncentive(inc)}</span>
                            <button style={s.removeBtn} title="Fjern insentiv" onClick={() => onRemoveIncentive(prod, inc)}>×</button>
                          </span>
                        ))}
                        {prod.incentives.length === 0 && (
                          <span style={{ fontSize: 11, color: T.gray400 }}>Ingen aktive insentiver</span>
                        )}
                      </div>
                      {/* Pending proposals */}
                      {pending.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {pending.map((p: ProductProposal) => (
                            <span key={p.id} style={{ background: T.amberLight, border: `1px solid ${T.amber}60`, color: '#92400e', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                              ⏳ {formatIncentive(p.incentive)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button style={s.proposeBtn} onClick={() => onPropose({ product: prod, agency: agency! })}>
                      + Insentiv
                    </button>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={s.emptyState}>Ingen produkter i denne kategorien</div>}
            </div>

            {/* Bonus ladder */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardIconWrap(T.greenLight)}>🏆</div>
                <div>
                  <div style={s.cardTitle}>Bonustrapp</div>
                  <div style={s.cardSubtitle}>Kumulativ volum-bonus · {agency?.name}</div>
                </div>
              </div>
              <table style={s.bonusTable}>
                <thead>
                  <tr>
                    <th style={s.bonusTh}>Salg</th>
                    <th style={{ ...s.bonusTh, textAlign: 'right' }}>Bonus på nivå</th>
                    <th style={{ ...s.bonusTh, textAlign: 'right' }}>Kumulativt</th>
                    <th style={{ ...s.bonusTh, width: 70 }} />
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const entries = Object.entries(bonusLadder[activeAgencyId] ?? {});
                    let cumulative = 0;
                    return entries.map(([tier, amt]) => {
                      cumulative += amt;
                      const pendingBonus = proposals.find(
                        p => p.type === 'bonus' && p.agencyId === activeAgencyId && p.tier === tier && p.status === 'pending'
                      ) as BonusProposal | undefined;
                      return (
                        <tr key={tier}>
                          <td style={s.bonusTd}><span style={s.tierBadge}>{tier}</span></td>
                          <td style={{ ...s.bonusTd, textAlign: 'right' }}>
                            {pendingBonus ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: T.gray400, textDecoration: 'line-through', fontSize: 13 }}>
                                  + {amt.toLocaleString('nb-NO')} kr
                                </span>
                                <span style={{ background: T.amberLight, border: `1px solid ${T.amber}60`, color: '#92400e', borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 700 }}>
                                  + {pendingBonus.newVal.toLocaleString('nb-NO')} kr ⏳
                                </span>
                              </span>
                            ) : (
                              <span style={{ color: T.gray600, fontWeight: 500 }}>
                                + {amt.toLocaleString('nb-NO')} kr
                              </span>
                            )}
                          </td>
                          <td style={{ ...s.bonusTd, ...s.bonusAmt }}>
                            {cumulative.toLocaleString('nb-NO')} kr
                          </td>
                          <td style={{ ...s.bonusTd, textAlign: 'right' }}>
                            {!pendingBonus && (
                              <button style={s.proposeBtn} onClick={() => onProposeBonus({ agency: agency!, tier, currentVal: amt })}>
                                Endre
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={s.meta}>
          <span><span style={{ color: T.gray400 }}>SF ID: </span><span style={{ color: T.gray600, fontFamily: 'monospace' }}>{agency?.sfId}</span></span>
          <span><span style={{ color: T.gray400 }}>E-post: </span><span style={{ color: T.gray600 }}>{agency?.email || '—'}</span></span>
          <span><span style={{ color: T.gray400 }}>Produktkatalog: </span><span style={{ color: T.gray600 }}>KAS Core</span></span>
        </div>
      </div>
    </>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
function AdminView({ agencies, setAgencies, auditLog }: {
  agencies: Agency[];
  setAgencies: (fn: (prev: Agency[]) => Agency[]) => void;
  auditLog: AuditEntry[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: '', sfId: '', email: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      setAgencies(prev => prev.map(a => a.id === editingId ? { ...a, ...form } : a));
    } else {
      setAgencies(prev => [...prev, { id: uid(), ...form }]);
    }
    setForm({ name: '', sfId: '', email: '' }); setShowForm(false); setEditingId(null);
  };
  const startEdit = (ag: Agency) => { setEditingId(ag.id); setForm({ name: ag.name, sfId: ag.sfId, email: ag.email }); setShowForm(true); };
  const del = (id: string) => setAgencies(prev => prev.filter(a => a.id !== id));
  const cancel = () => { setShowForm(false); setEditingId(null); setForm({ name: '', sfId: '', email: '' }); };

  return (
    <div style={s.page}>
      <h1 style={s.pageHeading}>Administrasjon</h1>
      <p style={s.pageSubheading}>Byråer og endringslogg</p>

      <div style={s.adminGrid}>
        <div style={s.adminCard}>
          <div style={s.adminCardHeader}>
            <div style={s.adminCardTitleRow}>
              <div style={s.cardIconWrap(T.blueLight)}>🏢</div>
              <div style={s.adminCardTitle}>Byråer</div>
              <span style={s.countBadge}>{agencies.length}</span>
            </div>
            <button style={s.addBtn} onClick={() => { cancel(); setShowForm(true); }}>+ Legg til</button>
          </div>

          {showForm && (
            <div style={s.inlineForm}>
              <div style={s.inlineFormTitle}>{editingId ? 'Rediger byrå' : 'Nytt byrå'}</div>
              <div style={s.inlineFormRow}>
                <div style={s.inlineFg}>
                  <label style={s.inlineLabel}>Navn</label>
                  <input style={s.inlineInput} placeholder="Byrånavn" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div style={s.inlineFg}>
                  <label style={s.inlineLabel}>E-post</label>
                  <input style={s.inlineInput} type="email" placeholder="post@byra.no" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div style={s.inlineFg}>
                  <label style={s.inlineLabel}>SF ID</label>
                  <input style={s.inlineInput} placeholder="001XX…" value={form.sfId} onChange={e => setForm(f => ({ ...f, sfId: e.target.value }))} onKeyDown={e => e.key === 'Enter' && save()} />
                </div>
                <button style={s.inlineSave} onClick={save}>Lagre</button>
                <button style={s.inlineCancel} onClick={cancel}>Avbryt</button>
              </div>
            </div>
          )}

          {!agencies.length && <div style={s.emptyState}>Ingen byråer</div>}
          {agencies.map((ag, i) => (
            <div key={ag.id} style={s.listItem(i === agencies.length - 1)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.listItemName}>{ag.name}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                  {ag.email && <span style={{ fontSize: 11, color: T.blue }}>{ag.email}</span>}
                  {ag.sfId  && <span style={s.listItemMeta}>{ag.sfId}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={s.iconBtn(T.blue)} onClick={() => startEdit(ag)}>✏️</button>
                <button style={s.iconBtn(T.red)}  onClick={() => del(ag.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>

        {/* Audit log */}
        <div style={{ ...s.adminCard, gridColumn: auditLog.length > 0 ? undefined : undefined }}>
          <div style={s.adminCardHeader}>
            <div style={s.adminCardTitleRow}>
              <div style={s.cardIconWrap(T.purpleLight)}>📋</div>
              <div style={s.adminCardTitle}>Endringslogg</div>
              <span style={{ ...s.countBadge, background: T.purpleLight, color: T.purple, border: `1px solid ${T.purple}30` }}>
                {auditLog.length}
              </span>
            </div>
          </div>
          {!auditLog.length && <div style={s.emptyState}>Ingen loggede endringer</div>}
          {auditLog.length > 0 && (
            <table style={s.logTable}>
              <thead>
                <tr>
                  <th style={s.logTh}>Tidspunkt</th>
                  <th style={s.logTh}>Byrå</th>
                  <th style={s.logTh}>Produkt</th>
                  <th style={s.logTh}>Insentiv</th>
                  <th style={{ ...s.logTh, textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...auditLog].reverse().map(l => (
                  <tr key={l.id}>
                    <td style={{ ...s.logTd, fontFamily: 'monospace', fontSize: 12 }}>{l.ts}</td>
                    <td style={s.logTd}>{l.agencyName}</td>
                    <td style={{ ...s.logTd, fontWeight: 500, color: T.gray800 }}>{l.productName}</td>
                    <td style={s.logTd}>{l.incentiveName}</td>
                    <td style={{ ...s.logTd, textAlign: 'right' }}>
                      <Chip status={l.action === 'live' ? 'live' : 'rejected'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AGENCIES VIEW ────────────────────────────────────────────────────────────
function AgenciesView({ agencies, setAgencies, proposals, bonusLadder, products }: {
  agencies: Agency[];
  setAgencies: (fn: (prev: Agency[]) => Agency[]) => void;
  proposals: Proposal[];
  bonusLadder: Record<string, Record<string, number>>;
  products: SDUProduct[];
}) {
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name: '', sfId: '', email: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      setAgencies(prev => prev.map(a => a.id === editingId ? { ...a, ...form } : a));
    } else {
      setAgencies(prev => [...prev, { id: uid(), ...form }]);
    }
    setForm({ name: '', sfId: '', email: '' }); setShowForm(false); setEditingId(null);
  };
  const startEdit = (ag: Agency) => {
    setEditingId(ag.id); setForm({ name: ag.name, sfId: ag.sfId, email: ag.email }); setShowForm(true);
  };
  const del = (id: string) => setAgencies(prev => prev.filter(a => a.id !== id));
  const cancel = () => { setShowForm(false); setEditingId(null); setForm({ name: '', sfId: '', email: '' }); };

  const pendingCount = (agId: string) =>
    proposals.filter(p => p.agencyId === agId && p.status === 'pending').length;

  const activeIncentiveCount = (agId: string) => {
    // Count products with at least one active incentive proposed or live for this agency
    const now = new Date().toISOString();
    const liveProductIds = new Set(
      (proposals.filter(p => p.type === 'product' && p.agencyId === agId && p.status === 'live') as ProductProposal[])
        .map(p => p.productId)
    );
    return products.filter(prod =>
      liveProductIds.has(prod.productId) || prod.incentives.some(i => i.validFrom <= now && i.validUntil >= now)
    ).length;
  };

  const topBonusTier = (agId: string) => {
    const ladder = bonusLadder[agId] ?? {};
    const entries = Object.entries(ladder);
    if (!entries.length) return null;
    let cum = 0;
    entries.forEach(([, v]) => { cum += v; });
    return cum;
  };

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ ...s.pageHeading, margin: 0 }}>Byråer</h1>
        <button style={s.addBtn} onClick={() => { cancel(); setShowForm(true); }}>+ Legg til byrå</button>
      </div>
      <p style={s.pageSubheading}>Oversikt over alle tilknyttede salgsbyråer og deres incentivstatus</p>

      {showForm && (
        <div style={{ ...s.inlineForm, marginBottom: 24 }}>
          <div style={s.inlineFormTitle}>{editingId ? 'Rediger byrå' : 'Nytt byrå'}</div>
          <div style={s.inlineFormRow}>
            <div style={s.inlineFg}>
              <label style={s.inlineLabel}>Navn</label>
              <input style={s.inlineInput} placeholder="Byrånavn" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={s.inlineFg}>
              <label style={s.inlineLabel}>E-post</label>
              <input style={s.inlineInput} type="email" placeholder="post@byra.no" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div style={s.inlineFg}>
              <label style={s.inlineLabel}>Salesforce ID</label>
              <input style={s.inlineInput} placeholder="001XX…" value={form.sfId}
                onChange={e => setForm(f => ({ ...f, sfId: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && save()} />
            </div>
            <button style={s.inlineSave} onClick={save}>Lagre</button>
            <button style={s.inlineCancel} onClick={cancel}>Avbryt</button>
          </div>
        </div>
      )}

      {!agencies.length && (
        <div style={{ ...s.emptyState, padding: '60px 0' }}>Ingen byråer. Legg til ditt første byrå.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {agencies.map(ag => {
          const pending = pendingCount(ag.id);
          const activeInc = activeIncentiveCount(ag.id);
          const maxBonus = topBonusTier(ag.id);
          const ladder = bonusLadder[ag.id] ?? {};
          const topTier = Object.keys(ladder).sort((a, b) => Number(b) - Number(a))[0];

          return (
            <div key={ag.id} style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: T.blueLight, border: `1.5px solid ${T.blueMid}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    🏢
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.gray800 }}>{ag.name}</div>
                    {ag.email && <div style={{ fontSize: 12, color: T.blue, marginTop: 2 }}>{ag.email}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={s.iconBtn(T.blue)} onClick={() => startEdit(ag)} title="Rediger">✏️</button>
                  <button style={s.iconBtn(T.red)}  onClick={() => del(ag.id)} title="Slett">🗑</button>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: pending > 0 ? T.amberLight : T.gray50, borderRadius: 8, border: `1px solid ${pending > 0 ? T.amber + '50' : T.gray100}` }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: pending > 0 ? '#92400e' : T.gray400 }}>{pending}</div>
                  <div style={{ fontSize: 10, color: pending > 0 ? '#92400e' : T.gray400, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Venter</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: T.greenLight, borderRadius: 8, border: `1px solid ${T.green}20` }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.green }}>{activeInc}</div>
                  <div style={{ fontSize: 10, color: T.green, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Insentiver</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: T.blueLight, borderRadius: 8, border: `1px solid ${T.blueMid}` }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: T.blue }}>{topTier ?? '—'}</div>
                  <div style={{ fontSize: 10, color: T.blue, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Topp trinn</div>
                </div>
              </div>

              {/* Bonus summary */}
              {maxBonus !== null && (
                <div style={{ padding: '10px 12px', background: T.gray50, borderRadius: 8, marginBottom: 12, border: `1px solid ${T.gray100}` }}>
                  <div style={{ fontSize: 11, color: T.gray400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Max kumulativ bonus</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.green }}>{maxBonus.toLocaleString('nb-NO')} kr</div>
                </div>
              )}

              {/* SF ID */}
              {ag.sfId && (
                <div style={{ fontSize: 11, color: T.gray400, fontFamily: 'monospace', marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${T.gray100}` }}>
                  SF: {ag.sfId}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

// Bootstrap session from Hub link token
try {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('hub_session');
  if (token) {
    localStorage.setItem('salgshub_session', decodeURIComponent(token));
    window.history.replaceState({}, '', window.location.pathname);
  }
} catch { /* ignore */ }

export default function App() {

  const [page, setPage]               = useState<'incentives' | 'approvals' | 'agencies' | 'admin'>('incentives');
  const [userRole, setUserRole]       = useState<'telenor' | 'agency'>('telenor');
  const [activeAgencyId, setActiveAgencyId] = useState('ag1');

  const [agencies, setAgencies]       = useState<Agency[]>(INIT_AGENCIES);
  const [products, setProducts]       = useState<SDUProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [kasOk, setKasOk]            = useState(false);

  const [bonusLadder, setBonusLadder] = useState<Record<string, Record<string, number>>>(() => {
    const d: Record<string, Record<string, number>> = {};
    INIT_AGENCIES.forEach(ag => {
      d[ag.id] = {};
      Object.entries(BONUS_BASE).forEach(([t, v]) => {
        d[ag.id][t] = v + Math.round((Math.random() * 200 - 100) / 50) * 50;
      });
    });
    return d;
  });

  const [proposals, setProposals]   = useState<Proposal[]>([]);
  const [auditLog, setAuditLog]     = useState<AuditEntry[]>([]);
  const [toast, setToast]           = useState('');
  const [proposingFor, setProposingFor]         = useState<ProposeTarget | null>(null);
  const [proposingBonus, setProposingBonus]     = useState<ProposeBonusTarget | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  // Fetch products from KAS Core
  useEffect(() => {
    fetchSDUProducts()
      .then(prods => { setProducts(prods); setKasOk(true); })
      .catch(() => setKasOk(false))
      .finally(() => setLoadingProducts(false));
  }, []);

  const totalPending = proposals.filter(p => p.status === 'pending').length;

  const handlePropose = (target: ProposeTarget, inc: Omit<Incentive, 'id'>, note: string) => {
    setProposals(prev => [...prev, {
      type: 'product' as const,
      id: uid(),
      agencyId: target.agency.id,
      agencyName: target.agency.name,
      productId: target.product.productId,
      productName: target.product.name,
      category: target.product.category,
      incentive: inc,
      status: 'pending',
      createdAt: nowStr(),
      note,
    }]);
    showToast(`Forslag sendt til ${target.agency.name}`);
    setProposingFor(null);
  };

  const handleProposeBonus = (target: ProposeBonusTarget, newVal: number, note: string) => {
    setProposals(prev => [...prev, {
      type: 'bonus',
      id: uid(),
      agencyId: target.agency.id,
      agencyName: target.agency.name,
      tier: target.tier,
      oldVal: target.currentVal,
      newVal,
      status: 'pending',
      createdAt: nowStr(),
      note,
    }]);
    showToast(`Bonusforslag sendt til ${target.agency.name}`);
    setProposingBonus(null);
  };

  const handleApprove = async (proposalId: string) => {
    const p = proposals.find(x => x.id === proposalId);
    if (!p) return;
    setProposals(prev => prev.map(x => x.id === proposalId ? { ...x, status: 'live' } : x));

    if (p.type === 'bonus') {
      setBonusLadder(prev => ({
        ...prev,
        [p.agencyId]: { ...prev[p.agencyId], [p.tier]: p.newVal },
      }));
      setAuditLog(prev => [...prev, {
        id: uid(), ts: nowStr(), agencyName: p.agencyName,
        productName: `Bonustrapp trinn ${p.tier}`, category: 'bonus',
        incentiveName: `${p.oldVal.toLocaleString('nb-NO')} → ${p.newVal.toLocaleString('nb-NO')} kr`,
        action: 'live', changedBy: p.agencyName,
      }]);
      showToast(`Bonusnivå ${p.tier} oppdatert`);
      return;
    }

    setAuditLog(prev => [...prev, {
      id: uid(), ts: nowStr(), agencyName: p.agencyName,
      productName: p.productName, category: p.category,
      incentiveName: p.incentive.name, action: 'live', changedBy: p.agencyName,
    }]);
    try {
      const updated = await addProductIncentive(p.productId, p.incentive);
      setProducts(prev => prev.map(prod => prod.productId === updated.productId ? updated : prod));
      showToast('Insentiv godkjent og live i KAS Core');
    } catch {
      showToast('Godkjent (KAS Core offline — lokal oppdatering)');
      setProducts(prev => prev.map(prod =>
        prod.productId === p.productId
          ? { ...prod, incentives: [...prod.incentives, { ...p.incentive, id: uid() }] }
          : prod
      ));
    }
  };

  const handleReject = (proposalId: string) => {
    const p = proposals.find(x => x.id === proposalId);
    if (!p) return;
    setProposals(prev => prev.map(x => x.id === proposalId ? { ...x, status: 'rejected' } : x));
    if (p.type === 'bonus') {
      setAuditLog(prev => [...prev, {
        id: uid(), ts: nowStr(), agencyName: p.agencyName,
        productName: `Bonustrapp trinn ${p.tier}`, category: 'bonus',
        incentiveName: `${p.oldVal.toLocaleString('nb-NO')} → ${p.newVal.toLocaleString('nb-NO')} kr`,
        action: 'rejected', changedBy: p.agencyName,
      }]);
    } else {
      setAuditLog(prev => [...prev, {
        id: uid(), ts: nowStr(), agencyName: p.agencyName,
        productName: p.productName, category: p.category,
        incentiveName: p.incentive.name, action: 'rejected', changedBy: p.agencyName,
      }]);
    }
    showToast('Forslag avvist');
  };

  const handleRemoveIncentive = async (product: SDUProduct, inc: Incentive) => {
    try {
      const updated = await removeProductIncentive(product.productId, inc.id);
      setProducts(prev => prev.map(p => p.productId === updated.productId ? updated : p));
      setAuditLog(prev => [...prev, {
        id: uid(), ts: nowStr(), agencyName: '—',
        productName: product.name, category: product.category,
        incentiveName: inc.name, action: 'removed', changedBy: 'Telenor',
      }]);
      showToast(`Insentiv fjernet`);
    } catch {
      // Optimistic local remove
      setProducts(prev => prev.map(p =>
        p.productId === product.productId
          ? { ...p, incentives: p.incentives.filter(i => i.id !== inc.id) }
          : p
      ));
      showToast(`Insentiv fjernet (lokalt)`);
    }
  };

  const activeAgency = agencies.find(a => a.id === activeAgencyId) ?? agencies[0];

  return (
    <div style={s.root}>
      <nav style={s.nav}>
        <div style={s.navLogoBox}>TN</div>
        <span style={s.navTitle}>Incentive Manager</span>
        <div style={s.navDivider} />
        <span style={s.navSub}>SDU Feltsalg</span>

        {/* Role switcher — replace with SSO roles in production */}
        <div style={{ marginLeft: 16, display: 'flex', gap: 4, background: T.gray100, borderRadius: 7, padding: 3 }}>
          <button style={{ ...s.navTab(userRole === 'telenor'), borderRadius: 5 }} onClick={() => setUserRole('telenor')}>Telenor</button>
          <button style={{ ...s.navTab(userRole === 'agency'), borderRadius: 5 }} onClick={() => setUserRole('agency')}>Byrå</button>
        </div>

        <div style={s.navRight}>
          {userRole === 'telenor' && (
            <>
              <button style={s.navTab(page === 'incentives')} onClick={() => setPage('incentives')}>Insentiver</button>
              <button style={s.navTab(page === 'approvals')} onClick={() => setPage('approvals')}>
                Godkjenninger
                {totalPending > 0 && <span style={s.pendingBadge}>{totalPending}</span>}
              </button>
              <button style={s.navTab(page === 'agencies')} onClick={() => setPage('agencies')}>Byråer</button>
              <button style={s.navTab(page === 'admin')} onClick={() => setPage('admin')}>⚙ Admin</button>
            </>
          )}
          {userRole === 'agency' && (
            <button style={s.navTab(true)}>
              Godkjenninger
              {proposals.filter(p => p.agencyId === activeAgencyId && p.status === 'pending').length > 0 && (
                <span style={s.pendingBadge}>{proposals.filter(p => p.agencyId === activeAgencyId && p.status === 'pending').length}</span>
              )}
            </button>
          )}
        </div>
      </nav>

      {/* KAS Core connection banner */}
      <div style={s.kasCoreBanner(!loadingProducts)}>
        {loadingProducts
          ? '⏳ Kobler til KAS Core…'
          : kasOk
            ? `✓ Produktkatalog hentet fra KAS Core — ${products.length} SDU-produkter`
            : '⚠ KAS Core utilgjengelig — viser tomme produkter. Sjekk at KAS Core kjører.'
        }
      </div>

      {/* Agency role view */}
      {userRole === 'agency' && (
        <>
          <div style={s.agencyTabsWrap}>
            {agencies.map(ag => (
              <button key={ag.id} style={s.agencyTab(activeAgencyId === ag.id)} onClick={() => setActiveAgencyId(ag.id)}>
                {ag.name}
              </button>
            ))}
          </div>
          <AgencyApprovalView
            agency={activeAgency!}
            proposals={proposals}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </>
      )}

      {/* Telenor role views */}
      {userRole === 'telenor' && page === 'incentives' && (
        <IncentiveView
          agencies={agencies}
          products={products}
          loading={loadingProducts}
          proposals={proposals}
          bonusLadder={bonusLadder}
          onPropose={setProposingFor}
          onProposeBonus={setProposingBonus}
          activeAgencyId={activeAgencyId}
          setActiveAgencyId={setActiveAgencyId}
          onRemoveIncentive={handleRemoveIncentive}
        />
      )}

      {userRole === 'telenor' && page === 'approvals' && (
        <div style={s.page}>
          <h1 style={s.pageHeading}>Ventende godkjenninger</h1>
          <p style={s.pageSubheading}>Oversikt over forslag sendt til byråene</p>
          {proposals.filter(p => p.status === 'pending').length === 0 && (
            <div style={s.emptyState}>Ingen ventende forslag</div>
          )}
          {proposals.filter(p => p.status === 'pending').map(p => (
            <div key={p.id} style={{ ...s.card, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {p.type === 'bonus' ? (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.agencyName} · Bonustrapp trinn {p.tier}</div>
                      <div style={{ fontSize: 12, color: T.gray400, marginTop: 2 }}>Volum-bonus · Sendt {p.createdAt}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.agencyName} · {p.productName}</div>
                      <div style={{ fontSize: 12, color: T.gray400, marginTop: 2 }}>{p.category} · {p.incentive.name} · Sendt {p.createdAt}</div>
                    </>
                  )}
                  {p.note && <div style={{ fontSize: 12, color: T.gray600, marginTop: 4, fontStyle: 'italic' }}>"{p.note}"</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 700, color: T.blue }}>
                    {p.type === 'bonus'
                      ? `+${p.newVal.toLocaleString('nb-NO')} kr`
                      : formatIncentive(p.incentive)
                    }
                  </span>
                  <Chip status="pending" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {userRole === 'telenor' && page === 'agencies' && (
        <AgenciesView
          agencies={agencies}
          setAgencies={setAgencies}
          proposals={proposals}
          bonusLadder={bonusLadder}
          products={products}
        />
      )}

      {userRole === 'telenor' && page === 'admin' && (
        <AdminView agencies={agencies} setAgencies={setAgencies} auditLog={auditLog} />
      )}

      {/* Propose product incentive modal */}
      {proposingFor && (
        <ProposeModal
          target={proposingFor}
          onClose={() => setProposingFor(null)}
          onSave={(inc, note) => handlePropose(proposingFor, inc, note)}
        />
      )}

      {/* Propose bonus change modal */}
      {proposingBonus && (
        <ProposeBonusModal
          target={proposingBonus}
          onClose={() => setProposingBonus(null)}
          onSave={(newVal, note) => handleProposeBonus(proposingBonus, newVal, note)}
        />
      )}

      <Toast msg={toast} />
    </div>
  );
}
