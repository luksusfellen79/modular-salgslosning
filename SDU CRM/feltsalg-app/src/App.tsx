import { useState, useCallback } from 'react';
import { BUILDINGS, Building, Resident, Campaign, VisitStatus, VisitOutcome } from './lib/types';
import { fetchResidents } from './lib/kasCore';
import { logVisitOutcome } from './lib/salesCore';

// ── Telenor logo ──────────────────────────────────────────────────────────────
function TelenorLogo({ size = 24, white = false }: { size?: number; white?: boolean }) {
  return (
    <svg width={size} height={size * (128.73 / 139.82)} viewBox="0 0 139.82 128.73">
      <path
        fill={white ? '#fff' : '#01ACFB'}
        d="M70.67,39.37c2,.31,2.4-.1,2.67-2a45.17,45.17,0,0,1,3.89-12.75C79.85,19.24,84,13.33,89.85,9.36a62.78,62.78,0,0,1,19.2-8.26,46.83,46.83,0,0,1,14-.93c8.42.76,13.08,3.16,15.42,6.27A6.75,6.75,0,0,1,139.81,10c.07,1.55-.6,3.56-2.83,5.54s-6.77,4.33-13.06,6.44c-6.52,2.17-15.44,4.47-24.33,6.51a137.22,137.22,0,0,0-15.22,4.37c-5.88,2-7.65,7.85-4,9.64A54.92,54.92,0,0,1,91.82,50,101.32,101.32,0,0,1,107.08,65c5.53,6.76,14.59,19.66,17.84,32.18,3.61,13.75,1.36,26.78-6.42,30.42-7.63,3.58-17.79-1.58-24.93-9-6.78-7-11.52-15.29-16-28-3.86-11-5.42-26.87-5.42-35.19,0-2.77,0-3.36.07-5.86.26-2.18-5.62-4-11.94.08-7.19,4.63-14.23,13-18.39,17.88-1.81,2.13-4.27,5.25-6.86,8.52-3.43,4.3-7.21,8.78-10.66,11.28C19.2,91,10.87,92.6,5,88.44c-3.25-2.32-5-6.7-5-11.16a16.91,16.91,0,0,1,2.3-8.77c2-3.43,5.17-7.12,10.28-11.34A90.51,90.51,0,0,1,34.73,44.54c12.88-5.19,26.75-6.82,35.94-5.17Z"
      />
    </svg>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<VisitOutcome, { label: string; color: string; bg: string; ring: string }> = {
  sold:      { label: 'Solgt',              color: '#00A650', bg: '#E6F6ED', ring: 'ring-green-400' },
  no_answer: { label: 'Ikke hjemme',        color: '#F5A623', bg: '#FFF8E6', ring: 'ring-amber-400' },
  rejected:  { label: 'Ikke interessert',   color: '#E5202E', bg: '#FDECEA', ring: 'ring-red-400'   },
  followup:  { label: 'Oppfølging avtalt',  color: '#0085C3', bg: '#E6F7FF', ring: 'ring-blue-400'  },
  marketing: { label: 'Sendt marketing',    color: '#7B2D8B', bg: '#F5EAF7', ring: 'ring-purple-400'},
};

// ── ScoreRing ─────────────────────────────────────────────────────────────────
function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 18, cx = 22, cy = 22, sw = 3, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#00A650' : score >= 60 ? '#F5A623' : '#9DA5B1';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={44} height={44}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5E7EB" strokeWidth={sw} />
        <circle
          cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
        />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight="700" fill={color}>{score}</text>
      </svg>
      <span className="text-[10px] font-medium text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Building Picker ───────────────────────────────────────────────────────────
function BuildingPicker({ onSelect }: { onSelect: (b: Building) => void }) {
  return (
    <div className="min-h-screen bg-[#005A8E] flex flex-col items-center justify-center px-5 font-sans">
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <TelenorLogo size={36} white />
          <span className="text-2xl font-bold text-white tracking-tight">Telenor</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Feltsalg</h1>
        <p className="text-sm text-white/50">Velg bygg for dagens rute</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {BUILDINGS.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b)}
            className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 text-left hover:bg-telenor-blue/20 hover:border-telenor-blue active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-lg">{b.address}</div>
                <div className="text-white/50 text-sm mt-0.5">{b.postalCode} {b.city} · {b.totalUnits} enheter</div>
              </div>
              <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Resident List ─────────────────────────────────────────────────────────────
function ResidentList({
  building,
  residents,
  visitMap,
  loading,
  onSelect,
  onBack,
}: {
  building: Building;
  residents: Resident[];
  visitMap: Map<string, VisitStatus>;
  loading: boolean;
  onSelect: (r: Resident) => void;
  onBack: () => void;
}) {
  const visited = residents.filter((r) => visitMap.has(r.unitId)).length;
  const sold = [...visitMap.values()].filter((v) => v.outcome === 'sold').length;
  const conversion = visited > 0 ? Math.round((sold / visited) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Header */}
      <div className="bg-[#005A8E] px-5 pt-4 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <TelenorLogo size={20} white />
            <span className="text-sm font-bold text-white">Feltsalg</span>
          </div>
          <button
            onClick={onBack}
            className="text-xs text-white/70 bg-white/10 border border-white/20 px-3 py-1 rounded-full"
          >
            Bytt bygg
          </button>
        </div>
        <div className="text-white font-bold text-xl mb-0.5">{building.address}</div>
        <div className="text-white/50 text-xs mb-4">{building.postalCode} {building.city}</div>

        {/* Progress bar */}
        <div className="bg-white/15 rounded-full h-1.5 mb-3 overflow-hidden">
          <div
            className="h-full bg-telenor-blue rounded-full transition-all duration-500"
            style={{ width: `${residents.length > 0 ? (visited / residents.length) * 100 : 0}%` }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Besøkt', value: `${visited}/${residents.length}` },
            { label: 'Solgt', value: sold },
            { label: 'Konv.', value: visited > 0 ? `${conversion}%` : '–' },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl py-2 text-center">
              <div className="text-white font-bold text-lg leading-tight">{s.value}</div>
              <div className="text-white/50 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <span className="text-sm">Henter beboere fra KAS Core…</span>
          </div>
        ) : (
          residents.map((r, idx) => {
            const visit = visitMap.get(r.unitId);
            const statusCfg = visit ? STATUS_CONFIG[visit.outcome] : null;
            const maxScore = Math.max(...Object.values(r.interestScores));
            const scoreColor = maxScore >= 80 ? '#00A650' : maxScore >= 60 ? '#F5A623' : '#9DA5B1';

            return (
              <button
                key={r.unitId}
                onClick={() => onSelect(r)}
                className="w-full text-left px-4 py-3.5 border-b border-gray-100 bg-white hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-telenor-blue-light flex items-center justify-center text-xs font-bold text-telenor-blue-dark shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm truncate">{r.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{r.unitNumber} · Etg. {r.floor}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {statusCfg ? (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
                    >
                      {statusCfg.label}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      Ikke besøkt
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scoreColor }} />
                    <span className="text-[10px] font-bold" style={{ color: scoreColor }}>{maxScore}</span>
                    <span className="text-[9px] text-gray-400">· {r.campaigns.length} kamp.</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Campaign Panel ────────────────────────────────────────────────────────────
function CampaignPanel({
  campaigns,
  resident,
  onOutcome,
}: {
  campaigns: Campaign[];
  resident: Resident;
  onOutcome: (outcome: VisitOutcome, campaign: Campaign, extraProducts: string[]) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraSel, setExtraSel] = useState<string[]>([]);
  const camp = campaigns[activeIdx];

  const toggleExtra = (p: string) =>
    setExtraSel((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  return (
    <div>
      {/* Campaign tabs */}
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
        Kampanjer ({campaigns.length})
      </div>
      <div className="flex gap-1.5 mb-3">
        {campaigns.map((c, i) => (
          <button
            key={c.id}
            onClick={() => { setActiveIdx(i); setExtraOpen(false); setExtraSel([]); }}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: activeIdx === i ? camp.color : '#F3F4F6',
              color: activeIdx === i ? '#fff' : '#6B7280',
            }}
          >
            {c.tag}
          </button>
        ))}
      </div>

      {/* Active campaign card */}
      <div
        className="rounded-xl p-4 mb-3"
        style={{ background: '#EFF8FF', border: `1.5px solid ${camp.color}40` }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="font-bold text-sm text-gray-900">{camp.name}</div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 shrink-0"
            style={{ color: camp.color, background: '#fff' }}
          >
            {camp.tag}
          </span>
        </div>

        <div className="bg-white rounded-lg p-3 mb-3 flex items-center justify-between" style={{ border: `1px solid ${camp.color}25` }}>
          <div>
            <div className="font-bold text-sm text-gray-900">{camp.product}</div>
            <div className="font-semibold text-sm mt-0.5" style={{ color: camp.color }}>{camp.price}</div>
          </div>
          {camp.discount !== '—' && (
            <div className="text-white text-xs font-bold px-2.5 py-1 rounded-lg shrink-0" style={{ background: camp.color }}>
              -{camp.discount}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600 leading-relaxed mb-4">{camp.pitch}</p>

        {/* Outcome buttons */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => onOutcome('sold', camp, extraSel)}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
            style={{ background: '#00A650' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></svg>
            Solgt!
          </button>
          <button
            onClick={() => onOutcome('rejected', camp, [])}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
            style={{ background: '#FDECEA', color: '#E5202E', border: '1px solid #E5202E30' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12" /></svg>
            Nei takk
          </button>
        </div>

        {/* Extra products toggle */}
        <button
          onClick={() => setExtraOpen((o) => !o)}
          className="w-full py-2 rounded-xl text-xs font-semibold text-telenor-blue-dark border border-dashed border-telenor-blue/40 flex items-center justify-center gap-1.5 hover:bg-telenor-blue-light transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            {extraOpen
              ? <path d="M5 12h14" />
              : <><path d="M12 5v14" /><path d="M5 12h14" /></>}
          </svg>
          {extraOpen ? 'Skjul tillegg' : 'Legg til flere produkter'}
        </button>

        {extraOpen && resident.upsellProducts.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {resident.upsellProducts.map((p) => (
              <button
                key={p}
                onClick={() => toggleExtra(p)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: extraSel.includes(p) ? '#E6F7FF' : '#fff',
                  border: `1.5px solid ${extraSel.includes(p) ? '#01ACFB' : '#E5E7EB'}`,
                  color: extraSel.includes(p) ? '#005A8E' : '#374151',
                }}
              >
                {p}
                {extraSel.includes(p)
                  ? <svg className="w-4 h-4 text-telenor-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></svg>
                  : <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Other outcomes */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onOutcome('no_answer', camp, [])}
          className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 active:scale-[0.97] transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx={12} cy={12} r={10} /><path d="M12 6v6l4 2" /></svg>
          Ikke hjemme
        </button>
        <button
          onClick={() => onOutcome('followup', camp, [])}
          className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 active:scale-[0.97] transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x={3} y={4} width={18} height={18} rx={2} /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          Avtal oppfølging
        </button>
      </div>
      <button
        onClick={() => onOutcome('marketing', camp, [])}
        className="mt-2 w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 active:scale-[0.97] transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
        Legg i marketing-kampanje
      </button>
    </div>
  );
}

// ── Resident Detail ───────────────────────────────────────────────────────────
function ResidentDetail({
  resident,
  building,
  visitStatus,
  onBack,
  onVisitLogged,
}: {
  resident: Resident;
  building: Building;
  visitStatus?: VisitStatus;
  onBack: () => void;
  onVisitLogged: (unitId: string, status: VisitStatus) => void;
}) {
  const [logging, setLogging] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOutcome = useCallback(
    async (outcome: VisitOutcome, campaign: Campaign, extraProducts: string[]) => {
      if (logging) return;
      setLogging(true);
      try {
        const soldProducts = outcome === 'sold'
          ? [campaign.product, ...extraProducts]
          : [];

        await logVisitOutcome({
          outcome,
          residentName: resident.name,
          address: `${building.address}, ${resident.unitNumber}`,
          buildingAddress: building.address,
          campaignName: campaign.name,
          soldProducts,
        });

        const status: VisitStatus = {
          outcome,
          campaignId: campaign.id,
          extraProducts,
          loggedAt: new Date().toISOString(),
        };
        onVisitLogged(resident.unitId, status);

        const labels: Record<VisitOutcome, string> = {
          sold: '✓ Salg registrert!',
          no_answer: 'Registrert: Ikke hjemme',
          rejected: 'Registrert: Ikke interessert',
          followup: 'Oppfølging registrert',
          marketing: 'Lagt til i marketing',
        };
        showToast(labels[outcome]);
      } catch {
        showToast('❌ Kunne ikke logge til Sales Core');
      } finally {
        setLogging(false);
      }
    },
    [logging, resident, building, onVisitLogged]
  );

  const scores = [
    { key: 'internett' as const, label: 'Internett' },
    { key: 'mobil'     as const, label: 'Mobil'     },
    { key: 'sikre'     as const, label: 'Sikre'     },
    { key: 'produktX'  as const, label: 'Produkt X' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#005A8E] px-4 pt-4 pb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/70 text-sm mb-4 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Tilbake
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-white font-bold text-xl">{resident.name}</div>
            <div className="text-white/50 text-sm mt-0.5">{resident.unitNumber} · Etg. {resident.floor}</div>
            {resident.phone && (
              <a href={`tel:${resident.phone}`} className="text-telenor-blue text-sm mt-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.07 6.82 2 2 0 016 4.68h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L10.09 12a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 18.92z" /></svg>
                {resident.phone}
              </a>
            )}
          </div>
          {visitStatus && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
              style={{ color: STATUS_CONFIG[visitStatus.outcome].color, background: STATUS_CONFIG[visitStatus.outcome].bg }}
            >
              {STATUS_CONFIG[visitStatus.outcome].label}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Interest scores */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Interessescore</div>
          <div className="grid grid-cols-4 gap-2">
            {scores.map(({ key, label }) => (
              <ScoreRing key={key} score={resident.interestScores[key]} label={label} />
            ))}
          </div>
        </div>

        {/* Existing products */}
        {resident.existingProducts.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Aktive produkter</div>
            <div className="flex flex-wrap gap-1.5">
              {resident.existingProducts.map((p) => (
                <span key={p} className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* Previous products */}
        {resident.previousProducts.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tidligere produkter</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {resident.previousProducts.map((p) => (
                <span key={p} className="bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-full">{p}</span>
              ))}
            </div>
            {resident.cancelReason && (
              <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx={12} cy={12} r={10} /><path d="M12 8v4M12 16h.01" /></svg>
                Avslutningsgrunn: {resident.cancelReason}
              </div>
            )}
          </div>
        )}

        {/* Campaigns */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          {logging && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              Logger til Sales Core…
            </div>
          )}
          <CampaignPanel
            campaigns={resident.campaigns}
            resident={resident}
            onOutcome={handleOutcome}
          />
        </div>
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
type Screen = 'picker' | 'list' | 'detail';

export default function App() {
  const [screen, setScreen] = useState<Screen>('picker');
  const [building, setBuilding] = useState<Building | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [visitMap, setVisitMap] = useState<Map<string, VisitStatus>>(new Map());

  const handleSelectBuilding = useCallback((b: Building) => {
    setBuilding(b);
    setScreen('list');
    setLoading(true);
    setResidents([]);
    fetchResidents(b.id)
      .then(setResidents)
      .catch(() => setResidents([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectResident = useCallback((r: Resident) => {
    setSelectedResident(r);
    setScreen('detail');
  }, []);

  const handleVisitLogged = useCallback((unitId: string, status: VisitStatus) => {
    setVisitMap((prev) => new Map(prev).set(unitId, status));
  }, []);

  if (screen === 'picker') {
    return <BuildingPicker onSelect={handleSelectBuilding} />;
  }

  if (screen === 'list' && building) {
    return (
      <ResidentList
        building={building}
        residents={residents}
        visitMap={visitMap}
        loading={loading}
        onSelect={handleSelectResident}
        onBack={() => { setScreen('picker'); setBuilding(null); setResidents([]); setVisitMap(new Map()); }}
      />
    );
  }

  if (screen === 'detail' && selectedResident && building) {
    return (
      <ResidentDetail
        resident={selectedResident}
        building={building}
        visitStatus={visitMap.get(selectedResident.unitId)}
        onBack={() => setScreen('list')}
        onVisitLogged={handleVisitLogged}
      />
    );
  }

  return null;
}
