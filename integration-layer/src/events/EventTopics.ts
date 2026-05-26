// ── EventTopics — alle gyldige topic-navn som konstanter ──
// Bruk disse i stedet for rene strenger for å unngå skrivefeil og få IntelliSense.
//
// Publiser via: POST /events/publish { topic: Topics.SALE_CREATED, payload: {...} }
// Abonner via:  eventBus.subscribe(Topics.SALE_CREATED, handler)

export const Topics = {
  // ── Salg (MDU pipeline) ─────────────────────────────────────────────────
  SALE_CREATED:             'sale.created',
  SALE_STATUS_CHANGED:      'sale.status_changed',
  SALE_WON:                 'sale.won',
  SALE_LOST:                'sale.lost',

  // ── War Room ──────────────────────────────────────────────────────────
  SALE_SENT_TO_WAR_ROOM:    'sale.sent_to_war_room',
  WAR_ROOM_APPROVED:        'sale.war_room_approved',
  WAR_ROOM_REJECTED:        'sale.war_room_rejected',

  // ── Kunder ─────────────────────────────────────────────────────────────
  CUSTOMER_CREATED:         'customer.created',
  CUSTOMER_UPDATED:         'customer.updated',

  // ── SDU feltsalg ────────────────────────────────────────────────────────
  VISIT_COMPLETED:          'visit.completed',
  ROUND_CREATED:            'round.created',
  ROUND_COMPLETED:          'round.completed',

  // ── Incentiver ──────────────────────────────────────────────────────────
  INCENTIVE_TRIGGERED:      'incentive.triggered',
  BONUS_CALCULATED:         'bonus.calculated',

  // ── Produkter og kampanjer ───────────────────────────────────────────────
  CAMPAIGN_UPDATED:         'campaign.updated',
  PRODUCT_UPDATED:          'product.updated',

  // ── Case Service (livssyklus) ───────────────────────────────────────────
  CASE_CREATED:             'case.created',
  CASE_STATUS_CHANGED:      'case.status_changed',
  CASE_ESCALATED:           'case.escalated',
  CASE_ASSIGNED:            'case.assigned',
  CASE_SLA_WARNING:         'case.sla_warning',
  CASE_SLA_BREACHED:        'case.sla_breached',

  // ── Verdikjede-feil (trigger automatisk sak-opprettelse i Case Service) ─
  ORDER_FAILED:             'order.failed',
  ACTIVATION_FAILED:        'activation.failed',
  FIBER_FAILED:             'fiber.failed',
  MOBILE_FAILED:            'mobile.failed',
  INVOICE_FAILED:           'invoice.failed',
  TV_FAILED:                'tv.failed',
  VERDIKJEDE_FAILED:        'verdikjede.failed',
} as const;

export type TopicName = typeof Topics[keyof typeof Topics];

/** Case Service livssyklus-topics */
export const CASE_TOPICS: TopicName[] = [
  Topics.CASE_CREATED,
  Topics.CASE_STATUS_CHANGED,
  Topics.CASE_ESCALATED,
  Topics.CASE_ASSIGNED,
  Topics.CASE_SLA_WARNING,
  Topics.CASE_SLA_BREACHED,
];

/** Feil-topics som Case Service lytter på for auto-opprettelse */
export const FAILURE_TOPICS: TopicName[] = [
  Topics.ORDER_FAILED,
  Topics.ACTIVATION_FAILED,
  Topics.FIBER_FAILED,
  Topics.MOBILE_FAILED,
  Topics.INVOICE_FAILED,
  Topics.TV_FAILED,
  Topics.VERDIKJEDE_FAILED,
];

// Alle gyldige topic-strenger som array (brukes for validering i EventBus-router)
export const ALL_TOPICS: TopicName[] = Object.values(Topics);
