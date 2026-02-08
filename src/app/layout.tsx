import type { Metadata } from 'next';

import type { ReactNode } from 'react';

import '@/style/globals.css';

import { Inter } from 'next/font/google';

import { Toaster } from '@/element/sonner';

import ToastProvider from '@/context/toast-context';

import PostHogProvider from '@/wrapper/posthog-provider';

import { cn } from '@/utils/style';
import QueryClientWrapper from '@/wrappers/query-client';

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

interface IProps {
  children?: ReactNode;
}

const RootLayout = ({ children }: IProps) => {
  return (
    <html lang="en">
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
        <ToastProvider>
          <PostHogProvider>
            <QueryClientWrapper>{children}</QueryClientWrapper>
          </PostHogProvider>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
};

export default RootLayout;
