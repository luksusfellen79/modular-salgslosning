# Route Planning Module — Claude Code instruksjoner

Du er en senior Node.js/TypeScript-utvikler. Du bygger **planleggingsmodulen** i Telenors nye modulære salgsplattform. Jobb systematisk, skriv produksjonsklar kode, og følg konvensjonene nedenfor til punkt og prikke.

---

## Kontekst: Hva dette er

Telenor har feltselgere som banker på dører i boligblokker og boligfelt for å selge internett, TV og mobil. I dag styres dette manuelt. Planleggingsmodulen gir:

- **Planleggere/ledere** et verktøy for å opprette dagsruter og tildele dem til feltselgere
- **Feltselgere** en strukturert oversikt over hvilke bygg og dører de skal besøke, med mulighet til å logge status underveis
- **Systemet** events om salgsinteresse og fullførte ruter, som andre moduler kan abonnere på

Modulen har ingen bruker-UI — det er en backend-tjeneste som betjener feltsalgs-frontenden og planlegger-frontenden.

---

## Stack

- **Runtime:** Node.js 20 + TypeScript (strict mode)
- **HTTP:** Express
- **Logging:** Winston (JSON-format, samme mønster som gateway og workflow-modulen)
- **Testing:** Jest
- **Bygg:** tsc

---

## Datamodell

Definer alle typer i `src/types/index.ts`.

### Building (bygg/adresse)

```typescript
export interface Building {
  id: string;
  address: string;          // "Storgata 12"
  city: string;
  postalCode: string;
  totalUnits: number;       // totalt antall enheter/dører
  buildingType: 'apartment_block' | 'row_house' | 'detached';
  coordinates?: { lat: number; lng: number };
  notes?: string;           // f.eks. "Krever port-kode 1234"
  createdAt: string;
}
```

### Unit (leilighet/dør)

```typescript
export interface Unit {
  id: string;
  buildingId: string;
  unitNumber: string;       // "H0201", "3B", "Leil. 12" etc.
  floor: number;
  residentName?: string;    // hentet fra Integration Layer
  isExistingCustomer: boolean;
  existingProducts?: string[];  // hva kunden har i dag, f.eks. ["Fiber 500", "TV Basis"]
}
```

### VisitStatus

```typescript
export type VisitStatus =
  | 'not_visited'
  | 'no_answer'
  | 'not_interested'
  | 'interested'
  | 'sale_registered'
  | 'existing_customer_upgrade'
  | 'existing_customer_no_change';
```

### Visit (besøkslogg)

```typescript
export interface Visit {
  id: string;
  unitId: string;
  buildingId: string;
  routeId: string;
  salesRepId: string;
  visitedAt: string;        // ISO timestamp
  status: VisitStatus;
  notes?: string;
  interestedProducts?: string[];   // hvilke produkter kunden er interessert i
  followUpDate?: string;           // dato for oppfølging (ISO date)
}
```

### RouteAssignment (dagsrute)

```typescript
export interface RouteAssignment {
  id: string;
  date: string;             // "2026-05-05" — ISO date
  salesRepId: string;
  salesRepName: string;
  buildingIds: string[];    // rekkefølgen er foreslått besøksrekkefølge
  status: 'planned' | 'in_progress' | 'completed';
  createdBy: string;        // planlegger-ID
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}
```

### RouteProgress (beregnet, ikke lagret)

```typescript
export interface RouteProgress {
  routeId: string;
  totalUnits: number;
  visitedUnits: number;
  notAnswered: number;
  notInterested: number;
  interested: number;
  salesRegistered: number;
  completionPercent: number;
  buildingProgress: BuildingProgress[];
}

export interface BuildingProgress {
  buildingId: string;
  address: string;
  totalUnits: number;
  visitedUnits: number;
  salesRegistered: number;
  status: 'not_started' | 'in_progress' | 'completed';
}
```

---

## EventBus

Bruk **nøyaktig samme EventBus-interface og InMemoryEventBus** som i workflow-modulen. Kopier filen `src/events/event-bus.interface.ts` og `src/events/in-memory-event-bus.ts` — de er identiske. Lag også KafkaEventBus-stub på samme vis.

