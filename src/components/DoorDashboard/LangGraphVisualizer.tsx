import React from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { PIPELINE_NODES } from '../../services/securityEngine';

export const LangGraphVisualizer: React.FC = () => {
  const { activeNode, lastDecision, riskLevel } = useSecurity();

  return (
    <section className="bg-[#0d1424]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-extrabold text-[#edf3ff] flex items-center gap-2">
            <span>LangGraph Autonomous Security Pipeline</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6d7cff]/15 border border-[#6d7cff]/30 text-[#36d9ff]">
              8-NODE STATE GRAPH
            </span>
          </h2>
          <div className="text-xs text-[#8190aa]">
            Sequential agentic reasoning with Random Forest intrusion detection & adaptive NIST PQC assignment
          </div>
        </div>
        {lastDecision && (
          <div className="text-[11px] text-[#8190aa] font-mono">
            Last Decision ID: <span className="text-[#36d9ff] font-bold">{lastDecision.decision_id}</span>
          </div>
        )}
      </div>

      {/* 8-Node Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-5">
        {PIPELINE_NODES.map((node) => {
          const isActive = activeNode === node.id;
          return (
            <div
              key={node.id}
              className={`p-3 rounded-xl border text-center transition-all duration-200 flex flex-col items-center justify-center min-h-[92px] ${
                isActive
                  ? 'node-active border-[#36d9ff] bg-[#36d9ff]/20 shadow-[0_0_15px_rgba(54,217,255,0.4)]'
                  : 'bg-[#070b16] border-white/[0.06] hover:border-white/[0.15]'
              }`}
            >
              <div className="text-2xl mb-1 filter drop-shadow">{node.icon}</div>
              <div
                className={`text-xs font-black tracking-wider uppercase ${
                  isActive ? 'text-[#36d9ff]' : 'text-[#edf3ff]'
                }`}
              >
                {node.label}
              </div>
              <div className="text-[10px] text-[#8190aa] line-clamp-1">{node.sublabel}</div>
            </div>
          );
        })}
      </div>

      {/* Decision Log Box */}
      <div className="bg-[#070b16] border border-white/[0.08] rounded-xl p-4 font-mono text-xs leading-relaxed text-zinc-300 shadow-inner">
        {lastDecision ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-2">
              <span className="font-bold text-[#36d9ff]">AGENT DECISION:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  lastDecision.risk_level === 'HIGH'
                    ? 'bg-[#ff5f73]/20 text-[#ff5f73]'
                    : lastDecision.risk_level === 'MEDIUM'
                    ? 'bg-[#facc15]/20 text-[#facc15]'
                    : 'bg-[#4ade80]/20 text-[#4ade80]'
                }`}
              >
                {lastDecision.risk_level} RISK
              </span>
              <span className="text-[#8190aa] text-[11px]">|</span>
              <span className="text-[#c4ccff]">
                Action: <b className="text-white">{lastDecision.autonomous_action.action}</b>
              </span>
              <span className="text-[#8190aa] text-[11px]">|</span>
              <span className="text-purple-300">
                PQC: <b className="text-white">{lastDecision.security_profile.kem}</b>
              </span>
            </div>

            {/* Observations */}
            <div>
              <span className="text-[#8190aa] font-bold">Observations: </span>
              <span>{lastDecision.observations.join(' • ') || 'None'}</span>
            </div>

            {/* ML Reasoning */}
            <div>
              <span className="text-[#8190aa] font-bold">Reasoning: </span>
              <span>{lastDecision.reasoning.join(' ')}</span>
            </div>

            {/* Autonomous Action Message */}
            <div className="text-[#4ade80]">
              <span className="font-bold">Autonomous Policy Execution: </span>
              <span>{lastDecision.autonomous_action.message}</span>
            </div>

            {/* Security Recommendations */}
            {lastDecision.security_recommendations.length > 0 && (
              <div className="text-amber-300/90 text-[11px] pt-1">
                <span className="font-bold">Security Advisories: </span>
                <span>{lastDecision.security_recommendations.join(' ')}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[#8190aa]">
            <strong className="text-zinc-300">Security Engine Status:</strong> Ready. Waiting for
            authentication request from virtual terminal or physical ESP8266 keypad...
          </div>
        )}
      </div>
    </section>
  );
};
