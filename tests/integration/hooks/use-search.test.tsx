import type { ChangeEvent } from 'react';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import useSearch from '@/hook/use-search';

describe('Search State Management', () => {
  it('starts with empty query and value', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.query).toBe('');
    expect(result.current.value).toBe('');
  });

  it('submit sets query to current value', () => {
    const { result } = renderHook(() => useSearch());

    act(() => result.current.setValue('hello'));
    act(() => result.current.submit());

    expect(result.current.query).toBe('hello');
  });

  it('clear resets both query and value', () => {
    const { result } = renderHook(() => useSearch());

    act(() => result.current.setValue('search term'));
    act(() => result.current.submit());
    act(() => result.current.clear());

    expect(result.current.query).toBe('');
    expect(result.current.value).toBe('');
  });

  it('onChange updates value from input event', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.onChange({ target: { value: 'typed' } } as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe('typed');
  });

  it('accepts default search string', () => {
    const { result } = renderHook(() => useSearch('initial'));

    expect(result.current.query).toBe('initial');
  });

  it('does not update query on value change alone', () => {
    const { result } = renderHook(() => useSearch());

    act(() => result.current.setValue('new value'));

    expect(result.current.query).toBe('');
    expect(result.current.value).toBe('new value');
  });
});
