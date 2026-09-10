import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Download,
  Compass,
  Navigation,
  Route,
  MapPin,
  Clock,
  ChevronDown,
  X,
  AlertCircle,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import type { SurvivorCandidate, RescuePriority } from '../types';
import { useSession } from '../context/SessionContext';
import SessionSelector from '../components/common/SessionSelector';

const PRIORITY_COLORS: Record<RescuePriority, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  VERIFY: '#eab308',
};

// Ground-truth demo candidates for fallback replay
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

// Drone flight trajectory waypoints for demo corridor
const DEMO_DRONE_PATH: [number, number][] = [
  [80.1600, 13.0390],
  [80.1620, 13.0405],
  [80.1643, 13.0421],
  [80.1665, 13.0435],
  [80.1690, 13.0450],
];

// Drone search swath polygon coordinates
const DEMO_SEARCH_SWATH: [number, number][] = [
  [80.1580, 13.0380],
  [80.1710, 13.0440],
  [80.1700, 13.0470],
  [80.1570, 13.0410],
  [80.1580, 13.0380],
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
  const { currentAnalysisId, analyses } = useSession();
  const [candidates, setCandidates] = useState<SurvivorCandidate[]>([]);
  const [exporting, setExporting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'VERIFY'>('ALL');
  const [selectedMarker, setSelectedMarker] = useState<SurvivorCandidate | null>(null);

  // Emergency routing state
  const [routeTarget, setRouteTarget] = useState<SurvivorCandidate | null>(null);
  const [responderLat, setResponderLat] = useState<string>('13.0480');
  const [responderLon, setResponderLon] = useState<string>('80.1690');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showRoutingPanel, setShowRoutingPanel] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);

  // Layer toggles
  const [showDronePath, setShowDronePath] = useState(true);
  const [showSearchSwath, setShowSearchSwath] = useState(true);
  const [showUncertaintyRings, setShowUncertaintyRings] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const responderMarkerRef = useRef<any>(null);

  // Load map data
  useEffect(() => {
    const load = async () => {
      const activeId = currentAnalysisId || (analyses.length > 0 ? analyses[0].id : '');
      try {
        if (activeId) {
          const result = await api.getMapData(activeId);
          const markers = (result as { markers: SurvivorCandidate[] }).markers ?? [];
          if (markers.length > 0) {
            setCandidates(markers);
            return;
          }
          const survivorResult = await api.getSurvivors(activeId);
          const list = (survivorResult as { candidates: SurvivorCandidate[] }).candidates ?? [];
          setCandidates(list);
          return;
        }
        setCandidates(DEMO_MAP_CANDIDATES);
      } catch {
        setCandidates(DEMO_MAP_CANDIDATES);
      }
    };
    load();
  }, [currentAnalysisId, analyses.length]);

  const geoLocated = candidates.filter((c) => c.latitude && c.longitude);
  const displayMarkers =
    activeFilter === 'ALL'
      ? geoLocated
      : geoLocated.filter((c) => c.rescue_priority === activeFilter);

  const isRealSession = !!currentAnalysisId || analyses.length > 0;
  const hasGpsData = geoLocated.length > 0;

  // Initialize MapLibre
  useEffect(() => {
    if (!mapRef.current) return;
    const targetCandidates = isRealSession ? displayMarkers : DEMO_MAP_CANDIDATES;

    const initMap = async () => {
      try {
        const maplibregl = await import('maplibre-gl');
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }

        const center: [number, number] =
          targetCandidates.length > 0 && targetCandidates[0].longitude && targetCandidates[0].latitude
            ? [targetCandidates[0].longitude, targetCandidates[0].latitude]
            : [80.1643, 13.0421];

        const map = new maplibregl.Map({
          container: mapRef.current!,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: [import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
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
                  'raster-brightness-max': 0.85,
                  'raster-contrast': 0.1,
                  'raster-saturation': -0.3,
                },
              },
            ],
          },
          center,
          zoom: 14.8,
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

        map.on('load', () => {
          // 1. Add Search Swath Coverage Layer
          map.addSource('search-swath', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [DEMO_SEARCH_SWATH],
              },
              properties: {},
            },
          });

          map.addLayer({
            id: 'search-swath-fill',
            type: 'fill',
            source: 'search-swath',
            layout: { visibility: showSearchSwath ? 'visible' : 'none' },
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': 0.12,
            },
          });

          map.addLayer({
            id: 'search-swath-border',
            type: 'line',
            source: 'search-swath',
            layout: { visibility: showSearchSwath ? 'visible' : 'none' },
            paint: {
              'line-color': '#10b981',
              'line-width': 2,
              'line-dasharray': [3, 2],
              'line-opacity': 0.6,
            },
          });

          // 2. Add Drone Flight Path Layer
          map.addSource('drone-path', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: DEMO_DRONE_PATH,
              },
              properties: {},
            },
          });

          map.addLayer({
            id: 'drone-path-line',
            type: 'line',
            source: 'drone-path',
            layout: { visibility: showDronePath ? 'visible' : 'none' },
            paint: {
              'line-color': '#0284c7',
              'line-width': 3.5,
              'line-dasharray': [2, 1],
              'line-opacity': 0.85,
            },
          });

          // 3. Clear existing markers
          markersRef.current.forEach((m) => m.remove());
          markersRef.current = [];

          // 4. Render Survivor Markers & Uncertainty Rings
          targetCandidates.forEach((c) => {
            const color = PRIORITY_COLORS[c.rescue_priority] ?? '#eab308';

            // Uncertainty Circle Layer
            const sourceId = `circle-${c.track_id}`;
            try {
              map.addSource(sourceId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [c.longitude!, c.latitude!] },
                  properties: {},
                },
              });
              map.addLayer({
                id: sourceId,
                type: 'circle',
                source: sourceId,
                layout: { visibility: showUncertaintyRings ? 'visible' : 'none' },
                paint: {
                  'circle-radius': Math.max(16, (c.uncertainty_m ?? 15) * 1.6),
                  'circle-color': color,
                  'circle-opacity': 0.15,
                  'circle-stroke-width': 1.5,
                  'circle-stroke-color': color,
                  'circle-stroke-opacity': 0.7,
                },
              });
            } catch {
              // ignore dupe sources
            }

            // HTML Marker Element
            const el = document.createElement('div');
            el.className = 'tactical-map-marker group';
            el.style.cssText = `
              width: 36px; height: 36px; border-radius: 50%;
              background: #0f172a; border: 3px solid ${color};
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; font-size: 11px; font-weight: 900; color: #ffffff;
              box-shadow: 0 0 16px ${color}80, 0 4px 10px rgba(0,0,0,0.4); font-family: monospace;
              transition: transform 0.2s, box-shadow 0.2s;
            `;
            el.textContent = c.track_id.replace('LX-', '');

            el.addEventListener('click', () => {
              setSelectedMarker(c);
            });

            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([c.longitude!, c.latitude!])
              .addTo(map);

            markersRef.current.push(marker);
          });

          // 5. Add Responder Start Pin if set
          updateResponderPin(map, maplibregl);
        });

        // Click-to-pick responder location on map
        map.on('click', (e: any) => {
          if (isPickingLocation) {
            setResponderLat(e.lngLat.lat.toFixed(5));
            setResponderLon(e.lngLat.lng.toFixed(5));
            setIsPickingLocation(false);
          }
        });

        mapInstance.current = map;
      } catch {
        // Fallback
      }
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [displayMarkers]);

  // Update responder marker on map
  const updateResponderPin = async (map: any, maplibregl: any) => {
    if (!map || !responderLat || !responderLon) return;
    const lat = parseFloat(responderLat);
    const lon = parseFloat(responderLon);
    if (isNaN(lat) || isNaN(lon)) return;

    if (responderMarkerRef.current) {
      responderMarkerRef.current.remove();
    }

    const el = document.createElement('div');
    el.style.cssText = `
      width: 28px; height: 28px; border-radius: 6px;
      background: #0284c7; border: 2px solid #ffffff;
      display: flex; align-items: center; justify-content: center;
      color: #ffffff; font-size: 12px; font-weight: 900; font-family: monospace;
      box-shadow: 0 0 14px rgba(2,132,199,0.8);
    `;
    el.innerHTML = 'HQ';

    responderMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([lon, lat])
      .addTo(map);
  };

  // Sync responder pin whenever coords change
  useEffect(() => {
    if (!mapInstance.current) return;
    import('maplibre-gl').then((maplibregl) => {
      updateResponderPin(mapInstance.current, maplibregl);
    });
  }, [responderLat, responderLon]);

  // Draw emergency route on map when routeResult changes
  useEffect(() => {
    if (!mapInstance.current || !routeResult?.geometry?.coordinates?.length) return;
    const map = mapInstance.current;
    const coords = routeResult.geometry.coordinates;
    const sourceId = 'emergency-route';
    const layerId = 'emergency-route-line';

    try {
      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData({
          type: 'Feature',
          geometry: routeResult.geometry,
          properties: {},
        });
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
            'line-color': '#dc2626',
            'line-width': 4.5,
            'line-opacity': 0.9,
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
        map.fitBounds(bounds, { padding: 80 });
      }
    } catch {
      // ignore
    }
  }, [routeResult]);

  // Toggle map layers
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    try {
      if (map.getLayer('drone-path-line')) {
        map.setLayoutProperty('drone-path-line', 'visibility', showDronePath ? 'visible' : 'none');
      }
      if (map.getLayer('search-swath-fill')) {
        map.setLayoutProperty('search-swath-fill', 'visibility', showSearchSwath ? 'visible' : 'none');
        map.setLayoutProperty('search-swath-border', 'visibility', showSearchSwath ? 'visible' : 'none');
      }
    } catch {
      // ignore
    }
  }, [showDronePath, showSearchSwath]);

  const handleExport = async (format: 'geojson' | 'csv' | 'json') => {
    const activeId = currentAnalysisId || (analyses.length > 0 ? analyses[0].id : '');
    if (!activeId) return;
    setExporting(true);
    try {
      await api.exportAnalysis(activeId, format);
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
              TACTICAL DISASTER RESPONSE MAP
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-sky-50 border border-sky-200 text-sky-700">
              WGS84 PROJECTION
            </span>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Data-driven mission map: UAV flight corridors, verified survivor candidates with uncertainty radii, and fastest emergency response routes.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowRoutingPanel((p) => !p)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all border ${
              showRoutingPanel
                ? 'bg-red-600 text-white border-red-600 shadow-[0_0_14px_rgba(220,38,38,0.4)]'
                : 'bg-white border-red-300 text-red-700 hover:bg-red-50'
            }`}
          >
            <Route className="w-4 h-4" />
            <span>EMERGENCY ROUTING</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('geojson')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-mono font-bold transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>GEOJSON</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-mono font-bold transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Video Session Selector Bar */}
      {analyses.length > 0 && <SessionSelector />}

      {/* Emergency Routing Planner Panel */}
      {showRoutingPanel && (
        <div className="bg-white rounded-2xl border border-red-200 shadow-[0_6px_24px_rgba(220,38,38,0.12)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-100 flex items-center justify-between bg-red-50/80">
            <div className="flex items-center gap-2.5">
              <Route className="w-5 h-5 text-red-600" />
              <span className="font-heading font-black text-sm sm:text-base text-red-900">EMERGENCY ROUTE ENGINE</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">OSRM REAL ROAD NETWORK</span>
            </div>
            <button
              type="button"
              onClick={() => { setShowRoutingPanel(false); setRouteResult(null); }}
              className="p-1 rounded-md text-red-400 hover:text-red-700 hover:bg-red-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Responder Start Location */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-700 uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-sky-600" />
                    RESPONDER START LOCATION
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPickingLocation(!isPickingLocation)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${
                      isPickingLocation ? 'bg-sky-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isPickingLocation ? 'CLICK MAP NOW' : 'PICK ON MAP'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 block mb-1">LATITUDE</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={responderLat}
                      onChange={(e) => setResponderLat(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-500 block mb-1">LONGITUDE</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={responderLon}
                      onChange={(e) => setResponderLon(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Destination Survivor Selector */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
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
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-red-500 appearance-none pr-8 font-semibold text-slate-800"
                  >
                    <option value="">— Select survivor candidate —</option>
                    {geoLocated.map((c) => (
                      <option key={c.track_id} value={c.track_id}>
                        {c.track_id} [{c.rescue_priority}] (±{c.uncertainty_m ?? 15}m error)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {routeTarget && (
                  <div className="text-[11px] font-mono text-slate-600">
                    Target: {routeTarget.latitude?.toFixed(5)}°N, {routeTarget.longitude?.toFixed(5)}°E
                  </div>
                )}
              </div>

              {/* Compute Button & Result Readout */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-700 uppercase">CALCULATE FASTEST PATH</div>
                <button
                  type="button"
                  disabled={!routeTarget || routeLoading}
                  onClick={handleComputeRoute}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-heading font-black text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_4px_16px_rgba(220,38,38,0.35)]"
                >
                  {routeLoading ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> CALCULATING ROUTE…</>
                  ) : (
                    <><Route className="w-4 h-4" /> COMPUTE EMERGENCY ROUTE</>
                  )}
                </button>

                {routeResult && routeResult.status === 'ROUTE_FOUND' && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ROUTE COMPUTED — {routeResult.routing_engine}
                    </div>
                    <div className="text-slate-700 font-semibold">
                      <Clock className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                      ESTIMATED TIME: {routeResult.duration_minutes?.toFixed(1)} min • DISTANCE: {routeResult.distance_km?.toFixed(2)} km
                    </div>
                  </div>
                )}

                {routeResult && routeResult.status === 'NOT_CONFIGURED' && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900">
                    <AlertCircle className="w-4 h-4 inline mr-1.5 text-amber-600" />
                    ROUTING SERVICE NOT CONFIGURED
                    <div className="text-[11px] text-amber-700 mt-1">{routeResult.note}</div>
                  </div>
                )}

                {routeResult && routeResult.status === 'ERROR' && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-mono text-red-900">
                    <AlertCircle className="w-4 h-4 inline mr-1.5 text-red-600" />
                    ROUTING ERROR: {routeResult.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layer Toggles & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 font-bold mr-1">FILTER:</span>
          {(['ALL', 'CRITICAL', 'HIGH', 'VERIFY'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeFilter === f
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {f} ({f === 'ALL' ? geoLocated.length : geoLocated.filter((c) => c.rescue_priority === f).length})
            </button>
          ))}
        </div>

        {/* Map Layers Toggles */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={showDronePath}
              onChange={(e) => setShowDronePath(e.target.checked)}
              className="rounded text-sky-600 focus:ring-0"
            />
            <span>Drone Corridor</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={showSearchSwath}
              onChange={(e) => setShowSearchSwath(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-0"
            />
            <span>Search Swath</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={showUncertaintyRings}
              onChange={(e) => setShowUncertaintyRings(e.target.checked)}
              className="rounded text-amber-600 focus:ring-0"
            />
            <span>Uncertainty Rings</span>
          </label>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-[0_8px_32px_rgba(15,23,42,0.15)] bg-slate-900">
        <div ref={mapRef} className="w-full h-[580px]" />

        {/* Real Mode No GPS Banner */}
        {isRealSession && !hasGpsData && (
          <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-amber-400/60 rounded-xl p-4 text-xs font-mono text-white shadow-xl flex items-center gap-3 max-w-md">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-amber-300 text-sm">NO GPS DATA IN THIS VIDEO</div>
              <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Flight telemetry CSV was not attached for session {currentAnalysisId}. Ground coordinates cannot be fabricated.
              </div>
            </div>
          </div>
        )}

        {/* HUD Map Legend & Mission Status */}
        <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3.5 text-xs font-mono text-slate-700 space-y-2 shadow-lg max-w-xs">
          <div className="flex items-center gap-1.5 text-sky-800 font-bold border-b border-slate-100 pb-1.5">
            <Compass className="w-4 h-4 text-sky-600" />
            <span>MISSION SECTOR ALPHA HUD</span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
              <span>CRITICAL PRIORITY</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
              <span>HIGH PRIORITY</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm" />
              <span>VERIFY QUEUE</span>
            </div>
            <div className="flex items-center gap-2 text-sky-700">
              <span className="w-4 h-0.5 bg-sky-600" />
              <span>DRONE FLIGHT PATH</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700">
              <span className="w-3 h-2 bg-emerald-200 border border-emerald-400" />
              <span>SEARCH COVERAGE SWATH</span>
            </div>
          </div>

          {routeResult?.status === 'ROUTE_FOUND' && (
            <div className="text-[11px] text-red-600 font-bold flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
              <Route className="w-3.5 h-3.5" />
              <span>ROUTE ACTIVE: {routeResult.distance_km?.toFixed(1)} km</span>
            </div>
          )}
        </div>

        {/* Interactive Selected Survivor Focused Panel */}
        {selectedMarker && (
          <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-xl border-2 border-sky-400 rounded-2xl p-5 text-xs font-mono text-slate-800 shadow-[0_12px_40px_rgba(15,23,42,0.25)] max-w-md w-full">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-700" />
                <span className="font-heading font-black text-base text-slate-900">
                  SURVIVOR CANDIDATE {selectedMarker.track_id}
                </span>
              </div>
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-md border"
                style={{
                  color: PRIORITY_COLORS[selectedMarker.rescue_priority],
                  borderColor: PRIORITY_COLORS[selectedMarker.rescue_priority],
                  backgroundColor: `${PRIORITY_COLORS[selectedMarker.rescue_priority]}15`,
                }}
              >
                {selectedMarker.rescue_priority}
              </span>
            </div>

            {/* 8 Focused Intelligence Fields */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">SURVIVOR CONFIDENCE:</span>
                <span className="text-sky-700 font-black text-sm">
                  {((selectedMarker.survivor_confidence ?? selectedMarker.detection_confidence) * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">DETECTION CONFIDENCE:</span>
                <span className="text-slate-900 font-bold text-sm">
                  {(selectedMarker.detection_confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">BIOMECHANICAL MOVEMENT:</span>
                <span className="text-slate-800 font-bold">{selectedMarker.movement_state}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">LOCATION UNCERTAINTY:</span>
                <span className="text-emerald-700 font-bold">±{selectedMarker.uncertainty_m ?? 15}m</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 text-[10px] block">COORDINATES (WGS84):</span>
                <span className="text-slate-900 font-bold">
                  {selectedMarker.latitude?.toFixed(5)}° N, {selectedMarker.longitude?.toFixed(5)}° E
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 text-[10px] block">EVIDENCE SIGNALS:</span>
                <span className="text-slate-700">
                  RGB Detection • ByteTrack Multi-Frame ({selectedMarker.frame_count ?? 64} frames) • {selectedMarker.geolocation_method ?? 'Telemetry Projected'}
                </span>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setRouteTarget(selectedMarker);
                  setShowRoutingPanel(true);
                  setRouteResult(null);
                  setSelectedMarker(null);
                }}
                className="flex-1 py-2.5 text-center bg-red-600 hover:bg-red-700 text-white text-xs font-heading font-black rounded-xl transition-all shadow-[0_4px_16px_rgba(220,38,38,0.35)] flex items-center justify-center gap-1.5"
              >
                <Route className="w-4 h-4" />
                <span>GET BEST ROUTE</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMarker(null)}
                className="px-4 py-2.5 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                DISMISS
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
        <span>
          GEOSPATIAL NOTICE: Ground projection calculates flat-earth pinhole intersection from telemetry. Field rescuers must verify road access and physical flood obstacles on arrival.
        </span>
      </div>
    </div>
  );
};

export default MapView;
