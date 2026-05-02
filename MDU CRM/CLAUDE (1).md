# Pub Crawler – Prosjektdokumentasjon

Dette dokumentet er ment for Claude Code og Claude Chat for å få full oversikt over prosjektet. Les dette før du gjør endringer.

---

## Hva er dette?

En mobilvennlig webapp for grupper som er ute på pubcrawl. Gruppen samles rundt en felles sesjon, løser quiz på hvert utested, og konkurrerer om poeng gjennom kvelden. En host styrer ruten og fremdriften, deltakere blir med via en 6-tegns kode.

### Kjerneflyt
1. Host logger inn → oppretter kveld → får join-kode
2. Deltakere logger inn → skriver inn kode → havner i lobby
3. Host starter kvelden
4. På hvert stopp: alle tar quiz → poeng lagres → scoreboard oppdateres live
5. Vinneren av hvert stopp velger neste bar (eller randomiseres)
6. Totalvinner kåres på slutten

---

## Tech Stack

| Lag | Teknologi | Begrunnelse |
|-----|-----------|-------------|
| Frontend | React 18 + Vite | Rask utvikling, god mobilstøtte |
| Routing | React Router v6 | SPA-navigasjon |
| Backend/DB | Supabase | Auth, database, realtime, edge functions |
| AI | Anthropic Claude (Haiku) | AI-genererte quiz-spørsmål via Edge Function |
| Hosting | Vercel | Automatisk deploy fra GitHub |
| Språk | JavaScript (JSX) | Ingen TypeScript ennå, kan migreres |

---

## Infrastruktur

### Supabase
- **Prosjektnavn:** Pubcrawl
- **Prosjekt-ID:** `etnzdyxljjpgzabrxzej`
- **Region:** eu-west-1 (Ireland)
- **URL:** `https://etnzdyxljjpgzabrxzej.supabase.co`
- **Database:** PostgreSQL 17

### Vercel
- Deployes automatisk ved push til `main`-branch på GitHub
- Miljøvariabler satt i Vercel dashboard:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### GitHub
- Codespaces brukes som utviklingsmiljø
- Push til `main` trigger automatisk Vercel-deploy

### Supabase Edge Functions
- **`generate-quiz`** – Kaller Anthropic API med venue-navn og genererer 4 quiz-spørsmål på norsk
  - URL: `https://etnzdyxljjpgzabrxzej.supabase.co/functions/v1/generate-quiz`
  - Input: `{ venue_id, venue_name }`
  - Output: `{ quiz_id, questions[] }`
  - Lagrer quiz og spørsmål direkte til `quizzes` og `quiz_questions`
  - Krever `ANTHROPIC_API_KEY` secret satt i Supabase dashboard
  - Modell: `claude-haiku-4-5-20251001` (rask og billig for quiz-generering)

---

## Prosjektstruktur

```
pubcrawler/
├── index.html                  # HTML-inngang, PWA-meta
├── vite.config.js              # Vite konfigurasjon
├── package.json
├── .env.example                # Mal for miljøvariabler
├── .env.local                  # Lokale secrets (ikke i git)
├── supabase-schema.sql         # Hele databaseskjemaet – kjør i Supabase SQL Editor
├── CLAUDE.md                   # Dette dokumentet
└── src/
    ├── main.jsx                # React entry point
    ├── App.jsx                 # Routing og auth-guard
    ├── index.css               # Global CSS, design tokens
    ├── lib/
    │   └── supabase.js         # Supabase-klient (singleton)
    └── pages/
        ├── Login.jsx           # Magic link innlogging
        ├── Home.jsx            # Startside – velg host/join
        ├── Join.jsx            # Bli med via kode
        ├── HostSetup.jsx       # Opprett kveld, velg rute
        ├── Lobby.jsx           # Venterom med realtime deltakerliste
        ├── Session.jsx         # Hoveddskjerm under kvelden (3 tabs)
        └── Quiz.jsx            # Quiz med nedtelling og poengberegning

Supabase Edge Functions (deployet direkte til Supabase, ikke i git ennå):
└── generate-quiz/
    └── index.ts                # AI quiz-generering via Anthropic API
```

---

## Datamodell

### Tabeller og relasjoner

```
profiles          – én per bruker, kobles til auth.users
venues            – barer/steder med navn, adresse, koordinater
routes            – en samling stopp (mal for en kveld)
route_stops       – koblingstabell routes ↔ venues, med rekkefølge
sessions          – en faktisk kveld som kjøres (har join_code, status, current_stop_index)
session_participants – hvem er med på en sesjon, med total_score og veto_count
quizzes           – en quiz knyttet til et venue
quiz_questions    – spørsmål med options[] og correct_index
quiz_answers      – hva hver deltaker svarte
venue_votes       – veto/suggest/approve for neste stopp
```

### Viktige felt på `sessions`
- `status`: `lobby` → `active` → `ended`
- `current_stop_index`: int, 0-basert, oppdateres av host
- `join_code`: 6 tegn, unik, genereres ved opprettelse

### Realtime
Følgende tabeller har realtime aktivert via `supabase_realtime` publication:
- `sessions` – for å fange statusendringer (lobby → active)
- `session_participants` – for live deltakerliste og scoreboard
- `quiz_answers` – for live quiz-resultater (ikke implementert ennå)

---

## Auth

Bruker Supabase **Magic Link** (OTP via e-post) – ingen passord.

Ved signup sendes `display_name` som user metadata. En database-trigger (`handle_new_user`) oppretter automatisk en rad i `profiles`-tabellen.

