import nextEnv from '@next/env';

/** Loads the `.env*` files the way Next.js does, for code that runs outside Next.js (drizzle-kit, the env module). */
export const loadEnv = () => {
  const pwd = process.cwd();

  // @next/env doesn't support ESM module: https://github.com/vercel/next.js/issues/68091
  if (nextEnv && 'loadEnvConfig' in nextEnv) nextEnv.loadEnvConfig(pwd);
  else require('@next/env').loadEnvConfig(pwd);
};
