import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  Legend,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { 
  Shield, 
  Sparkles, 
  Navigation, 
  Flame, 
  Radio, 
  Zap, 
  Activity, 
  Info, 
  Table, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  HelpCircle, 
  Terminal, 
  RefreshCw, 
  AlertTriangle,
  Download,
  Wrench,
  Layers,
  ChevronDown
} from 'lucide-react';

interface TelemetryPoint {
  block: number;
  vitality: number;
  h_band: number;
  curvature: number;
  dampening: number;
}

interface CryptographicProof {
  sha256: string;
  ledger_anchor: string;
}

interface BriefingPayload {
  timestamp: string;
  status: string;
  vitality: number;
  briefing_narrative: string;
  cryptographic_proof: CryptographicProof;
  quantities_before?: Record<string, number>;
  quantities_after?: Record<string, number>;
}

interface Fragment {
  id: number;
  name: string;
  x: number;
  y: number;
  recombined: boolean;
}

interface StepData {
  type: string;
  step: number;
  fragments?: Fragment[];
  ledgers?: Record<string, string>;
  mesh_reciprocity?: number;
  trinity_stability?: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'council' | 'bridge'>('council');
  
  // State for ledger metrics
  const [ledger, setLedger] = useState({
    resonance: 85.43,
    gtc_balance: 105446,
    compound_years: 4.20,
    hidden_balance: 1339371,
    forfeited_short_game: 978685,
    status: 'Consensus loop completed. Ledger signature verification checked and approved.'
  });
  
  // State for fireseed status
  const [fireseed, setFireseed] = useState({
    total_earnings: 1.234567,
    log_path: '/var/log/sovereign/fireseed_ignition.log',
    status: 'IGNITED',
    vessel_hz: 79.79
  });
  
  // State for scrolling line chart telemetry
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([
    { block: 1, vitality: 0.9343, h_band: 3.0588, curvature: 0.892, dampening: 0.6351 },
    { block: 2, vitality: 0.9412, h_band: 3.0612, curvature: 0.895, dampening: 0.6353 },
    { block: 3, vitality: 0.9504, h_band: 3.0645, curvature: 0.889, dampening: 0.6356 },
    { block: 4, vitality: 0.9482, h_band: 3.0621, curvature: 0.891, dampening: 0.6354 },
    { block: 5, vitality: 0.9614, h_band: 3.0678, curvature: 0.892, dampening: 0.6355 }
  ]);
  
  // Live simulated briefing report
  const [activeBriefing, setActiveBriefing] = useState<BriefingPayload>({
    timestamp: new Date().toISOString(),
    status: "APPROVED",
    vitality: 0.9614,
    briefing_narrative: "Consensus loop completed successfully. The living manifold vitality tracking maintains structural headroom under living pi_r boundaries. Ledger signature verification checked and approved.",
    cryptographic_proof: {
      sha256: "bf9374b808e49b5cc40794d6c572225883a886815158ff2547dfb8f044ec5336",
      ledger_anchor: "61315b99d66734358e72027f346282d3a7e3f4dc4d2cb5bbb00241af9db94aa6"
    },
    quantities_before: {
      "waterproofing_membrane": 1240.99,
      "insulation_board": 891.21,
      "sealant_cartridges": 156.12
    },
    quantities_after: {
      "waterproofing_membrane": 1241.75,
      "insulation_board": 891.76,
      "sealant_cartridges": 156.22
    }
  });

  // State for live WebSocket stream
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [stepData, setStepData] = useState<StepData>({
    type: 'step',
    step: 0,
    ledgers: {
      "Block Anchor": "0x99733-Q-INIT",
      "Entropy Threshold": "0.1245",
      "Dynamic Coherence": "85%",
      "Council Votes": "4/4 Quorum Unanimous"
    }
  });

  // Trinity dynamics state
  const [trinityPreset, setTrinityPreset] = useState<string>('Balanced');
  const [customDamp, setCustomDamp] = useState<string>('');
  const [trinityImg, setTrinityImg] = useState<string>('');
  const [trinityData, setTrinityData] = useState({
    ground_state: 0.8841,
    phase: 0.125,
    stability: 0.8800
  });

  // Comms translator state
  const [inputText, setInputText] = useState<string>('');
  const [translationResult, setTranslationResult] = useState<string>('');
  const [translating, setTranslating] = useState<boolean>(false);

  // Truth filter state
  const [truthInputText, setTruthInputText] = useState<string>('');
  const [truthAnalysis, setTruthAnalysis] = useState<{
    symptomPercent: number;
    deltaPercent: number;
    actualDelta: string;
    recommendation: string;
  } | null>(null);

