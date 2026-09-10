// Core types for LIFELINE-X frontend

export type RescuePriority = 'CRITICAL' | 'HIGH' | 'VERIFY';
export type MovementState = 'MOVING' | 'LOW MOVEMENT' | 'STATIONARY' | 'OCCLUDED' | 'UNKNOWN';
export type EvidenceQuality = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT AVAILABLE' | 'UNKNOWN';
export type ReviewDecision =
  | 'CONFIRM_SURVIVOR'
  | 'MARK_FALSE_POSITIVE'
  | 'REQUEST_MORE_IMAGERY'
  | 'FLAG_FOR_REVIEW';

export interface SystemComponent {
  label: string;
  status: 'READY' | 'CONNECTED' | 'SIMULATED' | 'NOT CONNECTED' | 'WARNING' | 'ERROR';
  detail: string;
}

export interface SystemStatus {
  overall: string;
  device: string;
  components: SystemComponent[];
  platform: string;
  python_version: string;
  torch_version: string;
  database_type: string;
  uptime_seconds: number;
}

export interface SurvivorCandidate {
  track_id: string;
  analysis_id?: string;
  survivor_confidence: number;
  survivor_candidate_confidence?: number;
  rescue_priority: RescuePriority;
  priority_reason?: string;
  score_breakdown?: Record<string, number | string | boolean>;
  evidence_conflict?: boolean;
  evidence_quality: EvidenceQuality;
  movement_state: MovementState;
  detection_confidence: number;
  frame_count: number;
  latitude?: number;
  longitude?: number;
  uncertainty_m?: number;
  geolocation_method?: string;
  human_review_status?: string;
  human_decision?: string;
  created_at?: number;
}

export interface EvidenceItem {
  source: string;
  available: boolean;
  quality: string;
  value: unknown;
  notes: string;
  frame_number?: number;
  timestamp_seconds?: number;
  track_id?: string;
}

export interface EvidenceChain {
  track_id: string;
  analysis_id?: string;
  evidence_items: EvidenceItem[];
  available_count: number;
  total_count: number;
  evidence_summary: string;
  has_conflict: boolean;
  conflict_description?: string;
  overall_quality: string;
  human_review_required: boolean;
}

export interface AiFlagExplanation {
  title: string;
  summary: string;
  signals: Array<{
    label: string;
    value: string;
    raw: number | null;
    available: boolean;
    note?: string;
  }>;
  survivor_candidate_confidence: number;
  rescue_priority: RescuePriority;
  evidence_quality: string;
  evidence_conflict: boolean;
  conflict_note?: string;
  priority_reason: string;
  safety_note: string;
}

export interface Analysis {
  analysis_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'ERROR';
  progress: number;
  incident_id: string;
  video_filename: string;
  processed_frames: number;
  total_frames: number;
  candidates_found: number;
  error?: string;
  candidates?: SurvivorCandidate[];
}

export interface MapMarker {
  track_id: string;
  rescue_priority: RescuePriority;
  survivor_confidence: number;
  detection_confidence: number;
  movement_state: string;
  evidence_quality: string;
  evidence_conflict: boolean;
  human_review_status: string;
  human_decision?: string;
  latitude?: number;
  longitude?: number;
  uncertainty_radius_m?: number;
  geolocation_available: boolean;
  geolocation_method?: string;
  geolocation_note?: string;
}

export interface EvaluationMetric {
  name: string;
  value: string | number;
  unit: string;
  measured: boolean;
  note: string;
}
