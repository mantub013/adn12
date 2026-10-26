"""Agent Service Interface for LangGraph Workflow Execution & Persistence."""

import json
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, List
from database import get_db_connection
from agent.security_agent import run_agent_pipeline


def analyze_security_context(context: Dict[str, Any]) -> Dict[str, Any]:
    """Executes the 8-node LangGraph workflow and saves the decision into SQLite.
    
    Returns the enriched agent result dictionary.
    """
    result = run_agent_pipeline(context)
    
    decision_id = f"DEC-{secrets.token_hex(4).upper()}"
    assessment_id = f"RSK-{secrets.token_hex(4).upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    
    ml_risk = result.get("ml_risk_level", "LOW")
    final_risk = result.get("risk_level", "LOW")
    conf = result.get("ml_risk_confidence", {})
    sec_prof = result.get("security_profile", {})
    action = result.get("autonomous_action", {})
    
    # Save into SQLite database
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. Record Risk Assessment
        cursor.execute(
            """INSERT INTO risk_assessments (
                assessment_id, timestamp, battery_level, cpu_utilization, memory_usage,
                failed_auth_attempts, communication_latency_ms, network_anomaly, threat_indicator,
                ml_predicted_risk, ml_confidence_json, model_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                assessment_id,
                now_iso,
                context.get("battery_level", 80),
                context.get("cpu_utilization", 20),
                context.get("memory_usage", 30),
                context.get("failed_auth_attempts", 0),
                context.get("communication_latency_ms", 40),
                context.get("network_anomaly", 0),
                context.get("threat_indicator", 0),
                ml_risk,
                json.dumps(conf),
                "RandomForest-v2.1",
            ),
        )

        # 2. Record Agent Decision
        cursor.execute(
            """INSERT INTO agent_decisions (
                decision_id, timestamp, ml_risk, final_risk, escalation_applied, escalation_reason,
                action, message, execution_status, pqc_kem, pqc_sig, reasoning_json, observations_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                decision_id,
                now_iso,
                ml_risk,
                final_risk,
                1 if result.get("escalation_applied") else 0,
                result.get("escalation_reason", ""),
                action.get("action", "RECORD_ATTEMPT"),
                action.get("message", ""),
                action.get("execution_status", "COMPLETED"),
                sec_prof.get("kem", "ML-KEM-512"),
                sec_prof.get("signature", "ML-DSA-44"),
                json.dumps(result.get("reasoning", [])),
                json.dumps(result.get("observations", [])),
            ),
        )

        conn.commit()
    except Exception as exc:
        conn.rollback()
        print(f"[ERROR] Failed to persist agent decision: {exc}")
    finally:
        conn.close()

    result["decision_id"] = decision_id
    result["assessment_id"] = assessment_id
    result["timestamp"] = now_iso
    return result
