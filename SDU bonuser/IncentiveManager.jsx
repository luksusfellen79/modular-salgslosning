import { useState, useMemo } from "react";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  blue:       "#0095d9", blueDark: "#005fa3", blueLight: "#e6f5fc", blueMid: "#b3dff5",
  green:      "#00a651", greenLight: "#e6f7ee",
  red:        "#d0021b", redLight: "#fdecea",
  amber:      "#f59e0b", amberLight: "#fffbeb",
  purple:     "#7c3aed", purpleLight: "#f3f0ff",
  gray50:     "#f7f7f7", gray100: "#ebebeb", gray200: "#d4d4d4",
  gray400:    "#9e9e9e", gray600: "#616161", gray800: "#2d2d2d",
  white:      "#ffffff",
};

const VALUE_CHAINS = ["Fortetting FTTH", "Fortetting HFC", "Rollout", "FWA"];

let _id = 200;
const uid = () => `id_${++_id}`;
const now = () => new Date().toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const initAgencies = [
  { id: "ag1", name: "Byrå 1", sfId: "001XX000003GYn1", email: "kontakt@byra1.no" },
  { id: "ag2", name: "Byrå 2", sfId: "001XX000003GYn2", email: "post@byra2.no" },
  { id: "ag3", name: "Byrå 3", sfId: "001XX000003GYn3", email: "" },
  { id: "ag4", name: "Byrå 4", sfId: "001XX000003GYn4", email: "" },
  { id: "ag5", name: "Byrå 5", sfId: "001XX000003GYn5", email: "" },
];

const initProducts = {
  "Fortetting FTTH": [
    { id: "p1", name: "Fiber 500/500", sfId: "01tABC1" },
    { id: "p2", name: "Fiber 1G/1G",   sfId: "01tABC2" },
    { id: "p3", name: "Fiber 250/250", sfId: "01tABC3" },
  ],
  "Fortetting HFC": [
    { id: "p4", name: "Kabel 500/50",  sfId: "01tABC4" },
    { id: "p5", name: "Kabel 1G/100",  sfId: "01tABC5" },
  ],
  Rollout: [
    { id: "p6", name: "Nybygg FTTH basis",     sfId: "01tABC6" },
    { id: "p7", name: "Nybygg FTTH premium",    sfId: "01tABC7" },
    { id: "p8", name: "Bulk-avtale borettslag", sfId: "01tABC8" },
  ],
  FWA: [
    { id: "p9",  name: "FWA 100/20", sfId: "01tABC9" },
    { id: "p10", name: "FWA 300/50", sfId: "01tABCa" },
  ],
};

const buildIncentives = (agencies, products) => {
  const d = {};
  agencies.forEach(ag => {
    d[ag.id] = {};
    Object.entries(products).forEach(([chain, prods]) => {
      d[ag.id][chain] = {};
      prods.forEach(p => { d[ag.id][chain][p.id] = Math.round((800 + Math.random() * 1200) / 50) * 50; });
    });
  });
  return d;
};

const buildBonus = (agencies) => {
  const base = { 3:500, 4:750, 5:1100, 6:1500, 7:2000, 8:2600, 9:3300, 10:4200 };
  const d = {};
  agencies.forEach(ag => {
    d[ag.id] = {};
    Object.entries(base).forEach(([t,v]) => { d[ag.id][t] = v + Math.round((Math.random()*200-100)/50)*50; });
  });
  return d;
};

// Proposal statuses: draft | pending | approved | rejected | live
const initProposals = [];
const initAuditLog = [
  { id: "l1", ts: "12.06.2025, 09:14", agencyName: "Byrå 1", chain: "Fortetting FTTH", productName: "Fiber 1G/1G", oldVal: 1400, newVal: 1600, changedBy: "Ole Hansen", action: "live" },
  { id: "l2", ts: "03.06.2025, 14:02", agencyName: "Byrå 2", chain: "FWA", productName: "FWA 300/50", oldVal: 900, newVal: 1050, changedBy: "Kari Olsen", action: "live" },
  { id: "l3", ts: "28.05.2025, 11:30", agencyName: "Byrå 1", chain: "Rollout", productName: "Nybygg FTTH basis", oldVal: 1200, newVal: 1100, changedBy: "Byrå 1", action: "rejected" },
];

// ─── STYLES ───────────────────────────────────────────────────────────────────
const STATUS_META = {
  draft:    { label: "Utkast",         bg: T.gray100,    color: T.gray600,  border: T.gray200 },
  pending:  { label: "Til godkjenning",bg: T.amberLight, color: "#92400e",  border: T.amber+"60" },
  approved: { label: "Godkjent",       bg: T.greenLight, color: "#065f46",  border: T.green+"50" },
  rejected: { label: "Avvist",         bg: T.redLight,   color: T.red,      border: T.red+"40" },
  live:     { label: "Live",           bg: T.blueLight,  color: T.blueDark, border: T.blueMid },
};

const badge = (status) => {
  const m = STATUS_META[status] || STATUS_META.draft;
  return {
    display: "inline-block", padding: "3px 10px", borderRadius: 5,
    fontSize: 11, fontWeight: 700,
    background: m.bg, color: m.color, border: `1px solid ${m.border}`,
  };
};

