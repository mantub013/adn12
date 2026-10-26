# Adaptive PQC Smart Door Lock (React + TypeScript)

An autonomous IoT Smart Door Lock security simulation and operations center rewritten in modern React, TypeScript, and Tailwind CSS. The application integrates machine learning intrusion risk classification, an 8-node LangGraph autonomous agent, dynamic NIST Post-Quantum Cryptography (PQC), and bidirectional ESP8266 hardware node telemetry.

## Key Features

### 1. Dual Operational Dashboards
- **Public Door Access Dashboard (`/door` or `#door`)**:
  - Interactive 3D perspective simulated physical door leaf with real-time actuator animations (locked, open, security lockout) and auto-relock timer (5s).
  - Prominent Virtual Access Node with masked PIN display (`●` for input, `○` for empty slots) ensuring zero plaintext rendering.
  - 4x4 Matrix Keypad (0–9, A–D, `*` Clear, `#` Enter) with physical keyboard listener support.
  - Quick simulation shortcuts for testing valid credentials (Dad: `1234`, Mom: `5678`), invalid PIN brute-force simulation, and emergency `AABB` sequence trigger.
  - Live Quantum Defense telemetry (Active KEM, Digital Signature, NIST Security Level, intrusion velocity rate).
  - Security State Tracker for multi-step password resets (Normal -> AABB Reset -> OTP Verified).
- **Owner Security Operations Center (`/owner` or `#owner`)**:
  - Administrative authentication barrier modal (`admin` / `admin123`).
  - Actuator override controls (direct manual lock and force unlock).
  - Cryptographic OTP manager with 2-minute live countdown timer and instant revocation.
  - Direct web credential rotation form.
  - Machine learning risk distribution bar and intrusion velocity analytics.
  - NIST Post-Quantum Cryptographic profiles inspector (Level 1, 3, and 5).
  - Real-time immutable Security Audit & Access Event stream with search and status filtering.
  - Interactive NodeMCU ESP8266 hardware simulator (toggle online/offline, ping heartbeats, simulate physical numpad inputs).

### 2. Autonomous Security & Cryptographic Pipeline
- **8-Node LangGraph State Machine**:
  - `OBSERVE` -> Telemetry scan (failed attempts, attempt velocity in 30s sliding window, network anomalies, threat indicators).
  - `ASSESS` -> Random Forest multi-class intrusion risk classification (evaluating 8 runtime telemetry features).
  - `REASSESS` -> Velocity & escalation heuristic rules.
  - `PLAN` -> Dynamic defensive policy formulation.
  - `DECIDE` -> Autonomous action selection (`ALLOW`, `DENY`, `INCREASE_MONITORING`, `LOCKOUT`).
  - `ACT` -> Dynamic NIST PQC profile assignment.
  - `RECOMMEND` -> Contextual operator advisories.
  - `REFLECT` -> Adaptive defense telemetry feedback loop.
- **NIST Post-Quantum Cryptography (PQC)**:
  - **Low Risk (NIST Level 1)**: `ML-KEM-512` (Kyber-512) + `ML-DSA-44` (Dilithium-2).
  - **Medium Risk (NIST Level 3)**: `ML-KEM-768` (Kyber-768) + `ML-DSA-65` (Dilithium-3).
  - **High Risk (NIST Level 5)**: `ML-KEM-1024` (Kyber-1024) + `ML-DSA-87` (Dilithium-5).

### 3. AABB Emergency Reset Flow
1. User enters `AABB` on keypad -> System enters `RESET_WAITING_OTP` state.
2. Owner accesses Owner Console and clicks `⚡ GENERATE RESET OTP` -> 6-digit cryptographic OTP is generated (valid 120s).
3. User enters the 6-digit OTP on the door keypad -> OTP is verified.
4. User enters new 4-digit PIN and re-enters to confirm -> Credential version is incremented and door returns to secure mode.

## Development & Build

```bash
# Install dependencies
npm install

# Start Vite dev server on port 3000
npm run dev

# Compile and build production bundle
npm run build
```
