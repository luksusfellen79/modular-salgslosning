import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';
import { Sprout, Building, Globe, RefreshCw, Mail, Phone, Plus, UserPlus, Check } from 'lucide-react';

type TabKey = 'greenfield' | 'brownfield' | 'web' | 'renewal';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  source: string;
  createdAt: string;
}

const tabs: { key: TabKey; label: string; icon: typeof Sprout; description: string }[] = [
  { key: 'greenfield', label: 'Greenfield', icon: Sprout, description: 'Brand new prospects with no prior engagement' },
  { key: 'brownfield', label: 'Brownfield', icon: Building, description: 'Existing accounts with expansion potential' },
  { key: 'web', label: 'Leads from Web', icon: Globe, description: 'Inbound leads from website forms and chat' },
  { key: 'renewal', label: 'Renewal', icon: RefreshCw, description: 'Customers approaching contract renewal' },
];

const mockLeads: Record<TabKey, Lead[]> = {
  greenfield: [
    { id: 'g1', name: 'Anna Berg', company: 'Jordbærhagen Borettslag', email: 'styret@jordbaerhagen.no', phone: '+47 900 12 345', value: 85000, source: 'Kald henvendelse', createdAt: '2026-04-15' },
    { id: 'g2', name: 'Erik Hansen', company: 'Tyrihans Borettslag', email: 'styret@tyrihans.no', phone: '+47 911 22 333', value: 120000, source: 'Boligmesse', createdAt: '2026-04-12' },
    { id: 'g3', name: 'Mia Olsen', company: 'Furulund Sameie', email: 'styret@furulund.no', phone: '+47 922 33 444', value: 64000, source: 'LinkedIn', createdAt: '2026-04-10' },
  ],
  brownfield: [
    { id: 'b1', name: 'Erik Andersen', company: 'Parkveien Borettslag', email: 'erik@parkveien.no', phone: '+47 901 23 456', value: 95000, source: 'Eksisterende kunde', createdAt: '2026-04-08' },
    { id: 'b2', name: 'Lars Berg', company: 'Solsiden Borettslag', email: 'lars@solsiden.no', phone: '+47 902 34 567', value: 70000, source: 'Konto-utvidelse', createdAt: '2026-04-05' },
  ],
  web: [
    { id: 'w1', name: 'Sara Lien', company: 'Bekkelaget Borettslag', email: 'styret@bekkelaget.no', phone: '+47 933 11 222', value: 45000, source: 'Demoforespørsel', createdAt: '2026-04-18' },
    { id: 'w2', name: 'Tom Brun', company: 'Skogvang Sameie', email: 'styret@skogvang.no', phone: '+47 933 22 333', value: 32000, source: 'Prisside', createdAt: '2026-04-17' },
    { id: 'w3', name: 'Lena Storm', company: 'Nordstrand Borettslag', email: 'styret@nordstrand.no', phone: '+47 933 44 555', value: 58000, source: 'Kontaktskjema', createdAt: '2026-04-16' },
  ],
  renewal: [
    { id: 'r1', name: 'Marte Olsen', company: 'Lillevann Borettslag', email: 'marte@lillevann.no', phone: '+47 944 11 222', value: 85000, source: 'Fornyelse Q2', createdAt: '2026-04-01' },
    { id: 'r2', name: 'Nina Eriksen', company: 'Torget Sameie', email: 'nina@torgetsameie.no', phone: '+47 944 22 333', value: 28000, source: 'Fornyelse Q3', createdAt: '2026-03-28' },
  ],
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0 }).format(v);

export default function Leads() {
  const [activeTab, setActiveTab] = useState<TabKey>('greenfield');
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const current = tabs.find((t) => t.key === activeTab)!;
  const leads = mockLeads[activeTab];
  const totalValue = leads.reduce((s, l) => s + l.value, 0);

  const handleAddToProspect = (leadId: string) => {
    setAdded((p) => ({ ...p, [leadId]: true }));
  };

  return (
    <AppLayout>
      <div className="border-b border-border bg-card px-6 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Leads</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {leads.length} leads · {formatCurrency(totalValue)} pipeline value
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            const count = mockLeads[tab.key].length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span
                  className={cn(
                    'text-[11px] font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                    isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        <p className="text-sm text-muted-foreground mb-4">{current.description}</p>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Est. Value</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground text-sm">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{lead.company}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {lead.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                    {formatCurrency(lead.value)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{lead.createdAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleAddToProspect(lead.id)}
                        disabled={added[lead.id]}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors mr-1',
                          added[lead.id]
                            ? 'bg-success/10 text-success cursor-default'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        )}
                      >
                        {added[lead.id] ? (
                          <><Check className="w-3.5 h-3.5" /> Added</>
                        ) : (
                          <><UserPlus className="w-3.5 h-3.5" /> Add to Prospect</>
                        )}
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-secondary transition-colors" title="Email">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-secondary transition-colors" title="Call">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No leads in this category yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}