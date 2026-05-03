import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  fetchOpportunities,
  updateOpportunityWarRoom,
  SalesCoreOpportunity,
  WarRoomStatus,
} from '@/lib/salesCore';
import { Shield, ShieldCheck, ShieldX, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });

const STAGE_LABELS: Record<string, string> = {
  prospect: 'Prospekt',
  qualification: 'Kontaktet',
  proposal: 'Tilbud sendt',
  negotiation: 'Forhandling',
  'closed-won': 'Vunnet/Tapt',
};

type ActionState = { loading: boolean; error?: string };

export default function WarRoom() {
  const [deals, setDeals] = useState<SalesCoreOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<Record<string, ActionState>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    setLoading(true);
    fetchOpportunities()
      .then((data) => setDeals(data))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = deals.filter((d) => d.warRoomStatus === 'pending');
  const decided = deals.filter((d) => d.warRoomStatus === 'approved' || d.warRoomStatus === 'rejected');

  async function handleDecision(id: string, status: 'approved' | 'rejected') {
    setActions((a) => ({ ...a, [id]: { loading: true } }));
    try {
      const note = notes[id]?.trim() || undefined;
      const updated = await updateOpportunityWarRoom(id, status, note);
      setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (e) {
      setActions((a) => ({ ...a, [id]: { loading: false, error: 'Noe gikk galt' } }));
      return;
    }
    setActions((a) => ({ ...a, [id]: { loading: false } }));
  }

  function toggleExpand(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  return (
    <AppLayout>
      <div className="px-8 py-6 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">War Room</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? 'Laster...' : `${pending.length} deal${pending.length !== 1 ? 's' : ''} venter godkjenning`}
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Henter War Room...</span>
          </div>
        )}

        {/* Pending deals */}
        {!loading && pending.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="text-base font-semibold text-foreground">Ingen deals venter godkjenning</p>
            <p className="text-sm text-muted-foreground">Selgerne har ikke sendt noen deals til War Room ennå.</p>
          </div>
        )}

        {!loading && pending.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Venter godkjenning</h2>
            {pending.map((deal) => {
              const act = actions[deal.id];
              const isExpanded = expanded[deal.id];
              return (
                <div key={deal.id} className="bg-card border border-amber-400/40 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
                            <Shield className="w-2.5 h-2.5" /> WAR ROOM
                          </span>
                          <span className="text-xs text-muted-foreground">{STAGE_LABELS[deal.stage] ?? deal.stage}</span>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">{deal.accountName}</p>
                        <h3 className="text-base font-bold text-foreground leading-tight">{deal.name}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="font-semibold text-foreground">{formatCurrency(deal.estimatedAnnualValue)}</span>
                          <span className="text-muted-foreground">{deal.units} enheter</span>
                          <span className="text-muted-foreground">{formatDate(deal.closeDate)}</span>
                          <span className="text-muted-foreground">Selger: {deal.salesRepName ?? 'Ukjent'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Note input */}
                    <div className="mt-4">
                      <button
                        onClick={() => toggleExpand(deal.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        Legg til kommentar (valgfritt)
                      </button>
                      {isExpanded && (
                        <textarea
                          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                          rows={2}
                          placeholder="Kommentar til selger..."
                          value={notes[deal.id] ?? ''}
                          onChange={(e) => setNotes((n) => ({ ...n, [deal.id]: e.target.value }))}
                        />
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleDecision(deal.id, 'approved')}
                        disabled={act?.loading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      >
                        {act?.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Godkjenn
                      </button>
                      <button
                        onClick={() => handleDecision(deal.id, 'rejected')}
                        disabled={act?.loading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-50"
                      >
                        {act?.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Avvis
                      </button>
                    </div>

                    {act?.error && <p className="text-xs text-destructive mt-2">{act.error}</p>}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Decided deals */}
        {!loading && decided.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Avgjort</h2>
            {decided.map((deal) => {
              const approved = deal.warRoomStatus === 'approved';
              return (
                <div key={deal.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4 opacity-75 hover:opacity-100 transition-opacity">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{deal.accountName} · {deal.salesRepName ?? 'Ukjent'}</p>
                    <p className="text-sm font-semibold text-foreground">{deal.name}</p>
                    {deal.warRoomNote && (
                      <p className="text-xs text-muted-foreground mt-0.5">Kommentar: {deal.warRoomNote}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(deal.estimatedAnnualValue)}</span>
                    {approved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-600">
                        <ShieldCheck className="w-3.5 h-3.5" /> Godkjent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-destructive/15 text-destructive">
                        <ShieldX className="w-3.5 h-3.5" /> Avvist
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
