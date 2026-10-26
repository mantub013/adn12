/**
 * Logic and controller for Public / Locked Door Access Dashboard.
 * Dual Input Architecture: Physical ESP8266 Keypad + Virtual Web Keypad.
 * Authoritative Backend Pipeline: Random Forest -> LangGraph -> Adaptive PQC -> SQLite Audit.
 */

let currentPin = "";
let physicalInputLength = 0;
let isProcessing = false;
let autoRelockTimer = null;
let currentResetState = "NORMAL"; // NORMAL | RESET_WAITING_OTP | RESET_NEW_PIN | RESET_CONFIRM_PIN
let tempNewPin = "";

/**
 * Updates the masked PIN display.
 * Renders styled dot glyphs (●) for entered characters and dimmed circles (○) for empty slots.
 * Plaintext PIN is NEVER rendered to DOM or logged in console.
 * Supports dual input: Virtual UI Keypad + Physical ESP8266 Hardware Keypad.
 */
function updatePinDisplay(customLen) {
  const display = document.getElementById("pinDisplay");
  if (!display) return;

  const targetSlots = currentResetState === "RESET_WAITING_OTP" ? 6 : 4;
  // If user is actively typing locally via virtual keypad, prioritize currentPin.length;
  // otherwise reflect physical ESP8266 keypad input length.
  const len = (currentPin.length > 0)
    ? currentPin.length
    : (customLen !== undefined ? customLen : physicalInputLength);
  
  let html = "";
  if (len === 0) {
    for (let i = 0; i < targetSlots; i++) {
      html += '<span class="pin-dot placeholder">○</span>';
    }
  } else {
    for (let i = 0; i < len; i++) {
      html += '<span class="pin-dot">●</span>';
    }
    for (let i = len; i < targetSlots; i++) {
      html += '<span class="pin-dot placeholder">○</span>';
    }
  }

  display.innerHTML = html;
}

/**
 * Appends a digit or matrix letter to the active PIN buffer.
 */
function pressKey(key) {
  if (isProcessing) return;

  const maxLen = currentResetState === "RESET_WAITING_OTP" ? 6 : 8;
  if (currentPin.length < maxLen) {
    currentPin += key;
    updatePinDisplay();
  }

  // Auto-submit when standard 4-digit numeric PIN is entered in normal mode
  if (currentResetState === "NORMAL" && currentPin.length === 4 && /^\d{4}$/.test(currentPin)) {
    submitPin();
  }
}

/**
 * Removes the last entered character from the PIN buffer.
 */
function backspacePin() {
  if (isProcessing) return;
  if (currentPin.length > 0) {
    currentPin = currentPin.slice(0, -1);
    updatePinDisplay();
  }
}

/**
 * Clears the entire PIN buffer without triggering any network request.
 */
function clearPin() {
  if (isProcessing) return;
  currentPin = "";
  physicalInputLength = 0;
  updatePinDisplay();
}

/**
 * Populates and submits a PIN string for quick simulation testing.
 */
function simulatePin(pin) {
  if (isProcessing) return;
  currentPin = String(pin);
  updatePinDisplay();
  submitPin();
}

/**
 * Initiates AABB Password Reset sequence.
 */
async function triggerAabb() {
  try {
    const res = await API.post("/api/reset/request", { source: "WEB_DASHBOARD" });
    showToast(res.message || "Reset mode triggered. Generate OTP in Owner Console.", "info");
    
    currentResetState = "RESET_WAITING_OTP";
    currentPin = "";
    updatePinDisplay();
    updateResetTrackerUI();

    const logBox = document.getElementById("decisionLogBox");
    if (logBox) {
      logBox.innerHTML = `
        <strong style="color:var(--yellow)">AABB PASSWORD RESET TRIGGERED</strong><br>
        ${escapeHtml(res.message)}<br>
        <em>Open <a href="/owner" style="color:var(--cyan)">Owner Security Console</a> to view/generate 6-digit OTP.</em>
      `;
    }
  } catch (err) {
    showToast(err.message || "Failed to trigger reset", "danger");
  }
}

/**
 * Submits the current PIN or reset payload to the existing backend API.
 */
