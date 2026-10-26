import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Lock, Unlock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DoorVisualizerProps {
  onShowToast: (msg: string, type: 'success' | 'warn' | 'danger' | 'info') => void;
}

export const DoorVisualizer: React.FC<DoorVisualizerProps> = ({ onShowToast }) => {
  const { doorState, doorUser, manualLockDoor, manualUnlockDoor, lockoutRemaining } = useSecurity();

  const handleLock = () => {
    manualLockDoor('WEB_UI_BUTTON');
    onShowToast('Simulated door locked manually.', 'info');
  };

  const handleUnlock = () => {
    manualUnlockDoor('WEB_UI_OVERRIDE');
    onShowToast('Simulated door unlocked via manual override.', 'success');
  };

  const isOpen = doorState === 'OPEN';
  const isLockout = doorState === 'LOCKOUT';

  return (
    <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xl backdrop-blur-md relative overflow-hidden">
      {/* Glow highlight */}
      <div
        className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 transition-colors duration-500 ${
          isOpen ? 'bg-[#4ade80]' : isLockout ? 'bg-[#ff5f73]' : 'bg-[#6d7cff]'
        }`}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-xl">
            🚪
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#edf3ff]">Simulated Physical Door</h2>
            <div className="text-xs text-[#8190aa]">Real-time actuator & lock telemetry</div>
          </div>
        </div>

        {/* 3D Door Viewport */}
        <div className="door-perspective w-full h-[230px] my-4 rounded-xl bg-gradient-to-b from-[#070b16] to-[#0a101f] border border-white/[0.06] flex items-center justify-center p-4 relative shadow-inner">
          {/* Outer Frame */}
          <div className="relative w-[150px] h-[200px] border-4 border-[#1e2a42] rounded-t-lg bg-[#080d1a] shadow-[inset_0_4px_16px_rgba(0,0,0,0.8)] overflow-visible">
            {/* Door Leaf (Rotates 3D) */}
            <div
              className={`door-leaf absolute inset-0 rounded-t-[3px] bg-gradient-to-r from-[#172338] via-[#1a2842] to-[#121b2d] border border-cyan-400/20 p-3 flex flex-col items-center justify-between shadow-2xl ${
                isOpen ? 'open' : 'locked'
              }`}
            >
              {/* Door Icon & User Label */}
              <div className="text-center mt-3">
                <div className="text-3xl filter drop-shadow">
                  {isOpen ? '🔓' : isLockout ? '⛔' : '🔒'}
                </div>
                <div className="text-[10px] font-black tracking-wider uppercase text-[#8190aa] mt-1">
                  {doorUser}
                </div>
              </div>

              {/* Decorative Panels */}
              <div className="w-full flex flex-col gap-2 my-auto">
                <div className="h-6 rounded border border-white/[0.06] bg-white/[0.02]" />
                <div className="h-6 rounded border border-white/[0.06] bg-white/[0.02]" />
              </div>

              {/* Handle & Lock Bolt */}
              <div className="w-full flex justify-end items-center pr-1 mb-6 relative">
                {/* Physical Bolt */}
                <div
                  className={`absolute right-[-10px] w-3 h-2 rounded-r transition-all duration-300 ${
                    isOpen ? 'bg-zinc-600 translate-x-[-6px]' : 'bg-[#36d9ff] shadow-[0_0_8px_#36d9ff]'
                  }`}
                />
                {/* Handle lever */}
                <div className="w-6 h-2 rounded-full bg-gradient-to-r from-zinc-300 to-zinc-500 shadow-md border border-zinc-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div
          className={`py-2 px-4 rounded-xl text-xs font-black text-center tracking-wider uppercase transition-all duration-300 border ${
            isOpen
              ? 'bg-[#4ade80]/15 border-[#4ade80]/40 text-[#4ade80] shadow-[0_0_15px_rgba(74,222,128,0.25)]'
              : isLockout
              ? 'bg-[#ff5f73]/15 border-[#ff5f73]/40 text-[#ff5f73] shadow-[0_0_15px_rgba(255,95,115,0.25)]'
              : 'bg-[#0a1120] border-white/10 text-[#edf3ff]'
          }`}
        >
          {isOpen
            ? 'DOOR UNLOCKED • ACCESS AUTHORIZED'
            : isLockout
            ? `SECURITY LOCKOUT (${lockoutRemaining}s)`
            : 'DOOR LOCKED'}
        </div>
      </div>

      {/* Actuator Overrides Controls */}
      <div className="mt-5 pt-4 border-t border-white/[0.08]">
        <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider mb-2.5">
          Actuator Overrides
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleLock}
            disabled={doorState === 'LOCKED'}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Lock className="w-3.5 h-3.5 text-[#ff5f73]" />
            <span>Lock Door</span>
          </button>
          <button
            onClick={handleUnlock}
            disabled={doorState === 'OPEN'}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-[#36d9ff]/10 hover:bg-[#36d9ff]/20 border border-[#36d9ff]/30 text-[#36d9ff] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Unlock className="w-3.5 h-3.5 text-[#36d9ff]" />
            <span>Force Unlock</span>
          </button>
        </div>
      </div>
    </div>
  );
};
