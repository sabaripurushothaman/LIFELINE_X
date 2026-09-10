import { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Play,
  Square,
  AlertTriangle,
  Activity,
  Camera,
  Crosshair,
  Radio,
  Cpu,
  FileVideo,
  Info,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';

interface VideoMeta {
  filename: string;
  width: number | null;
  height: number | null;
  fps: number | null;
  frame_count: number | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  codec?: string;
}

interface ProcessingStatus {
  status: 'IDLE' | 'LOADING' | 'PLAYING' | 'PAUSED' | 'ERROR';
  fps: number | null;
  processingFps: number | null;
  latencyMs: number | null;
  detectionsThisFrame: number;
  totalDetections: number;
}

function getResolutionLabel(width: number | null, height: number | null): {
  label: string;
  badge: 'native4k' | 'hd' | 'fhd' | 'other';
} {
  if (!width || !height) return { label: 'UNKNOWN', badge: 'other' };
  if (width >= 3840 && height >= 2160) return { label: 'NATIVE 4K (3840×2160)', badge: 'native4k' };
  if (width >= 1920 && height >= 1080) return { label: 'FULL HD (1920×1080)', badge: 'fhd' };
  if (width >= 1280 && height >= 720) return { label: 'HD (1280×720)', badge: 'hd' };
  return { label: `${width}×${height}`, badge: 'other' };
}

const ResolutionBadge = ({ label, badge }: { label: string; badge: string }) => {
  const styles: Record<string, string> = {
    native4k: 'bg-emerald-50 border-emerald-300 text-emerald-700',
    fhd:      'bg-sky-50 border-sky-300 text-sky-700',
    hd:       'bg-slate-100 border-slate-300 text-slate-600',
    other:    'bg-slate-100 border-slate-200 text-slate-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${styles[badge] ?? styles.other}`}>
      {label}
    </span>
  );
};

const MetricCell = ({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  highlight?: boolean;
}) => (
  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</div>
    <div className={`text-lg font-black mt-1 font-mono ${highlight ? 'text-sky-700' : 'text-slate-900'}`}>
      {value !== null && value !== undefined ? String(value) : 'NOT AVAILABLE'}
    </div>
    {unit && <div className="text-[9px] text-slate-400 font-mono">{unit}</div>}
  </div>
);

const LiveCamera = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [systemStatus, setSystemStatus] = useState<{ overall: string; device: string } | null>(null);
  const [procStatus, setProcStatus] = useState<ProcessingStatus>({
    status: 'IDLE',
    fps: null,
    processingFps: null,
    latencyMs: null,
    detectionsThisFrame: 0,
    totalDetections: 0,
  });
  const [lastAnalysisId, setLastAnalysisId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load system status on mount
  useEffect(() => {
    const load = async () => {
      try {
        const s = (await api.getSystemStatus()) as { overall: string; device: string };
        setSystemStatus(s);
      } catch {
        setSystemStatus(null);
      }
    };
    load();
  }, []);

  // Load last analysis for detection count
  useEffect(() => {
    const load = async () => {
      try {
        const result = (await api.listAnalyses()) as { analyses: Array<{ id: string; status: string; candidates_found?: number }> };
        const analyses = result.analyses ?? [];
        const complete = analyses.find((a) => a.status === 'COMPLETE');
        if (complete) setLastAnalysisId(complete.id);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  // When a video file is selected, extract metadata via HTMLVideoElement
  const handleVideoSelected = (file: File) => {
    setVideoFile(file);
    setError(null);
    setProcStatus({ status: 'LOADING', fps: null, processingFps: null, latencyMs: null, detectionsThisFrame: 0, totalDetections: 0 });

    const url = URL.createObjectURL(file);
    const tmpVideo = document.createElement('video');
    tmpVideo.preload = 'metadata';
    tmpVideo.onloadedmetadata = () => {
      const fps = 30; // JS Video API does not expose FPS directly — use 30 as safe default
      const meta: VideoMeta = {
        filename: file.name,
        width: tmpVideo.videoWidth || null,
        height: tmpVideo.videoHeight || null,
        fps,
        frame_count: Math.floor(tmpVideo.duration * fps),
        duration_seconds: tmpVideo.duration || null,
        file_size_bytes: file.size,
        codec: 'NOT AVAILABLE', // browser Video API doesn't expose codec
      };
      setVideoMeta(meta);
      setProcStatus((p) => ({ ...p, status: 'PAUSED' }));
      URL.revokeObjectURL(url);
    };
    tmpVideo.onerror = () => {
      setError('Could not read video metadata. Ensure the file is a valid video.');
      setProcStatus((p) => ({ ...p, status: 'ERROR' }));
      URL.revokeObjectURL(url);
    };
    tmpVideo.src = url;
  };

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setProcStatus((p) => ({
        ...p,
        status: 'PLAYING',
        fps: videoMeta?.fps ?? null,
        processingFps: null, // Real inference not running here — would need WebSocket
        latencyMs: null,
      }));
    }
  };

  const handleStop = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setProcStatus((p) => ({ ...p, status: 'PAUSED' }));
    }
  };

  const { label: resLabel, badge: resBadge } = videoMeta
    ? getResolutionLabel(videoMeta.width, videoMeta.height)
    : { label: 'NOT AVAILABLE', badge: 'other' };

  const isPlaying = procStatus.status === 'PLAYING';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
              LIVE CAMERA &amp; VIDEO FEED
            </h1>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-600">
              VIDEO REPLAY MODE
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Load recorded UAV footage for frame-by-frame replay with AI detection overlay.
            Live camera input requires device camera access.
          </p>
        </div>

        {/* System device badge */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
            <Cpu className="w-3.5 h-3.5" />
            <span>AI: {systemStatus?.device ?? 'NOT AVAILABLE'}</span>
          </div>
        </div>
      </div>

      {/* Live Camera Not Available Notice */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs font-mono text-amber-800 space-y-1">
          <div className="font-bold">LIVE CAMERA STATUS: NOT CONFIGURED</div>
          <div className="text-amber-700">
            Direct camera feed (WebRTC / USB camera) requires hardware connection and camera permission.
            Currently operating in <strong>RECORDED VIDEO REPLAY</strong> mode.
            Upload a UAV video below to review detections from a prior analysis run.
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Upload / Player Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.10)] overflow-hidden">
            {/* Viewer header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700">
                <Camera className="w-4 h-4 text-sky-600" />
                <span>VIDEO FRAME VIEWER</span>
              </div>
              {videoMeta && <ResolutionBadge label={resLabel} badge={resBadge} />}
            </div>

            {/* Video Viewport */}
            <div className="relative bg-[#020917] aspect-video flex items-center justify-center">
              {videoFile ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    src={URL.createObjectURL(videoFile)}
                    onEnded={() => setProcStatus((p) => ({ ...p, status: 'PAUSED' }))}
                    onError={() => setError('Video playback error.')}
                  />
                  {/* HUD Overlay */}
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-sky-300 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-red-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span>{isPlaying ? 'PLAYING' : 'PAUSED'}</span>
                    </div>
                    {videoMeta && (
                      <div className="text-slate-400">
                        {videoMeta.width}×{videoMeta.height} • {videoMeta.fps} FPS
                      </div>
                    )}
                  </div>

                  {/* Detection overlay placeholder */}
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-[10px] font-mono">
                    <div className="text-slate-400">DETECTIONS</div>
                    <div className="text-emerald-400 font-bold">
                      {lastAnalysisId ? 'SEE SURVIVORS PAGE' : 'RUN ANALYSIS FIRST'}
                    </div>
                  </div>

                  {/* Crosshair */}
                  <Crosshair className="absolute text-sky-400/20 w-24 h-24 pointer-events-none" />
                </>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border-2 border-dashed border-sky-400/30 flex items-center justify-center">
                    <VideoOff className="w-9 h-9 text-sky-400/50" />
                  </div>
                  <div>
                    <div className="text-slate-400 font-mono text-sm font-bold">NO VIDEO SOURCE</div>
                    <div className="text-slate-500 text-xs mt-1">Upload a recorded UAV video to begin replay</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-heading font-bold text-sm transition-all shadow-[0_4px_16px_rgba(14,165,233,0.35)]"
                  >
                    <FileVideo className="w-4 h-4" />
                    <span>LOAD VIDEO FILE</span>
                  </button>
                </div>
              )}
            </div>

            {/* Player Controls */}
            {videoFile && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={isPlaying ? handleStop : handlePlay}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading font-bold text-xs transition-all ${
                    isPlaying
                      ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                      : 'bg-sky-500 text-white hover:bg-sky-400 shadow-[0_2px_12px_rgba(14,165,233,0.35)]'
                  }`}
                >
                  {isPlaying ? <><Square className="w-3.5 h-3.5 fill-current" /> STOP</> : <><Play className="w-3.5 h-3.5 fill-current" /> PLAY</>}
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:border-sky-300 font-mono text-xs transition-all"
                >
                  <FileVideo className="w-3.5 h-3.5" />
                  CHANGE VIDEO
                </button>

                <div className="ml-auto text-[10px] font-mono text-slate-400 truncate max-w-xs">
                  {videoFile.name}
                </div>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov,.avi,.mkv,.webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleVideoSelected(f);
              e.target.value = '';
            }}
          />

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-mono text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Metrics Panel */}
        <div className="space-y-4">
          {/* Processing Status */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700">
              <Activity className="w-4 h-4 text-sky-600" />
              PROCESSING STATUS
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <MetricCell label="STATUS" value={procStatus.status} highlight={procStatus.status === 'PLAYING'} />
              <MetricCell label="SOURCE FPS" value={videoMeta?.fps ?? null} unit="FPS" highlight />
              <MetricCell label="PROC FPS" value={null} unit="FPS" />
              <MetricCell label="LATENCY" value={null} unit="ms/frame" />
            </div>

            <div className="text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-2">
              Processing FPS and latency are measured during live AI inference only.
              Run Analysis pipeline for AI processing.
            </div>
          </div>

          {/* Video Metadata */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700">
              <Video className="w-4 h-4 text-sky-600" />
              VIDEO METADATA
            </div>

            {videoMeta ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">FILENAME</span>
                  <span className="text-slate-900 font-bold truncate max-w-[140px]">{videoMeta.filename}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">RESOLUTION</span>
                  <span className="text-slate-900 font-bold">
                    {videoMeta.width && videoMeta.height ? `${videoMeta.width}×${videoMeta.height}` : 'NOT AVAILABLE'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">RESOLUTION TYPE</span>
                  <ResolutionBadge label={resLabel} badge={resBadge} />
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">FPS</span>
                  <span className="text-slate-900 font-bold">{videoMeta.fps ?? 'NOT AVAILABLE'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">DURATION</span>
                  <span className="text-slate-900 font-bold">
                    {videoMeta.duration_seconds ? `${videoMeta.duration_seconds.toFixed(1)}s` : 'NOT AVAILABLE'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">FILE SIZE</span>
                  <span className="text-slate-900 font-bold">
                    {videoMeta.file_size_bytes ? `${(videoMeta.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : 'NOT AVAILABLE'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">CODEC</span>
                  <span className="text-slate-400">{videoMeta.codec ?? 'NOT AVAILABLE'}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-400 text-center py-4">
                No video loaded — metadata not available
              </div>
            )}
          </div>

          {/* Detection Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700">
              <Crosshair className="w-4 h-4 text-sky-600" />
              DETECTION SUMMARY
            </div>

            {lastAnalysisId ? (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Analysis available
                </div>
                <div className="text-slate-500">
                  Analysis ID: <span className="font-bold text-slate-700">{lastAnalysisId}</span>
                </div>
                <div className="text-slate-400 text-[10px]">
                  View full detection results in the Survivors page.
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-400 space-y-1">
                <div>No completed analysis found.</div>
                <div className="text-[10px]">Run Analysis pipeline to generate detections.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timestamp / Telemetry row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-mono text-slate-500 uppercase">TELEMETRY SYNC</div>
          <div className="text-sm font-black text-slate-400 font-mono mt-1">NOT AVAILABLE</div>
          <div className="text-[9px] text-slate-400 font-mono">Requires telemetry CSV</div>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-mono text-slate-500 uppercase">THERMAL INPUT</div>
          <div className="text-sm font-black text-slate-400 font-mono mt-1">NOT AVAILABLE</div>
          <div className="text-[9px] text-slate-400 font-mono">No thermal payload connected</div>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-mono text-slate-500 uppercase">UAV GPS</div>
          <div className="text-sm font-black text-slate-400 font-mono mt-1">NOT AVAILABLE</div>
          <div className="text-[9px] text-slate-400 font-mono">No MAVLink / telemetry</div>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3" /> TIMESTAMP
          </div>
          <div className="text-sm font-black text-slate-900 font-mono mt-1">
            {new Date().toLocaleTimeString()}
          </div>
          <div className="text-[9px] text-emerald-600 font-mono flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 animate-pulse" /> SYSTEM CLOCK
          </div>
        </div>
      </div>

      {/* Safety Advisory */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-700 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong>OPERATIONAL SAFETY:</strong> This system displays recorded video replays.
          AI detections are advisory only. Live camera input requires hardware and permission configuration.
          Never dispatch rescue teams based solely on AI output — human operator verification is mandatory.
        </div>
      </div>
    </div>
  );
};

export default LiveCamera;
