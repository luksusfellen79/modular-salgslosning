# Sales Core — Claude Code instruksjoner

Du er en senior Node.js/TypeScript-utvikler. Du bygger **Sales Core** — det nye kjernesystemet for MDU-salg i Telenors modulære salgsplattform. Sales Core erstatter Salesforce for opportuniteter og tilbud, og legger til real-time sporingsvarslinger via SSE.

Koden skal være enkel, lesbar og lett å koble mot ekte database senere.

---

## Kontekst

MDU CRM-frontenden (dealflow-crm-main) har i dag hardkodet mock-data for:
- Opportunities (fra `OFFER_SF_OPPORTUNITIES` — Salesforce-mock)
- Offers med status draft/sent/viewed/accepted/declined

Sales Core erstatter begge. I tillegg serverer Sales Core:
1. En sporings-URL per tilbud som selger kopierer og sender til kunden
2. En kundeportal (enkel HTML-side) der kunden kan akseptere eller avvise tilbudet
3. SSE-stream der MDU CRM-frontenden lytter på hendelser og viser toast-varsler

---

## Stack

- **Runtime:** Node.js 20 + TypeScript (strict mode)
- **HTTP:** Express med CORS aktivert
- **Storage:** Fil-basert JSON (ingen database) — data lagres i `data/`-mappen
- **Logging:** Winston (JSON-format)
- **Realtime:** Server-Sent Events (SSE) — innebygd i Node/Express, ingen ekstra pakke
- **Events:** InMemoryEventBus (samme mønster som workflow-modulen)
- **Testing:** Jest + supertest

Ingen Kafka, ingen Bull, ingen cron. Bare Express + filer + SSE.

---

## Datamodell

Definer alle typer i `src/types/index.ts`.

```typescript
export type OpportunityStage =
  | 'prospect'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed-won'
  | 'closed-lost';

export interface Opportunity {
  id: string;
  name: string;
  accountName: string;
  contactName: string;
  contactEmail: string;
  stage: OpportunityStage;
  closeDate: string;        // ISO date
  estimatedAnnualValue: number;  // NOK per år
  units: number;            // antall enheter/leiligheter
  notes?: string;
  createdAt: string;        // ISO datetime
  updatedAt: string;
}

export type OfferStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined';

export interface Offer {
  id: string;
  opportunityId: string;
  accountName: string;
  contactName: string;
  contactEmail: string;
  packageId: string;
  packageName: string;
  selectedProducts: string[];  // produkt-ID-er fra MDU CRM
  monthlyPricePerUnit: number;
  discountPercent: number;
  units: number;
  notes?: string;
  salesRepName: string;
  trackingToken: string;   // UUID — brukes i sporings-URL
  status: OfferStatus;
  validUntil: string;      // ISO date
  createdAt: string;
  updatedAt: string;
}

export type OfferEventType = 'created' | 'sent' | 'viewed' | 'accepted' | 'declined';

export interface OfferEvent {
  id: string;
  offerId: string;
  opportunityId: string;
  accountName: string;
  type: OfferEventType;
  timestamp: string;       // ISO datetime
  ipAddress?: string;      // klientens IP ved tracking-hendelser
}

// SSE-payload sendt til seller-frontend
export interface SseNotification {
  type: 'offer.viewed' | 'offer.accepted' | 'offer.declined';
  offerId: string;
  accountName: string;
  contactName: string;
  timestamp: string;
  message: string;         // Ferdig tekst til toast: "Fjordheim Sameie åpnet tilbudet ditt — nå"
}
```

---

## Fil-basert lagring

Lag `src/storage/index.ts` med enkle lese/skrive-funksjoner.

