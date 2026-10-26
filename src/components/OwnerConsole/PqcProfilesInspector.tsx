import React from 'react';
import { useSecurity } from '../../context/SecurityContext';

export const PqcProfilesInspector: React.FC = () => {
  const { riskLevel } = useSecurity();

  return (
    <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <h3 className="text-sm font-extrabold text-[#edf3ff]">NIST Post-Quantum Profiles</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#6d7cff]/15 border border-[#6d7cff]/30 text-[#c4ccff]">
            LIBOQS READY
          </span>
        </div>

        <p className="text-xs text-[#8190aa] leading-relaxed mb-4">
          Cryptographic algorithms dynamically scale with evaluated risk tier to defend against
          Harvest-Now-Decrypt-Later quantum adversaries:
        </p>

        {/* 3 Profile Cards */}
        <div className="space-y-2.5">
          {/* Low */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between transition ${
              riskLevel === 'LOW'
                ? 'bg-[#4ade80]/10 border-[#4ade80]/40 shadow-[0_0_12px_rgba(74,222,128,0.15)]'
                : 'bg-white/[0.02] border-white/[0.06] opacity-70'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-[#edf3ff]">
                LOW RISK (NIST Level 1)
              </div>
              <div className="text-[11px] text-[#8190aa] font-mono">
                ML-KEM-512 + ML-DSA-44
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                riskLevel === 'LOW' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-white/5 text-zinc-500'
              }`}
            >
              {riskLevel === 'LOW' ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>

          {/* Medium */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between transition ${
              riskLevel === 'MEDIUM'
                ? 'bg-[#facc15]/10 border-[#facc15]/40 shadow-[0_0_12px_rgba(250,204,21,0.15)]'
                : 'bg-white/[0.02] border-white/[0.06] opacity-70'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-[#edf3ff]">
                MEDIUM RISK (NIST Level 3)
              </div>
              <div className="text-[11px] text-[#8190aa] font-mono">
                ML-KEM-768 + ML-DSA-65
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                riskLevel === 'MEDIUM'
                  ? 'bg-[#facc15]/20 text-[#facc15]'
                  : 'bg-white/5 text-zinc-500'
              }`}
            >
              {riskLevel === 'MEDIUM' ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>

          {/* High */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between transition ${
              riskLevel === 'HIGH'
                ? 'bg-[#ff5f73]/10 border-[#ff5f73]/40 shadow-[0_0_12px_rgba(255,95,115,0.15)]'
                : 'bg-white/[0.02] border-white/[0.06] opacity-70'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-[#edf3ff]">
                HIGH RISK (NIST Level 5)
              </div>
              <div className="text-[11px] text-[#8190aa] font-mono">
                ML-KEM-1024 + ML-DSA-87
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                riskLevel === 'HIGH'
                  ? 'bg-[#ff5f73]/20 text-[#ff5f73]'
                  : 'bg-white/5 text-zinc-500'
              }`}
            >
              {riskLevel === 'HIGH' ? 'LOCKOUT TIER' : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.08] text-[11px] text-[#8190aa] font-mono">
        FIPS 203 (ML-KEM) & FIPS 204 (ML-DSA) compliant parameter sets.
      </div>
    </div>
  );
};
