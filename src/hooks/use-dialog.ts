'use client';

import { type Dispatch, type SetStateAction, useState } from 'react';

export interface UseDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: Dispatch<SetStateAction<boolean>>;
}

/**
 * Hook for managing dialog open/close state
 * @param props - Optional configuration for controlled or default open state
 */
const useDialog = (props?: UseDialogProps) => {
  const [open, setOpen] = useState(props?.defaultOpen ?? props?.open ?? false);

  return {
    open: props?.open ?? open,
    onOpenChange: props?.onOpenChange ?? setOpen,
  };
};

export default useDialog;
