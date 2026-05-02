import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OFFER_PRODUCTS, OFFER_PACKAGES, OfferPackage } from '@/data/offerHubData';
import { opportunities as mockOpportunities, Opportunity } from '@/data/mockData';
import { OfferPackageCard, OfferProductCard } from '@/components/offerhub/OfferProductCard';
import { OfferSalesforcePanel } from '@/components/offerhub/OfferSalesforcePanel';
import { Send, Copy, CheckCheck, Flag, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layout/AppLayout';
import { useWarRoom } from '@/context/WarRoomContext';
import {
  fetchOpportunities,
  SalesCoreOpportunity,
  createOffer,
  sendOffer,
} from '@/lib/salesCore';
import { useSalesCoreSSE } from '@/hooks/useSalesCoreSSE';
import { toast } from '@/components/ui/sonner';

export type { OfferPackage };

const categoryOrder = ['broadband', 'tv', 'streaming', 'security', 'hardware'];
const categoryLabels: Record<string, string> = {
  broadband: '📡 Bredbånd',
  tv: '📺 TV',
  streaming: '🎬 Strømming',
  security: '🛡️ Sikkerhet',
  hardware: '📶 Utstyr',
};

// Konverterer SalesCoreOpportunity til Opportunity-shape for eksisterende komponenter
function toOpportunity(sc: SalesCoreOpportunity): Opportunity {
  return {
    id: sc.id,
    name: sc.name,
    accountName: sc.accountName,
    contactName: sc.contactName ?? undefined,
    contactEmail: sc.contactEmail ?? undefined,
    stage: sc.stage,
    value: sc.estimatedAnnualValue,
    closeDate: sc.closeDate,
    probability: 50,
    owner: { name: 'Sales Core', initials: 'SC', color: '#6366f1' },
    units: sc.units,
    description: sc.notes,
    createdDate: new Date().toISOString(),
  };
}

// Alle opportunities unntatt tapte
const localActiveOpps = mockOpportunities.filter((o) => o.stage !== 'closed-lost');

export default function OfferHubPage() {
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('opportunityId');

  // Live opportunities fra Sales Core, med mockData som fallback
  const [opportunities, setOpportunities] = useState<Opportunity[]>(localActiveOpps);
  const [isLive, setIsLive] = useState(false);

  // Aktiv offer-ID (fra Sales Core etter POST)
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);

  const defaultOpp =
    (preselectedId ? opportunities.find((o) => o.id === preselectedId) : undefined) ??
    opportunities[0];

  const [selectedPackage, setSelectedPackage] = useState<OfferPackage>(OFFER_PACKAGES[1]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(OFFER_PACKAGES[1].defaultProducts);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | undefined>(defaultOpp);
  const [discount, setDiscount] = useState(10);
  const [notes, setNotes] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [sentToWarRoom, setSentToWarRoom] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'preview'>('products');
  const [isSending, setIsSending] = useState(false);
  const { submit } = useWarRoom();

  // Start SSE-kobling for sanntidsvarsler
  useSalesCoreSSE();

  // Hent opportunities fra Sales Core ved oppstart
  useEffect(() => {
    fetchOpportunities()
      .then((data) => {
        const mapped = data
          .filter((o) => o.stage !== 'closed-lost')
          .map(toOpportunity);
        if (mapped.length > 0) {
          setOpportunities(mapped);
          setIsLive(true);
        }
      })
      .catch(() => {
        // Sales Core utilgjengelig — beholder mockData (allerede satt)
        setIsLive(false);
      });
  }, []);

  // Sync selectedOpp når URL-param eller opportunities endres
  useEffect(() => {
    if (preselectedId) {
      const opp = opportunities.find((o) => o.id === preselectedId);
      if (opp) setSelectedOpp(opp);
    }
  }, [preselectedId, opportunities]);

  const usedPoints = selectedProducts.reduce((sum, id) => {
    const p = OFFER_PRODUCTS.find((pr) => pr.id === id);
    return sum + (p?.points || 0);
  }, 0);
  const remainingPoints = selectedPackage.totalPoints - usedPoints;
  const discountedPrice = Math.round(selectedPackage.monthlyPrice * (1 - discount / 100));
  const totalCost = selectedProducts.reduce((sum, id) => {
    const p = OFFER_PRODUCTS.find((pr) => pr.id === id);
    return sum + (p?.costPrice || 0);
  }, 0);
  const profitPerSub = discountedPrice - totalCost;

  const handleSelectPackage = (pkg: OfferPackage) => {
    setSelectedPackage(pkg);
    setSelectedProducts(pkg.defaultProducts);
    setActiveOfferId(null);
    setTrackingUrl(null);
  };

  const handleToggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
    setActiveOfferId(null);
    setTrackingUrl(null);
  };

  // Opprett tilbud i Sales Core og send det
  const handleSendOffer = useCallback(async () => {
    if (!selectedOpp || isSending) return;

    setIsSending(true);
    try {
      // Lag tilbud
      const offer = await createOffer({
        opportunityId: selectedOpp.id,
        accountName: selectedOpp.accountName,
        contactName: selectedOpp.contactName ?? null,
        contactEmail: selectedOpp.contactEmail ?? null,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        selectedProducts,
        monthlyPricePerUnit: discountedPrice,
        discountPercent: discount,
        units: selectedOpp.units,
        notes: notes || undefined,
        salesRepName: selectedOpp.owner.name,
      });

      // Send tilbudet (status → sent)
      const sentOffer = await sendOffer(offer.id);
      setActiveOfferId(sentOffer.id);
      setTrackingUrl(sentOffer.trackingUrl);

      setOfferSent(true);
      toast.success(`Tilbud sendt til ${selectedOpp.accountName}`, {
        description: sentOffer.trackingUrl,
      });
      setTimeout(() => setOfferSent(false), 4000);
    } catch (err) {
      console.error('Send offer error:', err);
      // Fallback: simuler sending lokalt
      setOfferSent(true);
      toast.info('Sales Core utilgjengelig – tilbud simulert lokalt');
      setTimeout(() => setOfferSent(false), 3000);
    } finally {
      setIsSending(false);
    }
  }, [selectedOpp, isSending, selectedPackage, selectedProducts, discountedPrice, discount, notes]);

  const handleCopyLink = useCallback(() => {
    const urlToCopy = trackingUrl ?? `${window.location.origin}/offer/${selectedOpp?.id ?? 'preview'}`;
    navigator.clipboard.writeText(urlToCopy).catch(() => {});
    setLinkCopied(true);
    toast.success('Lenke kopiert!', { description: urlToCopy });
    setTimeout(() => setLinkCopied(false), 2000);
  }, [trackingUrl, selectedOpp]);

  const handleSendToWarRoom = useCallback(() => {
    if (!selectedOpp) return;
    submit({
      dealId: selectedOpp.id,
      dealName: selectedOpp.name,
      accountName: selectedOpp.accountName,
      value: discountedPrice * selectedOpp.units,
      discount,
      notes,
      packageName: selectedPackage.name,
      submittedBy: selectedOpp.owner.name,
      units: selectedOpp.units,
      pricePerUnit: discountedPrice,
    });
    setSentToWarRoom(true);
    toast.info(`Sendt til War Room: ${selectedOpp.accountName}`);
    setTimeout(() => setSentToWarRoom(false), 3000);
  }, [selectedOpp, discountedPrice, discount, notes, selectedPackage, submit]);

  const productsByCategory = categoryOrder.map((cat) => ({
    category: cat,
    products: OFFER_PRODUCTS.filter((p) => p.category === cat),
  }));

  return (
    <AppLayout>
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Offer Hub</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bygg og send tilbud knyttet til deals i pipeline
            </p>
          </div>
          {/* Live/offline-indikator */}
          <div className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
            isLive
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground'
          )}>
            {isLive
              ? <><Wifi className="w-3 h-3" /> Live – Sales Core</>
              : <><WifiOff className="w-3 h-3" /> Offline – mockdata</>
            }
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT: Pipeline opportunities */}
          <div className="col-span-3">
            <OfferSalesforcePanel
              opportunities={opportunities}
              onSelectOpportunity={setSelectedOpp}
              selectedId={selectedOpp?.id}
            />
          </div>

          {/* CENTER: Builder */}
          <div className="col-span-6 space-y-5">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Bygg tilbud</h2>
                  {selectedOpp && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                        {selectedOpp.accountName}
                      </span>
                      <span className="text-xs text-muted-foreground">{selectedOpp.units} enheter</span>
                    </div>
                  )}
                </div>
                {selectedOpp && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Kontaktperson</p>
                    <p className="text-sm font-semibold text-foreground">{selectedOpp.contactName ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{selectedOpp.contactEmail ?? '—'}</p>
                  </div>
                )}
              </div>

              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Velg pakke</p>
              <div className="grid grid-cols-2 gap-3">
                {OFFER_PACKAGES.map((pkg) => (
                  <OfferPackageCard
                    key={pkg.id}
                    pkg={pkg}
                    isSelected={selectedPackage.id === pkg.id}
                    onSelect={() => handleSelectPackage(pkg)}
                  />
                ))}
              </div>
            </div>

            {/* Products */}
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1 rounded-xl p-1 bg-muted max-w-xs">
                  {(['products', 'preview'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all text-center',
                        activeTab === tab
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {tab === 'products' ? '🛒 Produkter' : '👁️ Forhåndsvisning'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Brukte poeng</p>
                    <p className="text-lg font-bold text-foreground">
                      {usedPoints} / {selectedPackage.totalPoints}
                    </p>
                  </div>
                  <div className="relative w-12 h-12">
                    <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="16" fill="none"
                        stroke={usedPoints > selectedPackage.totalPoints ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                        strokeWidth="3"
                        strokeDasharray={`${Math.min((usedPoints / selectedPackage.totalPoints) * 100, 100)} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground">
                      {remainingPoints >= 0 ? remainingPoints : 0}p
                    </span>
                  </div>
                </div>
              </div>

              {activeTab === 'products' ? (
                <div className="space-y-4">
                  {productsByCategory.map(({ category, products }) => (
                    <div key={category}>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{categoryLabels[category]}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {products.map((product) => (
                          <OfferProductCard
                            key={product.id}
                            product={product}
                            isSelected={selectedProducts.includes(product.id)}
                            onToggle={() => handleToggleProduct(product.id)}
                            pointsAvailable={remainingPoints}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm font-semibold text-foreground mb-2">Pakke: {selectedPackage.name}</p>
                    <div className="space-y-1.5">
                      {selectedProducts.map((id) => {
                        const p = OFFER_PRODUCTS.find((pr) => pr.id === id);
                        if (!p) return null;
                        return (
                          <div key={id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <span>{p.icon}</span>{p.name}
                            </span>
                            <span className="font-medium text-foreground">
                              {p.points > 0 ? `${p.points}p` : 'Inkl.'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <span className="font-semibold text-foreground">Totalt per beboer/mnd</span>
                    <div className="text-right">
                      {discount > 0 && (
                        <p className="text-xs line-through text-muted-foreground">
                          {selectedPackage.monthlyPrice} kr
                        </p>
                      )}
                      <p className="text-2xl font-bold text-primary">{discountedPrice} kr</p>
                    </div>
                  </div>
                  {/* Tracking-lenke hvis tilbud er sendt */}
                  {trackingUrl && (
                    <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                      <p className="text-xs font-semibold text-success mb-1">✓ Tilbud sendt</p>
                      <p className="text-[10px] text-muted-foreground break-all">{trackingUrl}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Offer Summary */}
          <div className="col-span-3 space-y-5">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-bold text-foreground mb-4">Tilbudsdetaljer</h3>

              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-2">
                  Rabatt: {discount}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={discount}
                  onChange={(e) => {
                    setDiscount(Number(e.target.value));
                    setActiveOfferId(null);
                    setTrackingUrl(null);
                  }}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0%</span><span>30%</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Listepris</span>
                  <span className="font-medium text-foreground">{selectedPackage.monthlyPrice} kr/mnd</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rabatt</span>
                  <span className="font-medium text-success">-{discount}%</span>
                </div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between">
                  <span className="font-bold text-foreground">Tilbudspris</span>
                  <span className="font-bold text-2xl text-primary">{discountedPrice} kr</span>
                </div>
                <div className="border-t border-border my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vår kostnad</span>
                  <span className="font-medium text-foreground">{totalCost} kr/mnd</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fortjeneste per abo</span>
                  <span className={cn('font-bold', profitPerSub >= 0 ? 'text-success' : 'text-destructive')}>
                    {profitPerSub} kr/mnd
                  </span>
                </div>
                {selectedOpp && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total fortjeneste</span>
                      <span className={cn('font-bold', profitPerSub >= 0 ? 'text-success' : 'text-destructive')}>
                        {(profitPerSub * selectedOpp.units).toLocaleString('nb-NO')} kr/mnd
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      × {selectedOpp.units} enheter ={' '}
                      <strong>
                        {(discountedPrice * selectedOpp.units / 1000).toFixed(0)}k kr/mnd omsetning
                      </strong>
                    </p>
                  </>
                )}
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">
                  Notat til kunde
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Legg til et personlig notat..."
                  rows={3}
                  className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={handleSendOffer}
                  disabled={!selectedOpp || isSending}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
                    offerSent
                      ? 'bg-success text-success-foreground'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {isSending ? (
                    <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : offerSent ? (
                    <><CheckCheck className="w-4 h-4" /> Tilbud sendt!</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send tilbud til kunde</>
                  )}
                </button>
                <button
                  onClick={handleCopyLink}
                  disabled={!selectedOpp}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm border border-border hover:bg-muted transition-all duration-200 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {linkCopied ? (
                    <><CheckCheck className="w-4 h-4 text-success" /> Lenke kopiert!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Kopier kundelenke</>
                  )}
                </button>
                <button
                  onClick={handleSendToWarRoom}
                  disabled={!selectedOpp}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
                    sentToWarRoom
                      ? 'bg-success text-success-foreground'
                      : 'bg-foreground text-background hover:opacity-90'
                  )}
                >
                  {sentToWarRoom ? (
                    <><CheckCheck className="w-4 h-4" /> Sendt til War Room!</>
                  ) : (
                    <><Flag className="w-4 h-4" /> Send til War Room</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
