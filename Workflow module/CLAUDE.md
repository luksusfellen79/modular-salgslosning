# Workflow & Orchestration Module — Claude Code instruksjoner

Du er en senior Node.js/TypeScript-utvikler. Du bygger **workflow-modulen** i Telenors nye modulære salgsplattform. Jobb systematisk, skriv produksjonsklar kode, og følg konvensjonene nedenfor til punkt og prikke.

---

## Kontekst: Hva dette er

Telenor erstatter Salesforce med en modulær arkitektur. Denne modulen er **orkestreringsaget** — den lytter på events fra andre moduler og kjører forretningsprosesser som spenner over modulgrenser. Den eier ingen bruker-UI, bare bakgrunnsprosesser.

**Den viktigste prosessen å bygge nå:** Månedlig provisjonsrapport-flyt.

I dag skjer dette manuelt: en leder teller opp salg per byrå, skriver en rapport, sender til byråsjef for godkjenning, og lager en PO manuelt til finance. Alt dette skal automatiseres.

---

## Stack

- **Runtime:** Node.js 20 + TypeScript (strict mode)
- **HTTP:** Express (kun for intern health/status API)
- **Jobber:** node-cron (tidsstyrte jobber) + Bull (jobbkø med Redis)
- **Logging:** Winston (JSON-format, samme mønster som gateway)
- **Testing:** Jest
- **Bygg:** tsc

---

## Arkitektur: tre lag

```
[EventBus]          ← lytter på events fra andre moduler
     |
[Workflow Engine]   ← bestemmer hvilken prosess som kjøres
     |
[Handlers]          ← implementerer selve prosessene
     |
[Gateway Client]    ← henter data fra gateway-API
```

---

## EventBus-abstraksjon (KRITISK — bygg dette først)

Modulen MÅ bruke en abstraksjon over event-transport. Vi kjører InMemory lokalt, men skal koble til Kafka på jobb. Bytt av transport = én linje i `index.ts`.

```typescript
// src/events/event-bus.interface.ts
export interface EventBus {
  publish(eventName: string, payload: unknown): Promise<void>;
  subscribe(eventName: string, handler: (payload: unknown) => Promise<void>): void;
}
```

Lag to implementasjoner:

**`src/events/in-memory-event-bus.ts`** — brukes lokalt og i tester. EventEmitter under. Logg alle events med Winston.

**`src/events/kafka-event-bus.ts`** — stub som kaster `NotImplementedError` med melding: `"KafkaEventBus er ikke implementert ennå — kobles til ved integrasjon mot Telenor Kafka"`. Denne skal IKKE implementeres nå.

Valg av implementasjon styres av env-var `EVENT_BUS_TYPE`:
- `inmemory` (default) → InMemoryEventBus
- `kafka` → KafkaEventBus

---

## Gateway Client

Lag `src/gateway/gateway-client.ts` — en typed HTTP-klient mot CRM Gateway.

```typescript
export class GatewayClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  // Hent alle salg for en gitt periode
  async getSalesForPeriod(fromDate: string, toDate: string, correlationId: string): Promise<Sale[]>

  // Hent liste over byråer/kanaler
  async getAgencies(correlationId: string): Promise<Agency[]>
}
```

Typer å definere i `src/gateway/types.ts`:

```typescript
export interface Sale {
  id: string;
  agencyId: string;
  agencyName: string;
  salesRepId: string;
  salesRepName: string;
  productId: string;
  productName: string;
  amount: number;
  commissionRate: number;  // prosent, f.eks. 0.08 = 8%
  saleDate: string;        // ISO 8601
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface Agency {
  id: string;
  name: string;
  contactEmail: string;
  managerId: string;
}
```

Alle kall skal:
- Sende `x-api-key` header
- Sende `x-correlation-id` header
- Logge request + responstid med Winston
- Kaste `GatewayError` ved HTTP-feil (ikke native axios-feil)

Gateway-URL og API-nøkkel fra env-vars: `GATEWAY_URL` og `GATEWAY_API_KEY`.

**Viktig:** I starten finnes ikke disse endepunktene i gateway ennå. GatewayClient skal returnere mock-data i development-modus (`NODE_ENV=development`) i stedet for å kaste feil. Bruk realistisk mock-data: 3 byråer, 10-15 salg fordelt mellom dem.

