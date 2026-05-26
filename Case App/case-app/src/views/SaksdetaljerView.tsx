import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import {
  addComment,
  closeCase,
  escalateCase,
  fetchCase,
  fetchCaseEvents,
  reopenCase,
  resolveCase,
  startCase,
  takeCase,
} from '../lib/caseService';
import { getActor, getAppContext } from '../lib/session';
import { Case, CaseEvent } from '../lib/types';
import { formatDateTime, formatRelative, gruppeLabel, slaStatus } from '../lib/formatters';

const EVENT_LABELS: Record<string, string> = {
  created: 'Opprettet',
  status_changed: 'Status endret',
  assigned: 'Tildelt',
  comment: 'Kommentar',
  escalated: 'Eskalert',
  sla_warning: 'SLA-varsel',
  sla_breached: 'SLA brutt',
  reopened: 'Gjenåpnet',
  closed: 'Lukket',
  resolved: 'Løst',
};

export function SaksdetaljerView() {
  const { id = '' } = useParams();
  const actor = getActor();
  const ctx = getAppContext();
  const isKundeservice = ctx?.mode !== 'teknisk';

  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [c, ev] = await Promise.all([fetchCase(id), fetchCaseEvents(id)]);
      setCaseItem(c);
      setEvents(ev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente sak');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const backPath = isKundeservice ? '/kundeservice' : '/teknisk';

  const run = async (fn: () => Promise<Case>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Handling feilet');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Saksdetaljer" subtitle="Laster…">
        <div className="py-16 text-center text-slate-400 text-sm">Henter sak…</div>
      </Layout>
    );
  }

  if (!caseItem) {
    return (
      <Layout title="Saksdetaljer">
        <div className="py-16 text-center">
          <p className="text-slate-500 mb-4">{error || 'Sak ikke funnet'}</p>
          <Link to={backPath} className="text-telenor-blue text-sm font-medium">← Tilbake</Link>
        </div>
      </Layout>
    );
  }

  const sla = slaStatus(caseItem);

  return (
    <Layout
      title={caseItem.saksnummer}
      subtitle={caseItem.tittel}
      actions={
        <Link to={backPath} className="text-sm text-telenor-blue font-medium hover:underline">
          ← Tilbake
        </Link>
      }
    >
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <StatusBadge status={caseItem.status} />
              <PriorityBadge prioritet={caseItem.prioritet} />
              <span className="text-xs text-slate-500">{caseItem.typeNavn ?? caseItem.typeKode}</span>
            </div>
            {caseItem.beskrivelse && (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{caseItem.beskrivelse}</p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Gruppe</dt>
                <dd className="font-medium">{gruppeLabel(caseItem.tildeltGruppe)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Kilde</dt>
                <dd className="font-medium">{caseItem.kilde}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Opprettet</dt>
                <dd>{formatDateTime(caseItem.opprettet)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Sist oppdatert</dt>
                <dd>{formatDateTime(caseItem.sistOppdatert)}</dd>
              </div>
              {caseItem.slaFrist && (
                <div className="col-span-2">
                  <dt className="text-xs text-slate-400">SLA-frist</dt>
                  <dd className={sla === 'breach' ? 'text-red-600 font-semibold' : sla === 'warning' ? 'text-amber-600 font-medium' : ''}>
                    {formatDateTime(caseItem.slaFrist)} ({formatRelative(caseItem.slaFrist)})
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Hendelseslogg</h2>
            {events.length === 0 ? (
              <p className="text-sm text-slate-400">Ingen hendelser ennå</p>
            ) : (
              <ol className="relative border-l border-slate-200 ml-2 space-y-4">
                {events.map((ev) => (
                  <li key={ev.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-telenor-light border-2 border-white" />
                    <div className="text-xs text-slate-400">{formatDateTime(ev.tidspunkt)}</div>
                    <div className="text-sm font-medium text-slate-800">
                      {EVENT_LABELS[ev.hendelseType] ?? ev.hendelseType}
                      {ev.tilStatus && (
                        <span className="text-slate-500 font-normal"> → {ev.tilStatus}</span>
                      )}
                    </div>
                    {ev.utførtAvNavn && (
                      <div className="text-xs text-slate-500">{ev.utførtAvNavn}</div>
                    )}
                    {ev.kommentar && (
                      <p className="mt-1 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{ev.kommentar}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Kunde</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Navn</dt>
                <dd>{caseItem.kundeNavn ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">E-post</dt>
                <dd>{caseItem.kundeEpost ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Telefon</dt>
                <dd>{caseItem.kundeTelefon ?? '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-800">Handlinger</h2>

            {!isKundeservice && ['TILDELT', 'OPPRETTET', 'GJENÅPNET'].includes(caseItem.status) && (
              <ActionButton disabled={busy} onClick={() => run(() => takeCase(caseItem.id, actor))}>
                Ta sak
              </ActionButton>
            )}
            {!isKundeservice && ['TILDELT', 'GJENÅPNET'].includes(caseItem.status) && (
              <ActionButton disabled={busy} onClick={() => run(() => startCase(caseItem.id, actor))}>
                Start arbeid
              </ActionButton>
            )}
            {!isKundeservice && ['UNDER_ARBEID', 'UNDER_ARBEID_2LINJE', 'ESKALERT'].includes(caseItem.status) && (
              <>
                <ActionButton
                  primary
                  disabled={busy}
                  onClick={() => run(() => resolveCase(caseItem.id, actor, 'Løst'))}
                >
                  Merk som løst
                </ActionButton>
                <ActionButton
                  disabled={busy}
                  onClick={() => run(() => escalateCase(caseItem.id, actor, 'Eskalert'))}
                >
                  Eskaler
                </ActionButton>
              </>
            )}

            {isKundeservice && caseItem.status === 'LØST' && (
              <ActionButton
                primary
                disabled={busy}
                onClick={() => run(() => closeCase(caseItem.id, actor, 'Lukket av kundeservice'))}
              >
                Lukk sak
              </ActionButton>
            )}

            {isKundeservice && caseItem.status === 'LUKKET' && (
              <div className="space-y-2">
                <input
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Grunn for gjenåpning"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <ActionButton
                  disabled={busy || !reopenReason.trim()}
                  onClick={() => run(() => reopenCase(caseItem.id, actor, reopenReason.trim()))}
                >
                  Gjenåpne
                </ActionButton>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="Legg til kommentar…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <ActionButton
                disabled={busy || !comment.trim()}
                onClick={() => run(async () => {
                  const updated = await addComment(caseItem.id, actor, comment.trim());
                  setComment('');
                  return updated;
                })}
              >
                Legg til kommentar
              </ActionButton>
            </div>
          </section>
        </aside>
      </div>
    </Layout>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
        primary
          ? 'bg-telenor-blue text-white hover:bg-telenor-blue-dark'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}
