import React, { useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { KeyRound, Zap, XCircle } from 'lucide-react';

interface OtpManagerPanelProps {
  onShowToast: (msg: string, type: 'success' | 'warn' | 'danger' | 'info') => void;
}

export const OtpManagerPanel: React.FC<OtpManagerPanelProps> = ({ onShowToast }) => {
  const {
    resetSession,
    generateOwnerOtp,
    revokeOwnerOtp,
    directResetCredential,
  } = useSecurity();

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const hasActiveOtp =
    resetSession && resetSession.remaining_seconds > 0 && resetSession.status === 'PENDING';

  const handleGenerate = () => {
    const s = generateOwnerOtp();
    onShowToast(`6-Digit Reset OTP Generated: ${s.otp}`, 'success');
  };

  const handleRevoke = () => {
    revokeOwnerOtp();
    onShowToast('Reset session and OTP revoked', 'info');
  };

  const handleDirectReset = async () => {
    if (!newPin || !confirmPin) {
      onShowToast('Please fill out both PIN fields', 'warn');
      return;
    }
    setIsUpdating(true);
    const res = await directResetCredential(newPin, confirmPin);
    setIsUpdating(false);
    if (res.success) {
      onShowToast(res.message, 'success');
      setNewPin('');
      setConfirmPin('');
    } else {
      onShowToast(res.message, 'danger');
    }
  };

  return (
    <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔑</span>
            <h3 className="text-sm font-extrabold text-[#edf3ff]">Password Management & OTP</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#4ade80]/15 border border-[#4ade80]/30 text-[#4ade80]">
            AABB Compatible
          </span>
        </div>

        {/* Dynamic OTP Display Card */}
        <div className="bg-[#070b16] border border-cyan-400/20 rounded-xl p-4 text-center mb-4 shadow-inner">
          <div className="text-[11px] font-bold text-[#8190aa] uppercase tracking-wider mb-1">
            Password Reset Authorization Code
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-[#36d9ff] my-1">
            {hasActiveOtp ? resetSession.otp : 'NO ACTIVE OTP'}
          </div>
          <div className="text-[11px] text-[#8190aa]">
            {hasActiveOtp ? (
              <span className="text-[#facc15] font-semibold">
                Expires in: {resetSession.remaining_seconds} seconds
              </span>
            ) : (
              'Click below to generate 2-minute OTP'
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-2.5 mb-5">
          <button
            onClick={handleGenerate}
            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#6d7cff] to-[#36d9ff] hover:opacity-95 text-white font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-[0_2px_12px_rgba(54,217,255,0.25)] transition"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>GENERATE RESET OTP</span>
          </button>
          {hasActiveOtp && (
            <button
              onClick={handleRevoke}
              className="h-10 px-4 rounded-xl bg-[#ff5f73]/15 hover:bg-[#ff5f73]/25 border border-[#ff5f73]/35 text-[#ff5f73] font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5 transition"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>REVOKE OTP</span>
            </button>
          )}
        </div>
      </div>

      {/* Direct Web Password Reset (Owner) */}
      <div className="pt-4 border-t border-white/[0.08]">
        <div className="text-xs font-bold text-[#edf3ff] mb-2.5">
          Direct Web Password Reset (Owner):
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <input
            type="password"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="New PIN (e.g. 2580)"
            maxLength={8}
            className="h-10 px-3 rounded-xl bg-[#070b16] border border-white/[0.1] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#36d9ff]"
          />
          <input
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Confirm PIN"
            maxLength={8}
            className="h-10 px-3 rounded-xl bg-[#070b16] border border-white/[0.1] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#36d9ff]"
          />
        </div>
        <button
          onClick={handleDirectReset}
          disabled={isUpdating}
          className="w-full h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] text-xs font-extrabold text-[#edf3ff] uppercase tracking-wider transition disabled:opacity-40"
        >
          {isUpdating ? 'UPDATING...' : 'UPDATE DOOR CREDENTIAL'}
        </button>
      </div>
    </div>
  );
};
