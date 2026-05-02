// ── Produktkatalog for SDU og MDU ──
// SDU = individuelle forbrukerprodukter per husstand
// MDU = kollektive borettslag-pakker, prises per enhet
//
// Incentiver/insentiver er koblet per produkt/pakke og er tidsbegrensede.
// CRM-en leser herfra — ingen produkter skal hardkodes i frontend.

import { Incentive, MDUComponent, MDUPackage, SDUProduct } from '../types';

const NOW = new Date().toISOString();
const Q3_END = '2026-09-30';
const Q2_END = '2026-06-30';

// ─── Felles incentiver ────────────────────────────────────────────────────────

const NO_INCENTIVES: Incentive[] = [];

// ─── SDU-produkter ────────────────────────────────────────────────────────────
// Disse selges til enkeltpersoner/husstander (SDU-selgere)

export const SDU_PRODUCTS: SDUProduct[] = [
  // ── Internett ──
  {
    productId: 'sdu-fiber-250',
    name: 'Fiber 250/250',
    category: 'internett',
    description: 'Fiber 250 Mbps ned og opp. Passer de fleste husstander.',
    monthlyPrice: 399,
    costPrice: 120,
    commissionRate: 6,
    specs: { nedlasting: '250 Mbps', opplasting: '250 Mbps', teknologi: 'Fiber' },
    incentives: [],
    isActive: true,
  },
  {
    productId: 'sdu-fiber-500',
    name: 'Fiber 500/500',
    category: 'internett',
    description: 'Fiber 500 Mbps — vår mest populære hastighet.',
    monthlyPrice: 499,
    costPrice: 150,
    commissionRate: 7,
    specs: { nedlasting: '500 Mbps', opplasting: '500 Mbps', teknologi: 'Fiber' },
    incentives: [
      {
        id: 'inc-fiber500-nykunde-q2',
        name: 'Nykundetilbud Fiber 500',
        description: '50% rabatt i 6 måneder for nye kunder',
        type: 'discount_months',
        value: 6,
        currency: 'months',
        validFrom: '2026-04-01',
        validUntil: Q2_END,
        visibleToSeller: true,
      },
      {
        id: 'inc-fiber500-bonus',
        name: 'Selgerbonus Fiber 500',
        description: '200 kr ekstra per nye abonnement',
        type: 'bonus_per_sale',
        value: 200,
        currency: 'NOK',
        validFrom: '2026-04-01',
        validUntil: Q2_END,
        visibleToSeller: true,
      },
    ],
    isActive: true,
  },
  {
    productId: 'sdu-fiber-1g',
    name: 'Fiber 1G/1G',
    category: 'internett',
    description: 'Gigabit fiber — maksimal hastighet for krevende brukere.',
    monthlyPrice: 649,
    costPrice: 200,
    commissionRate: 8,
    specs: { nedlasting: '1000 Mbps', opplasting: '1000 Mbps', teknologi: 'Fiber' },
    incentives: [],
    isActive: true,
  },

  // ── TV ──
  {
    productId: 'sdu-tv-start',
    name: 'T-We Basis',
    category: 'tv',
    description: 'Grunnpakke med 30+ kanaler og T-We boks.',
    monthlyPrice: 199,
    costPrice: 89,
    commissionRate: 5,
    specs: { kanaler: '30+', boks: 'T-We', opptak: 'Nei' },
    incentives: [],
    isActive: true,
  },
  {
    productId: 'sdu-tv-total',
    name: 'T-We Total',
    category: 'tv',
    description: 'Alt inkludert — sport, film, serier og 80+ kanaler med opptak.',
    monthlyPrice: 399,
    costPrice: 160,
    commissionRate: 5,
    specs: { kanaler: '80+', boks: 'T-We 4K', opptak: '200 timer' },
    incentives: [
      {
        id: 'inc-tv-total-q3',
        name: 'TV Total kampanje Q3',
        description: '3 måneder gratis ved bestilling av Fiber 500 + T-We Total',
        type: 'free_period',
        value: 3,
        currency: 'months',
        validFrom: '2026-07-01',
        validUntil: Q3_END,
        visibleToSeller: true,
      },
    ],
    isActive: true,
  },

  // ── Mobil ──
  {
    productId: 'sdu-mobil-5gb',
    name: 'Mobil 5GB',
    category: 'mobil',
    description: 'Enkel mobilabonnement med 5GB data.',
    monthlyPrice: 199,
    costPrice: 70,
    commissionRate: 6,
    specs: { data: '5 GB', hastighet: '5G', roaming: 'EU inkludert' },
    incentives: [],
    isActive: true,
  },
  {
    productId: 'sdu-mobil-15gb',
    name: 'Mobil 15GB',
    category: 'mobil',
    description: '15GB data med 5G-hastighet.',
    monthlyPrice: 299,
    costPrice: 100,
    commissionRate: 6,
    specs: { data: '15 GB', hastighet: '5G', roaming: 'EU inkludert' },
    incentives: [
      {
        id: 'inc-mobil15-bundle',
        name: 'Mobilbonus ved fibersalg',
        description: '100 kr rabatt/md i 12 mnd ved kombinasjon med Fiber',
        type: 'discount_months',
        value: 12,
        currency: 'months',
        validFrom: '2026-04-01',
        validUntil: Q3_END,
        visibleToSeller: true,
      },
    ],
    isActive: true,
  },
  {
    productId: 'sdu-mobil-fri',
    name: 'Mobil Fri+',
    category: 'mobil',
    description: 'Ubegrenset data med full 5G-hastighet.',
    monthlyPrice: 449,
    costPrice: 150,
    commissionRate: 7,
    specs: { data: 'Ubegrenset', hastighet: '5G maks', roaming: 'EU inkludert' },
    incentives: [],
    isActive: true,
  },

  // ── Sikkerhet ──
  {
    productId: 'sdu-nettvern',
    name: 'Nettvern',
    category: 'sikkerhet',
    description: 'Grunnleggende nettverkssikkerhet inkludert i alle abonnement.',
    monthlyPrice: 0,
    costPrice: 5,
    commissionRate: 0,
    specs: { beskyttelse: 'DNS-filter', familiefilter: 'Ja' },
    incentives: NO_INCENTIVES,
    isActive: true,
  },
  {
    productId: 'sdu-nettvern-pluss',
    name: 'Nettvern+',
    category: 'sikkerhet',
    description: 'Utvidet sikkerhet med VPN, trusselscanning og ID-vern.',
    monthlyPrice: 49,
    costPrice: 15,
    commissionRate: 4,
    specs: { beskyttelse: 'DNS + VPN + ID-vern', enheter: 'Opptil 10' },
    incentives: [],
    isActive: true,
  },

  // ── Strømming ──
  {
    productId: 'sdu-netflix',
    name: 'Netflix Standard',
    category: 'strømming',
    description: 'Netflix Standard med HD-kvalitet, faktureres via Telenor.',
    monthlyPrice: 179,
    costPrice: 109,
    commissionRate: 3,
    specs: { kvalitet: 'HD', skjermer: '2 samtidige' },
    incentives: [],
    isActive: true,
  },
  {
    productId: 'sdu-viaplay',
    name: 'Viaplay Total',
    category: 'strømming',
    description: 'Viaplay med sport, film og serier. Inkl. Premier League.',
    monthlyPrice: 299,
    costPrice: 159,
    commissionRate: 3,
    specs: { sport: 'Premier League, Formel 1', film: 'Ja' },
    incentives: [],
    isActive: true,
  },
  {
    productId: 'sdu-hbo',
    name: 'Max (HBO)',
    category: 'strømming',
    description: 'HBO Max med alle HBO-serier og Warner-filmer.',
    monthlyPrice: 139,
    costPrice: 89,
    commissionRate: 3,
    specs: { kvalitet: '4K HDR', skjermer: '3 samtidige' },
    incentives: [],
    isActive: true,
  },
  {
    productId: 'sdu-disney',
    name: 'Disney+',
    category: 'strømming',
    description: 'Disney+, Marvel, Star Wars og National Geographic.',
    monthlyPrice: 109,
    costPrice: 69,
    commissionRate: 3,
    specs: { kvalitet: '4K', skjermer: '4 samtidige' },
    incentives: [],
    isActive: true,
  },

  // ── Utstyr ──
  {
    productId: 'sdu-router-std',
    name: 'Telenor WiFi 6-ruter',
    category: 'utstyr',
    description: 'Standard hjemmeruter med WiFi 6. Inkludert i alle fiberabonnement.',
    monthlyPrice: 0,
    costPrice: 25,
    commissionRate: 0,
    specs: { standard: 'WiFi 6 (802.11ax)', rekkevidde: 'Opptil 100m²' },
    incentives: NO_INCENTIVES,
    isActive: true,
  },
  {
    productId: 'sdu-router-mesh',
    name: 'Telenor Mesh Pro',
    category: 'utstyr',
    description: 'Mesh-ruter for store boliger og flerfunksjonshus.',
    monthlyPrice: 79,
    costPrice: 59,
    commissionRate: 2,
    specs: { standard: 'WiFi 6E Mesh', rekkevidde: 'Opptil 300m²', noder: '2 noder inkl.' },
    incentives: [],
    isActive: true,
  },
];

