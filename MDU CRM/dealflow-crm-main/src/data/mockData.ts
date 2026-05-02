export interface Opportunity {
  id: string;
  name: string;
  accountName: string;
  value: number;
  stage: string;
  closeDate: string;
  owner: { name: string; initials: string; color: string };
  probability: number;
  units: number;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  source?: string;
  type?: string;
  createdDate: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'meeting' | 'email' | 'task';
  title: string;
  description?: string;
  date: string;
  completed: boolean;
  opportunityId: string;
}

export interface HistoryEntry {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  date: string;
  user: string;
  opportunityId: string;
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  opportunityId: string;
}

export const STAGES = [
  { id: 'prospect', label: 'Prospekt', color: 'stage-prospect' },
  { id: 'qualification', label: 'Kontaktet', color: 'stage-qualification' },
  { id: 'proposal', label: 'Tilbud sendt', color: 'stage-proposal' },
  { id: 'negotiation', label: 'Forhandling', color: 'stage-negotiation' },
  { id: 'closed-won', label: 'Vunnet/Tapt', color: 'stage-closed-won' },
];

const owners = [
  { name: 'Anna Kristiansen', initials: 'AK', color: 'hsl(217, 91%, 60%)' },
  { name: 'Jonas Mikkelsen', initials: 'JM', color: 'hsl(262, 83%, 58%)' },
  { name: 'Ingrid Solberg', initials: 'IS', color: 'hsl(142, 71%, 45%)' },
  { name: 'Henrik Lund', initials: 'HL', color: 'hsl(25, 95%, 53%)' },
];

export const opportunities: Opportunity[] = [
  { id: '1', name: 'Fellesavtale Bredbånd + TV', accountName: 'Jordbærhagen Borettslag', value: 125000, stage: 'negotiation', closeDate: '2026-05-15', owner: owners[0], probability: 75, units: 180, contactName: 'Erik Andersen', contactEmail: 'erik@jordbaerhagen.no', phone: '+47 900 12 345', source: 'Innkommende', type: 'Ny avtale', createdDate: '2026-01-10', description: 'Komplett fiberutbygging og TV-pakke for 180 leiligheter.' },
  { id: '2', name: 'Fiberoppgradering', accountName: 'Solbakken Sameie', value: 85000, stage: 'proposal', closeDate: '2026-06-01', owner: owners[1], probability: 50, units: 95, contactName: 'Marte Olsen', contactEmail: 'marte@solbakken.no', phone: '+47 911 22 333', source: 'Partner', type: 'Ny avtale', createdDate: '2026-02-05', description: 'Oppgradering fra kobber til fiber for 95 enheter.' },
  { id: '3', name: 'Fornyelse fellesavtale', accountName: 'Lillevann Borettslag', value: 45000, stage: 'closed-won', closeDate: '2026-04-01', owner: owners[2], probability: 100, units: 60, contactName: 'Lars Berg', contactEmail: 'lars@lillevann.no', phone: '+47 922 33 444', source: 'Eksisterende kunde', type: 'Fornyelse', createdDate: '2025-12-15' },
  { id: '4', name: 'Fellesavtale Bredbånd', accountName: 'Bjørkelia Borettslag', value: 200000, stage: 'prospect', closeDate: '2026-08-20', owner: owners[0], probability: 20, units: 240, contactName: 'Kari Haugen', contactEmail: 'kari@bjorkelia.no', phone: '+47 933 44 555', source: 'Utgående', type: 'Ny avtale', createdDate: '2026-03-20' },
  { id: '5', name: 'TV-pakke fellesavtale', accountName: 'Fjordheim Sameie', value: 67000, stage: 'qualification', closeDate: '2026-07-10', owner: owners[3], probability: 35, units: 85, contactName: 'Sigrid Dahl', contactEmail: 'sigrid@fjordheim.no', phone: '+47 944 55 666', source: 'Konferanse', type: 'Ny avtale', createdDate: '2026-03-01' },
  { id: '6', name: 'Strømming tillegg', accountName: 'Parkveien Borettslag', value: 38000, stage: 'prospect', closeDate: '2026-09-01', owner: owners[1], probability: 15, units: 75, contactName: 'Ole Strand', contactEmail: 'ole@parkveien.no', phone: '+47 955 66 777', source: 'Webinar', type: 'Tillegg', createdDate: '2026-03-28' },
  { id: '7', name: 'Fiberutbygging', accountName: 'Granåsen Borettslag', value: 92000, stage: 'qualification', closeDate: '2026-06-15', owner: owners[2], probability: 40, units: 110, contactName: 'Anne Lien', contactEmail: 'anne@granasen.no', phone: '+47 966 77 888', source: 'Referanse', type: 'Ny avtale', createdDate: '2026-02-20' },
  { id: '8', name: 'Komplett fellesløsning', accountName: 'Havnekanten Borettslag', value: 155000, stage: 'proposal', closeDate: '2026-05-30', owner: owners[3], probability: 55, units: 145, contactName: 'Tor Kristiansen', contactEmail: 'tor@havnekanten.no', phone: '+47 977 88 999', source: 'Innkommende', type: 'Ny avtale', createdDate: '2026-01-25' },
  { id: '9', name: 'Fornyelse + utvidelse', accountName: 'Torget Sameie', value: 28000, stage: 'negotiation', closeDate: '2026-04-25', owner: owners[0], probability: 80, units: 55, contactName: 'Nina Eriksen', contactEmail: 'nina@torgetsameie.no', phone: '+47 988 99 000', source: 'Utgående', type: 'Fornyelse', createdDate: '2026-02-10' },
  { id: '10', name: 'Fellesavtale Bredbånd 1000', accountName: 'Bekkestua Borettslag', value: 110000, stage: 'prospect', closeDate: '2026-10-01', owner: owners[2], probability: 10, units: 130, contactName: 'Jonas Mikkelsen', contactEmail: 'jonas@bekkestua.no', phone: '+47 911 00 222', source: 'Partner', type: 'Ny avtale', createdDate: '2026-04-01' },
];

