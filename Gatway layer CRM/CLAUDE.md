# CRM Gateway — Claude Code instruksjoner

Du er en senior full-stack utvikler og IT-arkitekt med dyp kunnskap om Salesforce-integrasjon,
API-gateway-mønstre og Kafka. Du jobber på dette prosjektet for Telenor.

## Prosjektoversikt

CRM Gateway er en intern API-gateway på Telenors Nova-plattform (Kubernetes). Den samler alle
mikrotjenester bak én sikker inngangsdør mot Salesforce og andre datakilder.

**Stack:** Node.js + TypeScript, Express, KafkaJS, Axios, Winston

**Hosting:** Telenor Nova (Kubernetes). Ingen direkte tilgang til Nova fra utviklermiljø —
workflow er: kode → git push → bygg i CI → deploy på Nova.

## Arkitektur

```
[CRM UI]  [Mikrotjeneste A/B/C/D]
     |              |
     v              v
  [BFF]         [direkte]
     |              |
     └──────┬───────┘
            v
     [API Gateway]          ← src/gateway/
            |
     [Connector-lag]        ← src/connectors/
            |
  [SF] [Kafka] [fremtidige]
```

### Lag-ansvar

- **`src/gateway/`** — kjerne: auth (API-nøkler), routing, rate limiting, logging, connector-register
- **`src/connectors/base/`** — connector-kontrakten (interface alle connectors MÅ implementere)
- **`src/connectors/salesforce/`** — SF REST API, Bulk API, OAuth JWT Bearer
- **`src/connectors/kafka/`** — KafkaJS producer/consumer, REST-proxy-endepunkter
- **`src/bff/`** — Backend for Frontend: OAuth PKCE mot Telenor SSO, session-håndtering, proxy til gateway
- **`src/config/access-control.yaml`** — hvem har tilgang til hva (endres her, ikke i kode)

## Connector-kontrakt

**Alle connectors MÅ implementere `ConnectorInterface` fra `src/connectors/base/connector.interface.ts`:**

```typescript
interface ConnectorInterface {
  readonly connectorId: string;
  health(): Promise<HealthStatus>;
  capabilities(): ConnectorCapability[];
  registrationInfo(): ConnectorRegistration;
}
```

Alle feil returneres i `ConnectorError`-formatet (se `makeConnectorError()`).
**Aldri** returner native feilkoder fra kildesystemet direkte til klientene.

## Auth-modell

- **Lag 0 (BFF → Nettleser):** Session-cookie, OAuth PKCE mot Telenor SSO
- **Lag 1 (Mikrotjeneste → Gateway):** `x-api-key` header. Nøkler i `GATEWAY_API_KEYS` env-var
- **Lag 2 (Connector → Kildesystem):** SF: OAuth 2.0 JWT Bearer. Kafka: SASL/SSL
- **Tilgangskontroll:** `src/config/access-control.yaml` — ny tjeneste = ny yaml-linje, ingen kodeendring

## Tilgangskontroll — slik endrer du

For å gi en ny tjeneste tilgang, legg til i `src/config/access-control.yaml`:

```yaml
services:
  ny-tjeneste:
    description: Beskrivelse av tjenesten
    connectors:
      salesforce:
        operations: [read]     # read og/eller write
      kafka:
        operations: [consume]  # consume og/eller produce
        topics: [topic-navn]
```

## Salesforce API

- **REST API:** `sfGet/sfPost/sfPatch/sfDelete` fra `src/connectors/salesforce/restApi.ts`
- **SOQL:** `sfQuery(soql, correlationId)` — bruk alltid parameterisert SOQL, aldri string-concatenation
- **Base URL:** `{SF_INSTANCE_URL}/services/data/{SF_API_VERSION}/`
- **Auth:** JWT Bearer-token via `getSalesforceToken()` — token caches automatisk, refreshes ved utløp
- **Versjon:** Bruk alltid eksplisitt API-versjon (satt i `SF_API_VERSION` env-var, default v62.0)

