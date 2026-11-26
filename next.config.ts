import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import type { NextConfig } from 'next';

import { withPostHogConfig } from '@posthog/nextjs-config';

import type { NextConfigFunction } from '@/type/next-config';

const nextConfig: NextConfig = {
  // The E2E runner builds and serves the app with NODE_ENV=test: its own output keeps it off the dev server's `.next`.
  distDir: process.env.NODE_ENV === 'test' ? '.next-test' : undefined,
  // CLAUDE.md is hand-maintained: stop `next dev` from writing its agent-rules block into it.
  agentRules: false,
};

// Browser source maps are built, uploaded to PostHog error tracking and deleted from the output only on a build that
// has both settings (set in Vercel by `pnpm deploy:setup`). Without them the build is a plain `next build`.
const sourceMapsEnabled = Boolean(process.env.POSTHOG_SOURCEMAPS_API_KEY && process.env.POSTHOG_PROJECT_ID);

// Built only when used: PostHog warns when the config it returns is never called.
const withSourceMaps = () =>
  withPostHogConfig(nextConfig, {
    personalApiKey: process.env.POSTHOG_SOURCEMAPS_API_KEY ?? '',
    projectId: process.env.POSTHOG_PROJECT_ID,
    host: process.env.POSTHOG_APP_HOST || 'https://us.posthog.com',
    sourcemaps: {
      enabled: true,
      // Vercel builds from an upload, without `.git`: CI passes the commit it tested.
      releaseName: process.env.npm_package_name,
      releaseVersion: process.env.POSTHOG_RELEASE_VERSION || process.env.VERCEL_GIT_COMMIT_SHA,
      deleteAfterUpload: true,
    },
  });

/**
 * Whether a config is the function form. `withPostHogConfig` returns one, though its type says a plain config.
 * @param value The config
 */
const isConfigFunction = (value: unknown): value is NextConfigFunction => typeof value === 'function';

/**
 * Deletes every source map of a build, so none is served.
 * @param distDir The build output folder
 */
const deleteSourceMaps = async (distDir: string) => {
  const files = await readdir(distDir, { recursive: true });
  await Promise.all(files.filter((file) => file.endsWith('.map')).map((file) => rm(path.join(distDir, file))));
};

/**
 * The config Next.js loads. PostHog never fails the build: when it cannot be reached, the build goes on without source
 * maps, and maps that did not upload are deleted instead of served.
 * @param phase The Next.js phase
 * @param context The default config Next.js passes
 */
const config: NextConfigFunction = async (phase, context) => {
  if (!sourceMapsEnabled) return nextConfig;

  const loadPostHogConfig = withSourceMaps();
  if (!isConfigFunction(loadPostHogConfig)) return loadPostHogConfig;

  const posthogConfig: NextConfig = await loadPostHogConfig(phase, context).catch((error: unknown) => {
    console.warn('PostHog is unreachable: building without source maps.', error);
    return nextConfig;
  });
  const upload = posthogConfig.compiler?.runAfterProductionCompile;
  if (!upload) return posthogConfig;

  return {
    ...posthogConfig,
    compiler: {
      ...posthogConfig.compiler,
      runAfterProductionCompile: async (metadata) => {
        try {
          await upload(metadata);
        } catch (error) {
          console.warn('The source map upload to PostHog failed: deleting the maps instead.', error);
          await deleteSourceMaps(metadata.distDir);
        }
      },
    },
  };
};

export default config;