export const activities: Activity[] = [
  { id: 'a1', type: 'call', title: 'Innledende samtale med Erik', date: '2026-04-07T14:00:00', completed: true, opportunityId: '1' },
  { id: 'a2', type: 'email', title: 'Sendt pristilbud', date: '2026-04-06T10:30:00', completed: true, opportunityId: '1' },
  { id: 'a3', type: 'meeting', title: 'Styremøtepresentasjon', date: '2026-04-10T15:00:00', completed: false, opportunityId: '1' },
  { id: 'a4', type: 'task', title: 'Klargjør kontraktsutkast', date: '2026-04-09T09:00:00', completed: false, opportunityId: '1' },
  { id: 'a5', type: 'call', title: 'Oppfølging med Marte', date: '2026-04-05T11:00:00', completed: true, opportunityId: '2' },
  { id: 'a6', type: 'meeting', title: 'Teknisk gjennomgang', date: '2026-04-11T13:00:00', completed: false, opportunityId: '2' },
  { id: 'a7', type: 'email', title: 'Sendt referansecase', date: '2026-04-04T16:00:00', completed: true, opportunityId: '5' },
  { id: 'a8', type: 'call', title: 'Introsamtale med Kari', date: '2026-04-08T10:00:00', completed: false, opportunityId: '4' },
];

export const historyEntries: HistoryEntry[] = [
  { id: 'h1', field: 'Stage', oldValue: 'Proposal', newValue: 'Negotiation', date: '2026-04-05T09:00:00', user: 'Anna Kristiansen', opportunityId: '1' },
  { id: 'h2', field: 'Value', oldValue: '$100,000', newValue: '$125,000', date: '2026-04-03T14:00:00', user: 'Anna Kristiansen', opportunityId: '1' },
  { id: 'h3', field: 'Close Date', oldValue: '2026-04-30', newValue: '2026-05-15', date: '2026-04-01T11:00:00', user: 'Anna Kristiansen', opportunityId: '1' },
  { id: 'h4', field: 'Stage', oldValue: 'Prospect', newValue: 'Qualification', date: '2026-03-15T10:00:00', user: 'Henrik Lund', opportunityId: '5' },
];

export const products: Product[] = [
  { id: 'p1', name: 'Bredbånd 1000 (fellesavtale)', quantity: 180, unitPrice: 449, total: 80820, opportunityId: '1' },
  { id: 'p2', name: 'T-We Basis TV-pakke', quantity: 180, unitPrice: 199, total: 35820, opportunityId: '1' },
  { id: 'p3', name: 'Fiberinstallasjon', quantity: 95, unitPrice: 500, total: 47500, opportunityId: '2' },
  { id: 'p4', name: 'Bredbånd 500 (fellesavtale)', quantity: 95, unitPrice: 395, total: 37525, opportunityId: '2' },
];

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const formatDateTime = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
