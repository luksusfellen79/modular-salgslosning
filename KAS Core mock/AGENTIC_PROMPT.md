# KAS Core Mock — Agentic Build Prompt

## Instruksjon til agenten

Les CLAUDE.md i denne mappen nøye. Bygg hele tjenesten fra bunnen av, følg byggrekkefølgen i CLAUDE.md eksakt.

## Byggrekkefølge (følg denne nøyaktig)

1. `src/logger.ts` — Winston JSON-logger
2. `src/types/index.ts` — alle TypeScript-typer
3. `src/seed/index.ts` — generer alle 54 beboere med full profil
4. `src/api/router.ts` — alle endepunkter
5. `src/index.ts` — Express entry point med CORS
6. `tests/seed.test.ts` — seed-datatester
7. `tests/api.test.ts` — supertest API-tester
8. `.env.example`

## Etter bygging

Kjør i denne rekkefølgen:
```bash
npm install
npm run typecheck
npm test
```

Fiks **alle** TypeScript-feil og testfeil før du er ferdig. Ikke godta delvis bestått.

## Evalueringskriterier — ALLE må være oppfylt

### Seed-data
- [ ] Nøyaktig 54 beboere totalt (24 + 18 + 12)
- [ ] Alle tre building-ID-er finnes: `building-storgata-12`, `building-kirkeveien-45`, `building-ekebergveien-14`
- [ ] Mellom 15 og 25 beboere er eksisterende Telenor-kunder (≈35%)
- [ ] Alle eksisterende kunder har minst ett aktivt produkt i `existingProducts`
- [ ] Alle beboere har mellom 2 og 3 kampanjer (ingen duplikat-kampanjer per beboer)
- [ ] ~20% tidligere kunder har `previousProducts` og `cancelReason`
- [ ] Interessescorer er 0–100 og basert på profil (aldri-kunder: internett > 60)

### API
- [ ] GET /health → 200 `{ status: "healthy", residents: 54, customers: N }`
- [ ] GET /buildings/building-storgata-12/residents → array med 24 ResidentSummary
- [ ] GET /buildings/:id/residents/full → full Resident-array
- [ ] GET /residents/:unitId for gyldig ID → full Resident
- [ ] GET /residents/ukjent-id → 404
- [ ] GET /customers/:customerId → full Customer
- [ ] GET /customers?buildingId=building-kirkeveien-45 → kun kunder fra det bygget
- [ ] GET /search?q=hansen → case-insensitive treff på navn

### Kode
- [ ] `npm run typecheck` gir null feil
- [ ] `npm test` → alle tester grønne

## Viktige detaljer

**Enhetsnummerformat:**
- Storgata 12 + Kirkeveien 45: `H{etasje:02d}{leilighet:02d}` → H0101, H0102 ... H0604
- Ekebergveien 14: `Enhet 1` til `Enhet 12`

**Unit-ID-er** (brukes av route-planning-module — MÅ matche):
- Format: `{buildingId}-unit-{unitNumber}` — f.eks. `building-storgata-12-unit-H0101`

**Produktnavn** (bruk nøyaktig disse):
- Internett: `Fiber 500/500`, `Fiber 1G/1G`, `Fiber 250/250`
- TV: `TV Start`, `TV Total`
- Mobil: `Mobil 5GB`, `Mobil 15GB`, `Mobil Fri+`
- Sikkerhet: `Nettvern`, `Nettvern+`

**Churn-årsaker:** `"Prisnivå"`, `"Byttet til Altibox"`, `"Byttet til Telenor2"`, `"Dårlig kundeservice"`, `"Byttet til Ice"`

**Logging:** Kun Winston — ingen console.log noe sted.

**CORS:** `cors({ origin: '*' })` — åpen for alle origins.

**Port:** Les fra `process.env.KASCORE_PORT ?? 3004`