// ─── MDU-komponenter ──────────────────────────────────────────────────────────
// Byggeklosser i MDU-pakker — selges ikke enkeltvis, men velges med poeng

export const MDU_COMPONENTS: MDUComponent[] = [
  // ── Internett ──
  { componentId: 'mdu-bb-100',  name: 'Bredbånd 100',  category: 'internett', description: 'Symmetrisk fiber 100 Mbps per enhet',  points: 0,   costPerUnit: 49,  specs: { hastighet: '100 Mbps' }, isDefault: false },
  { componentId: 'mdu-bb-250',  name: 'Bredbånd 250',  category: 'internett', description: 'Symmetrisk fiber 250 Mbps per enhet',  points: 40,  costPerUnit: 79,  specs: { hastighet: '250 Mbps' }, isDefault: false },
  { componentId: 'mdu-bb-500',  name: 'Bredbånd 500',  category: 'internett', description: 'Symmetrisk fiber 500 Mbps per enhet',  points: 100, costPerUnit: 119, specs: { hastighet: '500 Mbps' }, isDefault: false },
  { componentId: 'mdu-bb-1000', name: 'Bredbånd 1G',   category: 'internett', description: 'Gigabit symmetrisk fiber per enhet',   points: 200, costPerUnit: 169, specs: { hastighet: '1000 Mbps' }, isDefault: true  },

  // ── TV ──
  { componentId: 'mdu-tv-basis',    name: 'T-We Basis',   category: 'tv', description: 'Grunnpakke med 30+ kanaler',                points: 100, costPerUnit: 89,  specs: { kanaler: '30+' }, isDefault: false },
  { componentId: 'mdu-tv-sport',    name: 'T-We Sport',   category: 'tv', description: 'Sport og nyhetskanaler',                    points: 60,  costPerUnit: 65,  specs: { kanaler: 'Sport+' }, isDefault: false },
  { componentId: 'mdu-tv-familie',  name: 'T-We Familie', category: 'tv', description: 'Familiepakke med barnekanaler',             points: 80,  costPerUnit: 55,  specs: { kanaler: 'Familie+' }, isDefault: false },

  // ── Strømming ──
  { componentId: 'mdu-stream-netflix', name: 'Netflix',    category: 'strømming', description: 'Netflix Standard per enhet',    points: 40,  costPerUnit: 109, specs: {}, isDefault: false },
  { componentId: 'mdu-stream-viaplay', name: 'Viaplay',    category: 'strømming', description: 'Viaplay med sport per enhet',   points: 30,  costPerUnit: 99,  specs: {}, isDefault: false },
  { componentId: 'mdu-stream-hbo',     name: 'Max (HBO)',  category: 'strømming', description: 'HBO Max per enhet',             points: 35,  costPerUnit: 89,  specs: {}, isDefault: false },
  { componentId: 'mdu-stream-disney',  name: 'Disney+',    category: 'strømming', description: 'Disney+ per enhet',             points: 25,  costPerUnit: 69,  specs: {}, isDefault: false },

  // ── Sikkerhet ──
  { componentId: 'mdu-sec-nettvern',  name: 'Nettvern',   category: 'sikkerhet', description: 'DNS-sikkerhet inkludert',       points: 0,   costPerUnit: 5,   specs: {}, isDefault: true  },
  { componentId: 'mdu-sec-pluss',     name: 'Nettvern+',  category: 'sikkerhet', description: 'Utvidet sikkerhet og VPN',      points: 20,  costPerUnit: 15,  specs: {}, isDefault: false },

  // ── Utstyr ──
  { componentId: 'mdu-hw-router-std', name: 'Telenor Router',     category: 'utstyr', description: 'Standard WiFi 6-ruter per enhet', points: 0,  costPerUnit: 25, specs: { standard: 'WiFi 6' }, isDefault: true  },
  { componentId: 'mdu-hw-router-pro', name: 'Telenor Router Pro', category: 'utstyr', description: 'WiFi 6E mesh-ruter per enhet',    points: 30, costPerUnit: 59, specs: { standard: 'WiFi 6E Mesh' }, isDefault: false },
];

