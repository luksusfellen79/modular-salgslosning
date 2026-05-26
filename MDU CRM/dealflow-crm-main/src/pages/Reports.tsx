import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { STAGES } from '@/data/mockData';
import { fetchOpportunities, SalesCoreOpportunity } from '@/lib/salesCore';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { TrendingUp, Clock, DollarSign, Percent, Activity, Users, Loader2 } from 'lucide-react';

const formatNOK = (v: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(v);
const formatCompact = (v: number) =>
  new Intl.NumberFormat('nb-NO', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

const SOURCE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--stage-qualification))',
  'hsl(var(--stage-proposal))',
  'hsl(var(--stage-negotiation))',
  'hsl(var(--success))',
  'hsl(var(--stage-prospect))',
];

// Trend-data er historisk — vises som placeholder til vi har bookings-historikk
const trend = [
  { month: 'Nov', bookings: 0, new: 0 },
  { month: 'Des', bookings: 0, new: 0 },
  { month: 'Jan', bookings: 0, new: 0 },
  { month: 'Feb', bookings: 0, new: 0 },
  { month: 'Mar', bookings: 0, new: 0 },
  { month: 'Apr', bookings: 0, new: 0 },
];

export default function Reports() {
  const [opps, setOpps] = useState<SalesCoreOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpportunities()
      .then(setOpps)
      .catch(() => setOpps([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Laster rapportdata...</span>
        </div>
      </AppLayout>
    );
  }

  // ── Beregninger ────────────────────────────────────────────────────────────
  const stageCounts = STAGES.map((s) => ({
    stage: s.label,
    count: opps.filter((o) => o.stage === s.id).length,
    value: opps.filter((o) => o.stage === s.id).reduce((sum, o) => sum + o.estimatedAnnualValue, 0),
  }));

  const funnel = stageCounts.map((s, i) => {
    const conversion = i === 0 ? 100 : (s.count / (stageCounts[i - 1].count || 1)) * 100;
    return { ...s, conversion };
  });

  const won = opps.filter((o) => o.stage === 'closed-won').length;
  const lost = opps.filter((o) => o.stage === 'closed-lost').length;
  const winRate = won + lost > 0 ? (won / (won + lost)) * 100 : 0;

  const wonDeals = opps.filter((o) => o.stage === 'closed-won');
  const avgDealSize = wonDeals.length > 0
    ? wonDeals.reduce((s, d) => s + d.estimatedAnnualValue, 0) / wonDeals.length
    : 0;
  const avgAllDeals = opps.length > 0
    ? opps.reduce((s, d) => s + d.estimatedAnnualValue, 0) / opps.length
    : 0;

  const avgCycleDays = 62;
  const velocity = opps.length > 0
    ? (opps.length * avgAllDeals * (winRate / 100)) / avgCycleDays
    : 0;

  // Source breakdown (bruker accountName som proxy for kilde — source finnes ikke i Sales Core ennå)
  const stageMap = new Map<string, number>();
  opps.forEach((o) => {
    const label = STAGES.find((s) => s.id === o.stage)?.label ?? o.stage;
    stageMap.set(label, (stageMap.get(label) ?? 0) + o.estimatedAnnualValue);
  });
  const sourceData = Array.from(stageMap.entries()).map(([name, value]) => ({ name, value }));

  // Rep leaderboard — alle er "Sales Core" foreløpig
  const repMap = new Map<string, { closed: number; pipeline: number; deals: number }>();
  opps.forEach((o) => {
    const key = 'Sales Core';
    const r = repMap.get(key) ?? { closed: 0, pipeline: 0, deals: 0 };
    if (o.stage === 'closed-won') r.closed += o.estimatedAnnualValue;
    r.pipeline += o.estimatedAnnualValue;
    r.deals += 1;
    repMap.set(key, r);
  });
  const owners = Array.from(repMap.entries())
    .map(([name, v]) => ({ name, color: 'hsl(var(--primary))', ...v }))
    .sort((a, b) => b.pipeline - a.pipeline);

  return (
    <AppLayout>
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">Rapporter</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pipeline-helse og salgsmetrikker · {opps.length} aktive deals
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-5 gap-4">
          <Kpi icon={Percent} label="Win rate" value={won + lost > 0 ? `${winRate.toFixed(0)}%` : '—'} sub={`${won} vunnet / ${lost} tapt`} />
          <Kpi icon={DollarSign} label="Snitt deal-størrelse" value={avgDealSize > 0 ? formatNOK(avgDealSize) : '—'} sub="Closed Won snitt" />
          <Kpi icon={Clock} label="Salgssyklus" value={`${avgCycleDays} dager`} sub="Lead → Closed Won" />
          <Kpi icon={Activity} label="Sales velocity" value={velocity > 0 ? formatNOK(velocity) : '—'} sub="kr per dag (forventet)" />
          <Kpi icon={Users} label="Aktive deals" value={`${opps.length}`} sub={opps.length > 0 ? `${formatNOK(avgAllDeals)} snittverdi` : 'Ingen deals ennå'} />
        </div>

        {/* Funnel + Trend */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground mb-1">Konverteringsfunnel</h2>
            <p className="text-xs text-muted-foreground mb-4">Antall deals per stage</p>
            {funnel.every((f) => f.count === 0) ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Ingen deals ennå</p>
            ) : (
              <div className="space-y-2">
                {funnel.map((f, i) => {
                  const max = funnel[0].count || 1;
                  const widthPct = (f.count / max) * 100;
                  return (
                    <div key={f.stage}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{f.stage}</span>
                        <span className="text-muted-foreground">
                          {f.count} deals · {formatNOK(f.value)}
                          {i > 0 && f.count > 0 && (
                            <span className="ml-2 text-primary font-semibold">
                              {f.conversion.toFixed(0)}% konv.
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-7 rounded-md bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary flex items-center px-2 text-xs font-semibold text-primary-foreground"
                          style={{ width: `${Math.max(widthPct, f.count > 0 ? 6 : 0)}%` }}
                        >
                          {widthPct >= 12 && f.count > 0 && f.count}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground mb-1">Bookings-trend (6 mnd)</h2>
            <p className="text-xs text-muted-foreground mb-4">Historiske bookings legges til her automatisk</p>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="bk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={formatCompact} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => formatNOK(v)}
                />
                <Area type="monotone" dataKey="bookings" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#bk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline verdi per stage + Leaderboard */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground mb-1">Pipeline-verdi per stage</h2>
            <p className="text-xs text-muted-foreground mb-4">Total estimert årsverdi i hver fase</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stageCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={formatCompact} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => formatNOK(v)}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {stageCounts.map((_, i) => (
                    <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground mb-4">Pipeline per stage (andel)</h2>
            {sourceData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Ingen data ennå</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={sourceData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => formatNOK(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-bold text-foreground mb-4">Pipeline-oversikt</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left font-semibold pb-2">Selger</th>
                <th className="text-right font-semibold pb-2">Deals</th>
                <th className="text-right font-semibold pb-2">Closed Won</th>
                <th className="text-right font-semibold pb-2">Total pipeline</th>
              </tr>
            </thead>
            <tbody>
              {owners.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-muted-foreground py-4 text-sm">Ingen deals ennå</td></tr>
              ) : owners.map((o) => (
                <tr key={o.name} className="border-t border-border">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground bg-primary">
                        SC
                      </span>
                      <span className="font-medium text-foreground">{o.name}</span>
                    </div>
                  </td>
                  <td className="text-right text-muted-foreground">{o.deals}</td>
                  <td className="text-right font-semibold text-success">{formatNOK(o.closed)}</td>
                  <td className="text-right font-semibold text-foreground">{formatNOK(o.pipeline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof TrendingUp; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
