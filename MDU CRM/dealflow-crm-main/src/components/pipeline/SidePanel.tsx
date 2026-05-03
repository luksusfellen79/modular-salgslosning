import { X, Phone, Mail, Video, CheckSquare, Building2, User, Calendar, DollarSign, TrendingUp, ArrowRight, FileText, Send, ExternalLink, Loader2, Shield, ShieldCheck, ShieldX, Lock } from 'lucide-react';
import { Opportunity, formatCurrency, formatDate, formatDateTime, WarRoomStatus } from '@/data/mockData';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOffersByOpportunity, SalesCoreOffer, updateOpportunityWarRoom } from '@/lib/salesCore';
import { cn } from '@/lib/utils';

interface SidePanelProps {
  deal: Opportunity;
  onClose: () => void;
}

const tabs = ['Overview', 'Tilbud', 'Aktivitet'] as const;

const offerStatusLabel: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Kladd',    cls: 'bg-muted text-muted-foreground' },
  sent:     { label: 'Sendt',    cls: 'bg-primary/10 text-primary' },
  viewed:   { label: 'Åpnet',   cls: 'bg-amber-500/10 text-amber-600' },
  accepted: { label: 'Akseptert', cls: 'bg-success/10 text-success' },
  declined: { label: 'Avslått', cls: 'bg-destructive/10 text-destructive' },
  expired:  { label: 'Utgått',  cls: 'bg-muted text-muted-foreground' },
};

export function SidePanel({ deal, onClose }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Overview');
  const [warRoomStatus, setWarRoomStatus] = useState<WarRoomStatus | undefined>(deal.warRoomStatus);
  const [warRoomNote, setWarRoomNote] = useState<string | undefined>(deal.warRoomNote);
  const [sendingToWarRoom, setSendingToWarRoom] = useState(false);
  const navigate = useNavigate();

  const isFrozen = warRoomStatus === 'pending';

  async function handleSendToWarRoom() {
    setSendingToWarRoom(true);
    try {
      const updated = await updateOpportunityWarRoom(deal.id, 'pending');
      setWarRoomStatus(updated.warRoomStatus);
      setWarRoomNote(updated.warRoomNote);
    } catch (e) {
      console.error('War Room feil:', e);
    } finally {
      setSendingToWarRoom(false);
    }
  }

  const warRoomBadge = () => {
    if (warRoomStatus === 'pending') return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 text-xs font-semibold">
        <Lock className="w-3 h-3" /> Venter godkjenning
      </span>
    );
    if (warRoomStatus === 'approved') return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 text-xs font-semibold">
        <ShieldCheck className="w-3 h-3" /> Godkjent
      </span>
    );
    if (warRoomStatus === 'rejected') return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/15 text-destructive text-xs font-semibold">
        <ShieldX className="w-3 h-3" /> Avvist
      </span>
    );
    return null;
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-card shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-1">{deal.accountName}</p>
              <h2 className="text-lg font-bold text-foreground truncate">{deal.name}</h2>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {!warRoomStatus && (
                <button
                  onClick={handleSendToWarRoom}
                  disabled={sendingToWarRoom}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {sendingToWarRoom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                  War Room
                </button>
              )}
              <button
                onClick={() => { onClose(); navigate(`/offer-hub?opportunityId=${deal.id}`); }}
                disabled={isFrozen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText className="w-3.5 h-3.5" />
                Bygg tilbud
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* War Room status badge + note */}
          {warRoomStatus && (
            <div className="mb-3 flex flex-col gap-1.5">
              {warRoomBadge()}
              {warRoomStatus === 'rejected' && warRoomNote && (
                <p className="text-xs text-muted-foreground pl-1">Kommentar: {warRoomNote}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <DollarSign className="w-4 h-4 text-primary" />
              {formatCurrency(deal.value)}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {formatDate(deal.closeDate)}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              {deal.probability}%
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {activeTab === 'Overview' && <OverviewTab deal={deal} />}
          {activeTab === 'Tilbud' && <OffersTab dealId={deal.id} onNavigate={() => { onClose(); navigate(`/offer-hub?opportunityId=${deal.id}`); }} />}
          {activeTab === 'Aktivitet' && <ActivityTab />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ deal }: { deal: Opportunity }) {
  const fields = [
    { icon: Building2, label: 'Account', value: deal.accountName },
    { icon: User, label: 'Kontakt', value: deal.contactName || '—' },
    { icon: Mail, label: 'E-post', value: deal.contactEmail || '—' },
    { icon: Phone, label: 'Telefon', value: deal.phone || '—' },
    { icon: TrendingUp, label: 'Kilde', value: deal.source || '—' },
    { icon: CheckSquare, label: 'Type', value: deal.type || '—' },
    { icon: Calendar, label: 'Opprettet', value: deal.createdDate ? formatDate(deal.createdDate) : '—' },
  ];

  return (
    <div className="space-y-4">
      {deal.description && (
        <p className="text-sm text-muted-foreground leading-relaxed pb-4 border-b border-border">{deal.description}</p>
      )}
      {fields.map((f) => (
        <div key={f.label} className="flex items-center gap-3 py-1.5">
          <f.icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground w-20 shrink-0">{f.label}</span>
          <span className="text-sm font-medium text-foreground">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

function OffersTab({ dealId, onNavigate }: { dealId: string; onNavigate: () => void }) {
  const [offers, setOffers] = useState<SalesCoreOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffersByOpportunity(dealId)
      .then(setOffers)
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, [dealId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> <span className="text-sm">Henter tilbud...</span>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Send className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">Ingen tilbud sendt ennå</p>
        <p className="text-xs text-muted-foreground">Klikk «Bygg tilbud» for å opprette et tilbud for denne dealen.</p>
        <button
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors mt-1"
        >
          <FileText className="w-3.5 h-3.5" /> Bygg tilbud
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => {
        const status = offerStatusLabel[offer.status] ?? { label: offer.status, cls: 'bg-muted text-muted-foreground' };
        return (
          <div key={offer.id} className="rounded-xl border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{offer.packageName}</span>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', status.cls)}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{offer.monthlyPricePerUnit} kr/mnd</span>
              <span>· {offer.discountPercent}% rabatt</span>
              <span>· {offer.units} enheter</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Gyldig til {offer.validUntil}</span>
              <span>· {offer.salesRepName}</span>
            </div>
            {offer.trackingUrl && (
              <a
                href={offer.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <ExternalLink className="w-3 h-3" /> Åpne kundeportal
              </a>
            )}
          </div>
        );
      })}
      <button
        onClick={onNavigate}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
      >
        <FileText className="w-4 h-4" /> Nytt tilbud
      </button>
    </div>
  );
}

function ActivityTab() {
  const quickActions = [
    { icon: Phone, label: 'Samtale' },
    { icon: Mail, label: 'E-post' },
    { icon: Video, label: 'Møte' },
    { icon: CheckSquare, label: 'Oppgave' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {quickActions.map((a) => (
          <button
            key={a.label}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <a.icon className="w-3.5 h-3.5" />
            {a.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Ingen aktiviteter registrert ennå.</p>
    </div>
  );
}
