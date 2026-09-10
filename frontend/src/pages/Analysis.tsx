import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Play,
  AlertTriangle,
  CheckCircle2,
  FileVideo,
  FileText,
  Zap,
  Users,
  Compass,
  Radio,
  Cpu,
} from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

type AnalysisStatus = 'idle' | 'uploading' | 'running' | 'complete' | 'error';

interface AnalysisState {
  status: AnalysisStatus;
  analysisId?: string;
  progress: number;
  processedFrames: number;
  totalFrames: number;
  candidatesFound: number;
  error?: string;
}

const Analysis = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [telemetryFile, setTelemetryFile] = useState<File | null>(null);
  const [incidentId, setIncidentId] = useState('FLOOD-001');
  const [sampleEveryN, setSampleEveryN] = useState(5);
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    progress: 0,
    processedFrames: 0,
    totalFrames: 0,
    candidatesFound: 0,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  // Poll for analysis status
  useEffect(() => {
    if (state.status === 'running' && state.analysisId) {
      pollRef.current = setInterval(async () => {
        try {
          const result = (await api.getAnalysis(state.analysisId!)) as {
            progress: number;
            processed_frames: number;
            total_frames: number;
            candidates_found: number;
            status: string;
            error?: string;
          };
          setState((prev) => ({
            ...prev,
            progress: result.progress ?? prev.progress,
            processedFrames: result.processed_frames ?? prev.processedFrames,
            totalFrames: result.total_frames ?? prev.totalFrames,
            candidatesFound: result.candidates_found ?? prev.candidatesFound,
            status:
              result.status === 'COMPLETE'
                ? 'complete'
                : result.status === 'ERROR'
                ? 'error'
                : 'running',
            error: result.error,
          }));
          if (result.status === 'COMPLETE' || result.status === 'ERROR') {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch {
          // Keep polling
        }
      }, 1000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state.status, state.analysisId]);

  const handleStart = async () => {
    if (!videoFile) return;
    setState({
      status: 'uploading',
      progress: 0,
      processedFrames: 0,
      totalFrames: 0,
      candidatesFound: 0,
    });
    try {
      const result = await api.startAnalysisWithFiles(
        videoFile,
        telemetryFile,
        incidentId,
        sampleEveryN
      );
      setState((prev) => ({
        ...prev,
        status: 'running',
        analysisId: result.analysis_id,
        totalFrames: result.frame_count ?? 0,
      }));
    } catch (e: unknown) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  };

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setState({
      status: 'idle',
      progress: 0,
      processedFrames: 0,
      totalFrames: 0,
      candidatesFound: 0,
    });
    setVideoFile(null);
    setTelemetryFile(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
            AI VIDEO INGESTION &amp; ANALYSIS
          </h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 border border-sky-200 text-sky-600">
            RECORDED REPLAY MODE
          </span>
        </div>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Ingest recorded UAV optical footage and synchronized flight telemetry for automated survivor detection, tracking, and geolocation.
        </p>
      </div>

      {/* Idle / Ingestion Form State */}
      {state.status === 'idle' && (
        <div className="space-y-5">
          {/* Upload Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Video File Upload */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.10)] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-600">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-slate-900">DRONE FOOTAGE</h3>
                    <p className="text-[10px] font-mono text-slate-400">MP4, MOV, MKV, WEBM (UP TO 4K)</p>
                  </div>
                </div>

                <label
                  htmlFor="video-upload"
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-sky-200 rounded-xl cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-all p-4 text-center group"
                >
                  {videoFile ? (
                    <div className="space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto animate-bounce" />
                      <span className="text-sm font-bold text-slate-900 block truncate max-w-xs">{videoFile.name}</span>
                      <span className="text-xs font-mono text-sky-700">
                        {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-7 h-7 text-slate-400 group-hover:text-sky-600 mx-auto transition-colors" />
                      <span className="text-xs font-semibold text-slate-600 block">
                        Select or drop recorded UAV video
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Will be analyzed through YOLOv8 + ByteTrack
                      </span>
                    </div>
                  )}
                  <input
                    id="video-upload"
                    type="file"
                    accept=".mp4,.mov,.avi,.mkv,.webm"
                    className="hidden"
                    onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div className="mt-3 text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-700" />
                <span>Supports forward, oblique, or nadir camera angles</span>
              </div>
            </div>

            {/* Telemetry CSV Upload */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.10)] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-slate-900">
                      FLIGHT TELEMETRY CSV <span className="text-slate-400 font-normal">(OPTIONAL)</span>
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400">LAT, LON, ALT, HEADING, PITCH, ROLL</p>
                  </div>
                </div>

                <label
                  htmlFor="telemetry-upload"
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all p-4 text-center group"
                >
                  {telemetryFile ? (
                    <div className="space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
                      <span className="text-sm font-bold text-slate-900 block truncate max-w-xs">{telemetryFile.name}</span>
                      <span className="text-xs font-mono text-emerald-700">
                        CSV PARSED &amp; SYNC READY
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Compass className="w-7 h-7 text-slate-400 group-hover:text-emerald-600 mx-auto transition-colors" />
                      <span className="text-xs font-semibold text-slate-600 block">
                        Upload telemetry CSV for GPS mapping
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Enables flat-ground geospatial projection
                      </span>
                    </div>
                  )}
                  <input
                    id="telemetry-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setTelemetryFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {!telemetryFile ? (
                <div className="mt-3 text-[10px] text-amber-600 font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Without telemetry: candidates will show as &quot;NO GPS&quot;</span>
                </div>
              ) : (
                <div className="mt-3 text-[10px] text-emerald-700 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Telemetry will be synchronized with video timestamps</span>
                </div>
              )}
            </div>
          </div>

          {/* Mission Parameters Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-700" />
              MISSION INGESTION PARAMETERS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  INCIDENT IDENTIFIER
                </label>
                <input
                  type="text"
                  value={incidentId}
                  onChange={(e) => setIncidentId(e.target.value)}
                  className="w-full bg-slate-50 border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#06b6d4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  FRAME INFERENCE SAMPLING (EVERY N FRAMES)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={sampleEveryN}
                  onChange={(e) => setSampleEveryN(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#06b6d4]"
                />
                <p className="text-[10px] font-mono text-slate-400 mt-1">
                  Sample N=5 provides 6 FPS inference speed with optimal tracker continuity.
                </p>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <button
            id="start-analysis-btn"
            type="button"
            disabled={!videoFile}
            onClick={handleStart}
            className="w-full py-4 rounded-xl font-heading font-black text-sm tracking-wider flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 shadow-[0_4px_20px_rgba(14,165,233,0.35)] transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>LAUNCH INGESTION &amp; AI ANALYSIS PIPELINE</span>
          </button>
        </div>
      )}

      {/* Progressing State */}
      {(state.status === 'uploading' || state.status === 'running') && (
        <div className="p-6 rounded-2xl bg-white border border-sky-200 shadow-[0_4px_20px_rgba(2,132,199,0.15)] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-sky-700 animate-pulse" />
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900">
                  {state.status === 'uploading' ? 'UPLOADING RECONNAISSANCE MEDIA…' : 'AI INFERENCE IN PROGRESS'}
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  ANALYSIS ID: <strong className="text-sky-700">{state.analysisId ?? 'INITIALIZING…'}</strong>
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#06b6d4]/15 text-sky-700 border border-[#06b6d4]/40 animate-pulse">
              PIPELINE ACTIVE
            </span>
          </div>

          {/* Animated Laser Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">PIPELINE EXECUTION PROGRESS</span>
              <span className="text-sky-700 font-bold">{state.progress}%</span>
            </div>
            <div className="relative w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-3 text-center font-mono">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-2xl font-black text-sky-700">{state.progress}%</div>
              <div className="text-[10px] text-slate-400 mt-0.5 uppercase">PROGRESS</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-2xl font-black text-slate-900">{state.processedFrames}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 uppercase">FRAMES PROCESSED</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-2xl font-black text-emerald-700">{state.candidatesFound}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 uppercase">CANDIDATES FLAGGED</div>
            </div>
          </div>

          {/* Sub-process Stage Status Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#06b6d4] animate-ping" />
              <span className="text-slate-700 font-bold">1. YOLOv8 Detection</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-slate-700 font-bold">2. ByteTrack Tracking</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
              <span className="text-slate-700 font-bold">3. Evidence Synthesis</span>
            </div>
          </div>
        </div>
      )}

      {/* Completed State */}
      {state.status === 'complete' && (
        <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-[0_4px_20px_rgba(22,163,74,0.15)] space-y-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-700" />
            <div>
              <h3 className="font-heading font-black text-xl text-emerald-700">
                MISSION ANALYSIS COMPLETE
              </h3>
              <p className="text-xs font-mono text-slate-400">
                DOSSIER READY • ANALYSIS ID: {state.analysisId}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center font-mono">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-3xl font-black text-emerald-700">{state.candidatesFound}</div>
              <div className="text-[10px] text-slate-400 mt-1 uppercase">HUMAN CANDIDATES FLAGGED</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl font-black text-slate-900">{state.processedFrames}</div>
              <div className="text-[10px] text-slate-400 mt-1 uppercase">FRAMES ANALYZED</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl font-black text-sky-700">100%</div>
              <div className="text-[10px] text-slate-400 mt-1 uppercase">COMPLETE</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/survivors')}
              className="flex-1 py-3.5 rounded-xl bg-[#10b981] text-white font-heading font-black text-sm tracking-wider flex items-center justify-center gap-2 hover:brightness-110 shadow-[0_4px_20px_rgba(22,163,74,0.35)] transition-all"
            >
              <Users className="w-4 h-4" />
              <span>REVIEW SURVIVOR CANDIDATES</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-heading font-bold text-sm tracking-wider hover:border-sky-400 transition-all"
            >
              RUN NEW INGESTION
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {state.status === 'error' && (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 space-y-4">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-heading font-black text-base">ANALYSIS EXECUTION ERROR</h3>
          </div>
          <p className="text-xs font-mono text-red-700">{state.error ?? 'Unknown error occurred during processing.'}</p>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-white text-xs font-mono hover:border-red-400"
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Safety Advisory Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-700 flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          OPERATIONAL SAFETY NOTICE: AI detections are advisory. Rescuer dispatches require human verification of optical and telemetry signals.
        </span>
      </div>
    </div>
  );
};

export default Analysis;
