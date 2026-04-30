import { useState, useEffect, useCallback } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';

export const useFetchData = (endpoint, dependencies = []) => {
  const { get } = useFetchClient();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await get(endpoint);
      setData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [endpoint, get]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  return { data, loading, error, refetch: fetchData };
};
