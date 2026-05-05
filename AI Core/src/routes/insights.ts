import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import type { NBAOutcome } from '../lib/types.js';

export const insightsRouter = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface InsightsReport {
  churnReasons: Array<{ reason: string; frequency: 'høy' | 'middels' | 'lav'; detail: string }>;
  winReasons:   Array<{ reason: string; frequency: 'høy' | 'middels' | 'lav'; detail: string }>;
  productTrends: Array<{ product: string; trend: string; signal: string }>;
  keyInsights: string[];
  recommendations: string[];
  dataNote: string;
}

interface MDUDealSummary {
  navn: string;
  fase: string;
  enheter: number;
  arsverdi?: number;
  lukkedato?: string;
  selger?: string;
  warRoom?: string;
}

// POST /insights/analyze
insightsRouter.post('/analyze', async (req, res) => {
  const {
    mduDeals,
    sduOutcomes,
  } = req.body as {
    mduDeals: MDUDealSummary[];
    sduOutcomes: NBAOutcome[];
  };

  // Build SDU summary
  const sduTotal = sduOutcomes.length;
  const sduSold = sduOutcomes.filter(o => o.actualOutcome === 'sold').length;
  const sduRejected = sduOutcomes.filter(o => o.actualOutcome === 'rejected').length;
  const productFreq: Record<string, number> = {};
  for (const o of sduOutcomes) {
    for (const p of o.actualProducts) {
      productFreq[p] = (productFreq[p] ?? 0) + 1;
    }
    productFreq[o.recommendedProduct] = (productFreq[o.recommendedProduct] ?? 0) + 0.5;
  }
  const topProducts = Object.entries(productFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([p, c]) => `${p} (nevnt ${Math.round(c)} ganger)`);

  const hitRate = sduTotal > 0 ? Math.round((sduOutcomes.filter(o => o.hitRecommendation).length / sduTotal) * 100) : 0;

  // Build MDU summary
  const mduStages: Record<string, number> = {};
  let mduTotalValue = 0;
  for (const d of mduDeals) {
    mduStages[d.fase] = (mduStages[d.fase] ?? 0) + 1;
    mduTotalValue += d.arsverdi ?? 0;
  }
  const warRoomApproved = mduDeals.filter(d => d.warRoom === 'approved').length;
  const warRoomRejected = mduDeals.filter(d => d.warRoom === 'rejected').length;

  const prompt = `Du er en salgsanalytiker for Telenor. Analyser følgende salgsdata fra to kanaler (SDU = dørsalg/feltsalg, MDU = borettslag/sameier) og lag en strukturert rapport.

== SDU (Feltsalg) ==
Totalt loggede besøk: ${sduTotal}
Solgt: ${sduSold} | Avvist: ${sduRejected} | NBA-treffsikkerhet: ${hitRate}%
Produkter nevnt/solgt: ${topProducts.join(', ') || 'ingen data ennå'}
Rådata (siste ${Math.min(sduOutcomes.length, 30)} utfall):
${sduOutcomes.slice(-30).map(o => `- Anbefalt: ${o.recommendedProduct} → Utfall: ${o.actualOutcome} → Solgte: ${o.actualProducts.join('/') || 'ingen'}`).join('\n') || 'Ingen SDU-data ennå.'}

== MDU (Borettslag/Sameier) ==
Totalt antall deals: ${mduDeals.length}
Estimert total årsverdi: ${mduTotalValue.toLocaleString('nb-NO')} kr
Fasefordeling: ${Object.entries(mduStages).map(([s, c]) => `${s}: ${c}`).join(', ') || 'ingen'}
War Room: ${warRoomApproved} godkjent, ${warRoomRejected} avvist
Deals:
${mduDeals.slice(0, 30).map(d => `- ${d.navn} | ${d.enheter} enh | ${d.fase} | ${d.arsverdi ? d.arsverdi.toLocaleString('nb-NO') + ' kr' : 'ukjent'}`).join('\n') || 'Ingen MDU-data ennå.'}

Analyser tverrgående mønstre mellom SDU og MDU. Svar KUN med gyldig JSON i dette formatet:
{
  "churnReasons": [
    { "reason": "...", "frequency": "høy|middels|lav", "detail": "kort forklaring" }
  ],
  "winReasons": [
    { "reason": "...", "frequency": "høy|middels|lav", "detail": "kort forklaring" }
  ],
  "productTrends": [
    { "product": "produktnavn", "trend": "voksende|stabil|synkende", "signal": "hva dataene sier" }
  ],
  "keyInsights": ["innsikt 1", "innsikt 2", "innsikt 3"],
  "recommendations": ["anbefaling 1", "anbefaling 2", "anbefaling 3"],
  "dataNote": "kort kommentar om datakvalitet og hva vi mangler"
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const json = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const report = JSON.parse(json) as InsightsReport;
    res.json(report);
  } catch (err) {
    console.error('Insights analyze error:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});
