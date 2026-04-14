'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/apiClient';
import type { Template } from '@/types/models';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/templates')
      .then((res) => (res.ok ? res.json() : []))
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  return { templates, loading };
}
