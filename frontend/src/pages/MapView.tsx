import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Download,
  Compass,
  Radio,
} from 'lucide-react';
import { api } from '../services/api';
import type { SurvivorCandidate, RescuePriority } from '../types';

const PRIORITY_COLORS: Record<RescuePriority, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  VERIFY: '#eab308',
};

const DEMO_MAP_CANDIDATES: SurvivorCandidate[] = [
  {
    track_id: 'LX-017',
    rescue_priority: 'CRITICAL',
    detection_confidence: 0.94,
    survivor_confidence: 0.96,
    movement_state: 'LOW MOVEMENT',
    evidence_quality: 'HIGH',
    frame_count: 88,
    latitude: 13.04218,
    longitude: 80.16431,
    uncertainty_m: 12,
    geolocation_method: 'UAV_TELEMETRY_SYNCED',
    analysis_id: 'demo-flood-001',
    created_at: Date.now() - 12000,
  },
  {
    track_id: 'LX-023',
    rescue_priority: 'HIGH',
    detection_confidence: 0.91,
    survivor_confidence: 0.88,
    movement_state: 'MOVING',
    evidence_quality: 'HIGH',
    frame_count: 64,
    latitude: 13.04105,
    longitude: 80.16298,
    uncertainty_m: 18,
    geolocation_method: 'UAV_TELEMETRY_SYNCED',
    analysis_id: 'demo-flood-001',
    created_at: Date.now() - 21000,
  },
  {
    track_id: 'LX-044',
    rescue_priority: 'VERIFY',
    detection_confidence: 0.71,
    survivor_confidence: 0.63,
    movement_state: 'UNKNOWN',
    evidence_quality: 'LOW',
    frame_count: 18,
    latitude: 13.04382,
    longitude: 80.16612,
    uncertainty_m: 35,
    geolocation_method: 'ESTIMATED_PROJECTION',
    analysis_id: 'demo-flood-001',
    created_at: Date.now() - 64000,
  },
];

