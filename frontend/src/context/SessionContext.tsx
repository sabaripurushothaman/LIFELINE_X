import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import type { AnalysisSessionSummary } from '../types';

export interface ActiveJobState {
  analysisId: string;
  progress: number;
  processedFrames: number;
  totalFrames: number;
  candidatesFound: number;
  status: 'running' | 'complete' | 'error';
  error?: string;
}

interface SessionContextType {
  analyses: AnalysisSessionSummary[];
  currentAnalysisId: string | null;
  currentAnalysis: AnalysisSessionSummary | null;
  loading: boolean;
  activeJob: ActiveJobState | null;
  setCurrentAnalysisId: (id: string | null) => void;
  refreshAnalyses: () => Promise<void>;
  registerNewJob: (analysisId: string, initialTotalFrames?: number) => void;
  clearSessionSelection: () => void;
}

const STORAGE_KEY = 'lifeline_x_current_analysis_id';

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [analyses, setAnalyses] = useState<AnalysisSessionSummary[]>([]);
  const [currentAnalysisId, setCurrentAnalysisIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeJob, setActiveJob] = useState<ActiveJobState | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshAnalyses = useCallback(async () => {
    try {
      const res = (await api.listAnalyses()) as { analyses: AnalysisSessionSummary[] };
      const list = res.analyses ?? [];
      setAnalyses(list);

      // If currentAnalysisId is not set, or is no longer in list, default to latest analysis if available
      setCurrentAnalysisIdState((prev) => {
        if (prev && list.some((a) => a.id === prev)) {
          return prev;
        }
        if (list.length > 0) {
          localStorage.setItem(STORAGE_KEY, list[0].id);
          return list[0].id;
        }
        localStorage.removeItem(STORAGE_KEY);
        return null;
      });
    } catch {
      // Backend offline or starting up
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshAnalyses();
  }, [refreshAnalyses]);

  const setCurrentAnalysisId = useCallback((id: string | null) => {
    setCurrentAnalysisIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearSessionSelection = useCallback(() => {
    setCurrentAnalysisId(null);
    setActiveJob(null);
  }, [setCurrentAnalysisId]);

  // Register a new running job
  const registerNewJob = useCallback((analysisId: string, initialTotalFrames: number = 0) => {
    setCurrentAnalysisId(analysisId);
    setActiveJob({
      analysisId,
      progress: 0,
      processedFrames: 0,
      totalFrames: initialTotalFrames,
      candidatesFound: 0,
      status: 'running',
    });
  }, [setCurrentAnalysisId]);

  // Polling logic for running job
  useEffect(() => {
    // If activeJob is running, poll its status
    if (activeJob && activeJob.status === 'running') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const result = (await api.getAnalysis(activeJob.analysisId)) as {
            status: string;
            progress: number;
            processed_frames: number;
            total_frames: number;
            candidates_found: number;
            error?: string;
          };

          const isComplete = result.status === 'COMPLETE';
          const isError = result.status === 'ERROR';

          setActiveJob((prev) => {
            if (!prev || prev.analysisId !== activeJob.analysisId) return prev;
            return {
              ...prev,
              progress: result.progress ?? prev.progress,
              processedFrames: result.processed_frames ?? prev.processedFrames,
              totalFrames: result.total_frames ?? prev.totalFrames,
              candidatesFound: result.candidates_found ?? prev.candidatesFound,
              status: isComplete ? 'complete' : isError ? 'error' : 'running',
              error: result.error,
            };
          });

          if (isComplete || isError) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            refreshAnalyses();
          }
        } catch {
          // Keep polling
        }
      }, 1000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeJob?.analysisId, activeJob?.status, refreshAnalyses]);

  // Find current analysis object
  const currentAnalysis = analyses.find((a) => a.id === currentAnalysisId) ?? null;

  return (
    <SessionContext.Provider
      value={{
        analyses,
        currentAnalysisId,
        currentAnalysis,
        loading,
        activeJob,
        setCurrentAnalysisId,
        refreshAnalyses,
        registerNewJob,
        clearSessionSelection,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
