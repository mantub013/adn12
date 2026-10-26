import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { OwnerLoginModal } from './OwnerLoginModal';
import { OverviewMetrics } from './OverviewMetrics';
import { ActuatorControlPanel } from './ActuatorControlPanel';
import { OtpManagerPanel } from './OtpManagerPanel';
import { RiskAnalyticsPanel } from './RiskAnalyticsPanel';
import { PqcProfilesInspector } from './PqcProfilesInspector';
import { SecurityAuditTable } from './SecurityAuditTable';
import { HardwareSimulatorPanel } from './HardwareSimulatorPanel';
import { Shield, ArrowLeft, LogOut } from 'lucide-react';

interface OwnerConsoleProps {
  onShowToast: (msg: string, type: 'success' | 'warn' | 'danger' | 'info') => void;
}

export const OwnerConsole: React.FC<OwnerConsoleProps> = ({ onShowToast }) => {
  const { ownerAuthenticated, ownerUsername, ownerLogout, setActiveTab } = useSecurity();

  const handleLogout = () => {
    ownerLogout();
    onShowToast('Logged out of Owner Console', 'info');
  };

  return (
    <div>
      {!ownerAuthenticated && <OwnerLoginModal onShowToast={onShowToast} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Owner Sub-Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6d7cff] to-[#a855f7] flex items-center justify-center text-white shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#edf3ff]">
                Owner Security Operations Center
              </h1>
              <div className="text-xs text-[#8190aa]">
                Agentic AI & NIST Post-Quantum Cryptographic Defense
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] text-xs font-bold font-mono">
              Admin: {ownerUsername || 'active'}
            </div>
            <button
              onClick={() => setActiveTab('door')}
              className="flex items-center gap-1.5 text-xs font-bold text-[#36d9ff] bg-[#36d9ff]/10 hover:bg-[#36d9ff]/20 border border-[#36d9ff]/30 px-3 py-1.5 rounded-lg transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Door</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-[#ff5f73] bg-[#ff5f73]/10 hover:bg-[#ff5f73]/20 border border-[#ff5f73]/30 px-3 py-1.5 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>LOGOUT</span>
            </button>
          </div>
        </header>

        {/* Overview Metrics */}
        <OverviewMetrics />

        {/* 2-Column Grid 1: Door Actuator & Password/OTP */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ActuatorControlPanel onShowToast={onShowToast} />
          <OtpManagerPanel onShowToast={onShowToast} />
        </div>

        {/* 2-Column Grid 2: Risk Analytics & PQC Profiles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <RiskAnalyticsPanel />
          <PqcProfilesInspector />
        </div>

        {/* Hardware Node Controller */}
        <HardwareSimulatorPanel onShowToast={onShowToast} />

        {/* Security Audit Table */}
        <SecurityAuditTable />
      </div>
    </div>
  );
};
