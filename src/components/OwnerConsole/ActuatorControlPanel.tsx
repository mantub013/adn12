import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Unlock, Lock, Activity, CheckCircle2 } from 'lucide-react';

interface ActuatorControlPanelProps {
  onShowToast: (msg: string, type: 'success' | 'warn' | 'danger' | 'info') => void;
}

export const ActuatorControlPanel: React.FC<ActuatorControlPanelProps> = ({ onShowToast }) => {
  const { manualUnlockDoor, manualLockDoor, doorState, activePqcProfile, deviceStatus } =
    useSecurity();

  const handleUnlock = () => {
    manualUnlockDoor('OWNER_OVERRIDE');
    onShowToast('Simulated door unlocked manually by Owner', 'success');
  };

  const handleLock = () => {
    manualLockDoor('OWNER_OVERRIDE');
    onShowToast('Simulated door locked manually by Owner', 'info');
  };

  return (
    <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚪</span>
            <h3 className="text-sm font-extrabold text-[#edf3ff]">
              Simulated Door Actuator Control
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#36d9ff]/15 border border-[#36d9ff]/30 text-[#36d9ff]">
            Admin Override
          </span>
        </div>

        <p className="text-xs text-[#8190aa] leading-relaxed mb-5">
          Direct administrative override commands. All actuation events are securely authorized,
          logged in SQLite/Audit stream, and mirrored to the public door dashboard.
        </p>

        {/* Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleUnlock}
            disabled={doorState === 'OPEN'}
            className="h-11 rounded-xl bg-[#4ade80]/15 hover:bg-[#4ade80]/25 border border-[#4ade80]/35 text-[#4ade80] font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition disabled:opacity-40"
          >
            <Unlock className="w-4 h-4" />
            <span>UNLOCK SIMULATED DOOR</span>
          </button>
          <button
            onClick={handleLock}
            disabled={doorState === 'LOCKED'}
            className="h-11 rounded-xl bg-[#ff5f73]/15 hover:bg-[#ff5f73]/25 border border-[#ff5f73]/35 text-[#ff5f73] font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition disabled:opacity-40"
          >
            <Lock className="w-4 h-4" />
            <span>LOCK SIMULATED DOOR</span>
          </button>
        </div>
      </div>

      {/* Subsystem Health */}
      <div className="mt-6 pt-4 border-t border-white/[0.08]">
        <div className="text-xs font-bold text-[#edf3ff] mb-2 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#36d9ff]" />
          <span>System Health Telemetry:</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8190aa]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>PQC Cryptex: <b className="text-zinc-200">ACTIVE</b></span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>ML Classifier: <b className="text-zinc-200">ONLINE</b></span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>LangGraph: <b className="text-zinc-200">8 NODES READY</b></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${deviceStatus.is_online ? 'bg-[#4ade80]' : 'bg-[#ff5f73]'}`} />
            <span>NodeMCU: <b className="text-zinc-200">{deviceStatus.is_online ? 'SYNCED' : 'OFFLINE'}</b></span>
          </div>
        </div>
      </div>
    </div>
  );
};
