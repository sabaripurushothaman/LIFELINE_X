import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface BackendStatus {
  isOnline: boolean;
  isLoading: boolean;
  lastChecked: Date | null;
}

/**
 * Polls /api/health every 10 seconds to determine if the FastAPI backend
 * is reachable. Returns live status — never hardcoded.
 */
export function useBackendStatus(): BackendStatus {
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = useCallback(async () => {
    try {
      const result = await api.getHealth() as { status?: string };
      // Backend returns { "status": "ok" } or similar — any successful response means online
      setIsOnline(typeof result === 'object' && result !== null);
    } catch {
      setIsOnline(false);
    } finally {
      setIsLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, [check]);

  return { isOnline, isLoading, lastChecked };
}
