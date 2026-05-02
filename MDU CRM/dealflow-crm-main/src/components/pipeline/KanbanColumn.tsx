import { useState } from 'react';
import { Opportunity, formatCurrency } from '@/data/mockData';
import { DealCard } from './DealCard';

const stageColorMap: Record<string, string> = {
  'stage-prospect': 'hsl(217, 91%, 60%)',
  'stage-qualification': 'hsl(262, 83%, 58%)',
  'stage-proposal': 'hsl(25, 95%, 53%)',
  'stage-negotiation': 'hsl(43, 96%, 56%)',
  'stage-closed-won': 'hsl(142, 71%, 45%)',
};

interface KanbanColumnProps {
  stageId: string;
  label: string;
  color: string;
  deals: Opportunity[];
  onDealClick: (deal: Opportunity) => void;
  onDrop: (dealId: string, newStage: string) => void;
}

export function KanbanColumn({ stageId, label, color, deals, onDealClick, onDrop }: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      className={`flex flex-col min-w-[280px] w-[280px] rounded-xl transition-colors ${dragOver ? 'bg-primary/5' : 'bg-secondary/50'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const dealId = e.dataTransfer.getData('dealId');
        if (dealId) onDrop(dealId, stageId);
      }}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stageColorMap[color] || 'hsl(217, 91%, 60%)' }} />
          <h3 className="font-semibold text-foreground" style={{ fontSize: '22px' }}>{label}</h3>
          <span className="ml-auto text-xs font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-medium">{formatCurrency(totalValue)}</p>
      </div>

      <div className="flex-1 px-3 pb-3 space-y-2.5 overflow-y-auto scrollbar-thin max-h-[calc(100vh-220px)]">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onClick={onDealClick} />
        ))}
      </div>
    </div>
  );
}
