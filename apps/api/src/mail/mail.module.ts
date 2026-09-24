import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { MAIL_TRANSPORT, MailService } from './mail.service.js';

/**
 * Outbound email for every module (verification, password reset, RSVP mail).
 *
 * Defaults to the Mailpit container on localhost:1025, which accepts anything
 * without auth and shows it at http://localhost:8025. Production refuses to
 * boot without SMTP_HOST rather than silently sending nowhere.
 */
@Global()
@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      useFactory: (): Transporter => {
        const host = process.env['SMTP_HOST'];
        if (!host && process.env['NODE_ENV'] === 'production') {
          throw new Error('SMTP_HOST is not configured');
        }
        const port = Number(process.env['SMTP_PORT'] ?? 1025);
        const user = process.env['SMTP_USER'];
        return createTransport({
          host: host ?? 'localhost',
          port,
          // Implicit TLS on 465; every other port upgrades with STARTTLS when offered.
          secure: port === 465,
          ...(user ? { auth: { user, pass: process.env['SMTP_PASSWORD'] ?? '' } } : {}),
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule implements OnApplicationShutdown {
  constructor(@Inject(MAIL_TRANSPORT) private readonly transport: Transporter) {}

  onApplicationShutdown(): void {
    this.transport.close();
  }
}
