import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The E2E runner builds and serves the app with NODE_ENV=test: its own output keeps it off the dev server's `.next`.
  distDir: process.env.NODE_ENV === 'test' ? '.next-test' : undefined,
  // CLAUDE.md is hand-maintained: stop `next dev` from writing its agent-rules block into it.
  agentRules: false,
  // Emitted only when CI can upload them to PostHog; CI deletes every map before the bundle ships.
  productionBrowserSourceMaps: process.env.BROWSER_SOURCE_MAPS === 'true',
};

export default nextConfig;
