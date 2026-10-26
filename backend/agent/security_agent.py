"""LangGraph Autonomous Security Agent for Smart Door Lock System.

Orchestrates an 8-node state machine workflow:
OBSERVE -> ASSESS -> REASSESS -> PLAN -> DECIDE -> ACT -> RECOMMEND -> REFLECT
"""

from typing import Any, Dict, List, TypedDict
import json
from langgraph.graph import StateGraph, START, END
from services.ml_classifier import predict_risk
from services.pqc_service import get_pqc_profile


class SecurityAgentState(TypedDict, total=False):
    context: Dict[str, Any]
    ml_risk_level: str
    ml_risk_confidence: Dict[str, float]
    risk_level: str
    escalation_applied: bool
    escalation_reason: str
    observations: List[str]
    reasoning: List[str]
    plan: List[str]
    security_profile: Dict[str, Any]
    decision: Dict[str, Any]
    autonomous_action: Dict[str, Any]
    security_recommendations: List[str]
    reflection: Dict[str, Any]


def observe_node(state: SecurityAgentState) -> Dict[str, Any]:
    c = state.get("context", {})
    obs = []
    
    failed_attempts = c.get("failed_auth_attempts", 0)
    velocity = c.get("attempt_velocity", 0.0)
    
    if failed_attempts >= 5:
        obs.append(f"Critical threshold: {failed_attempts} failed attempts recorded.")
    elif failed_attempts >= 3:
        obs.append(f"Elevated failure count: {failed_attempts} failed attempts.")
    elif failed_attempts > 0:
        obs.append(f"Isolated single authentication failure recorded.")
    else:
        obs.append("Normal authentication attempt observed.")

    if velocity >= 3.0:
        obs.append(f"High attempt velocity ({velocity} attempts/30s): potential brute-force pattern.")
    
    if c.get("network_anomaly", 0) == 1:
        obs.append("Network transport anomaly flag detected.")
    if c.get("threat_indicator", 0) == 1:
        obs.append("Hardware threat indicator flag active.")
    if c.get("communication_latency_ms", 0) >= 200:
        obs.append(f"High communication latency ({c.get('communication_latency_ms')}ms).")

    return {"observations": obs}


def assess_node(state: SecurityAgentState) -> Dict[str, Any]:
    c = state.get("context", {})
    ml_result = predict_risk(c)
    pred = ml_result["predicted_risk"]
    conf = ml_result["confidence"]

    return {
        "ml_risk_level": pred,
        "risk_level": pred,
        "ml_risk_confidence": conf,
        "reasoning": [
            f"Random Forest ML model classified input telemetry as {pred} risk with {conf.get(pred, 0.0):.2%} confidence."
        ],
    }


def reassess_node(state: SecurityAgentState) -> Dict[str, Any]:
    c = state.get("context", {})
    ml_risk = state.get("ml_risk_level", "LOW")
    conf = state.get("ml_risk_confidence", {})
    reasoning = list(state.get("reasoning", []))
    
    failed_attempts = c.get("failed_auth_attempts", 0)
    velocity = c.get("attempt_velocity", 0.0)
    
    escalated = False
    reason = ""
    final_risk = ml_risk

    # Heuristic escalation rules:
    if failed_attempts >= 5 or velocity >= 4.0:
        if final_risk != "HIGH":
            final_risk = "HIGH"
            escalated = True
            reason = f"Automated escalation to HIGH: {failed_attempts} failed attempts with high velocity ({velocity}/30s)."
            reasoning.append(reason)
    elif failed_attempts >= 3 and final_risk == "LOW":
        final_risk = "MEDIUM"
        escalated = True
        reason = f"Escalated to MEDIUM: Repeated authentication failures ({failed_attempts} attempts)."
        reasoning.append(reason)

    return {
        "risk_level": final_risk,
        "escalation_applied": escalated,
        "escalation_reason": reason,
        "reasoning": reasoning,
    }


def plan_node(state: SecurityAgentState) -> Dict[str, Any]:
    risk = state.get("risk_level", "LOW")
    plan = []

    if risk == "HIGH":
        plan = [
            "Enforce immediate security LOCKOUT for 60 seconds.",
            "Elevate Post-Quantum Cryptography profile to Maximum (ML-KEM-1024 + ML-DSA-87).",
            "Trigger hardware warning alarm and record critical audit event.",
        ]
    elif risk == "MEDIUM":
        plan = [
            "Maintain locked state and increase monitoring telemetry.",
            "Upgrade PQC profile to Level 3 (ML-KEM-768 + ML-DSA-65).",
            "Log warning in security timeline.",
        ]
    else:
        plan = [
            "Standard security profile evaluation (ML-KEM-512 + ML-DSA-44).",
            "Allow credential-based authorization flow.",
        ]

    return {"plan": plan}


