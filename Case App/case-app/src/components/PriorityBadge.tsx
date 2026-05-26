import { SakPrioritet, PRIORITET_LABELS } from '../lib/types';

const STYLES: Record<SakPrioritet, string> = {
  lav: 'bg-slate-100 text-slate-600',
  normal: 'bg-slate-100 text-slate-700',
  høy: 'bg-orange-100 text-orange-800',
  kritisk: 'bg-red-100 text-red-800',
};

export function PriorityBadge({ prioritet }: { prioritet: SakPrioritet }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STYLES[prioritet]}`}>
      {PRIORITET_LABELS[prioritet]}
    </span>
  );
}
