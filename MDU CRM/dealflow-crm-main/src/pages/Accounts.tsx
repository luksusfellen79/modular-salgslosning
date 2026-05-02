import { AppLayout } from '@/components/layout/AppLayout';
import { Building2, MapPin, Users, Phone, Mail, TrendingUp, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';

interface Account {
  id: string;
  name: string;
  type: 'Borettslag' | 'Sameie';
  city: string;
  units: number;
  contactName: string;
  contactEmail: string;
  phone: string;
  status: 'Aktiv' | 'Prospect' | 'Fornyelse';
  arr: number;
  lastContact: string;
  openDeals: number;
}

// Logged-in user (matches TopBar): Sarah Chen — owns these accounts
const CURRENT_USER = { name: 'Sarah Chen', initials: 'SC' };

const myAccounts: Account[] = [
  { id: '1', name: 'Jordbærhagen Borettslag', type: 'Borettslag', city: 'Oslo', units: 180, contactName: 'Erik Andersen', contactEmail: 'erik@jordbaerhagen.no', phone: '+47 900 12 345', status: 'Aktiv', arr: 968400, lastContact: '2026-04-07', openDeals: 1 },
  { id: '2', name: 'Solbakken Sameie', type: 'Sameie', city: 'Bergen', units: 95, contactName: 'Marte Olsen', contactEmail: 'marte@solbakken.no', phone: '+47 911 22 333', status: 'Prospect', arr: 0, lastContact: '2026-04-05', openDeals: 1 },
  { id: '3', name: 'Lillevann Borettslag', type: 'Borettslag', city: 'Trondheim', units: 64, contactName: 'Lars Berg', contactEmail: 'lars@lillevann.no', phone: '+47 922 33 444', status: 'Aktiv', arr: 345600, lastContact: '2026-04-01', openDeals: 0 },
  { id: '4', name: 'Bjørkelia Borettslag', type: 'Borettslag', city: 'Oslo', units: 240, contactName: 'Kari Haugen', contactEmail: 'kari@bjorkelia.no', phone: '+47 933 44 555', status: 'Prospect', arr: 0, lastContact: '2026-03-28', openDeals: 1 },
  { id: '5', name: 'Torget Sameie', type: 'Sameie', city: 'Stavanger', units: 42, contactName: 'Nina Eriksen', contactEmail: 'nina@torgetsameie.no', phone: '+47 988 99 000', status: 'Fornyelse', arr: 201600, lastContact: '2026-04-02', openDeals: 1 },
  { id: '6', name: 'Nordstrand Borettslag', type: 'Borettslag', city: 'Oslo', units: 128, contactName: 'Petter Sand', contactEmail: 'petter@nordstrand.no', phone: '+47 901 23 456', status: 'Aktiv', arr: 690240, lastContact: '2026-03-20', openDeals: 0 },
  { id: '7', name: 'Fjellsiden Sameie', type: 'Sameie', city: 'Bergen', units: 56, contactName: 'Hanne Vik', contactEmail: 'hanne@fjellsiden.no', phone: '+47 902 34 567', status: 'Aktiv', arr: 302400, lastContact: '2026-03-15', openDeals: 0 },
];

const formatNOK = (v: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(v);

const statusVariant = (s: Account['status']) => {
  switch (s) {
    case 'Aktiv': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'Prospect': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'Fornyelse': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
  }
};

export default function Accounts() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => myAccounts.filter((a) =>
      [a.name, a.city, a.contactName].some((f) => f.toLowerCase().includes(query.toLowerCase()))
    ),
    [query]
  );

  const totalArr = filtered.reduce((s, a) => s + a.arr, 0);
  const totalUnits = filtered.reduce((s, a) => s + a.units, 0);

  return (
    <AppLayout>
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Mine kunder</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Kontoer eid av {CURRENT_USER.name} · {filtered.length} kunder · {formatNOK(totalArr)} ARR · {totalUnits} enheter
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Ny kunde
          </button>
        </div>
        <div className="relative mt-4 w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søk kunde, by eller kontakt..."
            className="pl-9 h-9 bg-secondary border-none text-sm"
          />
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((a) => (
          <div
            key={a.id}
            className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
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
              <Badge variant="outline" className={statusVariant(a.status)}>
                {a.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm py-3 border-y border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> {a.city}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-3.5 h-3.5" /> {a.units} enheter
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="font-medium text-foreground">{formatNOK(a.arr)}</span>
              </div>
              <div className="text-muted-foreground">
                {a.openDeals > 0 ? (
                  <span className="text-primary font-medium">{a.openDeals} aktiv deal</span>
                ) : (
                  <span>Ingen aktive deals</span>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="text-sm font-medium text-foreground">{a.contactName}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="w-3 h-3" /> {a.contactEmail}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" /> {a.phone}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
