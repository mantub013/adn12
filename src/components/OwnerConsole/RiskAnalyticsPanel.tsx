import React from 'react';
import { useSecurity } from '../../context/SecurityContext';

export const RiskAnalyticsPanel: React.FC = () => {
  const { authEvents, riskLevel } = useSecurity();

  const totalAttempts = authEvents.length;
  const successAttempts = authEvents.filter((e) => e.result === 'SUCCESS').length;
  const successRate =
    totalAttempts > 0 ? Math.round((successAttempts / totalAttempts) * 100) : 100;

  const lowCount = authEvents.filter((e) => e.agent_risk === 'LOW').length;
  const medCount = authEvents.filter((e) => e.agent_risk === 'MEDIUM').length;
  const highCount = authEvents.filter((e) => e.agent_risk === 'HIGH').length;

  const totalRisks = Math.max(1, lowCount + medCount + highCount);
  const lowPct = Math.round((lowCount / totalRisks) * 100);
  const medPct = Math.round((medCount / totalRisks) * 100);
  const highPct = Math.max(0, 100 - lowPct - medPct);

  const alertStatus =
    riskLevel === 'HIGH'
      ? { label: 'CRITICAL ALERT', color: 'text-[#ff5f73]' }
      : riskLevel === 'MEDIUM'
      ? { label: 'ELEVATED SUSPICION', color: 'text-[#facc15]' }
      : { label: 'NORMAL', color: 'text-[#4ade80]' };

  return (
    <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h3 className="text-sm font-extrabold text-[#edf3ff]">
              Intrusion Risk & Attempt Velocity
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#facc15]/15 border border-[#facc15]/30 text-[#facc15]">
            ML Random Forest
          </span>
        </div>

        {/* Top Summary Stats */}
        <div className="flex justify-between items-center text-xs text-[#8190aa] mb-4 pb-3 border-b border-white/[0.06]">
          <span>
            Total Attempts: <b className="text-[#edf3ff]">{totalAttempts}</b>
          </span>
          <span>
            Success Rate: <b className="text-[#4ade80]">{successRate}%</b>
          </span>
          <span>
            Intrusion Alert: <b className={alertStatus.color}>{alertStatus.label}</b>
          </span>
        </div>

        {/* Risk Distribution Container */}
        <div className="bg-[#070b16] border border-white/[0.06] rounded-xl p-4">
          <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider mb-2">
            Risk Distribution:
          </div>
          {/* Bar */}
          <div className="flex h-4 rounded-md overflow-hidden gap-1 mb-3 bg-white/[0.05]">
            <div
              style={{ width: `${lowPct}%` }}
              className="bg-[#4ade80] transition-all duration-300"
              title={`Low Risk: ${lowCount}`}
            />
            <div
              style={{ width: `${medPct}%` }}
              className="bg-[#facc15] transition-all duration-300"
              title={`Medium Risk: ${medCount}`}
            />
            <div
              style={{ width: `${highPct}%` }}
              className="bg-[#ff5f73] transition-all duration-300"
              title={`High Risk: ${highCount}`}
            />
          </div>

          {/* Counts */}
          <div className="flex justify-between text-xs">
            <span className="text-[#4ade80] font-semibold">
              LOW: <b>{lowCount}</b> ({lowPct}%)
            </span>
            <span className="text-[#facc15] font-semibold">
              MEDIUM: <b>{medCount}</b> ({medPct}%)
            </span>
            <span className="text-[#ff5f73] font-semibold">
              HIGH: <b>{highCount}</b> ({highPct}%)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.08] text-[11px] text-[#8190aa]">
        * Random Forest weights input telemetry features with sliding 30-second intrusion rate
        windows.
      </div>
    </div>
  );
};
