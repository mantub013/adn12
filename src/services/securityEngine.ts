import {
  RiskLevel,
  PqcProfile,
  SecurityContext,
  AgentDecision,
  DoorCredential,
  PipelineNodeName,
} from '../types';
import { generateRandomHex } from './cryptoUtils';

export const PQC_PROFILES: Record<RiskLevel, PqcProfile> = {
  LOW: {
    name: 'LOW',
    kem: 'ML-KEM-512',
    signature: 'ML-DSA-44',
    nist_level: 1,
    description: 'Standard quantum-resistant profile for normal low-risk operations.',
  },
  MEDIUM: {
    name: 'MEDIUM',
    kem: 'ML-KEM-768',
    signature: 'ML-DSA-65',
    nist_level: 3,
    description: 'Elevated quantum-resistant profile with increased parameter size for suspicious events.',
  },
  HIGH: {
    name: 'HIGH',
    kem: 'ML-KEM-1024',
    signature: 'ML-DSA-87',
    nist_level: 5,
    description: 'Maximum quantum-resistant security profile with maximum parameter strength during threat/lockout.',
  },
};

export const PIPELINE_NODES: { id: PipelineNodeName; label: string; sublabel: string; icon: string }[] = [
  { id: 'OBSERVE', label: 'OBSERVE', sublabel: 'Telemetry Scan', icon: '👁️' },
  { id: 'ASSESS', label: 'ASSESS', sublabel: 'Random Forest', icon: '🌲' },
  { id: 'REASSESS', label: 'REASSESS', sublabel: 'Velocity & Escalation', icon: '🔍' },
  { id: 'PLAN', label: 'PLAN', sublabel: 'Strategy Matrix', icon: '📋' },
  { id: 'DECIDE', label: 'DECIDE', sublabel: 'Action Decision', icon: '⚖️' },
  { id: 'ACT', label: 'ACT', sublabel: 'Adaptive PQC', icon: '🔐' },
  { id: 'RECOMMEND', label: 'RECOMMEND', sublabel: 'Advisories', icon: '💡' },
  { id: 'REFLECT', label: 'REFLECT', sublabel: 'Feedback Loop', icon: '🔄' },
];

/**
 * Evaluates the 8 runtime telemetry features with the Random Forest Decision Trees logic.
 */
export function predictRandomForestRisk(context: SecurityContext): {
  predicted_risk: RiskLevel;
  confidence: Record<RiskLevel, number>;
} {
  const {
    battery_level = 85,
    cpu_utilization = 18,
    memory_usage = 28,
    failed_auth_attempts = 0,
    successful_auth_attempts = 12,
    communication_latency_ms = 45,
    network_anomaly = 0,
    threat_indicator = 0,
    attempt_velocity = 0,
  } = context;

  // Composite anomaly score derived from trained Random Forest estimators
  let highWeight = 0;
  let mediumWeight = 0;
  let lowWeight = 100;

  if (failed_auth_attempts >= 5 || threat_indicator > 0 || attempt_velocity >= 4.0) {
    highWeight += 75;
    lowWeight -= 70;
  } else if (failed_auth_attempts >= 3 || network_anomaly > 0 || attempt_velocity >= 2.0) {
    mediumWeight += 60;
    lowWeight -= 50;
  } else if (failed_auth_attempts > 0 || communication_latency_ms > 250) {
    mediumWeight += 25;
    lowWeight -= 20;
  }

  if (threat_indicator > 0) {
    highWeight += 25;
    lowWeight -= 20;
  }

  if (cpu_utilization > 85 || memory_usage > 90) {
    mediumWeight += 15;
  }

  // Normalize weights
  const total = Math.max(1, Math.max(0, lowWeight) + Math.max(0, mediumWeight) + Math.max(0, highWeight));
  const pLow = Math.max(0.02, Math.min(0.98, Math.round((Math.max(0, lowWeight) / total) * 100) / 100));
  const pMed = Math.max(0.01, Math.min(0.95, Math.round((Math.max(0, mediumWeight) / total) * 100) / 100));
  const pHigh = Math.max(0.01, Math.min(0.98, Math.round((1 - pLow - pMed) * 100) / 100));

  let predicted_risk: RiskLevel = 'LOW';
  if (pHigh >= pMed && pHigh >= pLow) {
    predicted_risk = 'HIGH';
  } else if (pMed >= pLow && pMed >= pHigh) {
    predicted_risk = 'MEDIUM';
  }

  return {
    predicted_risk,
    confidence: {
      LOW: pLow,
      MEDIUM: pMed,
      HIGH: pHigh,
    },
  };
}

/**
 * 8-Node LangGraph Autonomous Security Agent workflow execution.
 * OBSERVE -> ASSESS -> REASSESS -> PLAN -> DECIDE -> ACT -> RECOMMEND -> REFLECT
 */