const s = {
  root: { fontFamily: "'Trebuchet MS','Segoe UI',Arial,sans-serif", background: T.gray50, minHeight: "100vh", color: T.gray800, fontSize: 15 },
  nav: { background: T.white, borderBottom: `3px solid ${T.blue}`, padding: "0 32px", display: "flex", alignItems: "center", height: 58, gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 10 },
  navLogoBox: { width: 34, height: 34, background: T.blue, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: T.white, fontWeight: 700, fontSize: 13, letterSpacing: -0.5, flexShrink: 0 },
  navTitle:   { fontWeight: 700, fontSize: 16, color: T.gray800, letterSpacing: -0.3 },
  navDivider: { width: 1, height: 22, background: T.gray200, margin: "0 4px" },
  navSub:     { fontSize: 13, color: T.gray400 },
  navRight:   { marginLeft: "auto", display: "flex", gap: 8 },
  navTab: (a) => ({ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: a ? 700 : 400, background: a ? T.blue : "transparent", color: a ? T.white : T.gray600, transition: "all 0.15s" }),
  pendingBadge: { background: T.amber, color: T.white, borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700, marginLeft: 4 },

  mockBanner: { background: T.amberLight, borderBottom: `1px solid ${T.amber}50`, padding: "7px 32px", fontSize: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 6 },

  agencyTabsWrap: { background: T.white, borderBottom: `1px solid ${T.gray100}`, padding: "0 32px", display: "flex", gap: 0, overflowX: "auto" },
  agencyTab: (a) => ({ padding: "15px 22px", border: "none", borderBottom: a ? `3px solid ${T.blue}` : "3px solid transparent", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: a ? 700 : 400, color: a ? T.blue : T.gray600, whiteSpace: "nowrap", transition: "all 0.15s", marginBottom: -1 }),

  page: { maxWidth: 1100, margin: "0 auto", padding: "28px 32px 56px" },
  pageHeading:    { fontSize: 22, fontWeight: 700, color: T.gray800, margin: "0 0 4px", letterSpacing: -0.4 },
  pageSubheading: { fontSize: 14, color: T.gray400, margin: "0 0 24px" },

  chainPills: { display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  chainPill: (a) => ({ padding: "7px 20px", borderRadius: 24, border: `1.5px solid ${a ? T.blue : T.gray200}`, background: a ? T.blue : T.white, color: a ? T.white : T.gray600, fontSize: 13, fontWeight: a ? 700 : 400, cursor: "pointer", transition: "all 0.15s", boxShadow: a ? `0 2px 8px ${T.blue}30` : "none" }),

  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },

  card: { background: T.white, border: `1px solid ${T.gray100}`, borderRadius: 12, padding: "22px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" },
  cardHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${T.gray100}` },
  cardIconWrap: (bg) => ({ width: 36, height: 36, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }),
  cardTitle:    { fontSize: 15, fontWeight: 700, color: T.gray800 },
  cardSubtitle: { fontSize: 12, color: T.gray400, marginTop: 2 },

  row: (last) => ({ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: last ? "none" : `1px solid ${T.gray100}`, gap: 8 }),
  productName: { fontSize: 14, color: T.gray800, fontWeight: 500 },
  productMeta: { fontSize: 11, color: T.gray400, marginTop: 2, fontFamily: "monospace" },

  chip: (color, bg, border) => ({ background: bg, border: `1px solid ${border}`, color, borderRadius: 8, padding: "5px 12px", fontSize: 14, fontWeight: 700, minWidth: 80, textAlign: "right", flexShrink: 0 }),
  blueChip: { background: T.blueLight, border: `1px solid ${T.blueMid}`, color: T.blueDark, borderRadius: 8, padding: "5px 12px", fontSize: 14, fontWeight: 700, minWidth: 80, textAlign: "right", flexShrink: 0 },

  proposeBtn: { padding: "5px 12px", borderRadius: 6, border: `1px solid ${T.blue}`, background: "transparent", color: T.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" },
  pendingChip: { background: T.amberLight, border: `1px solid ${T.amber}60`, color: "#92400e", borderRadius: 8, padding: "5px 12px", fontSize: 13, fontWeight: 700, flexShrink: 0 },

  bonusTable: { width: "100%", borderCollapse: "collapse" },
  bonusTh:    { fontSize: 11, fontWeight: 700, color: T.gray400, letterSpacing: 0.6, textTransform: "uppercase", padding: "0 8px 12px", borderBottom: `1px solid ${T.gray100}`, textAlign: "left" },
  bonusTd:    { padding: "10px 8px", fontSize: 14, borderBottom: `1px solid ${T.gray100}` },
  tierBadge:  { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, background: T.blueLight, border: `1px solid ${T.blueMid}`, fontWeight: 700, fontSize: 13, color: T.blue },
  bonusAmt:   { color: T.green, fontWeight: 700, textAlign: "right" },
  bonusTag:   { display: "inline-block", padding: "3px 9px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: T.greenLight, color: T.green, border: `1px solid ${T.green}40` },

  meta: { marginTop: 20, padding: "12px 16px", background: T.white, border: `1px solid ${T.gray100}`, borderRadius: 8, fontSize: 12, color: T.gray400, display: "flex", gap: 24, flexWrap: "wrap" },

  // modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: T.white, borderRadius: 14, padding: "28px 32px", width: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", border: `1px solid ${T.gray100}` },
  modalTitle:   { fontSize: 17, fontWeight: 700, color: T.gray800, marginBottom: 4 },
  modalSubtitle:{ fontSize: 13, color: T.gray400, marginBottom: 20 },
  formGroup: { display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 },
  formLabel: { fontSize: 11, fontWeight: 700, color: T.gray600, letterSpacing: 0.4, textTransform: "uppercase" },
  formInput: { padding: "9px 11px", borderRadius: 7, border: `1px solid ${T.gray200}`, fontSize: 14, color: T.gray800, outline: "none", fontFamily: "inherit" },
  formRow: { display: "flex", gap: 8, marginTop: 4 },
  saveBtn: (color) => ({ flex: 1, padding: "10px", borderRadius: 7, background: color, color: T.white, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }),
  cancelBtn: { padding: "10px 18px", borderRadius: 7, background: "transparent", color: T.gray600, border: `1px solid ${T.gray200}`, fontSize: 14, cursor: "pointer" },

  // admin
  adminGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  adminCard: { background: T.white, border: `1px solid ${T.gray100}`, borderRadius: 12, padding: "22px 24px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" },
  adminCardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${T.gray100}` },
  adminCardTitleRow: { display: "flex", alignItems: "center", gap: 10 },
  adminCardTitle: { fontSize: 15, fontWeight: 700, color: T.gray800 },
  countBadge: { background: T.blueLight, color: T.blue, border: `1px solid ${T.blueMid}`, borderRadius: 12, padding: "2px 9px", fontSize: 12, fontWeight: 700 },
  addBtn: { padding: "7px 14px", borderRadius: 7, background: T.blue, color: T.white, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "background 0.15s" },
  listItem: (last) => ({ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: last ? "none" : `1px solid ${T.gray100}` }),
  listItemName: { fontSize: 14, fontWeight: 500, color: T.gray800 },
  listItemMeta: { fontSize: 11, color: T.gray400, marginTop: 2, fontFamily: "monospace" },
  listItemActions: { display: "flex", gap: 6, flexShrink: 0 },
  iconBtn: (color) => ({ width: 30, height: 30, borderRadius: 6, border: `1px solid ${color}30`, background: `${color}10`, color, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }),
  inlineForm: { background: T.blueLight, border: `1px solid ${T.blueMid}`, borderRadius: 9, padding: "14px 16px", marginBottom: 14 },
  inlineFormTitle: { fontSize: 13, fontWeight: 700, color: T.blueDark, marginBottom: 10 },
  inlineFormRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" },
  inlineFg: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 110 },
  inlineLabel: { fontSize: 11, fontWeight: 700, color: T.gray600, letterSpacing: 0.4, textTransform: "uppercase" },
  inlineInput: { padding: "8px 10px", borderRadius: 7, border: `1px solid ${T.blueMid}`, background: T.white, fontSize: 13, color: T.gray800, outline: "none", fontFamily: "inherit" },
  inlineSelect: { padding: "8px 10px", borderRadius: 7, border: `1px solid ${T.blueMid}`, background: T.white, fontSize: 13, color: T.gray800, outline: "none", fontFamily: "inherit", cursor: "pointer" },
  inlineSave: { padding: "8px 16px", borderRadius: 7, background: T.blue, color: T.white, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  inlineCancel: { padding: "8px 14px", borderRadius: 7, background: "transparent", color: T.gray600, border: `1px solid ${T.gray200}`, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  chainSubTabs: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  chainSubTab: (a) => ({ padding: "5px 13px", borderRadius: 16, border: `1px solid ${a ? T.blue : T.gray200}`, background: a ? T.blueLight : "transparent", color: a ? T.blue : T.gray600, fontSize: 12, fontWeight: a ? 700 : 400, cursor: "pointer", transition: "all 0.12s" }),

  emptyState: { textAlign: "center", padding: "24px 0", color: T.gray400, fontSize: 13 },

  // audit log
  logTable: { width: "100%", borderCollapse: "collapse" },
  logTh: { fontSize: 11, fontWeight: 700, color: T.gray400, letterSpacing: 0.5, textTransform: "uppercase", padding: "0 10px 10px", borderBottom: `1px solid ${T.gray100}`, textAlign: "left" },
  logTd: { padding: "10px", fontSize: 13, borderBottom: `1px solid ${T.gray100}`, color: T.gray600 },

  // pending approval panel
  pendingCard: { background: T.amberLight, border: `1px solid ${T.amber}50`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 },
  pendingCardTitle: { fontSize: 15, fontWeight: 700, color: "#92400e", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 },

  toast: { position: "fixed", bottom: 28, right: 28, background: T.green, color: T.white, borderRadius: 9, padding: "11px 20px", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 100, display: "flex", alignItems: "center", gap: 8 },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Toast({ msg }) { return msg ? <div style={s.toast}>✓ {msg}</div> : null; }

function Chip({ status }) { return <span style={badge(status)}>{STATUS_META[status]?.label || status}</span>; }

// ─── PROPOSE MODAL ────────────────────────────────────────────────────────────
function ProposeModal({ product, chain, agency, currentVal, onSave, onClose }) {
  const [newVal, setNewVal] = useState(currentVal);
  const [note, setNote]     = useState("");
  const [effDate, setEffDate] = useState("");

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalTitle}>Foreslå endring</div>
        <div style={s.modalSubtitle}>{agency.name} · {chain} · {product.name}</div>

        <div style={s.formGroup}>
          <label style={s.formLabel}>Gjeldende sats</label>
          <div style={{ ...s.formInput, background: T.gray50, color: T.gray400 }}>
            {currentVal.toLocaleString("nb-NO")} kr
          </div>
        </div>
        <div style={s.formGroup}>
          <label style={s.formLabel}>Ny sats (NOK)</label>
          <input style={s.formInput} type="number" value={newVal}
            onChange={e => setNewVal(Number(e.target.value))} />
        </div>
        <div style={s.formGroup}>
          <label style={s.formLabel}>Ikraftdato</label>
          <input style={s.formInput} type="date" value={effDate}
            onChange={e => setEffDate(e.target.value)} />
        </div>
        <div style={s.formGroup}>
          <label style={s.formLabel}>Notat (vises til byrå)</label>
          <input style={s.formInput} placeholder="Begrunnelse for endring…"
            value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div style={s.formRow}>
          <button style={s.cancelBtn} onClick={onClose}>Avbryt</button>
          <button style={s.saveBtn(T.blue)} onClick={() => onSave({ newVal, note, effDate })}>
            Send til byrå for godkjenning
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AGENCY VIEW (byrå-bruker) ────────────────────────────────────────────────
function AgencyApprovalView({ agency, proposals, onApprove, onReject }) {
  const myProposals = proposals.filter(p => p.agencyId === agency.id && p.status === "pending");
  if (!myProposals.length) return (
    <div style={{ ...s.emptyState, padding: "40px 0" }}>
      Ingen ventende forslag for godkjenning
    </div>
  );
  return (
    <div style={s.page}>
      <h1 style={s.pageHeading}>Ventende godkjenninger</h1>
      <p style={s.pageSubheading}>Følgende endringer fra Telenor venter på din godkjenning</p>
      {myProposals.map(p => (
        <div key={p.id} style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{p.productName}</div>
              <div style={{ fontSize: 13, color: T.gray400 }}>{p.chain}</div>
              {p.note && <div style={{ fontSize: 13, color: T.gray600, marginTop: 8, fontStyle: "italic" }}>"{p.note}"</div>}
              {p.effDate && <div style={{ fontSize: 12, color: T.gray400, marginTop: 4 }}>Ikraftdato: {p.effDate}</div>}
            </div>
            <Chip status="pending" />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16, padding: "14px 0 0", borderTop: `1px solid ${T.gray100}`, alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 12, color: T.gray400 }}>Nåværende sats</span>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.gray600 }}>{p.oldVal.toLocaleString("nb-NO")} kr</div>
            </div>
            <div style={{ fontSize: 20, color: T.gray300 }}>→</div>
            <div>
              <span style={{ fontSize: 12, color: T.gray400 }}>Foreslått sats</span>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.blue }}>{p.newVal.toLocaleString("nb-NO")} kr</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button style={s.saveBtn(T.red)} onClick={() => onReject(p.id)}>Avvis</button>
              <button style={s.saveBtn(T.green)} onClick={() => onApprove(p.id)}>Godkjenn</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── INCENTIVE VIEW (TN-bruker) ───────────────────────────────────────────────
function IncentiveView({ agencies, products, incentives, bonusLadder, proposals, onPropose, userRole, activeAgencyId, setActiveAgencyId }) {
  const [activeChain, setActiveChain] = useState(VALUE_CHAINS[0]);
  const [proposingFor, setProposingFor] = useState(null);

  const agency = agencies.find(a => a.id === activeAgencyId) || agencies[0];

  const getPendingProposal = (productId) =>
    proposals.find(p => p.agencyId === activeAgencyId && p.chain === activeChain && p.productId === productId && p.status === "pending");

  if (!agencies.length) return <div style={s.page}><div style={s.emptyState}>Ingen byråer. Gå til Admin.</div></div>;

  return (
    <>
      <div style={s.agencyTabsWrap}>
        {agencies.map(ag => (
          <button key={ag.id} style={s.agencyTab(activeAgencyId === ag.id)} onClick={() => setActiveAgencyId(ag.id)}>
            {ag.name}
            {proposals.filter(p => p.agencyId === ag.id && p.status === "pending").length > 0 && (
              <span style={s.pendingBadge}>
                {proposals.filter(p => p.agencyId === ag.id && p.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={s.page}>
        <h1 style={s.pageHeading}>{agency?.name}</h1>
        <p style={s.pageSubheading}>
          {agency?.email ? `Kontakt: ${agency.email} · ` : ""}
          Incentivstruktur per produkt og bonustrapp
        </p>

        <div style={s.chainPills}>
          {VALUE_CHAINS.map(chain => (
            <button key={chain} style={s.chainPill(activeChain === chain)} onClick={() => setActiveChain(chain)}>
              {chain}
            </button>
          ))}
        </div>

        <div style={s.grid2}>
          {/* Products */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardIconWrap(T.blueLight)}>📦</div>
              <div style={{ flex: 1 }}>
                <div style={s.cardTitle}>Produktincentiver</div>
                <div style={s.cardSubtitle}>{activeChain}</div>
              </div>
            </div>
            {(products[activeChain] || []).map((p, i, arr) => {
              const pending = getPendingProposal(p.id);
              const rate = incentives[activeAgencyId]?.[activeChain]?.[p.id];
              return (
                <div key={p.id} style={s.row(i === arr.length - 1)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.productName}>{p.name}</div>
                    <div style={s.productMeta}>{p.sfId}</div>
                  </div>
                  {pending ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: T.gray400, textDecoration: "line-through" }}>
                        {rate?.toLocaleString("nb-NO")} kr
                      </span>
                      <span style={s.pendingChip}>
                        → {pending.newVal.toLocaleString("nb-NO")} kr ⏳
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={s.blueChip}>{rate ? `${rate.toLocaleString("nb-NO")} kr` : "—"}</div>
                      {userRole === "telenor" && (
                        <button style={s.proposeBtn}
                          onClick={() => setProposingFor({ product: p, chain: activeChain, agency, currentVal: rate || 0 })}>
                          Endre
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!(products[activeChain] || []).length && <div style={s.emptyState}>Ingen produkter</div>}
          </div>

          {/* Bonus */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={s.cardIconWrap(T.greenLight)}>🏆</div>
              <div>
                <div style={s.cardTitle}>Bonustrapp</div>
                <div style={s.cardSubtitle}>Kumulativ · {agency?.name}</div>
              </div>
            </div>
            <table style={s.bonusTable}>
              <thead>
                <tr>
                  <th style={s.bonusTh}>Salg</th>
                  <th style={{ ...s.bonusTh, textAlign: "right" }}>Bonus på nivå</th>
                  <th style={{ ...s.bonusTh, textAlign: "right" }}>Totalt kumulativt</th>
                  {userRole === "telenor" && <th style={{ ...s.bonusTh, width: 70 }} />}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const entries = Object.entries(bonusLadder[activeAgencyId] || {});
                  let cumulative = 0;
                  return entries.map(([tier, amt]) => {
                    cumulative += amt;
                    const pendingBonus = proposals.find(p =>
                      p.agencyId === activeAgencyId && p.type === "bonus" &&
                      p.tier === tier && p.status === "pending"
                    );
                    return (
                      <tr key={tier}>
                        <td style={s.bonusTd}><span style={s.tierBadge}>{tier}</span></td>
                        <td style={{ ...s.bonusTd, textAlign: "right" }}>
                          {pendingBonus ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <span style={{ color: T.gray400, textDecoration: "line-through", fontSize: 13 }}>
                                + {amt.toLocaleString("nb-NO")} kr
                              </span>
                              <span style={s.pendingChip}>
                                + {pendingBonus.newVal.toLocaleString("nb-NO")} kr ⏳
                              </span>
                            </span>
                          ) : (
                            <span style={{ color: T.gray600, fontWeight: 500 }}>
                              + {amt.toLocaleString("nb-NO")} kr
                            </span>
                          )}
                        </td>
                        <td style={{ ...s.bonusTd, ...s.bonusAmt }}>
                          {cumulative.toLocaleString("nb-NO")} kr
                        </td>
                        {userRole === "telenor" && (
                          <td style={{ ...s.bonusTd, textAlign: "right" }}>
                            {!pendingBonus && (
                              <button style={s.proposeBtn}
                                onClick={() => onPropose({
                                  type: "bonus", tier,
                                  product: { id: `bonus_${tier}`, name: `Bonusnivå ${tier}` },
                                  chain: "Bonustrapp",
                                  agency,
                                  currentVal: amt,
                                })}>
                                Endre
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        <div style={s.meta}>
          <span><span style={{ color: T.gray400 }}>Agency SF ID: </span><span style={{ color: T.gray600, fontFamily: "monospace" }}>{agency?.sfId}</span></span>
          <span><span style={{ color: T.gray400 }}>E-post: </span><span style={{ color: T.gray600 }}>{agency?.email || "—"}</span></span>
          <span><span style={{ color: T.gray400 }}>Miljø: </span><span style={{ color: T.gray600, fontFamily: "monospace" }}>Mock / Dev</span></span>
        </div>
      </div>

      {proposingFor && (
        <ProposeModal
          {...proposingFor}
          onClose={() => setProposingFor(null)}
          onSave={(data) => { onPropose({ ...proposingFor, ...data }); setProposingFor(null); }}
        />
      )}
    </>
  );
}

// ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
function AdminView({ agencies, setAgencies, products, setProducts, proposals, auditLog, showToast }) {
  const [showAgForm, setShowAgForm] = useState(false);
  const [agForm, setAgForm]         = useState({ name: "", sfId: "", email: "" });
  const [editingAg, setEditingAg]   = useState(null);

  const [showProdForm, setShowProdForm] = useState(false);
  const [prodForm, setProdForm]         = useState({ name: "", sfId: "", chain: VALUE_CHAINS[0] });
  const [editingProd, setEditingProd]   = useState(null);
  const [activeChain, setActiveChain]   = useState(VALUE_CHAINS[0]);

  const saveAgency = () => {
    if (!agForm.name.trim()) return;
    if (editingAg) {
      setAgencies(prev => prev.map(a => a.id === editingAg ? { ...a, ...agForm } : a));
      showToast("Byrå oppdatert");
    } else {
      setAgencies(prev => [...prev, { id: uid(), ...agForm }]);
      showToast("Byrå lagt til");
    }
    setAgForm({ name: "", sfId: "", email: "" }); setShowAgForm(false); setEditingAg(null);
  };
  const startEditAg = ag => { setEditingAg(ag.id); setAgForm({ name: ag.name, sfId: ag.sfId, email: ag.email || "" }); setShowAgForm(true); };
  const deleteAg    = id => { setAgencies(prev => prev.filter(a => a.id !== id)); showToast("Byrå slettet"); };
  const cancelAg    = () => { setShowAgForm(false); setEditingAg(null); setAgForm({ name: "", sfId: "", email: "" }); };

  const saveProd = () => {
    if (!prodForm.name.trim()) return;
    const chain = prodForm.chain;
    if (editingProd) {
      setProducts(prev => ({ ...prev, [chain]: (prev[chain]||[]).map(p => p.id === editingProd ? { ...p, name: prodForm.name, sfId: prodForm.sfId } : p) }));
      showToast("Produkt oppdatert");
    } else {
      setProducts(prev => ({ ...prev, [chain]: [...(prev[chain]||[]), { id: uid(), name: prodForm.name, sfId: prodForm.sfId }] }));
      showToast("Produkt lagt til");
    }
    setProdForm({ name: "", sfId: "", chain: activeChain }); setShowProdForm(false); setEditingProd(null);
  };
  const startEditProd = (p, chain) => { setEditingProd(p.id); setProdForm({ name: p.name, sfId: p.sfId, chain }); setActiveChain(chain); setShowProdForm(true); };
  const deleteProd    = (id, chain) => { setProducts(prev => ({ ...prev, [chain]: (prev[chain]||[]).filter(p => p.id !== id) })); showToast("Produkt slettet"); };
  const cancelProd    = () => { setShowProdForm(false); setEditingProd(null); setProdForm({ name: "", sfId: "", chain: activeChain }); };

  const chainProds = products[activeChain] || [];

  // pending count per agency
  const pendingCount = (agId) => proposals.filter(p => p.agencyId === agId && p.status === "pending").length;

  return (
    <div style={s.page}>
      <h1 style={s.pageHeading}>Administrasjon</h1>
      <p style={s.pageSubheading}>Byråer, produkter og endringslogg</p>

      <div style={s.adminGrid}>
        {/* Byråer */}
        <div style={s.adminCard}>
          <div style={s.adminCardHeader}>
            <div style={s.adminCardTitleRow}>
              <div style={s.cardIconWrap(T.blueLight)}>🏢</div>
              <div style={s.adminCardTitle}>Byråer</div>
              <span style={s.countBadge}>{agencies.length}</span>
            </div>
            <button style={s.addBtn} onClick={() => { cancelAg(); setShowAgForm(true); }}>+ Legg til</button>
          </div>

          {showAgForm && (
            <div style={s.inlineForm}>
              <div style={s.inlineFormTitle}>{editingAg ? "Rediger byrå" : "Nytt byrå"}</div>
              <div style={s.inlineFormRow}>
                <div style={s.inlineFg}>
                  <label style={s.inlineLabel}>Navn</label>
                  <input style={s.inlineInput} placeholder="Byrånavn" value={agForm.name}
                    onChange={e => setAgForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div style={s.inlineFg}>
                  <label style={s.inlineLabel}>E-post</label>
                  <input style={s.inlineInput} type="email" placeholder="post@byra.no" value={agForm.email}
                    onChange={e => setAgForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div style={s.inlineFg}>
                  <label style={s.inlineLabel}>SF ID</label>
                  <input style={s.inlineInput} placeholder="001XX…" value={agForm.sfId}
                    onChange={e => setAgForm(f => ({ ...f, sfId: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && saveAgency()} />
                </div>
                <button style={s.inlineSave} onClick={saveAgency}>Lagre</button>
                <button style={s.inlineCancel} onClick={cancelAg}>Avbryt</button>
              </div>
            </div>
          )}

          {!agencies.length && <div style={s.emptyState}>Ingen byråer</div>}
          {agencies.map((ag, i) => (
            <div key={ag.id} style={s.listItem(i === agencies.length - 1)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={s.listItemName}>{ag.name}</span>
                  {pendingCount(ag.id) > 0 && (
                    <span style={{ ...badge("pending"), fontSize: 10 }}>{pendingCount(ag.id)} venter</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
                  {ag.email && <span style={{ fontSize: 11, color: T.blue }}>{ag.email}</span>}
                  {ag.sfId  && <span style={s.listItemMeta}>{ag.sfId}</span>}
                </div>
              </div>
              <div style={s.listItemActions}>
                <button style={s.iconBtn(T.blue)} onClick={() => startEditAg(ag)}>✏️</button>
                <button style={s.iconBtn(T.red)}  onClick={() => deleteAg(ag.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>

        {/* Produkter */}
        <div style={s.adminCard}>
          <div style={s.adminCardHeader}>
            <div style={s.adminCardTitleRow}>
              <div style={s.cardIconWrap(T.greenLight)}>📦</div>
              <div style={s.adminCardTitle}>Produkter</div>
              <span style={s.countBadge}>{Object.values(products).reduce((n,a) => n+a.length, 0)}</span>
            </div>
            <button style={s.addBtn} onClick={() => { cancelProd(); setShowProdForm(true); }}>+ Legg til</button>
          </div>

          <div style={s.chainSubTabs}>
            {VALUE_CHAINS.map(chain => (
              <button key={chain} style={s.chainSubTab(activeChain === chain)}
                onClick={() => { setActiveChain(chain); cancelProd(); }}>
                {chain} ({(products[chain]||[]).length})
              </button>
            ))}
          </div>

          {showProdForm && (
            <div style={s.inlineForm}>
              <div style={s.inlineFormTitle}>{editingProd ? "Rediger produkt" : "Nytt produkt"}</div>
              <div style={s.inlineFormRow}>
                <div style={s.inlineFg}>
                  <label style={s.inlineLabel}>Verdikjede</label>
                  <select style={s.inlineSelect} value={prodForm.chain}
                    onChange={e => setProdForm(f => ({ ...f, chain: e.target.value }))}>
                    {VALUE_CHAINS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ ...s.inlineFg, flex: 2 }}>
                  <label style={s.inlineLabel}>Produktnavn</label>
                  <input style={s.inlineInput} placeholder="Fiber 1G/1G" value={prodForm.name}
                    onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div style={s.inlineFg}>
                  <label style={s.inlineLabel}>SF ID</label>
                  <input style={s.inlineInput} placeholder="01tXX…" value={prodForm.sfId}
                    onChange={e => setProdForm(f => ({ ...f, sfId: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && saveProd()} />
                </div>
                <button style={s.inlineSave} onClick={saveProd}>Lagre</button>
                <button style={s.inlineCancel} onClick={cancelProd}>Avbryt</button>
              </div>
            </div>
          )}

          {!chainProds.length && <div style={s.emptyState}>Ingen produkter i {activeChain}</div>}
          {chainProds.map((p, i) => (
            <div key={p.id} style={s.listItem(i === chainProds.length - 1)}>
              <div>
                <div style={s.listItemName}>{p.name}</div>
                {p.sfId && <div style={s.listItemMeta}>{p.sfId}</div>}
              </div>
              <div style={s.listItemActions}>
                <button style={s.iconBtn(T.blue)} onClick={() => startEditProd(p, activeChain)}>✏️</button>
                <button style={s.iconBtn(T.red)}  onClick={() => deleteProd(p.id, activeChain)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit log — full width */}
      <div style={{ ...s.adminCard, marginTop: 24 }}>
        <div style={s.adminCardHeader}>
          <div style={s.adminCardTitleRow}>
            <div style={s.cardIconWrap(T.purpleLight)}>📋</div>
            <div style={s.adminCardTitle}>Endringslogg</div>
            <span style={{ ...s.countBadge, background: T.purpleLight, color: T.purple, border: `1px solid ${T.purple}30` }}>
              {auditLog.length}
            </span>
          </div>
        </div>
        {!auditLog.length && <div style={s.emptyState}>Ingen loggede endringer ennå</div>}
        {auditLog.length > 0 && (
          <table style={s.logTable}>
            <thead>
              <tr>
                <th style={s.logTh}>Tidspunkt</th>
                <th style={s.logTh}>Byrå</th>
                <th style={s.logTh}>Produkt</th>
                <th style={s.logTh}>Verdikjede</th>
                <th style={{ ...s.logTh, textAlign: "right" }}>Fra</th>
                <th style={{ ...s.logTh, textAlign: "right" }}>Til</th>
                <th style={{ ...s.logTh, textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...auditLog].reverse().map(l => (
                <tr key={l.id}>
                  <td style={{ ...s.logTd, fontFamily: "monospace", fontSize: 12 }}>{l.ts}</td>
                  <td style={s.logTd}>{l.agencyName}</td>
                  <td style={{ ...s.logTd, color: T.gray800, fontWeight: 500 }}>{l.productName}</td>
                  <td style={s.logTd}>{l.chain}</td>
                  <td style={{ ...s.logTd, textAlign: "right", color: T.gray400 }}>{l.oldVal?.toLocaleString("nb-NO")} kr</td>
                  <td style={{ ...s.logTd, textAlign: "right", fontWeight: 700, color: l.action === "live" ? T.green : T.red }}>
                    {l.newVal?.toLocaleString("nb-NO")} kr
                  </td>
                  <td style={{ ...s.logTd, textAlign: "right" }}>
                    <Chip status={l.action === "live" ? "live" : "rejected"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]               = useState("incentives");
  const [userRole, setUserRole]       = useState("telenor"); // telenor | agency
  const [activeAgencyId, setActiveAgencyId] = useState("ag1");

  const [agencies, setAgencies]       = useState(initAgencies);
  const [products, setProducts]       = useState(initProducts);
  const [incentives, setIncentives]   = useState(() => buildIncentives(initAgencies, initProducts));
  const [bonusLadder, setBonusLadder] = useState(() => buildBonus(initAgencies));
  const [proposals, setProposals]     = useState(initProposals);
  const [auditLog, setAuditLog]       = useState(initAuditLog);
  const [toast, setToast]             = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const totalPending = proposals.filter(p => p.status === "pending").length;

  const handlePropose = ({ product, chain, agency, currentVal, newVal, note, effDate, type, tier }) => {
    setProposals(prev => [...prev, {
      id: uid(), agencyId: agency.id, agencyName: agency.name,
      productId: product.id, productName: product.name,
      chain, oldVal: currentVal, newVal, note, effDate,
      type: type || "product", tier: tier || null,
      status: "pending", createdAt: now(),
    }]);
    showToast(`Forslag sendt til ${agency.name}${agency.email ? ` (${agency.email})` : ""}`);
  };

  const handleApprove = (proposalId) => {
    const p = proposals.find(x => x.id === proposalId);
    if (!p) return;
    setProposals(prev => prev.map(x => x.id === proposalId ? { ...x, status: "live" } : x));
    if (p.type === "bonus") {
      setBonusLadder(prev => ({
        ...prev,
        [p.agencyId]: { ...prev[p.agencyId], [p.tier]: p.newVal },
      }));
    } else {
      setIncentives(prev => ({
        ...prev,
        [p.agencyId]: { ...prev[p.agencyId], [p.chain]: { ...prev[p.agencyId]?.[p.chain], [p.productId]: p.newVal } }
      }));
    }
    setAuditLog(prev => [...prev, {
      id: uid(), ts: now(), agencyName: p.agencyName, chain: p.chain,
      productName: p.productName, oldVal: p.oldVal, newVal: p.newVal,
      changedBy: p.agencyName, action: "live",
    }]);
    showToast("Endring godkjent og live");
  };

  const handleReject = (proposalId) => {
    const p = proposals.find(x => x.id === proposalId);
    if (!p) return;
    setProposals(prev => prev.map(x => x.id === proposalId ? { ...x, status: "rejected" } : x));
    setAuditLog(prev => [...prev, {
      id: uid(), ts: now(), agencyName: p.agencyName, chain: p.chain,
      productName: p.productName, oldVal: p.oldVal, newVal: p.newVal,
      changedBy: p.agencyName, action: "rejected",
    }]);
    showToast("Forslag avvist");
  };

  return (
    <div style={s.root}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      <nav style={s.nav}>
        <div style={s.navLogoBox}>TN</div>
        <span style={s.navTitle}>Incentive Manager</span>
        <div style={s.navDivider} />
        <span style={s.navSub}>Feltsalg</span>

        {/* Role switcher (dev only — remove in prod, use SF SSO role) */}
        <div style={{ marginLeft: 16, display: "flex", gap: 4, background: T.gray100, borderRadius: 7, padding: 3 }}>
          <button style={{ ...s.navTab(userRole === "telenor"), borderRadius: 5 }} onClick={() => setUserRole("telenor")}>Telenor</button>
          <button style={{ ...s.navTab(userRole === "agency"), borderRadius: 5 }} onClick={() => setUserRole("agency")}>Byrå</button>
        </div>

        <div style={s.navRight}>
          {userRole === "telenor" && (
            <>
              <button style={s.navTab(page === "incentives")} onClick={() => setPage("incentives")}>Incentiver</button>
              <button style={s.navTab(page === "approvals")} onClick={() => setPage("approvals")}>
                Godkjenninger
                {totalPending > 0 && <span style={s.pendingBadge}>{totalPending}</span>}
              </button>
              <button style={s.navTab(page === "admin")} onClick={() => setPage("admin")}>⚙ Admin</button>
            </>
          )}
          {userRole === "agency" && (
            <button style={s.navTab(true)}>
              Godkjenninger
              {proposals.filter(p => p.agencyId === activeAgencyId && p.status === "pending").length > 0 && (
                <span style={s.pendingBadge}>{proposals.filter(p => p.agencyId === activeAgencyId && p.status === "pending").length}</span>
              )}
            </button>
          )}
        </div>
      </nav>

      <div style={s.mockBanner}>
        ⚠ Mock-data · Rollebytte øverst er kun for demo — erstattes av SF SSO-roller i produksjon
      </div>

      {userRole === "agency" && (
        <>
          <div style={s.agencyTabsWrap}>
            {agencies.map(ag => (
              <button key={ag.id} style={s.agencyTab(activeAgencyId === ag.id)} onClick={() => setActiveAgencyId(ag.id)}>{ag.name}</button>
            ))}
          </div>
          <AgencyApprovalView
            agency={agencies.find(a => a.id === activeAgencyId) || agencies[0]}
            proposals={proposals}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </>
      )}

      {userRole === "telenor" && page === "incentives" && (
        <IncentiveView
          agencies={agencies} products={products} incentives={incentives}
          bonusLadder={bonusLadder} proposals={proposals}
          onPropose={handlePropose} userRole={userRole}
          activeAgencyId={activeAgencyId} setActiveAgencyId={setActiveAgencyId}
        />
      )}

      {userRole === "telenor" && page === "approvals" && (
        <div style={s.page}>
          <h1 style={s.pageHeading}>Ventende godkjenninger</h1>
          <p style={s.pageSubheading}>Oversikt over forslag sendt til byråene</p>
          {proposals.filter(p => p.status === "pending").length === 0 && (
            <div style={s.emptyState}>Ingen ventende forslag</div>
          )}
          {proposals.filter(p => p.status === "pending").map(p => (
            <div key={p.id} style={{ ...s.card, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.agencyName} · {p.productName}</div>
                  <div style={{ fontSize: 12, color: T.gray400, marginTop: 2 }}>{p.chain} · Sendt {p.createdAt}</div>
                  {p.note && <div style={{ fontSize: 12, color: T.gray600, marginTop: 4, fontStyle: "italic" }}>"{p.note}"</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, color: T.gray400 }}>{p.oldVal?.toLocaleString("nb-NO")} → </span>
                  <span style={{ fontWeight: 700, color: T.blue }}>{p.newVal?.toLocaleString("nb-NO")} kr</span>
                  <Chip status="pending" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {userRole === "telenor" && page === "admin" && (
        <AdminView
          agencies={agencies} setAgencies={setAgencies}
          products={products}  setProducts={setProducts}
          proposals={proposals} auditLog={auditLog}
          showToast={showToast}
        />
      )}

      <Toast msg={toast} />
    </div>
  );
}
