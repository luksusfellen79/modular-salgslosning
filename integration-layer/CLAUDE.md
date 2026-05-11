# Integration Layer — instruksjoner for Claude

Du er en senior Node.js/TypeScript-utvikler. Du jobber på **Integration Layer** — det sentrale datalaget i Telenors modulære salgsplattform. Denne tjenesten aggregerer data fra alle kilde-systemer (Fiber, Mobil, TV, Pris) og eksponerer ett rent API til Gateway og mikrotjenestene over.

---

## Rolle i arkitekturen

```
[Fiber-sys] [Mobil-sys] [TV-sys] [Pris-sys] [Kafka]
                      ↓
            [ Integration Layer ]   ← du er her
                      ↓
              [ Gateway Layer ]
                      ↓
   [MDU CRM] [SDU CRM] [Planner] [CPQ] [Hub]
```

Integration Layer er den **eneste** tjenesten som vet om kilde-systemene. Alle andre tjenester kaller Integration Layer — aldri kilde-systemene direkte.

---

## Stack

- **Runtime:** Node.js 20 + TypeScript (strict, CommonJS)
- **HTTP:** Express + CORS
- **Logging:** Winston (JSON)
- **Testing:** Jest + supertest
- **Deploy:** Railway (Nixpacks), port 3010
- **URL:** https://integration-layer-production.up.railway.app

---

## Filstruktur

```
src/
├── index.ts                    ← entry point, Express + adapter-registrering
├── logger.ts                   ← Winston
├── types/
│   └── domain.ts              ← unified domenemodell (Product, Campaign, Resident, Customer...)
├── adapters/
│   ├── IAdapter.ts            ← grensesnitt (IProductAdapter, ICustomerAdapter, IPricingAdapter)
│   ├── fiber/FiberAdapter.ts  ← mock: fiber-produkter + beboerdata (54 enheter, 3 bygg)
│   ├── mobile/MobileAdapter.ts
│   ├── tv/TvAdapter.ts
│   └── pricing/PricingAdapter.ts ← 8 kampanjer, prisberegning
├── registry/
│   └── AdapterRegistry.ts     ← orkestrerer alle adaptere, håndterer caching
├── cache/
│   └── InMemoryCache.ts       ← TTL-cache (byttes mot Redis i prod)
├── events/
│   ├── IEventBus.ts
│   ├── InMemoryEventBus.ts    ← brukes i POC
│   └── KafkaStub.ts           ← scaffold for prod (KAFKA_ENABLED=true + kafkajs)
└── api/
    ├── products.ts            ← GET /products, /products/:id, /products/available/check
    ├── customers.ts           ← GET /buildings/:id/residents, /residents/:id, /customers/:id, /search
    └── pricing.ts             ← GET /pricing/campaigns, /pricing/campaigns/segment, /pricing/calculate/:id
```

---

## API-endepunkter

```
GET  /health
     → { status, adapters[], cachedEntries, uptime }

GET  /products
     → Product[]  (aggregert fra fiber + mobil + tv-adaptere)

GET  /products/:productId
     → Product | 404

GET  /products/available/check?buildingId=xxx&unitId=xxx
     → AvailabilityResult  (produkter med kampanjepriser)

GET  /buildings/:buildingId/residents
     → ResidentSummary[]  (bakoverkompatibel med KAS Core mock)

GET  /buildings/:buildingId/residents/full
     → Resident[]

GET  /residents/:unitId
     → Resident | 404

GET  /customers/:customerId
     → Customer | 404

GET  /customers?buildingId=xxx
     → Customer[]

GET  /search?q=xxx
     → Resident[]

GET  /pricing/campaigns
     → Campaign[]

GET  /pricing/campaigns/segment?segment=new-customer|win-back|existing-customer|all
     → Campaign[]

GET  /pricing/calculate/:productId?customerId=xxx
     → PricedProduct | 404
```

---

## Nøkkelkonsepter

### SourceMeta
Alle entiteter har `meta: SourceMeta` som forteller hvor dataen kom fra:
```typescript
interface SourceMeta {
  source: 'fiber-system' | 'mobile-system' | 'tv-system' | 'pricing-system' | 'kafka' | 'mock';
  fetchedAt: string;  // ISO timestamp
  cached: boolean;
}
```

### Adapter-mønster
For å legge til et nytt kilde-system:
1. Opprett `src/adapters/nyttSystem/NyttSystemAdapter.ts`
2. Implementer `IProductAdapter`, `ICustomerAdapter` eller `IPricingAdapter`
3. Registrer i `src/index.ts` med `registry.registerProductAdapter(new NyttSystemAdapter())`

For å bytte mock → ekte system: kun adapteren endres, resten er uberørt.

### Cache-nøkler
- `products:all` — TTL 300s
- `availability:{buildingId}:{unitId}` — TTL 120s
- `residents:full:{buildingId}` — TTL 60s
- `residents:summary:{buildingId}` — TTL 60s
- `resident:{unitId}` — TTL 60s
- `customer:{customerId}` — TTL 60s
- `campaigns:all` — TTL 120s

---

## Miljøvariabler

```
INTEGRATION_PORT=3010
NODE_ENV=production
LOG_LEVEL=info
KAFKA_ENABLED=false          # sett true + installer kafkajs for å aktivere
CACHE_TTL_PRODUCTS=300
CACHE_TTL_CUSTOMERS=60
CACHE_TTL_PRICING=120
```

---

## Konvensjoner

- TypeScript strict mode — ingen `any`
- Alle filer starter med `// ── [Beskrivelse] ──`
- Kun Winston — ingen console.log
- Jest-mapper `.js`-imports automatisk (moduleNameMapper i package.json)
- Ingen ESM (`"type": "module"`) — CommonJS for jest-kompatibilitet

---

## Kjør lokalt

```bash
npm install
npm run dev          # ts-node src/index.ts, port 3010
npm run typecheck    # tsc --noEmit
npm test             # jest, 26 tester
```
