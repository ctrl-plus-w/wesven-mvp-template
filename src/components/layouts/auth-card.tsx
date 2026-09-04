import type { ReactNode } from 'react';

import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

interface AuthCardProps {
  title: string;
  description: string;
  /** Rendered centred under the form — typically the link to the other flow. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The card every unauthenticated page sits in.
 *
 * The four auth pages differ only in their copy and their fields, so the frame
 * lives here: one place to change the width, the heading level or the spacing,
 * rather than four that drift apart.
 */
const AuthCard = ({ title, description, footer, children }: AuthCardProps) => {
  return (
    <Card width="100%" maxWidth={448} padding={5}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={1} type="display-3">
            {title}
          </Heading>
          <Text color="secondary" size="sm">
            {description}
          </Text>
        </VStack>

        {children}

        {footer ? (
          <Text color="secondary" size="sm" justify="center">
            {footer}
          </Text>
        ) : null}
      </VStack>
    </Card>
  );
};

export default AuthCard;
