# KAS Core Mock Service — Claude Code instruksjoner

Du er en senior Node.js/TypeScript-utvikler. Du bygger en **mock-tjeneste for KAS Core** — Telenors master-system for kundedata. Dette er en enkel Express-server med realistisk seed-data som erstatter den ekte KAS Core under lokal utvikling og Railway-prototypen.

Koden skal være enkel, lesbar og lett å bytte ut med ekte KAS Core-integrasjon senere.

---

## Kontekst

KAS Core er Telenors interne masterdatabase for kundedata. Den nye salgsplattformen trenger kundeinformasjon fra KAS Core for å:

1. Vise feltselgere hvem som bor på en adresse, hva de har i dag, og om de er eksisterende Telenor-kunder
2. Gi Route planning-modulen beboerdata per bygg (enhet, navn, produkter, kundestatus)
3. Levere interessescorer og kampanjeanbefalinger per adresse til feltsalgs-appen

Denne mock-tjenesten returnerer statisk men realistisk norsk data. Den har ingen database — kun in-memory objekter.

---

## Stack

- **Runtime:** Node.js 20 + TypeScript (strict mode)
- **HTTP:** Express med CORS aktivert (frontends kaller denne direkte)
- **Logging:** Winston (JSON-format)
- **Testing:** Jest
- **Bygg:** tsc

Ingen Kafka, ingen Bull, ingen cron. Bare Express + data.

---

## Datamodell

Definer alle typer i `src/types/index.ts`.

```typescript
// En beboer/enhet i et bygg
export interface Resident {
  unitId: string;           // matcher Unit.id i route-planning-module
  buildingId: string;
  unitNumber: string;       // "H0201", "3B" etc.
  floor: number;
  name: string;             // beboerens fulle navn
  phone?: string;
  isExistingCustomer: boolean;
  customerId?: string;      // KAS Core kunde-ID (finnes kun hvis eksisterende kunde)
  existingProducts: string[]; // ["Fiber 500/500", "TV Start"] etc.
  previousProducts: string[]; // produkter de hadde før de churnet
  cancelReason?: string;    // hvorfor de forlot Telenor
  customerSince?: string;   // ISO date — når de ble kunde
}

// Detaljert kundeprofil (hentes på ID)
export interface Customer {
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  postalCode: string;
  city: string;
  unitId: string;
  buildingId: string;
  existingProducts: CustomerProduct[];
  previousProducts: CustomerProduct[];
  cancelReason?: string;
  customerSince: string;         // ISO date
  accountValue: number;          // månedlig verdi i NOK
  interestScores: InterestScores;
  campaigns: Campaign[];
  upsellProducts: string[];
}

export interface CustomerProduct {
  productId: string;
  name: string;
  monthlyCost: number;
  activeSince: string;  // ISO date
}

export interface InterestScores {
  sikre: number;       // 0–100: sannsynlighet for kjøp av sikkerhetsprodukter
  mobil: number;       // 0–100: mobilinteresse
  internett: number;   // 0–100: internett-upsell/nytt produkt
  produktX: number;    // 0–100: Produkt X pilot-interesse
}

export interface Campaign {
  id: string;
  name: string;
  tag: string;          // "Kampanje", "Win-back", "Upsell", "Nykunde" etc.
  product: string;
  price: string;        // "549 kr/md"
  discount: string;     // "30%" eller "—"
  pitch: string;        // salgspitch til feltselgeren
  color: string;        // hex-farge for UI
}

// Hva route-planning-modulen trenger (subset av Resident)
export interface ResidentSummary {
  unitId: string;
  name: string;
  isExistingCustomer: boolean;
  existingProducts: string[];
}
```

---

## Seed-data

Lag `src/seed/index.ts` med realistiske norske data.

### Bygg og enheter (matcher route-planning-module sin seed-data)

Bruk **nøyaktig de samme building-ID-ene** som route-planning-module bruker:
- `building-storgata-12` — Storgata 12, 0155 Oslo — 24 leiligheter (6 etasjer × 4)
- `building-kirkeveien-45` — Kirkeveien 45, 0368 Oslo — 18 leiligheter (3 etasjer × 6)
- `building-ekebergveien-14` — Ekebergveien 14, 1178 Oslo — 12 enheter

### Enhetsnummerformat

- Storgata 12 og Kirkeveien 45: Format `H{etasje}{leilighet}` — f.eks. H0101, H0102, H0103, H0104 (etasje 1), H0201 osv.
- Ekebergveien 14: Format `Enhet {nr}` — Enhet 1 til Enhet 12

### Beboere og kundedata

Generer realistiske norske navn. Fordeling:
- **~35% eksisterende Telenor-kunder** (isExistingCustomer: true) — har aktive produkter
- **~20% tidligere kunder** (isExistingCustomer: false, men har previousProducts og cancelReason)
- **~45% aldri-kunder** (isExistingCustomer: false, tom previousProducts)

Bruk disse produktene (Telenors faktiske produktnavn):
- Fiber 500/500, Fiber 1G/1G, Fiber 250/250 (internett)
- TV Start, TV Total (TV)
- Mobil 5GB, Mobil 15GB, Mobil Fri+ (mobil)
- Nettvern, Nettvern+ (sikkerhet)

Churn-årsaker: "Prisnivå", "Byttet til Altibox", "Byttet til Telenor2", "Dårlig kundeservice", "Byttet til Ice"

### Interessescorer

Generer scores (0–100) basert på profil:
- Eksisterende kunder med kun internett → høy internett-upsell-score, middels TV/mobil
- Tidligere kunder → høy internett-score (win-back-mulighet)
- Aldri-kunder → variert, men internett alltid over 60