```typescript
// Alle data-filer er i data/-mappen (ikke src/)
// data/opportunities.json  → Opportunity[]
// data/offers.json         → Offer[]
// data/events.json         → OfferEvent[]

// Opprett data/-mappen og tomme JSON-arrays hvis filene ikke finnes
// Bruk fs.readFileSync / fs.writeFileSync med JSON.parse / JSON.stringify
// Ingen asynkron fil-IO — sync er ok for prototype

export function readOpportunities(): Opportunity[]
export function writeOpportunities(data: Opportunity[]): void
export function readOffers(): Offer[]
export function writeOffers(data: Offer[]): void
export function readEvents(): OfferEvent[]
export function writeEvents(data: OfferEvent[]): void
```

---

## Seed-data

Lag `src/seed/index.ts` som kjøres ved oppstart hvis `data/`-filene er tomme.

### Opportunities (5 stk — realistiske norske borettslag)

```typescript
const SEED_OPPORTUNITIES: Opportunity[] = [
  { id: 'opp-001', name: 'Parkveien Borettslag — Fellesavtale', accountName: 'Parkveien Borettslag', contactName: 'Erik Andersen', contactEmail: 'erik.andersen@parkveien.no', stage: 'proposal', closeDate: '2026-06-30', estimatedAnnualValue: 1020000, units: 120, createdAt: '...', updatedAt: '...' },
  { id: 'opp-002', name: 'Fjordheim Sameie — Bredbånd', accountName: 'Fjordheim Sameie', contactName: 'Marte Olsen', contactEmail: 'marte.olsen@fjordheim.no', stage: 'negotiation', closeDate: '2026-07-15', estimatedAnnualValue: 768000, units: 80, createdAt: '...', updatedAt: '...' },
  { id: 'opp-003', name: 'Solsiden Borettslag — TV+Bredbånd', accountName: 'Solsiden Borettslag', contactName: 'Lars Berg', contactEmail: 'lars.berg@solsiden.no', stage: 'qualification', closeDate: '2026-08-01', estimatedAnnualValue: 1440000, units: 200, createdAt: '...', updatedAt: '...' },
  { id: 'opp-004', name: 'Berglia Borettslag — Bredbånd', accountName: 'Berglia Borettslag', contactName: 'Kari Haugen', contactEmail: 'kari.haugen@berglia.no', stage: 'closed-won', closeDate: '2026-03-15', estimatedAnnualValue: 518400, units: 72, createdAt: '...', updatedAt: '...' },
  { id: 'opp-005', name: 'Torget Sameie — Pakkeløsning', accountName: 'Torget Sameie', contactName: 'Ole Strand', contactEmail: 'ole.strand@torget.no', stage: 'prospect', closeDate: '2026-09-01', estimatedAnnualValue: 648000, units: 90, createdAt: '...', updatedAt: '...' },
];
```

### Offers (3 stk — knyttet til opp-001, opp-002, opp-003)

Generer realistiske tilbud med ulike statuser:
- `opp-001`: status `sent`, trackingToken generert
- `opp-002`: status `viewed`, trackingToken generert
- `opp-003`: status `draft`

### Events (for tilbudene med status sent/viewed)

Generer tilsvarende OfferEvent-rader: created-event for alle, sent-event for opp-001 og opp-002, viewed-event for opp-002.

---

## SSE — Server-Sent Events

Lag `src/events/sse-manager.ts`:

```typescript
import { Response } from 'express';

// Holder alle aktive SSE-tilkoblinger
// Map fra connectionId (UUID) til Express Response-objekt
class SseManager {
  private connections: Map<string, Response> = new Map();

  addConnection(id: string, res: Response): void
  removeConnection(id: string): void
  broadcast(notification: SseNotification): void  // sender til alle tilkoblede klienter
}

export const sseManager = new SseManager();
```

SSE-protokoll for `GET /notifications/stream`:
```
Headers:
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive

Format per melding:
  data: {"type":"offer.viewed","offerId":"...","accountName":"...","message":"..."}\n\n

Heartbeat: send en kommentarlinje hvert 30. sekund for å holde tilkoblingen oppe:
  : heartbeat\n\n
```

