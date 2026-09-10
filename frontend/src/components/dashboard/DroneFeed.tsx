import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Video,
  Radio,
  Crosshair,
  Compass,
} from 'lucide-react';

const DroneFeed: FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [frameIndex, setFrameIndex] = useState(4382);
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0x');
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>('LX-017');

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev >= 4450 ? 4380 : prev + 1));
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const telemetry = {
    uavId: 'UAV-FLOOD-01',
    altitude: '82m AGL',
    speed: '14.2 m/s',
    heading: '127° SE',
    lat: '13.04218° N',
    lon: '80.16431° E',
    battery: '84%',
    signal: '98%',
    resolution: '4K UHD • 30 FPS',
  };

  const detections = [
    {
      id: 'LX-017',
      label: 'PERSON CANDIDATE',
      confidence: 94,
      priority: 'CRITICAL',
      movement: 'LOW MOVEMENT',
      box: { top: '44%', left: '38%', width: '14%', height: '22%' },
      color: '#dc2626',
    },
    {
      id: 'LX-023',
      label: 'PERSON CANDIDATE',
      confidence: 87,
      priority: 'HIGH',
      movement: 'MOVING',
      box: { top: '32%', left: '68%', width: '11%', height: '18%' },
      color: '#d97706',
    },
    {
      id: 'LX-031',
      label: 'HEAT SIGNATURE',
      confidence: 76,
      priority: 'HIGH',
      movement: 'STATIONARY',
      box: { top: '65%', left: '22%', width: '13%', height: '20%' },
      color: '#0891b2',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.10)] overflow-hidden flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-600">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 font-heading flex items-center gap-2">
              DRONE RECONNAISSANCE FEED
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 font-mono">
                {telemetry.uavId}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              SENSOR: RGB-OPTICAL 4K • SYNCHRONIZED
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-50 border border-amber-200 text-amber-700">
            DEMO / SIMULATION
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span>REC</span>
          </div>
        </div>
      </div>

      {/* Video Viewport — dark aerial simulation */}
      <div className="relative aspect-video w-full bg-[#051926] overflow-hidden select-none group drone-viewport">
        {/* SVG Aerial Flood Terrain */}
        <div className="absolute inset-0">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 600">
            <defs>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0a2c4a" />
                <stop offset="50%" stopColor="#0d3b63" />
                <stop offset="100%" stopColor="#071e35" />
              </linearGradient>
              <linearGradient id="mudGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#233448" />
                <stop offset="100%" stopColor="#131e2e" />
              </linearGradient>
              <pattern id="feedGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(14,165,233,0.07)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="1000" height="600" fill="url(#waterGrad)" />
            {/* Flooded terrain / rooftops */}
            <polygon points="120,420 280,380 340,490 190,560" fill="url(#mudGrad)" opacity="0.9" stroke="#2d4a6b" strokeWidth="2" />
            <polygon points="560,180 720,150 780,240 640,290" fill="url(#mudGrad)" opacity="0.9" stroke="#2d4a6b" strokeWidth="2" />
            <polygon points="320,240 450,210 490,320 370,360" fill="#1a3555" opacity="0.75" stroke="#3a5f84" strokeWidth="1.5" />
            {/* Flow lines */}
            <path d="M 0,300 Q 250,260 500,320 T 1000,280" fill="none" stroke="rgba(56,189,248,0.12)" strokeWidth="8" strokeDasharray="20 10" />
            <path d="M 0,380 Q 300,350 600,410 T 1000,370" fill="none" stroke="rgba(14,165,233,0.09)" strokeWidth="6" strokeDasharray="30 15" />
            {/* Grid overlay */}
            <rect width="1000" height="600" fill="url(#feedGrid)" />
          </svg>
        </div>

        {/* Scanline animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent shadow-[0_0_12px_rgba(14,165,233,0.8)] animate-scanline" />
        </div>

        {/* Center UAV crosshair */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-24 h-24 border border-sky-400/25 rounded-full flex items-center justify-center">
            <div className="w-4 h-[1px] bg-sky-400/70 absolute left-1" />
            <div className="w-4 h-[1px] bg-sky-400/70 absolute right-1" />
            <div className="h-4 w-[1px] bg-sky-400/70 absolute top-1" />
            <div className="h-4 w-[1px] bg-sky-400/70 absolute bottom-1" />
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(14,165,233,0.9)]" />
          </div>
        </div>

        {/* HUD — Top Left: Geo */}
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-sky-400/25 rounded-lg p-2 text-[10px] font-mono text-slate-300 space-y-0.5">
          <div className="flex items-center gap-1.5 text-sky-400 font-bold">
            <Compass className="w-3 h-3" />
            <span>GEO: {telemetry.lat}</span>
          </div>
          <div className="pl-4 text-slate-400">{telemetry.lon}</div>
          <div className="flex items-center gap-1 text-emerald-400 pt-0.5">
            <Radio className="w-3 h-3" />
            <span>FRAME #{frameIndex}</span>
          </div>
        </div>

        {/* HUD — Top Right: Flight Stats */}
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm border border-sky-400/25 rounded-lg p-2 text-[10px] font-mono text-slate-300 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">ALT:</span>
            <span className="text-sky-400 font-bold">{telemetry.altitude}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">SPD:</span>
            <span className="text-white font-bold">{telemetry.speed}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">HDG:</span>
            <span className="text-white font-bold">{telemetry.heading}</span>
          </div>
        </div>

        {/* AI Detection Bounding Boxes */}
        {detections.map((det) => {
          const isSelected = activeCandidateId === det.id;
          return (
            <div
              key={det.id}
              onClick={() => setActiveCandidateId(det.id)}
              className={`absolute cursor-pointer transition-all duration-200 ${
                isSelected ? 'z-20 scale-105' : 'z-10 hover:scale-102'
              }`}
              style={{
                top: det.box.top,
                left: det.box.left,
                width: det.box.width,
                height: det.box.height,
              }}
            >
              {/* Bounding box */}
              <div
                className="absolute inset-0 border-2 rounded-sm transition-all"
                style={{
                  borderColor: det.color,
                  boxShadow: isSelected ? `0 0 16px ${det.color}` : `0 0 6px ${det.color}88`,
                  backgroundColor: `${det.color}18`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                  <Crosshair className="w-4 h-4" style={{ color: det.color }} />
                </div>
              </div>

              {/* Label above */}
              <div
                className="absolute bottom-full left-0 mb-1 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold whitespace-nowrap shadow-lg flex items-center gap-1 border"
                style={{
                  backgroundColor: '#050d1a',
                  borderColor: det.color,
                  color: det.color,
                }}
              >
                <span className="font-black">{det.id}</span>
                <span className="text-white bg-slate-800 px-1 rounded">{det.confidence}%</span>
                <span className="text-[8px] text-slate-300 hidden sm:inline">{det.movement}</span>
              </div>
            </div>
          );
        })}

        {/* Bottom status strip */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[9px] font-mono text-slate-300">
            YOLOv8-SURVIVOR ENSEMBLE ACTIVE
          </div>
          <div className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[9px] font-mono text-slate-300">
            {telemetry.resolution}
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-100 hover:scale-105 transition-all shadow-sm"
            aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setFrameIndex((prev) => Math.max(4300, prev - 10))}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            aria-label="Previous frame"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <div className="text-xs font-mono text-slate-600 font-bold tracking-wider px-1">
            00:14:32:18
          </div>

          <button
            type="button"
            onClick={() => setFrameIndex((prev) => prev + 10)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            aria-label="Next frame"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timeline scrubber */}
        <div className="flex-1 max-w-xs mx-2 hidden sm:block">
          <div className="relative w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-sky-600 transition-all rounded-full"
              style={{ width: `${((frameIndex - 4300) / 150) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const speeds = ['0.5x', '1.0x', '2.0x'];
              const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
              setPlaybackSpeed(next);
            }}
            className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-600 hover:border-sky-300 hover:text-sky-700 transition-all"
          >
            SPD: {playbackSpeed}
          </button>

          <button
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-all"
            aria-label="Fullscreen view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DroneFeed;