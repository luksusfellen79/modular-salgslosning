const AI_BASE = (import.meta.env.VITE_AI_CORE_URL as string | undefined) ?? 'http://localhost:3000';

export type SidekickMode = 'seller' | 'leder';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithSidekick(
  mode: SidekickMode,
  context: Record<string, unknown>,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch(`${AI_BASE}/sidekick/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, context, messages }),
  });
  if (!res.ok) throw new Error(`Sidekick error: ${res.status}`);
  const data = (await res.json()) as { reply: string };
  return data.reply;
}
