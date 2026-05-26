// ── Event topic-konstanter ──
export const EventTopics = {
  CASE_CREATED: 'case.created',
  CASE_STATUS_CHANGED: 'case.status_changed',
  CASE_ESCALATED: 'case.escalated',
  CASE_ASSIGNED: 'case.assigned',
  CASE_SLA_WARNING: 'case.sla_warning',
  CASE_SLA_BREACHED: 'case.sla_breached',
} as const;

export type EventTopic = typeof EventTopics[keyof typeof EventTopics];

/** Feil-topics som trigger automatisk sak-opprettelse */
export const FailureTopics = {
  ORDER_FAILED: 'order.failed',
  ACTIVATION_FAILED: 'activation.failed',
  FIBER_FAILED: 'fiber.failed',
  MOBILE_FAILED: 'mobile.failed',
  INVOICE_FAILED: 'invoice.failed',
  TV_FAILED: 'tv.failed',
  VERDIKJEDE_FAILED: 'verdikjede.failed',
} as const;

export const AUTO_CREATE_TOPICS = new Set<string>([
  ...Object.values(FailureTopics),
]);
