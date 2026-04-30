import { useState, useCallback } from 'react';

export const useFilters = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const clearFilter = useCallback((key) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const hasFilters = useCallback(() => {
    return Object.values(filters).some(v => v !== '' && v !== null && v !== undefined);
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    clearFilter,
    hasFilters: hasFilters()
  };
};