async function submitPin() {
  if (!currentPin || isProcessing) return;

  const pinValue = currentPin;
  clearPin();

  // If user entered AABB, trigger reset flow
  if (pinValue.toUpperCase() === "AABB") {
    await triggerAabb();
    return;
  }

  // Handle Multi-Step Reset Flow via Virtual Keypad
  if (currentResetState === "RESET_WAITING_OTP") {
    await handleVerifyOtp(pinValue);
    return;
  } else if (currentResetState === "RESET_NEW_PIN") {
    tempNewPin = pinValue;
    currentResetState = "RESET_CONFIRM_PIN";
    updateResetTrackerUI();
    showToast("Now re-enter new PIN to confirm", "info");
    return;
  } else if (currentResetState === "RESET_CONFIRM_PIN") {
    await handleSetNewPassword(tempNewPin, pinValue);
    return;
  }

  // Standard Door PIN Authentication
  isProcessing = true;
  setPromptState("AUTHENTICATING...", "prompt-auth");
  
  const pill = document.getElementById("doorStatusPill");
  if (pill) {
    pill.className = "door-status-pill status-auth";
    pill.textContent = "AUTHENTICATING & RUNNING LANGGRAPH PIPELINE...";
  }

  try {
    const data = await API.post("/api/authenticate", { password: pinValue });
    await animatePipelineNodes(data);

    // Update Telemetry Stats Bar
    const riskLevel = data.risk_level || "LOW";
    const statRisk = document.getElementById("statRiskLevel");
    if (statRisk) {
      statRisk.textContent = riskLevel;
      statRisk.style.color = riskLevel === "HIGH" ? "var(--red)" : (riskLevel === "MEDIUM" ? "var(--yellow)" : "var(--green)");
    }

    const statFailed = document.getElementById("statFailedAttempts");
    if (statFailed) {
      statFailed.textContent = data.failed_attempts ?? 0;
    }
    
    const prof = data.security_profile || {};
    const kemName = prof.kem || "ML-KEM-512";
    const sigName = prof.signature || "ML-DSA-44";

    const statPqc = document.getElementById("statPqcName");
    if (statPqc) statPqc.textContent = kemName;

    const pqcBadge = document.getElementById("pqcBadge");
    if (pqcBadge) pqcBadge.textContent = `🔐 ${kemName} / ${sigName}`;

    // Update Column 3 Telemetry
    const kemVal = document.getElementById("pqcKemVal");
    if (kemVal) kemVal.textContent = kemName;
    const sigVal = document.getElementById("pqcSigVal");
    if (sigVal) sigVal.textContent = sigName;
    const lvlVal = document.getElementById("pqcLevelVal");
    if (lvlVal) {
      lvlVal.textContent = riskLevel === "HIGH" ? "Level 5 (AES-256 Eq.)" : (riskLevel === "MEDIUM" ? "Level 3 (AES-192 Eq.)" : "Level 1 (AES-128 Eq.)");
    }

    // Update Door Visualizer
    updateDoorVisuals(data.door_state, data.user);

    // Render LangGraph Reasoning & Security Decisions
    renderDecisionLog(data, prof);

    if (data.authenticated) {
      showToast(`Access Authorized: Welcome ${data.user}!`, "success");
      setPromptState("ACCESS GRANTED", "prompt-normal");
      
      // Auto-relock simulated door after 5 seconds
      if (autoRelockTimer) clearTimeout(autoRelockTimer);
      autoRelockTimer = setTimeout(async () => {
        await API.post("/api/door/lock");
        updateDoorVisuals("LOCKED");
        setPromptState("ENTER PIN", "prompt-normal");
      }, 5000);
    } else {
      if (data.door_state === "LOCKOUT" || data.lockout_active || riskLevel === "HIGH") {
        showToast("Intrusion risk detected: Security lockout engaged!", "danger");
        setPromptState("SECURITY LOCKOUT", "prompt-lockout");
        setKeypadDisabled(true);
      } else {
        showToast("Access Denied: Incorrect credentials.", "warn");
        setPromptState("ACCESS DENIED — RETRY", "prompt-lockout");
        setTimeout(() => setPromptState("ENTER PIN", "prompt-normal"), 2500);
      }
    }
  } catch (err) {
    showToast(err.message || "Authentication error", "danger");
    updateDoorVisuals("LOCKED");
    setPromptState("ERROR — RETRY", "prompt-lockout");
    setTimeout(() => setPromptState("ENTER PIN", "prompt-normal"), 2500);
  } finally {
    isProcessing = false;
  }
}

/**
 * Handles OTP verification in reset flow.
 */
