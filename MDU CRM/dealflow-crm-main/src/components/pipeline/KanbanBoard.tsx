import { STAGES, Opportunity } from '@/data/mockData';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  deals: Opportunity[];
  onDealClick: (deal: Opportunity) => void;
  onMoveDeal: (dealId: string, newStage: string) => void;
}

export function KanbanBoard({ deals, onDealClick, onMoveDeal }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto p-6 h-full scrollbar-thin">
      {STAGES.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stageId={stage.id}
          label={stage.label}
          color={stage.color}
          deals={deals.filter((d) => d.stage === stage.id)}
          onDealClick={onDealClick}
          onDrop={onMoveDeal}
        />
      ))}
    </div>
  );
}
