import type { ComponentProps } from 'react';

import { cn } from '@/util/style';

export interface RequiredMarkProps extends Omit<ComponentProps<'span'>, 'children'> {}

const RequiredMark = ({ className, ...props }: RequiredMarkProps) => {
  return (
    <span className={cn('text-destructive', className)} {...props}>
      *
    </span>
  );
};

export default RequiredMark;
