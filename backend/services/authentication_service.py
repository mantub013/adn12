"""Primary Security & Authentication Authority Engine.

Coordinates the complete security evaluation pipeline:
1. Lockout Check
2. Credential Verification (Single source of truth)
3. Security Context Generation & Attempt Velocity Calculation
4. Random Forest ML Risk Classification
5. 8-Node LangGraph Agent Execution
6. Adaptive NIST Post-Quantum Cryptographic Profile Assignment
7. Simulated Door State Transition
8. Immutable SQLite Event & Audit Logging
"""

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from database import get_db_connection
from services.password_service import verify_door_pin, verify_door_pin_hash
from services.risk_engine import (
    is_system_locked_out,
    set_system_lockout,
    get_failed_attempts_count,
    increment_failed_attempts,
    reset_failed_attempts,
    build_security_context,
)
from services.agent_service import analyze_security_context
from services.pqc_service import execute_pqc_operation
from services.simulation_service import set_door_state, get_door_state
from services.audit_service import log_security_event, log_audit
from services.command_service import queue_command
from config import DEVICE_ID, LOCKOUT_DURATION_SECONDS


def authenticate_access(
    credential_input: str,
    source: str = "WEB_UI",
    is_hash: bool = False,
    device_id: str = DEVICE_ID,
) -> Dict[str, Any]:
    """Evaluates an access attempt through the complete security pipeline."""
    now_iso = datetime.now(timezone.utc).isoformat()
    event_id = f"EVT-{secrets.token_hex(4).upper()}"

    # 1. Check if System is currently Locked Out
    is_locked, remaining_seconds = is_system_locked_out()
    if is_locked:
        log_security_event(
            severity="HIGH",
            event_type="LOCKOUT_BLOCKED_ATTEMPT",
            source=source,
            description=f"Access attempt rejected due to active security lockout ({remaining_seconds}s remaining).",
        )
        return {
            "authenticated": False,
            "door_state": "LOCKOUT",
            "user": "UNKNOWN",
            "risk_level": "HIGH",
            "ml_risk_level": "HIGH",
            "agent_risk_level": "HIGH",
            "lockout_active": True,
            "lockout_remaining_seconds": remaining_seconds,
            "security_profile": {
                "name": "HIGH",
                "kem": "ML-KEM-1024",
                "signature": "ML-DSA-87",
            },
            "action": {
                "action": "LOCK_AUTHENTICATION",
                "message": f"Security Lockout Active. Retry in {remaining_seconds}s.",
            },
            "reasoning": [f"System locked out due to previous suspicious intrusion attempts ({remaining_seconds}s remaining)."],
        }

    # 2. Check Credential Validity
    if is_hash:
        auth_success, user_alias = verify_door_pin_hash(credential_input)
        attempt_masked = f"SHA256:{credential_input[:10]}..."
    else:
        auth_success, user_alias = verify_door_pin(credential_input)
        attempt_masked = "••••"

    # 3. Calculate Failure Count & Context
    if auth_success:
        failed_count = 0
    else:
        failed_count = increment_failed_attempts(device_id)

    # 4. Build Real-Time Security Context
    context = build_security_context(failed_count, source=source, device_id=device_id)
    context["is_authenticated"] = auth_success
    context["user_alias"] = user_alias or "UNKNOWN"

    # 5. Execute 8-Node LangGraph Agent Workflow
    agent_result = analyze_security_context(context)
    
    final_risk = agent_result.get("risk_level", "LOW")
    ml_risk = agent_result.get("ml_risk_level", "LOW")
    pqc_profile = agent_result.get("security_profile", {})
    action = agent_result.get("autonomous_action", {})
    reasoning = agent_result.get("reasoning", [])
    observations = agent_result.get("observations", [])

    # 6. Execute PQC Operation (Native liboqs or Profile Selection)
    pqc_op = execute_pqc_operation(final_risk)

    # 7. Apply Door State & Lockout Policies
    if auth_success:
        reset_failed_attempts(device_id)
        door_state = set_door_state("OPEN")
        event_result = "SUCCESS"
        user_name = user_alias or "AUTHORIZED_USER"
        
        # Log event in SQLite
        _record_auth_event(
            event_id=event_id,
            timestamp=now_iso,
            source=source,
            attempted_hash=attempt_masked,
            user=user_name,
            result="SUCCESS",
            failed_count=0,
            ml_risk=ml_risk,
            agent_risk=final_risk,
            pqc_kem=pqc_profile.get("kem", "ML-KEM-512"),
            pqc_sig=pqc_profile.get("signature", "ML-DSA-44"),
            action_taken="UNLOCK_DOOR",
            reason="Authorized credentials verified.",
        )
        log_audit(user_name, "DOOR_AUTHENTICATE_SUCCESS", source, "Simulated door unlocked.")
        queue_command(device_id, "AUTHENTICATION_SUCCESS", risk_level=final_risk, reason="PIN Authorized")

        return {
            "authenticated": True,
            "door_state": "OPEN",
            "user": user_name,
            "event_id": event_id,
            "risk_level": final_risk,
            "ml_risk_level": ml_risk,
            "agent_risk_level": final_risk,
            "ml_risk_confidence": agent_result.get("ml_risk_confidence", {}),
            "escalation_applied": agent_result.get("escalation_applied", False),
            "escalation_reason": agent_result.get("escalation_reason", ""),
            "security_profile": pqc_profile,
            "pqc_operation": pqc_op,
            "action": action,
            "reasoning": reasoning,
            "observations": observations,
            "recommendations": agent_result.get("security_recommendations", []),
        }

    else:
        event_result = "FAILED"
        user_name = "UNKNOWN"
        
        # Check if risk escalated to HIGH / Lockout
        if final_risk == "HIGH":
            set_system_lockout(LOCKOUT_DURATION_SECONDS)
            door_state = "LOCKOUT"
            log_security_event(
                severity="CRITICAL",
                event_type="INTRUSION_LOCKOUT_TRIGGERED",
                source=source,
                description=f"Security Lockout initiated after {failed_count} failures and high attempt velocity.",
            )
            queue_command(device_id, "LOCKOUT", risk_level="HIGH", reason=f"Failed attempts threshold ({failed_count})")
        else:
            door_state = set_door_state("LOCKED")
            log_security_event(
                severity="LOW" if final_risk == "LOW" else "MEDIUM",
                event_type="AUTHENTICATION_FAILURE",
                source=source,
                description=f"Authentication attempt failed (Attempt #{failed_count}).",
            )
            queue_command(device_id, "AUTHENTICATION_FAILURE", risk_level=final_risk, reason="Incorrect PIN")

        _record_auth_event(
            event_id=event_id,
            timestamp=now_iso,
            source=source,
            attempted_hash=attempt_masked,
            user=user_name,
            result="FAILED",
            failed_count=failed_count,
            ml_risk=ml_risk,
            agent_risk=final_risk,
            pqc_kem=pqc_profile.get("kem", "ML-KEM-512"),
            pqc_sig=pqc_profile.get("signature", "ML-DSA-44"),
            action_taken=action.get("action", "RECORD_FAILED_ATTEMPT"),
            reason="Invalid credential submitted.",
        )
        log_audit("ANONYMOUS", "DOOR_AUTHENTICATE_FAILURE", source, f"Failed attempt #{failed_count}")

        return {
            "authenticated": False,
            "door_state": door_state,
            "user": "UNKNOWN",
            "event_id": event_id,
            "failed_attempts": failed_count,
            "risk_level": final_risk,
            "ml_risk_level": ml_risk,
            "agent_risk_level": final_risk,
            "ml_risk_confidence": agent_result.get("ml_risk_confidence", {}),
            "escalation_applied": agent_result.get("escalation_applied", False),
            "escalation_reason": agent_result.get("escalation_reason", ""),
            "security_profile": pqc_profile,
            "pqc_operation": pqc_op,
            "action": action,
            "reasoning": reasoning,
            "observations": observations,
            "recommendations": agent_result.get("security_recommendations", []),
        }


def _record_auth_event(
    event_id: str,
    timestamp: str,
    source: str,
    attempted_hash: str,
    user: str,
    result: str,
    failed_count: int,
    ml_risk: str,
    agent_risk: str,
    pqc_kem: str,
    pqc_sig: str,
    action_taken: str,
    reason: str,
):
    """Inserts an authentication event into SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO authentication_events (
            event_id, timestamp, source, attempted_hash, user, result,
            failed_attempt_count, ml_risk, agent_risk, pqc_kem, pqc_sig, action_taken, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
        (
            event_id,
            timestamp,
            source,
            attempted_hash,
            user,
            result,
            failed_count,
            ml_risk,
            agent_risk,
            pqc_kem,
            pqc_sig,
            action_taken,
            reason,
        ),
    )
    conn.commit()
    conn.close()


def list_recent_events(limit: int = 50) -> list:
    """Retrieves recent authentication events."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT event_id, timestamp, source, attempted_hash, user, result,
                  failed_attempt_count, ml_risk, agent_risk, pqc_kem, pqc_sig, action_taken, reason
           FROM authentication_events ORDER BY id DESC LIMIT ?;""",
        (limit,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
