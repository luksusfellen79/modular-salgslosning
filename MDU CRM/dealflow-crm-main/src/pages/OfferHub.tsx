import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { OfferPackage, OfferProduct } from '@/data/offerHubData';
import { Opportunity } from '@/data/mockData';
import { OfferPackageCard, OfferProductCard } from '@/components/offerhub/OfferProductCard';
import { Send, Copy, CheckCheck, Flag, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppLayout } from '@/components/layout/AppLayout';
import { fetchMDUNBA, NBARecommendation } from '@/lib/nba';
import {
  fetchOpportunities,
  SalesCoreOpportunity,
  createOffer,
  sendOffer,
  updateOpportunityWarRoom,
} from '@/lib/salesCore';
import {
  fetchMDUPackages,
  fetchMDUComponents,
  KASMDUPackage,
  KASMDUComponent,
  categoryMap,
} from '@/lib/kasCore';
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

// ── Map KAS Core types to OfferHub types ─────────────────────────────────────

function mapComponent(c: KASMDUComponent): OfferProduct {
  return {
    id: c.componentId,
    name: c.name,
    category: (categoryMap[c.category] ?? c.category) as OfferProduct['category'],
    points: c.points,
    monthlyPrice: 0,
    costPrice: c.costPerUnit,
    description: c.description,
    isDefault: c.isDefault,
    speed: c.specs?.speed,
    icon: undefined,
  };
}

function mapPackage(p: KASMDUPackage): OfferPackage {
  return {
    id: p.packageId,
    name: p.name,
    tier: p.tier,
    totalPoints: p.totalPoints,
    monthlyPrice: p.monthlyPricePerUnit,
    defaultProducts: p.defaultComponents,
    description: p.description,
    color: p.color,
    featured: p.featured,
  };
}

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
    owner: (() => {
      const n = sc.salesRepName ?? sc.createdBy ?? 'Ukjent';
      const initials = n.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
      return { name: n, initials, color: '#6366f1' };
    })(),
    units: sc.units,
    description: sc.notes,
    createdDate: sc.createdAt,
  };
}

