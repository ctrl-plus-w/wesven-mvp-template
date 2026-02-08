import { type Dispatch, type SetStateAction, useMemo, useState } from 'react';

import PAGINATION from '@/constant/pagination';

import type { PaginationQuery } from '@/type/react-query';

export interface UsePaginationDefaultParams {
  defaultPageIndex?: number;
  defaultPageSize?: number;
  defaultTotal?: number;
}

export interface UsePaginationParams {
  pageIndex: number;
  setPageIndex: Dispatch<SetStateAction<number>>;
  total: number;
  setTotal: Dispatch<SetStateAction<number>>;
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
  maxPage: number;

  query: PaginationQuery;
}

/**
 * Hook for managing pagination state including page index, size, and total count
 * @param params - Optional default values for page index, page size, and total count
 */
const usePagination = (params?: UsePaginationDefaultParams): UsePaginationParams => {
  const [pageIndex, setPageIndex] = useState(params?.defaultPageIndex ?? PAGINATION.pageIndex);
  const [pageSize, setPageSize] = useState(params?.defaultPageSize ?? PAGINATION.pageSize);
  const [total, setTotal] = useState(params?.defaultTotal ?? 0);

  const maxPage = useMemo(() => Math.ceil(total / pageSize), [total, pageSize]);

  return {
    total,
    setTotal,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    maxPage,
    query: {
      pageIndex,
      pageSize,
    },
  };
};

export default usePagination;
