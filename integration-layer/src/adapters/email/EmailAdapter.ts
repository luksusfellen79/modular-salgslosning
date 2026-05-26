// ── EmailAdapter — sentral e-posttjeneste for alle moduler ──
// EMAIL_PROVIDER=disabled (default) | sendgrid | smtp
// Konsumenter kaller POST /adapters/email/send — aldri SendGrid/SMTP direkte.

import { randomUUID } from 'crypto';
import { IEmailAdapter, EmailMessage, EmailProvider, EmailSendResult } from '../IAdapter.js';
import { DataSource } from '../../types/domain.js';
import { logger } from '../../logger.js';

const SOURCE: DataSource = 'email-adapter';

function resolveProvider(): EmailProvider {
  const raw = (process.env.EMAIL_PROVIDER ?? 'disabled').toLowerCase();
  if (raw === 'sendgrid' || raw === 'smtp') return raw;
  return 'disabled';
}

export class EmailAdapter implements IEmailAdapter {
  readonly sourceId = SOURCE;
  readonly name = 'EmailAdapter';
  readonly provider: EmailProvider;

  constructor() {
    this.provider = resolveProvider();
  }

  async isHealthy(): Promise<boolean> {
    if (this.provider === 'disabled') return true;
    if (this.provider === 'sendgrid') return Boolean(process.env.SENDGRID_API_KEY);
    if (this.provider === 'smtp') return Boolean(process.env.SMTP_HOST);
    return false;
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    if (this.provider === 'disabled') {
      logger.info('Email skipped (EMAIL_PROVIDER=disabled)', {
        to: message.to,
        subject: message.subject,
      });
      return { sent: false, provider: 'disabled', skipped: true };
    }

    if (this.provider === 'sendgrid') {
      return this.sendViaSendGrid(message);
    }

    if (this.provider === 'smtp') {
      return this.sendViaSmtp(message);
    }

    logger.warn('Unknown EMAIL_PROVIDER', { provider: this.provider });
    return { sent: false, provider: this.provider, skipped: true };
  }

  private async sendViaSendGrid(message: EmailMessage): Promise<EmailSendResult> {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      logger.warn('SENDGRID_API_KEY missing');
      return { sent: false, provider: 'sendgrid', skipped: true };
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
        content: [
          { type: 'text/plain', value: message.body },
          ...(message.html ? [{ type: 'text/html', value: message.html }] : []),
        ],
      }),
    });

    if (!res.ok) {
      logger.warn('SendGrid send failed', { status: res.status, to: message.to });
      return { sent: false, provider: 'sendgrid' };
    }

    const messageId = res.headers.get('x-message-id') ?? randomUUID();
    return { sent: true, provider: 'sendgrid', messageId };
  }

  private async sendViaSmtp(message: EmailMessage): Promise<EmailSendResult> {
    // SMTP er ikke konfigurert i prototypen — logg og returner skipped
    logger.info('SMTP not implemented in prototype — log only', {
      host: process.env.SMTP_HOST,
      to: message.to,
      subject: message.subject,
    });
    return { sent: false, provider: 'smtp', skipped: true };
  }
}
