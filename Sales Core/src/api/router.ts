// ── API router and customer portal endpoints ──
import express, { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import {
  readEvents,
  readOffers,
  readOpportunities,
  readRounds,
  readSellers,
  readUsers,
  writeEvents,
  writeOffers,
  writeOpportunities,
  writeRounds,
  writeSellers,
  writeUsers,
} from '../storage';
import { eventBus } from '../events';
import { Offer, OfferEvent, OfferStatus, Opportunity, OpportunityStage, Round, RoundStatus, RoundUnit, Seller, HubUser, AppPermission, UserRole } from '../types';
import { sseManager } from '../events/sse-manager';

export const router = express.Router();
router.use(express.json());

function getBaseUrl(): string {
  return process.env.SALES_CORE_BASE_URL ?? 'http://localhost:3005';
}

function withTrackingUrl(offer: Offer): Offer & { trackingUrl: string } {
  return {
    ...offer,
    trackingUrl: `${getBaseUrl()}/track/${offer.trackingToken}`,
  };
}

function findOpportunity(id: string): Opportunity | undefined {
  return readOpportunities().find((item) => item.id === id);
}

function sanitizeOpportunityStage(stage: unknown): stage is OpportunityStage {
  return typeof stage === 'string' &&
    ['prospect', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost'].includes(stage);
}

router.get('/health', (req: Request, res: Response) => {
  const opportunities = readOpportunities();
  const offers = readOffers();
  res.json({ status: 'healthy', opportunities: opportunities.length, offers: offers.length });
});

router.get('/api/opportunities', (req: Request, res: Response) => {
  const stage = req.query.stage;
  let opportunities = readOpportunities();

  if (typeof stage === 'string') {
    opportunities = opportunities.filter((opportunity) => opportunity.stage === stage);
  }

  res.json(opportunities);
});

router.get('/api/opportunities/:id', (req: Request, res: Response) => {
  const opportunity = readOpportunities().find((item) => item.id === req.params.id);
  if (!opportunity) {
    return res.status(404).json({ error: 'Opportunity not found' });
  }

  res.json(opportunity);
});

router.post('/api/opportunities', (req: Request, res: Response) => {
  const body = req.body as Partial<Opportunity>;
  if (
    !body.name ||
    !body.accountName ||
    !body.contactName ||
    !body.contactEmail ||
    !sanitizeOpportunityStage(body.stage) ||
    !body.closeDate ||
    typeof body.estimatedAnnualValue !== 'number' ||
    typeof body.units !== 'number'
  ) {
    return res.status(400).json({ error: 'Missing required opportunity fields' });
  }

  const now = new Date().toISOString();
  const newOpportunity: Opportunity = {
    id: uuid(),
    name: body.name,
    accountName: body.accountName,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    stage: body.stage,
    closeDate: body.closeDate,
    estimatedAnnualValue: body.estimatedAnnualValue,
    units: body.units,
    notes: body.notes,
    createdAt: now,
    updatedAt: now,
  };

  const opportunities = readOpportunities();
  writeOpportunities([...opportunities, newOpportunity]);
  res.status(201).json(newOpportunity);
});

router.patch('/api/opportunities/:id', (req: Request, res: Response) => {
  const opportunities = readOpportunities();
  const existing = opportunities.find((item) => item.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Opportunity not found' });
  }

  const body = req.body as Partial<Omit<Opportunity, 'id' | 'createdAt'>>;
  const updatedOpportunity: Opportunity = {
    ...existing,
    ...body,
    stage: body.stage ?? existing.stage,
    updatedAt: new Date().toISOString(),
  };

  writeOpportunities(opportunities.map((item) => (item.id === existing.id ? updatedOpportunity : item)));
  res.json(updatedOpportunity);
});

// War Room: send deal to war room / approve / reject
router.patch('/api/opportunities/:id/warroom', (req: Request, res: Response) => {
  const opportunities = readOpportunities();
  const existing = opportunities.find((item) => item.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Opportunity not found' });

  const { status, note } = req.body as { status: 'pending' | 'approved' | 'rejected'; note?: string };
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updated: Opportunity = {
    ...existing,
    warRoomStatus: status,
    warRoomNote: note ?? existing.warRoomNote,
    warRoomAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  writeOpportunities(opportunities.map((o) => (o.id === existing.id ? updated : o)));
  res.json(updated);
});

router.get('/api/offers', (req: Request, res: Response) => {
  const opportunityId = req.query.opportunityId;
  let offers = readOffers();

  if (typeof opportunityId === 'string') {
    offers = offers.filter((offer) => offer.opportunityId === opportunityId);
  }

  res.json(offers.map(withTrackingUrl));
});

router.get('/api/offers/:id', (req: Request, res: Response) => {
  const offer = readOffers().find((item) => item.id === req.params.id);
  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  res.json(withTrackingUrl(offer));
});

router.get('/api/offers/by-token/:trackingToken', (req: Request, res: Response) => {
  const offer = readOffers().find((item) => item.trackingToken === req.params.trackingToken);
  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  res.json(withTrackingUrl(offer));
});

router.post('/api/offers', (req: Request, res: Response) => {
  const body = req.body as Partial<Offer>;

  if (
    !body.opportunityId ||
    !body.accountName ||
    !body.contactName ||
    !body.contactEmail ||
    !body.packageId ||
    !body.packageName ||
    !Array.isArray(body.selectedProducts) ||
    typeof body.monthlyPricePerUnit !== 'number' ||
    typeof body.discountPercent !== 'number' ||
    typeof body.units !== 'number' ||
    !body.salesRepName ||
    !body.validUntil
  ) {
    return res.status(400).json({ error: 'Missing required offer fields' });
  }

  const now = new Date().toISOString();
  const newOffer: Offer = {
    id: uuid(),
    opportunityId: body.opportunityId,
    accountName: body.accountName,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    packageId: body.packageId,
    packageName: body.packageName,
    selectedProducts: body.selectedProducts,
    monthlyPricePerUnit: body.monthlyPricePerUnit,
    discountPercent: body.discountPercent,
    units: body.units,
    notes: body.notes,
    salesRepName: body.salesRepName,
    trackingToken: uuid(),
    status: 'draft',
    validUntil: body.validUntil,
    createdAt: now,
    updatedAt: now,
  };

  const offers = readOffers();
  writeOffers([...offers, newOffer]);

  const event: OfferEvent = {
    id: uuid(),
    offerId: newOffer.id,
    opportunityId: newOffer.opportunityId,
    accountName: newOffer.accountName,
    contactName: newOffer.contactName,
    type: 'created',
    timestamp: now,
  };

  const events = readEvents();
  writeEvents([...events, event]);
  eventBus.publish('offer.event', event);

  res.status(201).json(withTrackingUrl(newOffer));
});

router.post('/api/offers/:id/send', (req: Request, res: Response) => {
  const offers = readOffers();
  const existing = offers.find((offer) => offer.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  const updatedOffer: Offer = {
    ...existing,
    status: 'sent',
    updatedAt: new Date().toISOString(),
  };
  writeOffers(offers.map((offer) => (offer.id === existing.id ? updatedOffer : offer)));

  const event: OfferEvent = {
    id: uuid(),
    offerId: updatedOffer.id,
    opportunityId: updatedOffer.opportunityId,
    accountName: updatedOffer.accountName,
    contactName: updatedOffer.contactName,
    type: 'sent',
    timestamp: new Date().toISOString(),
  };

  const events = readEvents();
  writeEvents([...events, event]);
  eventBus.publish('offer.event', event);

  res.json(withTrackingUrl(updatedOffer));
});

router.patch('/api/offers/:id', (req: Request, res: Response) => {
  const offers = readOffers();
  const existing = offers.find((offer) => offer.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  const body = req.body as Partial<Pick<Offer, 'status' | 'packageId' | 'packageName' | 'selectedProducts' | 'monthlyPricePerUnit' | 'discountPercent' | 'notes' | 'validUntil' | 'salesRepName'>>;
  const updatedOffer: Offer = {
    ...existing,
    ...body,
    updatedAt: new Date().toISOString(),
  };

  writeOffers(offers.map((offer) => (offer.id === existing.id ? updatedOffer : offer)));
  res.json(withTrackingUrl(updatedOffer));
});

router.get('/api/offers/:id/events', (req: Request, res: Response) => {
  const events = readEvents().filter((event) => event.offerId === req.params.id);
  res.json(events);
});

router.get('/track/:trackingToken', (req: Request, res: Response) => {
  const offers = readOffers();
  const offer = offers.find((item) => item.trackingToken === req.params.trackingToken);
  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  if (offer.status === 'sent') {
    const updatedOffer: Offer = {
      ...offer,
      status: 'viewed',
      updatedAt: new Date().toISOString(),
    };
    writeOffers(offers.map((item) => (item.id === offer.id ? updatedOffer : item)));

    const event: OfferEvent = {
      id: uuid(),
      offerId: updatedOffer.id,
      opportunityId: updatedOffer.opportunityId,
      accountName: updatedOffer.accountName,
      contactName: updatedOffer.contactName,
      type: 'viewed',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip,
    };

    const events = readEvents();
    writeEvents([...events, event]);
    eventBus.publish('offer.event', event);
  }

  res.redirect(302, `/portal/${req.params.trackingToken}`);
});

router.post('/track/:trackingToken/respond', (req: Request, res: Response) => {
  const action = req.body?.action as 'accepted' | 'declined' | undefined;

  if (action !== 'accepted' && action !== 'declined') {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const offers = readOffers();
  const offer = offers.find((item) => item.trackingToken === req.params.trackingToken);
  if (!offer) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  const updatedOffer: Offer = {
    ...offer,
    status: action,
    updatedAt: new Date().toISOString(),
  };
  writeOffers(offers.map((item) => (item.id === offer.id ? updatedOffer : item)));

  const event: OfferEvent = {
    id: uuid(),
    offerId: updatedOffer.id,
    opportunityId: updatedOffer.opportunityId,
    accountName: updatedOffer.accountName,
    contactName: updatedOffer.contactName,
    type: action,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip,
  };

  const events = readEvents();
  writeEvents([...events, event]);
  eventBus.publish('offer.event', event);

  res.json({ success: true, status: updatedOffer.status });
});

router.get('/portal/:trackingToken', (req: Request, res: Response) => {
  const token = req.params.trackingToken;
  res.send(`<!DOCTYPE html>
<html lang="no">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tilbud fra Sales Core</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f4f7fb; color: #1a1a1a; }
      .container { max-width: 520px; margin: 0 auto; padding: 24px; }
      .card { background: white; border-radius: 16px; box-shadow: 0 16px 40px rgba(0,0,0,0.08); padding: 28px; }
      h1 { margin-top: 0; color: #005A8E; }
      .badge { background: #00A650; color: white; display: inline-block; padding: 8px 14px; border-radius: 999px; font-size: 0.88rem; margin-bottom: 16px; }
      .field { margin-bottom: 16px; }
      .field label { display: block; margin-bottom: 6px; font-weight: 600; }
      .field span { display: block; font-size: 1rem; line-height: 1.4; }
      .actions { display: grid; gap: 12px; }
      .button { border: none; border-radius: 999px; padding: 14px 18px; font-size: 1rem; cursor: pointer; }
      .accept { background: #00A650; color: white; }
      .decline { background: #005A8E; color: white; }
      .note { background: #eef5ff; padding: 16px; border-radius: 12px; }
      .loading { color: #666; }
      @media (max-width: 560px) { .container { padding: 16px; } }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <span class="badge">Tilbud</span>
        <h1>Tilbudet ditt</h1>
        <div id="content" class="loading">Laster tilbud...</div>
      </div>
    </div>
    <script>
      async function loadOffer() {
        const content = document.getElementById('content');
        try {
          const res = await fetch('/api/offers/by-token/${token}');
          if (!res.ok) throw new Error('Could not load offer');
          const offer = await res.json();
          const html = ''
            + '<div class="field"><label>Pakkenavn</label><span>' + offer.packageName + '</span></div>'
            + '<div class="field"><label>Pris per enhet</label><span>' + offer.monthlyPricePerUnit + ' NOK</span></div>'
            + '<div class="field"><label>Rabatt</label><span>' + offer.discountPercent + '%</span></div>'
            + '<div class="field"><label>Antall enheter</label><span>' + offer.units + '</span></div>'
            + '<div class="field note"><label>Notat</label><span>' + (offer.notes || 'Ingen notater') + '</span></div>'
            + '<div class="actions">'
            + '<button class="button accept" onclick="respond(\'accepted\')">Aksepter tilbudet</button>'
            + '<button class="button decline" onclick="respond(\'declined\')">Avvis tilbudet</button>'
            + '</div>';
          content.innerHTML = html;
        } catch (error) {
          content.innerHTML = '<p>Kunne ikke hente tilbudet. Prøv igjen senere.</p>';
        }
      }

      async function respond(action) {
        const content = document.getElementById('content');
        content.innerHTML = '<p class="loading">Sender svar...</p>';
        try {
          const res = await fetch('/track/${token}/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Feil');
          content.innerHTML = '<p>' + (action === 'accepted' ? 'Takk! Tilbudet er akseptert.' : 'Tilbudet ble avvist.') + '</p>';
        } catch (error) {
          content.innerHTML = '<p>Kunne ikke sende svaret. Prøv igjen.</p>';
        }
      }

      loadOffer();
    </script>
  </body>
</html>`);
});

router.get('/notifications/stream', (req: Request, res: Response) => {
  const id = uuid();
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseManager.addConnection(id, res);
  res.write(': heartbeat\n\n');

  const interval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(interval);
    sseManager.removeConnection(id);
  });
});

// ─── SDU: Seller registry ────────────────────────────────────────────────────

router.get('/api/sdu/sellers', (req: Request, res: Response) => {
  let sellers = readSellers();
  const { role, activeOnly } = req.query;

  if (activeOnly !== 'false') {
    sellers = sellers.filter((s) => s.isActive);
  }
  if (typeof role === 'string') {
    sellers = sellers.filter((s) => s.role === role);
  }

  res.json(sellers);
});

router.post('/api/sdu/sellers', (req: Request, res: Response) => {
  const body = req.body as Partial<Seller>;
  if (!body.name || !body.email || !body.role) {
    return res.status(400).json({ error: 'name, email og role er påkrevd' });
  }

  const sellers = readSellers();
  if (sellers.find((s) => s.email === body.email)) {
    return res.status(409).json({ error: 'Selger med denne e-posten finnes allerede' });
  }

  const newSeller: Seller = {
    id: `sel-${uuid()}`,
    name: body.name,
    email: body.email,
    phone: body.phone,
    role: body.role,
    sfId: body.sfId,
    isActive: body.isActive ?? true,
    createdAt: new Date().toISOString(),
  };

  writeSellers([...sellers, newSeller]);
  res.status(201).json(newSeller);
});

router.patch('/api/sdu/sellers/:id', (req: Request, res: Response) => {
  const sellers = readSellers();
  const existing = sellers.find((s) => s.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Selger ikke funnet' });
  }

  const body = req.body as Partial<Omit<Seller, 'id' | 'createdAt'>>;
  const updated: Seller = { ...existing, ...body };

  writeSellers(sellers.map((s) => (s.id === existing.id ? updated : s)));
  res.json(updated);
});

// ─── SDU: Visit rounds ───────────────────────────────────────────────────────

router.get('/api/sdu/rounds', (req: Request, res: Response) => {
  let rounds = readRounds();
  const { sellerId, date, status } = req.query;

  if (typeof sellerId === 'string') {
    rounds = rounds.filter((r) => r.seller.id === sellerId);
  }
  if (typeof date === 'string') {
    rounds = rounds.filter((r) => r.date === date);
  }
  if (typeof status === 'string') {
    rounds = rounds.filter((r) => r.status === status);
  }

  res.json(rounds);
});

router.post('/api/sdu/rounds', (req: Request, res: Response) => {
  const body = req.body as Partial<Round>;
  if (!body.name || !body.date || !body.seller?.id || !body.seller?.name || !body.createdBy) {
    return res.status(400).json({ error: 'name, date, seller (id+name) og createdBy er påkrevd' });
  }

  const now = new Date().toISOString();
  const newRound: Round = {
    id: `rnd-${uuid()}`,
    name: body.name,
    date: body.date,
    seller: body.seller,
    units: Array.isArray(body.units) ? body.units : [],
    status: 'draft',
    createdBy: body.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  const rounds = readRounds();
  writeRounds([...rounds, newRound]);
  res.status(201).json(newRound);
});

router.get('/api/sdu/rounds/:id', (req: Request, res: Response) => {
  const round = readRounds().find((r) => r.id === req.params.id);
  if (!round) {
    return res.status(404).json({ error: 'Runde ikke funnet' });
  }
  res.json(round);
});

router.patch('/api/sdu/rounds/:id', (req: Request, res: Response) => {
  const rounds = readRounds();
  const existing = rounds.find((r) => r.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Runde ikke funnet' });
  }

  const body = req.body as Partial<Pick<Round, 'name' | 'date' | 'seller' | 'status' | 'units'>>;
  const updated: Round = {
    ...existing,
    ...body,
    updatedAt: new Date().toISOString(),
  };

  writeRounds(rounds.map((r) => (r.id === existing.id ? updated : r)));
  res.json(updated);
});

router.patch('/api/sdu/rounds/:id/units/:unitId', (req: Request, res: Response) => {
  const rounds = readRounds();
  const existing = rounds.find((r) => r.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Runde ikke funnet' });
  }

  const unitIndex = existing.units.findIndex((u) => u.unitId === req.params.unitId);
  if (unitIndex === -1) {
    return res.status(404).json({ error: 'Enhet ikke funnet i runden' });
  }

  const body = req.body as Partial<Pick<RoundUnit, 'visitStatus' | 'visitedAt' | 'note'>>;
  const updatedUnit: RoundUnit = {
    ...existing.units[unitIndex],
    ...body,
    visitedAt: body.visitStatus && body.visitStatus !== 'pending'
      ? (body.visitedAt ?? new Date().toISOString())
      : existing.units[unitIndex].visitedAt,
  };

  const updatedUnits = [...existing.units];
  updatedUnits[unitIndex] = updatedUnit;

  const updatedRound: Round = {
    ...existing,
    units: updatedUnits,
    updatedAt: new Date().toISOString(),
  };

  writeRounds(rounds.map((r) => (r.id === existing.id ? updatedRound : r)));
  res.json(updatedRound);
});

// ─── Auth: Brukerregister og innlogging ───────────────────────────────────────

// POST /api/auth/login — valider navn + PIN, returner bruker (minus PIN) + oppdater lastLoginAt
router.post('/api/auth/login', (req: Request, res: Response) => {
  const { name, pin } = req.body as { name?: string; pin?: string };
  if (!name || !pin) {
    return res.status(400).json({ error: 'name og pin er påkrevd' });
  }

  const users = readUsers();
  const user = users.find(
    (u) => u.name.toLowerCase() === name.toLowerCase() && u.pin === pin && u.isActive
  );

  if (!user) {
    return res.status(401).json({ error: 'Feil navn eller PIN' });
  }

  const updated: HubUser = { ...user, lastLoginAt: new Date().toISOString() };
  writeUsers(users.map((u) => (u.id === user.id ? updated : u)));

  const { pin: _pin, ...safeUser } = updated;
  res.json(safeUser);
});

// GET /api/auth/users — hent alle brukere (superadmin)
router.get('/api/auth/users', (req: Request, res: Response) => {
  const users = readUsers().map(({ pin: _pin, ...u }) => u);
  res.json(users);
});

// POST /api/auth/users — opprett bruker
router.post('/api/auth/users', (req: Request, res: Response) => {
  const body = req.body as Partial<HubUser>;
  if (!body.name || !body.email || !body.role || !body.pin) {
    return res.status(400).json({ error: 'name, email, role og pin er påkrevd' });
  }

  const users = readUsers();
  if (users.find((u) => u.email === body.email)) {
    return res.status(409).json({ error: 'Bruker med denne e-posten finnes allerede' });
  }

  const newUser: HubUser = {
    id: `usr-${uuid()}`,
    name: body.name,
    email: body.email,
    pin: body.pin,
    role: body.role as UserRole,
    permissions: (body.permissions ?? []) as AppPermission[],
    isActive: body.isActive ?? true,
    createdAt: new Date().toISOString(),
    createdBy: body.createdBy ?? 'superadmin',
  };

  writeUsers([...users, newUser]);
  const { pin: _pin, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

// PATCH /api/auth/users/:id — oppdater bruker (tilganger, rolle, PIN, aktiv)
router.patch('/api/auth/users/:id', (req: Request, res: Response) => {
  const users = readUsers();
  const existing = users.find((u) => u.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Bruker ikke funnet' });
  }

  const body = req.body as Partial<Omit<HubUser, 'id' | 'createdAt' | 'createdBy'>>;
  const updated: HubUser = { ...existing, ...body };

  writeUsers(users.map((u) => (u.id === existing.id ? updated : u)));
  const { pin: _pin, ...safeUser } = updated;
  res.json(safeUser);
});

// DELETE /api/auth/users/:id — deaktiver bruker
router.delete('/api/auth/users/:id', (req: Request, res: Response) => {
  const users = readUsers();
  const existing = users.find((u) => u.id === req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Bruker ikke funnet' });
  }

  const deactivated: HubUser = { ...existing, isActive: false };
  writeUsers(users.map((u) => (u.id === existing.id ? deactivated : u)));
  res.json({ success: true });
});
