'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/apiClient';
import type { Task } from '@/types/models';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const quickAdd = useCallback(async (title: string, ownerId: string) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: Task = {
      id: tempId,
      title,
      status: 'todo',
      priority: 'medium',
      ownerId,
    };
    setTasks((prev) => [...prev, optimistic]);
    try {
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimistic),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '업무 생성 실패');
      }
      const { id } = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === tempId ? { ...t, id } : t)));
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      throw err;
    }
  }, []);

  const updateStatusOptimistic = useCallback(async (id: string, status: Task['status']) => {
    const prev = [...tasks];
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      const res = await authFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '수정 실패');
      }
    } catch (err) {
      setTasks(prev);
      throw err;
    }
  }, [tasks]);

  return { tasks, loading, error, refetch: fetchTasks, quickAdd, updateStatusOptimistic };
}
