import React, { useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Lock, ShieldAlert } from 'lucide-react';

interface OwnerLoginModalProps {
  onShowToast: (msg: string, type: 'success' | 'warn' | 'danger' | 'info') => void;
}

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({ onShowToast }) => {
  const { ownerLogin } = useSecurity();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const ok = ownerLogin(username, password);
      setIsLoading(false);
      if (ok) {
        onShowToast('Owner authenticated successfully!', 'success');
      } else {
        setError('Invalid owner credentials. Hint: admin / admin123');
        onShowToast('Invalid owner credentials', 'danger');
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d1424] border border-white/[0.12] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#6d7cff] rounded-full blur-3xl opacity-20 pointer-events-none" />

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6d7cff] to-[#36d9ff] flex items-center justify-center text-white mx-auto mb-3 shadow-[0_4px_20px_rgba(54,217,255,0.3)]">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-[#edf3ff]">Owner Security Access</h2>
          <p className="text-xs text-[#8190aa] mt-1">
            Enter administrative credentials to access the door security console.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#ff5f73]/15 border border-[#ff5f73]/30 text-[#ff5f73] text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#8190aa] uppercase tracking-wider mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#070b16] border border-white/[0.1] text-sm text-[#edf3ff] focus:outline-none focus:border-[#36d9ff] transition"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#8190aa] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#070b16] border border-white/[0.1] text-sm text-[#edf3ff] focus:outline-none focus:border-[#36d9ff] transition"
              placeholder="admin123"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-[#6d7cff] to-[#36d9ff] hover:opacity-95 active:scale-[0.99] text-white font-extrabold text-xs tracking-wider uppercase shadow-[0_4px_16px_rgba(54,217,255,0.3)] transition disabled:opacity-50"
          >
            {isLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE OWNER'}
          </button>
        </form>
      </div>
    </div>
  );
};
