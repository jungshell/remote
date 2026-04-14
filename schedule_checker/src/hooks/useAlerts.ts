'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/apiClient';
import type { Alert } from '@/types/models';

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts(true);
    const interval = setInterval(() => fetchAlerts(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async (isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      const response = await authFetch('/api/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  return { alerts, loading, error, refetch: () => fetchAlerts(true) };
}
