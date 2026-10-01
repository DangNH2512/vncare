import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Logger, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../src/modules/auth/auth.service.js';
import { createTestApp, seedArea, trackActor } from '../../support/harness.js';

const LEVELS = ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'] as const;
type Level = (typeof LEVELS)[number];

const PEM_MARKER = /BEGIN (PRIVATE|PUBLIC) KEY/;
const LONG_BASE64 = /[A-Za-z0-9+/=]{64,}/;

/** Everything that left the process through a logger, stdout, stderr or console. */
interface Capture {
  lines: { level: Level | 'stream'; text: string }[];
  restore: () => void;
}

function captureOutput(): Capture {
  const lines: Capture['lines'] = [];
  const collector = Object.fromEntries(
    LEVELS.map((level) => [
      level,
      (message: unknown, ...rest: unknown[]) =>
        lines.push({ level, text: [message, ...rest].map(String).join(' ') }),
    ]),
  ) as unknown as Parameters<typeof Logger.overrideLogger>[0];
  Logger.overrideLogger(collector);

  const spies = [
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      lines.push({ level: 'stream', text: String(chunk) });
      return true;
    }),
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      lines.push({ level: 'stream', text: String(chunk) });
      return true;
    }),
    ...(['log', 'info', 'warn', 'error', 'debug'] as const).map((name) =>
      vi.spyOn(console, name).mockImplementation((...args: unknown[]) => {
        lines.push({ level: 'stream', text: args.map(String).join(' ') });
      }),
    ),
  ];
  return {
    lines,
    restore: () => {
      for (const spy of spies) spy.mockRestore();
      Logger.overrideLogger(true);
    },
  };
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

describe('JWT key handling', () => {
  let app: INestApplication;
  let auth: AuthService;
  let cleanup: () => Promise<void>;
  const savedEnv = { ...process.env };

  beforeAll(async () => {
    ({ cleanup } = await seedArea());
    app = await createTestApp();
    auth = app.get(AuthService);
  });

  beforeEach(() => {
    delete process.env['JWT_PRIVATE_KEY'];
    delete process.env['JWT_PUBLIC_KEY'];
    process.env['NODE_ENV'] = savedEnv['NODE_ENV'] ?? 'test';
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  afterAll(async () => {
    await app.close();
    await cleanup();
  });

  it('logs one warning and no key material for an ephemeral pair, and still signs verifiable tokens', async () => {
    const capture = captureOutput();
    try {
      await auth.onModuleInit();
    } finally {
      capture.restore();
    }

    const warnings = capture.lines.filter((line) => line.level === 'warn');
    expect(warnings).toHaveLength(1);
    for (const line of capture.lines) {
      expect(line.text).not.toMatch(PEM_MARKER);
      expect(line.text).not.toMatch(LONG_BASE64);
    }

    const email = `e2e_${randomUUID().replaceAll('-', '').slice(0, 12)}@example.test`;
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'a-sufficiently-long-passphrase',
        displayName: 'Key Logging',
        handle: `k_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
      })
      .expect(201);
    trackActor(registered.body.data.user.id as string);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set({ authorization: `Bearer ${registered.body.data.accessToken as string}` })
      .expect(200);
  });

  it('is silent when a valid configured pair is present', async () => {
    const { generateKeyPairSync } = await import('node:crypto');
    const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env['JWT_PRIVATE_KEY'] = pair.privateKey
      .export({ type: 'pkcs8', format: 'pem' })
      .toString();
    process.env['JWT_PUBLIC_KEY'] = pair.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString();

    const capture = captureOutput();
    try {
      await auth.onModuleInit();
    } finally {
      capture.restore();
    }
    expect(capture.lines).toEqual([]);
  });

  it('refuses to start in production without keys and names only the variables', async () => {
    process.env['NODE_ENV'] = 'production';
    const error = await auth.onModuleInit().then(
      () => undefined,
      (caught: unknown) => caught as Error,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toContain('JWT_PRIVATE_KEY');
    expect(error?.message).toContain('JWT_PUBLIC_KEY');
  });

  it('reports a malformed private key by variable name without echoing the value', async () => {
    const secret = 'not-a-pem-SECRETVALUE-0123456789';
    process.env['JWT_PRIVATE_KEY'] = secret;
    process.env['JWT_PUBLIC_KEY'] = 'irrelevant-public-value';

    const error = await auth.onModuleInit().then(
      () => undefined,
      (caught: unknown) => caught as Error,
    );
    expect(error?.message).toContain('JWT_PRIVATE_KEY');
    expect(error?.message).not.toContain(secret);
    expect(error?.cause).toBeUndefined();
  });

  it('reports a malformed public key by variable name without echoing the value', async () => {
    const { generateKeyPairSync } = await import('node:crypto');
    const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env['JWT_PRIVATE_KEY'] = pair.privateKey
      .export({ type: 'pkcs8', format: 'pem' })
      .toString();
    const secret = 'bad-public-SECRETVALUE-0123456789';
    process.env['JWT_PUBLIC_KEY'] = secret;

    const error = await auth.onModuleInit().then(
      () => undefined,
      (caught: unknown) => caught as Error,
    );
    expect(error?.message).toContain('JWT_PUBLIC_KEY');
    expect(error?.message).not.toContain(secret);
    expect(error?.cause).toBeUndefined();
  });

  it('keeps key export and extractable keys out of the source tree', () => {
    const root = fileURLToPath(new URL('../../../src', import.meta.url));
    const banned = ['exportPKCS8', 'exportSPKI', 'extractable: true'];
    const offenders = sourceFiles(root).filter((file) => {
      const text = readFileSync(file, 'utf8');
      return banned.some((needle) => text.includes(needle));
    });
    expect(offenders).toEqual([]);
  });
});