Auth-guard ligger i `App.jsx` – alle ruter unntatt `/login` krever aktiv sesjon.

---

## Nøkkelfiler å kjenne til

### `src/App.jsx`
Definerer alle ruter. Sjekker auth-state ved oppstart. Redirecter til `/login` hvis ikke innlogget.

### `src/lib/supabase.js`
Eksporterer én Supabase-klient-instans. Importeres overalt med `import { supabase } from '../lib/supabase'`.

### `src/pages/Lobby.jsx`
Bruker Supabase Realtime channel for å lytte på:
- Nye deltakere (`session_participants`)
- Statusendring på session (lobby → active → naviger til `/session/:id`)

### `src/pages/Session.jsx`
Hoveddskjerm under kvelden. Tre tabs:
- **Stopp** – nåværende bar, start quiz, neste stopp (kun host)
- **Poeng** – live scoreboard med progress-bars
- **Rute** – alle stopp med status (ferdig/nå/kommende)

Bruker Realtime for å holde `session` og `participants` oppdatert.

### `src/pages/Quiz.jsx`
- Henter spørsmål fra `generate-quiz` Edge Function basert på venue_id og venue_name
- Fallback til hardkodede demo-spørsmål hvis Edge Function feiler
- 15 sekunders nedtelling per spørsmål
- Poeng = basepunkter + tidsbonus (proporsjonalt med tid igjen)
- Lagrer til `session_participants.total_score` ved fullføring

### Supabase Edge Function: `generate-quiz`
- Tar inn `venue_id` og `venue_name`
- Kaller Anthropic Claude Haiku for å generere 4 norske quiz-spørsmål om stedet
- Lagrer quiz til `quizzes`-tabellen og spørsmål til `quiz_questions`
- Returnerer `{ quiz_id, questions[] }`
- Deployet direkte til Supabase (ikke i git ennå – bør legges til under `supabase/functions/`)

### `supabase-schema.sql`
Kjøres én gang i Supabase SQL Editor. Inneholder:
- Alle CREATE TABLE
- RLS policies (Row Level Security)
- Trigger for auto-oppretting av profil
- Aktivering av realtime på nøkkeltabeller

---

## Miljøvariabler

| Variabel | Beskrivelse | Hvor |
|----------|-------------|------|
| `VITE_SUPABASE_URL` | Supabase prosjekt-URL | `.env.local` + Vercel |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public nøkkel (JWT) | `.env.local` + Vercel |
| `ANTHROPIC_API_KEY` | Anthropic API-nøkkel for quiz-generering | Supabase Edge Function secrets |

Lokalt: `.env.local` (ikke committed til git)
Produksjon: `VITE_*` satt i Vercel dashboard, `ANTHROPIC_API_KEY` satt i Supabase Edge Function secrets

---

## Kjøre lokalt

```bash
npm install
cp .env.example .env.local
# Fyll inn Supabase-verdier i .env.local
npm run dev
```

---

## Det som mangler / neste steg

### Høy prioritet
- [x] **AI-genererte quiz-spørsmål** – Supabase Edge Function `generate-quiz` deployet og testet ✅
- [ ] **Koble Quiz.jsx til Edge Function** – Quiz.jsx bruker fortsatt hardkodede spørsmål, skal kalle `generate-quiz` med venue_id
- [ ] **Veto-system** – UI for å bruke veto på neste foreslåtte bar, telle brukte veto
- [ ] **Quiz fra database** – Lagre og gjenbruke genererte spørsmål fra `quiz_questions`

### Medium prioritet
- [ ] **Kart-visning** – Mapbox eller Google Maps for å vise rute og neste stopp
- [ ] **Egendefinerte ruter** – HostSetup.jsx bruker demo-rute, trenger UI for å lage egne
- [ ] **Slutt-seremoni** – Skjerm som viser totalvinner med animasjon
- [ ] **Stopp-vinner velger neste bar** – Logikk for at quiz-vinner kan velge fra forslag

### Lav prioritet
- [ ] **Guide-modus** – Mulighet for guides å lage merkede ruter med egne quiz-spørsmål
- [ ] **Gruppealbum** – Ta bilde på hvert stopp
- [ ] **Achievements/badges** – Gamification
- [ ] **PWA** – Legg til manifest.json og service worker for "installer på hjemskjerm"
- [ ] **TypeScript** – Migrer fra JSX til TSX

---

## Kjente begrensninger / teknisk gjeld

- `Quiz.jsx` bruker fortsatt hardkodede demo-spørsmål – skal kobles til `generate-quiz` Edge Function
- `HostSetup.jsx` bruker en hardkodet demo-rute (Bergen sentrum klassiker), ingen UI for egne ruter
- Edge Function `generate-quiz` er ikke versjonskontrollert i git – bør legges til under `supabase/functions/generate-quiz/index.ts`
- Score-oppdatering i `Quiz.jsx` gjør to DB-kall (fetch + update) i stedet for én atomic operasjon – bør erstattes med en Postgres-funksjon eller Supabase RPC
- Ingen feilhåndtering på nettverksfeil i realtime-subscriptions
- RLS-policies er permissive ("public read") – bør strammes inn før lansering

---

## Konvensjoner i kodebasen

- Én komponent per fil, filnavn matcher komponentnavn
- CSS er global (index.css) med utility-klasser, ingen CSS modules
- Supabase-klienten importeres alltid fra `../lib/supabase`
- Alle sider er i `src/pages/`, ingen komponenter-mappe ennå
- Norsk brukergrensesnitt, engelsk kode og kommentarer
