import { AppLayout } from '@/components/layout/AppLayout';
import { opportunities, STAGES } from '@/data/mockData';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { TrendingUp, Clock, DollarSign, Percent, Activity, Users } from 'lucide-react';

const formatNOK = (v: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(v);
const formatCompact = (v: number) =>
  new Intl.NumberFormat('nb-NO', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

export default function Reports() {
  // ===== Funnel / conversion (best practice: stage-to-stage conversion) =====
  const stageCounts = STAGES.map((s) => ({
    stage: s.label,
    count: opportunities.filter((o) => o.stage === s.id).length,
    value: opportunities.filter((o) => o.stage === s.id).reduce((sum, o) => sum + o.value, 0),
  }));
  const funnel = stageCounts.map((s, i) => {
    const conversion = i === 0 ? 100 : (s.count / (stageCounts[i - 1].count || 1)) * 100;
    return { ...s, conversion };
  });

  // ===== Win rate =====
  const won = opportunities.filter((o) => o.stage === 'closed-won').length;
  const totalClosed = won; // mock — only "won" exists in data; assume 4 lost
  const lost = 4;
  const winRate = (won / (won + lost)) * 100;

  // ===== Average deal size =====
  const wonDeals = opportunities.filter((o) => o.stage === 'closed-won');
  const avgDealSize = wonDeals.length > 0 ? wonDeals.reduce((s, d) => s + d.value, 0) / wonDeals.length : 0;
  const avgAllDeals = opportunities.reduce((s, d) => s + d.value, 0) / opportunities.length;

  // ===== Sales velocity =====
  // Velocity = (Opportunities × Avg Deal Size × Win Rate) / Sales Cycle Length (days)
  const avgCycleDays = 62;
  const velocity = (opportunities.length * avgAllDeals * (winRate / 100)) / avgCycleDays;

  // ===== Source / lead origin breakdown =====
  const sourceMap = new Map<string, number>();
  opportunities.forEach((o) => {
    const src = o.source || 'Ukjent';
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + o.value);
  });
  const sourceData = Array.from(sourceMap.entries()).map(([name, value]) => ({ name, value }));
  const SOURCE_COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--stage-qualification))',
    'hsl(var(--stage-proposal))',
    'hsl(var(--stage-negotiation))',
    'hsl(var(--success))',
    'hsl(var(--stage-prospect))',
  ];

  // ===== Trend (mock 6-month bookings) =====
  const trend = [
    { month: 'Nov', bookings: 280000, new: 8 },
    { month: 'Des', bookings: 350000, new: 11 },
    { month: 'Jan', bookings: 420000, new: 14 },
    { month: 'Feb', bookings: 510000, new: 16 },
    { month: 'Mar', bookings: 480000, new: 13 },
    { month: 'Apr', bookings: 590000, new: 18 },
  ];

  // ===== Owner leaderboard =====
  const ownerMap = new Map<string, { name: string; color: string; closed: number; pipeline: number; deals: number }>();
  opportunities.forEach((d) => {
    const r = ownerMap.get(d.owner.name) ?? { name: d.owner.name, color: d.owner.color, closed: 0, pipeline: 0, deals: 0 };
    if (d.stage === 'closed-won') r.closed += d.value;
    r.pipeline += d.value;
    r.deals += 1;
    ownerMap.set(d.owner.name, r);
  });
  const owners = Array.from(ownerMap.values()).sort((a, b) => b.pipeline - a.pipeline);

  return (
    <AppLayout>
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pipeline-helse, konverteringsfunnel og salgsmetrikker for borettslagsmarkedet
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-5 gap-4">
          <Kpi icon={Percent} label="Win rate" value={`${winRate.toFixed(0)}%`} sub={`${won} won / ${lost} lost`} />
          <Kpi icon={DollarSign} label="Avg deal size" value={formatNOK(avgDealSize)} sub="Closed Won snitt" />
          <Kpi icon={Clock} label="Sales cycle" value={`${avgCycleDays} dager`} sub="Lead → Closed Won" />
          <Kpi icon={Activity} label="Sales velocity" value={formatNOK(velocity)} sub="kr per dag (forventet)" />
          <Kpi icon={Users} label="Aktive deals" value={`${opportunities.length}`} sub={`${formatNOK(avgAllDeals)} snittverdi`} />
        </div>

        {/* Funnel + Trend */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground mb-1">Konverteringsfunnel</h2>
            <p className="text-xs text-muted-foreground mb-4">Stage-til-stage konvertering (antall deals)</p>
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
                        {i > 0 && (
                          <span className="ml-2 text-primary font-semibold">
                            {f.conversion.toFixed(0)}% konv.
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-7 rounded-md bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary flex items-center px-2 text-xs font-semibold text-primary-foreground"
                        style={{ width: `${Math.max(widthPct, 6)}%` }}
                      >
                        {widthPct >= 12 && f.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground mb-1">Bookings-trend (6 mnd)</h2>
            <p className="text-xs text-muted-foreground mb-4">Lukket omsetning per måned</p>
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

        {/* Source breakdown + Leaderboard */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground mb-1">Pipeline per kilde</h2>
            <p className="text-xs text-muted-foreground mb-4">Hvor kommer omsetningen fra?</p>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
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
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground mb-4">Rep leaderboard</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left font-semibold pb-2">Selger</th>
                  <th className="text-right font-semibold pb-2">Deals</th>
                  <th className="text-right font-semibold pb-2">Closed</th>
                  <th className="text-right font-semibold pb-2">Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((o) => (
                  <tr key={o.name} className="border-t border-border">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground"
                          style={{ backgroundColor: o.color }}
                        >
                          {o.name.split(' ').map((n) => n[0]).join('')}
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

        {/* Stage value bar */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-bold text-foreground mb-1">Pipeline-verdi per stage</h2>
          <p className="text-xs text-muted-foreground mb-4">Total kontraktsverdi i hver fase</p>
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