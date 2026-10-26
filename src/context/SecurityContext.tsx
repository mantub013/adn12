import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  DoorState,
  RiskLevel,
  PqcProfile,
  ResetFlowState,
  PipelineNodeName,
  AgentDecision,
  AuthEvent,
  SecurityEvent,
  ResetSession,
  DeviceTelemetry,
  DoorCredential,
  SecurityContext as SecurityContextType,
} from '../types';
import {
  PQC_PROFILES,
  PIPELINE_NODES,
  executeSecurityAgentPipeline,
  INITIAL_CREDENTIALS,
} from '../services/securityEngine';
import { generate6DigitOtp, generateRandomHex, sha256Hex } from '../services/cryptoUtils';

interface SecurityContextValue {
  doorState: DoorState;
  doorUser: string;
  riskLevel: RiskLevel;
  failedAttempts: number;
  activePqcProfile: PqcProfile;
  activeNode: PipelineNodeName | null;
  lastDecision: AgentDecision | null;
  resetState: ResetFlowState;
  resetSession: ResetSession | null;
  authEvents: AuthEvent[];
  securityEvents: SecurityEvent[];
  credentials: DoorCredential[];
  deviceStatus: DeviceTelemetry;
  ownerAuthenticated: boolean;
  ownerUsername: string | null;
  lockoutRemaining: number;
  activeTab: 'door' | 'owner';
  setActiveTab: (tab: 'door' | 'owner') => void;
  // Actions
  authenticatePin: (pin: string, source?: 'WEB_UI' | 'ESP8266_KEYPAD') => Promise<{ success: boolean; message: string }>;
  manualLockDoor: (source?: string) => void;
  manualUnlockDoor: (source?: string) => void;
  triggerAabbReset: (source?: string) => void;
  verifyResetOtp: (otp: string) => Promise<boolean>;
  setNewDoorPin: (newPin: string, confirmPin: string) => Promise<boolean>;
  cancelResetFlow: () => void;
  generateOwnerOtp: () => ResetSession;
  revokeOwnerOtp: () => void;
  ownerLogin: (user: string, pass: string) => boolean;
  ownerLogout: () => void;
  directResetCredential: (newPin: string, confirmPin: string) => Promise<{ success: boolean; message: string }>;
  toggleHardwareOnline: () => void;
  simulateHardwareHeartbeat: () => void;
  setMaskedKeypadLength: (len: number) => void;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

const STORAGE_KEYS = {
  CREDENTIALS: 'pqc_door_credentials_v1',
  AUTH_EVENTS: 'pqc_door_auth_events_v1',
  SEC_EVENTS: 'pqc_door_sec_events_v1',
  DEVICE: 'pqc_door_device_v1',
};

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'door' | 'owner'>('door');
  const [doorState, setDoorState] = useState<DoorState>('LOCKED');
  const [doorUser, setDoorUser] = useState<string>('SECURE');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('LOW');
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [activeNode, setActiveNode] = useState<PipelineNodeName | null>(null);
  const [lastDecision, setLastDecision] = useState<AgentDecision | null>(null);
  const [resetState, setResetState] = useState<ResetFlowState>('NORMAL');
  const [resetSession, setResetSession] = useState<ResetSession | null>(null);

  // Owner authentication
  const [ownerAuthenticated, setOwnerAuthenticated] = useState<boolean>(true);
  const [ownerUsername, setOwnerUsername] = useState<string | null>('admin');

