import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Radio, Wifi, RefreshCw, Send, CheckCircle } from 'lucide-react';

interface HardwareSimulatorPanelProps {
  onShowToast: (msg: string, type: 'success' | 'warn' | 'danger' | 'info') => void;
}

export const HardwareSimulatorPanel: React.FC<HardwareSimulatorPanelProps> = ({ onShowToast }) => {
  const {
    deviceStatus,
    toggleHardwareOnline,
    simulateHardwareHeartbeat,
    authenticatePin,
    triggerAabbReset,
  } = useSecurity();

  const handleHeartbeat = () => {
    simulateHardwareHeartbeat();
    onShowToast('ESP8266 Heartbeat telemetry synchronized with server.', 'info');
  };

  const handleSimulateHardwarePin = async (pin: string) => {
    onShowToast(`ESP8266 Keypad hardware sending PIN (${pin})...`, 'info');
    await authenticatePin(pin, 'ESP8266_KEYPAD');
  };

  const handleSimulateHardwareAabb = () => {
    triggerAabbReset('ESP8266_HARDWARE_KEYPAD');
    onShowToast('ESP8266 Keypad pressed [A][A][B][B] sequence.', 'warn');
  };

  return (
    <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📡</span>
          <div>
            <h3 className="text-sm font-extrabold text-[#edf3ff]">
              ESP8266 NodeMCU Hardware Node Simulator
            </h3>
            <div className="text-xs text-[#8190aa]">
              Bidirectional REST telemetry & masked hardware keypad synchronization
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleHardwareOnline}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              deviceStatus.is_online
                ? 'bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80] hover:bg-[#4ade80]/20'
                : 'bg-[#ff5f73]/10 border-[#ff5f73]/30 text-[#ff5f73] hover:bg-[#ff5f73]/20'
            }`}
          >
            {deviceStatus.is_online ? 'Disable Hardware (Go Offline)' : 'Enable Hardware (Go Online)'}
          </button>
          <button
            onClick={handleHeartbeat}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-zinc-300 flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Send Heartbeat</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#070b16] border border-white/[0.06] rounded-xl p-4">
        {/* Device Info */}
        <div className="space-y-1.5 text-xs">
          <div className="text-[#8190aa] font-bold uppercase text-[10px]">Node Identity</div>
          <div>
            ID: <b className="text-[#36d9ff] font-mono">{deviceStatus.device_id}</b>
          </div>
          <div>
            Firmware: <b className="text-zinc-300 font-mono">v{deviceStatus.firmware_version}</b>
          </div>
          <div>
            IP Address: <b className="text-zinc-300 font-mono">{deviceStatus.ip_address}</b>
          </div>
        </div>

        {/* Radio & Telemetry */}
        <div className="space-y-1.5 text-xs">
          <div className="text-[#8190aa] font-bold uppercase text-[10px]">Radio & Network</div>
          <div>
            WiFi Status:{' '}
            <b className={deviceStatus.is_online ? 'text-[#4ade80]' : 'text-[#ff5f73]'}>
              {deviceStatus.wifi_status}
            </b>
          </div>
          <div>
            Signal RSSI:{' '}
            <b className="text-zinc-300 font-mono">{deviceStatus.is_online ? `${deviceStatus.rssi} dBm` : '—'}</b>
          </div>
          <div>
            Keypad Activity:{' '}
            <b className="text-[#36d9ff] font-mono">
              {deviceStatus.keypad_state} ({deviceStatus.input_length} digits buffered)
            </b>
          </div>
        </div>

        {/* Hardware Action Simulation */}
        <div className="space-y-1.5 text-xs flex flex-col justify-center">
          <div className="text-[#8190aa] font-bold uppercase text-[10px] mb-1">
            Simulate Physical Numpad Press
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleSimulateHardwarePin('1234')}
              className="py-1 px-2.5 rounded-md text-[11px] font-bold bg-[#4ade80]/15 hover:bg-[#4ade80]/25 border border-[#4ade80]/30 text-[#4ade80] transition"
            >
              Hardware Auth (1234)
            </button>
            <button
              onClick={() => handleSimulateHardwarePin('0000')}
              className="py-1 px-2.5 rounded-md text-[11px] font-bold bg-[#ff5f73]/15 hover:bg-[#ff5f73]/25 border border-[#ff5f73]/30 text-[#ff5f73] transition"
            >
              Hardware Wrong PIN
            </button>
            <button
              onClick={handleSimulateHardwareAabb}
              className="py-1 px-2.5 rounded-md text-[11px] font-bold bg-[#facc15]/15 hover:bg-[#facc15]/25 border border-[#facc15]/30 text-[#facc15] transition"
            >
              Hardware AABB
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
