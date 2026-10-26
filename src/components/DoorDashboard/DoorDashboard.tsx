import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { DoorVisualizer } from './DoorVisualizer';
import { VirtualKeypad } from './VirtualKeypad';
import { QuantumDefenseCard } from './QuantumDefenseCard';
import { LangGraphVisualizer } from './LangGraphVisualizer';

interface DoorDashboardProps {
  onShowToast: (msg: string, type: 'success' | 'warn' | 'danger' | 'info') => void;
}

export const DoorDashboard: React.FC<DoorDashboardProps> = ({ onShowToast }) => {
  const { doorState, riskLevel, failedAttempts, activePqcProfile } = useSecurity();

  const doorStateColor =
    doorState === 'OPEN'
      ? 'text-[#4ade80]'
      : doorState === 'LOCKOUT'
      ? 'text-[#ff5f73]'
      : 'text-[#ff5f73]';

  const riskLevelColor =
    riskLevel === 'HIGH'
      ? 'text-[#ff5f73]'
      : riskLevel === 'MEDIUM'
      ? 'text-[#facc15]'
      : 'text-[#4ade80]';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Hero Header */}
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#edf3ff]">
          Autonomous Quantum-Resistant Door Control
        </h1>
        <p className="text-xs sm:text-sm text-[#8190aa] mt-1.5 max-w-3xl leading-relaxed">
          Multi-layered security engine driven by Random Forest intrusion classification and an
          8-node LangGraph agent with dynamic NIST Post-Quantum Cryptography.
        </p>
      </header>

      {/* Telemetry Stats Bar */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Door Actuator State */}
        <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-4 shadow-lg backdrop-blur-md">
          <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider">
            Door Actuator State
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-1 ${doorStateColor}`}>
            {doorState}
          </div>
        </div>

        {/* AI Risk Assessment */}
        <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-4 shadow-lg backdrop-blur-md">
          <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider">
            AI Risk Assessment
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-1 ${riskLevelColor}`}>
            {riskLevel}
          </div>
        </div>

        {/* Failed Attempts */}
        <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-4 shadow-lg backdrop-blur-md">
          <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider">
            Failed Attempts
          </div>
          <div className="text-xl sm:text-2xl font-black mt-1 text-[#edf3ff]">
            {failedAttempts}
          </div>
        </div>

        {/* Active PQC Profile */}
        <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-4 shadow-lg backdrop-blur-md">
          <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider">
            Active PQC Profile
          </div>
          <div className="text-xl sm:text-2xl font-black mt-1 text-[#36d9ff] font-mono">
            {activePqcProfile.kem}
          </div>
        </div>
      </section>

      {/* Interactive 3-Column Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <DoorVisualizer onShowToast={onShowToast} />
        <VirtualKeypad onShowToast={onShowToast} />
        <QuantumDefenseCard />
      </div>

      {/* 8-Node LangGraph Visualizer */}
      <LangGraphVisualizer />
    </div>
  );
};
