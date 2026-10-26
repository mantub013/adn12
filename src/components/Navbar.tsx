import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { Shield, Lock, Wifi, WifiOff, ArrowRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activePqcProfile,
    deviceStatus,
    toggleHardwareOnline,
    activeTab,
    setActiveTab,
  } = useSecurity();

  return (
    <nav className="h-[74px] bg-[#060912]/90 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6d7cff] to-[#36d9ff] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(54,217,255,0.3)]">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-extrabold text-[15px] tracking-tight text-[#edf3ff] flex items-center gap-2">
            Agentic AI • Adaptive PQC Smart Door Lock
          </div>
          <div className="text-[11px] text-[#8190aa] hidden sm:block">
            NIST Quantum-Resistant IoT Security Simulation & ESP8266 Hardware Node
          </div>
        </div>
      </div>

      {/* Badges & Navigation Switcher */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Hardware Status Badge */}
        <button
          onClick={toggleHardwareOnline}
          title="Click to toggle ESP8266 Online/Offline state"
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition flex items-center gap-1.5 ${
            deviceStatus.is_online
              ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80] hover:bg-[#4ade80]/20'
              : 'bg-[#ff5f73]/10 border-[#ff5f73]/30 text-[#ff5f73] hover:bg-[#ff5f73]/20'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                deviceStatus.is_online ? 'bg-[#4ade80]' : 'bg-[#ff5f73]'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                deviceStatus.is_online ? 'bg-[#4ade80]' : 'bg-[#ff5f73]'
              }`}
            />
          </span>
          <span className="hidden md:inline">ESP8266:</span>
          <span>{deviceStatus.is_online ? 'ONLINE' : 'OFFLINE'}</span>
        </button>

        {/* PQC Suite Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#6d7cff]/15 border border-[#6d7cff]/40 text-[#c4ccff] shadow-[0_0_12px_rgba(109,124,255,0.2)]">
          <Lock className="w-3.5 h-3.5 text-[#36d9ff]" />
          <span>{activePqcProfile.kem} / {activePqcProfile.signature}</span>
        </div>

        {/* Navigation Switcher */}
        {activeTab === 'door' ? (
          <button
            onClick={() => setActiveTab('owner')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#36d9ff] bg-[#36d9ff]/10 hover:bg-[#36d9ff]/20 border border-[#36d9ff]/30 hover:border-[#36d9ff] px-3.5 py-1.5 rounded-lg transition-all duration-150 transform hover:-translate-y-0.5 shadow-sm"
          >
            <span>Owner Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('door')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#4ade80] bg-[#4ade80]/10 hover:bg-[#4ade80]/20 border border-[#4ade80]/30 hover:border-[#4ade80] px-3.5 py-1.5 rounded-lg transition-all duration-150 transform hover:-translate-y-0.5 shadow-sm"
          >
            <span>Public Door</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </nav>
  );
};
