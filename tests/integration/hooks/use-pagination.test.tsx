import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import usePagination from '@/hook/use-pagination';

import PAGINATION from '@/constant/pagination';

describe('Pagination State Management', () => {
  it('uses PAGINATION.pageIndex and PAGINATION.pageSize as defaults', () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.pageIndex).toBe(PAGINATION.pageIndex);
    expect(result.current.pageSize).toBe(PAGINATION.pageSize);
  });

  it('accepts custom defaults', () => {
    const { result } = renderHook(() => usePagination({ defaultPageIndex: 2, defaultPageSize: 25, defaultTotal: 100 }));

    expect(result.current.pageIndex).toBe(2);
    expect(result.current.pageSize).toBe(25);
    expect(result.current.total).toBe(100);
  });

  it('calculates maxPage as ceil(total / pageSize)', () => {
    const { result } = renderHook(() => usePagination({ defaultTotal: 47, defaultPageSize: 10 }));

    expect(result.current.maxPage).toBe(5);
  });

  it('returns 0 maxPage when total is 0', () => {
    const { result } = renderHook(() => usePagination({ defaultTotal: 0, defaultPageSize: 10 }));

    expect(result.current.maxPage).toBe(0);
  });

  it('updates total via setTotal', () => {
    const { result } = renderHook(() => usePagination({ defaultPageSize: 10 }));

    act(() => result.current.setTotal(50));

    expect(result.current.total).toBe(50);
    expect(result.current.maxPage).toBe(5);
  });

  it('exposes query object with pageIndex and pageSize', () => {
    const { result } = renderHook(() => usePagination({ defaultPageIndex: 3, defaultPageSize: 20 }));

    expect(result.current.query).toEqual({ pageIndex: 3, pageSize: 20 });
  });
});
