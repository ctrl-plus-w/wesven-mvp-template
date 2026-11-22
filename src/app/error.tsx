'use client';

import ErrorPageView from '@/module/error-page-view';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: VoidFunction;
}

/** A page or layout below the root threw while rendering; the root layout, and so the theme, are still mounted. */
const ErrorPage = ({ error, reset }: ErrorPageProps) => {
  return (
    <ErrorPageView
      title="Une erreur est survenue"
      description="Cette page n'a pas pu s'afficher. L'erreur a été signalée ; réessayez, ou repartez de l'accueil."
      digest={error.digest}
      onRetry={reset}
    />
  );
};

export default ErrorPage;