Events denne modulen publiserer:
- `route_started` — feltselger starter sin rute
- `visit_logged` — besøk registrert (med status)
- `sale_interest_registered` — spesifikt event når status er `interested`
- `route_completed` — feltselger markerer ruten som ferdig

---

## Integration Layer Client

Lag `src/integration-layer/integration-layer-client.ts` — henter beboerdata fra Integration Layer.

```typescript
export class IntegrationLayerClient {
  async getResidentsForBuilding(buildingId: string, correlationId: string): Promise<Resident[]>
}
```

Kall `INTEGRATION_LAYER_URL/buildings/:buildingId/residents`. Kast `IntegrationLayerError` på feil.

---

## Seed-data

Lag `src/seed/seed-data.ts` med realistiske norske testdata som lastes ved oppstart i dev-modus.

**3 bygg i Oslo:**

1. **Storgata 12, 0155 Oslo** — 24 leiligheter (6 etasjer, 4 per etasje), apartment_block
   - Koordinater: 59.9127, 10.7461
   - 6 eksisterende Telenor-kunder
   
2. **Kirkeveien 45, 0368 Oslo** — 18 leiligheter (3 etasjer, 6 per etasje), apartment_block
   - Koordinater: 59.9242, 10.7184
   - 4 eksisterende kunder

3. **Ekebergveien 14, 1178 Oslo** — 12 enheter, row_house
   - Koordinater: 59.8939, 10.7934
   - 2 eksisterende kunder

**2 feltselgere:**
- `rep-field-1`: "Jonas Mikkelsen"
- `rep-field-2`: "Amina Osei"

**2 dagsruter (for dagens dato):**
- Jonas: Storgata 12 + Kirkeveien 45
- Amina: Ekebergveien 14

Seed-data skrives til data-filene ved oppstart hvis de ikke finnes fra før (`if (!fs.existsSync(path))`).

---

## Lagring

Fil-basert, samme tilnærming som workflow-modulen. Bruk `src/storage/` med separate stores:

- `src/storage/building-store.ts` — Buildings og Units
- `src/storage/route-store.ts` — RouteAssignments
- `src/storage/visit-store.ts` — Visits

Data-filer i `./data/`:
- `./data/buildings.json` — alle bygg
- `./data/units.json` — alle enheter
- `./data/routes.json` — alle ruter
- `./data/visits.json` — alle besøk

---

## HTTP API

### Planlegger-endepunkter

```
GET  /buildings                          — liste alle bygg
GET  /buildings/:id                      — bygg med alle enheter og beboerdata
POST /buildings                          — opprett nytt bygg
GET  /buildings/:id/units                — alle enheter i et bygg (med visit-status hvis routeId er query-param)

POST /routes                             — opprett ny rute
  Body: { date, salesRepId, salesRepName, buildingIds, createdBy, notes? }

GET  /routes                             — liste ruter (query: date?, salesRepId?, status?)
GET  /routes/:id                         — rute med progress-beregning
GET  /routes/:id/progress                — kun RouteProgress
```

### Feltselger-endepunkter

```
GET  /routes/my/today?salesRepId=xxx     — min rute for i dag med full detalj
GET  /routes/:id/buildings/:buildingId   — enheter i ett bygg med visit-status

POST /visits                             — registrer besøk
  Body: { unitId, buildingId, routeId, salesRepId, status, notes?, interestedProducts?, followUpDate? }

PATCH /visits/:id                        — oppdater besøk (kun status, notes, interestedProducts)
GET  /visits?routeId=xxx                 — alle besøk for en rute
GET  /visits?unitId=xxx                  — besøkshistorikk for en enhet

POST /routes/:id/start                   — marker rute som in_progress
POST /routes/:id/complete                — marker rute som completed
```

### Helse

```
GET  /health                             — liveness probe
```

---

## Forretningsregler

1. En feltselger kan ikke starte en rute som ikke er tildelt dem (`salesRepId` må matche)
2. En enhet kan bare ha ett aktivt besøk per rute (men historikk fra andre ruter beholdes)
3. Når alle enheter i et bygg har status != `not_visited`, settes byggets status til `completed`
4. Når alle bygg i en rute er `completed`, publiseres event `route_completed`
5. Eksisterende kunder (`isExistingCustomer: true`) vises med flagg — feltselger kan registrere `existing_customer_upgrade` eller `existing_customer_no_change`
6. `sale_interest_registered` publiseres når status settes til `interested` — payload: `{ routeId, unitId, salesRepId, interestedProducts }`

