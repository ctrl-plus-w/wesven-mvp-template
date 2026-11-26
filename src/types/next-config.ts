import type { NextConfig } from 'next';

/** The function form of `next.config.ts`, which Next.js calls once per phase. */
export type NextConfigFunction = (phase: string, context: { defaultConfig: NextConfig }) => Promise<NextConfig>;
