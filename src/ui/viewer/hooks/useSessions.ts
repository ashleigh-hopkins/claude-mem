/**
 * Sessions Hook
 *
 * Fetches session summaries for session selector dropdown
 */

import { useState, useEffect } from 'react';
import { SessionSummary } from '../types';

export function useSessions(project: string | null = null) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSessions() {
      setIsLoading(true);
      setError(null);

      try {
        const url = project
          ? `/api/summaries?project=${encodeURIComponent(project)}&limit=100`
          : `/api/summaries?limit=100`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch sessions: ${response.statusText}`);
        }

        const data = await response.json();

        if (!cancelled) {
          setSessions(data.items || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setSessions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchSessions();

    return () => {
      cancelled = true;
    };
  }, [project]);

  return { sessions, isLoading, error };
}
