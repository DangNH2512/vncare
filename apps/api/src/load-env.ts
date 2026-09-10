/**
 * Loads `apps/api/.env` into `process.env` before anything reads it.
 *
 * Imported for its side effect as the very first import of every entry point,
 * because ESM evaluates imports in order and the modules below read
 * configuration at construction time. Values already present in the
 * environment win: a variable set on the command line or by the deploy
 * pipeline must not be overwritten by a developer's local file.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const envFile = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env');

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