---

## Prosess 1: Månedlig provisjonsrapport

### Trigger
To måter å starte:
1. **Cron:** Kjøres automatisk 1. virkedag hver måned kl 08:00 (node-cron)
2. **Manuell:** POST `/internal/trigger/monthly-commission` (for testing og re-kjøring)

### Forretningslogikk — steg for steg

**Steg 1: Aggregering**

Hent alle salg for forrige måned fra GatewayClient. Grupper per byrå. For hvert byrå, beregn:
- Antall salg
- Total omsetning (sum av `amount`)
- Total provisjon (sum av `amount * commissionRate`)
- Breakdown per selger (navn, antall salg, provisjon)

**Steg 2: Rapport-generering**

Lag et `CommissionReport`-objekt:

```typescript
export interface CommissionReport {
  id: string;           // uuid
  period: string;       // "2025-04" (år-måned)
  generatedAt: string;  // ISO timestamp
  status: 'pending_approval' | 'approved' | 'rejected' | 'exported';
  agencies: AgencyCommission[];
  totals: {
    totalSales: number;
    totalRevenue: number;
    totalCommission: number;
  };
}

export interface AgencyCommission {
  agencyId: string;
  agencyName: string;
  contactEmail: string;
  salesCount: number;
  totalRevenue: number;
  totalCommission: number;
  salesReps: SalesRepCommission[];
}

export interface SalesRepCommission {
  salesRepId: string;
  salesRepName: string;
  salesCount: number;
  commission: number;
}
```

**Steg 3: Lagring**

Lagre rapport til fil (JSON) i `./data/reports/{period}.json`. Oppdater en indeks-fil `./data/reports/index.json` med alle rapporter og status.

**Steg 4: Godkjenningskø**

Legg rapporten på en Bull-kø (`approval-queue`). Publiser event `commission_report_created` på EventBus med rapport-ID og periode.

**Steg 5: Varsling (simulert)**

Logg en linje som simulerer e-postvarsling til byråledere:
```
logger.info('approval_notification_sent', { reportId, period, recipientEmails: [...] })
```
(Faktisk e-postutsendelse implementeres ikke nå — det er en fremtidig integrasjon.)

### Godkjenningsflyt

**POST `/internal/reports/{reportId}/approve`**
- Oppdater rapport-status til `approved`
- Publiser event `commission_report_approved`
- Kjør steg: eksport til PO-fil (se under)

**POST `/internal/reports/{reportId}/reject`**
- Body: `{ reason: string }`
- Oppdater status til `rejected`
- Logg årsak
- Publiser event `commission_report_rejected`

### PO-eksport

Når rapport er godkjent, generer en JSON-fil i `./data/exports/{reportId}_PO.json` med formatet:

```typescript
interface POExport {
  exportedAt: string;
  period: string;
  lineItems: Array<{
    description: string;  // "Provisjon - {agencyName} - {period}"
    agencyName: string;
    agencyId: string;
    amount: number;
    currency: 'NOK';
  }>;
  totalAmount: number;
  currency: 'NOK';
}
```

Logg: `logger.info('po_export_generated', { reportId, exportPath, totalAmount })`

---

## HTTP API (intern)

Ingen bruker-auth på disse — de er interne og kjører bak gateway.

```
GET  /health                                    — liveness probe
GET  /internal/reports                          — liste alle rapporter med status
GET  /internal/reports/:reportId                — hent én rapport
POST /internal/trigger/monthly-commission       — trigger rapport-generering manuelt
POST /internal/reports/:reportId/approve        — godkjenn rapport
POST /internal/reports/:reportId/reject         — avvis rapport (body: { reason })
GET  /internal/exports/:reportId                — hent PO-eksport for godkjent rapport
```

---

## Logging-standard

Bruk Winston. Alle logglinjer skal ha `correlationId`. Bruk samme format som gateway:

```typescript
logger.info('hendelse', { correlationId, ...felter });
logger.warn('advarsel', { correlationId, ...felter });
logger.error('feil', { error: err.message, correlationId });
```

Aldri `console.log`.

---

## Miljøvariabler

Lag `.env.example` med alle variabler:

```
# Gateway
GATEWAY_URL=http://localhost:3000
GATEWAY_API_KEY=key-workflow-module

# EventBus
EVENT_BUS_TYPE=inmemory   # inmemory | kafka

# Bull / Redis (for jobbkø)
REDIS_URL=redis://localhost:6379

# Workflow
WORKFLOW_PORT=3002
NODE_ENV=development
```

---

## Filstruktur å bygge

```
workflow-module/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                          ← entry point, kobler alt sammen
│   ├── events/
│   │   ├── event-bus.interface.ts        ← interface
│   │   ├── in-memory-event-bus.ts        ← implementasjon
│   │   └── kafka-event-bus.ts            ← stub
│   ├── gateway/
│   │   ├── gateway-client.ts             ← HTTP-klient mot CRM Gateway
│   │   └── types.ts                      ← Sale, Agency etc.
│   ├── workflows/
│   │   ├── commission/
│   │   │   ├── aggregator.ts             ← aggregering av salgsdata
│   │   │   ├── report-generator.ts       ← CommissionReport-bygging
│   │   │   ├── po-exporter.ts            ← PO JSON-eksport
│   │   │   └── types.ts                  ← CommissionReport, POExport etc.
│   │   └── workflow-engine.ts            ← registrerer workflows, lytter på events
│   ├── queue/
│   │   └── approval-queue.ts             ← Bull-kø for godkjenning
│   ├── storage/
│   │   └── report-store.ts               ← les/skriv rapporter fra disk
│   ├── scheduler/
│   │   └── cron.ts                       ← node-cron setup
│   ├── api/
│   │   └── router.ts                     ← Express-ruter (interne endepunkter)
│   └── logger.ts                         ← Winston-oppsett
├── data/
│   ├── reports/                          ← genererte rapporter (JSON)
│   └── exports/                          ← PO-eksporter (JSON)
└── tests/
    ├── commission.test.ts                ← test av aggregering og rapport-logikk
    └── gateway-client.test.ts            ← test av mock-data i dev-modus
```

---

## Tester å skrive (Jest)

**`tests/commission.test.ts`**
- Aggregerer 10 mock-salg riktig per byrå
- Beregner provisjon korrekt (amount * commissionRate)
- Rapport får status `pending_approval` etter generering
- Rapport får status `approved` etter godkjenning
- PO-fil genereres med riktige linjer og totalbeløp

**`tests/gateway-client.test.ts`**
- GatewayClient returnerer mock-data i development-modus
- GatewayClient kaster `GatewayError` på HTTP 502

---

## Konvensjoner

- TypeScript strict mode — ingen `any` uten god grunn
- Async/await overalt
- Alle filer starter med en kommentarlinje: `// ── [Beskrivelse] ──`
- Eksporter alltid typer fra `types.ts` i samme mappe
- Null-sikkerhet: bruk optional chaining, ikke `!`-assertions uten grunn

---

## Hva som IKKE skal bygges nå

- Kafka-integrasjon (kun stub)
- Faktisk e-postutsendelse
- Bruker-auth på API-endepunktene
- Frontend
- Database (fil-basert lagring er nok for nå)
- KAS Core-integrasjon
- PDF-generering av rapport

---

## Steg-for-steg byggrekkefølge (følg denne)

1. `src/logger.ts` — Winston-oppsett
2. `src/events/` — EventBus interface + InMemoryEventBus + KafkaEventBus-stub
3. `src/gateway/types.ts` + `src/gateway/gateway-client.ts` (med mock-data i dev)
4. `src/workflows/commission/types.ts`
5. `src/workflows/commission/aggregator.ts`
6. `src/workflows/commission/report-generator.ts`
7. `src/storage/report-store.ts`
8. `src/workflows/commission/po-exporter.ts`
9. `src/queue/approval-queue.ts`
10. `src/scheduler/cron.ts`
11. `src/workflows/workflow-engine.ts`
12. `src/api/router.ts`
13. `src/index.ts`
14. `tests/commission.test.ts` + `tests/gateway-client.test.ts`
15. `.env.example` + `README-kjøring.md` med instrukser for å starte lokalt

Når alle filer er på plass: kjør `npm run typecheck` og `npm test`. Fiks alle feil før du er ferdig.