---

## EventBus

Kopier mønsteret fra workflow-modulen:

```typescript
// src/events/event-bus.ts
export interface EventBus {
  publish(eventName: string, payload: unknown): Promise<void>;
  subscribe(eventName: string, handler: (payload: unknown) => Promise<void>): void;
}

// src/events/in-memory-event-bus.ts
// Bruker Node.js EventEmitter — identisk med workflow-modulens implementasjon

// src/events/index.ts
// Eksporterer én singleton: export const eventBus = new InMemoryEventBus();
```

Koble EventBus til SseManager i `src/index.ts`:
```typescript
eventBus.subscribe('offer.event', async (payload) => {
  const event = payload as OfferEvent;
  if (['viewed', 'accepted', 'declined'].includes(event.type)) {
    const notification = buildSseNotification(event);
    sseManager.broadcast(notification);
  }
});
```

---

## Kundeportal (HTML-side servert av Sales Core)

`GET /portal/:trackingToken` — Express serverer en enkel inline HTML-side (ingen ekstern fil, bruk `res.send()` med template string).

Siden skal:
1. Laste tilbudet via fetch til Sales Core `/api/offers/by-token/:trackingToken`
2. Vise: pakkenavn, pris per enhet, rabatt, notat, antall enheter
3. Ha to knapper: **Aksepter tilbudet** og **Avvis tilbudet**
4. Kalle `POST /track/:trackingToken/respond` ved klikk

Hold HTML-siden enkel men presentabel — Telenor-farger (`#00A650` grønn, `#005A8E` blå), responsiv, fungerer på mobil.

---

## HTTP API

Alle `/api/`-endepunkter returnerer JSON. Ingen auth. CORS åpen.

```
GET  /health
     → { status: "healthy", opportunities: number, offers: number }

# Opportunities
GET  /api/opportunities
     → Opportunity[]
     Query: ?stage=proposal (valgfritt filter)

GET  /api/opportunities/:id
     → Opportunity | 404

POST /api/opportunities
     Body: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>
     → Opportunity (201)

PATCH /api/opportunities/:id
     Body: Partial<Omit<Opportunity, 'id' | 'createdAt'>>
     → Opportunity | 404

# Offers
GET  /api/offers
     → Offer[]
     Query: ?opportunityId=opp-001 (valgfritt filter)

GET  /api/offers/:id
     → Offer | 404

GET  /api/offers/by-token/:trackingToken
     → Offer (offentlig — brukes av kundeportalen) | 404

POST /api/offers
     Body: Omit<Offer, 'id' | 'trackingToken' | 'status' | 'createdAt' | 'updatedAt'>
     → Offer med status=draft og nytt trackingToken (201)
     Publiserer offer.event med type=created

POST /api/offers/:id/send
     → Offer med status=sent | 404
     Publiserer offer.event med type=sent

PATCH /api/offers/:id
     Body: Partial<Pick<Offer, 'packageId' | 'packageName' | 'selectedProducts' |
                              'monthlyPricePerUnit' | 'discountPercent' | 'notes' |
                              'validUntil' | 'salesRepName'>>
     → Offer | 404

# Events / aktivitetslogg
GET  /api/offers/:id/events
     → OfferEvent[]

# Tracking (kalt av kundeportalen — ingen auth)
GET  /track/:trackingToken
     → Redirect til /portal/:trackingToken
     Registrerer viewed-hendelse (kun hvis status er 'sent' — ikke registrer flere views)
     Publiserer offer.event med type=viewed

POST /track/:trackingToken/respond
     Body: { action: 'accepted' | 'declined' }
     → { success: true, status: OfferStatus }
     Oppdaterer offer.status, publiserer offer.event

# Kundeportal
GET  /portal/:trackingToken
     → HTML-side (se over)

# SSE
GET  /notifications/stream
     → text/event-stream (holder forbindelsen åpen)
     Client kobler seg til ved sideinnlasting i MDU CRM
```

