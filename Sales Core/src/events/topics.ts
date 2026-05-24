// ── Event topic-konstanter (speilet fra Integration Layer EventTopics.ts) ──
export const EventTopics = {
  SALE_CREATED: 'sale.created',
  SALE_STATUS_CHANGED: 'sale.status_changed',
  SALE_WON: 'sale.won',
  SALE_LOST: 'sale.lost',
  SALE_SENT_TO_WAR_ROOM: 'sale.sent_to_war_room',
  WAR_ROOM_APPROVED: 'sale.war_room_approved',
  WAR_ROOM_REJECTED: 'sale.war_room_rejected',
  VISIT_COMPLETED: 'visit.completed',
  ROUND_CREATED: 'round.created',
  ROUND_COMPLETED: 'round.completed',
  INCENTIVE_TRIGGERED: 'incentive.triggered',
  BONUS_CALCULATED: 'bonus.calculated',
} as const;

export type EventTopic = typeof EventTopics[keyof typeof EventTopics];
