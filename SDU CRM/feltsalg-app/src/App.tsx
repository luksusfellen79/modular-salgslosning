import { useState, useCallback, useEffect } from 'react';
import { Resident, Campaign, UpsellProduct, VisitStatus, VisitOutcome } from './lib/types';
import { fetchResidents, logSDUOutcome, fetchNBA, logNBAOutcome, NBARecommendation } from './lib/kasCore';
import { fetchSellers, fetchRoundsForSeller, updateUnitVisit, Round, RoundUnit, Seller, UnitVisitStatus } from './lib/salesCore';

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

// Map CRM outcome → Sales Core visit status
function toUnitVisitStatus(outcome: VisitOutcome): UnitVisitStatus {
  const map: Record<VisitOutcome, UnitVisitStatus> = {
    sold:      'sold',
    no_answer: 'not_home',
    rejected:  'no_interest',
    followup:  'visited',
    marketing: 'visited',
  };
  return map[outcome];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

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

// ── Seller Picker ─────────────────────────────────────────────────────────────
function SellerPicker({ onSelect }: { onSelect: (s: Seller) => void }) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSellers()
      .then(setSellers)
      .catch(() => setError('Kunne ikke hente selgerliste'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#005A8E] flex flex-col items-center justify-center px-5 font-sans">
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <TelenorLogo size={36} white />
          <span className="text-2xl font-bold text-white tracking-tight">Telenor</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Feltsalg</h1>
        <p className="text-sm text-white/50">Hvem er du?</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {loading && (
          <div className="text-white/50 text-sm text-center py-4">Laster selgere…</div>
        )}
        {error && (
          <div className="text-red-300 text-sm text-center py-4">{error}</div>
        )}
        {sellers.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 text-left hover:bg-white/20 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-lg">{s.name}</div>
                {s.phone && <div className="text-white/50 text-sm mt-0.5">{s.phone}</div>}
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

// ── Round Picker ──────────────────────────────────────────────────────────────
function RoundPicker({ seller, onSelect, onBack }: { seller: Seller; onSelect: (r: Round) => void; onBack: () => void }) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoundsForSeller(seller.id, todayISO())
      .then(setRounds)
      .catch(() => setError('Kunne ikke hente runder fra Sales Core'))
      .finally(() => setLoading(false));
  }, [seller.id]);

  const statusLabel: Record<string, string> = { draft: 'Utkast', active: 'Aktiv', completed: 'Fullført' };
  const statusColor: Record<string, string> = { draft: '#9DA5B1', active: '#F5A623', completed: '#00A650' };

  return (
    <div className="min-h-screen bg-[#005A8E] flex flex-col items-center justify-center px-5 font-sans">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <TelenorLogo size={28} white />
          <span className="text-xl font-bold text-white tracking-tight">Telenor Feltsalg</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Hei, {seller.name.split(' ')[0]}!</h2>
        <p className="text-sm text-white/50">Mine runder for i kveld</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {loading && <div className="text-white/50 text-sm text-center py-4">Henter runder…</div>}
        {error && <div className="text-red-300 text-sm text-center py-4">{error}</div>}

        {!loading && rounds.length === 0 && !error && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">📋</div>
            <div className="text-white font-semibold">Ingen runder planlagt for i dag</div>
            <div className="text-white/50 text-sm mt-1">Kontakt salgsleder for å få tildelt en runde</div>
          </div>
        )}

        {rounds.map((r) => {
          const done = r.units.filter(u => u.visitStatus !== 'pending').length;
          const sold = r.units.filter(u => u.visitStatus === 'sold').length;
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 text-left hover:bg-white/20 active:scale-[0.98] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-white font-bold text-lg leading-tight">{r.name}</div>
                  <div className="text-white/50 text-sm mt-1">{r.units.length} enheter · {done} besøkt · {sold} solgt</div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.15)', color: statusColor[r.status] ?? '#fff' }}>
                  {statusLabel[r.status] ?? r.status}
                </span>
              </div>
              {r.units.length > 0 && (
                <div className="mt-3 bg-white/15 rounded-full h-1 overflow-hidden">
                  <div className="h-full bg-white/70 rounded-full" style={{ width: `${Math.round((done / r.units.length) * 100)}%` }} />
                </div>
              )}
            </button>
          );
        })}

        <button
          onClick={onBack}
          className="w-full text-white/50 text-sm text-center pt-4 pb-2"
        >
          ← Ikke meg
        </button>
      </div>
    </div>
  );
}

