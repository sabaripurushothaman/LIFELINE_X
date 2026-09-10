import { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Square,
  RefreshCw,
  Film,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type CameraStatus = 'requesting' | 'permission_required' | 'streaming' | 'unavailable' | 'stopped';

const LiveCamera = () => {
  const [status, setStatus] = useState<CameraStatus>('requesting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isSimulatingInference, setIsSimulatingInference] = useState(true);
  const [detectionCount] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  const startCamera = async () => {
    setStatus('requesting');
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('unavailable');
        setErrorMessage('Browser does not support media device camera streaming.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          facingMode: 'environment',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            setVideoDimensions({
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            });
            setStatus('streaming');
          }
        };
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('permission_required');
        setErrorMessage('Camera access was denied by browser settings. Please allow camera permissions.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setStatus('unavailable');
        setErrorMessage('No physical RGB camera or webcam device detected.');
      } else {
        setStatus('unavailable');
        setErrorMessage(err.message || 'Unable to access live camera feed.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('stopped');
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Overlay inference loop on canvas
  useEffect(() => {
    if (status !== 'streaming' || !isSimulatingInference) return;
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw simulated AI bounding box on center
      const w = canvas.width;
      const h = canvas.height;
      const boxX = w * 0.35;
      const boxY = h * 0.25;
      const boxW = w * 0.3;
      const boxH = h * 0.5;

      // Box outline
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Header label tag
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(boxX, boxY - 26, 175, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('PERSON LX-019 • 93%', boxX + 8, boxY - 8);

      // Status sub-tag
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(boxX, boxY + boxH + 4, 150, 22);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px monospace';
      ctx.fillText('LOW MOVEMENT', boxX + 8, boxY + boxH + 19);
    }, 100);

    return () => clearInterval(interval);
  }, [status, isSimulatingInference]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
              LIVE OPTICAL CAMERA FEED
            </h1>
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold border ${
              status === 'streaming'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {status === 'streaming' ? 'WEBCAM STREAM ONLINE' : 'OPTIONAL CAMERA MODE'}
            </span>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Real-time RGB camera feed via browser / laptop webcam for live operator demonstration with automated overlay detection.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/analysis')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-heading font-black tracking-wider transition-all shadow-sm"
          >
            <Film className="w-4 h-4" />
            <span>SWITCH TO RECORDED VIDEO</span>
          </button>
        </div>
      </div>

      {/* Main Camera Viewport or Fallback State */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-300 shadow-[0_8px_32px_rgba(15,23,42,0.15)] min-h-[480px] flex items-center justify-center">

        {/* Video Canvas Container */}
        <div className={`relative w-full h-[520px] flex items-center justify-center ${status === 'streaming' ? 'block' : 'hidden'}`}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Viewfinder HUD Overlay */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE RGB STREAM</span>
            </div>
            <div className="text-[11px] text-slate-300">
              RESOLUTION: {videoDimensions.width} × {videoDimensions.height}
            </div>
            <div className="text-[11px] text-sky-400">
              TARGETS: {detectionCount} DETECTED
            </div>
          </div>

          {/* Viewfinder HUD Bottom */}
          <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-300">
              SOURCE: LOCAL RGB OPTICAL SENSOR
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSimulatingInference(!isSimulatingInference)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                  isSimulatingInference ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                AI OVERLAY {isSimulatingInference ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-bold transition-all"
              >
                STOP STREAM
              </button>
            </div>
          </div>
        </div>

        {/* State: Permission Required */}
        {status === 'permission_required' && (
          <div className="p-8 max-w-md text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-heading font-black text-white">
              CAMERA PERMISSION REQUIRED
            </h3>
            <p className="text-xs sm:text-sm font-mono text-slate-300 leading-relaxed">
              Browser webcam access is needed to demonstrate live camera search. Please grant camera permission when prompted.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={startCamera}
                className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-heading font-bold text-xs sm:text-sm tracking-wider transition-all"
              >
                ALLOW CAMERA ACCESS
              </button>
              <button
                type="button"
                onClick={() => navigate('/analysis')}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-heading font-bold text-xs sm:text-sm tracking-wider transition-all"
              >
                SWITCH TO RECORDED VIDEO
              </button>
            </div>
          </div>
        )}

        {/* State: Unavailable */}
        {status === 'unavailable' && (
          <div className="p-8 max-w-md text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-heading font-black text-white">
              LIVE CAMERA UNAVAILABLE
            </h3>
            <p className="text-xs sm:text-sm font-mono text-slate-300 leading-relaxed">
              {errorMessage || 'No connected camera or webcam was found on this system.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/analysis')}
                className="w-full py-3.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-heading font-black text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(2,132,199,0.35)] transition-all"
              >
                <Film className="w-4 h-4" />
                <span>SWITCH TO RECORDED DRONE VIDEO</span>
              </button>
            </div>
          </div>
        )}

        {/* State: Stopped */}
        {status === 'stopped' && (
          <div className="p-8 max-w-md text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto">
              <Square className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-heading font-black text-white">
              STREAM PAUSED
            </h3>
            <p className="text-xs sm:text-sm font-mono text-slate-400">
              Live webcam feed is currently stopped.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={startCamera}
                className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-heading font-bold text-xs sm:text-sm transition-all"
              >
                RESTART CAMERA
              </button>
              <button
                type="button"
                onClick={() => navigate('/analysis')}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-heading font-bold text-xs sm:text-sm transition-all"
              >
                USE RECORDED VIDEO
              </button>
            </div>
          </div>
        )}

        {/* State: Requesting */}
        {status === 'requesting' && (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
            <div className="text-sm font-mono text-slate-300 font-bold">CONNECTING TO CAMERA SENSOR…</div>
          </div>
        )}
      </div>

      {/* Operational Information Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-slate-600">
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-bold">MODE</span>
          <span className="text-slate-900 font-bold">OPTIONAL LIVE CAMERA (WEBCAM)</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-bold">PRIMARY WORKFLOW</span>
          <span className="text-sky-700 font-bold">RECORDED DRONE FOOTAGE (4K)</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-bold">HARDWARE REQUIREMENT</span>
          <span className="text-emerald-700 font-bold">NONE (WORKS ON LAPTOP WEBCAM)</span>
        </div>
      </div>
    </div>
  );
};

export default LiveCamera;
