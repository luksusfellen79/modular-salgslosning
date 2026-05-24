// ── Beregner bonuser når besøk fullføres med salg ──
import { randomUUID } from 'crypto';
import { sduCatalogStore } from '../../catalog/SduCatalogStore.js';
import { IEventBus } from '../IEventBus.js';
import { Topics } from '../EventTopics.js';
import { IntegrationEvent } from '../../types/domain.js';
import { SDUProduct, Incentive } from '../../types/sdu-catalog.js';
import { bonusToEventPayload, CalculatedBonus, recordBonus } from '../../bonus/BonusLedger.js';
import { logger } from '../../logger.js';

interface VisitCompletedPayload {
  unitId?: string;
  buildingId?: string;
  outcome?: string;
  visitStatus?: string;
  salesRepName?: string;
  sellerId?: string;
  roundId?: string;
  campaignId?: string;
  soldProducts?: string[];
}

function isSoldOutcome(payload: VisitCompletedPayload): boolean {
  return payload.outcome === 'sold'
    || payload.visitStatus === 'sold';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentPeriodMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function findProductForSoldName(name: string): SDUProduct | undefined {
  const products = sduCatalogStore.list({ activeOnly: true });
  const normalized = name.trim().toLowerCase();
  return products.find((p) => {
    const pn = p.name.toLowerCase();
    return normalized === pn
      || normalized.includes(pn)
      || pn.includes(normalized);
  });
}

function activeBonusIncentives(product: SDUProduct, today: string): Incentive[] {
  return product.incentives.filter((i) =>
    i.type === 'bonus_per_sale'
    && i.validFrom <= today
    && i.validUntil >= today,
  );
}

export function registerIncentiveHandlers(eventBus: IEventBus): void {
  eventBus.subscribe(Topics.VISIT_COMPLETED, async (event: IntegrationEvent) => {
    const payload = event.payload as VisitCompletedPayload;
    if (!isSoldOutcome(payload)) {
      logger.info('Visit completed — no bonus (not a sale)', {
        unitId: payload.unitId,
        outcome: payload.outcome ?? payload.visitStatus,
      });
      return;
    }

    const soldProducts = payload.soldProducts ?? [];
    if (!soldProducts.length) {
      logger.warn('Visit sold without soldProducts — skipping bonus', { unitId: payload.unitId });
      return;
    }

    const today = todayIso();
    const lineItems: CalculatedBonus['lineItems'] = [];
    const triggeredIncentives: Array<{ productId: string; incentiveId: string; incentiveName: string }> = [];

    for (const soldName of soldProducts) {
      const product = findProductForSoldName(soldName);
      if (!product) continue;

      for (const incentive of activeBonusIncentives(product, today)) {
        lineItems.push({
          productId: product.productId,
          productName: product.name,
          incentiveId: incentive.id,
          incentiveName: incentive.name,
          bonusKr: incentive.value,
        });
        triggeredIncentives.push({
          productId: product.productId,
          incentiveId: incentive.id,
          incentiveName: incentive.name,
        });
      }
    }

    if (!lineItems.length) {
      logger.info('Visit sold — no matching bonus incentives', {
        unitId: payload.unitId,
        soldProducts,
      });
      return;
    }

    const totalBonusKr = lineItems.reduce((sum, item) => sum + item.bonusKr, 0);
    const bonus: CalculatedBonus = {
      id: randomUUID(),
      occurredAt: event.occurredAt,
      sellerName: payload.salesRepName,
      sellerId: payload.sellerId,
      unitId: payload.unitId ?? '',
      buildingId: payload.buildingId ?? '',
      roundId: payload.roundId,
      visitOutcome: payload.outcome ?? payload.visitStatus ?? 'sold',
      soldProducts,
      lineItems,
      totalBonusKr,
      periodMonth: currentPeriodMonth(),
    };

    recordBonus(bonus);

    for (const triggered of triggeredIncentives) {
      await eventBus.publish({
        eventId: randomUUID(),
        eventType: Topics.INCENTIVE_TRIGGERED,
        source: 'pricing-system',
        occurredAt: new Date().toISOString(),
        payload: {
          ...triggered,
          unitId: payload.unitId,
          buildingId: payload.buildingId,
          roundId: payload.roundId,
          sellerName: payload.salesRepName,
          sellerId: payload.sellerId,
          action: 'bonus_rule_matched',
        },
      });
    }

    await eventBus.publish({
      eventId: bonus.id,
      eventType: Topics.BONUS_CALCULATED,
      source: 'pricing-system',
      occurredAt: bonus.occurredAt,
      payload: bonusToEventPayload(bonus),
    });

    logger.info('Bonus calculated for SDU sale', {
      unitId: payload.unitId,
      sellerName: payload.salesRepName,
      totalBonusKr,
      lineItems: lineItems.length,
    });
  });
}