---

## Logging-standard

Bruk Winston. Alle logglinjer skal ha `correlationId`. Samme mønster som gateway:

```typescript
logger.info('hendelse', { correlationId, ...felter });
logger.warn('advarsel', { correlationId, ...felter });
logger.error('feil', { error: err.message, correlationId });
```

Aldri `console.log`.

---

## Miljøvariabler

Lag `.env.example`:

```
ROUTE_PLANNER_PORT=3003
NODE_ENV=development

# Integration Layer
INTEGRATION_LAYER_URL=http://localhost:3010

# EventBus
EVENT_BUS_TYPE=inmemory
```

---

## Filstruktur

```
route-planning-module/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                        ← entry point
│   ├── types/
│   │   └── index.ts                    ← alle typer
│   ├── logger.ts                       ← Winston
│   ├── events/
│   │   ├── event-bus.interface.ts
│   │   ├── in-memory-event-bus.ts
│   │   └── kafka-event-bus.ts
│   ├── integration-layer/
│   │   └── integration-layer-client.ts
│   ├── seed/
│   │   └── seed-data.ts
│   ├── storage/
│   │   ├── building-store.ts
│   │   ├── route-store.ts
│   │   └── visit-store.ts
│   ├── logic/
│   │   ├── progress-calculator.ts      ← beregner RouteProgress fra visits
│   │   └── route-validator.ts          ← forretningsreglene
│   └── api/
│       ├── router.ts                   ← samler alle ruter
│       ├── buildings.router.ts
│       ├── routes.router.ts
│       └── visits.router.ts
├── data/                               ← generert ved kjøring
│   ├── buildings.json
│   ├── units.json
│   ├── routes.json
│   └── visits.json
└── tests/
    ├── progress-calculator.test.ts
    ├── route-validator.test.ts
    └── visit-flow.test.ts
```

---

## Tester å skrive (Jest)

**`tests/progress-calculator.test.ts`**
- 0 besøk → completionPercent = 0
- Alle enheter visited → completionPercent = 100
- Blanding av statuser → riktig fordeling på notAnswered/notInterested/interested/salesRegistered
- buildingProgress reflekterer status per bygg korrekt

**`tests/route-validator.test.ts`**
- Feil salesRepId på start → kaster feil
- Duplikat visit på samme enhet i samme rute → returnerer eksisterende, ikke duplikat
- Rute kan ikke settes til completed hvis status ikke er in_progress

**`tests/visit-flow.test.ts`**
- Full flyt: opprett rute → start → logg besøk på alle enheter i ett bygg → verifiser BuildingProgress
- Status `interested` → event `sale_interest_registered` publiseres
- Alle bygg completed → event `route_completed` publiseres

---

## Konvensjoner

- TypeScript strict mode — ingen `any`
- Async/await overalt
- Alle filer starter med `// ── [Beskrivelse] ──`
- Eksporter typer fra `src/types/index.ts`
- Correlation ID på alle logglinjer

---

## Hva som IKKE bygges nå

- Kartvisning / geografisk optimering av rute
- Push-varsler til feltselger
- Faktisk Integration Layer-integrasjon (klient på plass)
- Autentisering på endepunktene
- Bulk-import av adresser

---

## Byggrekkefølge (følg denne)

1. `src/logger.ts`
2. `src/types/index.ts`
3. `src/events/` — interface, InMemory, Kafka-stub
4. `src/integration-layer/integration-layer-client.ts`
5. `src/storage/building-store.ts`
6. `src/storage/route-store.ts`
7. `src/storage/visit-store.ts`
8. `src/seed/seed-data.ts`
9. `src/logic/progress-calculator.ts`
10. `src/logic/route-validator.ts`
11. `src/api/buildings.router.ts`
12. `src/api/routes.router.ts`
13. `src/api/visits.router.ts`
14. `src/api/router.ts`
15. `src/index.ts`
16. `tests/progress-calculator.test.ts`
17. `tests/route-validator.test.ts`
18. `tests/visit-flow.test.ts`
19. `.env.example`

Kjør `npm run typecheck` og `npm test` når alt er på plass. Fiks alle feil før du er ferdig.
