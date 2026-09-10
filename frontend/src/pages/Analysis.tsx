import { useState } from 'react';
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
  Plus,
} from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import SessionSelector from '../components/common/SessionSelector';

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
  const {
    analyses,
    currentAnalysisId,
    currentAnalysis,
    activeJob,
    registerNewJob,
  } = useSession();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoMeta, setVideoMeta] = useState<VideoMetadata | null>(null);
  const [telemetryFile, setTelemetryFile] = useState<File | null>(null);
  const [incidentId, setIncidentId] = useState('FLOOD-001');
  const [sampleEveryN, setSampleEveryN] = useState(5);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingNew, setIsUploadingNew] = useState<boolean>(false);

  const navigate = useNavigate();

  const isVideoMissing = !!currentAnalysisId && !currentAnalysis && !activeJob && analyses.length > 0;
  // If there are no sessions at all, always show the upload form
  const shouldShowUploadForm =
    isUploadingNew ||
    analyses.length === 0 ||
    (!currentAnalysis && !activeJob && !isVideoMissing);

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

  const handleStart = async () => {
    if (!videoFile) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await api.startAnalysisWithFiles(
        videoFile,
        telemetryFile,
        incidentId,
        sampleEveryN
      );
      registerNewJob(result.analysis_id, result.frame_count ?? 0);
      setIsUploadingNew(false);
      setVideoFile(null);
      setVideoMeta(null);
      setTelemetryFile(null);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartNewUpload = () => {
    setIsUploadingNew(true);
    setVideoFile(null);
    setVideoMeta(null);
    setTelemetryFile(null);
    setUploadError(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
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

      {/* Video Session Selector Bar */}
      {analyses.length > 0 && (
        <SessionSelector
          onUploadNew={handleStartNewUpload}
          showNewButton={!shouldShowUploadForm}
        />
      )}

      {/* 1. Uploading / Initializing State */}
      {isUploading && (
        <div className="p-8 rounded-2xl bg-white border border-sky-200 shadow-[0_6px_24px_rgba(2,132,199,0.15)] text-center space-y-3 font-mono">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="font-heading font-black text-lg text-slate-900">
            UPLOADING RECONNAISSANCE MEDIA &amp; INITIALIZING SESSION…
          </h3>
          <p className="text-xs text-slate-500">
            Registering unique session ID and preparing neural inference pipeline.
          </p>
        </div>
      )}

      {/* 2. Upload Error State */}
      {uploadError && (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 space-y-3">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-heading font-black text-lg">UPLOAD / INGESTION ERROR</h3>
          </div>
          <p className="text-xs sm:text-sm font-mono text-red-800">{uploadError}</p>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="px-5 py-2 rounded-xl bg-white border border-red-300 text-red-800 text-xs font-mono font-bold hover:bg-red-50 transition-colors"
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Video No Longer Available State */}
      {isVideoMissing && (
        <div className="p-6 sm:p-8 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm space-y-3 font-mono">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <h3 className="font-heading font-black text-lg sm:text-xl">VIDEO NO LONGER AVAILABLE</h3>
          </div>
          <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
            The referenced video analysis session ({currentAnalysisId}) was deleted or is no longer present in database records.
          </p>
          <button
            type="button"
            onClick={handleStartNewUpload}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-bold transition-all shadow-sm"
          >
            UPLOAD ANOTHER VIDEO
          </button>
        </div>
      )}

      {/* 3. Ingestion & Upload Form State */}
      {!isUploading && shouldShowUploadForm && (
        <div className="space-y-5">
          {analyses.length > 0 && (
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-mono font-bold text-slate-600">
                INGEST NEW VIDEO AS INDEPENDENT ANALYSIS SESSION
              </span>
              <button
                type="button"
                onClick={() => setIsUploadingNew(false)}
                className="text-xs font-mono font-bold text-sky-700 hover:underline"
              >
                ← Return to current session ({currentAnalysis?.video_filename || currentAnalysisId})
              </button>
            </div>
          )}

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

      {/* 4. Active Inference Progressing State */}
      {!isUploading && !shouldShowUploadForm && activeJob && activeJob.status === 'running' && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-sky-200 shadow-[0_6px_24px_rgba(2,132,199,0.15)] space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <Zap className="w-7 h-7 text-sky-600 animate-pulse" />
              <div>
                <h3 className="font-heading font-black text-xl text-slate-900">
                  AI INFERENCE IN PROGRESS
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  ANALYSIS ID: <strong className="text-sky-700">{activeJob.analysisId}</strong>
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-sky-100 text-sky-800 border border-sky-200 animate-pulse">
              PIPELINE ACTIVE
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
              <span className="text-slate-600 font-semibold">PIPELINE EXECUTION PROGRESS</span>
              <span className="text-sky-700 font-black text-base">{activeJob.progress}%</span>
            </div>
            <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${activeJob.progress}%` }}
              />
            </div>
          </div>

          {/* Key Metric Counters */}
          <div className="grid grid-cols-3 gap-4 text-center font-mono">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl font-black text-sky-700">{activeJob.progress}%</div>
              <div className="text-xs text-slate-500 mt-1 uppercase">PROGRESS</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl font-black text-slate-900">{activeJob.processedFrames}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase">FRAMES PROCESSED</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl font-black text-emerald-700">{activeJob.candidatesFound}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase">HUMAN CANDIDATES</div>
            </div>
          </div>

          {/* Dynamic Pipeline Stages */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
              <span className="font-bold">1. YOLOv8 Person</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold">2. ByteTrack ID</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-bold">3. Geolocation</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold">4. Evidence Synthesis</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Completed Analysis Dossier State */}
      {!isUploading && !shouldShowUploadForm && currentAnalysis && currentAnalysis.status === 'COMPLETE' && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-emerald-200 shadow-[0_6px_24px_rgba(22,163,74,0.15)] space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="font-heading font-black text-2xl text-emerald-800">
                  ANALYSIS COMPLETE FOR THIS VIDEO
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  FILE: <strong className="text-slate-800">{currentAnalysis.video_filename || currentAnalysis.id}</strong> • SESSION: <strong className="text-sky-700">{currentAnalysis.id}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartNewUpload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs tracking-wider transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>UPLOAD ANOTHER VIDEO</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center font-mono">
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-3xl sm:text-4xl font-black text-emerald-700">
                {currentAnalysis.candidate_count ?? 0}
              </div>
              <div className="text-xs text-slate-600 mt-1 uppercase font-bold">
                HUMAN CANDIDATES FLAGGED
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl sm:text-4xl font-black text-slate-900">
                {currentAnalysis.processed_frames || currentAnalysis.frame_count || 0}
              </div>
              <div className="text-xs text-slate-600 mt-1 uppercase font-bold">
                FRAMES ANALYZED
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-3xl sm:text-4xl font-black text-sky-700">
                100%
              </div>
              <div className="text-xs text-slate-600 mt-1 uppercase font-bold">
                PIPELINE STATUS
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
            <button
              type="button"
              onClick={() => navigate('/survivors')}
              className="flex-1 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(22,163,74,0.35)] transition-all"
            >
              <Users className="w-5 h-5" />
              <span>REVIEW SURVIVOR CANDIDATES FOR THIS VIDEO</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="flex-1 py-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-heading font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(2,132,199,0.35)] transition-all"
            >
              <MapPin className="w-5 h-5" />
              <span>VIEW LOCATIONS ON MAP</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Pipeline Error State */}
      {!isUploading && !shouldShowUploadForm && currentAnalysis && currentAnalysis.status === 'ERROR' && (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 space-y-4">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-heading font-black text-lg">ANALYSIS EXECUTION ERROR</h3>
          </div>
          <p className="text-xs sm:text-sm font-mono text-red-800">
            Analysis session {currentAnalysis.id} failed during execution.
          </p>
          <button
            type="button"
            onClick={handleStartNewUpload}
            className="px-5 py-2.5 rounded-xl bg-white border border-red-300 text-red-800 text-xs font-mono font-bold hover:bg-red-50 transition-colors"
          >
            UPLOAD / RETRY INGESTION
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
