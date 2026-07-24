/**
 * Workshop demo seed — idempotent demo-data for Salgs Hub, SDU, MDU og Case App.
 *
 * Kjør etter migrate:
 *   node database/seeds/demo-workshop.mjs
 *
 * Railway:
 *   cd integration-layer && railway run node database/seeds/demo-workshop.mjs
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Delt bygg-katalog (samme kilde som IL mockLocationAdapter). */
const BUILDINGS_CATALOG = JSON.parse(
  readFileSync(new URL('../../src/data/buildings-catalog.json', import.meta.url), 'utf8'),
);
const BUILDING_BY_ID = new Map(
  BUILDINGS_CATALOG.map((b) => [b.buildingId, b]),
);

try {
  await import('pg');
} catch {
  console.log('Installerer pg...');
  execSync('npm install pg', { stdio: 'inherit', cwd: join(__dirname, '../..') });
}

const { default: pg } = await import('pg');
const { Client } = pg;

const DATABASE_URL =
  process.env.DATABASE_PUBLIC_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:HKUgCclZUwxRRLMkdnzgHzCgkyiLZfag@kodama.proxy.rlwy.net:32179/railway';

// ── Faste UUID-er (idempotent re-kjøring) ─────────────────────────────────────

const DEMO = {
  users: {
    lars: 'b1000001-0000-4000-8000-000000000001',
    marte: 'b1000002-0000-4000-8000-000000000002',
    tor: 'b1000003-0000-4000-8000-000000000003',
    kari: 'b1000004-0000-4000-8000-000000000004',
    per: 'b1000005-0000-4000-8000-000000000005',
    erik: 'b1000006-0000-4000-8000-000000000006',
  },
  rounds: {
    oslo: 'c1000003-0000-4000-8000-000000000003',
    bergen: 'c1000004-0000-4000-8000-000000000004',
    karmoy: 'c1000005-0000-4000-8000-000000000005',
  },
  deals: {
    solberg: 'd1000001-0000-4000-8000-000000000001',
    berglia: 'd1000002-0000-4000-8000-000000000002',
    nordaasen: 'd1000003-0000-4000-8000-000000000003',
    havnekvartalet: 'd1000004-0000-4000-8000-000000000004',
    fjordparken: 'd1000005-0000-4000-8000-000000000005',
    lindealleen: 'd1000006-0000-4000-8000-000000000006',
  },
  cases: {
    order: 'e1000001-0000-4000-8000-000000000001',
    aktivering: 'e1000002-0000-4000-8000-000000000002',
    fiber: 'e1000003-0000-4000-8000-000000000003',
    kunde: 'e1000004-0000-4000-8000-000000000004',
    faktura: 'e1000005-0000-4000-8000-000000000005',
    mobil: 'e1000006-0000-4000-8000-000000000006',
    tv: 'e1000007-0000-4000-8000-000000000007',
  },
};

const HUB_USERS = [
  { id: DEMO.users.lars, name: 'Lars Eriksen', email: 'lars.eriksen@telenor.com', pin: '1111', rolleId: 'sdu-selger' },
  { id: DEMO.users.marte, name: 'Marte Andersen', email: 'marte.andersen@telenor.com', pin: '2222', rolleId: 'sdu-selger' },
  { id: DEMO.users.tor, name: 'Tor Halvorsen', email: 'tor.halvorsen@telenor.com', pin: '3333', rolleId: 'sdu-leder' },
  { id: DEMO.users.kari, name: 'Kari Nygaard', email: 'kari.nygaard@telenor.com', pin: '4444', rolleId: 'mdu-selger' },
  { id: DEMO.users.per, name: 'Per Strand', email: 'per.strand@telenor.com', pin: '5555', rolleId: 'mdu-leder' },
  { id: DEMO.users.erik, name: 'Erik Teknisk', email: 'erik.teknisk@telenor.com', pin: '6666', rolleId: 'teknisk-ordre' },
];

const SDU_SELLER_IDS = [DEMO.users.lars, DEMO.users.marte];

/** Fast tidspunkt-base — idempotent på tvers av re-kjøringer (ingen Date.now / Math.random). */
const DEMO_VISIT_T0 = Date.parse('2026-07-21T12:00:00.000Z');

