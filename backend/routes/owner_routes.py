"""Owner Security Console & Administrative Routes."""

from flask import Blueprint, request, jsonify, make_response
from functools import wraps
from services.owner_auth_service import (
    authenticate_owner,
    verify_owner_session,
    revoke_owner_session,
    register_owner,
)
from services.authentication_service import list_recent_events
from services.audit_service import get_security_events, get_audit_logs, log_audit
from services.pqc_service import get_pqc_system_status, get_pqc_profile, execute_pqc_operation
from services.device_service import get_device_status
from services.password_service import get_active_credential_info
from services.risk_engine import get_failed_attempts_count, is_system_locked_out
from services.simulation_service import get_door_state
from database import get_db_connection

owner_bp = Blueprint("owner_bp", __name__)


def owner_required(f):
    """Decorator requiring a valid owner session token via cookie or Authorization header."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.cookies.get("owner_session") or request.headers.get("X-Owner-Token")
        username = verify_owner_session(token)
        if not username:
            return jsonify({"error": "Unauthorized. Owner login session required."}), 401
        request.owner_username = username
        return f(*args, **kwargs)
    return decorated_function


@owner_bp.post("/api/owner/login")
def owner_login():
    """Authenticates owner credentials and returns a secure session."""
    try:
        body = request.get_json(silent=True) or {}
        username = str(body.get("username", "")).strip()
        password = str(body.get("password", "")).strip()

        success, token, msg = authenticate_owner(username, password)
        if not success:
            return jsonify({"success": False, "error": msg}), 401

        log_audit(username, "OWNER_LOGIN_SUCCESS", "OWNER_PORTAL", "Owner authenticated to security console.")

        resp = make_response(jsonify({
            "success": True,
            "username": username,
            "token": token,
            "message": "Login successful.",
        }))
        # Set HttpOnly cookie
        resp.set_cookie(
            "owner_session",
            token,
            max_age=86400,
            httponly=True,
            samesite="Lax",
        )
        return resp, 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@owner_bp.post("/api/owner/logout")
def owner_logout():
    """Revokes active owner session and clears session cookie."""
    token = request.cookies.get("owner_session") or request.headers.get("X-Owner-Token")
    if token:
        username = verify_owner_session(token)
        revoke_owner_session(token)
        if username:
            log_audit(username, "OWNER_LOGOUT", "OWNER_PORTAL", "Owner logged out.")

    resp = make_response(jsonify({"success": True, "message": "Logged out successfully."}))
    resp.set_cookie("owner_session", "", max_age=0)
    return resp, 200


@owner_bp.get("/api/owner/status")
def owner_session_status():
    """Checks whether the current client holds an authenticated owner session."""
    token = request.cookies.get("owner_session") or request.headers.get("X-Owner-Token")
    username = verify_owner_session(token)
    if username:
        return jsonify({"authenticated": True, "username": username}), 200
    return jsonify({"authenticated": False, "username": None}), 200


@owner_bp.get("/api/owner/events")
@owner_bp.get("/admin/events")
def owner_events():
    """Fetches recent authentication and security audit events."""
    try:
        limit = request.args.get("limit", 50, type=int)
        auth_events = list_recent_events(limit)
        sec_events = get_security_events(limit)
        return jsonify({
            "events": auth_events,
            "security_events": sec_events,
            "count": len(auth_events),
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@owner_bp.get("/api/owner/analytics")
@owner_required
def owner_analytics():
    """Provides aggregated risk and security analytics for visualization."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Count total, successful, failed attempts
        cursor.execute("SELECT COUNT(*) as total FROM authentication_events;")
        total_attempts = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as successes FROM authentication_events WHERE result = 'SUCCESS';")
        success_count = cursor.fetchone()["successes"]

        cursor.execute("SELECT COUNT(*) as failures FROM authentication_events WHERE result = 'FAILED';")
        failure_count = cursor.fetchone()["failures"]

        # Risk level distribution
        cursor.execute("SELECT agent_risk, COUNT(*) as cnt FROM authentication_events GROUP BY agent_risk;")
        risk_dist = {row["agent_risk"]: row["cnt"] for row in cursor.fetchall()}

        # Recent risk timeline
        cursor.execute(
            """SELECT timestamp, source, user, result, ml_risk, agent_risk, pqc_kem, action_taken
               FROM authentication_events ORDER BY id DESC LIMIT 15;"""
        )
        timeline = [dict(r) for r in cursor.fetchall()]

        conn.close()

        door_state = get_door_state()
        failed_count = get_failed_attempts_count()
        is_locked, remaining_lockout = is_system_locked_out()

        return jsonify({
            "total_attempts": total_attempts,
            "successful_attempts": success_count,
            "failed_attempts": failure_count,
            "active_failed_streak": failed_count,
            "is_locked_out": is_locked,
            "lockout_remaining_seconds": remaining_lockout,
            "door_state": door_state,
            "risk_distribution": {
                "LOW": risk_dist.get("LOW", 0),
                "MEDIUM": risk_dist.get("MEDIUM", 0),
                "HIGH": risk_dist.get("HIGH", 0),
            },
            "timeline": timeline,
            "credential_info": get_active_credential_info(),
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@owner_bp.get("/api/owner/health")
def owner_system_health():
    """Internal system health inspection endpoint."""
    try:
        # Check SQLite DB
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1;")
        db_ok = (cursor.fetchone() is not None)
        conn.close()
    except Exception:
        db_ok = False

    # Check ML Model
    from services.ml_classifier import MLRiskClassifier
    try:
        m = MLRiskClassifier.get_model()
        ml_ok = (m is not None)
    except Exception:
        ml_ok = False

    # Check PQC
    pqc_status = get_pqc_system_status()
    device_status = get_device_status()

    return jsonify({
        "status": "HEALTHY" if db_ok and ml_ok else "DEGRADED",
        "components": {
            "backend_server": "ONLINE",
            "sqlite_database": "ONLINE" if db_ok else "OFFLINE",
            "random_forest_model": "READY" if ml_ok else "ERROR",
            "langgraph_agent": "READY",
            "pqc_subsystem": "AVAILABLE" if pqc_status["liboqs_available"] else "READY (Profile Dispatcher)",
            "esp8266_hardware": "ONLINE" if device_status.get("is_online") else "OFFLINE",
        },
        "device_telemetry": device_status,
        "pqc_capabilities": pqc_status,
    }), 200
