import Anthropic from '@anthropic-ai/sdk';
import type { Resident } from './kasCore.js';
import type { NBAOutcome, NBARecommendation } from './types.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function getSDURecommendation(
  resident: Resident,
  neighbors: Resident[],
  recentOutcomes: NBAOutcome[]
): Promise<NBARecommendation> {

  // Summarize neighbor product ownership
  const neighborProducts: Record<string, number> = {};
  for (const n of neighbors) {
    for (const p of n.existingProducts) {
      neighborProducts[p] = (neighborProducts[p] ?? 0) + 1;
    }
  }
  const neighborSummary = Object.entries(neighborProducts)
    .sort((a, b) => b[1] - a[1])
    .map(([p, count]) => `${count}/${neighbors.length} naboer har "${p}"`)
    .join(', ') || 'Ingen nabodata tilgjengelig';

  // Summarize recent outcomes in same building (learning signal)
  const outcomeSummary = recentOutcomes.length > 0
    ? recentOutcomes
        .map(o => `- Anbefalt: ${o.recommendedProduct}, faktisk solgt: ${o.actualProducts.join(', ') || 'ingenting'}, treff: ${o.hitRecommendation ? 'ja' : 'nei'}`)
        .join('\n')
    : 'Ingen tidligere utfall i dette bygget ennå.';

  const prompt = `Du er et Next Best Action-system for Telenor-selgere som jobber med dør-til-dør-salg.

Analyser all tilgjengelig data om denne beboeren og anbefal det ÉNKELTE beste produktet/pakken å tilby.

== BEBOER ==
Navn: ${resident.name}
Leilighet: ${resident.unitNumber}, etasje ${resident.floor}
Eksisterende kunde: ${resident.isExistingCustomer ? 'Ja' : 'Nei'}
Aktive produkter: ${resident.existingProducts.join(', ') || 'ingen'}
Tidligere produkter: ${resident.previousProducts.join(', ') || 'ingen'}
Avslutningsgrunn: ${resident.cancelReason ?? 'ikke oppgitt'}
Kunde siden: ${resident.customerSince ?? 'ukjent'}

== INTERESSESCORE (0-100) ==
Internett: ${resident.interestScores.internett}
Mobil: ${resident.interestScores.mobil}
Sikre: ${resident.interestScores.sikre}
Produkt X: ${resident.interestScores.produktX}

== TILGJENGELIGE KAMPANJER ==
${resident.campaigns.map(c => `- ${c.name}: ${c.product} til ${c.price} — "${c.pitch}"`).join('\n')}

== TILLEGGSPRODUKTER ==
${resident.upsellProducts.map(p => `- ${p.name}: +${p.price} kr/md`).join('\n')}

== NABOER I SAMME BYGG (${neighbors.length} stk) ==
${neighborSummary}

== TIDLIGERE UTFALL I DETTE BYGGET (læringssignal) ==
${outcomeSummary}

Svar KUN med gyldig JSON i dette formatet (ingen tekst rundt):
{
  "product": "navn på hovedproduktet",
  "campaign": "navn på kampanjen",
  "extras": ["tilleggsprodukt 1"],
  "headline": "kort pitch-overskrift maks 8 ord på norsk",
  "reason": "selger-vendt forklaring på 2 setninger på norsk — hvorfor akkurat dette til akkurat denne kunden",
  "confidence": "high | medium | low"
}`;

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  // Strip any markdown code fences
  const json = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(json) as NBARecommendation;
}
