import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

export const sidekickRouter = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function buildSystemPrompt(mode: string, context: Record<string, unknown>): string {
  const hasContext = Object.keys(context).length > 0;
  const contextBlock = hasContext
    ? `\n\n== KONTEKST ==\n${JSON.stringify(context, null, 2)}`
    : '';

  if (mode === 'seller') {
    return `Du er en AI-sidekick for Telenor B2B-selgere som jobber med MDU-salg (borettslag og sameier).

Du hjelper selgeren med:
- Svar på spørsmål om en spesifikk deal eller borettslag
- Forslag til neste steg i salgsprosessen basert på deal-fase og historikk
- Hjelp til å skrive e-poster og meldinger til kontaktpersoner
- Objeksjonshåndtering og argumentasjon

Retningslinjer:
- Svar alltid kort, konkret og handlingsorientert på norsk
- Bruk enkelt språk uten unødvendig jargon
- Når du skriver e-postutkast: start med emnefeltet på linjen "**Emne:** ...", deretter e-postteksten
- Prioriter praktiske råd over teori${contextBlock}`;
  }

  // leder mode
  return `Du er en AI-sidekick for Telenor MDU-salgsledere.

Du hjelper lederen med:
- Oversikt over pipeline og deal-status
- Identifisere deals i risiko og prioritere oppfølging
- Analysere teamets ytelse og fremgang mot mål
- Forberede statusrapporter og presentasjoner
- Gi strategiske innspill om pipelinehelse

Retningslinjer:
- Svar alltid kort, konkret og lederorientert på norsk
- Fokuser på handlingsorientert innsikt — hva BØR lederen gjøre nå?
- Bruk tall og konkrete fakta der du har dem
- Påpek risiko og muligheter proaktivt${contextBlock}`;
}

// POST /sidekick/chat
sidekickRouter.post('/chat', async (req, res) => {
  const {
    mode,
    context,
    messages,
  } = req.body as {
    mode: 'seller' | 'leder';
    context?: Record<string, unknown>;
    messages: ChatMessage[];
  };

  if (!mode || !messages || messages.length === 0) {
    res.status(400).json({ error: 'mode and messages required' });
    return;
  }

  try {
    const systemPrompt = buildSystemPrompt(mode, context ?? {});

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    res.json({ reply });
  } catch (err) {
    console.error('Sidekick chat error:', err);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});