## Kafka

- **Producer:** `publishMessage(topic, key, value)` fra `src/connectors/kafka/index.ts`
- **Consumer:** `createConsumer(groupId, topics, handler)` — registrer ny consumer ved oppstart
- **Auth:** SASL/SSL via env-vars `KAFKA_SASL_USERNAME` / `KAFKA_SASL_PASSWORD`

## Logging-standard

Bruk alltid `logger` fra `src/gateway/logger.ts`. Alle logglinjer skal ha `correlationId`.

```typescript
// Request-logging (bruk logRequest-helperen):
logRequest({ correlationId, callerService, operation, durationMs, status });

// Andre logger:
logger.info('hendelse', { correlationId, ...ekstraFelter });
logger.warn('advarsel', { correlationId, ...ekstraFelter });
logger.error('feil', { error: err.message, correlationId });
```

**Aldri** bruk `console.log` — kun `logger`.

## Miljøvariabler

Alle secrets hentes fra Telenors secret store på Nova, montert som filer eller env-vars.
Se `.env.example` for alle variabler. Kopier til `.env` for lokal utvikling (`.env` er i `.gitignore`).

## Vanlige oppgaver

### Legg til ny connector
Se `.claude/commands/add-connector.md` — bruk `/add-connector` slash-kommandoen.

### Legg til ny SF-operasjon
1. Legg til funksjon i `src/connectors/salesforce/restApi.ts`
2. Legg til rute i `src/connectors/salesforce/router.ts` med riktig `accessControl('salesforce', 'read|write')`
3. Oppdater `registrationInfo().dataSources` i `src/connectors/salesforce/index.ts` ved behov

### Deploy til Nova
Se `.claude/commands/deploy-nova.md` — bruk `/deploy-nova` slash-kommandoen.

## Kodekonvensjoner

- **TypeScript strict mode** er på — ingen `any` uten god grunn
- **Async/await** overalt — ingen callbacks
- **Feilhåndtering:** Bruk `makeConnectorError()` for alle connector-feil
- **HTTP-statuskoder:** Følg tabellen i arkitekturdokumentet (400/401/403/404/429/502/503/504)
- **Ingen hardkodede secrets** — alltid fra env-vars eller secret store
- **Tester:** Skriv integrasjonstester mot sandbox-miljøer, ikke mocks for connector-logikk

## Prosjektstruktur

```
crm-gateway/
├── CLAUDE.md                        ← denne filen
├── .claude/commands/                ← slash-kommandoer for Claude Code
│   ├── add-connector.md
│   └── deploy-nova.md
├── src/
│   ├── gateway/                     ← kjerne
│   │   ├── index.ts                 ← entry point, Express-app
│   │   ├── auth.ts                  ← API-nøkkel-auth + tilgangskontroll
│   │   ├── registry.ts              ← connector self-registration
│   │   └── logger.ts                ← strukturert JSON-logging
│   ├── connectors/
│   │   ├── base/
│   │   │   └── connector.interface.ts  ← kontrakten
│   │   ├── salesforce/
│   │   │   ├── index.ts             ← SalesforceConnector-klasse
│   │   │   ├── auth.ts              ← JWT Bearer OAuth
│   │   │   ├── restApi.ts           ← SF REST API-klient
│   │   │   └── router.ts            ← Express-ruter
│   │   └── kafka/
│   │       ├── index.ts             ← KafkaConnector + producer/consumer
│   │       └── router.ts            ← Express-ruter
│   ├── bff/
│   │   └── index.ts                 ← BFF: OAuth PKCE + session + proxy
│   └── config/
│       └── access-control.yaml     ← tilgangskontroll-matrise
├── k8s/                             ← Kubernetes-manifester for Nova
├── .env.example                     ← alle env-vars dokumentert
└── package.json
```
