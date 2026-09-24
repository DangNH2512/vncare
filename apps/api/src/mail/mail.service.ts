import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Transporter } from 'nodemailer';

/** Injection token for the SMTP transport. */
export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

/** A message ready to send. Callers render subject and body in the recipient's locale. */
export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** `delivered: false` means the message was deliberately not sent (recipient filter). */
export interface MailResult {
  delivered: boolean;
  messageId?: string;
}

/**
 * Sends transactional email over SMTP.
 *
 * Mailpit locally, the provider's SMTP relay elsewhere; the code path is the
 * same. Addresses are personal data: they are never written to the log.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from = process.env['MAIL_FROM'] ?? 'Da Nang Connect <no-reply@danangconnect.local>';
  private readonly allowedDomains = parseDomains(process.env['MAIL_ALLOWED_DOMAINS']);

  constructor(@Inject(MAIL_TRANSPORT) private readonly transport: Transporter) {}

  async send(mail: OutgoingMail): Promise<MailResult> {
    const domain = domainOf(mail.to);
    if (this.allowedDomains && !this.allowedDomains.has(domain)) {
      // Staging guard: a copy of production data must never mail real users.
      this.logger.log(`skipped: recipient domain "${domain}" is outside MAIL_ALLOWED_DOMAINS`);
      return { delivered: false };
    }
    const info = await this.transport.sendMail({
      from: this.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      ...(mail.html === undefined ? {} : { html: mail.html }),
    });
    return { delivered: true, messageId: info.messageId };
  }
}

/** `undefined` when the filter is off; otherwise the lower-cased allow-list. */
function parseDomains(value: string | undefined): Set<string> | undefined {
  const domains = (value ?? '')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  return domains.length > 0 ? new Set(domains) : undefined;
}

function domainOf(address: string): string {
  return address.slice(address.lastIndexOf('@') + 1).trim().toLowerCase();
}
