import { Opportunity, formatCurrency, formatDate } from '@/data/mockData';
import { Calendar, DollarSign, Flag } from 'lucide-react';
import { useWarRoom } from '@/context/WarRoomContext';

interface DealCardProps {
  deal: Opportunity;
  onClick: (deal: Opportunity) => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const { isInWarRoom } = useWarRoom();
  const warRoomItem = isInWarRoom(deal.name, deal.accountName, deal.id);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('dealId', deal.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onClick(deal)}
      className="bg-card rounded-lg border border-border p-3.5 cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{deal.accountName}</p>
          {warRoomItem && (
            <span
              title={`In War Room (${warRoomItem.status})`}
              className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                warRoomItem.status === 'approved'
                  ? 'bg-success/15 text-success'
                  : warRoomItem.status === 'rejected'
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-primary/15 text-primary'
              }`}
            >
              <Flag className="w-2.5 h-2.5" />
              WR
            </span>
          )}
        </div>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 text-primary-foreground"
          style={{ backgroundColor: deal.owner.color }}
          title={deal.owner.name}
        >
          {deal.owner.initials}
        </div>
      </div>

      <p className="text-sm font-semibold text-foreground mb-3 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {deal.name}
      </p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1 font-semibold text-foreground">
          <DollarSign className="w-3 h-3" />
          {formatCurrency(deal.value)}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(deal.closeDate)}
        </span>
      </div>
    </div>
  );
}
