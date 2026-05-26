import { AppLayout } from '@/components/layout/AppLayout';
import { opportunities, STAGES } from '@/data/mockData';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, Cell
} from 'recharts';
import { TrendingUp, Target, Gauge, Calendar, Award, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Stage win-probabilities (sales best practice: weighted pipeline)
const STAGE_PROBABILITY: Record<string, number> = {
  prospect: 0.10,
  qualification: 0.25,
  proposal: 0.50,
  negotiation: 0.75,
  'closed-won': 1.0,
};

const formatNOK = (v: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(v);
const formatCompact = (v: number) =>
  new Intl.NumberFormat('nb-NO', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

export default function Forecast() {
  const quarterlyQuota = 1_500_000;

  // Weighted pipeline by stage
  const stageData = STAGES.map((s) => {
    const deals = opportunities.filter((d) => d.stage === s.id);
    const total = deals.reduce((sum, d) => sum + d.value, 0);
    const weighted = total * (STAGE_PROBABILITY[s.id] ?? 0);
    return { stage: s.label, total, weighted, count: deals.length, probability: STAGE_PROBABILITY[s.id] };
  });

  const totalPipeline = stageData.reduce((s, d) => s + d.total, 0);
  const weightedPipeline = stageData.reduce((s, d) => s + d.weighted, 0);
  const closedWon = stageData.find((s) => s.stage === 'Closed Won')?.total ?? 0;
  const commit = stageData.filter((s) => ['Negotiation', 'Closed Won'].includes(s.stage)).reduce((s, d) => s + d.weighted, 0);
  const bestCase = weightedPipeline + (totalPipeline - weightedPipeline) * 0.3;

  const quotaAttainment = (closedWon / quarterlyQuota) * 100;
  const forecastAttainment = (weightedPipeline / quarterlyQuota) * 100;

  // Monthly forecast trajectory (mock historical + projection)
  const monthly = [
    { month: 'Jan', actual: 320000, forecast: 320000, quota: 500000 },
    { month: 'Feb', actual: 410000, forecast: 410000, quota: 500000 },
    { month: 'Mar', actual: 480000, forecast: 480000, quota: 500000 },
    { month: 'Apr', actual: 290000, forecast: 380000, quota: 500000 },
    { month: 'Mai', actual: null, forecast: 520000, quota: 500000 },
    { month: 'Jun', actual: null, forecast: 610000, quota: 500000 },
  ];

  // Per rep performance
  const repMap = new Map<string, { name: string; closed: number; pipeline: number; weighted: number; deals: number }>();
  opportunities.forEach((d) => {
    const r = repMap.get(d.owner.name) ?? { name: d.owner.name, closed: 0, pipeline: 0, weighted: 0, deals: 0 };
    if (d.stage === 'closed-won') r.closed += d.value;
    else r.pipeline += d.value;
    r.weighted += d.value * (STAGE_PROBABILITY[d.stage] ?? 0);
    r.deals += 1;
    repMap.set(d.owner.name, r);
  });
  const reps = Array.from(repMap.values()).sort((a, b) => b.weighted - a.weighted);

  return (
    <AppLayout>
      <div className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-xl font-bold text-foreground">Forecast</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Vektet pipeline og kvoteoppnåelse for Q2 2026 · Kvote: {formatNOK(quarterlyQuota)}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            icon={Award}
            label="Closed Won"
            value={formatNOK(closedWon)}
            sublabel={`${quotaAttainment.toFixed(0)}% av kvote`}
            tone="success"
          />
          <KpiCard
            icon={Target}
            label="Commit"
            value={formatNOK(commit)}
            sublabel="Negotiation + Won (vektet)"
            tone="primary"
          />
          <KpiCard
            icon={Gauge}
            label="Vektet pipeline"
            value={formatNOK(weightedPipeline)}
            sublabel={`${forecastAttainment.toFixed(0)}% forecast vs. kvote`}
            tone="default"
          />
          <KpiCard
            icon={TrendingUp}
            label="Best case"
            value={formatNOK(bestCase)}
            sublabel="Vektet + 30 % av rest"
            tone="default"
          />
        </div>

        {/* Quota attainment bar */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground">Kvoteoppnåelse Q2</h2>
            <span className="text-sm text-muted-foreground">
              {formatNOK(closedWon)} / {formatNOK(quarterlyQuota)}
            </span>
          </div>
          <div className="relative h-8 rounded-lg bg-muted overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-success"
              style={{ width: `${Math.min(quotaAttainment, 100)}%` }}
            />
            <div
              className="absolute inset-y-0 bg-primary/40"
              style={{
                left: `${Math.min(quotaAttainment, 100)}%`,
                width: `${Math.max(0, Math.min(forecastAttainment - quotaAttainment, 100 - quotaAttainment))}%`,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
              {quotaAttainment.toFixed(0)}% lukket · {forecastAttainment.toFixed(0)}% forecast
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success inline-block" /> Closed Won</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/40 inline-block" /> Vektet forecast</span>
          </div>
        </div>

        {/* Monthly trajectory */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-bold text-foreground mb-4">Månedlig trajektori (Actual vs Forecast vs Quota)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={formatCompact} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => formatNOK(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="quota" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" name="Kvote" dot={false} />
              <Line type="monotone" dataKey="actual" stroke="hsl(var(--success))" strokeWidth={3} name="Actual" />
              <Line type="monotone" dataKey="forecast" stroke="hsl(var(--primary))" strokeWidth={3} strokeDasharray="6 4" name="Forecast" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Weighted pipeline by stage */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground mb-1">Vektet pipeline per stage</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Total verdi × vinnsannsynlighet pr. stage
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={formatCompact} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => formatNOK(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total" fill="hsl(var(--muted-foreground) / 0.3)" name="Totalt" radius={[4, 4, 0, 0]} />
                <Bar dataKey="weighted" fill="hsl(var(--primary))" name="Vektet" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top reps */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-bold text-foreground mb-4">Forecast per selger</h2>
            <div className="space-y-3">
              {reps.map((r, i) => {
                const personalQuota = 400000;
                const pct = (r.weighted / personalQuota) * 100;
                return (
                  <div key={r.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
                        <span className="text-sm font-semibold text-foreground">{r.name}</span>
                        <span className="text-xs text-muted-foreground">({r.deals} deals)</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">{formatNOK(r.weighted)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', pct >= 100 ? 'bg-success' : pct >= 70 ? 'bg-primary' : 'bg-stage-proposal')}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(0)}% av personlig kvote</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Risk callouts */}
        <div className="rounded-xl border border-stage-proposal/30 bg-stage-proposal/5 p-5">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-stage-proposal" /> Forecast-risiko
          </h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Slipped deals (denne mnd)</p>
              <p className="text-lg font-bold text-foreground">2 deals</p>
              <p className="text-xs text-muted-foreground">{formatNOK(125000)} flyttet til neste kvartal</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stale deals (&gt;30 dager)</p>
              <p className="text-lg font-bold text-foreground">3 deals</p>
              <p className="text-xs text-muted-foreground">Krever oppfølging</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gap til kvote</p>
              <p className="text-lg font-bold text-destructive">{formatNOK(Math.max(0, quarterlyQuota - weightedPipeline))}</p>
              <p className="text-xs text-muted-foreground">Trenger ny pipeline-bygging</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: typeof Award;
  label: string;
  value: string;
  sublabel: string;
  tone: 'success' | 'primary' | 'default';
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            tone === 'success' && 'bg-success/10 text-success',
            tone === 'primary' && 'bg-primary/10 text-primary',
            tone === 'default' && 'bg-muted text-foreground'
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
    </div>
  );
}