'use client';

import NextLink from 'next/link';

import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Code } from '@astryxdesign/core/Code';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack } from '@astryxdesign/core/HStack';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

interface ErrorPageViewProps {
  title: string;
  description: string;
  /** Next's id for a server error: it is what the server log names, so support can find the stack trace. */
  digest?: string;
  /** Shown as the primary action when the error may not happen again (a render error, not a missing page). */
  onRetry?: VoidFunction;
}

/**
 * The full-page frame of `not-found.tsx`, `error.tsx` and `global-error.tsx`: what failed, then what to press.
 * Never the error's message or stack — they can carry internals — only the digest the server log is keyed by.
 */
const ErrorPageView = ({ title, description, digest, onRetry }: ErrorPageViewProps) => {
  return (
    <Center height="100dvh" padding={4}>
      <VStack gap={2} align="center">
        <EmptyState
          headingLevel={1}
          title={title}
          description={description}
          actions={
            <HStack gap={3} align="center">
              {onRetry ? <Button label="Réessayer" variant="primary" onClick={onRetry} /> : null}
              <Link as={NextLink} href="/">
                Retour à l'accueil
              </Link>
            </HStack>
          }
        />

        {digest ? (
          <Text color="secondary" size="sm">
            Référence : <Code>{digest}</Code>
          </Text>
        ) : null}
      </VStack>
    </Center>
  );
};

export default ErrorPageView;