const AREA_ROUNDS = [
  {
    key: 'oslo',
    id: DEMO.rounds.oslo,
    name: 'Oslo sentrum',
    sellerId: DEMO.users.lars,
    leaderId: DEMO.users.tor,
    startBuildingId: 'building-storgata-12',
    buildingIds: [
      'building-storgata-12',
      'building-grunerlokka-8',
      'building-toyengata-22',
      'building-sagene-5',
      'building-kirkeveien-45',
      'building-ekebergveien-14',
    ],
  },
  {
    key: 'bergen',
    id: DEMO.rounds.bergen,
    name: 'Bergen vest',
    sellerId: DEMO.users.marte,
    leaderId: DEMO.users.tor,
    startBuildingId: 'building-bryggen-3',
    buildingIds: [
      'building-bryggen-3',
      'building-nordnes-17',
      'building-mohlenpris-9',
      'building-sandviken-30',
      'building-landaas-12',
    ],
  },
  {
    key: 'karmoy',
    id: DEMO.rounds.karmoy,
    name: 'Karmøy',
    sellerId: DEMO.users.lars,
    leaderId: DEMO.users.tor,
    startBuildingId: 'building-kopervik-4',
    buildingIds: [
      'building-kopervik-4',
      'building-avaldsnes-11',
      'building-skudeneshavn-6',
      'building-aakra-19',
    ],
  },
];

function encodeUnitNotater(address, unitId, note) {
  const lines = [];
  if (address && address !== unitId) lines.push(`address:${address}`);
  if (note) {
    if (lines.length) lines.push('');
    lines.push(note);
  }
  return lines.length ? lines.join('\n') : null;
}

/** Samme unitId-format som IL FiberAdapter / mockLocationAdapter. */
function catalogUnitId(buildingId, unitNumber) {
  return `${buildingId}-${unitNumber.toLowerCase().replace(/\s/g, '-')}`;
}

/**
 * Round-robin på tvers av bygg slik at startbygg får enheter i alle utfalls-bånd
 * (ikke bare «ikke-besøkt»-sonen hvis startbygg er først i lista).
 */
function interleaveBuildingUnitLists(lists) {
  const result = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      if (i < list.length) result.push(list[i]);
    }
  }
  return result;
}

/** Katalog-drevne enheter for en områderunde med deterministisk utfall-variasjon. */
function areaRoundUnits(buildingIds) {
  const perBuilding = buildingIds.map((buildingId) => {
    const building = BUILDING_BY_ID.get(buildingId);
    if (!building) throw new Error(`Ukjent buildingId i katalog: ${buildingId}`);
    const street = building.address.split(',')[0].trim();
    return building.units.map((unit) => ({
      unitId: catalogUnitId(buildingId, unit.unitNumber),
      buildingId,
      etasje: unit.floor,
      residentName: unit.resident,
      address: `${street}, ${unit.unitNumber}`,
    }));
  });

  const flat = interleaveBuildingUnitLists(perBuilding);
  const n = flat.length;
  const pendingEnd = Math.floor(n * 0.40);
  const visitedEnd = pendingEnd + Math.floor(n * 0.35);

  return flat.map((base, index) => {
    const i = index + 1; // løpenr 1-basert
    let utfall = 'ikke-besøkt';
    let produktId = null;
    let notater = null;
    let tidspunkt = null;

    if (index < pendingEnd) {
      utfall = 'ikke-besøkt';
    } else if (index < visitedEnd) {
      utfall = i % 2 === 0 ? 'ikke-hjemme' : 'besøkt';
      tidspunkt = new Date(DEMO_VISIT_T0 - i * 3600_000).toISOString();
      notater = encodeUnitNotater(
        base.address,
        base.unitId,
        utfall === 'besøkt' ? 'Presentert tilbud, vurderer' : 'Ingen svar på dørklokke',
      );
    } else {
      utfall = 'solgt';
      produktId = 'sdu-fiber-500';
      tidspunkt = new Date(DEMO_VISIT_T0 - i * 7200_000).toISOString();
      notater = encodeUnitNotater(base.address, base.unitId, 'Solgt: Fiber 500');
    }

    return { ...base, utfall, produktId, notater, tidspunkt };
  });
}

