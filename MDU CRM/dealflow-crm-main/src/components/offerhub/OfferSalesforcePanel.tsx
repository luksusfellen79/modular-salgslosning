import React from 'react';
import { ChevronRight, User, Calendar, Hash, TrendingUp } from 'lucide-react';
import { Opportunity, STAGES, formatCurrency, formatDate } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface OfferOpportunitiesPanelProps {
  opportunities: Opportunity[];
  onSelectOpportunity?: (opp: Opportunity) => void;
  selectedId?: string;
}

const stageColors: Record<string, string> = {
  'prospect':      'bg-muted text-muted-foreground',
  'qualification': 'bg-stage-qualification/10 text-stage-qualification',
  'proposal':      'bg-stage-proposal/10 text-stage-proposal',
  'negotiation':   'bg-warning/10 text-warning',
  'closed-won':    'bg-success/10 text-success',
  'closed-lost':   'bg-destructive/10 text-destructive',
};

export const OfferSalesforcePanel: React.FC<OfferOpportunitiesPanelProps> = ({
  opportunities,
  onSelectOpportunity,
  selectedId,
}) => {
  const stageLabel = (stageId: string) =>
    STAGES.find((s) => s.id === stageId)?.label ?? stageId;

  return (
    <div className="rounded-xl border bg-card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-sm text-foreground">Muligheter</h3>
          <p className="text-[10px] text-muted-foreground">{opportunities.length} deals i pipeline</p>
        </div>
      </div>

      <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Velg deal</p>

      <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin pr-1">
        {opportunities.map((opp) => (
          <button
            key={opp.id}
            onClick={() => onSelectOpportunity?.(opp)}
            className={cn(
              'w-full text-left p-3 rounded-xl border transition-all duration-200',
              selectedId === opp.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30 hover:bg-muted/50'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{opp.accountName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{opp.name}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
            </div>

            <div className="mt-2">
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', stageColors[opp.stage] ?? 'bg-muted text-muted-foreground')}>
                {stageLabel(opp.stage)}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1">
                <User className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground truncate">{opp.contactName ?? '—'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Hash className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{opp.units} enheter</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{formatDate(opp.closeDate)}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{formatCurrency(opp.value)}</span>
              </div>
            </div>

            {selectedId === opp.id && (
              <p className="text-[10px] font-semibold text-primary mt-2">✓ Valgt for tilbud</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
