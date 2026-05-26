import { Case } from '../lib/types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { formatDateTime, formatRelative, gruppeLabel, slaStatus } from '../lib/formatters';

interface CaseRowProps {
  caseItem: Case;
  onClick: () => void;
  highlight?: boolean;
}

export function CaseRow({ caseItem, onClick, highlight }: CaseRowProps) {
  const sla = slaStatus(caseItem);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border bg-white px-4 py-3 transition hover:border-telenor-blue/40 hover:shadow-sm ${
        highlight ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
      } ${sla === 'breach' ? 'border-l-4 border-l-red-500' : sla === 'warning' ? 'border-l-4 border-l-amber-400' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-telenor-blue">{caseItem.saksnummer}</span>
            <StatusBadge status={caseItem.status} />
            <PriorityBadge prioritet={caseItem.prioritet} />
          </div>
          <div className="mt-1 font-medium text-slate-900 truncate">{caseItem.tittel}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{caseItem.typeNavn ?? caseItem.typeKode}</span>
            <span>{gruppeLabel(caseItem.tildeltGruppe)}</span>
            {caseItem.kundeNavn && <span>{caseItem.kundeNavn}</span>}
          </div>
        </div>
        <div className="text-right text-xs text-slate-400 shrink-0">
          <div>{formatDateTime(caseItem.sistOppdatert)}</div>
          {caseItem.slaFrist && (
            <div className={sla === 'breach' ? 'text-red-600 font-medium' : sla === 'warning' ? 'text-amber-600' : ''}>
              SLA {formatRelative(caseItem.slaFrist)}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
