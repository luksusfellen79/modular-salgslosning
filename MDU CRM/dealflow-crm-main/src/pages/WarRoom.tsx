import { AppLayout } from '@/components/layout/AppLayout';
import { useWarRoom, AREA_BENCHMARKS } from '@/context/WarRoomContext';
import { formatCurrency, formatDateTime } from '@/data/mockData';
import { Flag, Check, X, Clock, MessageSquare, MapPin, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function WarRoom() {
  const { items, approve, reject } = useWarRoom();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);
  const counts = {
    pending: items.filter((i) => i.status === 'pending').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
  };

  return (
    <AppLayout>
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">War Room</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deals awaiting manager approval · {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected
          </p>
        </div>
        <div className="flex gap-1 rounded-xl p-1 bg-muted">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all',
                filter === f ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Flag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No deals in War Room</p>
            <p className="text-sm text-muted-foreground mt-1">
              Send an offer to War Room from the Offer Hub to request manager approval.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-4xl mx-auto">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{item.accountName}</p>
                    <h3 className="font-bold text-foreground text-lg">{item.dealName}</h3>
                    {item.packageName && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {item.packageName}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="grid grid-cols-3 gap-4 py-3 border-y border-border mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Value</p>
                    <p className="font-semibold text-foreground">{formatCurrency(item.value)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Discount</p>
                    <p className="font-semibold text-foreground">{item.discount}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-semibold text-foreground text-sm">{formatDateTime(item.submittedAt)}</p>
                  </div>
                </div>

                {item.notes && (
                  <div className="mb-3 p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Note from {item.submittedBy}
                    </p>
                    <p className="text-sm text-foreground">{item.notes}</p>
                  </div>
                )}

                {item.area && item.pricePerUnit !== undefined && AREA_BENCHMARKS[item.area] && (
                  <AreaBenchmark
                    area={item.area}
                    offerPrice={item.pricePerUnit}
                    units={item.units}
                  />
                )}

                {item.managerComment && (
                  <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-primary font-semibold mb-1">Manager comment</p>
                    <p className="text-sm text-foreground">{item.managerComment}</p>
                  </div>
                )}

                {item.status === 'pending' && (
                  <div className="flex gap-2 items-start">
                    <input
                      type="text"
                      placeholder="Optional comment..."
                      value={commentDraft[item.id] || ''}
                      onChange={(e) => setCommentDraft((p) => ({ ...p, [item.id]: e.target.value }))}
                      className="flex-1 text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => approve(item.id, commentDraft[item.id])}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-success text-success-foreground font-medium text-sm hover:opacity-90 transition"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => reject(item.id, commentDraft[item.id])}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium text-sm hover:opacity-90 transition"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function AreaBenchmark({
  area,
  offerPrice,
  units,
}: {
  area: string;
  offerPrice: number;
  units?: number;
}) {
  const benchmark = AREA_BENCHMARKS[area];
  if (!benchmark) return null;
  const diff = offerPrice - benchmark.avgPricePerUnit;
  const pctDiff = (diff / benchmark.avgPricePerUnit) * 100;
  const isLower = diff < 0;
  return (
    <div className="mb-3 p-3 rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          Områdesbenchmark – {area}
        </p>
        <span className="text-[10px] text-muted-foreground">
          Snitt fra {benchmark.sampleSize} kunder
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tilbud</p>
          <p className="text-base font-bold text-foreground">{offerPrice} kr</p>
          <p className="text-[10px] text-muted-foreground">per enhet/mnd</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Snitt i området</p>
          <p className="text-base font-bold text-foreground">{benchmark.avgPricePerUnit} kr</p>
          <p className="text-[10px] text-muted-foreground">per enhet/mnd</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avvik</p>
          <p
            className={cn(
              'text-base font-bold flex items-center gap-1',
              isLower ? 'text-destructive' : 'text-success'
            )}
          >
            {isLower ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            {diff > 0 ? '+' : ''}
            {diff} kr
          </p>
          <p className="text-[10px] text-muted-foreground">
            {pctDiff > 0 ? '+' : ''}
            {pctDiff.toFixed(1)}%
          </p>
        </div>
      </div>
      {units && (
        <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border">
          Med {units} enheter: {isLower ? 'tap' : 'gevinst'} på{' '}
          <strong className={isLower ? 'text-destructive' : 'text-success'}>
            {Math.abs(diff * units).toLocaleString('nb-NO')} kr/mnd
          </strong>{' '}
          vs. snittprisen i {area}.
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const map = {
    pending: { icon: Clock, cls: 'bg-stage-proposal/10 text-stage-proposal border-stage-proposal/20', label: 'Pending' },
    approved: { icon: Check, cls: 'bg-success/10 text-success border-success/20', label: 'Approved' },
    rejected: { icon: X, cls: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Rejected' },
  } as const;
  const { icon: Icon, cls, label } = map[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border', cls)}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}