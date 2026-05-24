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
} as const;

export type TopicName = typeof Topics[keyof typeof Topics];

// Alle gyldige topic-strenger som array (brukes for validering i EventBus-router)
export const ALL_TOPICS: TopicName[] = Object.values(Topics);