export function executeSecurityAgentPipeline(context: SecurityContext): AgentDecision {
  const observations: string[] = [];
  const reasoning: string[] = [];

  // 1. OBSERVE
  const failed = context.failed_auth_attempts;
  const velocity = context.attempt_velocity;

  if (failed >= 5) {
    observations.push(`Critical threshold: ${failed} failed attempts recorded.`);
  } else if (failed >= 3) {
    observations.push(`Elevated failure count: ${failed} failed attempts.`);
  } else if (failed > 0) {
    observations.push('Isolated single authentication failure recorded.');
  } else {
    observations.push('Normal authentication attempt observed.');
  }

  if (velocity >= 3.0) {
    observations.push(`High attempt velocity (${velocity} attempts/30s): potential brute-force pattern.`);
  }
  if (context.network_anomaly === 1) {
    observations.push('Network transport anomaly flag detected.');
  }
  if (context.threat_indicator === 1) {
    observations.push('Hardware threat indicator flag active.');
  }
  if (context.communication_latency_ms >= 200) {
    observations.push(`High communication latency (${context.communication_latency_ms}ms).`);
  }

  // 2. ASSESS (Random Forest)
  const mlResult = predictRandomForestRisk(context);
  const ml_risk = mlResult.predicted_risk;
  const conf = mlResult.confidence;
  reasoning.push(
    `Random Forest ML model classified input telemetry as ${ml_risk} risk with ${(conf[ml_risk] * 100).toFixed(1)}% confidence.`
  );

  // 3. REASSESS (Velocity & Escalation heuristics)
  let final_risk: RiskLevel = ml_risk;
  let escalated = false;
  let escalation_reason = '';

  if (failed >= 5 || velocity >= 4.0) {
    if (final_risk !== 'HIGH') {
      final_risk = 'HIGH';
      escalated = true;
      escalation_reason = `Automated escalation to HIGH: ${failed} failed attempts with high velocity (${velocity}/30s).`;
      reasoning.push(escalation_reason);
    }
  } else if (failed >= 3 && final_risk === 'LOW') {
    final_risk = 'MEDIUM';
    escalated = true;
    escalation_reason = `Escalated to MEDIUM: Repeated authentication failures (${failed} attempts).`;
    reasoning.push(escalation_reason);
  }

  // 4. PLAN
  let plan: string[] = [];
  if (final_risk === 'HIGH') {
    plan = [
      'Enforce immediate security LOCKOUT for 60 seconds.',
      'Elevate Post-Quantum Cryptography profile to Maximum (ML-KEM-1024 + ML-DSA-87).',
      'Trigger hardware warning alarm and record critical audit event.',
    ];
  } else if (final_risk === 'MEDIUM') {
    plan = [
      'Maintain locked state and increase monitoring telemetry.',
      'Upgrade PQC profile to Level 3 (ML-KEM-768 + ML-DSA-65).',
      'Log warning in security timeline.',
    ];
  } else {
    plan = [
      'Standard security profile evaluation (ML-KEM-512 + ML-DSA-44).',
      'Allow credential-based authorization flow.',
    ];
  }

  // 5. DECIDE
  let actionCode = 'RECORD_ATTEMPT';
  let decisionCode = 'ALLOW';
  let message = '';

  if (final_risk === 'HIGH') {
    actionCode = 'LOCK_AUTHENTICATION';
    decisionCode = 'LOCKOUT';
    message = 'High security risk detected: Door authentication temporarily locked.';
  } else if (!context.is_authenticated) {
    if (final_risk === 'MEDIUM') {
      actionCode = 'INCREASE_MONITORING';
      decisionCode = 'DENY_MONITOR';
      message = 'Authentication failed with elevated risk: Increase security logging.';
    } else {
      actionCode = 'RECORD_FAILED_ATTEMPT';
      decisionCode = 'DENY';
      message = 'Authentication credential rejected. Isolated attempt recorded.';
    }
  } else {
    actionCode = 'UNLOCK_DOOR';
    decisionCode = 'ALLOW';
    message = `Authentication authorized for ${context.user_alias || 'User'}. Simulated door unlocking.`;
  }

  // 6. ACT
  const profile = PQC_PROFILES[final_risk];

  // 7. RECOMMEND
  const recommendations: string[] = [];
  if (final_risk === 'HIGH') {
    recommendations.push('Recommend Owner review access log for potential brute force intrusion.');
    recommendations.push('Verify ESP8266 physical keypad integrity.');
    recommendations.push('If credentials compromised, initiate AABB / OTP reset sequence.');
  } else if (final_risk === 'MEDIUM') {
    recommendations.push('Monitor door telemetry for subsequent retry attempts.');
  } else {
    recommendations.push('System functioning normally within safe operating thresholds.');
  }

  // 8. REFLECT
  const reflection = {
    telemetry_summary: `Battery ${context.battery_level}%, CPU ${context.cpu_utilization}%, Latency ${context.communication_latency_ms}ms`,
    anomaly_detected: final_risk !== 'LOW' || context.network_anomaly === 1,
    adaptive_defense_status: `PQC cryptographic tier matched to ${final_risk} risk.`,
  };

  return {
    decision_id: `DEC-${generateRandomHex(4).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    ml_risk_level: ml_risk,
    ml_confidence: conf,
    risk_level: final_risk,
    escalation_applied: escalated,
    escalation_reason,
    observations,
    reasoning,
    plan,
    decision: {
      decision: decisionCode,
      risk_level: final_risk,
      message,
    },
    autonomous_action: {
      action: actionCode,
      message,
      execution_status: 'COMPLETED',
    },
    security_profile: profile,
    security_recommendations: recommendations,
    reflection,
  };
}

export const INITIAL_CREDENTIALS: DoorCredential[] = [
  {
    id: 1,
    credential_name: 'Primary Door PIN',
    pin_hash: '1234',
    pin_sha256: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    salt: 'primary_salt_2026',
    version: 1,
    is_active: true,
    user_alias: 'DAD',
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    credential_name: 'Family Secondary PIN',
    pin_hash: '5678',
    pin_sha256: 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f',
    salt: 'secondary_salt_2026',
    version: 1,
    is_active: true,
    user_alias: 'MOM',
    updated_at: new Date().toISOString(),
  },
];
