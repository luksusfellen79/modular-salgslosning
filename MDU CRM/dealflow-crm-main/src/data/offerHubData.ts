// Offer Hub data types and mock data (ported from Offer Hub project)

export type OfferProductCategory = 'broadband' | 'tv' | 'streaming' | 'security' | 'hardware';

export interface OfferProduct {
  id: string;
  name: string;
  category: OfferProductCategory;
  points: number;
  monthlyPrice: number;
  costPrice: number;
  description: string;
  isDefault?: boolean;
  speed?: string;
  icon?: string;
}

export interface OfferPackage {
  id: string;
  name: string;
  tier: 'S' | 'M' | 'L' | 'XL';
  totalPoints: number;
  monthlyPrice: number;
  defaultProducts: string[];
  description: string;
  color: string;
  featured?: boolean;
}

export interface Offer {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerOrg: string;
  packageId: string;
  selectedProducts: string[];
  totalPoints: number;
  monthlyPrice: number;
  discountPercent: number;
  validUntil: string;
  salesRepName: string;
  salesforceOpportunityId?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined';
  createdAt: string;
}

// SfOpportunity removed — OfferHub bruker Opportunity fra mockData direkte

export const OFFER_PRODUCTS: OfferProduct[] = [
  { id: 'bb-100', name: 'Bredbånd 100', category: 'broadband', points: 0, monthlyPrice: 0, costPrice: 49, description: 'Grunnleggende fiber 100 Mbps', speed: '100 Mbps', icon: '📡' },
  { id: 'bb-250', name: 'Bredbånd 250', category: 'broadband', points: 40, monthlyPrice: 0, costPrice: 79, description: 'Fiber 250 Mbps', speed: '250 Mbps', icon: '📡' },
  { id: 'bb-500', name: 'Bredbånd 500', category: 'broadband', points: 100, monthlyPrice: 0, costPrice: 119, description: 'Hurtig fiber 500 Mbps', speed: '500 Mbps', icon: '📡' },
  { id: 'bb-1000', name: 'Bredbånd 1000', category: 'broadband', points: 200, monthlyPrice: 0, costPrice: 169, description: 'Giga fiber 1000 Mbps', speed: '1000 Mbps', icon: '📡', isDefault: true },
  { id: 'tv-basis', name: 'T-We Basis', category: 'tv', points: 100, monthlyPrice: 0, costPrice: 89, description: 'Grunnleggende TV-pakke med 30+ kanaler', icon: '📺' },
  { id: 'tv-sport', name: 'T-We Sport', category: 'tv', points: 60, monthlyPrice: 0, costPrice: 65, description: 'Sport og nyhetskanaler', icon: '⚽' },
  { id: 'tv-familie', name: 'T-We Familie', category: 'tv', points: 80, monthlyPrice: 0, costPrice: 55, description: 'Familiepakke med barnekanaler', icon: '👨‍👩‍👧‍👦' },
  { id: 'stream-netflix', name: 'Netflix', category: 'streaming', points: 40, monthlyPrice: 0, costPrice: 109, description: 'Netflix Standard', icon: '🎬' },
  { id: 'stream-viaplay', name: 'Viaplay', category: 'streaming', points: 30, monthlyPrice: 0, costPrice: 99, description: 'Viaplay med sport', icon: '▶️' },
  { id: 'stream-hbo', name: 'HBO Max', category: 'streaming', points: 35, monthlyPrice: 0, costPrice: 89, description: 'HBO Max', icon: '🎭' },
  { id: 'stream-disney', name: 'Disney+', category: 'streaming', points: 25, monthlyPrice: 0, costPrice: 69, description: 'Disney+ Standard', icon: '✨' },
  { id: 'sec-nettvern', name: 'Nettvern', category: 'security', points: 0, monthlyPrice: 0, costPrice: 5, description: 'Sikkerhetsfilter inkludert', icon: '🛡️' },
  { id: 'sec-plus', name: 'Nettvern+', category: 'security', points: 20, monthlyPrice: 0, costPrice: 15, description: 'Utvidet sikkerhet og VPN', icon: '🔐' },
  { id: 'hw-router-std', name: 'Telenor Router', category: 'hardware', points: 0, monthlyPrice: 0, costPrice: 25, description: 'Standard WiFi 6 ruter inkludert', icon: '📶' },
  { id: 'hw-router-pro', name: 'Telenor Router Pro', category: 'hardware', points: 30, monthlyPrice: 0, costPrice: 59, description: 'Avansert WiFi 6E mesh-ruter', icon: '📶' },
];

export const OFFER_PACKAGES: OfferPackage[] = [
  { id: 'pkg-s', name: 'Frihet S', tier: 'S', totalPoints: 200, monthlyPrice: 399, defaultProducts: ['bb-1000', 'sec-nettvern', 'hw-router-std'], description: 'Enkel og rask bredbåndsløsning uten TV', color: 'hsl(197 100% 47%)' },
  { id: 'pkg-m', name: 'Frihet M', tier: 'M', totalPoints: 260, monthlyPrice: 499, defaultProducts: ['tv-basis', 'stream-netflix', 'bb-250', 'sec-nettvern', 'hw-router-std'], description: 'Populær pakke med TV og strømming', color: 'hsl(225 60% 35%)', featured: true },
  { id: 'pkg-l', name: 'Frihet L', tier: 'L', totalPoints: 320, monthlyPrice: 599, defaultProducts: ['tv-basis', 'stream-netflix', 'stream-viaplay', 'bb-500', 'sec-nettvern', 'hw-router-std'], description: 'Komplett pakke med sport og strømming', color: 'hsl(225 70% 20%)' },
  { id: 'pkg-xl', name: 'Frihet XL', tier: 'XL', totalPoints: 400, monthlyPrice: 699, defaultProducts: ['tv-basis', 'tv-sport', 'stream-netflix', 'stream-hbo', 'stream-viaplay', 'bb-1000', 'sec-nettvern', 'sec-plus', 'hw-router-pro'], description: 'Alt inkludert – maksimal frihet', color: 'hsl(280 60% 30%)' },
];

// Tilbud hentes fra Sales Core API — ingen mock-tilbud her
