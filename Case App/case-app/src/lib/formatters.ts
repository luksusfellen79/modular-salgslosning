import { SakPrioritet, SakStatus } from './types';

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('nb-NO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(iso?: string): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  if (mins < 60) return diff < 0 ? `${mins} min siden` : `om ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return diff < 0 ? `${hours} t siden` : `om ${hours} t`;
  const days = Math.round(hours / 24);
  return diff < 0 ? `${days} d siden` : `om ${days} d`;
}

export function slaStatus(caseItem: { slaFrist?: string; slaBrudd: boolean }): 'ok' | 'warning' | 'breach' | 'none' {
  if (caseItem.slaBrudd) return 'breach';
  if (!caseItem.slaFrist) return 'none';
  const ms = new Date(caseItem.slaFrist).getTime() - Date.now();
  if (ms < 0) return 'breach';
  if (ms < 2 * 60 * 60 * 1000) return 'warning';
  return 'ok';
}

export function isOpenStatus(status: SakStatus): boolean {
  return !['LUKKET', 'LØST'].includes(status);
}

export function priorityRank(p: SakPrioritet): number {
  const map: Record<SakPrioritet, number> = { kritisk: 0, høy: 1, normal: 2, lav: 3 };
  return map[p];
}

export function gruppeLabel(gruppe?: string): string {
  if (!gruppe) return '—';
  if (gruppe === 'kundeservice') return 'Kundeservice';
  return gruppe.replace('teknisk-', '').replace(/^\w/, (c) => c.toUpperCase());
}