export default function OfferHubPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const opportunityId = searchParams.get('opportunityId');

  const [deal, setDeal] = useState<Opportunity | null>(null);
  const [loadingDeal, setLoadingDeal] = useState(!!opportunityId);

  // KAS Core catalog
  const [offerPackages, setOfferPackages] = useState<OfferPackage[]>([]);
  const [offerProducts, setOfferProducts] = useState<OfferProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);

  const [selectedPackage, setSelectedPackage] = useState<OfferPackage | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [discount, setDiscount] = useState(10);
  const [notes, setNotes] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [sentToWarRoom, setSentToWarRoom] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'preview'>('products');
  const [isSending, setIsSending] = useState(false);
  const [nbaRec, setNbaRec] = useState<NBARecommendation | null>(null);
  const [nbaLoading, setNbaLoading] = useState(false);

  useSalesCoreSSE();

  // Fetch NBA recommendation when deal + packages are ready
  useEffect(() => {
    if (!deal || offerPackages.length === 0) return;
    setNbaLoading(true);
    fetchMDUNBA({
      opportunityId: deal.id,
      accountName: deal.accountName,
      units: deal.units,
      stage: deal.stage,
      estimatedAnnualValue: deal.value,
      contactName: deal.contactName,
      packages: offerPackages.map(p => ({
        id: p.id,
        name: p.name,
        tier: p.tier,
        monthlyPrice: p.monthlyPrice,
      })),
    })
      .then(setNbaRec)
      .catch(() => setNbaRec(null))
      .finally(() => setNbaLoading(false));
  }, [deal?.id, offerPackages.length]);

  // Hent MDU-produktkatalog fra KAS Core
  useEffect(() => {
    Promise.all([fetchMDUPackages(), fetchMDUComponents()])
      .then(([pkgs, comps]) => {
        const mappedPackages = pkgs.map(mapPackage);
        const mappedProducts = comps.map(mapComponent);
        setOfferPackages(mappedPackages);
        setOfferProducts(mappedProducts);
        // Velg Frihet M (index 1) som standard, ellers første pakke
        const defaultPkg = mappedPackages.find((p) => p.tier === 'M') ?? mappedPackages[0];
        if (defaultPkg) {
          setSelectedPackage(defaultPkg);
          setSelectedProducts(defaultPkg.defaultProducts);
        }
      })
      .catch((err) => {
        console.error('KAS Core catalog error:', err);
        toast.error('Kunne ikke hente produktkatalog fra KAS Core');
      })
      .finally(() => setLoadingCatalog(false));
  }, []);

  // Hent deal fra Sales Core basert på URL-param
  useEffect(() => {
    if (!opportunityId) return;
    setLoadingDeal(true);
    fetchOpportunities()
      .then((data) => {
        const found = data.find((o) => o.id === opportunityId);
        setDeal(found ? toOpportunity(found) : null);
      })
      .catch(() => setDeal(null))
      .finally(() => setLoadingDeal(false));
  }, [opportunityId]);

  const usedPoints = selectedProducts.reduce((sum, id) => {
    const p = offerProducts.find((pr) => pr.id === id);
    return sum + (p?.points || 0);
  }, 0);
  const remainingPoints = (selectedPackage?.totalPoints ?? 0) - usedPoints;
  const discountedPrice = Math.round((selectedPackage?.monthlyPrice ?? 0) * (1 - discount / 100));
  const totalCost = selectedProducts.reduce((sum, id) => {
    const p = offerProducts.find((pr) => pr.id === id);
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

  const handleSendOffer = useCallback(async () => {
    if (!deal || isSending || !selectedPackage) return;
    setIsSending(true);
    try {
      const offer = await createOffer({
        opportunityId: deal.id,
        accountName: deal.accountName,
        contactName: deal.contactName ?? null,
        contactEmail: deal.contactEmail ?? null,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        selectedProducts,
        monthlyPricePerUnit: discountedPrice,
        discountPercent: discount,
        units: deal.units,
        notes: notes || undefined,
        salesRepName: deal.owner.name,
      });
      const sentOffer = await sendOffer(offer.id);
      setActiveOfferId(sentOffer.id);
      setTrackingUrl(sentOffer.trackingUrl);
      setOfferSent(true);
      setActiveTab('preview');
      toast.success(`Tilbud sendt til ${deal.accountName}`, { description: sentOffer.trackingUrl });
      setTimeout(() => setOfferSent(false), 4000);
    } catch (err) {
      console.error('Send offer error:', err);
      toast.error('Kunne ikke sende tilbud', { description: String(err) });
    } finally {
      setIsSending(false);
    }
  }, [deal, isSending, selectedPackage, selectedProducts, discountedPrice, discount, notes]);

  const handleCopyLink = useCallback(() => {
    const urlToCopy = trackingUrl ?? '';
    if (!urlToCopy) { toast.info('Send tilbudet først for å få en sporingslenke'); return; }
    navigator.clipboard.writeText(urlToCopy).catch(() => {});
    setLinkCopied(true);
    toast.success('Lenke kopiert!', { description: urlToCopy });
    setTimeout(() => setLinkCopied(false), 2000);
  }, [trackingUrl]);

  const handleSendToWarRoom = useCallback(async () => {
    if (!deal) return;
    try {
      await updateOpportunityWarRoom(deal.id, 'pending');
      setSentToWarRoom(true);
      toast.info(`Sendt til War Room: ${deal.accountName}`);
      setTimeout(() => setSentToWarRoom(false), 3000);
    } catch (e) {
      toast.error('Kunne ikke sende til War Room');
    }
  }, [deal]);


  const productsByCategory = categoryOrder.map((cat) => ({
    category: cat,
    products: offerProducts.filter((p) => p.category === cat),
  }));

  // ── Ingen opportunityId i URL → landing ──────────────────────────────────────
  if (!opportunityId) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Send className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Åpne et tilbud fra en deal</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Tilbud er knyttet til deals. Gå til Pipeline, klikk på en deal og trykk «Bygg tilbud» for å komme hit.
          </p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Gå til Pipeline
          </button>
        </div>
      </AppLayout>
    );
  }

  // ── Laster katalog eller deal ─────────────────────────────────────────────────
  if (loadingCatalog || loadingDeal) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{loadingCatalog ? 'Henter produktkatalog...' : 'Henter deal...'}</span>
        </div>
      </AppLayout>
    );
  }

  // ── Ingen pakker lastet (KAS Core nede?) ──────────────────────────────────────
  if (offerPackages.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
          <p className="text-sm font-medium text-foreground">Ingen pakker tilgjengelig</p>
          <p className="text-xs text-muted-foreground">Klarte ikke hente produktkatalog fra KAS Core.</p>
        </div>
      </AppLayout>
    );
  }

  // ── Deal ikke funnet ─────────────────────────────────────────────────────────
  if (!deal) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
          <p className="text-sm font-medium text-foreground">Deal ikke funnet</p>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbake til Pipeline
          </button>
        </div>
      </AppLayout>
    );
  }

  // ── Offer builder ────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs text-muted-foreground">{deal.accountName} · {deal.units} enheter</p>
            <h1 className="text-lg font-bold text-foreground">{deal.name}</h1>
          </div>
          {deal.contactName && (
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Kontakt</p>
              <p className="text-sm font-semibold text-foreground">{deal.contactName}</p>
              <p className="text-xs text-muted-foreground">{deal.contactEmail}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* CENTER: Builder */}
          <div className="col-span-8 space-y-5">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Velg pakke</p>
              <div className="grid grid-cols-2 gap-3">
                {offerPackages.map((pkg) => (
                  <OfferPackageCard
                    key={pkg.id}
                    pkg={pkg}
                    isSelected={selectedPackage?.id === pkg.id}
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
                    <p className="text-sm font-semibold text-foreground mb-2">Pakke: {selectedPackage?.name}</p>
                    <div className="space-y-1.5">
                      {selectedProducts.map((id) => {
                        const p = offerProducts.find((pr) => pr.id === id);
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
                    <span className="font-semibold text-foreground">Per beboer/mnd</span>
                    <div className="text-right">
                      {discount > 0 && (
                        <p className="text-xs line-through text-muted-foreground">
                          {selectedPackage.monthlyPrice} kr
                        </p>
                      )}
                      <p className="text-2xl font-bold text-primary">{discountedPrice} kr</p>
                    </div>
                  </div>
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
          <div className="col-span-4 space-y-5">
            {/* NBA Card */}
            {(nbaLoading || nbaRec) && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">AI-anbefaling</span>
                  </div>
                  {nbaRec && (
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full',
                      nbaRec.confidence === 'high' ? 'bg-green-100 text-green-700' :
                      nbaRec.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    )}>
                      {nbaRec.confidence === 'high' ? 'Høy sikkerhet' : nbaRec.confidence === 'medium' ? 'Medium' : 'Lav sikkerhet'}
                    </span>
                  )}
                </div>
                {nbaLoading ? (
                  <div className="px-4 py-3 flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs">AI analyserer dealen…</span>
                  </div>
                ) : nbaRec ? (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-sm font-bold text-foreground">{nbaRec.headline}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full">{nbaRec.product}</span>
                      {nbaRec.extras.map(e => (
                        <span key={e} className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">{e}</span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{nbaRec.reason}</p>
                  </div>
                ) : null}
              </div>
            )}

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
                  <span className="font-medium text-foreground">{selectedPackage?.monthlyPrice ?? 0} kr/mnd</span>
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total fortjeneste</span>
                  <span className={cn('font-bold', profitPerSub >= 0 ? 'text-success' : 'text-destructive')}>
                    {(profitPerSub * deal.units).toLocaleString('nb-NO')} kr/mnd
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  × {deal.units} enheter ={' '}
                  <strong>{(discountedPrice * deal.units / 1000).toFixed(0)}k kr/mnd omsetning</strong>
                </p>
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
                  disabled={isSending}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
                    offerSent
                      ? 'bg-success text-success-foreground'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : offerSent ? (
                    <><CheckCheck className="w-4 h-4" /> Tilbud sendt!</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send tilbud til kunde</>
                  )}
                </button>
                <button
                  onClick={handleCopyLink}
                  disabled={!trackingUrl}
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
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200',
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
