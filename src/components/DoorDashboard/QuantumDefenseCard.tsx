import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { ShieldCheck, Cpu, KeyRound } from 'lucide-react';

export const QuantumDefenseCard: React.FC = () => {
  const { activePqcProfile, riskLevel, resetState, authEvents } = useSecurity();

  // Calculate intrusion velocity
  const cutoff = Date.now() - 60000;
  const recentFailures = authEvents.filter(
    (e) => e.result === 'FAILED' && new Date(e.timestamp).getTime() >= cutoff
  ).length;

  const nistLevelLabel =
    riskLevel === 'HIGH'
      ? 'Level 5 (AES-256 Eq.)'
      : riskLevel === 'MEDIUM'
      ? 'Level 3 (AES-192 Eq.)'
      : 'Level 1 (AES-128 Eq.)';

  return (
    <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl text-[#a855f7]">
            🔐
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#edf3ff]">Quantum Defense & Risk</h2>
            <div className="text-xs text-[#8190aa]">NIST Post-Quantum Cryptography</div>
          </div>
        </div>

        {/* PQC Telemetry Details */}
        <div className="bg-[#070b16] border border-white/[0.06] rounded-xl p-4 mb-4 flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8190aa] font-medium">Active KEM Algorithm</span>
            <span className="text-[#36d9ff] font-bold font-mono">{activePqcProfile.kem}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8190aa] font-medium">Digital Signature</span>
            <span className="text-[#a855f7] font-bold font-mono">{activePqcProfile.signature}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8190aa] font-medium">NIST Security Level</span>
            <span className="text-[#edf3ff] font-semibold">{nistLevelLabel}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#8190aa] font-medium">Intrusion Velocity</span>
            <span className="text-amber-400 font-bold font-mono">{recentFailures.toFixed(1)} att/min</span>
          </div>
        </div>

        {/* Security State Tracker */}
        <div className="bg-[#070b16] border border-white/[0.06] rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-[#edf3ff]">Security State Tracker</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase ${
                resetState === 'NORMAL'
                  ? 'bg-[#4ade80]/15 text-[#4ade80]'
                  : resetState === 'RESET_WAITING_OTP'
                  ? 'bg-[#facc15]/20 text-[#facc15]'
                  : 'bg-[#36d9ff]/20 text-[#36d9ff]'
              }`}
            >
              {resetState === 'NORMAL'
                ? 'NORMAL'
                : resetState === 'RESET_WAITING_OTP'
                ? 'AABB PENDING OTP'
                : 'UPDATING CREDENTIAL'}
            </span>
          </div>

          <div className="space-y-2">
            {/* Step 1 */}
            <div
              className={`flex items-start gap-3 p-2 rounded-lg border transition ${
                resetState === 'NORMAL'
                  ? 'bg-[#36d9ff]/10 border-[#36d9ff]/30 text-white'
                  : 'bg-white/[0.02] border-transparent text-[#8190aa]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  resetState === 'NORMAL'
                    ? 'bg-[#36d9ff] text-black'
                    : 'bg-white/10 text-[#8190aa]'
                }`}
              >
                1
              </div>
              <div className="text-xs">
                <div className="font-bold">Normal Mode</div>
                <div className="text-[11px] opacity-80">Enter 4-digit PIN for access</div>
              </div>
            </div>

            {/* Step 2 */}
            <div
              className={`flex items-start gap-3 p-2 rounded-lg border transition ${
                resetState === 'RESET_WAITING_OTP'
                  ? 'bg-[#facc15]/10 border-[#facc15]/30 text-white'
                  : 'bg-white/[0.02] border-transparent text-[#8190aa]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  resetState === 'RESET_WAITING_OTP'
                    ? 'bg-[#facc15] text-black'
                    : 'bg-white/10 text-[#8190aa]'
                }`}
              >
                2
              </div>
              <div className="text-xs">
                <div className="font-bold">AABB Reset</div>
                <div className="text-[11px] opacity-80">Awaiting 6-digit Owner OTP</div>
              </div>
            </div>

            {/* Step 3 */}
            <div
              className={`flex items-start gap-3 p-2 rounded-lg border transition ${
                resetState === 'RESET_NEW_PIN' || resetState === 'RESET_CONFIRM_PIN'
                  ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-white'
                  : 'bg-white/[0.02] border-transparent text-[#8190aa]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  resetState === 'RESET_NEW_PIN' || resetState === 'RESET_CONFIRM_PIN'
                    ? 'bg-[#4ade80] text-black'
                    : 'bg-white/10 text-[#8190aa]'
                }`}
              >
                3
              </div>
              <div className="text-xs">
                <div className="font-bold">OTP Verified</div>
                <div className="text-[11px] opacity-80">Set & confirm new door PIN</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keypad Operation Help */}
      <div className="pt-3 border-t border-white/[0.08]">
        <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider mb-2">
          Keypad Shortcuts & Controls
        </div>
        <ul className="text-[11px] text-[#8190aa] space-y-1">
          <li>
            <b className="text-zinc-300">0–9:</b> Input digits
          </li>
          <li>
            <b className="text-zinc-300">A–D:</b> Matrix letters (e.g. AABB)
          </li>
          <li>
            <b className="text-zinc-300">* or Clear:</b> Clear entry buffer
          </li>
          <li>
            <b className="text-zinc-300"># or Enter:</b> Submit PIN to security engine
          </li>
          <li>
            <b className="text-zinc-300">Keyboard:</b> Physical numpad & letters supported
          </li>
        </ul>
      </div>
    </div>
  );
};
