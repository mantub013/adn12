import React from 'react';
import { useSecurity } from '../../context/SecurityContext';

export const OverviewMetrics: React.FC = () => {
  const { doorState, credentials, deviceStatus, riskLevel, failedAttempts, activePqcProfile } =
    useSecurity();

  const primaryCred = credentials.find((c) => c.id === 1) || credentials[0];
  const credVersion = primaryCred ? primaryCred.version : 1;

  const doorColor =
    doorState === 'OPEN'
      ? 'text-[#4ade80]'
      : doorState === 'LOCKOUT'
      ? 'text-[#ff5f73]'
      : 'text-[#ff5f73]';

  const riskColor =
    riskLevel === 'HIGH'
      ? 'text-[#ff5f73]'
      : riskLevel === 'MEDIUM'
      ? 'text-[#facc15]'
      : 'text-[#4ade80]';

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Simulated Door Status */}
      <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider">
          Simulated Door Status
        </div>
        <div className={`text-2xl font-black mt-1 ${doorColor}`}>{doorState}</div>
        <div className="text-[11px] text-[#8190aa] mt-1 font-mono">
          Credential Version: <b className="text-zinc-200">v{credVersion}</b>
        </div>
      </div>

      {/* ESP8266 Hardware Node */}
      <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider">
          ESP8266 Hardware Node
        </div>
        <div
          className={`text-2xl font-black mt-1 ${
            deviceStatus.is_online ? 'text-[#4ade80]' : 'text-[#ff5f73]'
          }`}
        >
          {deviceStatus.is_online ? 'CONNECTED' : 'OFFLINE'}
        </div>
        <div className="text-[11px] text-[#8190aa] mt-1 font-mono">
          IP: <b className="text-zinc-200">{deviceStatus.ip_address}</b> • RSSI: {deviceStatus.rssi}dBm
        </div>
      </div>

      {/* Active AI Risk Level */}
      <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider">
          Active AI Risk Level
        </div>
        <div className={`text-2xl font-black mt-1 ${riskColor}`}>{riskLevel}</div>
        <div className="text-[11px] text-[#8190aa] mt-1">
          Failed attempts streak: <b className="text-zinc-200">{failedAttempts}</b>
        </div>
      </div>

      {/* Post-Quantum Cryptography */}
      <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 shadow-lg backdrop-blur-md">
        <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider">
          Post-Quantum Cryptography
        </div>
        <div className="text-xl font-black mt-1 text-[#36d9ff] font-mono">
          {activePqcProfile.kem}
        </div>
        <div className="text-[11px] text-[#8190aa] mt-1 font-mono">
          Signature: <b className="text-[#a855f7]">{activePqcProfile.signature}</b>
        </div>
      </div>
    </section>
  );
};
