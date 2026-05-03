import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { fetchOpportunities, SalesCoreOpportunity } from '@/lib/salesCore';
import { Loader2, BarChart3 } from 'lucide-react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export default function Reports() {
  const [deals, setDeals] = useState<SalesCoreOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpportunities()
      .then(setDeals)
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  const won = deals.filter((d) => d.stage === 'closed-won');
  const active = deals.filter((d) => d.stage !== 'closed-won');
  const wonValue = won.reduce((s, d) => s + d.estimatedAnnualValue, 0);
  const activeValue = active.reduce((s, d) => s + d.estimatedAnnualValue, 0);

  const bySeller = deals.reduce<Record<string, { won: number; active: number; wonValue: number; activeValue: number }>>((acc, d) => {
    const rep = d.salesRepName ?? 'Ukjent';
    if (!acc[rep]) acc[rep] = { won: 0, active: 0, wonValue: 0, activeValue: 0 };
    if (d.stage === 'closed-won') { acc[rep].won++; acc[rep].wonValue += d.estimatedAnnualValue; }
    else { acc[rep].active++; acc[rep].activeValue += d.estimatedAnnualValue; }
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="px-8 py-6 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rapporter</h1>
          <p className="text-sm text-muted-foreground mt-1">Aggregert pipeline og resultater — alle selgere</p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Laster rapporter...</span>
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Alle deals</p>
                <p className="text-2xl font-bold text-foreground">{deals.length}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Vunnet</p>
                <p className="text-2xl font-bold text-emerald-600">{won.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(wonValue)}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Aktiv pipeline</p>
                <p className="text-2xl font-bold text-foreground">{active.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(activeValue)}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Win rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {deals.length ? Math.round((won.length / deals.length) * 100) : 0}%
                </p>
              </div>
            </div>

            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Selger-scoreboard
              </h2>
              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                <div className="flex items-center px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="flex-1">Selger</span>
                  <span className="w-20 text-right">Vunnet</span>
                  <span className="w-28 text-right">Vunnet verdi</span>
                  <span className="w-20 text-right">Aktive</span>
                  <span className="w-32 text-right">Aktiv pipeline</span>
                </div>
                {Object.entries(bySeller)
                  .sort(([, a], [, b]) => b.wonValue - a.wonValue)
                  .map(([rep, stats]) => (
                    <div key={rep} className="flex items-center px-5 py-3.5">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: 'hsl(225 70% 45%)' }}
                        >
                          {rep.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{rep}</span>
                      </div>
                      <span className="w-20 text-right text-sm font-semibold text-emerald-600">{stats.won}</span>
                      <span className="w-28 text-right text-sm font-semibold text-foreground">{formatCurrency(stats.wonValue)}</span>
                      <span className="w-20 text-right text-sm text-muted-foreground">{stats.active}</span>
                      <span className="w-32 text-right text-sm text-muted-foreground">{formatCurrency(stats.activeValue)}</span>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