const PIN_HASHES = {
  '1111': '$2b$10$0TsIsrnMIPyRlJcstWAZ6OuKUBfvUjlDj3ayFkTA.DIdd96AQRGUW',
  '2222': '$2b$10$gpogs/.N9laeEogxGFEbpe6UgVNS0uBbjAFdKVRK0NC66W3L2ycfm',
  '3333': '$2b$10$5ZLGXA68azyfasJ5gbYXVem8TfuWgFTB/1k3/BrzjKI90UEIgNQ4a',
  '4444': '$2b$10$0mSmwOac2dN9lYNPQo0HP.Oe4RkrAtWuciZ5mNlOUrDDbVik.WUGu',
  '5555': '$2b$10$3M/.jjrmzMdOzE4x.5SyWuB0XAujQJDzgCJx5LZyqjdiXUoIsWr2O',
  '6666': '$2b$10$n.BA1Au.o0o/t9d5/Ukip.QIalCmWFinPCjGya1gd0zEeqNNBsoUa',
};
async function seedHubUsers(client) {
  console.log('→ Hub-brukere (hub.brukere)');
  for (const u of HUB_USERS) {
    const pinHash = PIN_HASHES[u.pin];
    await client.query(`
      INSERT INTO hub.brukere (bruker_id, navn, epost, pin_hash, rolle_id, aktiv)
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (epost) DO NOTHING
    `, [u.id, u.name, u.email, pinHash, u.rolleId]);
  }
  console.log(`  ✓ ${HUB_USERS.length} workshop-brukere (PIN 1111–6666)`);
}

async function seedSduSellers(client) {
  console.log('→ SDU-selgere (sales_core.sdu_selgere)');
  for (const id of SDU_SELLER_IDS) {
    await client.query(`
      INSERT INTO sales_core.sdu_selgere (selger_id, region, mål_besøk_dag, aktiv)
      VALUES ($1, 'Oslo', 25, true)
      ON CONFLICT (selger_id) DO NOTHING
    `, [id]);
  }
  console.log('  ✓ Lars + Marte registrert som SDU-selgere');
}

