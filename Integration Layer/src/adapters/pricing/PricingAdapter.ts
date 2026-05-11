// ── PricingAdapter — mock for Telenors Pris-system ──
// Eier kampanjer, rabatter og bundle-priser. I produksjon: REST-kall mot pris-API.
// Alle prissettingsregler lever her — ikke i CPQ eller i frontends.

import { IPricingAdapter } from '../IAdapter.js';
import {
  DataSource,
  Campaign,
  PricedProduct,
  CustomerSegment,
  SourceMeta,
} from '../../types/domain.js';

const SOURCE: DataSource = 'pricing-system';

function meta(cached = false): SourceMeta {
  return { source: SOURCE, fetchedAt: new Date().toISOString(), cached };
}

// ─── Master-kampanjeliste ──────────────────────────────────────────────────
// Disse dataene vil i produksjon hentes fra pris-systemets API.

const MASTER_CAMPAIGNS: Omit<Campaign, 'meta'>[] = [
  {
    campaignId: 'camp-nykunde-fiber500',
    name: 'Nykundetilbud Fiber',
    tag: 'Nykunde',
    productId: 'fiber-500',
    productName: 'Fiber 500/500',
    campaignPrice: 299,
    basePrice: 599,
    discountPercent: 50,
    pitch: 'Halvpris i 6 måneder. Ingen bindingstid.',
    color: '#00A650',
    validFrom: '2025-01-01',
    eligibleFor: ['new-customer'],
  },
  {
    campaignId: 'camp-winback-fiber500',
    name: 'Tilbakevinn Fiber',
    tag: 'Win-back',
    productId: 'fiber-500',
    productName: 'Fiber 500/500',
    campaignPrice: 359,
    basePrice: 599,
    discountPercent: 40,
    pitch: '40% rabatt i 6 måneder + gratis router for tidligere kunder.',
    color: '#7B2D8B',
    validFrom: '2025-01-01',
    eligibleFor: ['win-back'],
  },
  {
    campaignId: 'camp-upsell-fiber1g',
    name: 'Oppgrader til Fiber 1G',
    tag: 'Upsell',
    productId: 'fiber-1g',
    productName: 'Fiber 1G/1G',
    campaignPrice: 637,
    basePrice: 749,
    discountPercent: 15,
    pitch: '15% rabatt på oppgradering de neste 30 dagene.',
    color: '#0085C3',
    validFrom: '2025-01-01',
    eligibleFor: ['existing-customer'],
  },
  {
    campaignId: 'camp-tv-upsell',
    name: 'TV Total-tilbud',
    tag: 'TV',
    productId: 'tv-total',
    productName: 'TV Total',
    campaignPrice: 319,
    basePrice: 399,
    discountPercent: 20,
    pitch: '20% rabatt på TV Total i 12 måneder. Inkluderer strømming.',
    color: '#005A8E',
    validFrom: '2025-01-01',
    eligibleFor: ['existing-customer', 'new-customer'],
  },
  {
    campaignId: 'camp-sikre',
    name: 'Sikre-pakke',
    tag: 'Sikre',
    productId: 'sikre-pluss',
    productName: 'Sikre med bredbånd',
    campaignPrice: 466,
    basePrice: 549,
    discountPercent: 15,
    pitch: 'ID-vakt, svindelforsikring og Nettvern+ inkludert.',
    color: '#00A650',
    validFrom: '2025-01-01',
    eligibleFor: ['all'],
  },
  {
    campaignId: 'camp-mobil-kampanje',
    name: 'Mobilkampanje',
    tag: 'Mobil',
    productId: 'mobil-friplus',
    productName: 'Mobil Fri+',
    campaignPrice: 449,
    basePrice: 599,
    discountPercent: 25,
    pitch: 'Ubegrenset data og fri tale. Bytt nå og spar 150 kr/md.',
    color: '#7B2D8B',
    validFrom: '2025-01-01',
    eligibleFor: ['all'],
  },
  {
    campaignId: 'camp-bundle-fiber-mobil',
    name: 'Dobbelpakke',
    tag: 'Bundle',
    productId: 'bundle-fiber500-mobil',
    productName: 'Fiber 500 + Mobil Fri+',
    campaignPrice: 699,
    basePrice: 1198,
    discountPercent: 42,
    pitch: 'Internett og mobil i én pakke. Spar 499 kr/md de første 6 månedene.',
    color: '#F5A623',
    validFrom: '2025-01-01',
    eligibleFor: ['new-customer', 'win-back'],
  },
  {
    campaignId: 'camp-produktx',
    name: 'Produkt X Pilot',
    tag: 'Pilot',
    productId: 'produkt-x',
    productName: 'Produkt X',
    campaignPrice: 199,
    basePrice: 199,
    discountPercent: 0,
    pitch: 'Eksklusivt pilot-tilbud. Kun tilgjengelig i ditt område.',
    color: '#F5A623',
    validFrom: '2025-01-01',
    eligibleFor: ['all'],
  },
];

// ─── Pris-tabell for enkeltprodukter ──────────────────────────────────────

const PRODUCT_BASE_PRICES: Record<string, number> = {
  'fiber-250': 449,
  'fiber-500': 599,
  'fiber-1g': 749,
  'mobil-5gb': 249,
  'mobil-15gb': 349,
  'mobil-friplus': 599,
  'mobil-friplus-familie': 899,
  'tv-start': 199,
  'tv-total': 399,
  'tv-sport': 299,
  'tv-box': 499,
  'sikre-base': 149,
  'sikre-pluss': 549,
};

export class PricingAdapter implements IPricingAdapter {
  readonly sourceId: DataSource = 'pricing-system';
  readonly name = 'Pricing System (mock)';

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async getCampaigns(): Promise<Campaign[]> {
    return MASTER_CAMPAIGNS.map(c => ({ ...c, meta: meta() }));
  }

  async getCampaignsForSegment(segment: CustomerSegment): Promise<Campaign[]> {
    return MASTER_CAMPAIGNS
      .filter(c => c.eligibleFor.includes(segment) || c.eligibleFor.includes('all'))
      .map(c => ({ ...c, meta: meta() }));
  }

  async calculatePrice(productId: string, _customerId?: string): Promise<PricedProduct | null> {
    const basePrice = PRODUCT_BASE_PRICES[productId];
    if (basePrice === undefined) return null;

    // Finn beste aktive kampanje for dette produktet
    const campaign = MASTER_CAMPAIGNS.find(c => c.productId === productId);

    return {
      productId,
      name: campaign?.productName ?? productId,
      category: 'fiber',   // forenklet — i produksjon hentes dette fra produkt-adapter
      description: '',
      basePrice,
      unit: 'monthly',
      finalPrice: campaign ? campaign.campaignPrice : basePrice,
      campaign: campaign ? { ...campaign, meta: meta() } : undefined,
      meta: meta(),
    };
  }
}
