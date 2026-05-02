# Agentic session — kjøreinstrukser

## Hva du skal gjøre i VS Code

1. Åpne terminalen i mappen `Workflow module/`
2. Kjør: `npm install`
3. Åpne Claude Code (Cmd+Shift+P → "Claude: Open Chat" eller via sidebar)
4. Lim inn prompten under og send den

---

## Prompten (kopier alt mellom strekene)

---

Les CLAUDE.md i denne mappen nøye. Det er din spesifikasjon.

Bygg workflow-modulen fra scratch. Følg byggrekkefølgen i CLAUDE.md punkt for punkt. Ikke hopp over steg. Ikke spør meg om avklaringer underveis — ta egne valg basert på spesifikasjonen og logg valgene dine som kommentarer i koden der det er hensiktsmessig.

Når alle filer er bygget, kjør:
1. `npm run typecheck` — fiks alle TypeScript-feil
2. `npm test` — fiks alle testfeil

Ikke avslutt før typecheck og tester er grønne.

---

## Hva du ser etter etterpå (evalueringspunkter)

Når agenten er ferdig, sjekk:

- [ ] Fulgte den byggrekkefølgen i CLAUDE.md?
- [ ] Er EventBus-abstraksjonen riktig implementert (interface + InMemory + Kafka-stub)?
- [ ] Er GatewayClient typet og returnerer mock-data i dev-modus?
- [ ] Er provisjonsberegningen korrekt (amount * commissionRate per salg)?
- [ ] Er rapport-statusflyten riktig (pending_approval → approved/rejected → exported)?
- [ ] Er PO-eksport-formatet riktig?
- [ ] Passerer alle tester?
- [ ] Er det noen `any`-typer som ikke burde vært der?
- [ ] Holder den seg til Winston, eller bruker den console.log noen steder?
- [ ] Tok den egne arkitekturvalg som avviker fra spec? (bra eller dårlig?)

Skriv ned funnene dine — det er grunnlaget for å bestemme hybrid-modellen (agentic vs. assistent per modul).
