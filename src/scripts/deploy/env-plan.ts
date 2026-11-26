import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import type { z } from '@/instance/zod';

import { EnvSchema } from '@/util/schemas/env';
import { EnvPublicSchema } from '@/util/schemas/env-public';

import DEPLOY from '@/constant/deploy';

import type { VercelEnvList } from '@/type/deploy';

const SCHEMA_SHAPE: Record<string, z.ZodType> = { ...EnvSchema.shape, ...EnvPublicSchema.shape };

const SECRET_NAME = /SECRET|KEY|TOKEN|PASSWORD/;
const LOCAL_VALUE = /localhost|127\.0\.0\.1|REPLACE_ME/;

/**
 * Reads a dotenv file, or nothing when it is missing.
 * @param path The file path
 */
const readDotenv = (path: string): Record<string, string> => {
  if (!existsSync(path)) return {};
  return Object.fromEntries(Object.entries(parseEnv(readFileSync(path, 'utf8'))));
};

/** Every key the app reads, server and browser. */
export const getSchemaKeys = () => Object.keys(SCHEMA_SHAPE);

/** The keys production must hold for the app to start: the schemas' required keys, minus those Vercel derives. */
export const getRequiredKeys = () =>
  getSchemaKeys().filter((key) => !DEPLOY.DERIVED.includes(key) && !SCHEMA_SHAPE[key].safeParse(undefined).success);

/**
 * Whether a key's value must be typed hidden and never echoed.
 * @param key The variable name
 */
export const isSecretKey = (key: string) => SECRET_NAME.test(key);

/**
 * Whether the app starts without the key.
 * @param key The variable name
 */
export const isOptionalKey = (key: string) => SCHEMA_SHAPE[key].safeParse(undefined).success;

/**
 * The schema's message for an invalid value, or undefined when it is valid.
 * @param key The variable name
 * @param value The value to check
 */
export const validateValue = (key: string, value: string | undefined) => {
  const result = SCHEMA_SHAPE[key].safeParse(value || undefined);
  return result.success ? undefined : result.error.issues[0]?.message;
};

/** A new random production secret (32 bytes, 44 base64 characters). */
export const generateSecret = () => randomBytes(32).toString('base64');

/**
 * Splits the keys production lacks by where their value comes from: generated, the shell, `.env`, or nothing (asked
 * for). A shell or `.env` value counts only when it is real: not the `.env.example` placeholder, not a local address,
 * and valid for the schema.
 * @param missingKeys The schema keys not yet set in production
 */
export const planMissingKeys = (missingKeys: string[]) => {
  const dotenv = readDotenv('.env');
  const example = readDotenv('.env.example');

  const isUsable = (key: string, value: string | undefined): value is string =>
    !!value && value !== example[key] && !LOCAL_VALUE.test(value) && !validateValue(key, value);

  const generated = missingKeys.filter((key) => DEPLOY.GENERATED.includes(key));
  const rest = missingKeys.filter((key) => !DEPLOY.GENERATED.includes(key) && !(key in DEPLOY.PROVIDED));

  const fromShell = rest.filter((key) => isUsable(key, process.env[key]));
  const fromDotenv = rest.filter((key) => !fromShell.includes(key) && isUsable(key, dotenv[key]));
  const toAsk = rest.filter((key) => !fromShell.includes(key) && !fromDotenv.includes(key));

  return {
    generated,
    fromShell: Object.fromEntries(fromShell.map((key) => [key, process.env[key] ?? ''])),
    fromDotenv: Object.fromEntries(fromDotenv.map((key) => [key, dotenv[key]])),
    toAsk,
  };
};

/**
 * The names of the Production variables in a Vercel env listing.
 * @param list The answer of `GET /v10/projects/:id/env`
 */
export const productionKeysOf = ({ envs }: VercelEnvList) =>
  envs.filter(({ target }) => [target ?? []].flat().includes('production')).map(({ key }) => key);

/**
 * The production keys a deploy needs that the Vercel project lacks.
 * @param productionKeys The names of the project's production variables
 */
export const findMissingProductionKeys = (productionKeys: string[]) =>
  [...getRequiredKeys(), ...Object.keys(DEPLOY.BUILD)].filter((key) => !productionKeys.includes(key));
