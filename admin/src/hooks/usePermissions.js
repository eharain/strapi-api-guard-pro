import { useState, useEffect } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';

export const usePermissions = () => {
  const { get } = useFetchClient();
  const [canAccess, setCanAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Check if user has admin panel access
        const response = await get('/api-guard-pro/overview');
        setCanAccess(response.status === 200);
      } catch {
        setCanAccess(false);
      } finally {
        setLoading(false);
      }
    };
    checkPermissions();
  }, [get]);

  return { canAccess, loading };
};
