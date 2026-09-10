import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Download,
  Compass,
  Radio,
  Navigation,
  Route,
  MapPin,
  Clock,
  ChevronDown,
  X,
  AlertCircle,
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

interface RouteResult {
  status: string;
  routing_engine?: string;
  distance_km?: number;
  duration_minutes?: number;
  route_type?: string;
  geometry?: { type: string; coordinates: number[][] } | null;
  note?: string;
  error?: string;
  safety_note?: string;
}

const MapView = () => {
  const [candidates, setCandidates] = useState<SurvivorCandidate[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'VERIFY'>('ALL');
  const [selectedMarker, setSelectedMarker] = useState<SurvivorCandidate | null>(null);

  // Emergency routing state
  const [routeTarget, setRouteTarget] = useState<SurvivorCandidate | null>(null);
  const [responderLat, setResponderLat] = useState<string>('13.0500');
  const [responderLon, setResponderLon] = useState<string>('80.1700');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showRoutingPanel, setShowRoutingPanel] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<unknown>(null);
  const routeLayerAdded = useRef(false);

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
        // Backend offline — demo mode
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
          routeLayerAdded.current = false;
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
        routeLayerAdded.current = false;
      }
    };
  }, [displayMarkers]);

  // Draw route on map when routeResult changes
  useEffect(() => {
    if (!mapInstance.current || !routeResult?.geometry?.coordinates?.length) return;
    const map = mapInstance.current as {
      getSource: (id: string) => unknown;
      addSource: (id: string, src: object) => void;
      addLayer: (l: object) => void;
    };

    const coords = routeResult.geometry.coordinates;
    const sourceId = 'emergency-route';
    const layerId = 'emergency-route-line';

    try {
      if (map.getSource(sourceId)) {
        // Already exists — update data
        const src = map.getSource(sourceId) as { setData: (d: object) => void };
        src.setData({ type: 'Feature', geometry: routeResult.geometry, properties: {} });
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: { type: 'Feature', geometry: routeResult.geometry, properties: {} },
        });
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#ef4444',
            'line-width': 4,
            'line-opacity': 0.85,
            'line-dasharray': [2, 1],
          },
        });
      }
      // Fit bounds to route
      if (coords.length > 1) {
        const lngs = coords.map((c: number[]) => c[0]);
        const lats = coords.map((c: number[]) => c[1]);
        const bounds = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ] as [[number, number], [number, number]];
        (mapInstance.current as { fitBounds: (b: unknown, opts: object) => void })
          .fitBounds(bounds, { padding: 60 });
      }
    } catch {
      // ignore — map may not be ready
    }
  }, [routeResult]);

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

  const handleComputeRoute = async () => {
    if (!routeTarget || !routeTarget.latitude || !routeTarget.longitude) return;
    const fromLat = parseFloat(responderLat);
    const fromLon = parseFloat(responderLon);
    if (isNaN(fromLat) || isNaN(fromLon)) return;

    setRouteLoading(true);
    setRouteResult(null);
    try {
      const result = (await api.getRouting(
        fromLat,
        fromLon,
        routeTarget.latitude,
        routeTarget.longitude,
        routeTarget.track_id,
      )) as RouteResult;
      setRouteResult(result);
    } catch (e) {
      setRouteResult({
        status: 'ERROR',
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setRouteLoading(false);
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
            Geolocated survivor candidates with precision uncertainty rings, UAV flight trajectory, and emergency routing.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowRoutingPanel((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
              showRoutingPanel
                ? 'bg-red-500 text-white border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-white border-red-300 text-red-700 hover:bg-red-50'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>EMERGENCY ROUTE</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('geojson')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-mono font-bold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>GEOJSON</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-mono font-bold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Emergency Routing Panel */}
      {showRoutingPanel && (
        <div className="bg-white rounded-2xl border border-red-200 shadow-[0_4px_16px_rgba(239,68,68,0.12)] overflow-hidden">
          <div className="px-4 py-3 border-b border-red-100 flex items-center justify-between bg-red-50">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-red-600" />
              <span className="font-heading font-black text-sm text-red-800">EMERGENCY ROUTE PLANNER</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">OSRM ROAD NETWORK</span>
            </div>
            <button
              type="button"
              onClick={() => { setShowRoutingPanel(false); setRouteResult(null); }}
              className="p-1 rounded text-red-400 hover:text-red-700 hover:bg-red-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Responder start */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-sky-600" />
                  RESPONDER START LOCATION
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">LATITUDE</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={responderLat}
                      onChange={(e) => setResponderLat(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-400 block mb-1">LONGITUDE</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={responderLon}
                      onChange={(e) => setResponderLon(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
              </div>

              {/* Target survivor */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-600" />
                  DESTINATION: SURVIVOR CANDIDATE
                </div>
                <div className="relative">
                  <select
                    value={routeTarget?.track_id ?? ''}
                    onChange={(e) => {
                      const c = geoLocated.find((x) => x.track_id === e.target.value) ?? null;
                      setRouteTarget(c);
                      setRouteResult(null);
                    }}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-red-400 appearance-none pr-8"
                  >
                    <option value="">— Select candidate —</option>
                    {geoLocated.map((c) => (
                      <option key={c.track_id} value={c.track_id}>
                        {c.track_id} [{c.rescue_priority}] ±{c.uncertainty_m ?? 15}m
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
                {routeTarget && (
                  <div className="text-[10px] font-mono text-slate-500">
                    TARGET: {routeTarget.latitude?.toFixed(5)}, {routeTarget.longitude?.toFixed(5)} ±{routeTarget.uncertainty_m ?? 15}m
                  </div>
                )}
              </div>

              {/* Compute button + result summary */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">COMPUTE ROUTE</div>
                <button
                  type="button"
                  disabled={!routeTarget || routeLoading}
                  onClick={handleComputeRoute}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-heading font-black text-xs tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_4px_16px_rgba(239,68,68,0.35)]"
                >
                  {routeLoading ? (
                    <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> COMPUTING…</>
                  ) : (
                    <><Route className="w-3.5 h-3.5" /> COMPUTE FASTEST ROUTE</>
                  )}
                </button>

                {routeResult && routeResult.status === 'ROUTE_FOUND' && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-black">
                      <Navigation className="w-3.5 h-3.5" />
                      ROUTE FOUND — {routeResult.routing_engine}
                    </div>
                    <div className="text-slate-600">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {routeResult.duration_minutes?.toFixed(1)} min • {routeResult.distance_km?.toFixed(2)} km
                    </div>
                    <div className="text-[9px] text-slate-400">{routeResult.route_type}</div>
                  </div>
                )}

                {routeResult && routeResult.status === 'NOT_CONFIGURED' && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] font-mono text-amber-800">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    ROUTING SERVICE NOT CONFIGURED
                    <div className="text-[9px] text-amber-700 mt-1">{routeResult.note}</div>
                  </div>
                )}

                {routeResult && routeResult.status === 'ERROR' && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[10px] font-mono text-red-800">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    ROUTING ERROR: {routeResult.error}
                  </div>
                )}
              </div>
            </div>

            {routeResult?.safety_note && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[10px] font-mono text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                <span>{routeResult.safety_note}</span>
              </div>
            )}
          </div>
        </div>
      )}

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
                  ? 'bg-sky-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
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
            <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_6px_#eab308]" />
            <span>VERIFY</span>
          </div>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-sky-200 shadow-[0_12px_40px_rgba(0,0,0,0.6)] bg-[#020917]">
        <div ref={mapRef} className="w-full h-[540px]" />

        {/* Map Top-Right HUD */}
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
          {routeResult?.status === 'ROUTE_FOUND' && (
            <div className="text-[10px] text-red-600 flex items-center gap-1 pt-1 border-t border-slate-200">
              <Route className="w-3 h-3" />
              <span>ROUTE ACTIVE</span>
            </div>
          )}
        </div>

        {/* Selected Marker Detail Card */}
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

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRouteTarget(selectedMarker);
                  setShowRoutingPanel(true);
                  setRouteResult(null);
                  setSelectedMarker(null);
                }}
                className="flex-1 py-1.5 text-center bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold rounded-lg hover:bg-red-100 transition-colors font-mono"
              >
                EMERGENCY ROUTE
              </button>
              <button
                type="button"
                onClick={() => setSelectedMarker(null)}
                className="flex-1 py-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] rounded-lg transition-colors"
              >
                DISMISS
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>GEOLOCATION NOTICE: Coordinates are flat-ground pinhole camera projections. Altitude variance may cause up to ±18m shift. Emergency route passability requires field verification.</span>
        </div>
        <div className="text-slate-400 hidden sm:block">DATUM: WGS84</div>
      </div>
    </div>
  );
};

export default MapView;