### Kampanjer per beboer

Alle beboere skal ha 2–3 kampanjer. Velg kampanjer basert på profil:
- Eksisterende internett-kunde uten TV → inkluder TV-upsell-kampanje
- Tidligere kunde → inkluder Win-back-kampanje
- Ingen produkter → inkluder Nykundetilbud
- Alltid minst én Sikre-kampanje

Bruk disse kampanje-malene:

```typescript
const CAMPAIGN_TEMPLATES = {
  nykunde: { name: "Nykundetilbud", tag: "Nykunde", product: "Fiber 500/500", price: "299 kr/md i 6 mnd", discount: "50%", pitch: "Halvpris i 6 måneder. Ingen bindingstid.", color: "#00A650" },
  winback: { name: "Tilbakevinn", tag: "Win-back", product: "Fiber 500/500", price: "399 kr/md i 6 mnd", discount: "40%", pitch: "40% rabatt i 6 måneder + gratis router for tidligere kunder.", color: "#7B2D8B" },
  upsellFiber: { name: "Upsell Fiber 1G", tag: "Upsell", product: "Fiber 1G/1G", price: "599 kr/md", discount: "15%", pitch: "15% rabatt på oppgradering de neste 30 dagene.", color: "#0085C3" },
  tvUpsell: { name: "TV-pakke tilbud", tag: "TV", product: "TV Total", price: "299 kr/md", discount: "20%", pitch: "20% rabatt på TV Total i 12 måneder. Inkluderer strømming.", color: "#005A8E" },
  sikre: { name: "Sikre-pakke", tag: "Sikre", product: "Sikre med bredbånd", price: "549 kr/md", discount: "15%", pitch: "ID-vakt, svindelforsikring og Nettvern+ inkludert.", color: "#00A650" },
  mobil: { name: "Mobilkampanje", tag: "Mobil", product: "Mobil Fri+", price: "449 kr/md", discount: "25%", pitch: "Ubegrenset data og fri tale. Bytt nå og spar 150 kr/md.", color: "#7B2D8B" },
  bundle: { name: "Dobbelpakke", tag: "Bundle", product: "Fiber 500 + Mobil", price: "699 kr/md", discount: "35%", pitch: "Internett og mobil i én pakke. Spar 35% de første 6 mnd.", color: "#F5A623" },
  produktX: { name: "Produkt X Pilot", tag: "Pilot", product: "Produkt X", price: "199 kr/md", discount: "—", pitch: "Eksklusivt pilot-tilbud. Kun tilgjengelig i ditt område.", color: "#F5A623" },
};
```

---

## HTTP API

Alle endepunkter returnerer JSON. Ingen auth. CORS åpen for alle origins i dev.

```
GET  /health
     → { status: "healthy", residents: number, customers: number }

GET  /buildings/:buildingId/residents
     → ResidentSummary[]
     Brukes av route-planning-module for å berike enheter med beboerdata

GET  /buildings/:buildingId/residents/full
     → Resident[]
     Komplett beboerdata inkl. kampanjer og scores

GET  /residents/:unitId
     → Resident (full)
     Hentes av feltsalg-appen når selger åpner en dør

GET  /customers/:customerId
     → Customer
     Detaljert kundeprofil

GET  /customers?buildingId=xxx
     → Customer[]
     Alle kunder i et bygg

GET  /search?q=xxx
     → Resident[]
     Søk på navn eller adresse (case-insensitive, partial match)
```

---

## Filstruktur

```
kas-core-mock/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts              ← entry point, Express + CORS + ruter
│   ├── logger.ts             ← Winston
│   ├── types/
│   │   └── index.ts          ← alle typer
│   ├── seed/
│   │   └── index.ts          ← alle beboere og kunder generert ved oppstart
│   └── api/
│       └── router.ts         ← alle endepunkter
└── tests/
    ├── seed.test.ts          ← verifiser seed-data er konsistent
    └── api.test.ts           ← supertest-tester på endepunktene
```

---

## Tester

**`tests/seed.test.ts`**
- Alle tre bygningene er representert i seed-data
- Totalt antall beboere er riktig (24 + 18 + 12 = 54)
- ~35% av beboere er eksisterende kunder (mellom 15 og 25)
- Alle eksisterende kunder har minst ett aktivt produkt
- Alle beboere har mellom 2 og 3 kampanjer
- Ingen beboer har duplikat-kampanjer

**`tests/api.test.ts`** (bruk supertest)
- GET /health returnerer 200 med status "healthy"
- GET /buildings/building-storgata-12/residents returnerer 24 ResidentSummary
- GET /residents/:unitId for en eksisterende enhet returnerer full Resident
- GET /residents/:unitId for en ukjent enhet returnerer 404
- GET /customers?buildingId=building-kirkeveien-45 returnerer kun kunder i det bygget
- GET /search?q=hansen returnerer beboere med "hansen" i navn (case-insensitive)

---

## Miljøvariabler

```
KASCORE_PORT=3004
NODE_ENV=development
```

---

## Konvensjoner

- TypeScript strict mode — ingen `any`
- Alle filer starter med `// ── [Beskrivelse] ──`
- Kun Winston — ingen console.log
- CORS: bruk `cors`-pakken med `origin: '*'` i dev

---

## Byggrekkefølge

1. `src/logger.ts`
2. `src/types/index.ts`
3. `src/seed/index.ts` — generer alle 54 beboere med full profil
4. `src/api/router.ts`
5. `src/index.ts`
6. `tests/seed.test.ts`
7. `tests/api.test.ts`
8. `.env.example`

Kjør `npm run typecheck` og `npm test` når alt er på plass. Fiks alle feil.