async function handleVerifyOtp(otpValue) {
  isProcessing = true;
  setPromptState("VERIFYING OTP...", "prompt-auth");
  try {
    const res = await API.post("/api/reset/verify-otp", { otp: otpValue });
    if (res.success) {
      showToast("OTP Verified! Enter new 4-digit PIN.", "success");
      currentResetState = "RESET_NEW_PIN";
      updateResetTrackerUI();
    } else {
      showToast(res.error || "Invalid OTP", "danger");
      setPromptState("INVALID OTP — RETRY", "prompt-lockout");
    }
  } catch (e) {
    showToast(e.message || "OTP verification failed", "danger");
    setPromptState("INVALID OTP — RETRY", "prompt-lockout");
  } finally {
    isProcessing = false;
  }
}

/**
 * Handles committing new password in reset flow.
 */
async function handleSetNewPassword(newPin, confirmPin) {
  if (newPin !== confirmPin) {
    showToast("PIN mismatch! Restarting reset entry.", "warn");
    currentResetState = "RESET_NEW_PIN";
    tempNewPin = "";
    updateResetTrackerUI();
    return;
  }

  isProcessing = true;
  setPromptState("UPDATING PIN...", "prompt-auth");
  try {
    const hashPin = async (value) => {
      const bytes = new TextEncoder().encode(value);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    };
    const res = await API.post("/api/reset/set-password", {
      new_pin_hash: await hashPin(newPin),
      confirm_pin_hash: await hashPin(confirmPin),
    });
    if (res.success) {
      showToast("Password updated successfully! Enter new PIN to unlock.", "success");
      currentResetState = "NORMAL";
      tempNewPin = "";
      updateResetTrackerUI();
      updateDoorVisuals("LOCKED");
    } else {
      showToast(res.error || "Failed to update PIN", "danger");
      currentResetState = "NORMAL";
      updateResetTrackerUI();
    }
  } catch (e) {
    showToast(e.message || "Failed to update password", "danger");
    currentResetState = "NORMAL";
    updateResetTrackerUI();
  } finally {
    isProcessing = false;
  }
}

/**
 * Updates the prompt pill text and CSS class.
 */
function setPromptState(text, className) {
  const prompt = document.getElementById("terminalPrompt");
  if (!prompt) return;
  prompt.textContent = text;
  prompt.className = `terminal-prompt-pill ${className || ''}`;
}

/**
 * Enables or disables virtual keypad interactive buttons.
 */
function setKeypadDisabled(disabled) {
  const keys = document.querySelectorAll(".key-btn, .toolbar-btn");
  keys.forEach((k) => {
    k.disabled = disabled;
  });
}

/**
 * Updates UI indicators for Multi-Step Password Reset tracker.
 */
function updateResetTrackerUI() {
  const badge = document.getElementById("trackerBadge");
  const stepNormal = document.getElementById("step-normal");
  const stepAabb = document.getElementById("step-aabb");
  const stepOtp = document.getElementById("step-otp");

  if (stepNormal) stepNormal.className = "tracker-step";
  if (stepAabb) stepAabb.className = "tracker-step";
  if (stepOtp) stepOtp.className = "tracker-step";

  if (currentResetState === "RESET_WAITING_OTP") {
    if (badge) { badge.textContent = "WAITING OTP"; badge.style.color = "var(--yellow)"; }
    if (stepAabb) stepAabb.classList.add("active");
    setPromptState("AABB: ENTER 6-DIGIT OTP", "prompt-reset");
  } else if (currentResetState === "RESET_NEW_PIN") {
    if (badge) { badge.textContent = "NEW PIN"; badge.style.color = "var(--purple)"; }
    if (stepOtp) stepOtp.classList.add("active");
    setPromptState("ENTER NEW 4-DIGIT PIN", "prompt-reset");
  } else if (currentResetState === "RESET_CONFIRM_PIN") {
    if (badge) { badge.textContent = "CONFIRM PIN"; badge.style.color = "var(--purple)"; }
    if (stepOtp) stepOtp.classList.add("active");
    setPromptState("CONFIRM NEW 4-DIGIT PIN", "prompt-reset");
  } else {
    if (badge) { badge.textContent = "NORMAL"; badge.style.color = "var(--green)"; }
    if (stepNormal) stepNormal.classList.add("active");
    setPromptState("ENTER PIN", "prompt-normal");
  }
}

/**
 * Renders LangGraph agent decision log and recommendations.
 */
