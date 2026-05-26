// ── E-postvarsler (disabled som default) ──
import { logger } from '../logger';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? 'disabled';
  if (provider === 'disabled') {
    logger.info({ message: 'Email skipped (EMAIL_PROVIDER=disabled)', to: message.to, subject: message.subject });
    return;
  }

  if (provider === 'sendgrid') {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      logger.warn({ message: 'SENDGRID_API_KEY missing' });
      return;
    }
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: process.env.EMAIL_FROM ?? 'noreply@telenor.no' },
        subject: message.subject,
        content: [{ type: 'text/plain', value: message.body }],
      }),
    });
    if (!res.ok) {
      logger.warn({ message: 'SendGrid failed', status: res.status });
    }
    return;
  }

  if (provider === 'smtp') {
    logger.info({ message: 'SMTP not implemented in prototype — log only', to: message.to, subject: message.subject });
    return;
  }

  logger.warn({ message: 'Unknown EMAIL_PROVIDER', provider });
}
