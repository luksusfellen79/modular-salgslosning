import { AppLayout } from '@/components/layout/AppLayout';
import { Building2, Users, TrendingUp, Plus, Search, Loader2, Mail, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo, useEffect } from 'react';
import { fetchOpportunities, SalesCoreOpportunity } from '@/lib/salesCore';
import { useNavigate } from 'react-router-dom';

interface Account {
  id: string;          // accountName used as key
  name: string;
  type: 'Borettslag' | 'Sameie' | 'Annet';
  units: number;
  contactName: string;
  contactEmail: string;
  estimatedAnnualValue: number;
  status: 'Aktiv' | 'Prospect' | 'Fornyelse';
  openDeals: number;
  deals: SalesCoreOpportunity[];
}

const formatNOK = (v: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(v);

function inferType(name: string): Account['type'] {
  if (name.toLowerCase().includes('borettslag')) return 'Borettslag';
  if (name.toLowerCase().includes('sameie')) return 'Sameie';
  return 'Annet';
}

function inferStatus(deals: SalesCoreOpportunity[]): Account['status'] {
  if (deals.some((d) => d.stage === 'closed-won')) return 'Aktiv';
  if (deals.some((d) => d.stage === 'negotiation' || d.stage === 'proposal')) return 'Fornyelse';
  return 'Prospect';
}

function groupToAccounts(opps: SalesCoreOpportunity[]): Account[] {
  const map = new Map<string, SalesCoreOpportunity[]>();
  opps.forEach((o) => {
    const key = o.accountName;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  });

  return Array.from(map.entries()).map(([name, deals]) => {
    const biggest = [...deals].sort((a, b) => b.estimatedAnnualValue - a.estimatedAnnualValue)[0];
    const openDeals = deals.filter((d) => d.stage !== 'closed-won' && d.stage !== 'closed-lost').length;
    return {
      id: name,
      name,
      type: inferType(name),
      units: biggest.units,
      contactName: biggest.contactName ?? '—',
      contactEmail: biggest.contactEmail ?? '—',
      estimatedAnnualValue: deals.reduce((s, d) => s + d.estimatedAnnualValue, 0),
      status: inferStatus(deals),
      openDeals,
      deals,
    };
  }).sort((a, b) => b.estimatedAnnualValue - a.estimatedAnnualValue);
}

const statusCls = (s: Account['status']) => {
  switch (s) {
    case 'Aktiv':    return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'Prospect': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'Fornyelse': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  }
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOpportunities()
      .then((data) => setAccounts(groupToAccounts(data)))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => accounts.filter((a) =>
      [a.name, a.contactName, a.contactEmail].some((f) =>
        f.toLowerCase().includes(query.toLowerCase())
      )
    ),
    [accounts, query]
  );

  const totalArr = filtered.reduce((s, a) => s + a.estimatedAnnualValue, 0);
  const totalUnits = filtered.reduce((s, a) => s + a.units, 0);

  return (
    <AppLayout>
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Mine kunder</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading
                ? 'Laster...'
                : `${filtered.length} kunder · ${formatNOK(totalArr)} total · ${totalUnits} enheter`}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Ny deal
          </button>
        </div>
        <div className="relative mt-4 w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk kunde eller kontakt..."
            className="pl-9 h-9 bg-secondary border-none text-sm"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Henter kunder fra Sales Core...</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
          <p className="text-sm font-medium">Ingen kunder ennå</p>
          <p className="text-xs">Opprett deals i Pipeline — kunder utledes automatisk herfra.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => {
                if (a.deals.length === 1) {
                  navigate(`/offer-hub?opportunityId=${a.deals[0].id}`);
                } else {
                  navigate('/');
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground leading-tight">{a.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.type}</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusCls(a.status)}>
                  {a.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm py-3 border-y border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" /> {a.units} enheter
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="font-medium text-foreground">{formatNOK(a.estimatedAnnualValue)}</span>
                </div>
                <div className="col-span-2 text-muted-foreground">
                  {a.openDeals > 0 ? (
                    <span className="text-primary font-medium">{a.openDeals} aktiv{a.openDeals > 1 ? 'e' : ''} deal{a.openDeals > 1 ? 's' : ''}</span>
                  ) : (
                    <span>Ingen aktive deals</span>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="text-sm font-medium text-foreground">{a.contactName}</div>
                {a.contactEmail !== '—' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3" /> {a.contactEmail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
