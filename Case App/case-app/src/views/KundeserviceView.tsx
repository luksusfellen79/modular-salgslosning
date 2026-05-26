import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CaseRow } from '../components/CaseRow';
import { CreateCaseModal } from '../components/CreateCaseModal';
import { createCase, fetchCases } from '../lib/caseService';
import { getActor } from '../lib/session';
import { useCaseEventStream } from '../lib/eventStream';
import { Case, CaseAlert, SakStatus } from '../lib/types';

const STATUS_FILTERS: { value: '' | SakStatus; label: string }[] = [
  { value: '', label: 'Alle' },
  { value: 'OPPRETTET', label: 'Opprettet' },
  { value: 'TILDELT', label: 'Tildelt' },
  { value: 'UNDER_ARBEID', label: 'Under arbeid' },
  { value: 'ESKALERT', label: 'Eskalert' },
  { value: 'LØST', label: 'Løst' },
  { value: 'LUKKET', label: 'Lukket' },
  { value: 'GJENÅPNET', label: 'Gjenåpnet' },
];

export function KundeserviceView() {
  const navigate = useNavigate();
  const actor = getActor();
  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | SakStatus>('');
  const [showCreate, setShowCreate] = useState(false);
  const [alerts, setAlerts] = useState<CaseAlert[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchCases({
        q: q.trim() || undefined,
        status: status || undefined,
        limit: 100,
      });
      setCases(result.cases);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente saker');
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const onAlert = useCallback((alert: CaseAlert) => {
    setAlerts((prev) => [alert, ...prev].slice(0, 8));
    void load();
  }, [load]);

  useCaseEventStream(onAlert);

  return (
    <Layout
      title="Kundeservice"
      subtitle={`${total} saker totalt`}
      actions={
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-telenor-blue px-4 py-2 text-sm font-semibold text-white hover:bg-telenor-blue-dark"
        >
          + Ny sak
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Søk saksnummer, tittel, kunde…"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | SakStatus)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.label} value={f.value}>{f.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
              Oppdater
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Laster saker…</div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">Ingen saker funnet</div>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <CaseRow
                  key={c.id}
                  caseItem={c}
                  highlight={c.slaBrudd}
                  onClick={() => navigate(`/sak/${c.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Sanntidsvarsler</h3>
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-400">Lytter på case-hendelser…</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => a.caseId && navigate(`/sak/${a.caseId}`)}
                      className="w-full text-left rounded-lg bg-slate-50 px-3 py-2 hover:bg-blue-50 transition"
                    >
                      <div className="text-xs font-medium text-slate-800">{a.message}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(a.at).toLocaleTimeString('nb-NO')}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <CreateCaseModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={async (data) => {
          const created = await createCase(actor, data);
          await load();
          navigate(`/sak/${created.id}`);
        }}
      />
    </Layout>
  );
}
