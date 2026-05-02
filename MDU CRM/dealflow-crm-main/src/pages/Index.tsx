import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';
import { SidePanel } from '@/components/pipeline/SidePanel';
import { AddDealModal } from '@/components/pipeline/AddDealModal';
import { Opportunity, formatCurrency } from '@/data/mockData';
import { fetchOpportunities, SalesCoreOpportunity } from '@/lib/salesCore';
import { Plus, Filter, SlidersHorizontal, Loader2 } from 'lucide-react';

const STAGE_PROBABILITY: Record<string, number> = {
  prospect: 10,
  qualification: 30,
  proposal: 55,
  negotiation: 75,
  'closed-won': 100,
  'closed-lost': 0,
};

function toKanbanOpp(sc: SalesCoreOpportunity): Opportunity {
  return {
    id: sc.id,
    name: sc.name,
    accountName: sc.accountName,
    value: sc.estimatedAnnualValue,
    stage: sc.stage,
    closeDate: sc.closeDate,
    owner: { name: 'Sales Core', initials: 'SC', color: 'hsl(225 70% 45%)' },
    probability: STAGE_PROBABILITY[sc.stage] ?? 50,
    units: sc.units,
    description: sc.notes,
    contactName: sc.contactName ?? undefined,
    contactEmail: sc.contactEmail ?? undefined,
    createdDate: sc.createdAt,
  };
}

export default function Index() {
  const [deals, setDeals] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Opportunity | null>(null);
  const [showAddDeal, setShowAddDeal] = useState(false);

  const loadDeals = useCallback(() => {
    setLoading(true);
    fetchOpportunities()
      .then((data) => setDeals(data.map(toKanbanOpp)))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  const handleMoveDeal = useCallback((dealId: string, newStage: string) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    );
  }, []);

  const totalValue = deals.reduce((s, d) => s + d.value, 0);

  return (
    <AppLayout>
      {/* Pipeline header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div>
          <h1 className="text-xl font-bold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading
              ? 'Laster...'
              : `${deals.length} deals · ${formatCurrency(totalValue)} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <SlidersHorizontal className="w-4 h-4" /> Sort
          </button>
          <button
            onClick={() => setShowAddDeal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Ny deal
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Henter pipeline fra Sales Core...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && deals.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
          <p className="text-sm font-medium">Ingen deals i pipeline ennå</p>
          <button
            onClick={() => setShowAddDeal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Opprett første deal
          </button>
        </div>
      )}

      {/* Board */}
      {!loading && deals.length > 0 && (
        <KanbanBoard deals={deals} onDealClick={setSelectedDeal} onMoveDeal={handleMoveDeal} />
      )}

      {/* Side panel */}
      {selectedDeal && (
        <SidePanel deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}

      {/* Add Deal modal */}
      {showAddDeal && (
        <AddDealModal
          onClose={() => setShowAddDeal(false)}
          onCreated={loadDeals}
        />
      )}
    </AppLayout>
  );
}