---

## Sporings-URL

Formatet på URL-en selger kopierer fra OfferHub:
```
https://{SALES_CORE_BASE_URL}/track/{trackingToken}
```

Miljøvariabel `SALES_CORE_BASE_URL` brukes til å bygge URL-en i API-responsen.
Legg til `trackingUrl` som et beregnet felt i Offer-responsen (ikke lagret i fil):

```typescript
// I router: legg til trackingUrl på Offer-objektet før det returneres
const offerWithUrl = {
  ...offer,
  trackingUrl: `${process.env.SALES_CORE_BASE_URL ?? 'http://localhost:3005'}/track/${offer.trackingToken}`,
};
```

---

## Filstruktur

```
sales-core/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── .env.example
├── data/                         ← opprettet automatisk ved første kjøring
│   ├── opportunities.json
│   ├── offers.json
│   └── events.json
└── src/
    ├── index.ts                  ← entry point
    ├── logger.ts                 ← Winston
    ├── types/
    │   └── index.ts
    ├── storage/
    │   └── index.ts              ← fil-basert JSON-lagring
    ├── seed/
    │   └── index.ts              ← seed-data ved tom data/
    ├── events/
    │   ├── event-bus.ts          ← interface
    │   ├── in-memory-event-bus.ts
    │   ├── sse-manager.ts        ← SSE-tilkoblinger
    │   └── index.ts              ← singleton eventBus
    └── api/
        └── router.ts             ← alle endepunkter
└── tests/
    ├── storage.test.ts
    ├── api.test.ts
    └── sse.test.ts
```

---

## Tester

**`tests/storage.test.ts`**
- readOpportunities() returnerer array
- writeOpportunities() + readOpportunities() er konsistent (round-trip)
- Samme for offers og events

**`tests/api.test.ts`** (supertest)
- GET /health → 200
- GET /api/opportunities → array med 5 opportunities fra seed
- GET /api/opportunities/:id for gyldig ID → 200
- GET /api/opportunities/ukjent → 404
- POST /api/offers → 201, har trackingToken og trackingUrl
- POST /api/offers/:id/send → status becomes 'sent'
- GET /api/offers/by-token/:trackingToken → 200
- POST /track/:trackingToken/respond med { action: 'accepted' } → { success: true }
- GET /api/offers/:id/events → array med events
- GET /api/opportunities?stage=proposal → kun proposal-opportunities

**`tests/sse.test.ts`**
- sseManager.broadcast() sender til alle tilkoblede klienter
- buildSseNotification() formaterer meldinger korrekt for alle tre event-typer

---

## Miljøvariabler

```
SALESCORE_PORT=3005
NODE_ENV=development
SALES_CORE_BASE_URL=http://localhost:3005
```

---

## Konvensjoner

- TypeScript strict mode — ingen `any`
- Alle filer starter med `// ── [Beskrivelse] ──`
- Kun Winston — ingen console.log
- CORS: `cors({ origin: '*' })` i dev
- Data-mappen opprettes med `fs.mkdirSync(dataDir, { recursive: true })` ved oppstart
- Timestamps: alltid `new Date().toISOString()`
- ID-er: alltid `uuid()` fra `uuid`-pakken

---

## Byggrekkefølge

1. `src/logger.ts`
2. `src/types/index.ts`
3. `src/storage/index.ts`
4. `src/events/event-bus.ts` + `in-memory-event-bus.ts` + `sse-manager.ts` + `events/index.ts`
5. `src/seed/index.ts`
6. `src/api/router.ts`
7. `src/index.ts`
8. `tests/storage.test.ts`
9. `tests/api.test.ts`
10. `tests/sse.test.ts`
11. `.env.example`

Kjør `npm run typecheck` og `npm test` når alt er på plass. Fiks alle feil.
