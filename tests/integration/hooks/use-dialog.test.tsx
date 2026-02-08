import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import useDialog from '@/hook/use-dialog';

describe('Dialog State Management', () => {
  it('starts closed by default', () => {
    const { result } = renderHook(() => useDialog());

    expect(result.current.open).toBe(false);
  });

  it('respects defaultOpen prop', () => {
    const { result } = renderHook(() => useDialog({ defaultOpen: true }));

    expect(result.current.open).toBe(true);
  });

  it('uses controlled open prop when provided', () => {
    const { result } = renderHook(() => useDialog({ open: true }));

    expect(result.current.open).toBe(true);

    act(() => result.current.onOpenChange(false));
    // Controlled: open stays true since we didn't provide onOpenChange
    expect(result.current.open).toBe(true);
  });

  it('uses controlled onOpenChange when provided', () => {
    const handleChange = vi.fn();
    const { result } = renderHook(() => useDialog({ onOpenChange: handleChange }));

    act(() => result.current.onOpenChange(true));

    expect(handleChange).toHaveBeenCalledWith(true);
  });
});