function renderDecisionLog(data, prof) {
  const logBox = document.getElementById("decisionLogBox");
  if (!logBox) return;

  const reasons = (data.reasoning || []).map((r) => `<li>${escapeHtml(r)}</li>`).join("");
  const recs = (data.recommendations || []).map((rc) => `<li>${escapeHtml(rc)}</li>`).join("");

  logBox.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:8px; flex-wrap:wrap; gap:8px">
      <strong>Result: <span style="color:${data.authenticated ? 'var(--green)' : 'var(--red)'}">${data.authenticated ? 'AUTHORIZED' : 'ACCESS DENIED'}</span></strong>
      <span>Risk: <b style="color:${data.risk_level === 'HIGH' ? 'var(--red)' : (data.risk_level === 'MEDIUM' ? 'var(--yellow)' : 'var(--green)')}">${data.risk_level || 'LOW'}</b> • PQC: <b>${escapeHtml(prof.kem || 'ML-KEM-512')}</b></span>
    </div>
    <div style="font-size:12px; color:var(--text); margin-bottom:4px"><b>Agent Reasoning:</b></div>
    <ul style="padding-left:18px; color:var(--muted); margin-bottom:8px">${reasons || '<li>Standard security evaluation complete.</li>'}</ul>
    ${recs ? `<div style="font-size:12px; color:var(--text); margin-bottom:4px"><b>Advisories:</b></div><ul style="padding-left:18px; color:var(--muted)">${recs}</ul>` : ''}
  `;
}

/**
 * Physical Keyboard Event Listener (Supports 0-9, A-D, Enter, Backspace, Escape, *)
 */
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  
  if ((e.key >= "0" && e.key <= "9") || ["a", "b", "c", "d", "A", "B", "C", "D"].includes(e.key)) {
    pressKey(e.key.toUpperCase());
    e.preventDefault();
  } else if (e.key === "Enter" || e.key === "#") {
    submitPin();
    e.preventDefault();
  } else if (e.key === "Backspace") {
    backspacePin();
    e.preventDefault();
  } else if (e.key === "Escape" || e.key === "*") {
    clearPin();
    e.preventDefault();
  }
});

/**
 * Sequentially animate LangGraph pipeline nodes during authentication.
 */
async function animatePipelineNodes(result) {
  const nodes = ["observe", "assess", "reassess", "plan", "decide", "act", "recommend", "reflect"];
  for (const n of nodes) {
    const el = document.getElementById(`node-${n}`);
    if (el) el.classList.add("active");
    await new Promise((r) => setTimeout(r, 85));
  }
  setTimeout(() => {
    nodes.forEach((n) => {
      const el = document.getElementById(`node-${n}`);
      if (el) el.classList.remove("active");
    });
  }, 1200);
}

/**
 * Updates 3D Simulated Door Visuals.
 */
function updateDoorVisuals(doorState, userLabel = "SECURE") {
  const leaf = document.getElementById("doorLeaf");
  const pill = document.getElementById("doorStatusPill");
  const icon = document.getElementById("doorIcon");
  const label = document.getElementById("doorUserLabel");
  const bolt = document.getElementById("lockBolt");
  const statDoor = document.getElementById("statDoorState");

  if (statDoor) statDoor.textContent = doorState;

  if (doorState === "OPEN") {
    if (leaf) leaf.classList.add("open");
    if (pill) {
      pill.className = "door-status-pill status-open";
      pill.textContent = `DOOR UNLOCKED • AUTHORIZED (${userLabel})`;
    }
    if (icon) icon.textContent = "🔓";
    if (label) label.textContent = userLabel;
    if (bolt) bolt.style.background = "var(--green)";
    if (statDoor) statDoor.style.color = "var(--green)";
  } else if (doorState === "LOCKOUT") {
    if (leaf) leaf.classList.remove("open");
    if (pill) {
      pill.className = "door-status-pill status-lockout";
      pill.textContent = "⚠️ SECURITY LOCKOUT ACTIVE";
    }
    if (icon) icon.textContent = "🚨";
    if (label) label.textContent = "INTRUSION LOCK";
    if (bolt) bolt.style.background = "var(--red)";
    if (statDoor) statDoor.style.color = "var(--red)";
  } else {
    if (leaf) leaf.classList.remove("open");
    if (pill) {
      pill.className = "door-status-pill status-locked";
      pill.textContent = "DOOR LOCKED";
    }
    if (icon) icon.textContent = "🔒";
    if (label) label.textContent = "SECURE";
    if (bolt) bolt.style.background = "var(--red)";
    if (statDoor) statDoor.style.color = "var(--red)";
  }
}

/**
 * Manual Lock Action.
 */
async function manualLockDoor() {
  try {
    await API.post("/api/door/lock");
    updateDoorVisuals("LOCKED");
    showToast("Door manually locked.", "info");
  } catch (e) {
    showToast(e.message || "Failed to lock door", "danger");
  }
}

/**
 * Manual Force Unlock Action.
 */
async function manualUnlockDoor() {
  try {
    await API.post("/api/door/unlock");
    updateDoorVisuals("OPEN", "MANUAL");
    showToast("Door manually unlocked.", "info");
  } catch (e) {
    showToast(e.message || "Failed to unlock door", "danger");
  }
}

/**
 * Periodic Telemetry Polling (Door status, ESP8266 node status, and Reset status).
 */
async function pollStatus() {
  try {
    const [doorRes, hwRes, resetRes] = await Promise.all([
      API.get("/api/door/status"),
      API.get("/api/device/status"),
      API.get("/api/reset/status"),
    ]);

    // Handle Lockout state from backend
    if (doorRes.lockout_active) {
      setKeypadDisabled(true);
      setPromptState(`SECURITY LOCKOUT (${doorRes.lockout_remaining_seconds || 0}s)`, "prompt-lockout");
      updateDoorVisuals("LOCKOUT");
    } else {
      if (!isProcessing) {
        setKeypadDisabled(false);
        if (currentResetState === "NORMAL") {
          setPromptState("ENTER PIN", "prompt-normal");
        }
      }
    }

    // Update Door & Telemetry Bar
    if (!isProcessing) {
      updateDoorVisuals(doorRes.door_state);
      
      const statRisk = document.getElementById("statRiskLevel");
      if (statRisk) {
        statRisk.textContent = doorRes.risk_level;
        statRisk.style.color = doorRes.risk_level === "HIGH" ? "var(--red)" : (doorRes.risk_level === "MEDIUM" ? "var(--yellow)" : "var(--green)");
      }

      const statFailed = document.getElementById("statFailedAttempts");
      if (statFailed) statFailed.textContent = doorRes.failed_attempts;
      
      const p = doorRes.pqc_profile || {};
      const statPqc = document.getElementById("statPqcName");
      if (statPqc) statPqc.textContent = p.kem || "ML-KEM-512";
      
      const pqcBadge = document.getElementById("pqcBadge");
      if (pqcBadge) pqcBadge.textContent = `🔐 ${p.kem || 'ML-KEM-512'} / ${p.signature || 'ML-DSA-44'}`;

      const kemVal = document.getElementById("pqcKemVal");
      if (kemVal) kemVal.textContent = p.kem || "ML-KEM-512";
      const sigVal = document.getElementById("pqcSigVal");
      if (sigVal) sigVal.textContent = p.signature || "ML-DSA-44";
    }

    // Sync Reset Mode state if active
    if (resetRes && resetRes.active_session) {
      if (currentResetState === "NORMAL") {
        currentResetState = resetRes.status === "OTP_VERIFIED" ? "RESET_NEW_PIN" : "RESET_WAITING_OTP";
        updateResetTrackerUI();
      }
    } else if (currentResetState === "RESET_WAITING_OTP") {
      currentResetState = "NORMAL";
      updateResetTrackerUI();
    }

    // Synchronize physical ESP8266 keypad masked input length if virtual keypad is not actively being used
    if (hwRes && typeof hwRes.input_length === "number") {
      const hwLen = Math.max(0, hwRes.input_length);
      if (currentPin.length === 0 && !isProcessing) {
        if (physicalInputLength !== hwLen) {
          physicalInputLength = hwLen;
          updatePinDisplay();
        }
      }
    }

    // Update ESP8266 Badge
    const hwBadge = document.getElementById("hwBadge");
    if (hwBadge) {
      const isHwOnline = hwRes.is_online || hwRes.wifi_status === "CONNECTED";
      hwBadge.className = `badge ${isHwOnline ? 'badge-online' : 'badge-offline'}`;
      hwBadge.innerHTML = `<span class="dot">●</span> ESP8266: ${isHwOnline ? 'ONLINE (' + (hwRes.ip_address || 'WiFi') + ')' : 'OFFLINE'}`;
    }
  } catch (e) {
    // Silent catch for network jitter
  }
}

// Initial initialization
updatePinDisplay();
updateResetTrackerUI();
pollStatus();
setInterval(pollStatus, 1000);
