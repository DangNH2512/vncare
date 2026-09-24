import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MailService } from '../../../src/mail/mail.service.js';
import { createTestApp } from '../../support/harness.js';

/** Mailpit's HTTP API, from the local compose stack. */
const MAILPIT = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';

interface MailpitSearch {
  messages: { Subject: string; To: { Address: string }[] }[];
}

/** Polls Mailpit until a message for `address` shows up, or gives up after ~3 s. */
async function findDelivered(address: string): Promise<MailpitSearch['messages']> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`);
    const body = (await res.json()) as MailpitSearch;
    if (body.messages.length > 0) {
      return body.messages;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return [];
}

/** A service over a fake transport, built after the allow-list is set. */
function serviceWith(domains: string) {
  process.env['MAIL_ALLOWED_DOMAINS'] = domains;
  const sendMail = vi.fn().mockResolvedValue({ messageId: '<fake@local>' });
  const service = new MailService({ sendMail } as unknown as Transporter);
  return { service, sendMail };
}

describe('mail module', () => {
  describe('over SMTP to Mailpit', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createTestApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('delivers a message the inbox can read back', async () => {
      const to = `mail_${randomUUID().slice(0, 8)}@example.test`;
      const subject = `Verify your email ${randomUUID().slice(0, 8)}`;

      const result = await app.get(MailService).send({ to, subject, text: 'Your code is 123456' });

      expect(result.delivered).toBe(true);
      expect(result.messageId).toBeTruthy();
      const messages = await findDelivered(to);
      expect(messages).toHaveLength(1);
      expect(messages[0]?.Subject).toBe(subject);
    });
  });

  describe('recipient allow-list (staging)', () => {
    const original = process.env['MAIL_ALLOWED_DOMAINS'];

    afterAll(() => {
      if (original === undefined) {
        delete process.env['MAIL_ALLOWED_DOMAINS'];
      } else {
        process.env['MAIL_ALLOWED_DOMAINS'] = original;
      }
    });

    it('skips a recipient outside the listed domains without sending', async () => {
      const { service, sendMail } = serviceWith('danangconnect.vn, Example.org');

      const result = await service.send({ to: 'someone@gmail.com', subject: 's', text: 't' });

      expect(result).toEqual({ delivered: false });
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('sends to a listed domain, compared case-insensitively', async () => {
      const { service, sendMail } = serviceWith('danangconnect.vn, Example.org');

      const result = await service.send({ to: 'Tester@EXAMPLE.org', subject: 's', text: 't' });

      expect(result).toEqual({ delivered: true, messageId: '<fake@local>' });
      expect(sendMail).toHaveBeenCalledOnce();
    });
  });
});
