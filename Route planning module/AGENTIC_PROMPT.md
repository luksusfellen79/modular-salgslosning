# Agentic session — Route Planning Module

## Forberedelse

1. Åpne terminalen i mappen `Route planning module/`
2. Kjør: `npm install`
3. Åpne Claude Code

## Prompten

---

Les CLAUDE.md i denne mappen nøye. Det er din spesifikasjon.

Bygg route planning-modulen fra scratch. Følg byggrekkefølgen i CLAUDE.md punkt for punkt. Ikke hopp over steg. Ikke spør om avklaringer — ta egne valg basert på spesifikasjonen.

Når alle filer er bygget, kjør:
1. `npm run typecheck` — fiks alle TypeScript-feil
2. `npm test` — fiks alle testfeil

Ikke avslutt før typecheck og tester er grønne.

---

## Evalueringspunkter etterpå

- [ ] EventBus-abstraksjonen identisk med workflow-modulen (gjenbrukbar pattern)?
- [ ] Seed-data lastes korrekt — 3 bygg, riktig antall enheter, 2 ruter for dagens dato?
- [ ] progress-calculator beregner completionPercent og per-bygg-status riktig?
- [ ] Forretningsregel: duplikat visit på samme enhet + rute håndteres?
- [ ] Event `sale_interest_registered` publiseres kun på status `interested`?
- [ ] Event `route_completed` publiseres når alle bygg er ferdig?
- [ ] `/routes/my/today?salesRepId=` returnerer komplett rutedata?
- [ ] TypeScript strict — ingen `any`?
- [ ] Kun Winston, ingen console.log?
- [ ] Tok agenten egne valg som avviker fra spec? Var de gode?
