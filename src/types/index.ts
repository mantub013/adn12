export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type DoorState = 'LOCKED' | 'OPEN' | 'LOCKOUT';

export type ResetFlowState = 'NORMAL' | 'RESET_WAITING_OTP' | 'RESET_NEW_PIN' | 'RESET_CONFIRM_PIN';

export interface PqcProfile {
  name: string;
  kem: string;
  signature: string;
  nist_level: number;
  description: string;
}

export type PipelineNodeName =
  | 'OBSERVE'
  | 'ASSESS'
  | 'REASSESS'
  | 'PLAN'
  | 'DECIDE'
  | 'ACT'
  | 'RECOMMEND'
  | 'REFLECT';

export interface PipelineNode {
  id: PipelineNodeName;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
}

export interface SecurityContext {
  battery_level: number;
  cpu_utilization: number;
  memory_usage: number;
  failed_auth_attempts: number;
  successful_auth_attempts: number;
  communication_latency_ms: number;
  network_anomaly: number;
  threat_indicator: number;
  attempt_velocity: number;
  is_authenticated?: boolean;
  user_alias?: string;
  source: 'WEB_UI' | 'ESP8266_KEYPAD' | 'ADMIN_OVERRIDE';
}

export interface AgentDecision {
  decision_id: string;
  timestamp: string;
  ml_risk_level: RiskLevel;
  ml_confidence: Record<RiskLevel, number>;
  risk_level: RiskLevel;
  escalation_applied: boolean;
  escalation_reason?: string;
  observations: string[];
  reasoning: string[];
  plan: string[];
  decision: {
    decision: string;
    risk_level: RiskLevel;
    message: string;
  };
  autonomous_action: {
    action: string;
    message: string;
    execution_status: string;
  };
  security_profile: PqcProfile;
  security_recommendations: string[];
  reflection: {
    telemetry_summary: string;
    anomaly_detected: boolean;
    adaptive_defense_status: string;
  };
}

export interface AuthEvent {
  id: string;
  event_id: string;
  timestamp: string;
  source: 'WEB_UI' | 'ESP8266_KEYPAD' | 'ADMIN_OVERRIDE';
  attempted_hash: string;
  user: string;
  result: 'SUCCESS' | 'FAILED' | 'LOCKOUT_BLOCKED';
  failed_attempt_count: number;
  ml_risk: RiskLevel;
  agent_risk: RiskLevel;
  pqc_kem: string;
  pqc_sig: string;
  action_taken: string;
  reason?: string;
}

export interface SecurityEvent {
  id: string;
  event_id: string;
  timestamp: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  event_type: string;
  source: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface ResetSession {
  session_id: string;
  device_id: string;
  otp: string;
  otp_hash: string;
  salt: string;
  status: 'PENDING' | 'OTP_VERIFIED' | 'PASSWORD_RESET' | 'EXPIRED' | 'REVOKED';
  created_at: string;
  expires_at: string;
  remaining_seconds: number;
  attempt_count: number;
  max_attempts: number;
}

export interface DeviceTelemetry {
  device_id: string;
  device_name: string;
  firmware_version: string;
  ip_address: string;
  rssi: number;
  wifi_status: 'CONNECTED' | 'DISCONNECTED';
  is_online: boolean;
  device_state: DoorState;
  input_length: number;
  keypad_state: 'IDLE' | 'INPUT' | 'CLEAR' | 'SUBMIT';
  failed_attempts: number;
  last_seen: string;
}

export interface DoorCredential {
  id: number;
  credential_name: string;
  pin_hash: string;
  pin_sha256: string;
  salt: string;
  version: number;
  is_active: boolean;
  user_alias: string;
  updated_at: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'warn' | 'danger' | 'info';
}
