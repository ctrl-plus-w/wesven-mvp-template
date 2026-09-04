'use client';

import type { PropsWithChildren } from 'react';

import { ToastViewport } from '@astryxdesign/core/Toast';
import { Theme } from '@astryxdesign/core/theme';

import { neutralTheme } from '@/instance/astryx/theme';

/**
 * Applies the Astryx theme and mounts the toast viewport.
 *
 * `Theme` is a client component — it uses `useInsertionEffect` to inject the
 * theme's scoped CSS and syncs `data-theme` / `data-astryx-theme` onto
 * `<html>`. Children arrive as a prop, so wrapping the tree here does *not*
 * pull the pages into the client bundle: server components passed through
 * `children` keep rendering on the server.
 *
 * `mode="system"` follows the OS preference. It is also the only mode that
 * needs no `data-theme` on the server-rendered `<html>`: the reset resolves an
 * absent attribute to `color-scheme: light dark`, so there is nothing for the
 * client to correct on hydration and no flash of the wrong theme. Pinning the
 * mode to 'light' or 'dark' means setting the matching `data-theme` in the
 * root layout too.
 */
const AstryxProvider = ({ children }: PropsWithChildren) => {
  return (
    <Theme theme={neutralTheme} mode="system">
      <ToastViewport position="bottomEnd">{children}</ToastViewport>
    </Theme>
  );
};

export default AstryxProvider;