async function seedSduRound(client, round, units) {
  const today = new Date().toISOString().slice(0, 10);
  await client.query(`
    INSERT INTO sales_core.sdu_runder (runde_id, navn, bygg_id, selger_id, leder_id, dato, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'aktiv')
    ON CONFLICT (runde_id) DO UPDATE SET
      navn = EXCLUDED.navn,
      bygg_id = EXCLUDED.bygg_id,
      selger_id = EXCLUDED.selger_id,
      leder_id = EXCLUDED.leder_id,
      dato = EXCLUDED.dato,
      status = EXCLUDED.status
  `, [round.id, round.name, round.buildingId, round.sellerId, round.leaderId, today]);

  await client.query(`DELETE FROM sales_core.sdu_besøk WHERE runde_id = $1`, [round.id]);

  for (const u of units) {
    await client.query(`
      INSERT INTO sales_core.sdu_besøk (runde_id, leilighet_id, bygg_id, etasje, person_id, utfall, produkt_id, notater, tidspunkt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      round.id,
      u.unitId,
      u.buildingId,
      u.etasje ?? null,
      u.residentName ?? null,
      u.utfall,
      u.produktId,
      u.notater,
      u.tidspunkt,
    ]);
  }
}

async function seedSduRounds(client) {
  console.log('→ SDU-runder (sales_core.sdu_runder + sdu_besøk)');

  // Rydd gamle enkeltbygg-runder (CASCADE fjerner besøk)
  await client.query(`
    DELETE FROM sales_core.sdu_runder
    WHERE runde_id IN (
      'c1000001-0000-4000-8000-000000000001',
      'c1000002-0000-4000-8000-000000000002'
    )
  `);

  const summaries = [];
  for (const area of AREA_ROUNDS) {
    const units = areaRoundUnits(area.buildingIds);
    await seedSduRound(client, {
      id: area.id,
      name: area.name,
      buildingId: area.startBuildingId,
      sellerId: area.sellerId,
      leaderId: area.leaderId,
    }, units);
    summaries.push(
      `${area.name} (${area.buildingIds.length} bygg, ${units.length} enheter)`,
    );
  }

  console.log(`  ✓ ${summaries.join(' | ')}`);
}

async function seedMduDeals(client) {
  console.log('→ MDU-pipeline (mdu_deals + events + tilbud)');
  const now = new Date();
  const iso = now.toISOString();
  const dAgo = (d) => new Date(now.getTime() - d * 86400_000).toISOString();

  const SANNSYN = {
    'lead': 10, 'kontaktet': 25, 'befaring': 40, 'tilbud-sendt': 55,
    'forhandling': 70, 'war-room': 65, 'war-room-godkjent': 85,
    'war-room-avvist': 15, 'vunnet': 100, 'tapt': 0,
  };

  // produkt_id-ene er illustrative (tilbud.produkt_id har ingen FK) — juster mot faktisk MDU-katalog ved behov
  const deals = [
    { id: DEMO.deals.solberg, name: 'Solberg Borettslag', units: 120, status: 'forhandling',
      value: 1_440_000, close: '2026-07-30', contact: 'Anne Solberg', email: 'anne.solberg@solberg-brl.no',
      product: 'Produkt: Fiber Total', notes: 'Forhandling om fellesavtale for hele borettslaget.',
      events: [
        ['created', null, 'lead', 30, 'Lead opprettet etter befaringsforespørsel'],
        ['status_changed', 'lead', 'kontaktet', 25, 'Første møte med styret'],
        ['status_changed', 'kontaktet', 'befaring', 20, 'Teknisk befaring gjennomført'],
        ['status_changed', 'befaring', 'tilbud-sendt', 12, 'Tilbud sendt på Fiber Total'],
        ['status_changed', 'tilbud-sendt', 'forhandling', 5, 'Forhandling om pris per enhet'],
      ],
      tilbud: { produkt: 'mdu-fiber-total', pris: 149, status: 'sendt', sentDaysAgo: 12 } },
    { id: DEMO.deals.berglia, name: 'Berglia Sameie', units: 85, status: 'tilbud-sendt',
      value: 918_000, close: '2026-06-15', contact: 'Ola Berg', email: 'ola.berg@berglia.no',
      product: 'Produkt: Fiber 500', notes: 'Tilbud sendt — venter på generalforsamling.',
      events: [
        ['created', null, 'lead', 40, 'Lead fra innkommende henvendelse'],
        ['status_changed', 'lead', 'kontaktet', 30, 'Møte med styreleder'],
        ['status_changed', 'kontaktet', 'tilbud-sendt', 20, 'Tilbud sendt, venter generalforsamling'],
      ],
      tilbud: { produkt: 'mdu-bb-500', pris: 119, status: 'sendt', sentDaysAgo: 20 } },
    { id: DEMO.deals.nordaasen, name: 'Nordåsen BRL', units: 200, status: 'lead',
      value: 2_400_000, close: '2026-09-01', contact: 'Hilde Nordås', email: 'hilde@nordaasen-brl.no',
      product: 'Produkt: Fiber Total', notes: 'Prospekt — første møte booket med styret.',
      events: [ ['created', null, 'lead', 7, 'Prospekt — første møte booket'] ] },
    { id: DEMO.deals.havnekvartalet, name: 'Havnekvartalet BRL', units: 64, status: 'vunnet',
      value: 691_200, close: '2026-03-01', contact: 'Jon Havne', email: 'jon@havnekvartalet.no',
      product: 'Produkt: Frihet M', notes: 'Signert avtale — oppstart Q2.', wonDaysAgo: 70,
      events: [
        ['created', null, 'lead', 120, 'Lead fra utbygger'],
        ['status_changed', 'lead', 'kontaktet', 110, 'Møte med styret'],
        ['status_changed', 'kontaktet', 'befaring', 100, 'Befaring gjennomført'],
        ['status_changed', 'befaring', 'tilbud-sendt', 90, 'Tilbud sendt'],
        ['status_changed', 'tilbud-sendt', 'forhandling', 80, 'Forhandling'],
        ['status_changed', 'forhandling', 'vunnet', 70, 'Avtale signert — oppstart Q2'],
      ],
      tilbud: { produkt: 'mdu-frihet-m', pris: 108, status: 'akseptert', sentDaysAgo: 90, acceptedDaysAgo: 70 } },
    { id: DEMO.deals.fjordparken, name: 'Fjordparken BRL', units: 150, status: 'war-room',
      value: 1_800_000, close: '2026-08-15', contact: 'Randi Fjord', email: 'randi@fjordparken.no',
      product: 'Produkt: Fiber Total', notes: 'Løftet til war-room — kunde krever rabatt utover selgers fullmakt.',
      events: [
        ['created', null, 'lead', 45, 'Lead fra kampanje'],
        ['status_changed', 'lead', 'kontaktet', 38, 'Møte booket'],
        ['status_changed', 'kontaktet', 'befaring', 30, 'Befaring gjennomført'],
        ['status_changed', 'befaring', 'tilbud-sendt', 20, 'Tilbud sendt'],
        ['status_changed', 'tilbud-sendt', 'forhandling', 12, 'Forhandling om volumrabatt'],
        ['status_changed', 'forhandling', 'war-room', 4, 'Løftet til war-room — rabatt utover fullmakt'],
      ],
      tilbud: { produkt: 'mdu-fiber-total', pris: 139, status: 'sendt', sentDaysAgo: 20 } },
    { id: DEMO.deals.lindealleen, name: 'Lindealléen Sameie', units: 90, status: 'tapt',
      value: 972_000, close: '2026-05-01', contact: 'Truls Lind', email: 'truls@lindealleen.no',
      product: 'Produkt: Fiber 500', notes: 'Tapt til konkurrent på pris.',
      lostDaysAgo: 10, lostReason: 'Tapt til konkurrent — lavere pris per enhet',
      events: [
        ['created', null, 'lead', 60, 'Lead fra innkommende henvendelse'],
        ['status_changed', 'lead', 'kontaktet', 50, 'Møte med styret'],
        ['status_changed', 'kontaktet', 'befaring', 42, 'Befaring gjennomført'],
        ['status_changed', 'befaring', 'tilbud-sendt', 30, 'Tilbud sendt'],
        ['status_changed', 'tilbud-sendt', 'tapt', 10, 'Tapt til konkurrent på pris'],
      ] },
  ];

  const demoDealIds = deals.map((d) => d.id);
  await client.query(`DELETE FROM sales_core.mdu_deal_events WHERE deal_id = ANY($1::uuid[])`, [demoDealIds]);
  await client.query(`DELETE FROM sales_core.tilbud WHERE deal_id = ANY($1::uuid[])`, [demoDealIds]);

  for (const d of deals) {
    const meta = JSON.stringify({ contactName: d.contact, contactEmail: d.email, product: d.product });
    const notater = `${meta}\n${d.product}\nKontakt: ${d.contact}\n${d.notes}`;
    const byggId = `bygg-${d.name.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`;
    const vunnet = d.wonDaysAgo != null ? dAgo(d.wonDaysAgo) : null;
    const tapt = d.lostDaysAgo != null ? dAgo(d.lostDaysAgo) : null;

    await client.query(`
      INSERT INTO sales_core.mdu_deals (
        deal_id, bygg_id, adresse, antall_enheter, status, selger_id, leder_id,
        verdi_kr, sannsynlighet, forventet_close, notater, opprettet, sist_oppdatert,
        vunnet_dato, tapt_dato, tapt_årsak
      ) VALUES (
        $1,$2,$3,$4,$5::sales_core.deal_status,$6,$7,$8,$9,$10,$11,$12,$12,$13,$14,$15
      )
      ON CONFLICT (deal_id) DO UPDATE SET
        status = EXCLUDED.status, antall_enheter = EXCLUDED.antall_enheter,
        verdi_kr = EXCLUDED.verdi_kr, sannsynlighet = EXCLUDED.sannsynlighet,
        forventet_close = EXCLUDED.forventet_close, notater = EXCLUDED.notater,
        sist_oppdatert = EXCLUDED.sist_oppdatert, vunnet_dato = EXCLUDED.vunnet_dato,
        tapt_dato = EXCLUDED.tapt_dato, tapt_årsak = EXCLUDED.tapt_årsak
    `, [
      d.id, byggId, d.name, d.units, d.status, DEMO.users.kari, DEMO.users.per,
      d.value, SANNSYN[d.status] ?? null, d.close, notater, iso, vunnet, tapt, d.lostReason ?? null,
    ]);

    for (const [hendelse, fra, til, daysAgo, kommentar] of d.events) {
      await client.query(`
        INSERT INTO sales_core.mdu_deal_events (deal_id, hendelse, fra_status, til_status, utført_av, kommentar, tidspunkt)
        VALUES ($1,$2,$3::sales_core.deal_status,$4::sales_core.deal_status,$5,$6,$7)
      `, [d.id, hendelse, fra, til, DEMO.users.kari, kommentar, dAgo(daysAgo)]);
    }

    if (d.tilbud) {
      const t = d.tilbud;
      await client.query(`
        INSERT INTO sales_core.tilbud (deal_id, produkt_id, antall_enheter, pris_per_enhet, status, sendt_dato, gyldig_til, akseptert_dato)
        VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8)
      `, [d.id, t.produkt, d.units, t.pris, t.status, dAgo(t.sentDaysAgo), d.close,
          t.acceptedDaysAgo != null ? dAgo(t.acceptedDaysAgo) : null]);
    }
  }

  console.log(`  ✓ ${deals.length} MDU-deals + events + tilbud (alle pipeline-statuser dekket)`);
}

async function seedCases(client) {
  console.log('→ Cases (cases.saker + hendelser)');
  const now = new Date();
  const hAgo = (h) => new Date(now.getTime() - h * 3600_000).toISOString();
  const hAhead = (h) => new Date(now.getTime() + h * 3600_000).toISOString();
  const E = DEMO.users.erik;

  const cases = [
    { id: DEMO.cases.order, saksnummer: 'CAS-2026-00001', typeKode: 'ORDER_FEIL', status: 'LØST', prioritet: 'høy',
      tittel: 'Ordre stoppet i OMS — duplikat ordrelinje',
      beskrivelse: 'Kunde Lars Eriksen fikk feilmelding ved bestilling. Ordre lå fast med status PENDING.',
      kundeNavn: 'Lars Eriksen', kundeEpost: 'lars.eriksen@telenor.com',
      tildeltGruppe: 'teknisk-ordre', tildeltBrukerId: E, løst: hAgo(6), slaFrist: hAgo(2),
      events: [
        { type: 'created', til: 'OPPRETTET', gruppeTil: 'teknisk-ordre', navn: 'System', h: 30, kommentar: 'Opprettet fra ordrefeil-event' },
        { type: 'status_changed', fra: 'OPPRETTET', til: 'TILDELT', navn: 'System', h: 29, kommentar: 'Auto-tildelt teknisk-ordre' },
        { type: 'assigned', utfortAv: E, navn: 'Erik Teknisk', h: 28, kommentar: 'Tatt av Erik Teknisk' },
        { type: 'status_changed', fra: 'TILDELT', til: 'UNDER_ARBEID', utfortAv: E, navn: 'Erik Teknisk', h: 20, kommentar: 'Feilsøking startet' },
        { type: 'status_changed', fra: 'UNDER_ARBEID', til: 'LØST', utfortAv: E, navn: 'Erik Teknisk', h: 6, kommentar: 'Fjernet duplikat ordrelinje i OMS' },
      ] },
    { id: DEMO.cases.aktivering, saksnummer: 'CAS-2026-00002', typeKode: 'AKTIVERING_FEIL', status: 'UNDER_ARBEID', prioritet: 'kritisk',
      tittel: 'Fiberaktivering feilet — provisjonering timeout',
      beskrivelse: 'Aktivering av fiber hos kunde feilet etter 3 forsøk. Kritisk — kunde uten tjeneste.',
      kundeNavn: 'Marte Olsen', kundeEpost: 'marte.olsen@eksempel.no',
      tildeltGruppe: 'teknisk-aktivering', slaFrist: hAhead(2),
      events: [
        { type: 'created', til: 'OPPRETTET', gruppeTil: 'teknisk-aktivering', navn: 'System', h: 10, kommentar: 'Opprettet fra aktiveringsfeil-event' },
        { type: 'status_changed', fra: 'OPPRETTET', til: 'TILDELT', navn: 'System', h: 9, kommentar: 'Auto-tildelt teknisk-aktivering' },
        { type: 'status_changed', fra: 'TILDELT', til: 'UNDER_ARBEID', navn: 'Vakt aktivering', h: 7, kommentar: 'Reprovisjonering startet' },
        { type: 'sla_warning', navn: 'System', h: 1, kommentar: 'SLA-frist nærmer seg (kritisk, 4t)' },
      ] },
    { id: DEMO.cases.fiber, saksnummer: 'CAS-2026-00003', typeKode: 'FIBER_FEIL', status: 'TILDELT', prioritet: 'høy',
      tittel: 'Fiber nede — ODF feil i bygg Grünerløkka 12',
      beskrivelse: 'Flere beboere melder om total utfall i Grünerløkka 12. Sjekk fiber-node.',
      kundeNavn: 'Grünerløkka Borettslag', tildeltGruppe: 'teknisk-fiber', slaFrist: hAhead(6),
      events: [
        { type: 'created', til: 'OPPRETTET', gruppeTil: 'teknisk-fiber', navn: 'System', h: 5, kommentar: 'Opprettet fra fiberfeil-event' },
        { type: 'status_changed', fra: 'OPPRETTET', til: 'TILDELT', navn: 'System', h: 4, kommentar: 'Auto-tildelt teknisk-fiber' },
      ] },
    { id: DEMO.cases.kunde, saksnummer: 'CAS-2026-00004', typeKode: 'KUNDEHENVENDELSE', status: 'OPPRETTET', prioritet: 'normal',
      tittel: 'Kunde lurer på leveringstid for ny bestilling',
      beskrivelse: 'Kunde ringte inn og ønsker status på bestilling fra forrige uke.',
      kundeNavn: 'Per Hansen', kundeEpost: 'per.hansen@eksempel.no', tildeltGruppe: 'kundeservice',
      events: [
        { type: 'created', til: 'OPPRETTET', gruppeTil: 'kundeservice', navn: 'System', h: 2, kommentar: 'Opprettet manuelt av kundeservice' },
      ] },
    { id: DEMO.cases.faktura, saksnummer: 'CAS-2026-00005', typeKode: 'FAKTURA_FEIL', status: 'ESKALERT', prioritet: 'høy',
      tittel: 'Dobbeltfakturering — krever 2. linje',
      beskrivelse: 'Kunde fakturert to ganger for samme periode. Krever manuell kreditering.',
      kundeNavn: 'Kari Nordmann', kundeEpost: 'kari.nordmann@eksempel.no',
      tildeltGruppe: 'teknisk-faktura', slaFrist: hAhead(12),
      events: [
        { type: 'created', til: 'OPPRETTET', gruppeTil: 'teknisk-faktura', navn: 'System', h: 24, kommentar: 'Opprettet fra fakturafeil-event' },
        { type: 'status_changed', fra: 'OPPRETTET', til: 'TILDELT', navn: 'System', h: 22, kommentar: 'Auto-tildelt teknisk-faktura' },
        { type: 'status_changed', fra: 'TILDELT', til: 'UNDER_ARBEID', utfortAv: E, navn: 'Erik Teknisk', h: 18, kommentar: 'Verifiserte dobbeltfaktura' },
        { type: 'escalated', fra: 'UNDER_ARBEID', til: 'ESKALERT', utfortAv: E, navn: 'Erik Teknisk', h: 3, kommentar: 'Eskalert til 2. linje — manuell kreditering krever ledergodkjenning' },
      ] },
    { id: DEMO.cases.mobil, saksnummer: 'CAS-2026-00006', typeKode: 'MOBILFEIL', status: 'LØST', prioritet: 'normal',
      tittel: 'SIM-bytte feilet — nytt SIM ikke aktivert',
      beskrivelse: 'Kunde byttet til eSIM men gammelt SIM var fortsatt aktivt. Krevde manuell aktivering.',
      kundeNavn: 'Nina Dahl', kundeEpost: 'nina.dahl@eksempel.no',
      tildeltGruppe: 'teknisk-mobil', løst: hAgo(30), slaFrist: hAgo(40),
      events: [
        { type: 'created', til: 'OPPRETTET', gruppeTil: 'teknisk-mobil', navn: 'System', h: 48, kommentar: 'Opprettet fra mobilfeil-event' },
        { type: 'status_changed', fra: 'OPPRETTET', til: 'TILDELT', navn: 'System', h: 47, kommentar: 'Auto-tildelt teknisk-mobil' },
        { type: 'status_changed', fra: 'TILDELT', til: 'UNDER_ARBEID', navn: 'Vakt mobil', h: 40, kommentar: 'Feilsøking eSIM-provisjonering' },
        { type: 'status_changed', fra: 'UNDER_ARBEID', til: 'LØST', navn: 'Vakt mobil', h: 30, kommentar: 'Aktivert nytt eSIM manuelt' },
      ] },
    { id: DEMO.cases.tv, saksnummer: 'CAS-2026-00007', typeKode: 'TV_FEIL', status: 'UNDER_ARBEID_2LINJE', prioritet: 'høy',
      tittel: 'TV-dekoder får ikke signal etter flytting',
      beskrivelse: 'Kunde flyttet og dekoder får ikke signal på ny adresse. 1. linje klarte ikke løse.',
      kundeNavn: 'Fredrik Holm', kundeEpost: 'fredrik.holm@eksempel.no',
      tildeltGruppe: 'teknisk-aktivering', slaFrist: hAgo(6),
      events: [
        { type: 'created', til: 'OPPRETTET', gruppeTil: 'teknisk-aktivering', navn: 'System', h: 14, kommentar: 'Opprettet fra TV-feil-event' },
        { type: 'status_changed', fra: 'OPPRETTET', til: 'TILDELT', navn: 'System', h: 13, kommentar: 'Auto-tildelt teknisk-aktivering' },
        { type: 'status_changed', fra: 'TILDELT', til: 'UNDER_ARBEID', navn: 'Vakt aktivering', h: 10, kommentar: 'Sjekket signalstyrke' },
        { type: 'escalated', fra: 'UNDER_ARBEID', til: 'ESKALERT', navn: 'Vakt aktivering', h: 6, kommentar: 'Eskalert — krever nettverkskonfig' },
        { type: 'status_changed', fra: 'ESKALERT', til: 'UNDER_ARBEID_2LINJE', gruppeTil: 'teknisk-aktivering', navn: '2. linje', h: 5, kommentar: 'Tatt av 2. linje' },
      ] },
  ];

  const demoCaseIds = cases.map((c) => c.id);

  for (const c of cases) {
    await client.query(`
      INSERT INTO cases.saker (
        sak_id, saksnummer, type_kode, status, prioritet, tittel, beskrivelse,
        kunde_navn, kunde_epost, tildelt_gruppe, tildelt_bruker_id,
        sla_frist, løst, kilde, opprettet, sist_oppdatert
      ) VALUES (
        $1,$2,$3,$4::cases.sak_status,$5::cases.sak_prioritet,$6,$7,
        $8,$9,$10,$11,$12,$13,'manual',$14,$14
      )
      ON CONFLICT (saksnummer) DO UPDATE SET
        status = EXCLUDED.status, prioritet = EXCLUDED.prioritet,
        tildelt_gruppe = EXCLUDED.tildelt_gruppe, tildelt_bruker_id = EXCLUDED.tildelt_bruker_id,
        sla_frist = EXCLUDED.sla_frist, løst = EXCLUDED.løst, sist_oppdatert = EXCLUDED.sist_oppdatert
    `, [
      c.id, c.saksnummer, c.typeKode, c.status, c.prioritet, c.tittel, c.beskrivelse,
      c.kundeNavn, c.kundeEpost ?? null, c.tildeltGruppe, c.tildeltBrukerId ?? null,
      c.slaFrist ?? null, c.løst ?? null, hAgo(48),
    ]);
  }

  await client.query(`DELETE FROM cases.hendelser WHERE sak_id = ANY($1::uuid[])`, [demoCaseIds]);
  for (const c of cases) {
    for (const e of c.events) {
      await client.query(`
        INSERT INTO cases.hendelser (
          sak_id, hendelse_type, fra_status, til_status, fra_gruppe, til_gruppe,
          utført_av, utført_av_navn, kommentar, tidspunkt
        ) VALUES ($1,$2,$3::cases.sak_status,$4::cases.sak_status,$5,$6,$7,$8,$9,$10)
      `, [
        c.id, e.type, e.fra ?? null, e.til ?? null, e.gruppeFra ?? null, e.gruppeTil ?? null,
        e.utfortAv ?? null, e.navn ?? null, e.kommentar, hAgo(e.h),
      ]);
    }
  }

  await client.query(`
    SELECT setval('cases.saksnummer_seq',
      GREATEST(7, (SELECT COALESCE(MAX(CAST(SUBSTRING(saksnummer FROM '[0-9]+$') AS INTEGER)), 0)
                   FROM cases.saker WHERE saksnummer LIKE 'CAS-2026-%')), true)
  `);

  console.log(`  ✓ ${cases.length} saker med full hendelseslogg (created→...→løst/eskalert)`);
}

async function printSummary(client) {
  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM hub.brukere WHERE epost LIKE '%@telenor.com' AND navn IN (
        'Lars Eriksen','Marte Andersen','Tor Halvorsen','Kari Nygaard','Per Strand','Erik Teknisk'
      )) AS hub_users,
      (SELECT COUNT(*)::int FROM sales_core.sdu_runder WHERE runde_id = ANY($1::uuid[])) AS rounds,
      (SELECT COUNT(*)::int FROM sales_core.mdu_deals WHERE deal_id = ANY($2::uuid[])) AS deals,
      (SELECT COUNT(*)::int FROM cases.saker WHERE saksnummer LIKE 'CAS-2026-%') AS cases
  `, [
    [DEMO.rounds.oslo, DEMO.rounds.bergen, DEMO.rounds.karmoy],
    [DEMO.deals.solberg, DEMO.deals.berglia, DEMO.deals.nordaasen,
     DEMO.deals.havnekvartalet, DEMO.deals.fjordparken, DEMO.deals.lindealleen],
  ]);
  const r = counts.rows[0];
  console.log('\n── Oppsummering ──');
  console.log(`  Hub-brukere:  ${r.hub_users}/6`);
  console.log(`  SDU-runder:   ${r.rounds}/3 (Oslo / Bergen / Karmøy)`);
  console.log(`  MDU-deals:    ${r.deals}/6`);
  console.log(`  Cases:        ${r.cases}/7`);
}

async function run() {
  console.log('=== Workshop Demo Seed ===\n');
  console.log(`Database: ${DATABASE_URL.replace(/:([^:@]+)@/, ':***@')}\n`);

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('railway.internal') ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query('BEGIN');
    await seedHubUsers(client);
    await seedSduSellers(client);
    await seedSduRounds(client);
    await seedMduDeals(client);
    await seedCases(client);
    await client.query('COMMIT');
    await printSummary(client);
    console.log('\n✓ Demo-seed fullført (idempotent — trygt å kjøre på nytt)\n');
    console.log('Workshop-PINer: Lars 1111 | Marte 2222 | Tor 3333 | Kari 4444 | Per 5555 | Erik 6666');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n✗ Seed feilet:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
