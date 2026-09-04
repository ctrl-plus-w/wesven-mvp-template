import type { ReactNode } from 'react';

import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

interface FormCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * A titled card wrapping one settings form. Same role as AuthCard, for the
 * signed-in side of the app: the frame is shared so the forms only carry their
 * own fields.
 */
const FormCard = ({ title, description, children }: FormCardProps) => {
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2}>{title}</Heading>
          <Text color="secondary" size="sm">
            {description}
          </Text>
        </VStack>

        {children}
      </VStack>
    </Card>
  );
};

export default FormCard;
