# Sales Core — Agentic Build Prompt

## Instruksjon til agenten

Les CLAUDE.md i denne mappen nøye. Bygg hele tjenesten fra bunnen av, følg byggrekkefølgen i CLAUDE.md eksakt.

## Byggrekkefølge (følg denne nøyaktig)

1. `src/logger.ts` — Winston JSON-logger
2. `src/types/index.ts` — alle TypeScript-typer
3. `src/storage/index.ts` — fil-basert JSON-lagring, oppretter data/-mappen automatisk
4. `src/events/event-bus.ts` — EventBus interface
5. `src/events/in-memory-event-bus.ts` — implementasjon med Node EventEmitter
6. `src/events/sse-manager.ts` — SSE connection manager
7. `src/events/index.ts` — singleton eventBus
8. `src/seed/index.ts` — seed-data (5 opportunities, 3 offers, tilhørende events)
9. `src/api/router.ts` — alle endepunkter inkl. kundeportal HTML og tracking
10. `src/index.ts` — Express entry point, kobler EventBus til SSE
11. `tests/storage.test.ts`
12. `tests/api.test.ts`
13. `tests/sse.test.ts`
14. `.env.example`

## Etter bygging

```bash
npm install
npm run typecheck
npm test
```

Fiks **alle** TypeScript-feil og testfeil før du er ferdig.

## Evalueringskriterier — ALLE må være oppfylt

### Data og lagring
- [ ] `data/`-mappen opprettes automatisk ved oppstart hvis den ikke finnes
- [ ] 5 opportunities i seed-data, dekker alle stages
- [ ] 3 offers med ulike statuser (sent, viewed, draft)
- [ ] Events-fil har historiske hendelser for offers med status sent/viewed
- [ ] Round-trip test: write + read gir identisk data

### API
- [ ] GET /health → 200
- [ ] GET /api/opportunities → 5 stk fra seed
- [ ] GET /api/opportunities?stage=proposal → filtrert
- [ ] GET /api/opportunities/:id → 200 for gyldig ID
- [ ] GET /api/opportunities/ukjent-id → 404
- [ ] POST /api/offers → 201, inneholder `trackingToken` (UUID) og `trackingUrl`
- [ ] POST /api/offers/:id/send → status blir 'sent'
- [ ] GET /api/offers/by-token/:token → 200 for gyldig token
- [ ] POST /track/:token/respond med { action: 'accepted' } → { success: true }
- [ ] GET /api/offers/:id/events → array med OfferEvent

### SSE
- [ ] GET /notifications/stream returnerer Content-Type: text/event-stream
- [ ] sseManager.broadcast() kaller res.write() på alle tilkoblede klienter
- [ ] buildSseNotification() lager korrekt melding for viewed/accepted/declined

### Kode
- [ ] `npm run typecheck` → null feil
- [ ] `npm test` → alle tester grønne

## Viktige detaljer

**trackingUrl i API-respons:**
Legg `trackingUrl` til på Offer-objektet i router-en før det returneres — det er IKKE et felt i Offer-typen eller i filen, men beregnes dynamisk:
```typescript
const baseUrl = process.env.SALES_CORE_BASE_URL ?? 'http://localhost:3005';
const offerWithUrl = { ...offer, trackingUrl: `${baseUrl}/track/${offer.trackingToken}` };
```

**GET /track/:trackingToken:**
- Registrer viewed-hendelse KUN hvis nåværende status er 'sent' (ikke registrer duplikat-views)
- Oppdater offer.status til 'viewed'
- Publiser offer.event via eventBus
- Redirect (302) til `/portal/:trackingToken`

**SSE heartbeat:**
Send `: heartbeat\n\n` hvert 30. sekund via `setInterval`. Rydd opp intervallet når klienten kobler fra (`req.on('close', ...)`).

**Kundeportal HTML:**
Bruk `res.send()` med en template string. Siden gjør fetch til `/api/offers/by-token/:token` og kaller `/track/:token/respond`. Hold den enkel — Telenor-farger, responsiv.

**SSE test-strategi:**
Test sseManager og buildSseNotification direkte (unit-tester), ikke via HTTP — SSE-forbindelser er vanskelige å teste med supertest. Mock res.write og verify at den kalles med riktig payload.

**Logging:** Kun Winston — ingen console.log noe sted.

**Port:** `process.env.SALESCORE_PORT ?? 3005`
