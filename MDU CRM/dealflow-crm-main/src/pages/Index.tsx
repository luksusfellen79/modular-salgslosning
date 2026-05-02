import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';
import { SidePanel } from '@/components/pipeline/SidePanel';
import { opportunities as initialOpps, Opportunity, formatCurrency } from '@/data/mockData';
import { Plus, Filter, SlidersHorizontal } from 'lucide-react';

export default function Index() {
  const [deals, setDeals] = useState<Opportunity[]>(initialOpps);
  const [selectedDeal, setSelectedDeal] = useState<Opportunity | null>(null);

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
            {deals.length} deals · {formatCurrency(totalValue)} total value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <SlidersHorizontal className="w-4 h-4" /> Sort
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Deal
          </button>
        </div>
      </div>

      {/* Board */}
      <KanbanBoard deals={deals} onDealClick={setSelectedDeal} onMoveDeal={handleMoveDeal} />

      {/* Side panel */}
      {selectedDeal && (
        <SidePanel deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}
    </AppLayout>
  );
}
