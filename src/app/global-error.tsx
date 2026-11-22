'use client';

import '@/style/globals.css';

import ErrorPageView from '@/module/error-page-view';

import AstryxProvider from '@/wrapper/astryx-provider';

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  reset: VoidFunction;
}

/** The root layout itself threw: this replaces it, so it renders its own `<html>`, styles and theme. */
const GlobalErrorPage = ({ error, reset }: GlobalErrorPageProps) => {
  return (
    <html lang="fr">
      <body>
        <AstryxProvider>
          <ErrorPageView
            title="Une erreur est survenue"
            description="L'application n'a pas pu démarrer. L'erreur a été signalée ; réessayez dans un instant."
            digest={error.digest}
            onRetry={reset}
          />
        </AstryxProvider>
      </body>
    </html>
  );
};

export default GlobalErrorPage;
