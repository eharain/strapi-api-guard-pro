import { useState, useCallback, useMemo } from 'react';

export const usePagination = (totalItems = 0, pageSize = 20) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / pageSize)), [totalItems, pageSize]);

  const goToPage = useCallback((page) => {
    const targetPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(targetPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const getPagedItems = useCallback((items) => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [currentPage, pageSize]);

  return {
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    getPagedItems
  };
};
