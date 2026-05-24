# Modulær Salgsløsning — Prosjektkontekst

Telenor-intern plattform som erstatter Salesforce. Modulære micro-apps per rolle,
koblet via Integration Layer. Prototypen kjører på Railway.

> **Fullstendig arkitektur, konvensjoner og mønstre: se `.cursorrules`.**

---

## Rask orientering

### Hva er bygget

| Modul               | Status     | Beskrivelse                                      |
|---------------------|------------|--------------------------------------------------|
| Integration Layer   | ✅ Live    | Master datahub — adapters, EventBus, JWT-mw      |
| PostgreSQL          | ✅ Live    | Railway-hosted, 4 schemas: hub/sales_core/sdu/mdu|
| Hub                 | ✅ Live    | Innlogging med bcrypt PIN → JWT, pg-sessions      |
| Sales Core          | ✅ Live    | MDU pipeline + SDU runder/besøk → PostgreSQL     |
| MDU CRM             | ✅ Live    | Kanban-pipeline (mdu-selger)                     |
| MDU Leder           | ✅ Live    | War Room + oversikt (mdu-leder)                  |
| SDU CRM             | ✅ Live    | Feltsalg dør-til-dør (sdu-selger)               |
| SDU Planner         | ✅ Live    | Runderplanlegging (sdu-leder)                    |
| SDU Incentive Mgr   | ✅ Live    | Bonusstyring                                     |
| KAS Core mock       | ⚠️ Legacy  | Beholdes for bakoverkompatibilitet               |

### Hva er ikke bygget ennå
- `offers.json` → `sales_core.tilbud` (PostgreSQL-migrering)
- `sdu.bonuser` → SDU Incentive Manager PostgreSQL-kobling
- `mdu.kunder` + `mdu.kontrakter` → MDU CRM PostgreSQL-kobling
- KafkaEventBus (InMemoryEventBus brukes nå)
- Azure AD / Telenor SSO
- Contract generation (Signicat + BankID)

---

## Mappestruktur

```
modular-salgslosning/
├── integration-layer/        ← Express API, adapters, EventBus, JWT-middleware
│   ├── src/
│   │   ├── adapters/         ← CustomerAdapter, ProductAdapter, osv.
│   │   ├── events/           ← InMemoryEventBus, EventTopics, EventBusRouter
│   │   ├── middleware/        ← jwt.middleware.ts
│   │   └── types/            ← domain.ts (SalesContext, DataSource, osv.)
│   └── database/
│       ├── schema/           ← hub.sql, sales_core.sql, sdu.sql, mdu.sql
│       └── migrate.mjs       ← Kjør mot ny PostgreSQL-instans
├── Sales Core/               ← Express API — salgsoperasjoner
│   └── src/
│       ├── db/               ← pool.ts, repositories, mappers, seed.ts
│       └── storage/          ← asyncStorage (PostgreSQL + JSON-fallback)
├── Hub/hub-app/              ← Vite/React — innlogging og rollevalg
├── MDU CRM/dealflow-crm-main/
├── MDU Leder/leder-app/
├── SDU CRM/feltsalg-app/
├── SDU Planner/planner-app/
├── SDU bonuser/incentive-manager/
├── KAS Core mock/            ← Legacy — ikke rør uten god grunn
└── .cursorrules              ← Full kontekst for AI-assistenter
```

---

## Miljøvariabler (Railway production)

| Variabel                   | Satt på                        |
|----------------------------|--------------------------------|
| `DATABASE_URL`             | salgshub, sales-core           |
| `INTEGRATION_LAYER_URL`    | alle tjenester                 |
| `JWT_SECRET`               | alle tjenester                 |
| `VITE_INTEGRATION_LAYER_URL` | alle frontend-tjenester      |

---

## Kjøre migreringer mot ny database

```bash
node integration-layer/database/migrate.mjs
```

Krever at `DATABASE_PUBLIC_URL` eller `DATABASE_URL` er satt som env-var,
eller at den offentlige Railway-URLen er hardkodet i skriptet.

---

## Testbrukere

| Navn          | Rolle      | PIN  |
|---------------|------------|------|
| Jørn Haga     | superadmin | 0000 |
| Nina Lund     | mdu-leder  | 1234 |
| Per Andersen  | sdu-leder  | 1234 |
| Lise Berg     | mdu-selger | 1234 |
| Kristian Mo   | sdu-selger | 1234 |

Seedes automatisk av `Sales Core/src/db/seed.ts` ved første oppstart.
