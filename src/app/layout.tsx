import type { Metadata } from 'next';

import type { ReactNode } from 'react';

import '@/style/globals.css';

import { Inter } from 'next/font/google';

import AstryxProvider from '@/wrapper/astryx-provider';
import PostHogProvider from '@/wrapper/posthog-provider';
import QueryClientWrapper from '@/wrapper/query-client';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    template: '%s - <PROJECT_NAME>',
    default: '<PROJECT_NAME>',
  },
};

interface RootLayoutProps {
  children?: ReactNode;
}

/**
 * No `data-theme` on `<html>`: the theme runs in `system` mode, which the
 * reset already resolves to `color-scheme: light dark`. See AstryxProvider.
 */
const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AstryxProvider>
          <PostHogProvider>
            <QueryClientWrapper>{children}</QueryClientWrapper>
          </PostHogProvider>
        </AstryxProvider>
      </body>
    </html>
  );
};

export default RootLayout;
