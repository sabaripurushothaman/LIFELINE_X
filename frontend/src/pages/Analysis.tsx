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
  Cpu,
  MapPin,
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

interface VideoMetadata {
  name: string;
  sizeMb: number;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
  is4K?: boolean;
}

const Analysis = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMetadata | null>(null);
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

  // Inspect video metadata on file selection
  const handleVideoSelect = (file: File | null) => {
    setVideoFile(file);
    if (!file) {
      setVideoMeta(null);
      return;
    }

    const meta: VideoMetadata = {
      name: file.name,
      sizeMb: parseFloat((file.size / (1024 * 1024)).toFixed(1)),
    };

    // Load into temporary video element to extract dimensions and duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const is4K = video.videoWidth >= 3840 || video.videoHeight >= 2160;
      setVideoMeta({
        ...meta,
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
        duration: Math.round(video.duration || 0),
        fps: 30,
        is4K,
      });
    };
    video.onerror = () => {
      // Default fallback
      setVideoMeta({
        ...meta,
        width: 1920,
        height: 1080,
        duration: 45,
        fps: 30,
        is4K: false,
      });
    };
    video.src = URL.createObjectURL(file);
  };

  // Poll for analysis progress
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
    setVideoMeta(null);
    setTelemetryFile(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
            RECORDED DRONE VIDEO ANALYSIS
          </h1>
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-sky-50 border border-sky-200 text-sky-700">
            4K UHD READY
          </span>
        </div>
        <p className="text-slate-600 text-xs sm:text-sm mt-1">
          Upload recorded UAV reconnaissance footage and synchronized flight telemetry for automated survivor detection, tracking, and geolocation.
        </p>
      </div>

      {/* 12-Stage Visual Mission Workflow Tracker */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-500">
          <span className="font-heading font-bold uppercase tracking-wider text-slate-800">
            AI DISASTER RECONNAISSANCE PIPELINE STAGES
          </span>
          <span>12 STAGES AUTOMATED</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-[10px] font-mono">
          <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-semibold text-center">
            1. Drone Video
          </div>
          <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-semibold text-center">
            2. 4K Validation
          </div>
          <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-semibold text-center">
            3. Human YOLOv8
          </div>
          <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-semibold text-center">
            4. Animal Filter
          </div>
          <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-semibold text-center">
            5. ByteTrack ID
          </div>
          <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-semibold text-center">
            6. Deduplication
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-center">
            7. Movement
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-center">
            8. Telemetry Sync
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-center">
            9. Geolocation
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-center">
            10. Evidence Chain
          </div>
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-800 font-semibold text-center">
            11. Priority Triage
          </div>
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-800 font-semibold text-center">
            12. Map Routing
          </div>
        </div>
      </div>

      {/* Ingestion & Upload Form State */}
      {state.status === 'idle' && (
        <div className="space-y-5">
          {/* Upload Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Video File Upload */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-600">
                    <FileVideo className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-slate-900">RECORDED DRONE VIDEO</h3>
                    <p className="text-xs font-mono text-slate-500">MP4, MOV, MKV, WEBM (UP TO 4K UHD)</p>
                  </div>
                </div>

                <label
                  htmlFor="video-upload"
                  className="flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed border-sky-200 rounded-2xl cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition-all p-5 text-center group"
                >
                  {videoFile ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                      <span className="text-sm font-bold text-slate-900 block truncate max-w-xs">{videoFile.name}</span>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                          {videoMeta?.sizeMb ?? 0} MB
                        </span>
                        {videoMeta?.is4K ? (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            NATIVE 4K (3840×2160)
                          </span>
                        ) : (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {videoMeta?.width ?? 1920}×{videoMeta?.height ?? 1080}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-sky-600 mx-auto transition-colors" />
                      <span className="text-sm font-semibold text-slate-700 block">
                        Select or drop recorded drone footage
                      </span>
                      <span className="text-xs text-slate-400 font-mono block">
                        Preserves native 4K resolution and high-detail evidence crops
                      </span>
                    </div>
                  )}
                  <input
                    id="video-upload"
                    type="file"
                    accept=".mp4,.mov,.avi,.mkv,.webm"
                    className="hidden"
                    onChange={(e) => handleVideoSelect(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {videoMeta && (
                <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 grid grid-cols-2 gap-2">
                  <div>RESOLUTION: <strong className="text-slate-900">{videoMeta.width}×{videoMeta.height}</strong></div>
                  <div>FPS: <strong className="text-slate-900">{videoMeta.fps} FPS</strong></div>
                  <div>DURATION: <strong className="text-slate-900">{videoMeta.duration}s</strong></div>
                  <div>QUALITY: <strong className="text-emerald-700">{videoMeta.is4K ? 'NATIVE 4K' : 'FHD (1080p)'}</strong></div>
                </div>
              )}
            </div>

            {/* Telemetry CSV Upload */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-slate-900">
                      UAV FLIGHT TELEMETRY CSV
                    </h3>
                    <p className="text-xs font-mono text-slate-500">LAT, LON, ALT, HEADING, PITCH, ROLL</p>
                  </div>
                </div>

                <label
                  htmlFor="telemetry-upload"
                  className="flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all p-5 text-center group"
                >
                  {telemetryFile ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
                      <span className="text-sm font-bold text-slate-900 block truncate max-w-xs">{telemetryFile.name}</span>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800">
                        CSV PARSED &amp; SYNC READY
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Compass className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 mx-auto transition-colors" />
                      <span className="text-sm font-semibold text-slate-700 block">
                        Attach telemetry CSV for WGS84 mapping
                      </span>
                      <span className="text-xs text-slate-400 font-mono block">
                        Enables camera raycasting onto flat terrain coordinates
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
                <div className="mt-3.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                  <span>Without telemetry: candidates will show as &quot;NO GPS&quot;</span>
                </div>
              ) : (
                <div className="mt-3.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>Telemetry will synchronize frame-by-frame with video timestamps</span>
                </div>
              )}
            </div>
          </div>

          {/* Mission Ingestion Parameters */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-700" />
              MISSION INGESTION PARAMETERS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono font-bold text-slate-700 uppercase block mb-1">
                  INCIDENT IDENTIFIER
                </label>
                <input
                  type="text"
                  value={incidentId}
                  onChange={(e) => setIncidentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-slate-700 uppercase block mb-1">
                  FRAME SAMPLING (EVERY N FRAMES)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={sampleEveryN}
                  onChange={(e) => setSampleEveryN(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  Sampling N=5 processes 6 FPS with high tracker continuity and fast throughput.
                </p>
              </div>
            </div>
          </div>

          {/* Launch Pipeline Button */}
          <button
            id="start-analysis-btn"
            type="button"
            disabled={!videoFile}
            onClick={handleStart}
            className="w-full py-4 rounded-xl font-heading font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2.5 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(2,132,199,0.35)] hover:shadow-[0_6px_28px_rgba(2,132,199,0.5)] hover:scale-[1.01] transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>LAUNCH INGESTION &amp; AI ANALYSIS PIPELINE</span>
          </button>
        </div>
      )}

      {/* Progressing State */}
      {(state.status === 'uploading' || state.status === 'running') && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-sky-200 shadow-[0_6px_24px_rgba(2,132,199,0.15)] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <Zap className="w-7 h-7 text-sky-600 animate-pulse" />
              <div>
                <h3 className="font-heading font-black text-xl text-slate-900">
                  {state.status === 'uploading' ? 'UPLOADING RECONNAISSANCE MEDIA…' : 'AI INFERENCE IN PROGRESS'}
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  ANALYSIS ID: <strong className="text-sky-700">{state.analysisId ?? 'INITIALIZING…'}</strong>
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-sky-100 text-sky-800 border border-sky-200 animate-pulse">
              PIPELINE ACTIVE
            </span>
          </div>

          {/* Laser Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
              <span className="text-slate-600 font-semibold">PIPELINE EXECUTION PROGRESS</span>
              <span className="text-sky-700 font-black text-base">{state.progress}%</span>
            </div>
            <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>

          {/* Key Metric Counters */}
          <div className="grid grid-cols-3 gap-4 text-center font-mono">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl font-black text-sky-700">{state.progress}%</div>
              <div className="text-xs text-slate-500 mt-1 uppercase">PROGRESS</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl font-black text-slate-900">{state.processedFrames}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase">FRAMES PROCESSED</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl font-black text-emerald-700">{state.candidatesFound}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase">HUMAN CANDIDATES</div>
            </div>
          </div>
        </div>
      )}

      {/* Completed State */}
      {state.status === 'complete' && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-emerald-200 shadow-[0_6px_24px_rgba(22,163,74,0.15)] space-y-6">
          <div className="flex items-center gap-3.5">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            <div>
              <h3 className="font-heading font-black text-2xl text-emerald-800">
                MISSION ANALYSIS COMPLETE
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                DOSSIER READY • ANALYSIS ID: {state.analysisId}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center font-mono">
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-3xl sm:text-4xl font-black text-emerald-700">{state.candidatesFound}</div>
              <div className="text-xs text-slate-600 mt-1 uppercase font-bold">HUMAN CANDIDATES FLAGGED</div>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl sm:text-4xl font-black text-slate-900">{state.processedFrames}</div>
              <div className="text-xs text-slate-600 mt-1 uppercase font-bold">FRAMES ANALYZED</div>
            </div>
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl sm:text-4xl font-black text-sky-700">100%</div>
              <div className="text-xs text-slate-600 mt-1 uppercase font-bold">PIPELINE COMPLETE</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
            <button
              type="button"
              onClick={() => navigate('/survivors')}
              className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(22,163,74,0.35)] transition-all"
            >
              <Users className="w-5 h-5" />
              <span>REVIEW SURVIVOR CANDIDATES</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="flex-1 py-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-heading font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(2,132,199,0.35)] transition-all"
            >
              <MapPin className="w-5 h-5" />
              <span>VIEW LOCATIONS ON MAP</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="py-4 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-heading font-bold text-sm tracking-wider transition-all"
            >
              NEW INGESTION
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {state.status === 'error' && (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 space-y-4">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-heading font-black text-lg">ANALYSIS EXECUTION ERROR</h3>
          </div>
          <p className="text-xs sm:text-sm font-mono text-red-800">{state.error ?? 'Unknown error occurred during processing.'}</p>
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 rounded-xl bg-white border border-red-300 text-red-800 text-xs font-mono font-bold hover:bg-red-50 transition-colors"
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Safety Advisory Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-800 flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          OPERATIONAL SAFETY NOTICE: AI detections are advisory. Rescuer dispatches require human verification of optical and telemetry signals.
        </span>
      </div>
    </div>
  );
};

export default Analysis;