// ─── MDU-pakker ───────────────────────────────────────────────────────────────

export const MDU_PACKAGES: MDUPackage[] = [
  {
    packageId: 'mdu-pkg-s',
    name: 'Frihet S',
    tier: 'S',
    description: 'Enkel og rask bredbåndsløsning uten TV. Passer borettslag som vil ha fleksibel strømming.',
    monthlyPricePerUnit: 399,
    costPerUnit: 243,
    commissionRate: 8,
    totalPoints: 200,
    defaultComponents: ['mdu-bb-1000', 'mdu-sec-nettvern', 'mdu-hw-router-std'],
    availableComponents: [
      'mdu-bb-100', 'mdu-bb-250', 'mdu-bb-500', 'mdu-bb-1000',
      'mdu-sec-nettvern', 'mdu-sec-pluss',
      'mdu-hw-router-std', 'mdu-hw-router-pro',
      'mdu-stream-netflix', 'mdu-stream-viaplay', 'mdu-stream-disney',
    ],
    color: 'hsl(197 100% 47%)',
    featured: false,
    incentives: [],
    isActive: true,
  },
  {
    packageId: 'mdu-pkg-m',
    name: 'Frihet M',
    tier: 'M',
    description: 'Vår mest populære pakke — TV, strømming og høy hastighet for de fleste borettslag.',
    monthlyPricePerUnit: 499,
    costPerUnit: 312,
    commissionRate: 9,
    totalPoints: 260,
    defaultComponents: ['mdu-tv-basis', 'mdu-stream-netflix', 'mdu-bb-250', 'mdu-sec-nettvern', 'mdu-hw-router-std'],
    availableComponents: [
      'mdu-bb-100', 'mdu-bb-250', 'mdu-bb-500', 'mdu-bb-1000',
      'mdu-tv-basis', 'mdu-tv-sport', 'mdu-tv-familie',
      'mdu-stream-netflix', 'mdu-stream-viaplay', 'mdu-stream-hbo', 'mdu-stream-disney',
      'mdu-sec-nettvern', 'mdu-sec-pluss',
      'mdu-hw-router-std', 'mdu-hw-router-pro',
    ],
    color: 'hsl(225 60% 35%)',
    featured: true,
    incentives: [
      {
        id: 'inc-mdu-m-q2-bonus',
        name: 'MDU Frihet M — Q2 selgerbonus',
        description: '500 kr per enhet i bonus ved signing av Frihet M-avtale i Q2',
        type: 'bonus_per_sale',
        value: 500,
        currency: 'NOK',
        validFrom: '2026-04-01',
        validUntil: Q2_END,
        visibleToSeller: true,
      },
    ],
    isActive: true,
  },
  {
    packageId: 'mdu-pkg-l',
    name: 'Frihet L',
    tier: 'L',
    description: 'Komplett pakke med sport og bred strømming. For borettslag som vil ha alt.',
    monthlyPricePerUnit: 599,
    costPerUnit: 382,
    commissionRate: 9,
    totalPoints: 320,
    defaultComponents: [
      'mdu-tv-basis', 'mdu-stream-netflix', 'mdu-stream-viaplay',
      'mdu-bb-500', 'mdu-sec-nettvern', 'mdu-hw-router-std',
    ],
    availableComponents: [
      'mdu-bb-100', 'mdu-bb-250', 'mdu-bb-500', 'mdu-bb-1000',
      'mdu-tv-basis', 'mdu-tv-sport', 'mdu-tv-familie',
      'mdu-stream-netflix', 'mdu-stream-viaplay', 'mdu-stream-hbo', 'mdu-stream-disney',
      'mdu-sec-nettvern', 'mdu-sec-pluss',
      'mdu-hw-router-std', 'mdu-hw-router-pro',
    ],
    color: 'hsl(225 70% 20%)',
    featured: false,
    incentives: [],
    isActive: true,
  },
  {
    packageId: 'mdu-pkg-xl',
    name: 'Frihet XL',
    tier: 'XL',
    description: 'Alt inkludert — maksimal frihet. Giga-fiber, alle TV-kanaler og all strømming.',
    monthlyPricePerUnit: 699,
    costPerUnit: 452,
    commissionRate: 10,
    totalPoints: 400,
    defaultComponents: [
      'mdu-tv-basis', 'mdu-tv-sport',
      'mdu-stream-netflix', 'mdu-stream-hbo', 'mdu-stream-viaplay',
      'mdu-bb-1000',
      'mdu-sec-nettvern', 'mdu-sec-pluss',
      'mdu-hw-router-pro',
    ],
    availableComponents: [
      'mdu-bb-100', 'mdu-bb-250', 'mdu-bb-500', 'mdu-bb-1000',
      'mdu-tv-basis', 'mdu-tv-sport', 'mdu-tv-familie',
      'mdu-stream-netflix', 'mdu-stream-viaplay', 'mdu-stream-hbo', 'mdu-stream-disney',
      'mdu-sec-nettvern', 'mdu-sec-pluss',
      'mdu-hw-router-std', 'mdu-hw-router-pro',
    ],
    color: 'hsl(280 60% 30%)',
    featured: false,
    incentives: [
      {
        id: 'inc-mdu-xl-q3-kampanje',
        name: 'XL-kampanje Q3 2026',
        description: '2 måneder gratis for borettslag som signerer Frihet XL i Q3',
        type: 'free_period',
        value: 2,
        currency: 'months',
        validFrom: '2026-07-01',
        validUntil: Q3_END,
        visibleToSeller: true,
      },
    ],
    isActive: true,
  },
];
