import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { fetchOpportunities, SalesCoreOpportunity } from '@/lib/salesCore';
import { Loader2, TrendingUp, Users } from 'lucide-react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const STAGE_PROBABILITY: Record<string, number> = {
  prospect: 10,
  qualification: 30,
  proposal: 55,
  negotiation: 75,
  'closed-won': 100,
  'closed-lost': 0,
};

const STAGE_LABELS: Record<string, string> = {
  prospect: 'Prospekt',
  qualification: 'Kontaktet',
  proposal: 'Tilbud sendt',
  negotiation: 'Forhandling',
  'closed-won': 'Vunnet',
};

export default function Forecast() {
  const [deals, setDeals] = useState<SalesCoreOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpportunities()
      .then(setDeals)
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  // Group by seller
  const bySeller = deals.reduce<Record<string, SalesCoreOpportunity[]>>((acc, d) => {
    const rep = d.salesRepName ?? 'Ukjent';
    if (!acc[rep]) acc[rep] = [];
    acc[rep].push(d);
    return acc;
  }, {});

  // Weighted pipeline value
  const weighted = (list: SalesCoreOpportunity[]) =>
    list.reduce((s, d) => s + d.estimatedAnnualValue * ((STAGE_PROBABILITY[d.stage] ?? 50) / 100), 0);

  const totalWeighted = weighted(deals);
  const totalPipeline = deals.reduce((s, d) => s + d.estimatedAnnualValue, 0);

  // Pipeline by stage
  const byStage = Object.entries(STAGE_LABELS).map(([id, label]) => {
    const stageDeals = deals.filter((d) => d.stage === id);
    return {
      id, label,
      count: stageDeals.length,
      value: stageDeals.reduce((s, d) => s + d.estimatedAnnualValue, 0),
    };
  });

  return (
    <AppLayout>
      <div className="px-8 py-6 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Forecast</h1>
          <p className="text-sm text-muted-foreground mt-1">Oversikt over alle selgeres pipeline</p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Laster forecast...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Total pipeline</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalPipeline)}</p>
                <p className="text-xs text-muted-foreground mt-1">{deals.length} deals</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Vektet forecast</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalWeighted)}</p>
                <p className="text-xs text-muted-foreground mt-1">Justert for sannsynlighet</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Aktive selgere</p>
                <p className="text-2xl font-bold text-foreground">{Object.keys(bySeller).length}</p>
                <p className="text-xs text-muted-foreground mt-1">Med deals i pipeline</p>
              </div>
            </div>

            {/* Pipeline by stage */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pipeline per steg</h2>
              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                {byStage.filter((s) => s.count > 0).map((s) => {
                  const prob = STAGE_PROBABILITY[s.id] ?? 50;
                  return (
                    <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: `hsl(${prob * 1.2}, 70%, 50%)` }}
                        />
                        <span className="text-sm font-medium text-foreground">{s.label}</span>
                        <span className="text-xs text-muted-foreground">{prob}%</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-muted-foreground">{s.count} deal{s.count !== 1 ? 's' : ''}</span>
                        <span className="font-semibold text-foreground w-36 text-right">{formatCurrency(s.value)}</span>
                        <span className="text-primary w-36 text-right">{formatCurrency(s.value * prob / 100)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end mt-1 px-5 text-xs text-muted-foreground gap-12 pr-5">
                <span>Pipeline</span>
                <span>Vektet</span>
              </div>
            </section>

            {/* Per seller */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Per selger
              </h2>
              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                {Object.entries(bySeller)
                  .sort(([, a], [, b]) => weighted(b) - weighted(a))
                  .map(([rep, repDeals]) => {
                    const wv = weighted(repDeals);
                    const total = repDeals.reduce((s, d) => s + d.estimatedAnnualValue, 0);
                    return (
                      <div key={rep} className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: 'hsl(225 70% 45%)' }}
                          >
                            {rep.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{rep}</p>
                            <p className="text-xs text-muted-foreground">{repDeals.length} deal{repDeals.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8 text-sm">
                          <span className="text-muted-foreground">{formatCurrency(total)}</span>
                          <span className="font-semibold text-primary w-32 text-right">{formatCurrency(wv)}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
