import React, { useEffect, useState } from "react";

interface HealthData {
  status: string;
  system: string;
  network: string;
  chainId: number;
  contractAddress: string;
  onChainCycle: number;
  relayer?: {
    active: boolean;
    status: string;
    mode: string;
    walletBalance: string;
  };
  rpcTelemetry?: {
    status: string;
    latencyMs: number;
  };
  solana?: {
    address: string;
    solBalance: string;
    status: string;
  };
  fundingAlert?: {
    isLowFunded: boolean;
    thresholdEth: number;
    alertMessage: string;
  };
  timestamp: string;
}

export const OracleResonanceHUD: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [eventLogs, setEventLogs] = useState<Array<{ id: string; type: string; msg: string; time: string }>>([]);

  const addLog = (type: string, msg: string) => {
    setEventLogs((prev) => [
      { id: Math.random().toString(36).substring(2, 9), type, msg, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19), // Keep last 20 logs
    ]);
  };


  const handleNetworkSwitch = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetNetwork = e.target.value;
    try {
      const res = await fetch("/api/network/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network: targetNetwork }),
      });
      const data = await res.json(); if (data.status === "ok") { addLog("INFO", "Relayer pulse executed successfully with escalation fallback"); }
      if (data.status === "ok") {
        setHealthData((prev) => prev ? {
          ...prev,
          network: data.activeNetwork.name,
          chainId: data.activeNetwork.chainId,
          contractAddress: data.activeNetwork.contractAddress
        } : prev);
      }
    } catch (err) {
      console.error("Network switch request failed", err);
    }
  };


  useEffect(() => {
    // Initial fetch
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealthData(data))
      .catch((err) => console.error("Error fetching health:", err));

    
    // Connect to SSE stream
    const eventSource = new EventSource("/api/events");

    eventSource.onmessage = (event) => {
      try {
        const streamData = JSON.parse(event.data);
        setHealthData((prev) =>
          prev
            ? {
                ...prev,
                relayer: streamData.relayer,
                fundingAlert: streamData.fundingAlert,
                timestamp: streamData.timestamp,
              }
            : prev
        );
      } catch (err) {
        console.error("Failed to parse SSE payload", err);
      }
    };

    // Instant On-Chain Event Push Listener
    eventSource.addEventListener("contractEvent", (event) => {
      try {
        const eventData = JSON.parse(event.data);
        console.log("⚡ On-Chain Instant Event Received:", eventData); addLog("INFO", `Contract Event: ${eventData.eventName || "Cycle Update"}`);
        // Instant increment / cycle update on HUD
        setHealthData((prev) => prev ? {
          ...prev,
          onChainCycle: prev.onChainCycle + 1,
          timestamp: eventData.timestamp
        } : prev);
      } catch (err) {
        console.error("Failed to parse contractEvent payload", err);
      }
    });

    return () => eventSource.close();
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 font-sans shadow-2xl">
      {/* Top Banner Alert */}
      {healthData?.fundingAlert?.isLowFunded && (
        <div className="mb-4 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs text-amber-400">
          <span className="flex items-center gap-2 font-mono font-semibold">
            <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
            ⚠️ LOW RELAYER RESERVE: {healthData.relayer?.walletBalance?.slice(0, 7)} ETH remaining
          </span>
          <span className="text-[10px] text-amber-500/80 font-mono">
            Threshold: {healthData.fundingAlert.thresholdEth} ETH
          </span>
        </div>
      )}

      {/* Main HUD Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Column 1: Network & Contract */}
        <div className="flex flex-col justify-between">
          <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Network & Contract</span>
          <div>
            
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-emerald-400">
                {healthData?.network || "Sepolia Testnet"}
              </span>
              <select
                onChange={handleNetworkSwitch}
                className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-0.5 font-mono focus:outline-none focus:border-emerald-500"
                defaultValue="sepolia"
              >
                <option value="sepolia">Sepolia (11155111)</option>
                <option value="anvil">Anvil (31337)</option>
              </select>
            </div>

            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="px-2 py-1 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1.5 transition-colors"
            >
              <span>{isDrawerOpen ? "✕ Close Logs" : "📋 Telemetry Logs"}</span>
            </button>

            <span className="text-slate-500 font-mono text-[10px] block truncate">
              {healthData?.contractAddress ? `${healthData.contractAddress.slice(0, 6)}...${healthData.contractAddress.slice(-4)}` : "0xE158...aD75"}
            </span>
          </div>
        </div>

        {/* Column 2: On-Chain Cycle */}
        <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
          <span className="text-slate-400 block uppercase tracking-wider text-[10px]">On-Chain Cycle</span>
          <span className="font-mono text-lg font-bold text-sky-400 block">
            #{healthData?.onChainCycle ?? "---"}
          </span>
          <span className="text-slate-500 block text-[10px] mt-0.5">Resonance Synced</span>
        </div>

        {/* Column 3: RPC Telemetry */}
        <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
          <span className="text-slate-400 block uppercase tracking-wider text-[10px]">RPC Latency</span>
          <span className="font-mono text-sm font-semibold text-emerald-400 block">
            {healthData?.rpcTelemetry?.latencyMs ? `${healthData.rpcTelemetry.latencyMs} ms` : "---"}
          </span>
          <span className="text-slate-500 block text-[10px] mt-0.5">Alchemy Sepolia</span>
        </div>

        {/* Column 4: Relayer Reserve */}
        <div className={`border-t md:border-t-0 md:border-l pt-2 md:pt-0 md:pl-4 transition-colors ${healthData?.fundingAlert?.isLowFunded ? "border-amber-500/50 bg-amber-500/5 p-1 rounded" : "border-slate-800"}`}>
          <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Relayer Reserve</span>
          <span className="font-mono text-sm font-semibold text-emerald-400 block">
            {healthData?.relayer?.walletBalance ? `${parseFloat(healthData.relayer.walletBalance).toFixed(5)} ETH` : "0.00000 ETH"}
          </span>
          {healthData?.fundingAlert?.isLowFunded ? (
            <span className="text-amber-400 font-bold block text-[10px] mt-0.5 animate-pulse">
              ⚠️ REFUEL REQUIRED (&lt;{healthData.fundingAlert.thresholdEth} ETH)
            </span>
          ) : (
            <span className="text-slate-500 block text-[10px] mt-0.5">Sepolia Gas Reserve</span>
          )}
        </div>

        {/* Column 5: Solana Cross-Chain */}
        <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
          <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Solana Cross-Chain</span>
          <span className="font-mono text-sm font-semibold text-purple-400 block">
            {healthData?.solana?.solBalance ? `${healthData.solana.solBalance} SOL` : "0.0000 SOL"}
          </span>
          <span className="text-slate-500 font-mono text-[10px] block truncate mt-0.5">
            {healthData?.solana?.address ? `${healthData.solana.address.slice(0, 4)}...${healthData.solana.address.slice(-3)}` : "2ChM...1r9"}
          </span>
        </div>
      </div>
      {/* Slide-out Error & Telemetry Drawer */}
      {isDrawerOpen && (
        <div className="mt-4 border-t border-slate-800 pt-4 bg-slate-950/80 rounded-lg p-3 font-mono text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Relayer Failure & Event Stream Observability
            </span>
            <button
              onClick={() => setEventLogs([])}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline"
            >
              Clear Logs
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {eventLogs.length === 0 ? (
              <div className="text-slate-600 text-[11px] italic">No failures or stream events recorded yet.</div>
            ) : (
              eventLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-1.5 rounded border text-[11px] flex justify-between items-start gap-2 ${
                    log.type === "ERROR"
                      ? "bg-rose-950/30 border-rose-800/50 text-rose-300"
                      : log.type === "WARN"
                      ? "bg-amber-950/30 border-amber-800/50 text-amber-300"
                      : "bg-slate-900 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800 border border-slate-700">
                      {log.type}
                    </span>
                    <span>{log.msg}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 whitespace-nowrap">{log.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* Telemetry Log Drawer Component */}
      {isDrawerOpen && (
        <div className="mt-4 border-t border-slate-800 pt-4 bg-slate-950/90 rounded-lg p-3 font-mono text-xs shadow-xl transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                📋 Relayer & Telemetry Log Drawer
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400">
                {eventLogs.length} Events
              </span>
            </div>
            <button
              onClick={() => setEventLogs([])}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline"
            >
              Clear Logs
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 text-slate-300">
            {eventLogs.length === 0 ? (
              <div className="text-slate-600 text-[11px] italic py-2 text-center">
                No failure logs or telemetry events recorded yet.
              </div>
            ) : (
              eventLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded border text-[11px] flex justify-between items-start gap-2 ${
                    log.type === "ERROR"
                      ? "bg-rose-950/40 border-rose-800/60 text-rose-200"
                      : log.type === "WARN"
                      ? "bg-amber-950/40 border-amber-800/60 text-amber-200"
                      : "bg-slate-900/90 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`font-bold text-[9px] uppercase px-1.5 py-0.5 rounded border whitespace-nowrap ${
                      log.type === "ERROR"
                        ? "bg-rose-900/50 border-rose-700 text-rose-300"
                        : log.type === "WARN"
                        ? "bg-amber-900/50 border-amber-700 text-amber-300"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}>
                      {log.type}
                    </span>
                    <span className="break-all">{log.msg}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 whitespace-nowrap">{log.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

</div>
);
};
export default OracleResonanceHUD;
