import React from 'react';
import { Film, Plus, ChevronDown, RefreshCw, Users } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useNavigate } from 'react-router-dom';

interface SessionSelectorProps {
  onUploadNew?: () => void;
  showNewButton?: boolean;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({ onUploadNew, showNewButton = true }) => {
  const {
    analyses,
    currentAnalysisId,
    currentAnalysis,
    setCurrentAnalysisId,
    clearSessionSelection,
    activeJob,
    refreshAnalyses,
  } = useSession();
  const navigate = useNavigate();

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__new__') {
      if (onUploadNew) {
        onUploadNew();
      } else {
        clearSessionSelection();
        navigate('/analysis');
      }
    } else {
      setCurrentAnalysisId(val);
    }
  };

  const handleNewVideoClick = () => {
    if (onUploadNew) {
      onUploadNew();
    } else {
      clearSessionSelection();
      navigate('/analysis');
    }
  };

  // If no analyses exist and no active job, show minimal helper or nothing
  if (analyses.length === 0 && !activeJob) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
      {/* Selector input */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex-shrink-0">
          <Film className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-heading">
              ACTIVE VIDEO SESSION
            </span>
            {currentAnalysis && (
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                  currentAnalysis.status === 'COMPLETE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : currentAnalysis.status === 'RUNNING'
                    ? 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {currentAnalysis.status}
              </span>
            )}
            {activeJob && activeJob.status === 'running' && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-sky-500 text-white animate-pulse">
                INFERENCE RUNNING {activeJob.progress}%
              </span>
            )}
          </div>

          <div className="relative">
            <select
              value={currentAnalysisId || ''}
              onChange={handleSelect}
              className="w-full text-xs font-mono font-bold bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl px-3 py-2 pr-8 text-slate-800 focus:outline-none focus:border-sky-500 transition-colors cursor-pointer appearance-none truncate"
            >
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.video_filename || a.id} • [{a.id}] • {a.candidate_count ?? 0} survivors • {a.status}
                </option>
              ))}
              <option value="__new__">+ Upload / Analyze Another Video…</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Session Quick Metrics & Action */}
      <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        {currentAnalysis && (
          <div className="flex items-center gap-3 text-xs">
            <div className="text-right hidden md:block">
              <span className="text-[10px] text-slate-400 block">HUMAN CANDIDATES</span>
              <span className="font-black text-emerald-700 text-sm flex items-center justify-end gap-1">
                <Users className="w-3.5 h-3.5" />
                {currentAnalysis.candidate_count ?? 0}
              </span>
            </div>
            <div className="text-right hidden lg:block">
              <span className="text-[10px] text-slate-400 block">FRAMES</span>
              <span className="font-bold text-slate-700 text-sm">
                {currentAnalysis.processed_frames || currentAnalysis.frame_count || 0}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshAnalyses()}
            title="Refresh Sessions"
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {showNewButton && (
            <button
              type="button"
              onClick={handleNewVideoClick}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-heading font-black tracking-wider transition-all shadow-[0_2px_8px_rgba(2,132,199,0.3)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW VIDEO</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionSelector;
