import { SakStatus, STATUS_LABELS } from '../lib/types';

const STYLES: Record<SakStatus, string> = {
  OPPRETTET: 'bg-slate-100 text-slate-700',
  TILDELT: 'bg-blue-100 text-blue-800',
  UNDER_ARBEID: 'bg-amber-100 text-amber-900',
  ESKALERT: 'bg-orange-100 text-orange-900',
  UNDER_ARBEID_2LINJE: 'bg-purple-100 text-purple-900',
  LØST: 'bg-emerald-100 text-emerald-800',
  LUKKET: 'bg-slate-200 text-slate-600',
  GJENÅPNET: 'bg-violet-100 text-violet-900',
};

export function StatusBadge({ status }: { status: SakStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