// ── Round Unit List ───────────────────────────────────────────────────────────
function RoundUnitList({
  round,
  visitMap,
  onSelect,
  onBack,
}: {
  round: Round;
  visitMap: Map<string, VisitStatus>;
  onSelect: (unit: RoundUnit) => void;
  onBack: () => void;
}) {
  const done = round.units.filter(u => visitMap.has(u.unitId) || u.visitStatus !== 'pending').length;
  const sold = [...visitMap.values()].filter(v => v.outcome === 'sold').length
    + round.units.filter(u => !visitMap.has(u.unitId) && u.visitStatus === 'sold').length;
  const conversion = done > 0 ? Math.round((sold / done) * 100) : 0;

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
            Bytt runde
          </button>
        </div>
        <div className="text-white font-bold text-xl mb-0.5">{round.name}</div>
        <div className="text-white/50 text-xs mb-4">{round.date}</div>

        <div className="bg-white/15 rounded-full h-1.5 mb-3 overflow-hidden">
          <div
            className="h-full bg-white/70 rounded-full transition-all duration-500"
            style={{ width: `${round.units.length > 0 ? (done / round.units.length) * 100 : 0}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Besøkt', value: `${done}/${round.units.length}` },
            { label: 'Solgt',  value: sold },
            { label: 'Konv.',  value: done > 0 ? `${conversion}%` : '–' },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl py-2 text-center">
              <div className="text-white font-bold text-lg leading-tight">{s.value}</div>
              <div className="text-white/50 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Unit list */}
      <div className="flex-1 overflow-y-auto">
        {round.units.map((unit, idx) => {
          const localVisit = visitMap.get(unit.unitId);
          const outcome = localVisit?.outcome;
          const statusCfg = outcome ? STATUS_CONFIG[outcome] : null;
          const isVisited = !!statusCfg || (unit.visitStatus !== 'pending' && !localVisit);

          return (
            <button
              key={unit.unitId}
              onClick={() => onSelect(unit)}
              className="w-full text-left px-4 py-3.5 border-b border-gray-100 bg-white hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-telenor-blue-light flex items-center justify-center text-xs font-bold text-telenor-blue-dark shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">{unit.residentName ?? unit.address}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{unit.address}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {statusCfg ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}>
                    {statusCfg.label}
                  </span>
                ) : isVisited ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    Besøkt
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    Ikke besøkt
                  </span>
                )}
              </div>
              <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Produkter' },
    { n: 2, label: 'Sammendrag' },
    { n: 3, label: 'Aksept' },
  ];
  return (
    <div className="flex items-center justify-center gap-0 py-3">
      {steps.map((step, i) => (
        <div key={step.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: step.n < current ? '#E2E8F0' : step.n === current ? '#005A8E' : '#F1F5F9',
                color:      step.n < current ? '#94A3B8'  : step.n === current ? '#fff'     : '#CBD5E1',
              }}
            >
              {step.n < current ? '✓' : step.n}
            </div>
            <span
              className="text-[9px] font-semibold w-14 text-center"
              style={{ color: step.n === current ? '#005A8E' : '#9CA3AF' }}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-10 h-px bg-gray-200 mb-4 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Product Builder (Steg 1) ──────────────────────────────────────────────────
function ProductBuilder({
  campaigns,
  resident,
  onNext,
  onQuickOutcome,
}: {
  campaigns: Campaign[];
  resident: Resident;
  onNext: (campaign: Campaign, extras: UpsellProduct[]) => void;
  onQuickOutcome: (outcome: VisitOutcome, campaign: Campaign) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [extraSel, setExtraSel] = useState<UpsellProduct[]>([]);
  const camp = campaigns[activeIdx];

  const toggleExtra = (p: UpsellProduct) =>
    setExtraSel((s) =>
      s.some((x) => x.name === p.name) ? s.filter((x) => x.name !== p.name) : [...s, p]
    );

  const totalCount = 1 + extraSel.length;
  const extraTotal = extraSel.reduce((sum, p) => sum + p.price, 0);
  const grandTotal = camp.priceNumber + extraTotal;
  const fmt = (n: number) => n.toLocaleString('nb-NO') + ' kr/md';

  return (
    <div className="p-4 space-y-3 pb-8">
      {/* Campaign tabs */}
      {campaigns.length > 1 && (
        <div className="flex gap-1.5">
          {campaigns.map((c, i) => (
            <button
              key={c.id}
              onClick={() => { setActiveIdx(i); setExtraSel([]); }}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: activeIdx === i ? c.color : '#F3F4F6', color: activeIdx === i ? '#fff' : '#6B7280' }}
            >
              {c.tag}
            </button>
          ))}
        </div>
      )}

      {/* Campaign pitch */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex items-start justify-between mb-1.5">
          <div className="font-bold text-sm text-gray-900">{camp.name}</div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 shrink-0"
            style={{ color: camp.color, background: camp.color + '18' }}>{camp.tag}</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">{camp.pitch}</p>
      </div>

      {/* Product list */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-50">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bygg ordren</div>
        </div>

        {/* Main product — alltid inkludert */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: camp.color }}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div>
              <div className="font-semibold text-sm text-gray-900">{camp.product}</div>
              <div className="text-[10px] text-gray-400">Kampanjepris</div>
            </div>
          </div>
          <div className="font-bold text-sm shrink-0" style={{ color: camp.color }}>{camp.price}</div>
        </div>

        {/* Upsell-produkter */}
        {resident.upsellProducts.map((p, i) => {
          const selected = extraSel.some((x) => x.name === p.name);
          return (
            <button
              key={p.name}
              onClick={() => toggleExtra(p)}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-left active:bg-gray-50 transition-colors ${i < resident.upsellProducts.length - 1 ? 'border-b border-gray-50' : ''}`}
              style={{ background: selected ? '#F0FDF4' : 'white' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all"
                  style={{ background: selected ? '#00A650' : 'white', border: `2px solid ${selected ? '#00A650' : '#D1D5DB'}` }}>
                  {selected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M20 6L9 17l-5-5"/></svg>}
                </div>
                <span className="font-medium text-sm" style={{ color: selected ? '#166534' : '#374151' }}>{p.name}</span>
              </div>
              <span className="font-semibold text-sm shrink-0" style={{ color: selected ? '#00A650' : '#9CA3AF' }}>
                +{p.price.toLocaleString('nb-NO')} kr/md
              </span>
            </button>
          );
        })}

        {/* Total */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: camp.color + '0E', borderTop: `1.5px solid ${camp.color}25` }}>
          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {totalCount === 1 ? '1 produkt valgt' : `${totalCount} produkter valgt`}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 max-w-[170px] truncate">
              {[camp.product, ...extraSel.map(p => p.name)].join(' · ')}
            </div>
          </div>
          <div className="text-right shrink-0 ml-2">
            <div className="font-bold text-lg" style={{ color: camp.color }}>{fmt(grandTotal)}</div>
            {extraSel.length > 0 && (
              <div className="text-[10px] text-gray-400">{fmt(camp.priceNumber)} + {fmt(extraTotal)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Primær CTA */}
      <button
        onClick={() => onNext(camp, extraSel)}
        className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
        style={{ background: '#005A8E' }}
      >
        Se sammendrag
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M9 18l6-6-6-6"/></svg>
      </button>

      {/* Andre utfall */}
      <div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-2.5">Ikke interessert i salg?</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onQuickOutcome('no_answer', camp)}
            className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 active:scale-[0.97] transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx={12} cy={12} r={10}/><path d="M12 6v6l4 2"/></svg>
            Ikke hjemme
          </button>
          <button onClick={() => onQuickOutcome('followup', camp)}
            className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 active:scale-[0.97] transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x={3} y={4} width={18} height={18} rx={2}/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Avtal oppfølging
          </button>
          <button onClick={() => onQuickOutcome('rejected', camp)}
            className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-100 active:scale-[0.97] transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
            Ikke interessert
          </button>
          <button onClick={() => onQuickOutcome('marketing', camp)}
            className="py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 active:scale-[0.97] transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Marketing
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Order Summary (Steg 2) ────────────────────────────────────────────────────
function OrderSummary({
  unit,
  campaign,
  extras,
  onNext,
  onBack,
}: {
  unit: RoundUnit;
  campaign: Campaign;
  extras: UpsellProduct[];
  onNext: () => void;
  onBack: () => void;
}) {
  const grandTotal = campaign.priceNumber + extras.reduce((s, p) => s + p.price, 0);
  const fmt = (n: number) => n.toLocaleString('nb-NO') + ' kr/md';

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <StepIndicator current={2} />

      {/* Kunde */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Kunde</div>
        <div className="font-bold text-base text-[#005A8E]">{unit.residentName ?? 'Ukjent beboer'}</div>
        <div className="text-sm text-blue-400 mt-0.5">{unit.address}</div>
      </div>

      {/* Ordrelinjer */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-50">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ordrelinjer</div>
        </div>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
          <span className="text-sm font-medium text-gray-700">{campaign.product}</span>
          <span className="text-sm font-bold text-gray-900">{fmt(campaign.priceNumber)}</span>
        </div>
        {extras.map((p) => (
          <div key={p.name} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
            <span className="text-sm font-medium text-gray-700">{p.name}</span>
            <span className="text-sm font-bold text-gray-900">{fmt(p.price)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-4 bg-slate-50">
          <span className="text-sm font-bold text-gray-900">Total per måned</span>
          <span className="text-xl font-bold text-[#005A8E]">{fmt(grandTotal)}</span>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
        style={{ background: '#005A8E' }}
      >
        Presenter for kunde
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M9 18l6-6-6-6"/></svg>
      </button>
      <button onClick={onBack} className="w-full py-2 text-sm font-medium text-gray-400 text-center">
        ← Endre ordre
      </button>
    </div>
  );
}

// ── Customer Accept (Steg 3) ──────────────────────────────────────────────────
function CustomerAccept({
  unit,
  campaign,
  extras,
  logging,
  onAccept,
  onDecline,
}: {
  unit: RoundUnit;
  campaign: Campaign;
  extras: UpsellProduct[];
  logging: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const grandTotal = campaign.priceNumber + extras.reduce((s, p) => s + p.price, 0);
  const fmt = (n: number) => n.toLocaleString('nb-NO') + ' kr/md';
  const allProducts = [{ name: campaign.product, price: campaign.priceNumber }, ...extras];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Grønt toppar — kundevendt */}
      <div className="bg-[#00A650] px-6 pt-10 pb-8 text-center">
        <div className="text-5xl mb-4">🤝</div>
        <div className="text-2xl font-bold text-white mb-2">Ditt nye abonnement</div>
        <div className="text-sm text-white/70">Ingen bindingstid · Si opp når som helst</div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{unit.residentName ?? 'Kjære kunde'}</div>
          <div className="text-sm text-gray-500">{unit.address}</div>
        </div>

        {/* Produkter */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {allProducts.map((p, i) => (
            <div key={p.name} className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: i < allProducts.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <span className="font-semibold text-gray-900">{p.name}</span>
              </div>
              <span className="font-bold text-gray-700">{fmt(p.price)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-t border-gray-100">
            <span className="font-bold text-gray-900">Du betaler totalt</span>
            <span className="text-xl font-bold text-[#005A8E]">{fmt(grandTotal)}</span>
          </div>
        </div>

        {/* Aksept-knapp — kunden trykker selv */}
        <button
          onClick={onAccept}
          disabled={logging}
          className="w-full py-5 rounded-2xl text-white text-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm"
          style={{ background: '#00A650' }}
        >
          {logging
            ? <><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/></svg>Registrerer…</>
            : <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>Jeg godtar dette tilbudet</>
          }
        </button>

        <button
          onClick={onDecline}
          disabled={logging}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-red-500 bg-red-50 border border-red-100 active:scale-[0.97] transition-all disabled:opacity-60"
        >
          Nei takk
        </button>
      </div>
    </div>
  );
}

// ── NBA Card ──────────────────────────────────────────────────────────────────
function NBACard({ rec, loading }: { rec: NBARecommendation | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-[#005A8E]/10 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 animate-spin text-[#005A8E]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
        </div>
        <span className="text-xs text-gray-400">AI analyserer beboeren…</span>
      </div>
    );
  }

  if (!rec) return null;

  const confidenceConfig = {
    high:   { label: 'Høy sikkerhet',  color: '#00A650', bg: '#E6F6ED' },
    medium: { label: 'Medium',         color: '#F5A623', bg: '#FFF8E6' },
    low:    { label: 'Lav sikkerhet',  color: '#9DA5B1', bg: '#F3F4F6' },
  }[rec.confidence];

  return (
    <div className="bg-[#005A8E]/5 rounded-xl border border-[#005A8E]/15 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#005A8E]/10">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-[#005A8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <span className="text-[10px] font-bold text-[#005A8E] uppercase tracking-widest">AI-anbefaling</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ color: confidenceConfig.color, background: confidenceConfig.bg }}>
          {confidenceConfig.label}
        </span>
      </div>

      <div className="px-4 py-3 space-y-2">
        {/* Headline */}
        <div className="font-bold text-sm text-gray-900">{rec.headline}</div>

        {/* Product + extras */}
        <div className="flex flex-wrap gap-1.5">
          <span className="bg-[#005A8E] text-white text-xs font-semibold px-2.5 py-1 rounded-full">{rec.product}</span>
          {rec.extras.map((e) => (
            <span key={e} className="bg-[#005A8E]/10 text-[#005A8E] text-xs font-semibold px-2.5 py-1 rounded-full">{e}</span>
          ))}
        </div>

        {/* Reason */}
        <p className="text-xs text-gray-500 leading-relaxed">{rec.reason}</p>
      </div>
    </div>
  );
}

// ── Resident Detail ───────────────────────────────────────────────────────────
function ResidentDetail({
  unit,
  round,
  seller,
  visitStatus,
  onBack,
  onVisitLogged,
}: {
  unit: RoundUnit;
  round: Round;
  seller: Seller;
  visitStatus?: VisitStatus;
  onBack: () => void;
  onVisitLogged: (unitId: string, status: VisitStatus) => void;
}) {
  const [resident, setResident] = useState<Resident | null>(null);
  const [loadingResident, setLoadingResident] = useState(true);
  const [logging, setLogging] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [orderStep, setOrderStep] = useState<'select' | 'summary' | 'accept'>('select');
  const [pendingCampaign, setPendingCampaign] = useState<Campaign | null>(null);
  const [pendingExtras, setPendingExtras] = useState<UpsellProduct[]>([]);
  const [nbaRec, setNbaRec] = useState<NBARecommendation | null>(null);
  const [nbaLoading, setNbaLoading] = useState(true);

  useEffect(() => {
    fetchResidents(unit.buildingId)
      .then(residents => {
        const found = residents.find(r => r.unitId === unit.unitId);
        setResident(found ?? null);
      })
      .catch(() => setResident(null))
      .finally(() => setLoadingResident(false));
  }, [unit.buildingId, unit.unitId]);

  // Fetch NBA recommendation in parallel
  useEffect(() => {
    setNbaLoading(true);
    fetchNBA(unit.unitId, unit.buildingId)
      .then(setNbaRec)
      .catch(() => setNbaRec(null))
      .finally(() => setNbaLoading(false));
  }, [unit.unitId, unit.buildingId]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOutcome = useCallback(
    async (outcome: VisitOutcome, campaign: Campaign, extraProducts: string[]) => {
      if (logging || !resident) return;
      setLogging(true);
      try {
        const soldProducts = outcome === 'sold' ? [campaign.product, ...extraProducts] : [];

        // 1. Log outcome to KAS Core
        await logSDUOutcome({
          outcome,
          unitId: resident.unitId,
          soldProducts,
          campaignId: campaign.id,
          campaignName: campaign.name,
          salesRepName: seller.name,
          notes: `Runde: ${round.name}, enhet ${unit.address}`,
        });

        // 2. Persist visit status to Sales Core round
        await updateUnitVisit(
          round.id,
          unit.unitId,
          toUnitVisitStatus(outcome),
          outcome === 'followup' ? 'Oppfølging avtalt' : outcome === 'marketing' ? 'Marketing-kampanje' : undefined
        );

        // 3. Log NBA outcome (fire-and-forget learning signal)
        if (nbaRec) {
          logNBAOutcome({
            unitId: resident.unitId,
            buildingId: unit.buildingId,
            recommendedProduct: nbaRec.product,
            recommendedCampaign: nbaRec.campaign,
            actualOutcome: outcome,
            actualProducts: soldProducts,
            hitRecommendation: outcome === 'sold' && soldProducts.includes(nbaRec.product),
          });
        }

        const status: VisitStatus = {
          outcome,
          campaignId: campaign.id,
          extraProducts,
          loggedAt: new Date().toISOString(),
        };
        onVisitLogged(resident.unitId, status);

        const labels: Record<VisitOutcome, string> = {
          sold:      '✓ Solgt! Kunde opprettet i KAS Core',
          no_answer: 'Registrert: Ikke hjemme',
          rejected:  'Registrert: Ikke interessert',
          followup:  'Oppfølging registrert',
          marketing: 'Lagt til i marketing',
        };
        showToast(labels[outcome]);
        setTimeout(() => onBack(), outcome === 'sold' ? 1800 : 1200);
      } catch {
        showToast('❌ Kunne ikke logge besøk');
        setLogging(false);
      }
    },
    [logging, resident, round, unit, seller, onVisitLogged, onBack, nbaRec]
  );

  // Step transition handlers
  const handleBuilderNext = (campaign: Campaign, extras: UpsellProduct[]) => {
    setPendingCampaign(campaign);
    setPendingExtras(extras);
    setOrderStep('summary');
  };

  const handleSummaryNext = () => setOrderStep('accept');
  const handleSummaryBack = () => setOrderStep('select');

  const handleCustomerAccept = () => {
    if (!pendingCampaign) return;
    handleOutcome('sold', pendingCampaign, pendingExtras.map(p => p.name));
  };

  const handleCustomerDecline = () => {
    if (!pendingCampaign) return;
    handleOutcome('rejected', pendingCampaign, []);
  };

  const handleQuickOutcome = (outcome: VisitOutcome, campaign: Campaign) => {
    handleOutcome(outcome, campaign, []);
  };

  const handleBackButton = () => {
    if (orderStep === 'accept') setOrderStep('summary');
    else if (orderStep === 'summary') setOrderStep('select');
    else onBack();
  };

  const scores = [
    { key: 'internett' as const, label: 'Internett' },
    { key: 'mobil'     as const, label: 'Mobil'     },
    { key: 'sikre'     as const, label: 'Sikre'     },
    { key: 'produktX'  as const, label: 'Produkt X' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* Blue header — hidden on accept screen (CustomerAccept has its own green header) */}
      {orderStep !== 'accept' && (
        <div className="bg-[#005A8E] px-4 pt-4 pb-5">
          <button
            onClick={handleBackButton}
            className="flex items-center gap-1.5 text-white/70 text-sm mb-4 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            {orderStep === 'summary' ? 'Endre ordre' : 'Tilbake'}
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-white font-bold text-xl">{unit.residentName ?? 'Ukjent beboer'}</div>
              <div className="text-white/50 text-sm mt-0.5">{unit.address}</div>
              {resident?.phone && (
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
      )}

      <div className="flex-1 flex flex-col overflow-y-auto">
        {loadingResident ? (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <span className="text-sm">Henter kundedata fra KAS Core…</span>
          </div>
        ) : !resident ? (
          <div className="bg-white rounded-xl p-4 border border-gray-100 m-4 text-sm text-gray-500 text-center">
            Fant ikke beboerdata i KAS Core for denne enheten.
          </div>
        ) : orderStep === 'accept' && pendingCampaign ? (
          /* ── Steg 3: Kundeaksept (snudd skjerm) ── */
          <CustomerAccept
            unit={unit}
            campaign={pendingCampaign}
            extras={pendingExtras}
            logging={logging}
            onAccept={handleCustomerAccept}
            onDecline={handleCustomerDecline}
          />
        ) : orderStep === 'summary' && pendingCampaign ? (
          /* ── Steg 2: Ordresammendrag (selger) ── */
          <OrderSummary
            unit={unit}
            campaign={pendingCampaign}
            extras={pendingExtras}
            onNext={handleSummaryNext}
            onBack={handleSummaryBack}
          />
        ) : (
          /* ── Steg 1: Produktvelger ── */
          <>
            {/* Customer intel */}
            <div className="p-4 space-y-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Interessescore</div>
                <div className="grid grid-cols-4 gap-2">
                  {scores.map(({ key, label }) => (
                    <ScoreRing key={key} score={resident.interestScores[key]} label={label} />
                  ))}
                </div>
              </div>

              {/* NBA recommendation */}
              <NBACard rec={nbaRec} loading={nbaLoading} />

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
            </div>

            {/* Product Builder */}
            {resident.campaigns.length > 0 ? (
              <div className="px-0">
                <StepIndicator current={1} />
                <ProductBuilder
                  campaigns={resident.campaigns}
                  resident={resident}
                  onNext={handleBuilderNext}
                  onQuickOutcome={handleQuickOutcome}
                />
              </div>
            ) : (
              <div className="px-4 pb-8">
                <div className="bg-white rounded-xl p-4 border border-gray-100 text-sm text-gray-400 text-center">
                  Ingen kampanjer tilgjengelig
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
type Screen = 'loading' | 'seller_picker' | 'round_picker' | 'unit_list' | 'detail';

// Bootstrap session from Hub link token
try {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('hub_session');
  if (token) {
    localStorage.setItem('salgshub_session', token);
    window.history.replaceState({}, '', window.location.pathname);
  }
} catch { /* ignore */ }

function getSessionName(): string | null {
  try {
    const raw = localStorage.getItem('salgshub_session');
    if (!raw) return null;
    return (JSON.parse(raw) as { name: string }).name ?? null;
  } catch { return null; }
}

export default function App() {
  const sessionName = getSessionName();

  const [screen, setScreen] = useState<Screen>(sessionName ? 'loading' : 'seller_picker');
  const [seller, setSeller] = useState<Seller | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<RoundUnit | null>(null);
  const [visitMap, setVisitMap] = useState<Map<string, VisitStatus>>(new Map());

  // Auto-login fra Hub session: match mot selgerliste, eller bruk syntetisk selger
  useEffect(() => {
    if (!sessionName) return;
    fetchSellers().then((sellers) => {
      const match = sellers.find(
        (s) => s.name.toLowerCase() === sessionName.toLowerCase()
      );
      const resolvedSeller: Seller = match ?? {
        id: 'hub-session-user',
        name: sessionName,
        email: '',
        phone: '',
        role: 'seller',
        isActive: true,
      };
      setSeller(resolvedSeller);
      setScreen('round_picker');
    }).catch(() => {
      // Fallback: syntetisk selger uten selgerliste
      setSeller({
        id: 'hub-session-user',
        name: sessionName,
        email: '',
        phone: '',
        role: 'seller',
        isActive: true,
      });
      setScreen('round_picker');
    });
  }, []);

  const handleSelectSeller = (s: Seller) => {
    setSeller(s);
    setRound(null);
    setVisitMap(new Map());
    setScreen('round_picker');
  };

  const handleSelectRound = (r: Round) => {
    setRound(r);
    setVisitMap(new Map());
    setScreen('unit_list');
  };

  const handleSelectUnit = (unit: RoundUnit) => {
    setSelectedUnit(unit);
    setScreen('detail');
  };

  const handleVisitLogged = useCallback((unitId: string, status: VisitStatus) => {
    setVisitMap((prev) => new Map(prev).set(unitId, status));
  }, []);

  if (screen === 'loading') {
    return (
      <div className="min-h-screen bg-[#005A8E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <TelenorLogo size={40} white />
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (screen === 'seller_picker') {
    return <SellerPicker onSelect={handleSelectSeller} />;
  }

  if (screen === 'round_picker' && seller) {
    return (
      <RoundPicker
        seller={seller}
        onSelect={handleSelectRound}
        onBack={() => setScreen('seller_picker')}
      />
    );
  }

  if (screen === 'unit_list' && round) {
    return (
      <RoundUnitList
        round={round}
        visitMap={visitMap}
        onSelect={handleSelectUnit}
        onBack={() => setScreen('round_picker')}
      />
    );
  }

  if (screen === 'detail' && selectedUnit && round && seller) {
    return (
      <ResidentDetail
        unit={selectedUnit}
        round={round}
        seller={seller}
        visitStatus={visitMap.get(selectedUnit.unitId)}
        onBack={() => setScreen('unit_list')}
        onVisitLogged={handleVisitLogged}
      />
    );
  }

  return null;
}