  // Credentials
  const [credentials, setCredentials] = useState<DoorCredential[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_CREDENTIALS;
  });

  // Events
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_EVENTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: '1',
        event_id: 'EVT-INIT-01',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        source: 'WEB_UI',
        attempted_hash: '••••',
        user: 'DAD',
        result: 'SUCCESS',
        failed_attempt_count: 0,
        ml_risk: 'LOW',
        agent_risk: 'LOW',
        pqc_kem: 'ML-KEM-512',
        pqc_sig: 'ML-DSA-44',
        action_taken: 'UNLOCK_DOOR',
        reason: 'Authorized access via primary PIN credential',
      },
    ];
  });

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SEC_EVENTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: '1',
        event_id: 'SEC-INIT-01',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        severity: 'INFO',
        event_type: 'SYSTEM_BOOT',
        source: 'CORE_ENGINE',
        description: 'Agentic AI PQC Security Engine initialized. NIST ML-KEM & ML-DSA profiles ready.',
      },
    ];
  });

  // Device telemetry
  const [deviceStatus, setDeviceStatus] = useState<DeviceTelemetry>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEVICE);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      device_id: 'DOOR-ESP8266-001',
      device_name: 'Entrance NodeMCU Door Lock',
      firmware_version: '1.0.0',
      ip_address: '10.180.113.12',
      rssi: -58,
      wifi_status: 'CONNECTED',
      is_online: true,
      device_state: 'LOCKED',
      input_length: 0,
      keypad_state: 'IDLE',
      failed_attempts: 0,
      last_seen: new Date().toISOString(),
    };
  });

  const autoRelockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockoutIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(credentials));
  }, [credentials]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTH_EVENTS, JSON.stringify(authEvents));
  }, [authEvents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SEC_EVENTS, JSON.stringify(securityEvents));
  }, [securityEvents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEVICE, JSON.stringify(deviceStatus));
  }, [deviceStatus]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining > 0) {
      if (!lockoutIntervalRef.current) {
        lockoutIntervalRef.current = setInterval(() => {
          setLockoutRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(lockoutIntervalRef.current!);
              lockoutIntervalRef.current = null;
              setDoorState('LOCKED');
              setRiskLevel('LOW');
              setFailedAttempts(0);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      if (lockoutIntervalRef.current) {
        clearInterval(lockoutIntervalRef.current);
        lockoutIntervalRef.current = null;
      }
    }

    return () => {
      if (lockoutIntervalRef.current && lockoutRemaining === 0) {
        clearInterval(lockoutIntervalRef.current);
        lockoutIntervalRef.current = null;
      }
    };
  }, [lockoutRemaining]);

  // OTP countdown timer
  useEffect(() => {
    if (resetSession && resetSession.remaining_seconds > 0 && resetSession.status === 'PENDING') {
      if (!otpIntervalRef.current) {
        otpIntervalRef.current = setInterval(() => {
          setResetSession((prev) => {
            if (!prev) return null;
            if (prev.remaining_seconds <= 1) {
              clearInterval(otpIntervalRef.current!);
              otpIntervalRef.current = null;
              return { ...prev, remaining_seconds: 0, status: 'EXPIRED' };
            }
            return { ...prev, remaining_seconds: prev.remaining_seconds - 1 };
          });
        }, 1000);
      }
    } else {
      if (otpIntervalRef.current) {
        clearInterval(otpIntervalRef.current);
        otpIntervalRef.current = null;
      }
    }

    return () => {
      if (otpIntervalRef.current && (!resetSession || resetSession.remaining_seconds === 0)) {
        clearInterval(otpIntervalRef.current);
        otpIntervalRef.current = null;
      }
    };
  }, [resetSession]);

  // Animate the 8-node LangGraph pipeline sequentially
  const playPipelineAnimation = useCallback(async (decision: AgentDecision) => {
    const nodes = PIPELINE_NODES.map((n) => n.id);
    for (const node of nodes) {
      setActiveNode(node);
      await new Promise((r) => setTimeout(r, 120));
    }
    setActiveNode(null);
    setLastDecision(decision);
  }, []);

  // Calculate sliding-window attempt velocity (attempts in last 30s)
  const calculateRecentVelocity = useCallback(() => {
    const cutoff = Date.now() - 30000;
    const count = authEvents.filter(
      (e) => e.result === 'FAILED' && new Date(e.timestamp).getTime() >= cutoff
    ).length;
    return count;
  }, [authEvents]);

  // Main PIN authentication
  const authenticatePin = useCallback(
    async (pin: string, source: 'WEB_UI' | 'ESP8266_KEYPAD' = 'WEB_UI') => {
      const nowIso = new Date().toISOString();
      const eventId = `EVT-${generateRandomHex(4).toUpperCase()}`;

      // Check if active lockout
      if (lockoutRemaining > 0 || doorState === 'LOCKOUT') {
        const remaining = lockoutRemaining > 0 ? lockoutRemaining : 60;
        const blockedEvent: AuthEvent = {
          id: String(Date.now()),
          event_id: eventId,
          timestamp: nowIso,
          source,
          attempted_hash: '••••',
          user: 'UNKNOWN',
          result: 'LOCKOUT_BLOCKED',
          failed_attempt_count: failedAttempts,
          ml_risk: 'HIGH',
          agent_risk: 'HIGH',
          pqc_kem: 'ML-KEM-1024',
          pqc_sig: 'ML-DSA-87',
          action_taken: 'LOCK_AUTHENTICATION',
          reason: `Rejected due to active security lockout (${remaining}s remaining).`,
        };
        setAuthEvents((prev) => [blockedEvent, ...prev.slice(0, 49)]);
        return {
          success: false,
          message: `Security Lockout Active. Retry in ${remaining}s.`,
        };
      }

      // Check credential against active credentials
      const matchedCred = credentials.find(
        (c) => c.is_active && c.pin_hash.toLowerCase() === pin.toLowerCase()
      );
      const authSuccess = Boolean(matchedCred);
      const userAlias = matchedCred ? matchedCred.user_alias : 'UNKNOWN';

      const newFailedCount = authSuccess ? 0 : failedAttempts + 1;
      setFailedAttempts(newFailedCount);

      // Build real-time context
      const velocity = calculateRecentVelocity() + (authSuccess ? 0 : 1);
      const context: SecurityContextType = {
        battery_level: 85,
        cpu_utilization: authSuccess ? 22 : 45,
        memory_usage: 32,
        failed_auth_attempts: newFailedCount,
        successful_auth_attempts: authSuccess ? 15 : 14,
        communication_latency_ms: source === 'ESP8266_KEYPAD' ? 85 : 32,
        network_anomaly: 0,
        threat_indicator: newFailedCount >= 5 || velocity >= 4 ? 1 : 0,
        attempt_velocity: velocity,
        is_authenticated: authSuccess,
        user_alias: userAlias,
        source,
      };

      // Run 8-Node LangGraph Agent
      const decision = executeSecurityAgentPipeline(context);
      await playPipelineAnimation(decision);

      const decisionRisk = decision.risk_level;
      setRiskLevel(decisionRisk);

      // Log Auth Event
      const authEvent: AuthEvent = {
        id: String(Date.now()),
        event_id: eventId,
        timestamp: nowIso,
        source,
        attempted_hash: '••••',
        user: userAlias,
        result: authSuccess ? 'SUCCESS' : 'FAILED',
        failed_attempt_count: newFailedCount,
        ml_risk: decision.ml_risk_level,
        agent_risk: decisionRisk,
        pqc_kem: decision.security_profile.kem,
        pqc_sig: decision.security_profile.signature,
        action_taken: decision.autonomous_action.action,
        reason: decision.autonomous_action.message,
      };
      setAuthEvents((prev) => [authEvent, ...prev.slice(0, 49)]);

      if (authSuccess) {
        setDoorState('OPEN');
        setDoorUser(userAlias);
        setFailedAttempts(0);

        // Auto relock after 5s
        if (autoRelockTimerRef.current) clearTimeout(autoRelockTimerRef.current);
        autoRelockTimerRef.current = setTimeout(() => {
          setDoorState('LOCKED');
          setDoorUser('SECURE');
        }, 5000);

        return {
          success: true,
          message: `Access Authorized: Welcome ${userAlias}!`,
        };
      } else {
        // Failed attempt evaluation
        if (decisionRisk === 'HIGH' || newFailedCount >= 5) {
          setDoorState('LOCKOUT');
          setLockoutRemaining(60);
          setSecurityEvents((prev) => [
            {
              id: String(Date.now()),
              event_id: `SEC-${generateRandomHex(4).toUpperCase()}`,
              timestamp: nowIso,
              severity: 'HIGH',
              event_type: 'SECURITY_LOCKOUT_ENGAGED',
              source: 'AGENTIC_AI_POLICY',
              description: `Intrusion threshold exceeded (${newFailedCount} failed attempts). 60-second lockout triggered.`,
            },
            ...prev.slice(0, 49),
          ]);
          return {
            success: false,
            message: 'Intrusion risk detected: Security lockout engaged for 60 seconds!',
          };
        }

        return {
          success: false,
          message: 'Access Denied: Incorrect credentials.',
        };
      }
    },
    [
      lockoutRemaining,
      doorState,
      credentials,
      failedAttempts,
      calculateRecentVelocity,
      playPipelineAnimation,
    ]
  );

  // Manual actuator overrides
  const manualLockDoor = useCallback((source = 'WEB_UI') => {
    if (autoRelockTimerRef.current) clearTimeout(autoRelockTimerRef.current);
    setDoorState('LOCKED');
    setDoorUser('SECURE');
    setSecurityEvents((prev) => [
      {
        id: String(Date.now()),
        event_id: `SEC-${generateRandomHex(4).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        event_type: 'MANUAL_LOCK_COMMAND',
        source,
        description: 'Simulated door actuator manually locked by user command.',
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const manualUnlockDoor = useCallback((source = 'ADMIN_OVERRIDE') => {
    if (autoRelockTimerRef.current) clearTimeout(autoRelockTimerRef.current);
    setDoorState('OPEN');
    setDoorUser('OVERRIDE');
    setSecurityEvents((prev) => [
      {
        id: String(Date.now()),
        event_id: `SEC-${generateRandomHex(4).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        event_type: 'MANUAL_FORCE_UNLOCK',
        source,
        description: 'Administrative force-unlock executed. Actuator disengaged.',
      },
      ...prev.slice(0, 49),
    ]);
    // Auto relock after 6s
    autoRelockTimerRef.current = setTimeout(() => {
      setDoorState('LOCKED');
      setDoorUser('SECURE');
    }, 6000);
  }, []);

  // AABB Reset Flow
  const triggerAabbReset = useCallback((source = 'KEYPAD') => {
    setResetState('RESET_WAITING_OTP');
    setSecurityEvents((prev) => [
      {
        id: String(Date.now()),
        event_id: `SEC-${generateRandomHex(4).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        event_type: 'AABB_RESET_INITIATED',
        source,
        description: 'AABB emergency password reset initiated. Awaiting 6-digit Owner OTP authorization.',
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const generateOwnerOtp = useCallback((): ResetSession => {
    const code = generate6DigitOtp();
    const session: ResetSession = {
      session_id: `SESS-${generateRandomHex(4).toUpperCase()}`,
      device_id: 'DOOR-ESP8266-001',
      otp: code,
      otp_hash: code,
      salt: 'otp_salt_2026',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 120000).toISOString(),
      remaining_seconds: 120,
      attempt_count: 0,
      max_attempts: 3,
    };
    setResetSession(session);
    setSecurityEvents((prev) => [
      {
        id: String(Date.now()),
        event_id: `SEC-${generateRandomHex(4).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        severity: 'INFO',
        event_type: 'RESET_OTP_GENERATED',
        source: 'OWNER_CONSOLE',
        description: `Cryptographic 6-digit OTP generated for reset session (${session.session_id}). TTL: 120s.`,
      },
      ...prev.slice(0, 49),
    ]);
    return session;
  }, []);

  const revokeOwnerOtp = useCallback(() => {
    setResetSession(null);
    setResetState('NORMAL');
    setSecurityEvents((prev) => [
      {
        id: String(Date.now()),
        event_id: `SEC-${generateRandomHex(4).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        severity: 'LOW',
        event_type: 'RESET_OTP_REVOKED',
        source: 'OWNER_CONSOLE',
        description: 'Active password reset session and OTP manually revoked by Owner.',
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const verifyResetOtp = useCallback(
    async (enteredOtp: string): Promise<boolean> => {
      if (!resetSession || resetSession.status !== 'PENDING' || resetSession.remaining_seconds <= 0) {
        return false;
      }
      if (resetSession.otp === enteredOtp.trim()) {
        setResetSession((prev) => (prev ? { ...prev, status: 'OTP_VERIFIED' } : null));
        setResetState('RESET_NEW_PIN');
        return true;
      } else {
        setResetSession((prev) => {
          if (!prev) return null;
          const nextCount = prev.attempt_count + 1;
          if (nextCount >= prev.max_attempts) {
            return { ...prev, attempt_count: nextCount, status: 'EXPIRED' };
          }
          return { ...prev, attempt_count: nextCount };
        });
        return false;
      }
    },
    [resetSession]
  );

  const setNewDoorPin = useCallback(
    async (newPin: string, confirmPin: string): Promise<boolean> => {
      if (newPin !== confirmPin || newPin.length < 4) {
        return false;
      }
      const newSha = await sha256Hex(newPin);
      setCredentials((prev) =>
        prev.map((c) =>
          c.id === 1
            ? {
                ...c,
                pin_hash: newPin,
                pin_sha256: newSha,
                version: c.version + 1,
                updated_at: new Date().toISOString(),
              }
            : c
        )
      );
      setResetState('NORMAL');
      setResetSession(null);
      setDoorState('LOCKED');
      setSecurityEvents((prev) => [
        {
          id: String(Date.now()),
          event_id: `SEC-${generateRandomHex(4).toUpperCase()}`,
          timestamp: new Date().toISOString(),
          severity: 'INFO',
          event_type: 'CREDENTIAL_ROTATION_SUCCESS',
          source: 'AABB_RESET_FLOW',
          description: 'Primary door PIN successfully rotated. Credential version incremented.',
        },
        ...prev.slice(0, 49),
      ]);
      return true;
    },
    []
  );

  const cancelResetFlow = useCallback(() => {
    setResetState('NORMAL');
  }, []);

  const directResetCredential = useCallback(
    async (newPin: string, confirmPin: string) => {
      if (newPin !== confirmPin) {
        return { success: false, message: 'New PIN and Confirmation PIN do not match.' };
      }
      if (newPin.length < 4) {
        return { success: false, message: 'PIN must be at least 4 digits.' };
      }
      const newSha = await sha256Hex(newPin);
      setCredentials((prev) =>
        prev.map((c) =>
          c.id === 1
            ? {
                ...c,
                pin_hash: newPin,
                pin_sha256: newSha,
                version: c.version + 1,
                updated_at: new Date().toISOString(),
              }
            : c
        )
      );
      setSecurityEvents((prev) => [
        {
          id: String(Date.now()),
          event_id: `SEC-${generateRandomHex(4).toUpperCase()}`,
          timestamp: new Date().toISOString(),
          severity: 'INFO',
          event_type: 'OWNER_DIRECT_CREDENTIAL_UPDATE',
          source: 'OWNER_PORTAL',
          description: 'Owner updated Primary door credential directly from security console.',
        },
        ...prev.slice(0, 49),
      ]);
      return { success: true, message: 'Primary door PIN updated successfully!' };
    },
    []
  );

  // Owner authentication
  const ownerLogin = useCallback((user: string, pass: string): boolean => {
    if (user.trim() === 'admin' && pass.trim() === 'admin123') {
      setOwnerAuthenticated(true);
      setOwnerUsername('admin');
      return true;
    }
    return false;
  }, []);

  const ownerLogout = useCallback(() => {
    setOwnerAuthenticated(false);
    setOwnerUsername(null);
  }, []);

  // Hardware simulation
  const toggleHardwareOnline = useCallback(() => {
    setDeviceStatus((prev) => ({
      ...prev,
      is_online: !prev.is_online,
      wifi_status: !prev.is_online ? 'CONNECTED' : 'DISCONNECTED',
      last_seen: new Date().toISOString(),
    }));
  }, []);

  const simulateHardwareHeartbeat = useCallback(() => {
    setDeviceStatus((prev) => ({
      ...prev,
      is_online: true,
      wifi_status: 'CONNECTED',
      rssi: -50 - Math.floor(Math.random() * 20),
      last_seen: new Date().toISOString(),
    }));
  }, []);

  const setMaskedKeypadLength = useCallback((len: number) => {
    setDeviceStatus((prev) => ({
      ...prev,
      input_length: len,
      keypad_state: len > 0 ? 'INPUT' : 'IDLE',
    }));
  }, []);

  const activePqcProfile = PQC_PROFILES[riskLevel] || PQC_PROFILES.LOW;

  return (
    <SecurityContext.Provider
      value={{
        doorState,
        doorUser,
        riskLevel,
        failedAttempts,
        activePqcProfile,
        activeNode,
        lastDecision,
        resetState,
        resetSession,
        authEvents,
        securityEvents,
        credentials,
        deviceStatus,
        ownerAuthenticated,
        ownerUsername,
        lockoutRemaining,
        activeTab,
        setActiveTab,
        authenticatePin,
        manualLockDoor,
        manualUnlockDoor,
        triggerAabbReset,
        verifyResetOtp,
        setNewDoorPin,
        cancelResetFlow,
        generateOwnerOtp,
        revokeOwnerOtp,
        ownerLogin,
        ownerLogout,
        directResetCredential,
        toggleHardwareOnline,
        simulateHardwareHeartbeat,
        setMaskedKeypadLength,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
