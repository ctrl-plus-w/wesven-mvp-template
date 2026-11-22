import type { Metadata } from 'next';

import ErrorPageView from '@/module/error-page-view';

export const metadata: Metadata = { title: 'Page introuvable' };

const NotFoundPage = () => {
  return (
    <ErrorPageView
      title="Page introuvable"
      description="Cette page n'existe pas ou a été déplacée. Vérifiez l'adresse, ou repartez de l'accueil."
    />
  );
};

export default NotFoundPage;
