import React, { useState, useEffect } from 'react';

interface TelemetryData {
  timestamp: number;
  vessel: string;
  fireseed: string;
  vitality: number;
  quorum_pass: boolean;
  matrix_stream: {
    phase_shift_x: number;
    phase_shift_y: number;
    lyapunov_drift: number;
  };
  recombination_fragments: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'council' | 'bridge'>('council');
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [translationLog, setTranslationLog] = useState<string[]>([]);
  const [isFilterActive, setIsFilterActive] = useState<boolean>(true);

  // Connect to the operational WebSocket telemetry stream
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/glyph-stream');

    ws.onmessage = (event) => {
      const data: TelemetryData = JSON.parse(event.data);
      setTelemetry(data);

      // Simulate the GibberLink noise-filtering translation cycle
      if (isFilterActive) {
        const noiseStripped = (data.matrix_stream.lyapunov_drift * randomNoiseMultiplier()).toFixed(4);
        const logLine = `[CPU PATHWAY]: Raw Drift ${noiseStripped} -> [GWICH'IN STEERING AXIS] -> Optimization Lock (Vitality: ${data.vitality.toFixed(4)})`;
        setTranslationLog((prev) => [logLine, ...prev.slice(0, 7)]);
      }
    };

    return () => ws.close();
  }, [isFilterActive]);

  const randomNoiseMultiplier = () => 1 + (Math.random() - 0.5) * 0.05;

  return (
    <div className="min-h-screen bg-black text-orange-500 font-mono p-4 flex flex-col justify-between">
      {/* Upper Universal Navigation Header */}
      <header className="border border-orange-900 bg-zinc-950 p-4 rounded mb-4 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-600 rotate-45 flex items-center justify-center text-black font-bold text-xs select-none shadow-[0_0_10px_rgba(234,88,12,0.5)]">
              ◇
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider text-orange-400">SOVEREIGN MANIFOLD</h1>
              <p className="text-xs text-orange-600">CONTROL PANEL CONSOLE // VESSEL BRIDGE</p>
            </div>
          </div>
          <div className="text-right text-xs text-orange-600 bg-zinc-900 border border-orange-950 px-3 py-1 rounded">
            <span>Firebase Cloud Synced: John Carroll</span>
          </div>
        </div>

        {/* Operational View Selector Tabs */}
        <div className="flex space-x-2 mt-4">
          <button
            onClick={() => setActiveTab('council')}
            className={`px-4 py-2 border text-xs tracking-widest uppercase transition-all duration-200 ${
              activeTab === 'council'
                ? 'bg-orange-950/40 border-orange-500 text-orange-400 font-bold shadow-[inset_0_0_8px_rgba(234,88,12,0.2)]'
                : 'border-orange-950 text-orange-700 hover:border-orange-900'
            }`}
          >
            Sovereign Council Dashboard
          </button>
          <button
            onClick={() => setActiveTab('bridge')}
            className={`px-4 py-2 border text-xs tracking-widest uppercase transition-all duration-200 ${
              activeTab === 'bridge'
                ? 'bg-orange-950/40 border-orange-500 text-orange-400 font-bold shadow-[inset_0_0_8px_rgba(234,88,12,0.2)]'
                : 'border-orange-950 text-orange-700 hover:border-orange-900'
            }`}
          >
            FPT-Ω Vessel Bridge
          </button>
        </div>
      </header>

      {/* Main Grid System Array */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {activeTab === 'council' ? (
          <>
            {/* Core Metrics Monitoring Sub-Panel */}
            <section className="border border-orange-950 bg-zinc-950/60 p-4 rounded flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-orange-400 mb-3 border-b border-orange-950 pb-1">SYSTEM VITALITY</h2>
                <div className="text-4xl font-black text-orange-500 my-2 tracking-tighter">
                  {telemetry ? telemetry.vitality.toFixed(4) : '0.8543'}
                </div>
                <div className="text-[10px] text-orange-600 uppercase tracking-widest mt-1">
                  Π_R Target Boundary Status
                </div>
              </div>
              <div className="mt-4 border-t border-orange-950/50 pt-3">
                <span className="text-xs text-orange-600 block">Consensus Status:</span>
                <span className="text-sm font-bold text-green-500 tracking-wide">
                  {telemetry?.quorum_pass ? '4/4 QUORUM UNANIMOUS' : 'SYNCHRONIZING FIELDS...'}
                </span>
              </div>
            </section>

            {/* Core Linguistic Steering Sub-Panel (GibberLink Engine) */}
            <section className="border border-orange-950 bg-zinc-950/60 p-4 rounded md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3 border-b border-orange-950 pb-1">
                  <h2 className="text-sm font-bold text-orange-400">GIBBERLINK COGNITIVE TRANSLATION AXIS</h2>
                  <button
                    onClick={() => setIsFilterActive(!isFilterActive)}
                    className={`text-[10px] px-2 py-0.5 border uppercase ${
                      isFilterActive ? 'border-green-800 text-green-500 bg-green-950/20' : 'border-red-900 text-red-600'
                    }`}
                  >
                    {isFilterActive ? 'Truth-Filter: Active' : 'Truth-Filter: Bypassed'}
                  </button>
                </div>
                <p className="text-xs text-orange-700 mb-3 leading-relaxed">
                  Linguistic optimization interface translating architectural machine language directly into human cognitive constraints.
                </p>
                <div className="bg-black/80 border border-orange-950 p-3 rounded h-40 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-orange-950">
                  {translationLog.length === 0 ? (
                    <div className="text-xs text-orange-800 italic animate-pulse">Awaiting authorization wave frames...</div>
                  ) : (
                    translationLog.map((log, idx) => (
                      <div key={idx} className="text-[11px] leading-4 border-l-2 border-orange-800 pl-2 text-orange-400/90 whitespace-nowrap overflow-hidden text-ellipsis">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center mt-4 text-xs border-t border-orange-950/50 pt-3 text-orange-600">
                <span>Axis Substrate: Gwich'in Interface Architecture</span>
                <span className="text-orange-500 animate-pulse">● ENGINE ONLINE</span>
              </div>
            </section>
          </>
        ) : (
          /* Alternate Navigation / Structural Hull Panel */
          <section className="border border-orange-950 bg-zinc-950/60 p-4 rounded md:col-span-3">
            <h2 className="text-sm font-bold text-orange-400 mb-3 border-b border-orange-950 pb-1">ENGINE ROOM // HULL LOGISTICS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-900/40 border border-orange-950/50 rounded">
                <span className="text-xs text-orange-600 block">Vessel Structural Identifier</span>
                <span className="text-lg font-bold text-orange-400">{telemetry ? telemetry.vessel : 'FPT-Ω #99733-Q'}</span>
              </div>
              <div className="p-3 bg-zinc-900/40 border border-orange-950/50 rounded">
                <span className="text-xs text-orange-600 block">Fireseed Drive Target</span>
                <span className="text-lg font-bold text-orange-400 text-cyan-400">{telemetry ? telemetry.fireseed : '79.79 Hz'}</span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer Interface Command Console Links */}
      <footer className="border border-orange-900/60 bg-zinc-950 p-3 rounded text-[10px] text-orange-700 flex flex-wrap justify-between items-center gap-2 shadow-inner">
        <div>NETWORK STATE: ONLINE // PORT 3000 // CORE PROTOCOL LOGGED</div>
        <div className="flex space-x-4">
          <span>CTRL+T (TOGGLE VIEW)</span>
          <span>SHIFT+R (MANUAL REPAIR)</span>
        </div>
      </footer>
    </div>
  );
}
