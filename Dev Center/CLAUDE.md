# Dev Center

Sentral observability for salgsplattformen: request-logg, feilsporing med stack traces, distributed tracing (correlation ID), helsestatus og varsling. Dashboard på `/` (public/index.html).

## Arkitektur

- **Ingest:** Tjenestene har en kopi av `middleware/devcenter-middleware.ts` som `src/devcenter.ts`. Den logger alle requests + uhåndterte feil, batcher i minnet og POST-er til `/ingest` hvert 5. sekund. Feiler Dev Center, mistes maks noen logger — tjenesten påvirkes aldri.
- **Lagring:** SQLite via Node 22 innebygde `node:sqlite` (ingen native deps). `DB_PATH` → Railway volume. Retention: `RETENTION_DAYS` (default 14).
- **Tracing:** Middleware genererer/propagerer `x-correlation-id`. For kall videre til neste tjeneste: `fetch(url, { headers: { ...correlationHeaders() } })`.
- **Helse:** Poller `/health` på tjenestene i `MONITORED_SERVICES` (JSON) hvert 30. sek.
- **Varsling:** >10 % feilrate og ≥5 feil siste 5 min → alert i DB + POST til `ALERT_WEBHOOK_URL` (om satt). 15 min cooldown per tjeneste.

## API

- `POST /ingest` — `{ service, entries[] }` fra middleware
- `GET /api/logs?service=&errorsOnly=&search=&status=&before=&limit=`
- `GET /api/logs/:id` — full detalj (stack, payload)
- `GET /api/traces/:correlationId` — kronologisk kjede på tvers av tjenester
- `GET /api/services` — helse + trafikk siste 15 min per tjeneste
- `GET /api/alerts`, `GET /api/stats`, `GET /health`

## Miljøvariabler

| Variabel | Default | |
|---|---|---|
| `PORT` | 3020 | |
| `DB_PATH` | ./data/devcenter.db | Pek på Railway volume, f.eks. /data/devcenter.db |
| `MONITORED_SERVICES` | prod-URLer for integration-layer, sales-core, kas-core | JSON: `[{"name":"...","url":"https://.../health"}]` |
| `RETENTION_DAYS` | 14 | |
| `DEVCENTER_INGEST_KEY` | (av) | Beskytter `POST /ingest` — send som `x-ingest-key` fra middleware |
| `ALERT_WEBHOOK_URL` | (av) | |
| `ALERT_ERROR_THRESHOLD` | 0.1 | |
| `ALERT_MIN_ERRORS` | 5 | |
| `HEALTH_INTERVAL_MS` | 30000 | |

## Deploy (Railway)

1. Ny service fra repo, root directory `Dev Center`, Node ≥ 22.5 (satt i engines)
2. Legg til volume, sett `DB_PATH=/data/devcenter.db`
3. Sett `DEVCENTER_URL` og `DEVCENTER_INGEST_KEY` på integration-layer, sales-core og kas-core

## Tilgang

- **Dashboard + `/api/*`:** Hub-session (`?hub_session=`) med `role === 'superadmin'`. Setter httpOnly cookie (8t).
- **`POST /ingest`:** `x-ingest-key` header når `DEVCENTER_INGEST_KEY` er satt.
- **`GET /health`:** Åpen (helse-poller).

## Koble på flere tjenester

1. Kopier `middleware/devcenter-middleware.ts` inn som `src/devcenter.ts`
2. `initDevCenter('tjenestenavn')` + `app.use(requestLogger())` før rutene, `app.use(errorReporter())` etter
3. Sett `DEVCENTER_URL` på tjenesten
4. Legg tjenesten til i `MONITORED_SERVICES` for helse-polling
5. Bruk `reportError()` i catch-blokker og `correlationHeaders()` på utgående kall
