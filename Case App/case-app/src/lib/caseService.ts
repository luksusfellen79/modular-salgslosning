import { Case, CaseEvent, CaseListResponse, CaseType, SakPrioritet, SakStatus } from './types';
import { CaseActor } from './types';

const BASE =
  (import.meta.env.VITE_CASE_SERVICE_URL as string | undefined)
  ?? 'http://localhost:3006';

function actorHeaders(actor: CaseActor): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-bruker-id': actor.brukerId,
    'x-bruker-navn': actor.brukerNavn,
  };
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({})) as { error?: string };
  return data.error ?? `HTTP ${res.status}`;
}

export async function fetchCaseTypes(): Promise<CaseType[]> {
  const res = await fetch(`${BASE}/api/typer`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<CaseType[]>;
}

export async function fetchCases(params: {
  status?: SakStatus;
  gruppe?: string;
  typeKode?: string;
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<CaseListResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.gruppe) qs.set('gruppe', params.gruppe);
  if (params.typeKode) qs.set('typeKode', params.typeKode);
  if (params.q) qs.set('q', params.q);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));

  const res = await fetch(`${BASE}/api/cases?${qs}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<CaseListResponse>;
}

export async function fetchQueue(gruppe: string, limit = 50): Promise<CaseListResponse> {
  const res = await fetch(`${BASE}/api/queue/${encodeURIComponent(gruppe)}?limit=${limit}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<CaseListResponse>;
}

export async function fetchCase(id: string): Promise<Case> {
  const res = await fetch(`${BASE}/api/cases/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Case>;
}

export async function fetchCaseEvents(id: string): Promise<CaseEvent[]> {
  const res = await fetch(`${BASE}/api/cases/${encodeURIComponent(id)}/hendelser`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<CaseEvent[]>;
}

export async function createCase(
  actor: CaseActor,
  input: {
    typeKode: string;
    tittel: string;
    beskrivelse?: string;
    prioritet?: SakPrioritet;
    kundeNavn?: string;
    kundeEpost?: string;
    kundeTelefon?: string;
  },
): Promise<Case> {
  const res = await fetch(`${BASE}/api/cases`, {
    method: 'POST',
    headers: actorHeaders(actor),
    body: JSON.stringify({
      ...input,
      opprettetAv: actor.brukerId,
      opprettetAvNavn: actor.brukerNavn,
      kilde: 'case-app',
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Case>;
}

export async function takeCase(id: string, actor: CaseActor): Promise<Case> {
  const res = await fetch(`${BASE}/api/cases/${encodeURIComponent(id)}/take`, {
    method: 'POST',
    headers: actorHeaders(actor),
    body: JSON.stringify(actor),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Case>;
}

export async function startCase(id: string, actor: CaseActor): Promise<Case> {
  const res = await fetch(`${BASE}/api/cases/${encodeURIComponent(id)}/start`, {
    method: 'POST',
    headers: actorHeaders(actor),
    body: JSON.stringify(actor),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Case>;
}

export async function resolveCase(id: string, actor: CaseActor, kommentar?: string): Promise<Case> {
  const res = await fetch(`${BASE}/api/cases/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    headers: actorHeaders(actor),
    body: JSON.stringify({ ...actor, kommentar }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Case>;
}

export async function closeCase(id: string, actor: CaseActor, kommentar?: string): Promise<Case> {
  const res = await fetch(`${BASE}/api/cases/${encodeURIComponent(id)}/close`, {
    method: 'POST',
    headers: actorHeaders(actor),
    body: JSON.stringify({ ...actor, kommentar }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Case>;
}

export async function reopenCase(
  id: string,
  actor: CaseActor,
  grunn: string,
  kommentar?: string,
): Promise<Case> {
  const res = await fetch(`${BASE}/api/cases/${encodeURIComponent(id)}/reopen`, {
    method: 'POST',
    headers: actorHeaders(actor),
    body: JSON.stringify({ ...actor, grunn, kommentar }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Case>;
}

export async function escalateCase(
  id: string,
  actor: CaseActor,
  kommentar?: string,
  malgruppe?: string,
): Promise<Case> {
  const res = await fetch(`${BASE}/api/cases/${encodeURIComponent(id)}/escalate`, {
    method: 'POST',
    headers: actorHeaders(actor),
    body: JSON.stringify({ ...actor, kommentar, malgruppe }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Case>;
}

export async function addComment(id: string, actor: CaseActor, tekst: string): Promise<Case> {
  const res = await fetch(`${BASE}/api/cases/${encodeURIComponent(id)}/kommentarer`, {
    method: 'POST',
    headers: actorHeaders(actor),
    body: JSON.stringify({ ...actor, tekst }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Case>;
}