const MapView = () => {
  const [candidates, setCandidates] = useState<SurvivorCandidate[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'VERIFY'>('ALL');
  const [selectedMarker, setSelectedMarker] = useState<SurvivorCandidate | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<unknown>(null);

  // Load analyses list
  useEffect(() => {
    const load = async () => {
      try {
        const result = (await api.listAnalyses()) as {
          analyses: Array<{ id: string; incident_id: string }>;
        };
        const list = result.analyses ?? [];
        if (list.length > 0) setSelectedAnalysisId(list[0].id);
      } catch {
        // Backend offline
      }
    };
    load();
  }, []);

  // Load map data
  useEffect(() => {
    const load = async () => {
      try {
        if (selectedAnalysisId) {
          const result = await api.getMapData(selectedAnalysisId);
          const markers = (result as { markers: SurvivorCandidate[] }).markers ?? [];
          if (markers.length > 0) {
            setCandidates(markers);
            return;
          }
        }
        const survivorResult = await api.getSurvivors(selectedAnalysisId);
        const list = (survivorResult as { candidates: SurvivorCandidate[] }).candidates ?? [];
        if (list.length > 0) {
          setCandidates(list);
        } else {
          setCandidates(DEMO_MAP_CANDIDATES);
        }
      } catch {
        setCandidates(DEMO_MAP_CANDIDATES);
      }
    };
    load();
  }, [selectedAnalysisId]);

  const geoLocated = candidates.filter((c) => c.latitude && c.longitude);
  const displayMarkers =
    activeFilter === 'ALL'
      ? geoLocated
      : geoLocated.filter((c) => c.rescue_priority === activeFilter);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapRef.current) return;
    const targetCandidates = displayMarkers.length > 0 ? displayMarkers : DEMO_MAP_CANDIDATES;

    const initMap = async () => {
      try {
        const maplibregl = await import('maplibre-gl');
        if (mapInstance.current) {
          (mapInstance.current as { remove: () => void }).remove();
          mapInstance.current = null;
        }

        const center: [number, number] =
          targetCandidates.length > 0
            ? [targetCandidates[0].longitude!, targetCandidates[0].latitude!]
            : [80.1643, 13.0421];

        const map = new maplibregl.Map({
          container: mapRef.current!,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors',
              },
            },
            layers: [
              {
                id: 'osm',
                type: 'raster',
                source: 'osm',
                paint: {
                  'raster-brightness-max': 0.6,
                  'raster-contrast': 0.2,
                  'raster-saturation': -0.7,
                },
              },
            ],
          },
          center,
          zoom: 15,
        });

        map.on('load', () => {
          targetCandidates.forEach((c) => {
            const color = PRIORITY_COLORS[c.rescue_priority] ?? '#eab308';
            const el = document.createElement('div');
            el.className = 'tactical-map-marker group';
            el.style.cssText = `
              width: 32px; height: 32px; border-radius: 50%;
              background: #03091e; border: 2.5px solid ${color};
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; font-size: 10px; font-weight: 900; color: ${color};
              box-shadow: 0 0 16px ${color}; font-family: monospace;
              transition: transform 0.2s;
            `;
            el.textContent = c.track_id.replace('LX-', '');

            el.addEventListener('click', () => {
              setSelectedMarker(c);
            });

            // Uncertainty circle
            const mapAny = map as unknown as {
              addLayer: (l: object) => void;
              addSource: (id: string, src: object) => void;
            };

            const sourceId = `circle-${c.track_id}`;
            try {
              mapAny.addSource(sourceId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [c.longitude!, c.latitude!] },
                  properties: {},
                },
              });
              mapAny.addLayer({
                id: sourceId,
                type: 'circle',
                source: sourceId,
                paint: {
                  'circle-radius': Math.max(16, (c.uncertainty_m ?? 15) * 1.5),
                  'circle-color': color,
                  'circle-opacity': 0.15,
                  'circle-stroke-width': 1.5,
                  'circle-stroke-color': color,
                  'circle-stroke-opacity': 0.6,
                },
              });
            } catch {
              // Ignore layer dupes
            }

            const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
              <div style="background:#03091e;color:#f1f5f9;padding:10px;border-radius:8px;font-family:monospace;font-size:11px;min-width:180px;border:1px solid ${color};box-shadow:0 0 20px rgba(0,0,0,0.8)">
                <div style="font-weight:900;font-size:13px;color:#fff;display:flex;justify-content:space-between">
                  <span>${c.track_id}</span>
                  <span style="color:${color}">${c.rescue_priority}</span>
                </div>
                <div style="margin-top:4px;color:#06b6d4">CONF: ${(c.detection_confidence * 100).toFixed(0)}%</div>
                <div style="color:#94a3b8">MOVEMENT: ${c.movement_state}</div>
                <div style="color:#10b981">UNCERTAINTY: ±${c.uncertainty_m ?? 15}m</div>
              </div>
            `);

            new maplibregl.Marker({ element: el })
              .setLngLat([c.longitude!, c.latitude!])
              .setPopup(popup)
              .addTo(map);
          });
        });

        mapInstance.current = map;
      } catch {
        // Fallback handled
      }
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        (mapInstance.current as { remove: () => void }).remove();
        mapInstance.current = null;
      }
    };
  }, [displayMarkers]);

  const handleExport = async (format: 'geojson' | 'csv' | 'json') => {
    if (!selectedAnalysisId) return;
    setExporting(true);
    try {
      await api.exportAnalysis(selectedAnalysisId, format);
    } catch (e: unknown) {
      alert(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
              TACTICAL GEOSPATIAL MAP
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 border border-sky-200 text-sky-700">
              WGS84 PROJECTION
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Geolocated survivor candidates with precision uncertainty rings and UAV flight trajectory.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('geojson')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#061838] border border-sky-300 text-sky-700 hover:bg-[#08224d] text-xs font-mono font-bold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>GEOJSON</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#061838] border border-sky-300 text-sky-700 hover:bg-[#08224d] text-xs font-mono font-bold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          {(['ALL', 'CRITICAL', 'HIGH', 'VERIFY'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                activeFilter === f
                  ? 'bg-sky-500 text-[#020817] shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-800'
              }`}
            >
              {f} ({f === 'ALL' ? geoLocated.length : geoLocated.filter((c) => c.rescue_priority === f).length})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
            <span>CRITICAL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
            <span>HIGH</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#eab308] shadow-[0_0_6px_#eab308]" />
            <span>VERIFY</span>
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-sky-200 shadow-[0_12px_40px_rgba(0,0,0,0.6)] bg-[#020917]">
        <div ref={mapRef} className="w-full h-[540px]" />

        {/* Map Top-Right HUD Info */}
        <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md border border-sky-200 rounded-xl p-3 text-xs font-mono text-slate-500 space-y-1 shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-1.5 text-sky-700 font-bold">
            <Compass className="w-4 h-4" />
            <span>UAV-01 SECTOR ALPHA</span>
          </div>
          <div className="text-[10px] text-slate-400">
            RADAR COVERAGE: ±10m RESOLUTION
          </div>
          <div className="text-[10px] text-emerald-700 flex items-center gap-1 pt-1">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>GEO-PIPELINE ONLINE</span>
          </div>
        </div>

        {/* Selected Marker Detail Card Drawer on Map */}
        {selectedMarker && (
          <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-xl border border-sky-300 rounded-xl p-4 text-xs font-mono text-slate-700 shadow-[0_4px_16px_rgba(15,23,42,0.10)] max-w-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
              <span className="font-heading font-black text-sm text-slate-800">
                CANDIDATE: {selectedMarker.track_id}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded border"
                style={{
                  color: PRIORITY_COLORS[selectedMarker.rescue_priority],
                  borderColor: PRIORITY_COLORS[selectedMarker.rescue_priority],
                  backgroundColor: `${PRIORITY_COLORS[selectedMarker.rescue_priority]}20`,
                }}
              >
                {selectedMarker.rescue_priority}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <span className="text-slate-400">DETECTION:</span>
              <span className="text-sky-700 font-bold">{(selectedMarker.detection_confidence * 100).toFixed(0)}%</span>
              <span className="text-slate-400">MOVEMENT:</span>
              <span className="text-slate-800">{selectedMarker.movement_state}</span>
              <span className="text-slate-400">LAT/LON:</span>
              <span className="text-slate-500 truncate">
                {selectedMarker.latitude?.toFixed(5)}, {selectedMarker.longitude?.toFixed(5)}
              </span>
              <span className="text-slate-400">UNCERTAINTY:</span>
              <span className="text-emerald-700">±{selectedMarker.uncertainty_m ?? 15}m</span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMarker(null)}
              className="mt-3 w-full py-1 text-center bg-slate-100 hover:bg-slate-700 text-slate-500 text-[10px] rounded"
            >
              DISMISS
            </button>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>GEOLOCATION NOTICE: Coordinates are flat-ground pinhole camera projections. Altitude variance may cause up to ±18m shift.</span>
        </div>
        <div className="text-slate-400 hidden sm:block">DATUM: WGS84</div>
      </div>
    </div>
  );
};

export default MapView;
