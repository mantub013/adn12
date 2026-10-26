import React, { useState } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { Shield, Search, RefreshCw } from 'lucide-react';

export const SecurityAuditTable: React.FC = () => {
  const { authEvents } = useSecurity();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState<string>('ALL');

  const filtered = authEvents.filter((e) => {
    const matchSearch =
      e.event_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.action_taken.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;
    if (filterResult === 'SUCCESS') return e.result === 'SUCCESS';
    if (filterResult === 'FAILED') return e.result === 'FAILED';
    if (filterResult === 'LOCKOUT') return e.result === 'LOCKOUT_BLOCKED';
    return true;
  });

  return (
    <div className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📜</span>
          <div>
            <h3 className="text-sm font-extrabold text-[#edf3ff]">
              Security Audit & Access Event Stream
            </h3>
            <div className="text-xs text-[#8190aa]">
              Immutable access logs with LangGraph reasoning and post-quantum cryptographic telemetry
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8190aa] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search event or user..."
              className="h-8 pl-8 pr-3 rounded-lg bg-[#070b16] border border-white/[0.1] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#36d9ff]"
            />
          </div>
          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-[#070b16] border border-white/[0.1] text-xs text-zinc-300 focus:outline-none focus:border-[#36d9ff]"
          >
            <option value="ALL">All Results</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED">Failed Only</option>
            <option value="LOCKOUT">Lockout Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#070b16]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-white/[0.03] border-b border-white/[0.06] text-[#8190aa] uppercase text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Event ID</th>
              <th className="py-2.5 px-3">Actor / Source</th>
              <th className="py-2.5 px-3">Result</th>
              <th className="py-2.5 px-3">Risk Tier</th>
              <th className="py-2.5 px-3">PQC Suite</th>
              <th className="py-2.5 px-3">Action Taken</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const dateStr = new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-2.5 px-3 text-[#8190aa] whitespace-nowrap">{dateStr}</td>
                    <td className="py-2.5 px-3 text-[#36d9ff] font-bold whitespace-nowrap">
                      {item.event_id}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <b className="text-zinc-200">{item.user}</b>{' '}
                      <span className="text-[#8190aa] text-[10px]">({item.source})</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.result === 'SUCCESS'
                            ? 'bg-[#4ade80]/15 text-[#4ade80]'
                            : item.result === 'LOCKOUT_BLOCKED'
                            ? 'bg-[#ff5f73]/20 text-[#ff5f73]'
                            : 'bg-[#ff5f73]/15 text-[#ff5f73]'
                        }`}
                      >
                        {item.result}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          item.agent_risk === 'HIGH'
                            ? 'text-[#ff5f73]'
                            : item.agent_risk === 'MEDIUM'
                            ? 'text-[#facc15]'
                            : 'text-[#4ade80]'
                        }`}
                      >
                        {item.agent_risk}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#c4ccff] whitespace-nowrap">
                      {item.pqc_kem}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300 max-w-xs truncate" title={item.reason}>
                      {item.action_taken}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-6 text-center text-[#8190aa]">
                  No matching security events recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