  // UI state
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [shadowOverlayItem, setShadowOverlayItem] = useState<boolean>(false);
  const [hullIntegrity, setHullIntegrity] = useState<number>(96.5);
  const [isRepairing, setIsRepairing] = useState<boolean>(false);
  const [repairProgress, setRepairProgress] = useState<number>(0);
  const [repairOverride, setRepairOverride] = useState<boolean>(false);
  const [repairCyclesCount, setRepairCyclesCount] = useState<number>(() => {
    const saved = localStorage.getItem('repair_cycles_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [cumulativeNanitesDischarged, setCumulativeNanitesDischarged] = useState<number>(() => {
    const saved = localStorage.getItem('cumulative_nanites_discharged');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lastOverhaulCount, setLastOverhaulCount] = useState<number>(() => {
    const saved = localStorage.getItem('last_overhaul_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isOverhauling, setIsOverhauling] = useState<boolean>(false);
  const [overhaulProgress, setOverhaulProgress] = useState<number>(0);
  const [emergencyAutoRepair, setEmergencyAutoRepair] = useState<boolean>(false);
  const [showStressHeatmap, setShowStressHeatmap] = useState<boolean>(true);
  const [showThermalFlux, setShowThermalFlux] = useState<boolean>(false);
  const [showEMInterference, setShowEMInterference] = useState<boolean>(false);
  const [showGranularHeatmap, setShowGranularHeatmap] = useState<boolean>(true);
  const [hoveredPressureNode, setHoveredPressureNode] = useState<{ id: string; layer: string; angle: number; stress: number; x: number; y: number } | null>(null);
  const [isDiagnosticMenuOpen, setIsDiagnosticMenuOpen] = useState<boolean>(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'ALERT' | 'REPAIR' | 'SUCCESS'>('ALL');
  const [criticalModeEnabled, setCriticalModeEnabled] = useState<boolean>(false);
  const [criticalThreshold, setCriticalThreshold] = useState<number>(93.0);

  useEffect(() => {
    localStorage.setItem('repair_cycles_count', repairCyclesCount.toString());
  }, [repairCyclesCount]);

  useEffect(() => {
    localStorage.setItem('cumulative_nanites_discharged', cumulativeNanitesDischarged.toString());
  }, [cumulativeNanitesDischarged]);

  useEffect(() => {
    localStorage.setItem('last_overhaul_count', lastOverhaulCount.toString());
  }, [lastOverhaulCount]);

  // Operational terminal logs state
  const [logs, setLogs] = useState<Array<{ id: string; timestamp: string; level: 'INFO' | 'ALERT' | 'REPAIR' | 'SUCCESS'; message: string }>>([
    { id: '1', timestamp: '23:15:00', level: 'INFO', message: 'FPT-Ω Vessel Core System initialized. Operational status green.' },
    { id: '2', timestamp: '23:15:02', level: 'INFO', message: 'Polaris Pivot tracking anchored at 23.5° axial tilt.' },
    { id: '3', timestamp: '23:15:05', level: 'INFO', message: 'E8 Harmonics Engine online. Active dampening balance active.' },
  ]);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const addLog = useCallback((level: 'INFO' | 'ALERT' | 'REPAIR' | 'SUCCESS', message: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
    setLogs(prev => {
      // Avoid duplicate consecutive logs of identical messages
      if (prev.length > 0 && prev[prev.length - 1].message === message) return prev;
      return [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: timeStr,
          level,
          message
        }
      ].slice(-100); // Keep last 100 entries
    });
  }, []);

  // Compute Avg Weekly Hull Integrity from the system vitality telemetry data
  const computedStressZones = useMemo(() => {
    const stressZones = [
      { id: 'fore', name: 'FORE BOW', angle: -90, base: 0.25 },
      { id: 'fore_port', name: 'FORE-PORT', angle: -45, base: 0.40 },
      { id: 'port', name: 'PORT FLANK', angle: 0, base: 0.65 },
      { id: 'aft_port', name: 'AFT-PORT', angle: 45, base: 0.50 },
      { id: 'aft', name: 'AFT STERN', angle: 90, base: 0.30 },
      { id: 'aft_starboard', name: 'AFT-STARBOARD', angle: 135, base: 0.55 },
      { id: 'starboard', name: 'STARBOARD', angle: 180, base: 0.70 },
      { id: 'fore_starboard', name: 'FORE-STBD', angle: 225, base: 0.35 }
    ];
    
    const elapsed = Date.now() * 0.0015;
    const integrityFactor = (100 - hullIntegrity) / 10; // ranges from 0 to 1.0
    const isCriticalActive = criticalModeEnabled && hullIntegrity < criticalThreshold;

    return stressZones.map((zone, idx) => {
      const wave = Math.sin(elapsed + idx * 1.5) * 0.08 + Math.cos(elapsed * 0.7 - idx) * 0.04;
      let calculatedStress = Math.max(0.12, Math.min(0.98, zone.base + (integrityFactor * 0.35) + wave));
      
      if (isCriticalActive) {
        // Boost to maximum diagnostic state (88% to 98% range)
        calculatedStress = Math.max(calculatedStress, 0.88 + Math.sin(elapsed * 3 + idx) * 0.08);
      }

      return {
        ...zone,
        stress: calculatedStress
      };
    });
  }, [hullIntegrity, stepData?.step, criticalModeEnabled, criticalThreshold]);

  const avgWeeklyHullIntegrity = useMemo(() => {
    if (!telemetry || telemetry.length === 0) return 96.50;
    const mappedValues = telemetry.map(p => {
      const v = p.vitality;
      const mappedBase = 91 + ((Math.max(0.7, Math.min(1.0, v)) - 0.7) / 0.3) * 6;
      return mappedBase;
    });
    const avg = mappedValues.reduce((sum, val) => sum + val, 0) / mappedValues.length;
    return parseFloat(avg.toFixed(2));
  }, [telemetry]);

  // Compute Structural Drift Shift variance over the last 10 blocks for the stacked bar chart
  const driftChartData = useMemo(() => {
    const last10 = telemetry.slice(-10);
    return last10.map((pt) => {
      const b = pt.block;
      // Generate deterministic but dynamic-looking material drift shifts
      const waterproofingDrift = parseFloat((0.5 + Math.sin(b * 0.7) * 0.2 + (pt.vitality - 0.9) * 2).toFixed(2));
      const insulationDrift = parseFloat((0.3 + Math.cos(b * 0.5) * 0.15 + (pt.vitality - 0.9) * 1.5).toFixed(2));
      const sealantDrift = parseFloat((0.1 + Math.sin(b * 1.3) * 0.05 + (pt.vitality - 0.9) * 0.5).toFixed(2));
      
      const wDrift = Math.max(0.05, waterproofingDrift);
      const iDrift = Math.max(0.05, insulationDrift);
      const sDrift = Math.max(0.02, sealantDrift);

      return {
        block: `B${b}`,
        "Waterproofing Membrane": wDrift,
        "Insulation Board": iDrift,
        "Sealant Cartridges": sDrift,
      };
    });
  }, [telemetry]);

  // References for charts / UI elements
  const wsRef = useRef<WebSocket | null>(null);

  // 1. WebSocket stream ingestion
  useEffect(() => {
    let reconnectCount = 0;
    const maxReconnects = 3;
    let timeoutId: any = null;

    const connectWS = () => {
      if (reconnectCount >= maxReconnects) {
        console.log('WebSocket: Maximum connection attempts reached. Operating in offline demo mode.');
        return;
      }

      // Auto-detect protocol and hostname
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/glyph-stream`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected to /glyph-stream');
        setWsConnected(true);
        reconnectCount = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StepData;
          setStepData(data);
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected.');
        setWsConnected(false);
        if (reconnectCount < maxReconnects) {
          reconnectCount++;
          console.log(`Reconnecting in 5 seconds (Attempt ${reconnectCount}/${maxReconnects})...`);
          timeoutId = setTimeout(connectWS, 5000);
        }
      };

      ws.onerror = (err) => {
        console.log('WebSocket connection was not established (this is normal in static / proxy setups).');
        ws.close();
      };
    };

    connectWS();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // 1b. Fallback Local Simulation of Stream Data when WebSocket is offline
  useEffect(() => {
    if (wsConnected) return;

    const interval = setInterval(() => {
      setStepData(prev => {
        const nextStep = prev.step + 1;
        const reciprocity = 0.84 + Math.sin(nextStep / 10) * 0.08;
        const stability = 0.89 + Math.cos(nextStep / 15) * 0.06;
        
        const fragments: Fragment[] = Array.from({ length: 6 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 6;
          return {
            id: i,
            name: `Fragment-${i}`,
            x: Math.cos(angle) * 0.9,
            y: Math.sin(angle) * 0.9,
            recombined: Math.random() > 0.4
          };
        });

        const ledgers: Record<string, string> = {
          "Block Anchor": `0x99733-Q-${Math.floor(100000 + Math.random() * 900000)}`,
          "Entropy Threshold": (0.12 + Math.random() * 0.03).toFixed(4),
          "Dynamic Coherence": `${Math.round(reciprocity * 100)}%`,
          "Council Votes": "4/4 Quorum Unanimous"
        };

        return {
          type: "step",
          step: nextStep,
          fragments,
          ledgers,
          mesh_reciprocity: parseFloat(reciprocity.toFixed(4)),
          trinity_stability: parseFloat(stability.toFixed(4))
        };
      });
    }, 800);

    return () => clearInterval(interval);
  }, [wsConnected]);

  // 2. Periodic state polling (Ledger + Fireseed status)
  const fetchLedgerAndFireseed = async () => {
    try {
      const ledgerRes = await fetch('/api/sovereign-ledger');
      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setLedger(data);
        
        // Append dynamic telemetry point
        setTelemetry(prev => {
          const nextBlock = prev.length > 0 ? prev[prev.length - 1].block + 1 : 1;
          const points = [...prev, {
            block: nextBlock,
            vitality: parseFloat((data.resonance / 100).toFixed(4)),
            h_band: 3.0588 + Math.sin(nextBlock / 5) * 0.005,
            curvature: 0.892,
            dampening: 0.6351
          }];
          return points.slice(-15); // keep last 15 points
        });

        // Update briefing text
        setActiveBriefing(prev => ({
          ...prev,
          timestamp: new Date().toISOString(),
          vitality: parseFloat((data.resonance / 100).toFixed(4)),
          briefing_narrative: `Consensus loop completed successfully. The living manifold vitality tracking maintains structural headroom under living pi_r boundaries. Ledger signature verification checked and approved. Current resonance evaluated at ${data.resonance.toFixed(2)}%.`
        }));
      }

      const fireseedRes = await fetch('/api/fireseed-status');
      if (fireseedRes.ok) {
        const data = await fireseedRes.json();
        setFireseed(data);
      }
    } catch (e) {
      console.warn('Backend server poll failed. Operating in offline demo mode.');
    }
  };

  useEffect(() => {
    fetchLedgerAndFireseed();
    const interval = setInterval(fetchLedgerAndFireseed, 5000);
    return () => clearInterval(interval);
  }, []);

  // 3. Increment Fireseed earnings dynamically in UI for fluid gameplay effect
  useEffect(() => {
    const timer = setInterval(() => {
      setFireseed(prev => ({
        ...prev,
        total_earnings: prev.total_earnings + 0.00000002
      }));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // 3b. Global keyboard shortcuts: Ctrl+T (switch views), Shift+R (manual repair)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target && (
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable
        )
      ) {
        return;
      }

      // Trigger when Ctrl+T or Cmd+T is pressed
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setActiveTab(prev => {
          const next = prev === 'council' ? 'bridge' : 'council';
          const tabName = next === 'council' ? 'Sovereign Council' : 'FPT-Ω Vessel Bridge';
          showBanner(`🔄 Switched view: ${tabName}`);
          return next;
        });
      }

      // Trigger when Shift+R is pressed (ignoring ctrl/meta/alt)
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'R' || e.key === 'r')) {
        if (hullIntegrity < 100 && !isRepairing) {
          e.preventDefault();
          showBanner("🔧 Repair Initiated");
          handleRepair();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hullIntegrity, isRepairing, handleRepair]);

  // 3c. Real-time Hull Integrity fluctuation anchored to system vitality
  useEffect(() => {
    if (isRepairing) {
      // Allow the manual repair routine to drive the state
      return;
    }

    let animationFrameId: number;
    const startTime = Date.now();

    const updateHull = () => {
      const elapsed = (Date.now() - startTime) / 1000; // elapsed time in seconds
      const baseVitality = activeBriefing.vitality || 0.9614;
      
      // If repaired, hold at pristine 99.6% baseline
      const mappedBase = repairOverride ? 99.6 : (91 + ((Math.max(0.7, Math.min(1.0, baseVitality)) - 0.7) / 0.3) * 6); // 91 to 97% base range
      
      // Micro-fluctuations when override is active, else standard wave
      const wave = repairOverride 
        ? (Math.sin(elapsed * 1.2) * 0.2 + Math.cos(elapsed * 0.6) * 0.1)
        : (Math.sin(elapsed * 1.8) * 1.4 + Math.cos(elapsed * 0.9) * 0.7);
      
      const finalVal = Math.max(90.0, Math.min(100.0, mappedBase + wave));
      setHullIntegrity(parseFloat(finalVal.toFixed(2)));
      
      animationFrameId = requestAnimationFrame(updateHull);
    };

    animationFrameId = requestAnimationFrame(updateHull);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeBriefing.vitality, repairOverride, isRepairing]);

  // 4. Load Trinity visualization
  const fetchTrinityViz = async (presetName: string, dampVal: string) => {
    try {
      let url = `/api/trinity-viz?preset=${presetName}`;
      if (dampVal) url += `&custom_damp=${dampVal}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTrinityImg(data.image);
        setTrinityData(data.trinity_data);
      }
    } catch (e) {
      console.error('Failed to load trinity viz:', e);
    }
  };

  useEffect(() => {
    fetchTrinityViz(trinityPreset, customDamp);
  }, [trinityPreset, customDamp]);

  // 5. Handle resonance claim
  const handleClaimResonance = async () => {
    try {
      const res = await fetch('/api/claim-resonance', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLedger(prev => ({
          ...prev,
          resonance: data.new_resonance,
          gtc_balance: prev.gtc_balance + 1000,
          compound_years: prev.compound_years + 0.4
        }));
        setTelemetry(prev => {
          const nextBlock = prev.length > 0 ? prev[prev.length - 1].block + 1 : 1;
          const points = [...prev, {
            block: nextBlock,
            vitality: parseFloat((data.new_resonance / 100).toFixed(4)),
            h_band: 3.0645,
            curvature: 0.892,
            dampening: 0.6356
          }];
          return points.slice(-15);
        });
        showBanner(`🌌 RESONANCE CLAIMED: Long Game Compounded to Root! ID: ${data.microping_id}`);
      }
    } catch (e) {
      showBanner('⚠️ Claim failed. Please check connection to the FPT-Ω Relayer.');
    }
  };

  // 6. Handle GibberLink text translation
  const handleTranslateText = async () => {
    if (!inputText.trim()) return;
    setTranslating(true);
    try {
      const res = await fetch(`/api/translate/${encodeURIComponent(inputText)}`);
      if (res.ok) {
        const data = await res.json();
        setTranslationResult(data.translated);
      }
    } catch (e) {
      setTranslationResult(`[ERR]: Relayer translation link offline.`);
    } finally {
      setTranslating(false);
    }
  };

  // 7. Truth Filter Symptom vs Delta NLP analyzer
  const handleAnalyzeTruth = () => {
    if (!truthInputText.trim()) return;
    
    const symptomKeywords = ["theft", "steal", "copyright", "lawyer", "illegal", "crazy", "woo", "fake", "impossible", "symptom", "fear"];
    const deltaKeywords = ["interesting", "new", "resonance", "sovereign", "terrain", "long game", "topology", "pi", "fibonacci", "reciprocity"];

    const symptomCount = symptomKeywords.filter(word => truthInputText.toLowerCase().includes(word)).length;
    const deltaCount = deltaKeywords.filter(word => truthInputText.toLowerCase().includes(word)).length;

    const total = symptomCount * 10 + deltaCount * 15 || 1;
    const symptomPercent = Math.round(((symptomCount * 10) / total) * 100);
    const deltaPercent = Math.round(((deltaCount * 15) / total) * 100);

    const actualDelta = deltaPercent > 60 
      ? "Strong injection of new sovereign terrain" 
      : deltaPercent > 30 
        ? "Moderate informational delta detected" 
        : "Predominantly symptom / ego defense";

    const recommendation = deltaPercent > 50 
      ? "✅ Continue the dive — you are expanding sovereign topology." 
      : "⚠️ Increase structural clarity — the wolf's howl must cut through the fog.";

    setTruthAnalysis({
      symptomPercent,
      deltaPercent,
      actualDelta,
      recommendation
    });
  };

  const showBanner = (msg: string) => {
    setShowNotification(msg);
    setTimeout(() => {
      setShowNotification(null);
    }, 5000);
  };

  const exportManifestToCSV = () => {
    if (!activeBriefing.quantities_before || !activeBriefing.quantities_after) {
      showBanner("❌ Error: No manifest data available for export.");
      return;
    }

    const headers = ["Material Identifier Segment", "Raw Estimation Qty", "Resonance Adjusted Qty", "Structural Drift Shift", "Status"];
    const rows = Object.keys(activeBriefing.quantities_before).map((material) => {
      const before = activeBriefing.quantities_before![material];
      const after = activeBriefing.quantities_after![material];
      const variance = after - before;
      const cleanMaterial = material.replace(/_/g, ' ');
      return [
        `"${cleanMaterial}"`,
        before.toFixed(2),
        after.toFixed(2),
        `+${variance.toFixed(2)}`,
        "CLEAN"
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    link.setAttribute("download", `resonance_adjusted_estimation_manifest_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showBanner("📥 Resonance Adjusted Estimation Manifest exported as CSV.");
  };

  function handleRepair() {
    if (isRepairing) return;
    setIsRepairing(true);
    setRepairProgress(0);
    setRepairOverride(false);
    setRepairCyclesCount(prev => prev + 1);
    setCumulativeNanitesDischarged(prev => prev + 2500);
    
    const startIntegrity = hullIntegrity;
    const targetIntegrity = 100.00;
    showBanner("🛠️ Commencing hull micro-welding and structural nanite injection...");
    addLog('REPAIR', `Structural restoration sequence initiated at ${startIntegrity.toFixed(2)}% integrity.`);

    const duration = 5000; // 5 seconds
    const intervalTime = 50; // Update every 50ms
    const totalSteps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = (currentStep / totalSteps) * 100;
      setRepairProgress(progress);
      
      // Interpolate hull integrity from startIntegrity to 100
      const currentIntegrity = startIntegrity + (targetIntegrity - startIntegrity) * (progress / 100);
      setHullIntegrity(parseFloat(currentIntegrity.toFixed(2)));

      if (currentStep >= totalSteps) {
        clearInterval(timer);
        setIsRepairing(false);
        setRepairOverride(true);
        setHullIntegrity(100.00);
        showBanner("❇️ Hull micro-structural integrity restored to 100.00%.");
        addLog('SUCCESS', 'Hull micro-welding finished. System integrity stabilized at 100.00%.');
      }
    }, intervalTime);
  };

  const handleFullOverhaul = () => {
    if (isOverhauling || isRepairing) return;
    setIsOverhauling(true);
    setOverhaulProgress(0);
    showBanner("🌌 INITIATING COMPREHENSIVE OVERHAUL: Re-calibrating all subsystems...");
    addLog('INFO', "Initiating comprehensive overhaul of all core vessel subsystems, structural frames, and harmonics generators.");

    const duration = 4000; // 4 seconds
    const intervalTime = 40; // Update every 40ms
    const totalSteps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = (currentStep / totalSteps) * 100;
      setOverhaulProgress(progress);

      if (currentStep >= totalSteps) {
        clearInterval(timer);
        setIsOverhauling(false);
        setLastOverhaulCount(repairCyclesCount);
        setHullIntegrity(100.00);
        setRepairOverride(true);
        showBanner("❇️ SYSTEM OVERHAUL COMPLETED: Vessel structural mainframe operating at 100% capacity.");
        addLog('SUCCESS', `Full System Overhaul completed successfully. All core vessel subsystems re-calibrated. Cumulative repair counter synced to: ${repairCyclesCount} cycles.`);
      }
    }, intervalTime);
  };

  // 3d. Emergency Auto-Repair trigger
  useEffect(() => {
    if (emergencyAutoRepair && hullIntegrity < 91 && !isRepairing) {
      addLog('ALERT', `Critical Hull degradation detected (${hullIntegrity.toFixed(2)}% < 91.00%). Engaging Emergency Auto-Repair protocols.`);
      handleRepair();
    }
  }, [hullIntegrity, emergencyAutoRepair, isRepairing, addLog]);

  // 3e. Structural alert threshold log dispatcher
  const [alertDispatched, setAlertDispatched] = useState<boolean>(false);

  useEffect(() => {
    if (hullIntegrity < 92) {
      if (!alertDispatched) {
        addLog('ALERT', `WARNING: Structural integrity dropped below nominal threshold limit to ${hullIntegrity.toFixed(2)}%.`);
        setAlertDispatched(true);
      }
    } else if (hullIntegrity >= 95) {
      setAlertDispatched(false);
    }
  }, [hullIntegrity, alertDispatched, addLog]);

  // 3f. Auto-scroll terminal logs to the bottom on new entries
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Custom mathematical curves for Recharts Compounding trajectory chart
  const compoundingChartData = Array.from({ length: 11 }, (_, i) => {
    return {
      year: i,
      balance: Math.floor(99733 * Math.pow(1.618, i / 6) * (ledger.resonance / 100))
    };
  });

  // Beautiful SVG Rendering of Navigation Ring with tilt and orbital rotation
  const renderNavigationRing = () => {
    const frags = stepData?.fragments || [
      { id: 0, name: 'Fragment-0', x: 0.8, y: 0.2, recombined: true },
      { id: 1, name: 'Fragment-1', x: -0.4, y: 0.7, recombined: false },
      { id: 2, name: 'Fragment-2', x: -0.6, y: -0.5, recombined: true },
      { id: 3, name: 'Fragment-3', x: 0.5, y: -0.6, recombined: false },
      { id: 4, name: 'Fragment-4', x: 0.1, y: 0.9, recombined: true },
      { id: 5, name: 'Fragment-5', x: -0.8, y: -0.1, recombined: false }
    ];

    const tilt = (23.5 * Math.PI) / 180; // 23.5° axial tilt
    const cx = 200;
    const cy = 200;
    const r = 130;

    const isCriticalActive = criticalModeEnabled && hullIntegrity < criticalThreshold;
    const activeStress = showStressHeatmap || isCriticalActive;
    const activeThermal = showThermalFlux || isCriticalActive;
    const activeEM = showEMInterference || isCriticalActive;
    const activeGranular = showGranularHeatmap || isCriticalActive;

    return (
      <svg viewBox="0 0 400 400" className={`w-full h-[360px] bg-[#07070a] rounded-xl border transition-all duration-300 shadow-2xl ${
        isCriticalActive ? 'border-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.2)]' : 'border-gray-900'
      }`}>
        <defs>
          <radialGradient id="polaris-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor={isCriticalActive ? "#ef4444" : "#ffd700"} stopOpacity="0.8" />
            <stop offset="100%" stopColor={isCriticalActive ? "#ef4444" : "#ffd700"} stopOpacity="0" />
          </radialGradient>
          <filter id="neon" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient grids */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={isCriticalActive ? "#3a1313" : "#12121f"} strokeWidth="1" />
        <circle cx={cx} cy={cy} r={r - 35} fill="none" stroke={isCriticalActive ? "#2a0f0f" : "#0f0f18"} strokeWidth="1" />
        <line x1={cx - r - 15} y1={cy} x2={cx + r + 15} y2={cy} stroke={isCriticalActive ? "#3a1313" : "#12121f"} strokeDasharray="3,3" />
        <line x1={cx} y1={cy - r - 15} x2={cx} y2={cy + r + 15} stroke={isCriticalActive ? "#3a1313" : "#12121f"} strokeDasharray="3,3" />

        {/* Orbit Ellipse at 23.5° tilt */}
        <ellipse 
          cx={cx} 
          cy={cy} 
          rx={r} 
          ry={r * Math.cos(tilt)} 
          transform={`rotate(23.5 ${cx} ${cy})`}
          fill="none" 
          stroke={isCriticalActive ? "#ef4444" : "#ff6b35"} 
          strokeWidth={isCriticalActive ? "2" : "1.2"} 
          strokeDasharray={isCriticalActive ? "none" : "4,5"} 
          opacity={isCriticalActive ? "0.9" : "0.6"}
        />

        {/* Inner Nodes Orbit */}
        <ellipse 
          cx={cx} 
          cy={cy} 
          rx={r - 35} 
          ry={(r - 35) * Math.cos(tilt)} 
          transform={`rotate(-23.5 ${cx} ${cy})`}
          fill="none" 
          stroke="#4a90e2" 
          strokeWidth="0.8" 
          opacity="0.4"
        />

        {/* Standard Nodes along the inner orbit */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * Math.PI * 2) / 8;
          const rx = r - 35;
          const ry = (r - 35) * Math.cos(tilt);
          const x_rot = rx * Math.cos(angle);
          const y_rot = ry * Math.sin(angle);
          const rotAngle = (-23.5 * Math.PI) / 180;
          const x = cx + (x_rot * Math.cos(rotAngle) - y_rot * Math.sin(rotAngle));
          const y = cy + (x_rot * Math.sin(rotAngle) + y_rot * Math.cos(rotAngle));

          return (
            <g key={`node-${i}`}>
              <circle cx={x} cy={y} r="3.5" fill="#316bb0" opacity="0.8" />
              <text x={x + 5} y={y + 3} fill="#4e657f" fontFamily="monospace" fontSize="7">N-{i}</text>
            </g>
          );
        })}

        {/* Orion's Belt constellation anchors */}
        {[
          { x: cx + 55, y: cy - 130, name: "Alnitak" },
          { x: cx, y: cy - 145, name: "Alnilam" },
          { x: cx - 55, y: cy - 130, name: "Mintaka" },
        ].map((star, idx) => (
          <g key={`star-${idx}`}>
            <polygon 
              points={`${star.x},${star.y - 6} ${star.x + 1.5},${star.y - 1.5} ${star.x + 6},${star.y} ${star.x + 1.5},${star.y + 1.5} ${star.x},${star.y + 6} ${star.x - 1.5},${star.y + 1.5} ${star.x - 6},${star.y} ${star.x - 1.5},${star.y - 1.5}`} 
              fill={isCriticalActive ? "#ef4444" : "#ffd700"} 
              filter="url(#neon)"
            />
            <text x={star.x} y={star.y - 10} fill={isCriticalActive ? "#f87171" : "#dfb21e"} fontFamily="monospace" fontSize="8" textAnchor="middle" fontWeight="bold">{star.name}</text>
          </g>
        ))}

        {/* Polaris (White Center Root Star Anchor) */}
        <g>
          <circle cx={cx} cy={cy} r="20" fill="url(#polaris-glow)" />
          <polygon 
            points={`${cx},${cy - 12} ${cx + 3},${cy - 3} ${cx + 12},${cy} ${cx + 3},${cy + 3} ${cx},${cy + 12} ${cx - 3},${cy + 3} ${cx - 12},${cy} ${cx - 3},${cy - 3}`} 
            fill="#ffffff" 
            stroke={isCriticalActive ? "#ef4444" : "#ffd700"}
            strokeWidth="1.2"
            filter="url(#neon)"
          />
          <text x={cx} y={cy + 24} fill="#ffffff" fontFamily="monospace" fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="1">POLARIS ANCHOR</text>
        </g>

        {/* Thermal Flux Overlay */}
        {activeThermal && computedStressZones.map((zone, idx) => {
          const elapsed = Date.now() * 0.001;
          let heatVal = Math.max(0.15, Math.min(0.95, (zone.stress * 0.75) + Math.sin(elapsed + idx * 2) * 0.15));
          if (isCriticalActive) {
            // Peg to maximum thermal signature (92% to 98% range)
            heatVal = 0.92 + Math.cos(elapsed * 2.5 + idx) * 0.06;
          }
          const rad = (zone.angle * Math.PI) / 180;
          const rx = r - 15;
          const ry = (r - 15) * Math.cos(tilt);
          const x_rot = rx * Math.cos(rad);
          const y_rot = ry * Math.sin(rad);
          const rotAngle = (23.5 * Math.PI) / 180;
          const x = cx + (x_rot * Math.cos(rotAngle) - y_rot * Math.sin(rotAngle));
          const y = cy + (x_rot * Math.sin(rotAngle) + y_rot * Math.cos(rotAngle));

          const colorScale = d3.scaleSequential(d3.interpolateWarm).domain([0.1, 0.95]);
          const color = colorScale(heatVal);
          
          return (
            <g key={`thermal-${zone.id}`} className="transition-all duration-300">
              <circle 
                cx={x} 
                cy={y} 
                r={(isCriticalActive ? 42 : 30) + Math.sin(elapsed + idx) * 6} 
                fill={color} 
                opacity={isCriticalActive ? "0.28" : "0.18"} 
                filter="url(#neon)" 
              />
              <circle 
                cx={x} 
                cy={y} 
                r={12 + Math.cos(elapsed * 1.5 + idx) * 3} 
                fill={color} 
                opacity="0.45" 
              />
              <circle 
                cx={x} 
                cy={y} 
                r={3.5} 
                fill="#ffffff" 
                opacity="0.9" 
              />
              <text 
                x={x} 
                y={y - 12} 
                fill={isCriticalActive ? "#f87171" : "#fef08a"} 
                fontFamily="monospace" 
                fontSize="7" 
                fontWeight="bold" 
                textAnchor="middle" 
                stroke="#000" 
                strokeWidth="1.5" 
                paintOrder="stroke"
              >
                {(heatVal * 120 + 30).toFixed(1)}°C
              </text>
            </g>
          );
        })}

        {/* EM Interference Overlay */}
        {activeEM && (
          <g className="transition-all duration-300">
            {Array.from({ length: 45 }).map((_, i) => {
              const angle = (i * Math.PI * 2) / 45;
              const elapsed = Date.now() * 0.0015;
              const waveAmp = isCriticalActive 
                ? 25 + Math.sin(elapsed * 3 + i * 0.6) * 12
                : 10 + Math.sin(elapsed + i * 0.4) * 5;
              const rx = r + Math.sin(elapsed * 2 + i * 0.8) * waveAmp;
              const ry = rx * Math.cos(tilt);
              
              const x_rot = rx * Math.cos(angle);
              const y_rot = ry * Math.sin(angle);
              const rotAngle = (23.5 * Math.PI) / 180;
              const x = cx + (x_rot * Math.cos(rotAngle) - y_rot * Math.sin(rotAngle));
              const y = cy + (x_rot * Math.sin(rotAngle) + y_rot * Math.cos(rotAngle));

              const nextAngle = ((i + 1) * Math.PI * 2) / 45;
              const rxNext = r + Math.sin(elapsed * 2 + (i + 1) * 0.8) * waveAmp;
              const ryNext = rxNext * Math.cos(tilt);
              const x_rot_next = rxNext * Math.cos(nextAngle);
              const y_rot_next = ryNext * Math.sin(nextAngle);
              const xNext = cx + (x_rot_next * Math.cos(rotAngle) - y_rot_next * Math.sin(rotAngle));
              const yNext = cy + (x_rot_next * Math.sin(rotAngle) + y_rot_next * Math.cos(rotAngle));

              const colorScale = d3.scaleSequential(isCriticalActive ? d3.interpolateReds : d3.interpolateCool).domain([0, 45]);
              const color = colorScale(i);

              return (
                <line 
                  key={`em-segment-${i}`}
                  x1={x}
                  y1={y}
                  x2={xNext}
                  y2={yNext}
                  stroke={color}
                  strokeWidth={isCriticalActive ? "2.5" : "1.5"}
                  opacity={isCriticalActive ? "0.9" : "0.75"}
                  strokeLinecap="round"
                />
              );
            })}
            
            {[60, 180, 300].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const elapsed = Date.now() * 0.001;
              const rx = r + 25 + Math.sin(elapsed * 4 + i) * 8;
              const ry = rx * Math.cos(tilt);
              const x_rot = rx * Math.cos(rad);
              const y_rot = ry * Math.sin(rad);
              const rotAngle = (23.5 * Math.PI) / 180;
              const x = cx + (x_rot * Math.cos(rotAngle) - y_rot * Math.sin(rotAngle));
              const y = cy + (x_rot * Math.sin(rotAngle) + y_rot * Math.cos(rotAngle));

              const baseSpike = isCriticalActive ? 165 : 35;
              const spikeVal = Math.floor(Math.sin(elapsed * 4.5 + i) * (isCriticalActive ? 30 : 15) + baseSpike);

              return (
                <g key={`em-spike-${i}`}>
                  <circle cx={x} cy={y} r={isCriticalActive ? "18" : "12"} fill="none" stroke={isCriticalActive ? "#f87171" : "#c084fc"} strokeWidth="1" strokeDasharray="2,2" opacity="0.6" className="animate-pulse" />
                  <path 
                    d={`M ${x} ${y - 6} L ${x + 3} ${y - 1} L ${x - 3} ${y + 1} L ${x} ${y + 6}`} 
                    stroke={isCriticalActive ? "#f87171" : "#d8b4fe"} 
                    strokeWidth="1.2" 
                    fill="none" 
                  />
                  <text 
                    x={x} 
                    y={y - 10} 
                    fill={isCriticalActive ? "#ef4444" : "#d8b4fe"} 
                    fontFamily="monospace" 
                    fontSize="7" 
                    textAnchor="middle"
                    stroke="#000"
                    strokeWidth="1"
                    paintOrder="stroke"
                    fontWeight="bold"
                  >
                    {spikeVal} mG
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Localized D3 Stress Heatmap Overlay */}
        {activeStress && computedStressZones.map((zone, idx) => {
          const rad = (zone.angle * Math.PI) / 180;
          const rx = r - 15;
          const ry = (r - 15) * Math.cos(tilt);
          // Coordinates tilted on the ring ellipse
          const x_rot = rx * Math.cos(rad);
          const y_rot = ry * Math.sin(rad);
          const rotAngle = (23.5 * Math.PI) / 180;
          const x = cx + (x_rot * Math.cos(rotAngle) - y_rot * Math.sin(rotAngle));
          const y = cy + (x_rot * Math.sin(rotAngle) + y_rot * Math.cos(rotAngle));

          const colorScale = d3.scaleSequential(isCriticalActive ? d3.interpolateReds : d3.interpolateTurbo).domain([0.1, 0.95]);
          const color = colorScale(zone.stress);
          const isHighStress = zone.stress > 0.75;

          return (
            <g key={`stress-overlay-${zone.id}`} className="transition-all duration-300">
              {/* Dotted link line to Polaris Center */}
              <line 
                x1={cx} 
                y1={cy} 
                x2={x} 
                y2={y} 
                stroke={color} 
                strokeWidth={isHighStress ? 1.5 : 0.6} 
                strokeDasharray="2,3" 
                opacity={isHighStress ? 0.8 : 0.35} 
              />
              
              {/* Heat glow circles */}
              <circle 
                cx={x} 
                cy={y} 
                r={isHighStress ? 28 : 22} 
                fill={color} 
                opacity={isHighStress ? 0.35 : 0.16} 
                filter="url(#neon)" 
              />
              <circle 
                cx={x} 
                cy={y} 
                r={14} 
                fill={color} 
                opacity="0.45" 
              />
              <circle 
                cx={x} 
                cy={y} 
                r={6} 
                fill="#ffffff" 
                opacity={0.85} 
                stroke={color}
                strokeWidth={1.5}
              />

              {/* High stress warning pulse */}
              {isHighStress && (
                <circle 
                  cx={x} 
                  cy={y} 
                  r="32" 
                  fill="none" 
                  stroke={isCriticalActive ? "#f87171" : "#ef4444"} 
                  strokeWidth="1.2" 
                  opacity="0.9" 
                  className="animate-pulse" 
                />
              )}

              {/* Stress value display */}
              <text 
                x={x} 
                y={y - 14} 
                fill={isHighStress ? (isCriticalActive ? "#f87171" : "#fca5a5") : "#e2e8f0"} 
                fontFamily="monospace" 
                fontSize="8" 
                fontWeight="bold" 
                textAnchor="middle" 
                stroke="#000" 
                strokeWidth="1.5" 
                paintOrder="stroke"
              >
                {(zone.stress * 100).toFixed(0)}%
              </text>
              <text 
                x={x} 
                y={y + 12} 
                fill="#94a3b8" 
                fontFamily="monospace" 
                fontSize="6" 
                textAnchor="middle"
                stroke="#000"
                strokeWidth="1"
                paintOrder="stroke"
              >
                {zone.name}
              </text>
            </g>
          );
        })}

        {/* Granular Secondary Circular Heatmap Overlay */}
        {activeGranular && (() => {
          const depths = [
            { name: 'INNER CORE', rxScale: 0.52, factor: 0.82, count: 12 },
            { name: 'MID FRAME', rxScale: 0.76, factor: 1.0, count: 12 },
            { name: 'OUTER SKIN', rxScale: 1.0, factor: 1.18, count: 12 }
          ];

          const getStressAtAngle = (angleDeg: number) => {
            const normAngle = (angleDeg % 360 + 360) % 360;
            const sortedZones = [...computedStressZones].map(z => {
              const zoneNorm = (z.angle % 360 + 360) % 360;
              return { ...z, normAngle: zoneNorm };
            }).sort((a, b) => a.normAngle - b.normAngle);

            if (sortedZones.length === 0) return 0.5;

            let zoneA = sortedZones[sortedZones.length - 1];
            let zoneB = sortedZones[0];

            for (let i = 0; i < sortedZones.length - 1; i++) {
              if (normAngle >= sortedZones[i].normAngle && normAngle <= sortedZones[i+1].normAngle) {
                zoneA = sortedZones[i];
                zoneB = sortedZones[i+1];
                break;
              }
            }

            let diff = zoneB.normAngle - zoneA.normAngle;
            if (diff < 0) diff += 360;

            let dist = normAngle - zoneA.normAngle;
            if (dist < 0) dist += 360;

            const t = diff === 0 ? 0 : dist / diff;
            return zoneA.stress * (1 - t) + zoneB.stress * t;
          };

          return (
            <g id="granular-pressure-grid" className="transition-all duration-500">
              {/* Concentric baseline helper ellipses */}
              {depths.map((depth, idx) => {
                const rx_ellipse = r * depth.rxScale;
                const ry_ellipse = rx_ellipse * Math.cos(tilt);
                return (
                  <ellipse 
                    key={`depth-line-${idx}`}
                    cx={cx}
                    cy={cy}
                    rx={rx_ellipse}
                    ry={ry_ellipse}
                    transform={`rotate(23.5 ${cx} ${cy})`}
                    fill="none"
                    stroke={isCriticalActive ? "#ef4444" : "#f59e0b"}
                    strokeWidth="0.5"
                    strokeDasharray="2,8"
                    opacity={isCriticalActive ? 0.35 : 0.15}
                  />
                );
              })}

              {/* Granular sector pressure nodes */}
              {depths.map((depth, layerIdx) => {
                const nodeElements = [];
                for (let sectorIdx = 0; sectorIdx < depth.count; sectorIdx++) {
                  const angleDeg = (sectorIdx * 360) / depth.count;
                  const rad = (angleDeg * Math.PI) / 180;
                  
                  const baseStress = getStressAtAngle(angleDeg);
                  const elapsed = Date.now() * 0.0012;
                  const ripple = Math.sin(elapsed + sectorIdx * 1.5 + layerIdx * 2.3) * 0.05;
                  const localStress = Math.max(0.1, Math.min(0.99, baseStress * depth.factor + ripple));

                  const colorScale = d3.scaleSequential(isCriticalActive ? d3.interpolateReds : d3.interpolateInferno).domain([0.1, 0.95]);
                  const color = colorScale(localStress);

                  const rx_node = r * depth.rxScale;
                  const ry_node = rx_node * Math.cos(tilt);
                  const x_rot = rx_node * Math.cos(rad);
                  const y_rot = ry_node * Math.sin(rad);
                  const rotAngle = (23.5 * Math.PI) / 180;
                  const x = cx + (x_rot * Math.cos(rotAngle) - y_rot * Math.sin(rotAngle));
                  const y = cy + (x_rot * Math.sin(rotAngle) + y_rot * Math.cos(rotAngle));

                  const nodeId = `${depth.name}-${sectorIdx}`;
                  const isHovered = hoveredPressureNode?.id === nodeId;

                  nodeElements.push(
                    <g 
                      key={nodeId} 
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoveredPressureNode({
                        id: nodeId,
                        layer: depth.name,
                        angle: Math.round(angleDeg),
                        stress: localStress,
                        x, y
                      })}
                      onMouseLeave={() => setHoveredPressureNode(null)}
                      onClick={() => {
                        addLog('REPAIR', `Injected localized nanites to Segment ${depth.name} / Sector θ: ${Math.round(angleDeg)}°. Discharging structural pressure.`);
                        showBanner(`⚡ NANITE STABILIZER: Discharged Segment ${depth.name} (Pressure: ${(localStress*100).toFixed(0)}% ➔ 15%)`);
                        setCumulativeNanitesDischarged(prev => prev + 150);
                      }}
                    >
                      {/* Interactive glow backing */}
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={isHovered ? 14 : 7} 
                        fill={color} 
                        opacity={isHovered ? 0.6 : (localStress > 0.8 ? 0.35 : 0.15)} 
                        className="transition-all duration-300"
                        filter={localStress > 0.75 || isHovered ? "url(#neon)" : undefined}
                      />

                      {/* Main solid thermal node */}
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={isHovered ? 6 : 3.5} 
                        fill={isHovered ? "#ffffff" : color} 
                        stroke="#0a0a0f"
                        strokeWidth={0.8}
                        className="transition-all duration-200"
                      />

                      {/* Micro-scale visual indicators for high stress segments */}
                      {localStress > 0.8 && (
                        <circle 
                          cx={x} 
                          cy={y} 
                          r={isHovered ? 18 : 10} 
                          fill="none" 
                          stroke={isCriticalActive ? "#ef4444" : "#f59e0b"} 
                          strokeWidth="0.5" 
                          strokeDasharray="1,2"
                          className="animate-spin duration-[8000ms]"
                        />
                      )}
                    </g>
                  );
                }
                return <g key={`layer-group-${layerIdx}`}>{nodeElements}</g>;
              })}

              {/* Dynamic Overlay HUD readout */}
              {hoveredPressureNode && (
                <g transform={`translate(${hoveredPressureNode.x > cx ? hoveredPressureNode.x - 110 : hoveredPressureNode.x + 10}, ${hoveredPressureNode.y - 35})`} className="pointer-events-none select-none z-50">
                  <rect 
                    width="105" 
                    height="42" 
                    fill="#050508" 
                    stroke={isCriticalActive ? "#ef4444" : "#f59e0b"} 
                    strokeWidth="1" 
                    opacity="0.92" 
                    rx="1.5" 
                  />
                  <text x="6" y="11" fill="#f59e0b" fontFamily="monospace" fontSize="6.5" fontWeight="bold">
                    {hoveredPressureNode.layer}
                  </text>
                  <text x="6" y="21" fill="#e2e8f0" fontFamily="monospace" fontSize="6">
                    VECTOR θ: {hoveredPressureNode.angle}°
                  </text>
                  <text x="6" y="33" fill={hoveredPressureNode.stress > 0.8 ? "#ef4444" : "#10b981"} fontFamily="monospace" fontSize="7" fontWeight="extrabold">
                    STRESS: {(hoveredPressureNode.stress * 100).toFixed(1)}%
                  </text>
                  {hoveredPressureNode.stress > 0.8 && (
                    <text x="72" y="33" fill="#ef4444" fontFamily="monospace" fontSize="6" fontWeight="bold" className="animate-pulse">
                      ⚠️ TRIPPED
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })()}

        {/* Critical Diagnostic Override Banner in Center */}
        {isCriticalActive && (
          <g className="animate-pulse">
            <rect 
              x={cx - 100} 
              y={cy - 48} 
              width={200} 
              height={18} 
              fill="#7f1d1d" 
              opacity="0.85" 
              rx="2" 
              stroke="#ef4444" 
              strokeWidth="1"
            />
            <text 
              x={cx} 
              y={cy - 36} 
              fill="#fecaca" 
              fontFamily="monospace" 
              fontSize="7" 
              fontWeight="bold" 
              textAnchor="middle" 
              letterSpacing="1"
            >
              ⚠️ CRITICAL OVERRIDE ACTIVE ⚠️
            </text>
          </g>
        )}

        {/* Recombining Fragments Orbiting the Pivot */}
        {frags.map((frag, idx) => {
          const orbitSpeed = (stepData?.step || 0) * 0.012;
          const angle = ((idx * Math.PI * 2) / frags.length) + orbitSpeed;
          const rx = r;
          const ry = r * Math.cos(tilt);
          const x_rot = rx * Math.cos(angle);
          const y_rot = ry * Math.sin(angle);
          const rotAngle = (23.5 * Math.PI) / 180;
          const x = cx + (x_rot * Math.cos(rotAngle) - y_rot * Math.sin(rotAngle));
          const y = cy + (x_rot * Math.sin(rotAngle) + y_rot * Math.cos(rotAngle));

          const color = frag.recombined ? "#10b981" : "#f97316";

          return (
            <g key={`frag-${idx}`}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth="0.5" strokeDasharray="1,4" opacity="0.3" />
              <circle cx={x} cy={y} r="6" fill={color} filter="url(#neon)" opacity="0.9" />
              <circle cx={x} cy={y} r="2" fill="#ffffff" />
              <text x={x + 9} y={y + 3} fill="#e5e7eb" fontFamily="monospace" fontSize="8" fontWeight="bold" stroke="#000" strokeWidth="1.5" paintOrder="stroke">{frag.name}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="bg-[#050505] text-slate-300 min-h-screen font-sans antialiased selection:bg-amber-500/30 selection:text-white">
      {/* Dynamic Global Notification Banner */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-[#0c0c0c] border border-amber-500/40 text-white p-4 rounded-sm shadow-[0_4px_24px_rgba(245,158,11,0.25)] animate-pulse font-mono text-xs flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <p>{showNotification}</p>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        {/* Header Console */}
        <header className="border-b border-white/10 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-5 rounded-sm">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-amber-500 rounded-sm flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-black rotate-45" />
            </div>
            <div>
              <h1 className="text-xl tracking-[0.2em] font-light text-white uppercase font-serif">Sovereign Manifold</h1>
              <p className="text-[10px] text-amber-500/70 uppercase tracking-widest font-mono mt-0.5">Control Panel Console</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] tracking-widest uppercase opacity-80 font-mono">
            <div className="flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
              Network: {wsConnected ? 'ONLINE' : 'DEMO LINKED'}
            </div>
            <div className="flex items-center text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
              Epoch: 842.1
            </div>
            <div className="text-slate-400">
              ID: 0xFD...2A9 // Port 3000
            </div>
          </div>

          {/* Unified Tab Selector */}
          <div className="flex flex-col items-end gap-1">
            <div className="bg-black/40 p-1 rounded-sm border border-white/10 flex gap-1 font-mono text-xs">
              <button
                onClick={() => setActiveTab('council')}
                className={`px-4 py-2 rounded-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'council' 
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-md font-semibold' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Sovereign Council Dashboard
              </button>
              <button
                onClick={() => setActiveTab('bridge')}
                className={`px-4 py-2 rounded-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                  activeTab === 'bridge' 
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-md font-semibold' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                FPT-Ω Vessel Bridge
              </button>
            </div>
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase mr-1">Shortcuts: Ctrl+T (Toggle View) | Shift+R (Manual Repair)</span>
          </div>
        </header>

        {/* Tab 1: Sovereign Council Dashboard */}
        {activeTab === 'council' && (
          <div className="space-y-6">
            {/* Top Stats Band */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: "System Vitality", val: `${(ledger.resonance / 100).toFixed(4)}`, desc: "π_r Target Boundary", color: "text-amber-500" },
                { title: "Quantum Resonance", val: `${ledger.resonance.toFixed(2)}%`, desc: "Unified Coherence", color: "text-white" },
                { title: "Live GTC Balance", val: `${ledger.gtc_balance.toLocaleString()} GTC`, desc: "Compounding to Root", color: "text-amber-400" },
                { title: "Manifold Market Cap", val: `$${ledger.hidden_balance.toLocaleString()}`, desc: "Physical Sovereignty Val", color: "text-slate-200" }
              ].map((stat, idx) => (
                <div key={idx} className="bg-black/30 border border-white/5 p-5 rounded-sm shadow-xl backdrop-blur-sm">
                  <p className="text-amber-500 font-mono text-[9px] uppercase tracking-widest">{stat.title}</p>
                  <p className={`text-2xl font-light font-serif mt-1 ${stat.color}`}>{stat.val}</p>
                  <p className="text-slate-400 font-mono text-[9px] mt-1.5 uppercase tracking-wider">{stat.desc}</p>
                </div>
              ))}
            </div>

            {/* Central Block: Waveform and Briefing */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Telemetry Waveform (2/3 width) */}
              <div className="lg:col-span-2 bg-black/20 border border-white/5 p-6 rounded-sm shadow-xl">
                <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-amber-500/10 text-amber-500">
                      <Activity className="w-4 h-4" />
                    </span>
                    <h3 className="text-xs font-light text-white uppercase tracking-[0.15em] font-serif">Living π_r Vitality Waveform</h3>
                  </div>
                  <span className="text-[9px] font-mono tracking-wider uppercase text-amber-500/60">Live Telemetry Ingestion</span>
                </div>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={telemetry} margin={{ top: 10, right: 20, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                      <XAxis dataKey="block" stroke="#4a5568" fontSize={9} fontFamily="monospace" />
                      <YAxis domain={[0.88, 1.02]} stroke="#4a5568" fontSize={9} fontFamily="monospace" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#050505', borderColor: '#1c1c1c', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }} 
                        itemStyle={{ color: '#f59e0b' }}
                      />
                      <ReferenceLine 
                        y={0.9999} 
                        stroke="#ef4444" 
                        strokeDasharray="4 4" 
                        label={{ value: "Veto Upper Floor (0.9999)", fill: "#ef4444", position: "top", fontSize: 9, fontFamily: 'monospace' }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="vitality" 
                        stroke="#f59e0b" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: '#f59e0b' }}
                        activeDot={{ r: 6 }} 
                        name="Vitality Index" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Briefing Narrative Panel (1/3 width) */}
              <div className="bg-black/20 border border-white/5 p-6 rounded-sm shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded bg-amber-500/10 text-amber-500">
                        <FileText className="w-4 h-4" />
                      </span>
                      <h3 className="text-xs font-light text-white uppercase tracking-[0.15em] font-serif">Council Decision</h3>
                    </div>
                    <span className="px-2 py-0.5 text-[8px] font-mono tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded uppercase">
                      {activeBriefing.status}
                    </span>
                  </div>
                  
                  <div className="space-y-4 font-mono text-xs text-slate-300 leading-relaxed">
                    <p className="bg-black/40 p-4 border border-white/5 rounded-sm text-slate-300 leading-relaxed font-sans italic">
                      "{activeBriefing.briefing_narrative}"
                    </p>
                    <div className="text-[10px] text-slate-400 space-y-1.5 bg-black/20 p-3 rounded-sm border border-white/5">
                      <p className="truncate"><strong>Manifest SHA:</strong> <span className="text-amber-500">{activeBriefing.cryptographic_proof.sha256}</span></p>
                      <p className="truncate"><strong>Ledger Anchor:</strong> <span className="text-slate-200">{activeBriefing.cryptographic_proof.ledger_anchor}</span></p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-3 border-t border-white/5 text-[9px] text-slate-500 font-mono flex justify-between items-center uppercase tracking-wider">
                  <span>Timestamp (UTC)</span>
                  <span className="text-slate-300">{activeBriefing.timestamp.replace('T', ' ').substring(0, 19)}</span>
                </div>
              </div>
            </div>

            {/* Estimation Drift Table */}
            <div className="bg-black/20 border border-white/5 p-6 rounded-sm shadow-xl">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-sm bg-amber-500/10 text-amber-500">
                    <Table className="w-4 h-4" />
                  </span>
                  <h3 className="text-xs font-light text-white uppercase tracking-[0.15em] font-serif">Resonance Adjusted Estimation Manifest</h3>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-mono tracking-widest text-amber-500/60 uppercase hidden sm:inline">Ethics and Sustainability Fused</span>
                  <button
                    onClick={exportManifestToCSV}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-sm font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5 cursor-pointer transition-all duration-300"
                    title="Export Manifest as CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs text-slate-400">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-300 bg-black/20">
                      <th className="py-3 px-4 uppercase tracking-wider text-[10px]">Material Identifier Segment</th>
                      <th className="py-3 px-4 text-right uppercase tracking-wider text-[10px]">Raw Estimation Qty</th>
                      <th className="py-3 px-4 text-right text-amber-500 uppercase tracking-wider text-[10px]">Resonance Adjusted Qty</th>
                      <th className="py-3 px-4 text-right text-emerald-400 uppercase tracking-wider text-[10px]">Structural Drift Shift</th>
                      <th className="py-3 px-4 text-center uppercase tracking-wider text-[10px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBriefing.quantities_before && Object.keys(activeBriefing.quantities_before).map((material) => {
                      const before = activeBriefing.quantities_before![material];
                      const after = activeBriefing.quantities_after![material];
                      const variance = after - before;
                      return (
                        <tr key={material} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 text-slate-200 font-medium capitalize">{material.replace(/_/g, ' ')}</td>
                          <td className="py-3.5 px-4 text-right">{before.toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right text-white font-semibold">{after.toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right text-emerald-400 font-medium">+{variance.toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2.5 py-0.5 text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-sm font-bold tracking-widest">
                              CLEAN
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Structural Drift Shift Stacked Bar Chart */}
            <div className="bg-black/20 border border-white/5 p-6 rounded-sm shadow-xl">
              <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-sm bg-emerald-500/10 text-emerald-400">
                    <Layers className="w-4 h-4" />
                  </span>
                  <h3 className="text-xs font-light text-white uppercase tracking-[0.15em] font-serif">Structural Drift Shift (Last 10 Blocks)</h3>
                </div>
                <span className="text-[9px] font-mono tracking-wider uppercase text-emerald-400/60">Cumulative Material Drift</span>
              </div>
              
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={driftChartData} margin={{ top: 10, right: 20, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
                    <XAxis dataKey="block" stroke="#4a5568" fontSize={9} fontFamily="monospace" />
                    <YAxis stroke="#4a5568" fontSize={9} fontFamily="monospace" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#050505', borderColor: '#1c1c1c', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }} 
                      itemStyle={{ fontSize: '10px' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', paddingTop: '15px' }}
                      iconType="rect"
                      iconSize={8}
                    />
                    <Bar dataKey="Waterproofing Membrane" stackId="drift" fill="#10b981" />
                    <Bar dataKey="Insulation Board" stackId="drift" fill="#f59e0b" />
                    <Bar dataKey="Sealant Cartridges" stackId="drift" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: FPT-Ω Vessel Bridge Tactical Dashboard */}
        {activeTab === 'bridge' && (
          <div className="space-y-6">
            {/* Header / Sub-banner for vessel */}
            <div className="bg-black/30 border border-white/10 p-6 rounded-sm flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 shadow-xl">
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg animate-bounce duration-[3000ms]">🛸</span>
                    <h2 className="text-base font-light text-white uppercase tracking-[0.15em] font-serif">FPT-Ω // Synara Class Vessel Bridge</h2>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wide mt-1">Commanded by Captain John Carroll | Two Mile Solutions LLC</p>
                </div>

                {/* Diagnostic Overlays Dropdown & Critical Mode Toggle */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative inline-block text-left z-50">
                    <button
                      onClick={() => setIsDiagnosticMenuOpen(!isDiagnosticMenuOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-amber-500/40 text-slate-300 hover:text-white rounded-sm font-mono text-[9px] uppercase tracking-wider transition-all duration-200 shadow-md cursor-pointer select-none"
                      title="Toggle spatial diagnostic layers layered atop Navigation Ring"
                    >
                      <Layers className="w-3 h-3 text-amber-500" />
                      <span>Diagnostic Layers</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isDiagnosticMenuOpen ? 'rotate-180 text-amber-500' : 'text-slate-500'}`} />
                    </button>

                    {isDiagnosticMenuOpen && (
                      <>
                        {/* Backdrop for easy closing */}
                        <div className="fixed inset-0 z-30" onClick={() => setIsDiagnosticMenuOpen(false)} />
                        
                        <div className="absolute left-0 mt-1.5 w-56 bg-[#0a0a0f] border border-white/15 rounded-sm shadow-2xl z-40 font-mono p-2 divide-y divide-white/5">
                          <div className="px-2 py-1 mb-1">
                            <span className="text-[8px] text-slate-500 font-bold tracking-widest uppercase">Select Spatial Overlays</span>
                          </div>
                          
                          <div className="py-1 space-y-1">
                            {/* Option 1: Stress Heatmap */}
                            <label className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-white/5 rounded-sm cursor-pointer select-none text-[9px] text-slate-300 hover:text-white transition-colors">
                              <input 
                                type="checkbox" 
                                checked={showStressHeatmap} 
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setShowStressHeatmap(checked);
                                  addLog('INFO', checked ? 'Stress Heatmap diagnostic overlay ENABLED.' : 'Stress Heatmap diagnostic overlay DISABLED.');
                                }} 
                                className="rounded border-gray-900 bg-black text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span className="font-semibold">Stress Heatmap</span>
                                <span className="text-[7px] text-slate-500 uppercase">D3 Turbo Gradient</span>
                              </div>
                            </label>

                            {/* Option 2: Thermal Flux */}
                            <label className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-white/5 rounded-sm cursor-pointer select-none text-[9px] text-slate-300 hover:text-white transition-colors">
                              <input 
                                type="checkbox" 
                                checked={showThermalFlux} 
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setShowThermalFlux(checked);
                                  addLog('INFO', checked ? 'Thermal Flux diagnostic layer ENABLED. Scanning hull thermal emission signatures.' : 'Thermal Flux diagnostic layer DISABLED.');
                                }} 
                                className="rounded border-gray-900 bg-black text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span className="font-semibold">Thermal Flux</span>
                                <span className="text-[7px] text-slate-500 uppercase">D3 Warm Degrees</span>
                              </div>
                            </label>

                            {/* Option 3: EM Interference */}
                            <label className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-white/5 rounded-sm cursor-pointer select-none text-[9px] text-slate-300 hover:text-white transition-colors">
                              <input 
                                type="checkbox" 
                                checked={showEMInterference} 
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setShowEMInterference(checked);
                                  addLog('INFO', checked ? 'EM Interference diagnostic layer ENABLED. Measuring field strength in mG.' : 'EM Interference diagnostic layer DISABLED.');
                                }} 
                                className="rounded border-gray-900 bg-black text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span className="font-semibold">EM Interference</span>
                                <span className="text-[7px] text-slate-500 uppercase">Concentric Cool Waves</span>
                              </div>
                            </label>

                            {/* Option 4: Granular Pressure Heatmap */}
                            <label className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-white/5 rounded-sm cursor-pointer select-none text-[9px] text-slate-300 hover:text-white transition-colors">
                              <input 
                                type="checkbox" 
                                checked={showGranularHeatmap} 
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setShowGranularHeatmap(checked);
                                  addLog('INFO', checked ? 'Granular Heatmap secondary overlay ENABLED.' : 'Granular Heatmap secondary overlay DISABLED.');
                                }} 
                                className="rounded border-gray-900 bg-black text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span className="font-semibold">Granular Pressure</span>
                                <span className="text-[7px] text-slate-500 uppercase">Concentric Inferno Grid</span>
                              </div>
                            </label>
                          </div>
                          
                          <div className="pt-1.5 px-2 flex justify-between items-center text-[7px] text-slate-500 tracking-wider">
                            <span>ACTIVE: {[showStressHeatmap, showThermalFlux, showEMInterference, showGranularHeatmap].filter(Boolean).length} / 4</span>
                            <button 
                              onClick={() => {
                                setShowStressHeatmap(false);
                                setShowThermalFlux(false);
                                setShowEMInterference(false);
                                setShowGranularHeatmap(false);
                                addLog('INFO', 'All Navigation diagnostic overlays cleared.');
                              }}
                              className="text-amber-500 hover:text-amber-400 uppercase font-semibold cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Critical Mode Toggle with Threshold Control */}
                  <div className={`flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-sm font-mono text-[9px] uppercase tracking-wider shadow-md border transition-all duration-300 ${
                    criticalModeEnabled && hullIntegrity < criticalThreshold
                      ? 'bg-red-950/80 border-red-500/50 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.35)] animate-pulse'
                      : 'bg-slate-900/90 border-white/10 text-slate-300 hover:border-red-500/35'
                  }`}>
                    <div className="flex items-center gap-2 select-none">
                      <span className={`w-2 h-2 rounded-full ${
                        criticalModeEnabled 
                          ? (hullIntegrity < criticalThreshold ? 'bg-red-500 animate-ping' : 'bg-red-400') 
                          : 'bg-slate-700'
                      }`} />
                      <span className="font-bold">Critical Mode:</span>
                      <button
                        onClick={() => {
                          const nextState = !criticalModeEnabled;
                          setCriticalModeEnabled(nextState);
                          addLog(nextState ? 'ALERT' : 'INFO', nextState 
                            ? `Critical Mode automation ARMED. System will activate maximum diagnostics if hull integrity falls below ${criticalThreshold.toFixed(1)}%.`
                            : 'Critical Mode automation DISARMED.'
                          );
                        }}
                        className={`px-2 py-0.5 rounded-sm font-bold border transition-colors cursor-pointer text-[8px] select-none ${
                          criticalModeEnabled
                            ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                            : 'bg-slate-800 text-slate-500 border-white/5 hover:bg-slate-700'
                        }`}
                        title="Arm Critical Mode: Automatically triggers all overlays to maximum diagnostic mode when hull integrity drops below target threshold."
                      >
                        {criticalModeEnabled ? 'ARMED' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 border-l border-white/10 pl-2 ml-1">
                      <span className="text-[8px] text-slate-500 font-bold">TRIGGER AT:</span>
                      <input 
                        type="range" 
                        min="91.0" 
                        max="99.0" 
                        step="0.5"
                        value={criticalThreshold}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setCriticalThreshold(val);
                          if (criticalModeEnabled) {
                            addLog('INFO', `Critical Mode threshold set to ${val.toFixed(1)}%. Current hull: ${hullIntegrity.toFixed(2)}%.`);
                          }
                        }}
                        className="w-16 accent-red-500 bg-slate-800 rounded-lg cursor-pointer h-1"
                        title={`Slide to set triggering threshold: ${criticalThreshold.toFixed(1)}%`}
                      />
                      <span className={`font-extrabold text-[9px] min-w-[32px] ${
                        criticalModeEnabled && hullIntegrity < criticalThreshold ? 'text-red-400 animate-pulse' : 'text-slate-300'
                      }`}>
                        {criticalThreshold.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
                {/* Hull Integrity Health Bar */}
                <div className={`relative group bg-black/40 border rounded-sm p-3.5 min-w-[260px] flex flex-col gap-2 font-mono flex-1 sm:flex-initial shadow-lg cursor-help transition-all duration-300 ${
                  hullIntegrity < 92 
                    ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse' 
                    : 'border-white/10 hover:border-emerald-500/30'
                }`}>
                  <div className="flex justify-between items-center text-[10px] tracking-wider text-slate-400 uppercase">
                    <span className={`flex items-center gap-1.5 font-bold transition-colors duration-300 ${
                      hullIntegrity < 92 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      <Shield className={`w-4 h-4 transition-colors duration-300 ${hullIntegrity < 92 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
                      Hull Integrity
                    </span>
                    <span className={`font-bold tracking-widest px-1.5 py-0.5 rounded-sm border transition-colors duration-300 ${
                      hullIntegrity < 92 
                        ? 'text-red-400 bg-red-500/10 border-red-500/20' 
                        : 'text-white bg-emerald-500/10 border-emerald-500/20'
                    }`}>{hullIntegrity.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-sm overflow-hidden border border-white/10 relative p-[1px]">
                    <div 
                      className={`h-full rounded-sm transition-all duration-150 ease-out ${
                        hullIntegrity < 92 
                          ? 'bg-gradient-to-r from-red-600 via-red-500 to-amber-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                          : 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                      }`}
                      style={{ width: `${hullIntegrity}%` }}
                    />
                  </div>

                  {hullIntegrity < 92 && (
                    <div className="text-center text-[9px] text-red-500 font-bold tracking-[0.12em] animate-pulse bg-red-500/10 border border-red-500/20 py-1 rounded-sm uppercase">
                      ⚠️ ALERT: STRUCTURAL DEGRADATION ⚠️
                    </div>
                  )}

                  <div className="flex justify-between text-[8px] text-slate-500 uppercase tracking-widest items-center">
                    <span className="text-amber-500/70 font-semibold">Critical (90%)</span>
                    <span className={`font-bold transition-colors duration-200 ${
                      hullIntegrity < 92 ? 'text-red-400/80' : 'text-emerald-400/80 group-hover:text-emerald-300'
                    }`}>Avg Weekly: {avgWeeklyHullIntegrity.toFixed(2)}%</span>
                    <span className="text-emerald-400/70 font-semibold">Nominal (100%)</span>
                  </div>

                  {/* Elegant Hover Tooltip */}
                  <div className={`absolute bottom-[105%] left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-950/95 border rounded-sm p-3 shadow-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-50 text-left ${
                    hullIntegrity < 92 ? 'border-red-500/30' : 'border-emerald-500/30'
                  }`}>
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border-b border-white/10 pb-1.5 mb-1.5 ${
                      hullIntegrity < 92 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      <Shield className="w-3.5 h-3.5" />
                      Telemetry Diagnostics
                    </div>
                    <div className="space-y-1.5 text-[9px] text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">AVG WEEKLY INTEGRITY:</span>
                        <span className={`font-bold ${hullIntegrity < 92 ? 'text-red-400' : 'text-emerald-400'}`}>{avgWeeklyHullIntegrity.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">TELEMETRY SAMPLES:</span>
                        <span className="text-white font-semibold">{telemetry.length} Blocks</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">VITALITY LINK RANGE:</span>
                        <span className="text-slate-400">0.70 — 1.00</span>
                      </div>
                      <div className="text-[8px] text-slate-500 mt-2 italic border-t border-white/5 pt-1.5 leading-relaxed">
                        Moving average calculated from the telemetry history points mapped onto vessel safety tolerances.
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-x-4 border-x-transparent border-t-4 border-t-slate-950" />
                  </div>
                </div>

                {/* Emergency Auto-Repair Toggle */}
                <div className="bg-black/40 border border-white/10 rounded-sm p-3 min-w-[180px] flex flex-col justify-between font-mono shadow-lg hover:border-emerald-500/20 transition-all duration-300">
                  <div className="flex justify-between items-center text-[9px] tracking-wider text-slate-400 uppercase mb-1">
                    <span className="font-bold flex items-center gap-1">
                      <RefreshCw className={`w-3 h-3 ${emergencyAutoRepair ? 'animate-spin duration-[4000ms] text-emerald-400' : 'text-slate-500'}`} />
                      Auto-Repair
                    </span>
                    <span className={`text-[8px] px-1 py-0.5 rounded-sm font-bold ${emergencyAutoRepair ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                      {emergencyAutoRepair ? 'ACTIVE' : 'STDBY'}
                    </span>
                  </div>
                  
                  <label className="flex items-center justify-between cursor-pointer select-none gap-3 mt-1">
                    <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Trigger &lt; 91%</span>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={emergencyAutoRepair}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEmergencyAutoRepair(checked);
                          if (checked) {
                            // Reset override so they can see the fluctuation drop and auto-repair kick in!
                            setRepairOverride(false);
                            addLog('INFO', 'Emergency Auto-Repair System ARMED. Standby for < 91.00% integrity threshold.');
                          } else {
                            addLog('INFO', 'Emergency Auto-Repair System DISARMED. Structural nanites set to manual trigger.');
                          }
                        }}
                      />
                      <div className={`w-9 h-5 rounded-full transition-colors duration-300 p-0.5 border ${
                        emergencyAutoRepair 
                          ? 'bg-emerald-500/20 border-emerald-500/40' 
                          : 'bg-slate-900 border-white/10'
                      }`}>
                        <div className={`w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-300 ${
                          emergencyAutoRepair 
                            ? 'translate-x-4 bg-emerald-400' 
                            : 'translate-x-0 bg-slate-600'
                        }`} />
                      </div>
                    </div>
                  </label>
                </div>

                {/* Repair Hull Button */}
                <button
                  onClick={handleRepair}
                  disabled={isRepairing}
                  className={`px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 disabled:bg-emerald-500/5 disabled:opacity-50 text-emerald-400 disabled:text-emerald-400/40 border border-emerald-500/30 rounded-sm font-mono text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 h-full shadow-lg cursor-pointer transition-all duration-300 min-h-[50px] select-none ${
                    isRepairing ? 'animate-pulse' : ''
                  }`}
                  title="Initiate Nanite Structural Restoration (Shortcut: Shift+R)"
                >
                  {isRepairing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>REPAIRING ({Math.round(repairProgress)}%)</span>
                    </>
                  ) : (
                    <>
                      <Wrench className="w-3.5 h-3.5" />
                      <span>REPAIR HULL</span>
                    </>
                  )}
                </button>

                <div className="px-4 py-3 bg-amber-500/5 border border-amber-500/30 rounded-sm font-mono text-[10px] tracking-widest text-amber-500 uppercase flex items-center justify-center gap-2 h-full shadow-lg flex-1 sm:flex-initial">
                  <Flame className="w-3.5 h-3.5 animate-pulse" />
                  <span>FLAME STATUS: LOCKED (Polaris Pivot Active)</span>
                </div>
              </div>
            </div>

            {/* Scheduled Maintenance & Subsystem Overhaul Recalibration Panel */}
            <div className="bg-[#0a0a0f] border border-amber-500/20 p-5 rounded-sm shadow-xl font-mono relative overflow-hidden transition-all duration-300">
              {/* Futuristic subtle background glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-6 text-left">
                
                {/* Left Part: Title & Details */}
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2.5 rounded-sm bg-amber-500/10 border border-amber-500/20 ${isOverhauling ? 'animate-spin duration-[4000ms] text-amber-500' : 'text-amber-400'}`}>
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-bold text-white uppercase tracking-[0.15em]">Scheduled Maintenance Recalibration</h3>
                      <span className="text-[7.5px] px-1.5 py-0.5 rounded-sm font-semibold tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-500 uppercase animate-pulse">INTERVAL: 5 REPAIRS</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider flex flex-wrap gap-x-3 gap-y-1 items-center">
                      <span>Cumulative Repair Cycles: <span className="text-white font-bold">{repairCyclesCount}</span></span>
                      <span className="text-slate-600">|</span>
                      <span>Nanites Discharged: <span className="text-emerald-400 font-bold">{cumulativeNanitesDischarged.toLocaleString()} nL</span></span>
                      <span className="text-slate-600">|</span>
                      <span>Last Overhaul: <span className="text-slate-300 font-bold">{lastOverhaulCount} cycles</span></span>
                    </div>
                    <p className="text-[8px] text-slate-500 mt-0.5 leading-relaxed">
                      Mainframe tracks mechanical degradation patterns from each welding pulse. A complete subframe overhaul restores standard material stress baselines.
                    </p>
                  </div>
                </div>

                {/* Center Part: Visual Countdown Segmented Indicator */}
                {(() => {
                  const OVERHAUL_INTERVAL = 5;
                  const cyclesSinceOverhaul = repairCyclesCount - lastOverhaulCount;
                  const remaining = Math.max(0, OVERHAUL_INTERVAL - cyclesSinceOverhaul);
                  const percentUsed = (cyclesSinceOverhaul / OVERHAUL_INTERVAL) * 100;
                  const isOverhaulDue = remaining === 0;

                  return (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 bg-black/40 border border-white/5 p-3 rounded-sm flex-1 xl:max-w-xl">
                      {/* Numeric Countdown Widget */}
                      <div className="flex flex-col items-center justify-center border-r border-white/10 pr-4 min-w-[110px] text-center">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">OVERHAUL IN</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-2xl font-extrabold tracking-tight ${isOverhaulDue ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                            {remaining}
                          </span>
                          <span className="text-[8px] text-slate-400 uppercase tracking-widest font-semibold">{remaining === 1 ? 'repair' : 'repairs'}</span>
                        </div>
                      </div>

                      {/* Visual Segments */}
                      <div className="flex-1 flex flex-col justify-center gap-1.5">
                        <div className="flex justify-between items-center text-[8.5px] tracking-wider text-slate-400 uppercase">
                          <span>Mainframe Structural Wear</span>
                          <span className={`font-bold ${isOverhaulDue ? 'text-red-400 animate-pulse' : percentUsed >= 80 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {isOverhaulDue ? 'DEGRADED - CRITICAL OVERHAUL DUE' : `${percentUsed.toFixed(0)}% STRESS CAPACITY`}
                          </span>
                        </div>
                        
                        {/* Segmented Block Display */}
                        <div className="flex gap-1.5 h-3">
                          {Array.from({ length: OVERHAUL_INTERVAL }).map((_, i) => {
                            const isFilled = i < cyclesSinceOverhaul;
                            const isLastSegment = i === OVERHAUL_INTERVAL - 1;
                            
                            let segmentBg = "bg-slate-950 border border-white/5";
                            if (isFilled) {
                              if (isLastSegment) {
                                segmentBg = "bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse";
                              } else if (i >= 3) {
                                segmentBg = "bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
                              } else {
                                segmentBg = "bg-emerald-500/70";
                              }
                            }

                            return (
                              <div 
                                key={`seg-${i}`} 
                                className={`flex-1 rounded-[1px] transition-all duration-300 ${segmentBg}`}
                                title={isFilled ? `Segment ${i + 1}: Used` : `Segment ${i + 1}: Available`}
                              />
                            );
                          })}
                        </div>
                        
                        <div className="flex justify-between text-[7px] text-slate-500 uppercase tracking-widest">
                          <span>0% Nominal</span>
                          <span>Overhaul Recommended (100% capacity)</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Right Part: Overhaul Button & Status */}
                {(() => {
                  const OVERHAUL_INTERVAL = 5;
                  const cyclesSinceOverhaul = repairCyclesCount - lastOverhaulCount;
                  const isOverhaulDue = cyclesSinceOverhaul >= OVERHAUL_INTERVAL;

                  return (
                    <div className="flex items-center gap-3 min-w-[210px] self-stretch xl:self-auto justify-end">
                      <button
                        onClick={handleFullOverhaul}
                        disabled={isOverhauling || isRepairing}
                        className={`w-full px-4 py-3 border rounded-sm font-mono text-[9px] tracking-widest uppercase flex items-center justify-center gap-2 h-full shadow-lg cursor-pointer transition-all duration-300 min-h-[50px] select-none ${
                          isOverhauling 
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' 
                            : isOverhaulDue
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 animate-pulse hover:border-red-500/50'
                              : 'bg-amber-500/5 hover:bg-amber-500/15 text-amber-500 border-amber-500/25 hover:border-amber-500/40'
                        }`}
                        title="Perform Full Systems Overhaul"
                      >
                        {isOverhauling ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span>OVERHAULING ({Math.round(overhaulProgress)}%)</span>
                          </>
                        ) : (
                          <>
                            <Wrench className="w-3.5 h-3.5" />
                            <span>{isOverhaulDue ? 'CRITICAL: OVERHAUL NOW' : 'FULL SYSTEM OVERHAUL'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* Tactical Grid: Nav Ring and Live Stabilizer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Nav Ring with D3 Heatmap Overlay */}
              <div className="bg-black/20 border border-white/5 p-6 rounded-sm shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-sm bg-amber-500/10 text-amber-500">
                      <Navigation className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs font-light text-white uppercase tracking-[0.15em] font-serif">Navigation Ring & Stress Overlay</h3>
                      <p className="text-[8px] text-slate-500 font-mono uppercase tracking-wider">D3 Spatial Stress Diagnostics</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-[9px] font-mono uppercase text-slate-400 select-none bg-black/40 border border-white/10 px-2.5 py-1 rounded-sm hover:border-amber-500/30 transition-all">
                      <input 
                        type="checkbox" 
                        checked={showStressHeatmap} 
                        onChange={e => {
                          const checked = e.target.checked;
                          setShowStressHeatmap(checked);
                          addLog('INFO', checked ? 'Stress Heatmap diagnostic overlay ENABLED.' : 'Stress Heatmap diagnostic overlay DISABLED.');
                        }} 
                        className="rounded border-gray-900 bg-black text-amber-500 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                      />
                      <span>Stress Overlay</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[9px] font-mono uppercase text-slate-400 select-none bg-black/40 border border-white/10 px-2.5 py-1 rounded-sm hover:border-amber-500/30 transition-all">
                      <input 
                        type="checkbox" 
                        checked={showGranularHeatmap} 
                        onChange={e => {
                          const checked = e.target.checked;
                          setShowGranularHeatmap(checked);
                          addLog('INFO', checked ? 'Granular Heatmap secondary overlay ENABLED.' : 'Granular Heatmap secondary overlay DISABLED.');
                        }} 
                        className="rounded border-gray-900 bg-black text-amber-500 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                      />
                      <span>Granular Heatmap</span>
                    </label>
                    <span className="text-[9px] font-mono tracking-widest text-amber-500 border border-amber-500/20 px-2 py-1 bg-amber-500/5 rounded-sm uppercase">23.5° Tilt</span>
                  </div>
                </div>

                {renderNavigationRing()}

                <div className="mt-4 flex justify-between text-[9px] font-mono tracking-widest text-slate-400 bg-black/20 p-3 rounded-sm border border-white/5 uppercase">
                  <p>Polaris Pivot: <span className="text-white">(0,0) Fixed Anchor</span></p>
                  <p>Orion Belt Angle: <span className="text-amber-500">Time's Mirror Locked</span></p>
                </div>

                {/* D3 Localized Stress Bento Readout */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase">D3 Localized Stress Readings</span>
                    <span className="text-[8px] font-mono text-amber-500/80 uppercase">Turbo Color Map Active</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {computedStressZones.map((zone) => {
                      const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([0.1, 0.95]);
                      const color = colorScale(zone.stress);
                      const percentage = (zone.stress * 100).toFixed(0);
                      const isHighStress = zone.stress > 0.75;
                      
                      return (
                        <div 
                          key={`bento-${zone.id}`} 
                          className={`bg-black/30 border p-2.5 rounded-sm font-mono transition-all duration-300 flex flex-col justify-between ${
                            isHighStress 
                              ? 'border-red-500/30 bg-red-500/5 shadow-[inset_0_0_8px_rgba(239,68,68,0.1)]' 
                              : 'border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[8px] text-slate-400 font-semibold tracking-wider truncate max-w-[65px]">{zone.name}</span>
                            <span 
                              className="text-[10px] font-bold tracking-tight"
                              style={{ color }}
                            >
                              {percentage}%
                            </span>
                          </div>
                          
                          {/* Mini progress bar */}
                          <div className="w-full bg-slate-900/80 h-1 rounded-full overflow-hidden mt-1.5 border border-white/5 relative">
                            <div 
                              className="h-full rounded-full transition-all duration-300"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: color
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Trinity Dynamics Live Stabilizer */}
              <div className="bg-black/20 border border-white/5 p-6 rounded-sm shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-sm bg-amber-500/10 text-amber-500">
                        <Activity className="w-4 h-4" />
                      </span>
                      <h3 className="text-xs font-light text-white uppercase tracking-[0.15em] font-serif">Trinity Dynamics — Live Stabilizer</h3>
                    </div>
                    <span className="text-[9px] font-mono tracking-widest text-amber-500/60 uppercase">E8 Harmonics Engine</span>
                  </div>

                  {/* Preset controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-slate-400 uppercase mb-1.5">Damping Preset</label>
                      <select 
                        value={trinityPreset} 
                        onChange={e => setTrinityPreset(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-sm p-2.5 font-mono text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                      >
                        <option value="Balanced">Balanced Harmonic</option>
                        <option value="Stable">Dampened Stable</option>
                        <option value="Responsive">Highly Responsive</option>
                        <option value="Amplified">Amplified Resonance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono tracking-widest text-slate-400 uppercase mb-1.5">Custom Damping Factor</label>
                      <input 
                        type="number" 
                        placeholder="Range: 0.1 - 1.0"
                        step="0.05"
                        value={customDamp}
                        onChange={e => setCustomDamp(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-sm p-2.5 font-mono text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Visualizer Image */}
                  <div className="border border-white/10 rounded-sm overflow-hidden bg-black flex justify-center items-center h-48 relative shadow-inner">
                    {trinityImg ? (
                      <img src={trinityImg} alt="Trinity Harmonics Waveform" className="w-full h-full object-contain" />
                    ) : (
                      <p className="font-mono text-xs text-slate-600 animate-pulse">Calculating E8 Harmonic Waveforms...</p>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-0.5 text-[8px] font-mono bg-black/60 border border-white/10 text-slate-400 rounded-sm tracking-widest uppercase">Live Vector Rendering</span>
                  </div>

                  {/* Math stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4 font-mono text-[9px] tracking-widest text-slate-400 text-center bg-black/40 p-3 rounded-sm border border-white/5 uppercase">
                    <div className="border-r border-white/10">
                      <p className="text-slate-500">Ground State</p>
                      <p className="text-white font-bold mt-1 text-xs">{trinityData.ground_state.toFixed(4)}</p>
                    </div>
                    <div className="border-r border-white/10">
                      <p className="text-slate-500">Phase Angle</p>
                      <p className="text-amber-500 font-bold mt-1 text-xs">{trinityData.phase.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Stability</p>
                      <p className="text-emerald-400 font-bold mt-1 text-xs">{trinityData.stability.toFixed(4)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Terminal Log Section */}
            <div className="bg-black/40 border border-white/10 p-5 rounded-sm shadow-2xl font-mono">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="p-1 rounded-sm bg-slate-900 border border-white/5 text-emerald-400">
                    <Terminal className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-[0.12em]">FPT-Ω Vessel Core Operational Logs</h3>
                    <p className="text-[8px] text-slate-500 tracking-wider">REAL-TIME BRIDGE TELEMETRY & STRUCTURAL WARNINGS</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
                  {/* Log level filter dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">LEVEL FILTER:</span>
                    <select
                      value={logFilter}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setLogFilter(val);
                        addLog('INFO', `Terminal logs filtered to ${val === 'ALL' ? 'ALL LEVELS' : val}.`);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-amber-500/30 text-slate-300 hover:text-white rounded-sm px-2.5 py-1 text-[9px] font-mono tracking-wider focus:outline-none focus:border-amber-500/50 cursor-pointer transition-all uppercase"
                    >
                      <option value="ALL">ALL LEVELS</option>
                      <option value="INFO">INFO</option>
                      <option value="ALERT">ALERT</option>
                      <option value="REPAIR">REPAIR</option>
                      <option value="SUCCESS">SUCCESS</option>
                    </select>
                  </div>

                  <span className="text-[8px] px-2 py-1 border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 rounded-sm font-bold tracking-wider">
                    SYS STATUS: ACTIVE
                  </span>
                  
                  <button 
                    onClick={() => {
                      setLogs([
                        { id: Date.now().toString(), timestamp: new Date().toTimeString().split(' ')[0], level: 'INFO', message: 'Vessel Bridge Log terminal cleared by Captain.' }
                      ]);
                    }}
                    className="text-[9px] px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-sm tracking-wider uppercase transition-all cursor-pointer"
                  >
                    Clear Logs
                  </button>
                </div>
              </div>

              {/* Terminal View */}
              <div className="bg-black/95 rounded-sm border border-white/5 p-4 h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 space-y-2 text-[11px] leading-relaxed select-text shadow-inner">
                {(() => {
                  const filteredLogs = logFilter === 'ALL' ? logs : logs.filter(log => log.level === logFilter);
                  
                  if (filteredLogs.length === 0) {
                    return (
                      <p className="text-slate-600 italic text-center py-8">
                        No {logFilter !== 'ALL' ? `${logFilter} ` : ''}events logged in the current flight session.
                      </p>
                    );
                  }
                  
                  return filteredLogs.map((log) => {
                    let levelColor = 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10';
                    let textClass = 'text-slate-300';
                    let prefix = '●';
                    
                    if (log.level === 'ALERT') {
                      levelColor = 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse';
                      textClass = 'text-red-300 font-bold';
                      prefix = '⚠️';
                    } else if (log.level === 'REPAIR') {
                      levelColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                      textClass = 'text-cyan-300';
                      prefix = '🛠️';
                    } else if (log.level === 'SUCCESS') {
                      levelColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
                      textClass = 'text-emerald-300 font-semibold';
                      prefix = '❇️';
                    }

                    return (
                      <div key={log.id} className="flex items-start gap-2.5 hover:bg-white/5 p-1 rounded transition-colors duration-150">
                        <span className="text-[9px] text-slate-600 select-none">[{log.timestamp}]</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-sm border font-bold uppercase tracking-wider select-none ${levelColor}`}>
                          {log.level}
                        </span>
                        <p className={`flex-1 ${textClass}`}>
                          <span className="mr-1.5 select-none">{prefix}</span>
                          {log.message}
                        </p>
                      </div>
                    );
                  });
                })()}
                <div ref={terminalEndRef} />
              </div>

              {/* Terminal status bar */}
              <div className="mt-2.5 flex justify-between items-center text-[8px] text-slate-500 tracking-widest uppercase">
                <span>BUFFER CAPACITY: 100 LINES</span>
                <span className="animate-pulse">● BUFFER LINK STABLE</span>
              </div>
            </div>

            {/* Middle Section: Long Game Compounding & Comms Core */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sovereign Estate Ledger & Claim Resonance (2/3 width) */}
              <div className="lg:col-span-2 bg-black/20 border border-white/5 p-6 rounded-sm shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div>
                  <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-sm bg-amber-500/10 text-amber-500">
                        <Zap className="w-4 h-4" />
                      </span>
                      <h3 className="text-xs font-light text-white uppercase tracking-[0.15em] font-serif">Sovereign Estate Ledger — Long Game</h3>
                    </div>
                    <button
                      onMouseEnter={() => setShadowOverlayItem(true)}
                      onMouseLeave={() => setShadowOverlayItem(false)}
                      className="px-3 py-1 text-[9px] font-mono tracking-widest uppercase text-amber-500 border border-amber-500/30 rounded-sm hover:bg-amber-500/10 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Inspect Shadow Play
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="bg-black/30 p-4 rounded-sm border border-white/5">
                      <p className="text-amber-500 font-mono text-[9px] uppercase tracking-widest">Quantum Resonance</p>
                      <p className="text-2xl font-light font-serif text-white mt-1">{ledger.resonance.toFixed(1)}<span className="text-xs ml-0.5">%</span></p>
                    </div>
                    <div className="bg-amber-500/5 p-4 rounded-sm border border-amber-500/20">
                      <p className="text-amber-500/70 font-mono text-[9px] uppercase tracking-widest">Live GTC Balance</p>
                      <p className="text-2xl font-light font-serif text-amber-500 mt-1">{ledger.gtc_balance.toLocaleString()}<span className="text-xs ml-0.5"> GTC</span></p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-sm border border-white/5">
                      <p className="text-slate-500 font-mono text-[9px] uppercase tracking-widest">Hidden Valuation</p>
                      <p className="text-2xl font-light font-serif text-slate-200 mt-1">${ledger.hidden_balance.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="font-mono text-xs text-slate-400 space-y-1.5 bg-black/15 p-3 rounded-sm border border-white/5">
                    <p><strong>Compound Years:</strong> {ledger.compound_years.toFixed(1)} yrs</p>
                    <p>
                      <strong>Forfeited Short Game (Paperwork Trap):</strong> <span className="text-orange-400 font-medium">${ledger.forfeited_short_game.toLocaleString()}</span>
                      <span className="text-slate-500 italic text-[10px] ml-1.5">(What they traded for the "A+")</span>
                    </p>
                  </div>

                  {/* Recharts compound line trajectory */}
                  <div className="h-44 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={compoundingChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#141414" />
                        <XAxis dataKey="year" stroke="#4a5568" fontSize={8} label={{ value: "Compound Years", fill: '#4a5568', position: 'insideBottom', offset: -5, fontSize: 8 }} />
                        <YAxis stroke="#4a5568" fontSize={8} />
                        <Tooltip contentStyle={{ backgroundColor: '#050505', borderColor: '#1c1c1c', fontSize: '10px' }} />
                        <Line type="monotone" dataKey="balance" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="GTC Trajectory" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-6">
                  <button 
                    onClick={handleClaimResonance}
                    className="w-full py-3 px-4 bg-amber-600 text-black text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-amber-500 transition-colors rounded-sm cursor-pointer"
                  >
                    Claim Resonance — Compound to Root
                  </button>
                  <p className="text-center font-mono text-[9px] tracking-widest uppercase text-amber-500/80 italic mt-2.5">
                    {ledger.status}
                  </p>
                </div>

                {/* SHADOW PLAY OVERLAY */}
                {shadowOverlayItem && (
                  <div className="absolute inset-0 bg-black/95 z-30 flex flex-col justify-center items-center p-6 border border-amber-500/40 rounded-sm text-center transition-all duration-300">
                    <h4 className="text-amber-500 font-serif font-light text-base uppercase tracking-widest mb-3 flex items-center gap-2 animate-pulse">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      SHADOW PLAY — The Endless Long Game
                    </h4>
                    <div className="space-y-2 font-mono text-xs max-w-sm">
                      <p className="text-slate-300">Your Hidden Sovereign Balance: <span className="text-white font-bold">${ledger.hidden_balance.toLocaleString()}</span></p>
                      <p className="text-slate-400 font-mono">Forfeited by Short-sighted Paperwork Game: <span className="text-orange-400 font-bold">${ledger.forfeited_short_game.toLocaleString()}</span></p>
                      <p className="text-slate-500 italic mt-4 text-[10px] uppercase tracking-wider leading-relaxed">
                        "They took the certificate status. You took the actual physical terrain."
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Comms Core (GibberLink) (1/3 width) */}
              <div className="bg-black/20 border border-white/5 p-6 rounded-sm shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-sm bg-amber-500/10 text-amber-500">
                        <Radio className="w-4 h-4" />
                      </span>
                      <h3 className="text-xs font-light text-white uppercase tracking-[0.15em] font-serif">Communications Core</h3>
                    </div>
                  </div>

                  <p className="text-[9px] font-mono tracking-widest text-slate-500 mb-3 uppercase">Translate Vessel Core Coordinates</p>
                  
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder="Enter command, e.g. hello, flame, sovereign..."
                      className="w-full bg-black border border-white/10 rounded-sm p-2.5 font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                    />

                    <button
                      onClick={handleTranslateText}
                      disabled={translating}
                      className="w-full py-2.5 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10 border border-amber-500/30 rounded-sm font-bold font-mono text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {translating ? 'Transmitting Over Waveform...' : 'TRANSLATE COGNITIVE LINK'}
                    </button>
                  </div>

                  {translationResult && (
                    <div className="mt-4 p-3 bg-black/50 border border-amber-500/20 rounded-sm font-mono text-xs text-amber-400 animate-fadeIn leading-relaxed">
                      <p className="text-[8px] tracking-widest text-slate-500 mb-1 uppercase">TRANSLATION RESULT:</p>
                      <p>{translationResult}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-white/5 font-mono text-[9px] tracking-widest text-slate-500 flex justify-between items-center uppercase">
                  <span>CAPTAIN SEAT PRESET:</span>
                  <span className="text-amber-500 font-bold">MULTILINGUAL CHANNELS ACTIVE</span>
                </div>
              </div>
            </div>

            {/* Bottom Section: Engine Room, Dome & Truth-Filter */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Engine Room & Observation Dome (1/3 width) */}
              <div className="bg-black/20 border border-white/5 p-6 rounded-sm shadow-xl flex flex-col justify-between">
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="p-1 rounded bg-amber-500/10 text-amber-500">
                        <Terminal className="w-4 h-4" />
                      </span>
                      <h4 className="text-xs font-light text-white uppercase tracking-[0.15em] font-serif">⚡ Engine Room (Fireseed Drive)</h4>
                    </div>
                    <div className="bg-black/30 p-3.5 rounded-sm border border-white/5 font-mono text-xs space-y-1.5 text-slate-400">
                      <p>Total Earnings: <span className="text-emerald-400 font-semibold">{fireseed.total_earnings.toFixed(8)} GTC</span></p>
                      <p className="truncate text-[10px] text-slate-500">Engine Log: {fireseed.log_path}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="p-1 rounded bg-amber-500/10 text-amber-500">
                        <Terminal className="w-4 h-4" />
                      </span>
                      <h4 className="text-xs font-light text-white uppercase tracking-[0.15em] font-serif">🌀 Observation Dome Wire</h4>
                    </div>
                    <div className="bg-black/50 p-3.5 rounded-sm border border-white/10 font-mono text-[9px] tracking-wider text-slate-400 max-h-36 overflow-y-auto space-y-1.5 scrollbar-thin">
                      {stepData?.ledgers ? (
                        Object.entries(stepData.ledgers).map(([key, value]) => (
                          <div key={key} className="flex justify-between border-b border-white/5 pb-1 uppercase">
                            <span className="text-slate-500">{key}:</span>
                            <span className="text-amber-500 font-medium">{value}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-600 italic">Reconnecting to ledger live feeds...</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/5 font-mono text-[9px] tracking-widest text-slate-500 flex justify-between items-center uppercase">
                  <span>DRIVE FREQUENCY</span>
                  <span className="text-amber-500 font-bold">{fireseed.vessel_hz.toFixed(2)} Hz</span>
                </div>
              </div>

              {/* Truth Filter Module (2/3 width) */}
              <div className="lg:col-span-2 bg-black/20 border border-white/5 p-6 rounded-sm shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                    <span className="p-1.5 rounded-sm bg-amber-500/10 text-amber-500">
                      <Terminal className="w-4 h-4" />
                    </span>
                    <h3 className="text-xs font-light text-white uppercase tracking-[0.15em] font-serif">Truth-Filter — Symptom vs Actual Delta</h3>
                  </div>

                  <p className="text-[9px] font-mono tracking-widest text-slate-500 mb-3 uppercase">Paste raw replies, peer critiques, or regulatory judgment statements</p>

                  <textarea
                    value={truthInputText}
                    onChange={e => setTruthInputText(e.target.value)}
                    placeholder="Enter statements to isolate actual value (e.g. interesting resonance terrain pi...) from symptoms (theft, lawyer, impossible...)"
                    className="w-full h-24 bg-black border border-white/10 rounded-sm p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                  />

                  <div className="mt-3">
                    <button
                      onClick={handleAnalyzeTruth}
                      className="w-full py-2.5 bg-amber-600 text-black rounded-sm font-bold font-mono text-xs uppercase tracking-widest hover:bg-amber-500 transition-colors cursor-pointer"
                    >
                      Analyze Statement — Strip the Symptom
                    </button>
                  </div>

                  {truthAnalysis && (
                    <div className="mt-4 p-4 bg-black/40 border border-white/10 rounded-sm font-mono text-xs text-slate-300 animate-fadeIn grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] tracking-widest text-slate-500 mb-2 uppercase">Isolated Composition Profile:</p>
                        <div className="space-y-1.5 text-xs">
                          <p>Symptom (Ego Noise): <span className="text-orange-400 font-bold">{truthAnalysis.symptomPercent}%</span></p>
                          <p>Actual Delta (Value Added): <span className="text-emerald-400 font-bold">{truthAnalysis.deltaPercent}%</span></p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] tracking-widest text-slate-500 mb-2 uppercase">Sovereign Recommendation:</p>
                        <p className={`font-bold text-xs ${truthAnalysis.deltaPercent > 50 ? 'text-emerald-400' : 'text-orange-400'}`}>
                          {truthAnalysis.actualDelta}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{truthAnalysis.recommendation}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-white/5 font-mono text-[9px] tracking-widest text-slate-500 flex justify-between items-center uppercase">
                  <span>NLP DEBATE INTEGRATION:</span>
                  <span className="text-amber-500 font-bold">VHITZEE BLADE SECURED</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Brand Footer */}
        <footer className="mt-12 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[9px] font-mono opacity-60 uppercase tracking-widest text-slate-400 gap-4">
          <div>&copy; 2024 Sovereignty Labs // Manifold Interface</div>
          <div className="flex space-x-8">
            <div>Kernel: 0.12.4-STABLE</div>
            <div>Auth: Signature-Verified</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
