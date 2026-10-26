import React, { useState, useEffect, useCallback } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Delete, X, Unlock, ShieldAlert } from 'lucide-react';

interface VirtualKeypadProps {
  onShowToast: (msg: string, type: 'success' | 'warn' | 'danger' | 'info') => void;
}

export const VirtualKeypad: React.FC<VirtualKeypadProps> = ({ onShowToast }) => {
  const {
    authenticatePin,
    triggerAabbReset,
    verifyResetOtp,
    setNewDoorPin,
    cancelResetFlow,
    resetState,
    lockoutRemaining,
    setMaskedKeypadLength,
    doorState,
  } = useSecurity();

  const [currentPin, setCurrentPin] = useState<string>('');
  const [tempNewPin, setTempNewPin] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [promptMessage, setPromptMessage] = useState<string>('ENTER PIN');
  const [promptType, setPromptType] = useState<'normal' | 'auth' | 'lockout' | 'success'>('normal');

  const isLockoutActive = lockoutRemaining > 0 || doorState === 'LOCKOUT';

  // Target slots count: 6 when waiting for OTP, else 4
  const targetSlots = resetState === 'RESET_WAITING_OTP' ? 6 : 4;

  // Sync prompt message to resetState or lockout
  useEffect(() => {
    if (isLockoutActive) {
      setPromptMessage(`SECURITY LOCKOUT (${lockoutRemaining}s)`);
      setPromptType('lockout');
    } else if (resetState === 'RESET_WAITING_OTP') {
      setPromptMessage('ENTER 6-DIGIT OWNER OTP');
      setPromptType('normal');
    } else if (resetState === 'RESET_NEW_PIN') {
      setPromptMessage('ENTER NEW 4-DIGIT PIN');
      setPromptType('normal');
    } else if (resetState === 'RESET_CONFIRM_PIN') {
      setPromptMessage('CONFIRM NEW PIN');
      setPromptType('normal');
    } else {
      setPromptMessage('ENTER PIN');
      setPromptType('normal');
    }
  }, [resetState, isLockoutActive, lockoutRemaining]);

  // Sync masked length for hardware telemetry mirror
  useEffect(() => {
    setMaskedKeypadLength(currentPin.length);
  }, [currentPin, setMaskedKeypadLength]);

  const pressKey = useCallback(
    (key: string) => {
      if (isProcessing || isLockoutActive) return;

      const maxLen = resetState === 'RESET_WAITING_OTP' ? 6 : 8;
      if (currentPin.length < maxLen) {
        const nextPin = currentPin + key;
        setCurrentPin(nextPin);

        // Auto-submit 4-digit PIN in NORMAL mode
        if (resetState === 'NORMAL' && nextPin.length === 4 && /^\d{4}$/.test(nextPin)) {
          setTimeout(() => handleSubmit(nextPin), 60);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPin, isProcessing, isLockoutActive, resetState]
  );

  const backspacePin = useCallback(() => {
    if (isProcessing || isLockoutActive) return;
    setCurrentPin((prev) => prev.slice(0, -1));
  }, [isProcessing, isLockoutActive]);

  const clearPin = useCallback(() => {
    if (isProcessing || isLockoutActive) return;
    setCurrentPin('');
  }, [isProcessing, isLockoutActive]);

  const handleSubmit = async (pinOverride?: string) => {
    const pinToSubmit = pinOverride !== undefined ? pinOverride : currentPin;
    if (!pinToSubmit || isProcessing || isLockoutActive) return;

    setCurrentPin('');

    // AABB command trigger
    if (pinToSubmit.toUpperCase() === 'AABB') {
      triggerAabbReset('VIRTUAL_KEYPAD');
      onShowToast('AABB triggered. View/generate 6-digit OTP in Owner Console.', 'info');
      return;
    }

    // Step 2: Verify OTP
    if (resetState === 'RESET_WAITING_OTP') {
      setIsProcessing(true);
      setPromptMessage('VERIFYING OTP...');
      setPromptType('auth');
      const valid = await verifyResetOtp(pinToSubmit);
      setIsProcessing(false);
      if (valid) {
        onShowToast('OTP Verified! Enter new 4-digit PIN.', 'success');
        setPromptMessage('ENTER NEW 4-DIGIT PIN');
        setPromptType('normal');
      } else {
        onShowToast('Invalid or expired OTP. Please check Owner Console.', 'danger');
        setPromptMessage('INVALID OTP — RETRY');
        setPromptType('lockout');
      }
      return;
    }

    // Step 3: Enter New PIN
    if (resetState === 'RESET_NEW_PIN') {
      if (pinToSubmit.length < 4) {
        onShowToast('PIN must be at least 4 digits.', 'warn');
        return;
      }
      setTempNewPin(pinToSubmit);
      onShowToast('Now re-enter new PIN to confirm.', 'info');
      // State transition is handled in parent or we call context
      // Note: We can manage the transition directly
      return;
    }

    // Step 4: Confirm New PIN
    if (resetState === 'RESET_CONFIRM_PIN') {
      setIsProcessing(true);
      setPromptMessage('UPDATING PIN...');
      setPromptType('auth');
      const success = await setNewDoorPin(tempNewPin, pinToSubmit);
      setIsProcessing(false);
      if (success) {
        onShowToast('Door PIN updated successfully! Enter new PIN to unlock.', 'success');
        setPromptMessage('ENTER PIN');
        setPromptType('normal');
        setTempNewPin('');
      } else {
        onShowToast('PIN mismatch! Reset aborted.', 'warn');
        setPromptMessage('PIN MISMATCH');
        setPromptType('lockout');
        cancelResetFlow();
      }
      return;
    }

    // Standard Normal Authentication
    setIsProcessing(true);
    setPromptMessage('AUTHENTICATING & RUNNING PIPELINE...');
    setPromptType('auth');

    const result = await authenticatePin(pinToSubmit, 'WEB_UI');
    setIsProcessing(false);

    if (result.success) {
      setPromptMessage('ACCESS GRANTED');
      setPromptType('success');
      onShowToast(result.message, 'success');
      setTimeout(() => {
        setPromptMessage('ENTER PIN');
        setPromptType('normal');
      }, 4000);
    } else {
      if (result.message.includes('Lockout') || result.message.includes('lockout')) {
        setPromptMessage('SECURITY LOCKOUT');
        setPromptType('lockout');
        onShowToast(result.message, 'danger');
      } else {
        setPromptMessage('ACCESS DENIED — RETRY');
        setPromptType('lockout');
        onShowToast(result.message, 'warn');
        setTimeout(() => {
          setPromptMessage('ENTER PIN');
          setPromptType('normal');
        }, 2200);
      }
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input element
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      const key = e.key.toUpperCase();
      if (/^[0-9]$/.test(key) || ['A', 'B', 'C', 'D'].includes(key)) {
        pressKey(key);
      } else if (key === 'ENTER') {
        handleSubmit();
      } else if (key === 'BACKSPACE') {
        backspacePin();
      } else if (key === 'ESCAPE') {
        clearPin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
      {/* Terminal Title Group */}
      <div className="text-center mb-4">
        <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest text-[#36d9ff] bg-[#36d9ff]/10 border border-[#36d9ff]/25 mb-1.5 uppercase">
          Virtual Access Node
        </div>
        <h2 className="text-lg font-black tracking-tight text-[#edf3ff]">SECURE DOOR ACCESS</h2>

        {/* Dynamic Prompt Pill */}
        <div
          className={`mt-2 py-1 px-3 rounded-full text-[11px] font-extrabold tracking-wider uppercase inline-flex items-center gap-1.5 transition-all duration-200 border ${
            promptType === 'success'
              ? 'bg-[#4ade80]/15 border-[#4ade80]/40 text-[#4ade80]'
              : promptType === 'lockout'
              ? 'bg-[#ff5f73]/15 border-[#ff5f73]/40 text-[#ff5f73]'
              : promptType === 'auth'
              ? 'bg-[#6d7cff]/20 border-[#6d7cff]/40 text-[#36d9ff] animate-pulse'
              : 'bg-white/[0.05] border-white/10 text-zinc-300'
          }`}
        >
          {promptType === 'lockout' && <ShieldAlert className="w-3 h-3 text-[#ff5f73]" />}
          <span>{promptMessage}</span>
        </div>
      </div>

      {/* Masked PIN Display Screen */}
      <div className="mb-4">
        <div className="h-16 rounded-xl bg-[#060a14] border border-cyan-400/25 flex items-center justify-center gap-3 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
          {Array.from({ length: targetSlots }).map((_, idx) => {
            const isFilled = idx < currentPin.length;
            return (
              <span
                key={idx}
                className={`text-2xl transition-all duration-150 ${
                  isFilled
                    ? 'text-[#36d9ff] scale-110 drop-shadow-[0_0_8px_#36d9ff]'
                    : 'text-zinc-700'
                }`}
              >
                {isFilled ? '●' : '○'}
              </span>
            );
          })}
        </div>
        <div className="text-[10px] text-center text-[#8190aa] mt-1.5 flex items-center justify-center gap-1">
          <span>🔒</span> End-to-End Cryptographically Masked
        </div>
      </div>

      {/* 4x4 Matrix Keypad */}
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 mb-4">
        {/* Row 1 */}
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('1')}
          className="key-press h-12 sm:h-13 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-[#36d9ff]/20 border border-white/[0.08] text-lg font-bold text-[#edf3ff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          1
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('2')}
          className="key-press h-12 sm:h-13 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-[#36d9ff]/20 border border-white/[0.08] text-lg font-bold text-[#edf3ff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          2
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('3')}
          className="key-press h-12 sm:h-13 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-[#36d9ff]/20 border border-white/[0.08] text-lg font-bold text-[#edf3ff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          3
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('A')}
          className="key-press h-12 sm:h-13 rounded-xl bg-[#6d7cff]/10 hover:bg-[#6d7cff]/20 border border-[#6d7cff]/25 text-base font-extrabold text-[#c4ccff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          A
        </button>

        {/* Row 2 */}
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('4')}
          className="key-press h-12 sm:h-13 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-[#36d9ff]/20 border border-white/[0.08] text-lg font-bold text-[#edf3ff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          4
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('5')}
          className="key-press h-12 sm:h-13 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-[#36d9ff]/20 border border-white/[0.08] text-lg font-bold text-[#edf3ff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          5
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('6')}
          className="key-press h-12 sm:h-13 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-[#36d9ff]/20 border border-white/[0.08] text-lg font-bold text-[#edf3ff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          6
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('B')}
          className="key-press h-12 sm:h-13 rounded-xl bg-[#6d7cff]/10 hover:bg-[#6d7cff]/20 border border-[#6d7cff]/25 text-base font-extrabold text-[#c4ccff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          B
        </button>

        {/* Row 3 */}
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('7')}
          className="key-press h-12 sm:h-13 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-[#36d9ff]/20 border border-white/[0.08] text-lg font-bold text-[#edf3ff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          7
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('8')}
          className="key-press h-12 sm:h-13 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-[#36d9ff]/20 border border-white/[0.08] text-lg font-bold text-[#edf3ff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          8
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('9')}
          className="key-press h-12 sm:h-13 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-[#36d9ff]/20 border border-white/[0.08] text-lg font-bold text-[#edf3ff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          9
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('C')}
          className="key-press h-12 sm:h-13 rounded-xl bg-[#6d7cff]/10 hover:bg-[#6d7cff]/20 border border-[#6d7cff]/25 text-base font-extrabold text-[#c4ccff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          C
        </button>

        {/* Row 4 */}
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={clearPin}
          className="key-press h-12 sm:h-13 rounded-xl bg-[#ff5f73]/10 hover:bg-[#ff5f73]/20 border border-[#ff5f73]/30 text-xs font-black text-[#ff5f73] transition flex flex-col items-center justify-center leading-tight disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-sm font-bold">*</span>
          <span className="text-[9px]">CLEAR</span>
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('0')}
          className="key-press h-12 sm:h-13 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-[#36d9ff]/20 border border-white/[0.08] text-lg font-bold text-[#edf3ff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          0
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => handleSubmit()}
          className="key-press h-12 sm:h-13 rounded-xl bg-[#4ade80]/15 hover:bg-[#4ade80]/25 border border-[#4ade80]/35 text-xs font-black text-[#4ade80] transition flex flex-col items-center justify-center leading-tight disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(74,222,128,0.2)]"
        >
          <span className="text-sm font-bold">#</span>
          <span className="text-[9px]">ENTER</span>
        </button>
        <button
          disabled={isLockoutActive || isProcessing}
          onClick={() => pressKey('D')}
          className="key-press h-12 sm:h-13 rounded-xl bg-[#6d7cff]/10 hover:bg-[#6d7cff]/20 border border-[#6d7cff]/25 text-base font-extrabold text-[#c4ccff] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          D
        </button>
      </div>

      {/* Action Toolbar */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          disabled={isLockoutActive || isProcessing || currentPin.length === 0}
          onClick={backspacePin}
          className="py-2 px-2.5 rounded-lg text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 flex items-center justify-center gap-1 disabled:opacity-30 transition"
        >
          <Delete className="w-3.5 h-3.5" />
          <span>BACKSPACE</span>
        </button>
        <button
          disabled={isLockoutActive || isProcessing || currentPin.length === 0}
          onClick={clearPin}
          className="py-2 px-2.5 rounded-lg text-[11px] font-bold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 flex items-center justify-center gap-1 disabled:opacity-30 transition"
        >
          <X className="w-3.5 h-3.5" />
          <span>CLEAR</span>
        </button>
        <button
          disabled={isLockoutActive || isProcessing || currentPin.length === 0}
          onClick={() => handleSubmit()}
          className="py-2 px-2.5 rounded-lg text-[11px] font-extrabold bg-[#36d9ff]/20 hover:bg-[#36d9ff]/30 border border-[#36d9ff]/40 text-[#36d9ff] flex items-center justify-center gap-1 disabled:opacity-30 transition shadow-sm"
        >
          <Unlock className="w-3.5 h-3.5" />
          <span>SUBMIT</span>
        </button>
      </div>

      {/* Quick Simulation Actions */}
      <div className="pt-3 border-t border-white/[0.08]">
        <div className="text-[10px] font-bold text-[#8190aa] uppercase tracking-wider mb-2">
          Hardware & Pipeline Simulation
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            disabled={isLockoutActive || isProcessing}
            onClick={() => handleSubmit('1234')}
            className="py-1 px-2 rounded-md text-[10px] font-bold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 transition"
          >
            Quick Auth (Dad 1234)
          </button>
          <button
            disabled={isLockoutActive || isProcessing}
            onClick={() => handleSubmit('9999')}
            className="py-1 px-2 rounded-md text-[10px] font-bold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 transition"
          >
            Simulate Wrong PIN
          </button>
          <button
            disabled={isLockoutActive || isProcessing}
            onClick={() => {
              triggerAabbReset('QUICK_SIMULATION');
              onShowToast('AABB Reset initiated. Switch to Owner Console to view OTP.', 'info');
            }}
            className="py-1 px-2 rounded-md text-[10px] font-bold bg-[#facc15]/10 hover:bg-[#facc15]/20 border border-[#facc15]/30 text-[#facc15] transition"
          >
            Trigger AABB Reset
          </button>
        </div>
      </div>
    </div>
  );
};
