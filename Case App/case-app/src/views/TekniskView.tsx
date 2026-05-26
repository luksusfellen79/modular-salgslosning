import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CaseRow } from '../components/CaseRow';
import { fetchQueue, takeCase, startCase, resolveCase, escalateCase } from '../lib/caseService';
import { getActor, getAppContext } from '../lib/session';
import { Case } from '../lib/types';
import { gruppeLabel, isOpenStatus } from '../lib/formatters';

export function TekniskView() {
  const navigate = useNavigate();
  const ctx = getAppContext();
  const gruppe = ctx?.gruppe ?? 'teknisk-fiber';
  const actor = getActor();

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [showOpenOnly, setShowOpenOnly] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchQueue(gruppe, 100);
      setCases(result.cases);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente kø');
    } finally {
      setLoading(false);
    }
  }, [gruppe]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = showOpenOnly ? cases.filter((c) => isOpenStatus(c.status)) : cases;

  const runAction = async (id: string, action: 'take' | 'start' | 'resolve' | 'escalate') => {
    setActionId(id);
    setError('');
    try {
      if (action === 'take') await takeCase(id, actor);
      else if (action === 'start') await startCase(id, actor);
      else if (action === 'resolve') await resolveCase(id, actor, 'Løst av teknisk gruppe');
      else if (action === 'escalate') await escalateCase(id, actor, 'Eskalert fra kø');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Handling feilet');
    } finally {
      setActionId(null);
    }
  };

  return (
    <Layout
      title="Teknisk kø"
      subtitle={gruppeLabel(gruppe)}
      actions={
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showOpenOnly}
            onChange={(e) => setShowOpenOnly(e.target.checked)}
            className="rounded"
          />
          Kun åpne
        </label>
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{visible.length} saker i køen</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Oppdater
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Laster kø…</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Køen er tom 🎉</div>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => (
            <div key={c.id} className="space-y-2">
              <CaseRow caseItem={c} onClick={() => navigate(`/sak/${c.id}`)} highlight={c.slaBrudd} />
              <div className="flex flex-wrap gap-2 pl-1">
                {['TILDELT', 'OPPRETTET', 'GJENÅPNET'].includes(c.status) && (
                  <ActionBtn
                    label="Ta sak"
                    busy={actionId === c.id}
                    onClick={() => void runAction(c.id, 'take')}
                  />
                )}
                {['TILDELT', 'GJENÅPNET'].includes(c.status) && (
                  <ActionBtn
                    label="Start"
                    busy={actionId === c.id}
                    onClick={() => void runAction(c.id, 'start')}
                  />
                )}
                {['UNDER_ARBEID', 'UNDER_ARBEID_2LINJE', 'ESKALERT'].includes(c.status) && (
                  <>
                    <ActionBtn
                      label="Løs"
                      primary
                      busy={actionId === c.id}
                      onClick={() => void runAction(c.id, 'resolve')}
                    />
                    <ActionBtn
                      label="Eskaler"
                      busy={actionId === c.id}
                      onClick={() => void runAction(c.id, 'escalate')}
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

function ActionBtn({
  label,
  onClick,
  busy,
  primary,
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-50 ${
        primary
          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {busy ? '…' : label}
    </button>
  );
}