def decide_node(state: SecurityAgentState) -> Dict[str, Any]:
    risk = state.get("risk_level", "LOW")
    context = state.get("context", {})
    is_authenticated = context.get("is_authenticated", False)
    
    if risk == "HIGH":
        action = "LOCK_AUTHENTICATION"
        decision_code = "LOCKOUT"
        msg = "High security risk detected: Door authentication temporarily locked."
    elif not is_authenticated:
        if risk == "MEDIUM":
            action = "INCREASE_MONITORING"
            decision_code = "DENY_MONITOR"
            msg = "Authentication failed with elevated risk: Increase security logging."
        else:
            action = "RECORD_FAILED_ATTEMPT"
            decision_code = "DENY"
            msg = "Authentication credential rejected. Isolated attempt recorded."
    else:
        action = "UNLOCK_DOOR"
        decision_code = "ALLOW"
        msg = "Authentication authorized. Simulated door unlocking."

    return {
        "decision": {
            "decision": decision_code,
            "risk_level": risk,
            "message": msg,
        },
        "autonomous_action": {
            "action": action,
            "message": msg,
            "execution_status": "READY_FOR_EXECUTION",
        },
    }


def act_node(state: SecurityAgentState) -> Dict[str, Any]:
    risk = state.get("risk_level", "LOW")
    pqc_profile = get_pqc_profile(risk)
    
    return {
        "security_profile": pqc_profile,
    }


def recommend_node(state: SecurityAgentState) -> Dict[str, Any]:
    risk = state.get("risk_level", "LOW")
    recs = []
    
    if risk == "HIGH":
        recs.append("Recommend Owner review access log for potential brute force intrusion.")
        recs.append("Verify ESP8266 physical keypad integrity.")
        recs.append("If credentials compromised, initiate AABB / OTP reset sequence.")
    elif risk == "MEDIUM":
        recs.append("Monitor door telemetry for subsequent retry attempts.")
    else:
        recs.append("System functioning normally within safe operating thresholds.")

    return {"security_recommendations": recs}


def reflect_node(state: SecurityAgentState) -> Dict[str, Any]:
    ml_risk = state.get("ml_risk_level", "LOW")
    final_risk = state.get("risk_level", "LOW")
    conf = state.get("ml_risk_confidence", {})
    
    reflection = {
        "evaluation_success": True,
        "ml_initial": ml_risk,
        "agent_final": final_risk,
        "agreement": (ml_risk == final_risk),
        "confidence_score": conf.get(ml_risk, 1.0),
        "nodes_traversed": 8,
    }
    return {"reflection": reflection}


def build_security_graph():
    """Constructs and compiles the 8-node LangGraph workflow."""
    graph = StateGraph(SecurityAgentState)
    
    graph.add_node("observe", observe_node)
    graph.add_node("assess", assess_node)
    graph.add_node("reassess", reassess_node)
    graph.add_node("plan", plan_node)
    graph.add_node("decide", decide_node)
    graph.add_node("act", act_node)
    graph.add_node("recommend", recommend_node)
    graph.add_node("reflect", reflect_node)

    # Define sequential edges
    graph.add_edge(START, "observe")
    graph.add_edge("observe", "assess")
    graph.add_edge("assess", "reassess")
    graph.add_edge("reassess", "plan")
    graph.add_edge("plan", "decide")
    graph.add_edge("decide", "act")
    graph.add_edge("act", "recommend")
    graph.add_edge("recommend", "reflect")
    graph.add_edge("reflect", END)

    return graph.compile()


# Pre-compiled global agent graph
_COMPILED_AGENT = build_security_graph()


def run_agent_pipeline(context: Dict[str, Any]) -> Dict[str, Any]:
    """Executes the complete 8-node LangGraph pipeline for the given context."""
    initial_state = {
        "context": context,
        "reasoning": [],
        "observations": [],
        "plan": [],
        "security_recommendations": [],
    }
    final_state = _COMPILED_AGENT.invoke(initial_state)
    final_state["agent_cycle"] = "COMPLETED"
    return final_state
