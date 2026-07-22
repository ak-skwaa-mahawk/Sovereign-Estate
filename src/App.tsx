import React, { useEffect, useState, useRef, useMemo, useCallback, CSSProperties, MouseEvent } from 'react';
import { jsPDF } from 'jspdf';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { WorkspaceHub } from './components/WorkspaceHub';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
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
  RotateCcw,
  AlertTriangle,
  Download,
  Wrench,
  Layers,
  ChevronDown,
  Search,
  X,
  Settings,
  Clock,
  Lock,
  Unlock,
  Unlink,
  Share2,
  Copy,
  Check
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
  
  // Firebase Auth and sync states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState<boolean>(true);
  const isLoadingFromCloud = useRef<boolean>(false);
  
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
  const [isOverhaulConfirmOpen, setIsOverhaulConfirmOpen] = useState<boolean>(false);
  const [isClearLogsConfirmOpen, setIsClearLogsConfirmOpen] = useState<boolean>(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState<boolean>(false);
  const [batchConfirmState, setBatchConfirmState] = useState<{
    isOpen: boolean;
    actionType: 'lock' | 'unlock';
    targetNodeIds: string[];
  } | null>(null);
  const [logsClearedAt, setLogsClearedAt] = useState<number>(() => {
    const saved = localStorage.getItem('logs_cleared_at');
    return saved ? parseInt(saved, 10) : 0;
  });

  const showBanner = useCallback((msg: string) => {
    setShowNotification(msg);
    setTimeout(() => {
      setShowNotification(null);
    }, 5000);
  }, []);

  // Operational terminal logs state
  const [logs, setLogs] = useState<Array<{ id: string; timestamp: string; level: 'INFO' | 'ALERT' | 'REPAIR' | 'SUCCESS'; message: string }>>(() => {
    const cached = localStorage.getItem('vessel_terminal_logs');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse cached logs", e);
      }
    }
    return [
      { id: '1', timestamp: '23:15:00', level: 'INFO', message: 'FPT-Ω Vessel Core System initialized. Operational status green.' },
      { id: '2', timestamp: '23:15:02', level: 'INFO', message: 'Polaris Pivot tracking anchored at 23.5° axial tilt.' },
      { id: '3', timestamp: '23:15:05', level: 'INFO', message: 'E8 Harmonics Engine online. Active dampening balance active.' },
    ];
  });
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const [autoPurge, setAutoPurge] = useState<boolean>(() => {
    return localStorage.getItem('log_auto_purge') === 'true';
  });
  const [showTerminalSettings, setShowTerminalSettings] = useState<boolean>(false);
  const autoPurgeRef = useRef<boolean>(autoPurge);

  const [lastBackupTime, setLastBackupTime] = useState<string>(() => {
    return localStorage.getItem('vessel_terminal_logs_last_backup') || 'NEVER';
  });

  const logsRef = useRef(logs);
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    autoPurgeRef.current = autoPurge;
    localStorage.setItem('log_auto_purge', autoPurge.toString());
    if (autoPurge) {
      setLogs(prev => {
        const sliced = prev.slice(-50);
        localStorage.setItem('vessel_terminal_logs', JSON.stringify(sliced));
        return sliced;
      });
    }
  }, [autoPurge]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (logsRef.current.length > 0) {
        localStorage.setItem('vessel_terminal_logs', JSON.stringify(logsRef.current));
        const timeStr = new Date().toTimeString().split(' ')[0];
        localStorage.setItem('vessel_terminal_logs_last_backup', timeStr);
        setLastBackupTime(timeStr);
        console.log(`[Vessel Backup] Automated 60-second local state backup completed at ${timeStr}.`);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const addLog = useCallback((level: 'INFO' | 'ALERT' | 'REPAIR' | 'SUCCESS', message: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
    
    setLogs(prev => {
      // Avoid duplicate consecutive logs of identical messages
      if (prev.length > 0 && prev[prev.length - 1].message === message) return prev;
      const limit = autoPurgeRef.current ? 50 : 100;
      return [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: timeStr,
          level,
          message
        }
      ].slice(-limit); // Slices dynamically depending on autoPurge limit
    });

    // If authenticated, also push to Firestore
    if (auth.currentUser) {
      const logId = Math.random().toString(36).substring(2, 11);
      const logRef = doc(db, 'users', auth.currentUser.uid, 'logs', logId);
      setDoc(logRef, {
        id: logId,
        timestamp: serverTimestamp(),
        level,
        message,
        userId: auth.currentUser.uid
      }).catch(err => {
        const isOffline = err instanceof Error && (
          err.message.includes('offline') || 
          err.message.includes('unreachable') || 
          err.message.includes('unavailable') ||
          err.message.includes('Could not reach')
        );
        if (!isOffline) {
          handleFirestoreError(err, OperationType.CREATE, `users/${auth.currentUser?.uid}/logs/${logId}`);
        } else {
          console.warn('Deferred logs push to cloud: client operates in offline mode.');
        }
      });
    }
  }, []);

  const handleClearLogs = useCallback(() => {
    const now = Date.now();
    setLogsClearedAt(now);
    localStorage.setItem('logs_cleared_at', now.toString());
    const cleared = [
      { id: now.toString(), timestamp: new Date().toTimeString().split(' ')[0], level: 'INFO', message: 'Vessel Bridge Log terminal cleared by Captain.' }
    ];
    setLogs(cleared);
    localStorage.setItem('vessel_terminal_logs', JSON.stringify(cleared));
    addLog('INFO', 'Vessel Bridge Log terminal cleared by Captain.');
    showBanner('🧹 Vessel Bridge Log terminal cleared.');
  }, [addLog, showBanner]);

  const downloadLogsAsTXT = () => {
    if (filteredLogs.length === 0) {
      showBanner("❌ Error: No filtered logs available to download.");
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const header = [
      `==================================================`,
      `       FPT-OMEGA COCKPIT VESSEL TERMINAL LOGS     `,
      `       EXPORT DATE (UTC): ${new Date().toISOString().replace('T', ' ').substring(0, 19)}`,
      `       ACTIVE LEVEL FILTER: ${logFilter}`,
      `       SEARCH QUERY: ${logSearchQuery || 'NONE'}`,
      `       TIME BOUNDS: ${logStartTime || 'ANY'} to ${logEndTime || 'ANY'}`,
      `       TOTAL LOGS EXPORTED: ${filteredLogs.length}`,
      `==================================================\n\n`
    ].join('\n');

    const body = filteredLogs.map(log => 
      `[${log.timestamp || '00:00:00'}] [${log.level.padEnd(7)}] ${log.message}`
    ).join('\n');

    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vessel_terminal_logs_${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showBanner("📥 Filtered logs downloaded as TXT file.");
    addLog('SUCCESS', `Exported ${filteredLogs.length} filtered terminal logs to TXT format.`);
  };

  const downloadLogsAsJSON = () => {
    if (filteredLogs.length === 0) {
      showBanner("❌ Error: No filtered logs available to download.");
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const payload = {
      vessel_metadata: {
        vessel_id: "FPT-OMEGA-0xFD9A",
        export_time_utc: new Date().toISOString(),
        filters: {
          level: logFilter,
          search_query: logSearchQuery || null,
          time_start: logStartTime || null,
          time_end: logEndTime || null
        },
        records_count: filteredLogs.length
      },
      logs: filteredLogs
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vessel_terminal_logs_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showBanner("📥 Filtered logs downloaded as JSON file.");
    addLog('SUCCESS', `Exported ${filteredLogs.length} filtered terminal logs to JSON format.`);
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive');
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://mail.google.com/');
    provider.addScope('https://www.googleapis.com/auth/documents');
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        addLog('SUCCESS', 'Google Workspace access authorized! Drive, Sheets, Gmail, & Docs linked.');
        showBanner('🌌 GOOGLE WORKSPACE CONNECTED: Drive, Sheets, Gmail & Docs active!');
      }
    } catch (err) {
      console.error('Sign-in failed:', err);
      addLog('ALERT', 'Cloud authentication failed. Standalone backup remains active.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setLogs([
        { id: '1', timestamp: '23:15:00', level: 'INFO', message: 'FPT-Ω Vessel Core System initialized. Operational status green.' },
        { id: '2', timestamp: '23:15:02', level: 'INFO', message: 'Polaris Pivot tracking anchored at 23.5° axial tilt.' },
        { id: '3', timestamp: '23:15:05', level: 'INFO', message: 'E8 Harmonics Engine online. Active dampening balance active.' },
      ]);
      addLog('INFO', 'Secure Cloud session disconnected. Resumed Standalone Mode.');
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

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
  const [hoveredDiagnosticNode, setHoveredDiagnosticNode] = useState<{ id: string; name: string; angle: number; stress: number; x: number; y: number } | null>(null);
  const [lockedDiagnosticNodes, setLockedDiagnosticNodes] = useState<Record<string, boolean>>({});
  const [recentlyToggledLockNodes, setRecentlyToggledLockNodes] = useState<Record<string, { locked: boolean; time: number }>>({});
  
  const triggerLockAnimation = useCallback((nodeIds: string[], locked: boolean) => {
    const now = Date.now();
    setRecentlyToggledLockNodes(prev => {
      const next = { ...prev };
      nodeIds.forEach(id => {
        next[id] = { locked, time: now };
      });
      return next;
    });
  }, []);
  const [dischargedDiagnosticNodes, setDischargedDiagnosticNodes] = useState<Record<string, number>>({});
  const [selectedDiagnosticNodeIds, setSelectedDiagnosticNodeIds] = useState<string[]>([]);
  const [selectionModeEnabled, setSelectionModeEnabled] = useState<boolean>(true);
  const [isDraggingSelection, setIsDraggingSelection] = useState<boolean>(false);
  const [dragStartCoords, setDragStartCoords] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrentCoords, setDragCurrentCoords] = useState<{ x: number; y: number } | null>(null);
  const [quadrantConfirmNodeId, setQuadrantConfirmNodeId] = useState<string | null>(null);
  const [pingedQuadrant, setPingedQuadrant] = useState<{ quadNum: number; maxAvgStress: number; time: number } | null>(null);
  const [isShareCopied, setIsShareCopied] = useState<boolean>(false);
  const navigationRingSvgRef = useRef<SVGSVGElement | null>(null);
  const [isDiagnosticMenuOpen, setIsDiagnosticMenuOpen] = useState<boolean>(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'ALERT' | 'REPAIR' | 'SUCCESS'>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logStartTime, setLogStartTime] = useState<string>('');
  const [logEndTime, setLogEndTime] = useState<string>('');
  const [criticalModeEnabled, setCriticalModeEnabled] = useState<boolean>(false);
  const [criticalThreshold, setCriticalThreshold] = useState<number>(93.0);

  const filteredLogs = useMemo(() => {
    let fl = logFilter === 'ALL' ? logs : logs.filter(log => log.level === logFilter);
    
    if (logSearchQuery.trim() !== '') {
      const q = logSearchQuery.toLowerCase();
      fl = fl.filter(log => 
        log.message.toLowerCase().includes(q) || 
        log.level.toLowerCase().includes(q) ||
        (log.timestamp && log.timestamp.toLowerCase().includes(q))
      );
    }

    if (logStartTime) {
      const start = logStartTime.length === 5 ? `${logStartTime}:00` : logStartTime;
      fl = fl.filter(log => log.timestamp >= start);
    }

    if (logEndTime) {
      const end = logEndTime.length === 5 ? `${logEndTime}:59` : logEndTime;
      fl = fl.filter(log => log.timestamp <= end);
    }
    return fl;
  }, [logs, logFilter, logSearchQuery, logStartTime, logEndTime]);

  const last60MinStats = useMemo(() => {
    const now = new Date();
    const sixtyMinsAgoMs = 60 * 60 * 1000;
    
    let totalAlerts = 0;
    let totalRepairs = 0;
    let totalSuccess = 0;
    let totalInfo = 0;
    let total60mCount = 0;
    
    logs.forEach(log => {
      if (!log.timestamp) return;
      const [h, m, s] = log.timestamp.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return;
      
      const logTime = new Date(now);
      logTime.setHours(h, m, s || 0, 0);
      
      if (logTime.getTime() > now.getTime()) {
        logTime.setDate(logTime.getDate() - 1);
      }
      
      const diffMs = now.getTime() - logTime.getTime();
      if (diffMs >= 0 && diffMs <= sixtyMinsAgoMs) {
        total60mCount++;
        if (log.level === 'ALERT') totalAlerts++;
        else if (log.level === 'REPAIR') totalRepairs++;
        else if (log.level === 'SUCCESS') totalSuccess++;
        else if (log.level === 'INFO') totalInfo++;
      }
    });
    
    return {
      alerts: totalAlerts,
      repairs: totalRepairs,
      successes: totalSuccess,
      infos: totalInfo,
      total: total60mCount,
      activeBufferCount: logs.length
    };
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('repair_cycles_count', repairCyclesCount.toString());
  }, [repairCyclesCount]);

  useEffect(() => {
    localStorage.setItem('cumulative_nanites_discharged', cumulativeNanitesDischarged.toString());
  }, [cumulativeNanitesDischarged]);

  useEffect(() => {
    localStorage.setItem('last_overhaul_count', lastOverhaulCount.toString());
  }, [lastOverhaulCount]);

  // Firebase Auth State Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsFirebaseLoading(false);
      if (user) {
        addLog('SUCCESS', `Secure Firebase session synchronized for commander: ${user.displayName || user.email}`);
        showBanner(`🌌 Firebase Cloud Synced: ${user.displayName || 'Vessel Commander'}`);
      } else {
        addLog('INFO', 'Vessel operating in Local Standalone Mode. Cloud backup inactive.');
      }
    });
    return () => unsubscribe();
  }, [addLog]);

  // Load/Bootstrap Vessel State from Firestore when user authenticates
  useEffect(() => {
    if (!currentUser) return;

    let active = true;
    const docRef = doc(db, 'users', currentUser.uid, 'vessel_state', 'FPT-Omega');

    const loadState = async () => {
      try {
        const docSnap = await getDoc(docRef);
        if (!active) return;

        if (docSnap.exists()) {
          const data = docSnap.data();
          isLoadingFromCloud.current = true;
          if (data.repairCyclesCount !== undefined) setRepairCyclesCount(data.repairCyclesCount);
          if (data.cumulativeNanitesDischarged !== undefined) setCumulativeNanitesDischarged(data.cumulativeNanitesDischarged);
          if (data.lastOverhaulCount !== undefined) setLastOverhaulCount(data.lastOverhaulCount);
          if (data.hullIntegrity !== undefined) setHullIntegrity(data.hullIntegrity);
          if (data.emergencyAutoRepair !== undefined) setEmergencyAutoRepair(data.emergencyAutoRepair);
          if (data.criticalModeEnabled !== undefined) setCriticalModeEnabled(data.criticalModeEnabled);
          if (data.criticalThreshold !== undefined) setCriticalThreshold(data.criticalThreshold);
          
          addLog('SUCCESS', 'Vessel structural parameters loaded from Secure Cloud Ledger.');
          
          setTimeout(() => {
            isLoadingFromCloud.current = false;
          }, 200);
        } else {
          // If no cloud document, bootstrap cloud ledger with current local state
          const bootstrapPayload = {
            repairCyclesCount,
            cumulativeNanitesDischarged,
            lastOverhaulCount,
            hullIntegrity,
            emergencyAutoRepair,
            criticalModeEnabled,
            criticalThreshold,
            updatedAt: serverTimestamp(),
            userId: currentUser.uid
          };
          await setDoc(docRef, bootstrapPayload);
          addLog('SUCCESS', 'Initial cloud telemetry manifest bootstrapped successfully.');
        }
      } catch (err) {
        if (active) {
          const isOffline = err instanceof Error && (
            err.message.includes('offline') || 
            err.message.includes('unreachable') || 
            err.message.includes('unavailable') ||
            err.message.includes('Could not reach')
          );
          if (isOffline) {
            console.warn('Vessel state loaded in Offline/Standalone mode. Cached local data is being utilized.');
            addLog('INFO', 'Vessel operating in Standalone Offline Mode. Local telemetry verified.');
          } else {
            console.warn('Unable to synchronize vessel state with Cloud Ledger. Operating offline:', err);
            addLog('ALERT', 'Cloud Ledger synchronization offline. Operating in Standalone Local Mode.');
          }
        }
      }
    };

    loadState();

    return () => {
      active = false;
    };
  }, [currentUser]);

  // Sync Vessel State changes to Firestore
  useEffect(() => {
    if (!currentUser || isLoadingFromCloud.current) return;

    const docRef = doc(db, 'users', currentUser.uid, 'vessel_state', 'FPT-Omega');
    
    // Debounce slightly to prevent database write flooding
    const timer = setTimeout(async () => {
      try {
        await setDoc(docRef, {
          repairCyclesCount,
          cumulativeNanitesDischarged,
          lastOverhaulCount,
          hullIntegrity,
          emergencyAutoRepair,
          criticalModeEnabled,
          criticalThreshold,
          updatedAt: serverTimestamp(),
          userId: currentUser.uid
        });
      } catch (err) {
        const isOffline = err instanceof Error && (
          err.message.includes('offline') || 
          err.message.includes('unreachable') || 
          err.message.includes('unavailable') ||
          err.message.includes('Could not reach')
        );
        if (isOffline) {
          console.warn('Vessel state sync deferred: Client is in standalone offline mode.');
        } else {
          handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/vessel_state/FPT-Omega`);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    currentUser,
    repairCyclesCount,
    cumulativeNanitesDischarged,
    lastOverhaulCount,
    hullIntegrity,
    emergencyAutoRepair,
    criticalModeEnabled,
    criticalThreshold
  ]);

  // Sync Logs from Firestore when authenticated
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'users', currentUser.uid, 'logs'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cloudLogs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let timeStr = '00:00:00';
        let ms = 0;
        if (data.timestamp) {
          const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
          timeStr = date.toTimeString().split(' ')[0];
          ms = date.getTime();
        }
        return {
          id: data.id || docSnap.id,
          timestamp: timeStr,
          level: data.level as 'INFO' | 'ALERT' | 'REPAIR' | 'SUCCESS',
          message: data.message,
          ms
        };
      });

      const filtered = cloudLogs.filter(log => log.ms > logsClearedAt);

      if (filtered.length > 0) {
        setLogs(filtered);
      } else {
        setLogs([
          { id: 'clear-msg', timestamp: new Date().toTimeString().split(' ')[0], level: 'INFO', message: 'Vessel Bridge Log terminal cleared by Captain.' }
        ]);
      }
    }, (error) => {
      const isOffline = error instanceof Error && (
        error.message.includes('offline') || 
        error.message.includes('unreachable') || 
        error.message.includes('unavailable') ||
        error.message.includes('Could not reach')
      );
      if (!isOffline) {
        handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/logs`);
      } else {
        console.warn('Real-time cloud logs synchronization deferred: operating offline.');
      }
    });

    return () => unsubscribe();
  }, [currentUser, logsClearedAt]);

  // State and auth handlers moved to top of file to prevent block scope declaration errors

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
      const isLocked = !!lockedDiagnosticNodes[zone.id];
      const hasDischargedOverride = dischargedDiagnosticNodes[zone.id] !== undefined;

      let calculatedStress;
      if (hasDischargedOverride && !isLocked) {
        calculatedStress = dischargedDiagnosticNodes[zone.id];
      } else {
        const wave = Math.sin(elapsed + idx * 1.5) * 0.08 + Math.cos(elapsed * 0.7 - idx) * 0.04;
        calculatedStress = Math.max(0.12, Math.min(0.98, zone.base + (integrityFactor * 0.35) + wave));
        
        if (isCriticalActive) {
          // Boost to maximum diagnostic state (88% to 98% range)
          calculatedStress = Math.max(calculatedStress, 0.88 + Math.sin(elapsed * 3 + idx) * 0.08);
        }
      }

      return {
        ...zone,
        stress: calculatedStress,
        locked: isLocked
      };
    });
  }, [hullIntegrity, stepData?.step, criticalModeEnabled, criticalThreshold, lockedDiagnosticNodes, dischargedDiagnosticNodes]);

  // Ping Sector handler: calculates aggregate stress for each quadrant and highlights the peak load sector
  const handlePingSector = useCallback(() => {
    const quadTotals: Record<number, { sum: number; count: number; ids: string[] }> = {
      1: { sum: 0, count: 0, ids: [] },
      2: { sum: 0, count: 0, ids: [] },
      3: { sum: 0, count: 0, ids: [] },
      4: { sum: 0, count: 0, ids: [] }
    };

    computedStressZones.forEach((zone) => {
      const normAngle = ((zone.angle % 360) + 360) % 360;
      const quadNum = Math.floor(normAngle / 90) + 1;
      quadTotals[quadNum].sum += zone.stress;
      quadTotals[quadNum].count += 1;
      quadTotals[quadNum].ids.push(zone.id);
    });

    let topQuadNum = 1;
    let topAvgStress = -1;

    [1, 2, 3, 4].forEach((q) => {
      const count = quadTotals[q].count;
      const avg = count > 0 ? quadTotals[q].sum / count : 0;
      if (avg > topAvgStress) {
        topAvgStress = avg;
        topQuadNum = q;
      }
    });

    const targetIds = quadTotals[topQuadNum].ids;
    const now = Date.now();
    setPingedQuadrant({ quadNum: topQuadNum, maxAvgStress: topAvgStress, time: now });

    // Select all nodes in the peak aggregate stress quadrant for immediate interaction
    setSelectedDiagnosticNodeIds(targetIds);

    addLog('INFO', `Ping Sector: Pinged Quadrant Q${topQuadNum} with peak aggregate stress (${(topAvgStress * 100).toFixed(1)}% load).`);
    showBanner(`📡 SECTOR PING: Quadrant Q${topQuadNum} highlighted — Peak aggregate stress detected (${(topAvgStress * 100).toFixed(1)}% load)!`);
  }, [computedStressZones, addLog, showBanner]);

  // Dynamic Heartbeat System Vitality Configuration
  const heartbeatDetails = useMemo(() => {
    // hullIntegrity ranges from 90.0 to 100.0
    if (hullIntegrity >= 96.0) {
      return {
        bpm: Math.round(60 + (hullIntegrity - 96.0) * 2.5), // ~60 to 70 BPM
        colorClass: 'text-emerald-400',
        glowColor: '#10b981',
        pulseSpeed: '1.2s',
        statusText: 'NOMINAL VITALITY',
        bgClass: 'bg-emerald-500/10 border-emerald-500/20'
      };
    } else if (hullIntegrity >= 93.0) {
      return {
        bpm: Math.round(80 + (96.0 - hullIntegrity) * 6), // ~80 to 98 BPM
        colorClass: 'text-amber-500',
        glowColor: '#f59e0b',
        pulseSpeed: '0.8s',
        statusText: 'STRESSED DEVIATION',
        bgClass: 'bg-amber-500/10 border-amber-500/20'
      };
    } else {
      return {
        bpm: Math.round(110 + (93.0 - hullIntegrity) * 16), // ~110 to 158+ BPM
        colorClass: 'text-red-500',
        glowColor: '#ef4444',
        pulseSpeed: '0.45s',
        statusText: 'CRITICAL INSTABILITY',
        bgClass: 'bg-red-500/10 border-red-500/20 animate-pulse'
      };
    }
  }, [hullIntegrity]);

  // Share Bridge Status handler: copies formatted summary of hull integrity, resonance, & active diagnostic array status
  const handleShareBridgeStatus = useCallback(() => {
    const totalNodes = computedStressZones.length;
    const lockedCount = computedStressZones.filter(z => z.locked).length;
    const highStressCount = computedStressZones.filter(z => z.stress > 0.8).length;
    const avgStress = (computedStressZones.reduce((acc, z) => acc + z.stress, 0) / (totalNodes || 1) * 100).toFixed(1);

    const nodeDetails = computedStressZones
      .map(z => `  • [${z.name}]: ${(z.stress * 100).toFixed(1)}% stress ${z.locked ? '🔒 [LOCKED]' : ''}`)
      .join('\n');

    const summaryText = `================================================
  SOVEREIGN MANIFOL - BRIDGE STATUS REPORT
================================================
Timestamp: ${new Date().toLocaleString()}
Epoch: 842.1 | Vessel Class: Synara FPT-Ω

[VITAL STATS]
• Hull Integrity: ${hullIntegrity.toFixed(1)}% (${hullIntegrity < 50 ? 'CRITICAL' : hullIntegrity < 75 ? 'WARNING' : 'STABLE'})
• Quantum Resonance: ${ledger.resonance.toFixed(2)}% (Target Vitality: ${(ledger.resonance / 100).toFixed(4)})
• Vessel Heartbeat: ${heartbeatDetails.bpm} BPM (${heartbeatDetails.statusText})
• Network Link: ${wsConnected ? 'ONLINE (WebSocket Linked)' : 'DEMO LINKED (Autonomous Stream)'}

[DIAGNOSTIC ARRAY OVERVIEW]
• Monitored Nodes: ${totalNodes}
• Locked Nodes: ${lockedCount} / ${totalNodes}
• High-Strain Nodes (>80%): ${highStressCount}
• Aggregate Strain Load: ${avgStress}%

[ACTIVE DIAGNOSTIC NODE BREAKDOWN]
${nodeDetails}
================================================`;

    navigator.clipboard.writeText(summaryText).then(() => {
      setIsShareCopied(true);
      setTimeout(() => setIsShareCopied(false), 2500);
      addLog('INFO', 'Share Bridge Status: Summary successfully copied to clipboard.');
      showBanner('📋 BRIDGE STATUS COPIED: Full status report copied to clipboard!');
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
      addLog('WARN', 'Share Bridge Status: Failed to copy summary to clipboard.');
      showBanner('⚠️ FAILED TO COPY: Clipboard permission blocked.');
    });
  }, [computedStressZones, hullIntegrity, ledger.resonance, heartbeatDetails, wsConnected, addLog, showBanner]);

  // Batch Lock/Unlock helper functions with confirmation prompt when > 5 nodes selected
  const executeBatchLock = useCallback((nodeIds: string[]) => {
    if (nodeIds.length === 0) return;

    if (nodeIds.length > 5) {
      setBatchConfirmState({
        isOpen: true,
        actionType: 'lock',
        targetNodeIds: nodeIds
      });
    } else {
      setLockedDiagnosticNodes(prev => {
        const next = { ...prev };
        nodeIds.forEach(id => { next[id] = true; });
        return next;
      });
      triggerLockAnimation(nodeIds, true);
      addLog('INFO', `Batch Lock: Locked ${nodeIds.length} diagnostic node(s).`);
      showBanner(`🔒 BATCH LOCK: Successfully locked ${nodeIds.length} node(s)!`);
    }
  }, [triggerLockAnimation, addLog, showBanner]);

  const executeBatchUnlock = useCallback((nodeIds: string[]) => {
    if (nodeIds.length === 0) return;

    if (nodeIds.length > 5) {
      setBatchConfirmState({
        isOpen: true,
        actionType: 'unlock',
        targetNodeIds: nodeIds
      });
    } else {
      setLockedDiagnosticNodes(prev => {
        const next = { ...prev };
        nodeIds.forEach(id => { next[id] = false; });
        return next;
      });
      triggerLockAnimation(nodeIds, false);
      addLog('INFO', `Batch Unlock: Unlocked ${nodeIds.length} diagnostic node(s).`);
      showBanner(`🔓 BATCH UNLOCK: Successfully unlocked ${nodeIds.length} node(s)!`);
    }
  }, [triggerLockAnimation, addLog, showBanner]);

  const handleConfirmBatchAction = useCallback(() => {
    if (!batchConfirmState || !batchConfirmState.targetNodeIds.length) return;
    const { actionType, targetNodeIds } = batchConfirmState;

    if (actionType === 'lock') {
      setLockedDiagnosticNodes(prev => {
        const next = { ...prev };
        targetNodeIds.forEach(id => { next[id] = true; });
        return next;
      });
      triggerLockAnimation(targetNodeIds, true);
      addLog('INFO', `Batch Lock Authorized: Locked ${targetNodeIds.length} diagnostic node(s).`);
      showBanner(`🔒 BATCH LOCK CONFIRMED: Locked ${targetNodeIds.length} node(s)!`);
    } else {
      setLockedDiagnosticNodes(prev => {
        const next = { ...prev };
        targetNodeIds.forEach(id => { next[id] = false; });
        return next;
      });
      triggerLockAnimation(targetNodeIds, false);
      addLog('INFO', `Batch Unlock Authorized: Unlocked ${targetNodeIds.length} diagnostic node(s).`);
      showBanner(`🔓 BATCH UNLOCK CONFIRMED: Unlocked ${targetNodeIds.length} node(s)!`);
    }

    setBatchConfirmState(null);
  }, [batchConfirmState, triggerLockAnimation, addLog, showBanner]);

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

  // Nanite Structural Restoration
  const handleRepair = useCallback(() => {
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
  }, [isRepairing, hullIntegrity, showBanner, addLog]);

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

      // Trigger when Shift+U is pressed (clears all locked nodes in the current selection)
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        const targetNodeIds = selectedDiagnosticNodeIds.length > 0
          ? selectedDiagnosticNodeIds
          : computedStressZones.map(z => z.id);

        const lockedInTarget = targetNodeIds.filter(id => !!lockedDiagnosticNodes[id]);

        if (lockedInTarget.length > 0) {
          executeBatchUnlock(lockedInTarget);
        } else {
          showBanner(`ℹ️ SHIFT+U RECOVERY: No locked nodes found in current selection.`);
        }
      }

      // Trigger when Shift+L is pressed (automatically selects and locks all diagnostic nodes reporting stress > 85%)
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        const highStressNodes = computedStressZones.filter(z => z.stress > 0.85);
        if (highStressNodes.length > 0) {
          const highStressIds = highStressNodes.map(n => n.id);
          setSelectedDiagnosticNodeIds(highStressIds);
          executeBatchLock(highStressIds);
        } else {
          showBanner(`ℹ️ SHIFT+L LOCK: No diagnostic nodes currently exceed 85% stress threshold.`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hullIntegrity, isRepairing, handleRepair, selectedDiagnosticNodeIds, setSelectedDiagnosticNodeIds, computedStressZones, lockedDiagnosticNodes, executeBatchLock, executeBatchUnlock, showBanner]);

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
  const generateClientTrinityViz = (preset: string, customDampStr: string) => {
    const customDamp = customDampStr ? parseFloat(customDampStr) : null;
    
    let stability = 0.88;
    let phases = [0, 1.2, 2.4];
    let amplitudes = [45, 30, 20];
    let frequencies = [1.5, 3.0, 4.5];
    
    if (preset === 'Stable') {
      stability = 0.96;
      amplitudes = [30, 15, 10];
    } else if (preset === 'Responsive') {
      stability = 0.72;
      amplitudes = [60, 45, 35];
    } else if (preset === 'Amplified') {
      stability = 0.61;
      amplitudes = [75, 60, 50];
    }
    
    if (customDamp !== null && !isNaN(customDamp)) {
      stability = Math.min(1.0, Math.max(0.1, stability * customDamp));
    }
    
    const width = 800;
    const height = 400;
    const midY = height / 2;
    
    const generatePath = (amp: number, freq: number, phase: number) => {
      let d = `M 0 ${midY}`;
      for (let x = 0; x <= width; x += 5) {
        const angle = (x / width) * Math.PI * 2 * freq + phase;
        const y = midY + Math.sin(angle) * amp * (1 - (x / width) * 0.4);
        d += ` L ${x} ${y}`;
      }
      return d;
    };
    
    const path1 = generatePath(amplitudes[0], frequencies[0], phases[0]);
    const path2 = generatePath(amplitudes[1], frequencies[1], phases[1]);
    const path3 = generatePath(amplitudes[2], frequencies[2], phases[2]);
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
        <rect width="100%" height="100%" fill="#0a0a0f" />
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <line x1="0" y1="${midY}" x2="${width}" y2="${midY}" stroke="#1a1a2e" stroke-dasharray="5,5" />
        <line x1="${width / 2}" y1="0" x2="${width / 2}" y2="${height}" stroke="#1a1a2e" stroke-dasharray="5,5" />
        <path d="${path1}" fill="none" stroke="#00ffff" stroke-width="3" filter="url(#glow)" opacity="0.85" />
        <path d="${path2}" fill="none" stroke="#bd00ff" stroke-width="2.5" filter="url(#glow)" opacity="0.75" />
        <path d="${path3}" fill="none" stroke="#ffd700" stroke-width="1.5" filter="url(#glow)" opacity="0.65" />
        <text x="20" y="30" fill="#00ffff" font-family="monospace" font-size="12">NEO-CYAN: Stability Wave (Client Fallback)</text>
        <text x="20" y="50" fill="#bd00ff" font-family="monospace" font-size="12">AMETHYST: Response Delta (Client Fallback)</text>
        <text x="20" y="70" fill="#ffd700" font-family="monospace" font-size="12">GOLDEN: Harmonic Overlap (Client Fallback)</text>
      </svg>
    `;
    
    const base64Svg = `data:image/svg+xml;base64,${btoa(svg)}`;
    
    return {
      image: base64Svg,
      trinity_data: {
        ground_state: parseFloat((stability * 1.034).toFixed(4)),
        phase: 0.125,
        stability: parseFloat(stability.toFixed(4))
      }
    };
  };

  const fetchTrinityViz = async (presetName: string, dampVal: string) => {
    try {
      let url = `/api/trinity-viz?preset=${presetName}`;
      if (dampVal) url += `&custom_damp=${dampVal}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTrinityImg(data.image);
        setTrinityData(data.trinity_data);
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }
    } catch (e) {
      console.warn('Failed to load trinity viz from server, generating in-client fallback:', e);
      const fallback = generateClientTrinityViz(presetName, dampVal);
      setTrinityImg(fallback.image);
      setTrinityData(fallback.trinity_data);
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

  // showBanner helper moved to top of file

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

  const exportManifestToPDF = () => {
    if (!activeBriefing.quantities_before || !activeBriefing.quantities_after) {
      showBanner("❌ Error: No manifest data available for export.");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Colors
      const primaryColor = [20, 24, 33]; // Slate dark (#141821 equivalent)
      const accentColor = [245, 158, 11]; // Amber (#F59E0B equivalent)
      const textColor = [51, 65, 85]; // Slate text (#334155 equivalent)

      // Set monospace font for tactical technical feel
      doc.setFont("courier", "normal");

      // Margins & Dimensions (A4: 210 x 297 mm)
      const margin = 15;
      let y = 18;

      // Draw Top Tech Borders
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(1.5);
      doc.line(margin, y, 210 - margin, y); // Thick line
      
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin, y + 2, 210 - margin, y + 2); // Thin guide line
      
      y += 10;

      // Document Title
      doc.setFont("courier", "bold");
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("FPT-OMEGA VESSEL STATUS & TELEMETRY MANIFEST", margin, y);
      
      y += 5;
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("SOVEREIGN MANIFOLD SECURE LOGISTICAL RECORD // EPOCH: 842.1", margin, y);

      y += 8;

      // Metadata Grid Box (Double Column metadata)
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y, 210 - (margin * 2), 24, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, 210 - (margin * 2), 24, "S");

      // Metadata values
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      
      const col1_x = margin + 4;
      const col2_x = 110;
      
      doc.setFont("courier", "bold");
      doc.text("SYSTEM TELEMETRY METADATA", col1_x, y + 5);
      doc.setFont("courier", "normal");
      doc.text(`DATE (UTC):  ${new Date().toISOString().replace('T', ' ').substring(0, 19)}`, col1_x, y + 10);
      doc.text(`COMMANDER:   ${currentUser ? (currentUser.displayName || currentUser.email) : 'STANDALONE OPERATOR'}`, col1_x, y + 15);
      doc.text(`VESSEL ID:   0xFD9A...2A9 // PORT 3000`, col1_x, y + 20);

      doc.setFont("courier", "bold");
      doc.text("INTEGRITY & PROOF SECURE CHECKSUMS", col2_x, y + 5);
      doc.setFont("courier", "normal");
      doc.text(`CONSENSUS:   ${activeBriefing.status}`, col2_x, y + 10);
      doc.text(`SHA-256:     ${activeBriefing.cryptographic_proof.sha256.substring(0, 24)}...`, col2_x, y + 15);
      doc.text(`ANCHOR:      ${activeBriefing.cryptographic_proof.ledger_anchor.substring(0, 24)}...`, col2_x, y + 20);

      y += 32;

      // Section: Vessel Vitality Diagnostics
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("I. CRITICAL VESSEL VITALITY DIAGNOSTICS", margin, y);
      
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, 210 - margin, y);
      y += 6;

      // Draw 3 dashboard panels for stats
      const panelWidth = (210 - (margin * 2) - 8) / 3;
      const drawPanel = (xVal: number, titleVal: string, valueVal: string, subVal: string, valColor = primaryColor) => {
        doc.setFillColor(250, 250, 250);
        doc.rect(xVal, y, panelWidth, 22, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(xVal, y, panelWidth, 22, "S");
        
        // title
        doc.setFont("courier", "bold");
        doc.setFontSize(7);
        doc.setTextColor(120, 130, 140);
        doc.text(titleVal, xVal + 4, y + 5);

        // value
        doc.setFont("courier", "bold");
        doc.setFontSize(11);
        doc.setTextColor(valColor[0], valColor[1], valColor[2]);
        doc.text(valueVal, xVal + 4, y + 12);

        // sub
        doc.setFont("courier", "normal");
        doc.setFontSize(6);
        doc.setTextColor(140, 145, 155);
        doc.text(subVal, xVal + 4, y + 18);
      };

      const hColor = hullIntegrity < 93 ? [239, 68, 68] : hullIntegrity < 96 ? [245, 158, 11] : [16, 185, 129];
      drawPanel(margin, "HULL INTEGRITY VALUE", `${hullIntegrity.toFixed(2)}%`, `Threshold limit: 93.0%`, hColor);
      drawPanel(margin + panelWidth + 4, "SYSTEM RESONANCE LEVEL", `${ledger.resonance.toFixed(2)}%`, `GTC Bal: ${ledger.gtc_balance.toLocaleString()}`, [245, 158, 11]);
      drawPanel(margin + (panelWidth * 2) + 8, "NANITE SYSTEM STATUS", `${cumulativeNanitesDischarged.toLocaleString()}`, `Cycles: ${repairCyclesCount} // Overhaul: ${lastOverhaulCount}`, [6, 182, 212]);

      y += 30;

      // Section: Manifest Quantities
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("II. RESONANCE ADJUSTED ESTIMATION MANIFEST", margin, y);
      
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, 210 - margin, y);
      y += 6;

      // Briefing narrative box
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, 210 - (margin * 2), 16, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, 210 - (margin * 2), 16, "S");
      
      doc.setFont("courier", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("COUNCIL BRIEFING DECISION SUMMARY:", margin + 4, y + 5);

      doc.setFont("courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      // Split text to fit
      const splitNarrative = doc.splitTextToSize(activeBriefing.briefing_narrative, 210 - (margin * 2) - 8);
      doc.text(splitNarrative, margin + 4, y + 10);

      y += 22;

      // Table Headers
      doc.setFillColor(20, 24, 33);
      doc.rect(margin, y, 210 - (margin * 2), 6, "F");
      
      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      
      doc.text("MATERIAL IDENTIFIER SEGMENT", margin + 4, y + 4.5);
      doc.text("RAW EST QTY", 102, y + 4.5, { align: "right" });
      doc.text("RESONANCE ADJ QTY", 145, y + 4.5, { align: "right" });
      doc.text("DRIFT SHIFT", 185, y + 4.5, { align: "right" });
      
      y += 6;

      // Table rows
      const materials = Object.keys(activeBriefing.quantities_before);
      materials.forEach((material, index) => {
        const before = activeBriefing.quantities_before![material];
        const after = activeBriefing.quantities_after![material];
        const variance = after - before;
        const cleanMaterial = material.replace(/_/g, ' ').toUpperCase();

        // Zebra striping
        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, 210 - (margin * 2), 7, "F");
        }
        
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 7, 210 - margin, y + 7);

        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        
        doc.text(cleanMaterial, margin + 4, y + 5);
        doc.text(before.toFixed(2), 102, y + 5, { align: "right" });
        
        doc.setFont("courier", "bold");
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(after.toFixed(2), 145, y + 5, { align: "right" });
        
        doc.setTextColor(16, 185, 129); // green
        doc.text(`+${variance.toFixed(2)}`, 185, y + 5, { align: "right" });

        y += 7;
      });

      y += 10;

      // Verification seal at bottom
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, 210 - margin, y);
      y += 6;

      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("SECURE SIGN-OFF AUTHENTICATION", margin, y);

      y += 5;
      doc.setFont("courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 130, 140);
      doc.text("This manifest is mathematically coupled with the sovereign blockchain network.", margin, y);
      doc.text("Decisions executed from this flight deck maintain persistent compliance checks.", margin, y + 4);

      // Signature line on the right
      const sig_x = 140;
      doc.line(sig_x, y + 10, 210 - margin, y + 10);
      doc.setFont("courier", "bold");
      doc.text("VESSEL COMMANDER SIGNATURE", sig_x, y + 14);

      // Save document
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      doc.save(`vessel_manifest_report_${timestamp}.pdf`);
      showBanner("❇️ Formal PDF Report exported successfully.");
      addLog('SUCCESS', "Generated and downloaded official PDF Vessel Status Report & Telemetry Manifest.");
    } catch (error) {
      console.error("PDF generation error: ", error);
      showBanner("❌ Error: Failed to generate printable PDF report.");
    }
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

    const highStressNodes = computedStressZones.filter(z => z.stress > 0.80);
    const hasMoreThanTwoHighStress = highStressNodes.length > 2;

    const getSvgCoords = (e: React.MouseEvent<SVGSVGElement>) => {
      if (!navigationRingSvgRef.current) return { x: 200, y: 200 };
      const rect = navigationRingSvgRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(400, ((e.clientX - rect.left) / rect.width) * 400));
      const y = Math.max(0, Math.min(400, ((e.clientY - rect.top) / rect.height) * 400));
      return { x, y };
    };

    const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
      const target = e.target as HTMLElement | SVGElement;
      if (target.closest('.pointer-events-auto') || target.closest('button')) return;

      const coords = getSvgCoords(e);
      setIsDraggingSelection(true);
      setDragStartCoords(coords);
      setDragCurrentCoords(coords);
    };

    const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDraggingSelection || !dragStartCoords) return;
      const coords = getSvgCoords(e);
      setDragCurrentCoords(coords);

      const minX = Math.min(dragStartCoords.x, coords.x);
      const maxX = Math.max(dragStartCoords.x, coords.x);
      const minY = Math.min(dragStartCoords.y, coords.y);
      const maxY = Math.max(dragStartCoords.y, coords.y);

      if (maxX - minX > 3 || maxY - minY > 3) {
        const selected: string[] = [];
        computedStressZones.forEach((zone) => {
          const rad = (zone.angle * Math.PI) / 180;
          const rx = r - 15;
          const ry = (r - 15) * Math.cos(tilt);
          const x_rot = rx * Math.cos(rad);
          const y_rot = ry * Math.sin(rad);
          const rotAngle = (23.5 * Math.PI) / 180;
          const x = cx + (x_rot * Math.cos(rotAngle) - y_rot * Math.sin(rotAngle));
          const y = cy + (x_rot * Math.sin(rotAngle) + y_rot * Math.cos(rotAngle));

          if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            selected.push(zone.id);
          }
        });
        setSelectedDiagnosticNodeIds(selected);
      }
    };

    const handleSvgMouseUp = () => {
      if (!isDraggingSelection) return;
      setIsDraggingSelection(false);
      setDragStartCoords(null);
      setDragCurrentCoords(null);
    };

    return (
      <div className="relative w-full h-[360px] select-none">
        <svg 
          ref={navigationRingSvgRef}
          viewBox="0 0 400 400" 
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          className={`w-full h-[360px] bg-[#07070a] rounded-xl border transition-all duration-300 shadow-2xl ${
            isDraggingSelection ? 'cursor-crosshair' : 'cursor-default'
          } ${
            isCriticalActive ? 'border-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.2)]' : 'border-gray-900'
          }`}
        >
        <defs>
          <style>{`
            @keyframes padlockFlickerGlow {
              0% { opacity: 1; filter: drop-shadow(0 0 14px #38bdf8); }
              20% { opacity: 0.2; filter: drop-shadow(0 0 2px #0284c7); }
              40% { opacity: 1; filter: drop-shadow(0 0 18px #38bdf8); }
              60% { opacity: 0.4; filter: drop-shadow(0 0 4px #0284c7); }
              80% { opacity: 1; filter: drop-shadow(0 0 14px #60a5fa); }
              100% { opacity: 1; filter: drop-shadow(0 0 8px #2563eb); }
            }
            @keyframes padlockUnlockFlicker {
              0% { opacity: 1; filter: drop-shadow(0 0 14px #f59e0b); }
              25% { opacity: 0.2; filter: drop-shadow(0 0 2px #d97706); }
              50% { opacity: 1; filter: drop-shadow(0 0 16px #10b981); }
              75% { opacity: 0.4; filter: drop-shadow(0 0 3px #059669); }
              100% { opacity: 0; filter: drop-shadow(0 0 0px transparent); }
            }
            .animate-padlock-flicker {
              animation: padlockFlickerGlow 0.75s ease-in-out 2;
            }
            .animate-padlock-unlock {
              animation: padlockUnlockFlicker 1.4s ease-out forwards;
            }
            @keyframes loadDistributionDash {
              0% { stroke-dashoffset: 40; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes loadGlowPulse {
              0%, 100% { opacity: 0.35; filter: drop-shadow(0 0 2px #f59e0b); }
              50% { opacity: 0.95; filter: drop-shadow(0 0 10px #ef4444); }
            }
            .animate-load-distribution {
              animation: loadDistributionDash 1.2s linear infinite;
            }
            .animate-load-pulse {
              animation: loadGlowPulse 1.8s ease-in-out infinite;
            }
          `}</style>
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

          const correspondingZone = computedStressZones[i] || { id: `N-${i}`, name: `NODE N-${i}`, angle: Math.round((angle * 180) / Math.PI), stress: 0.25 };

          return (
            <g 
              key={`node-${i}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredDiagnosticNode({
                id: correspondingZone.id,
                name: correspondingZone.name,
                angle: correspondingZone.angle,
                stress: correspondingZone.stress,
                x,
                y
              })}
              onMouseLeave={() => setHoveredDiagnosticNode(null)}
            >
              <circle 
                cx={x} 
                cy={y} 
                r={hoveredDiagnosticNode?.id === correspondingZone.id ? "5.5" : "3.5"} 
                fill={correspondingZone.locked ? "#2563eb" : (hoveredDiagnosticNode?.id === correspondingZone.id ? "#f59e0b" : "#316bb0")} 
                opacity="0.9" 
                className="transition-all duration-200"
              />
              <text x={x + 6} y={y + 3} fill={correspondingZone.locked ? "#60a5fa" : (hoveredDiagnosticNode?.id === correspondingZone.id ? "#ffffff" : "#4e657f")} fontFamily="monospace" fontSize="7" className="transition-all duration-200 font-bold">
                {correspondingZone.locked ? '🔒 ' : ''}{correspondingZone.name.split('-')[0].split(' ')[0] || `N-${i}`}
              </text>
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
        {activeStress && (() => {
          // Pre-calculate node coordinates and quadrant assignments (Q1: 0-89°, Q2: 90-179°, Q3: 180-269°, Q4: 270-359°)
          const preparedNodes = computedStressZones.map((zone) => {
            const rad = (zone.angle * Math.PI) / 180;
            const rx = r - 15;
            const ry = (r - 15) * Math.cos(tilt);
            const x_rot = rx * Math.cos(rad);
            const y_rot = ry * Math.sin(rad);
            const rotAngle = (23.5 * Math.PI) / 180;
            const x = cx + (x_rot * Math.cos(rotAngle) - y_rot * Math.sin(rotAngle));
            const y = cy + (x_rot * Math.sin(rotAngle) + y_rot * Math.cos(rotAngle));

            const normAngle = ((zone.angle % 360) + 360) % 360;
            const quadrant = Math.floor(normAngle / 90) + 1; // 1, 2, 3, or 4

            return {
              ...zone,
              x,
              y,
              normAngle,
              quadrant
            };
          });

          const nowSec = Date.now() * 0.001;

          return (
            <g key="quadrant-load-distribution-layer" className="pointer-events-none">
              {[1, 2, 3, 4].map((qNum) => {
                const qNodes = preparedNodes.filter(n => n.quadrant === qNum);
                if (qNodes.length < 2) return null;

                const maxStress = Math.max(...qNodes.map(n => n.stress));
                const avgStress = qNodes.reduce((sum, n) => sum + n.stress, 0) / qNodes.length;

                // High-stress quadrant state check (max stress > 0.50, avg > 0.45, locked nodes, or critical mode)
                const isQuadrantHighStress = maxStress > 0.50 || avgStress > 0.45 || isCriticalActive || qNodes.some(n => n.locked);
                if (!isQuadrantHighStress) return null;

                const quadLabel = `Q${qNum}`;

                return (
                  <g key={`quadrant-load-group-${qNum}`}>
                    {qNodes.map((n1, idx1) => {
                      return qNodes.slice(idx1 + 1).map((n2) => {
                        const pairKey = `q${qNum}-link-${n1.id}-${n2.id}`;

                        // Calculate midpoint and arched bezier control point
                        const mx = (n1.x + n2.x) / 2;
                        const my = (n1.y + n2.y) / 2;
                        const dx = mx - cx;
                        const dy = my - cy;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const offset = 22; // Arc outwards from center for clear visibility
                        const qx = mx + (dx / dist) * offset;
                        const qy = my + (dy / dist) * offset;

                        const pathD = `M ${n1.x} ${n1.y} Q ${qx} ${qy} ${n2.x} ${n2.y}`;

                        // Color scheme based on stress severity
                        const isDanger = maxStress > 0.75 || isCriticalActive;
                        const strokeColor = isDanger ? "#ef4444" : maxStress > 0.60 ? "#f59e0b" : "#38bdf8";
                        const glowColor = isDanger ? "#f87171" : maxStress > 0.60 ? "#fbbf24" : "#0284c7";

                        // Travelling energy pulse particle t along quadratic bezier
                        const speed = 0.5 + maxStress * 0.8;
                        const t = (nowSec * speed) % 1;
                        const px = (1 - t) * (1 - t) * n1.x + 2 * (1 - t) * t * qx + t * t * n2.x;
                        const py = (1 - t) * (1 - t) * n1.y + 2 * (1 - t) * t * qy + t * t * n2.y;

                        return (
                          <g key={pairKey}>
                            {/* Outer glowing underlay path */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke={glowColor}
                              strokeWidth={isDanger ? "4.5" : "3"}
                              opacity={isDanger ? "0.55" : "0.35"}
                              filter="url(#neon)"
                              className="animate-load-pulse"
                            />

                            {/* Inner animated dashed load path */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth={isDanger ? "2.2" : "1.5"}
                              strokeDasharray="6,4"
                              opacity="0.9"
                              className="animate-load-distribution"
                            />

                            {/* Radial vector load-distribution force line to center */}
                            <line
                              x1={qx}
                              y1={qy}
                              x2={cx}
                              y2={cy}
                              stroke={strokeColor}
                              strokeWidth="0.8"
                              strokeDasharray="2,3"
                              opacity="0.35"
                            />

                            {/* Animated travelling load particle */}
                            <circle
                              cx={px}
                              cy={py}
                              r={isDanger ? "4" : "3"}
                              fill="#ffffff"
                              stroke={strokeColor}
                              strokeWidth="1.5"
                              className="animate-pulse"
                            />

                            {/* Structural Load Badge at Arc Control Point */}
                            <g transform={`translate(${qx}, ${qy})`}>
                              <rect
                                x="-25"
                                y="-7.5"
                                width="50"
                                height="13"
                                fill="#050814"
                                stroke={strokeColor}
                                strokeWidth="0.8"
                                rx="3"
                                opacity="0.92"
                              />
                              <text
                                x="0"
                                y="1.5"
                                fill={isDanger ? "#fca5a5" : "#fde68a"}
                                fontFamily="monospace"
                                fontSize="6.5"
                                fontWeight="extrabold"
                                textAnchor="middle"
                              >
                                {quadLabel} LOAD {(avgStress * 100).toFixed(0)}%
                              </text>
                            </g>
                          </g>
                        );
                      });
                    })}
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* Ping Sector Radar Beacon Overlay */}
        {activeStress && pingedQuadrant && (Date.now() - pingedQuadrant.time < 12000) && (() => {
          const qNum = pingedQuadrant.quadNum;
          const midAngle = (qNum - 1) * 90 + 45;
          const midRad = (midAngle * Math.PI) / 180;
          const qx_rot = (r + 15) * Math.cos(midRad);
          const qy_rot = (r + 15) * Math.cos(tilt) * Math.sin(midRad);
          const rotAngle = (23.5 * Math.PI) / 180;
          const qx = cx + (qx_rot * Math.cos(rotAngle) - qy_rot * Math.sin(rotAngle));
          const qy = cy + (qx_rot * Math.sin(rotAngle) + qy_rot * Math.cos(rotAngle));

          return (
            <g key="ping-sector-beacon-overlay" className="pointer-events-none">
              <circle cx={qx} cy={qy} r="42" fill="none" stroke="#f59e0b" strokeWidth="2.5" className="animate-ping" opacity="0.85" />
              <circle cx={qx} cy={qy} r="54" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 4" className="animate-spin duration-[2500ms]" />
              <g transform={`translate(${qx}, ${qy})`}>
                <rect x="-56" y="-12" width="112" height="24" fill="#030712" stroke="#f59e0b" strokeWidth="1.5" rx="4" opacity="0.95" />
                <text x="0" y="4" fill="#fde68a" fontFamily="monospace" fontSize="8.5" fontWeight="extrabold" textAnchor="middle">
                  📡 PING: Q{qNum} ({(pingedQuadrant.maxAvgStress * 100).toFixed(0)}% LOAD)
                </text>
              </g>
            </g>
          );
        })()}

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
          const color = zone.locked ? "#2563eb" : colorScale(zone.stress);
          const isHighStress = zone.stress > 0.75 && !zone.locked;
          const isSelected = selectedDiagnosticNodeIds.includes(zone.id);

          const recentToggle = recentlyToggledLockNodes[zone.id];
          const isRecentlyToggled = recentToggle && (Date.now() - recentToggle.time < 3000);

          const normAngle = ((zone.angle % 360) + 360) % 360;
          const zoneQuadNum = Math.floor(normAngle / 90) + 1;
          const isPingHighlighted = pingedQuadrant && (Date.now() - pingedQuadrant.time < 12000) && (pingedQuadrant.quadNum === zoneQuadNum);

          return (
            <g 
              key={`stress-overlay-${zone.id}`} 
              className="transition-all duration-300 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDiagnosticNodeIds(prev => 
                  prev.includes(zone.id) ? prev.filter(id => id !== zone.id) : [...prev, zone.id]
                );
              }}
              onMouseEnter={() => setHoveredDiagnosticNode({
                id: zone.id,
                name: zone.name,
                angle: zone.angle,
                stress: zone.stress,
                x,
                y
              })}
              onMouseLeave={() => setHoveredDiagnosticNode(null)}
            >
              {/* Dotted link line to Polaris Center */}
              <line 
                x1={cx} 
                y1={cy} 
                x2={x} 
                y2={y} 
                stroke={isSelected ? "#06b6d4" : color} 
                strokeWidth={isSelected ? 2 : (isHighStress ? 1.5 : 0.6)} 
                strokeDasharray="2,3" 
                opacity={isSelected ? 0.95 : (isHighStress ? 0.8 : 0.35)} 
              />

              {/* Selection Ring Highlight */}
              {isSelected && (
                <g pointerEvents="none">
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={32} 
                    fill="none" 
                    stroke="#06b6d4" 
                    strokeWidth="2" 
                    strokeDasharray="4,2" 
                    className="animate-spin duration-[6000ms]" 
                  />
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={20} 
                    fill="rgba(6, 182, 212, 0.25)" 
                    stroke="#38bdf8" 
                    strokeWidth="1.5" 
                  />
                  <text 
                    x={x} 
                    y={y - 20} 
                    fill="#38bdf8" 
                    fontFamily="monospace" 
                    fontSize="7.5" 
                    fontWeight="extrabold" 
                    textAnchor="middle" 
                    stroke="#000" 
                    strokeWidth="1.5" 
                    paintOrder="stroke"
                  >
                    ✓ SELECTED
                  </text>
                </g>
              )}

              {/* Ping Sector Radar Pulse Highlight */}
              {isPingHighlighted && (
                <g pointerEvents="none">
                  <circle cx={x} cy={y} r={34} fill="none" stroke="#f59e0b" strokeWidth="2.5" className="animate-ping" opacity="0.9" />
                  <circle cx={x} cy={y} r={42} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" className="animate-spin duration-[3000ms]" />
                  <text 
                    x={x} 
                    y={y + 30} 
                    fill="#fde68a" 
                    fontFamily="monospace" 
                    fontSize="7" 
                    fontWeight="extrabold" 
                    textAnchor="middle" 
                    stroke="#000" 
                    strokeWidth="1.5" 
                    paintOrder="stroke"
                  >
                    📡 HIGHEST STRESS
                  </text>
                </g>
              )}
              
              {/* Persistent Dimmed Lock Overlay for Locked Nodes (visualizes locked state even when unselected) */}
              {zone.locked && (
                <g pointerEvents="none" className="transition-opacity duration-300">
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={26} 
                    fill="rgba(15, 23, 42, 0.75)" 
                    stroke="#2563eb" 
                    strokeWidth={isSelected ? "1.8" : "1.2"} 
                    strokeDasharray="3 2" 
                    opacity={isSelected ? 0.6 : 0.95} 
                  />
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={18} 
                    fill="rgba(30, 58, 138, 0.40)" 
                    stroke="#60a5fa" 
                    strokeWidth="0.8" 
                    opacity={isSelected ? 0.5 : 0.85} 
                  />
                  {!isSelected && (
                    <g transform={`translate(${x}, ${y - 22})`}>
                      <rect 
                        x="-30" 
                        y="-8" 
                        width="60" 
                        height="12" 
                        fill="#030712" 
                        stroke="#3b82f6" 
                        strokeWidth="0.8" 
                        rx="3" 
                        opacity="0.9" 
                      />
                      <text 
                        x="0" 
                        y="1" 
                        fill="#93c5fd" 
                        fontFamily="monospace" 
                        fontSize="6" 
                        fontWeight="extrabold" 
                        textAnchor="middle"
                      >
                        🔒 LOCKED
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* Heat glow circles */}
              <circle 
                cx={x} 
                cy={y} 
                r={isHighStress ? 28 : 22} 
                fill={isSelected ? "#06b6d4" : color} 
                opacity={isSelected ? 0.45 : (isHighStress ? 0.35 : 0.16)} 
                filter="url(#neon)" 
              />
              <circle 
                cx={x} 
                cy={y} 
                r={14} 
                fill={isSelected ? "#0284c7" : color} 
                opacity="0.55" 
              />
              <circle 
                cx={x} 
                cy={y} 
                r={6} 
                fill="#ffffff" 
                opacity={0.9} 
                stroke={isSelected ? "#38bdf8" : color}
                strokeWidth={1.5}
              />

              {/* High stress warning pulse */}
              {isHighStress && !isSelected && (
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
                fill={isSelected ? "#38bdf8" : (isHighStress ? (isCriticalActive ? "#f87171" : "#fca5a5") : "#e2e8f0")} 
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
                fill={isSelected ? "#e0f2fe" : "#94a3b8"} 
                fontFamily="monospace" 
                fontSize="6" 
                textAnchor="middle"
                stroke="#000"
                strokeWidth="1"
                paintOrder="stroke"
              >
                {zone.name}
              </text>

              {/* Padlock status indicator & animated lock/unlock confirmation */}
              {zone.locked ? (
                <g pointerEvents="none" className={isRecentlyToggled && recentToggle?.locked ? "animate-padlock-flicker" : ""}>
                  {isRecentlyToggled && recentToggle?.locked && (
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={28} 
                      fill="none" 
                      stroke="#38bdf8" 
                      strokeWidth="2.5" 
                      className="animate-ping" 
                      opacity="0.85" 
                    />
                  )}
                  <rect 
                    x={x - 20} 
                    y={y + 16} 
                    width="40" 
                    height="12" 
                    fill={isRecentlyToggled ? "#071c3d" : "#0f172a"} 
                    stroke={isRecentlyToggled ? "#38bdf8" : "#3b82f6"} 
                    strokeWidth={isRecentlyToggled ? "1.5" : "0.8"} 
                    rx="3" 
                  />
                  <text 
                    x={x} 
                    y={y + 24.5} 
                    fill={isRecentlyToggled ? "#7dd3fc" : "#60a5fa"} 
                    fontFamily="monospace" 
                    fontSize="6.5" 
                    fontWeight="bold" 
                    textAnchor="middle"
                  >
                    🔒 LOCKED
                  </text>
                </g>
              ) : (
                isRecentlyToggled && !recentToggle?.locked && (
                  <g pointerEvents="none" className="animate-padlock-unlock">
                    <circle 
                      cx={x} 
                      cy={y} 
                      r={24} 
                      fill="none" 
                      stroke="#f59e0b" 
                      strokeWidth="2" 
                      strokeDasharray="4,2" 
                      className="animate-spin duration-[2000ms]" 
                    />
                    <rect 
                      x={x - 22} 
                      y={y + 16} 
                      width="44" 
                      height="12" 
                      fill="#1c1308" 
                      stroke="#f59e0b" 
                      strokeWidth="1.2" 
                      rx="3" 
                    />
                    <text 
                      x={x} 
                      y={y + 24.5} 
                      fill="#fbbf24" 
                      fontFamily="monospace" 
                      fontSize="6.5" 
                      fontWeight="extrabold" 
                      textAnchor="middle"
                    >
                      🔓 UNLOCKED
                    </text>
                  </g>
                )
              )}
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

        {/* Selection Drag Marquee Rectangle */}
        {isDraggingSelection && dragStartCoords && dragCurrentCoords && (() => {
          const minX = Math.min(dragStartCoords.x, dragCurrentCoords.x);
          const maxX = Math.max(dragStartCoords.x, dragCurrentCoords.x);
          const minY = Math.min(dragStartCoords.y, dragCurrentCoords.y);
          const maxY = Math.max(dragStartCoords.y, dragCurrentCoords.y);
          const width = maxX - minX;
          const height = maxY - minY;

          if (width < 3 && height < 3) return null;

          return (
            <g className="pointer-events-none select-none">
              <rect
                x={minX}
                y={minY}
                width={width}
                height={height}
                fill="rgba(6, 182, 212, 0.15)"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="4,3"
                rx="4"
              />
              <rect
                x={minX}
                y={minY > 18 ? minY - 16 : minY + 2}
                width="120"
                height="14"
                fill="#030712"
                stroke="#06b6d4"
                strokeWidth="0.8"
                rx="2"
                opacity="0.95"
              />
              <text
                x={minX + 4}
                y={(minY > 18 ? minY - 16 : minY + 2) + 10}
                fill="#06b6d4"
                fontFamily="monospace"
                fontSize="7.5"
                fontWeight="bold"
              >
                🎯 SELECTING ({selectedDiagnosticNodeIds.length} NODES)
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Batch Selection HUD Overlay */}
      {selectedDiagnosticNodeIds.length > 0 ? (
        <div className="absolute top-3 left-3 z-40 bg-slate-950/95 border border-cyan-500/50 p-2.5 rounded-md shadow-[0_0_20px_rgba(6,182,212,0.25)] font-mono text-[9px] text-slate-200 w-[210px] flex flex-col gap-2 transition-all duration-200">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1.5">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider">
              <span className="text-xs">🎯</span>
              <span>{selectedDiagnosticNodeIds.length} Nodes Selected</span>
            </div>
            <button
              onClick={() => setSelectedDiagnosticNodeIds([])}
              className="text-[8px] text-slate-400 hover:text-white uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 cursor-pointer"
              title="Deselect All"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-1 text-[8px]">
            <button
              onClick={() => setSelectedDiagnosticNodeIds(computedStressZones.map(z => z.id))}
              className="flex-1 py-1 px-1 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 rounded cursor-pointer font-bold uppercase text-center"
            >
              All (8)
            </button>
            <button
              onClick={handlePingSector}
              className="flex-1 py-1 px-1 bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 rounded cursor-pointer font-bold uppercase text-center flex items-center justify-center gap-1"
              title="Ping sector with peak aggregate stress"
            >
              <Radio className="w-2.5 h-2.5 text-amber-400" />
              <span>Ping</span>
            </button>
            <button
              onClick={() => setSelectedDiagnosticNodeIds([])}
              className="flex-1 py-1 px-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded cursor-pointer font-bold uppercase text-center"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => executeBatchLock(selectedDiagnosticNodeIds)}
              className="py-1.5 px-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40 rounded-sm font-bold uppercase text-[8px] tracking-wider cursor-pointer flex items-center justify-center gap-1 transition-all"
              title="Lock selected nodes (Prompts confirmation if >5 nodes; Shortcut Shift+L)"
            >
              <Lock className="w-2.5 h-2.5 text-blue-400" />
              <span>Lock (Shift+L)</span>
            </button>

            <button
              onClick={() => executeBatchUnlock(selectedDiagnosticNodeIds)}
              className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-sm font-bold uppercase text-[8px] tracking-wider cursor-pointer flex items-center justify-center gap-1 transition-all"
              title="Unlock selected nodes (Prompts confirmation if >5 nodes; Shortcut Shift+U)"
            >
              <Unlock className="w-2.5 h-2.5 text-slate-300" />
              <span>Unlock (Shift+U)</span>
            </button>
          </div>

          <button
            onClick={() => {
              const unlockedSelected = computedStressZones.filter(z => selectedDiagnosticNodeIds.includes(z.id) && !z.locked);
              if (unlockedSelected.length > 0) {
                const overrides: Record<string, number> = {};
                unlockedSelected.forEach(node => {
                  overrides[node.id] = 0.10;
                  addLog('REPAIR', `Quick Reset Surge: Instantly discharged nanites to segment ${node.name} (reset to 10% nominal baseline).`);
                });
                setDischargedDiagnosticNodes(prev => ({ ...prev, ...overrides }));
                setCumulativeNanitesDischarged(prev => prev + 250 * unlockedSelected.length);
                showBanner(`⚡ QUICK RESET: Instantly discharged nanite surge to ${unlockedSelected.length} selected nodes!`);
              } else {
                showBanner(`⚠️ QUICK RESET BLOCKED: All selected nodes are locked!`);
              }
            }}
            className="w-full py-1.5 px-2 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 hover:text-white border border-emerald-500/40 rounded-sm font-bold uppercase text-[8px] tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm"
            title="Instantly discharge nanites to all selected unlocked nodes, bypassing individual interaction"
          >
            <RotateCcw className="w-3 h-3 text-emerald-400 animate-spin duration-[4000ms]" />
            <span>Quick Reset ({computedStressZones.filter(z => selectedDiagnosticNodeIds.includes(z.id) && !z.locked).length} Nodes)</span>
          </button>

          <button
            onClick={() => {
              const unlockedSelected = computedStressZones.filter(z => selectedDiagnosticNodeIds.includes(z.id) && !z.locked);
              if (unlockedSelected.length > 0) {
                const overrides: Record<string, number> = {};
                unlockedSelected.forEach(node => {
                  overrides[node.id] = 0.15;
                  addLog('REPAIR', `Batch Nanite Discharge: Fully discharged segment ${node.name} to 15%.`);
                });
                setDischargedDiagnosticNodes(prev => ({ ...prev, ...overrides }));
                setCumulativeNanitesDischarged(prev => prev + 150 * unlockedSelected.length);
                showBanner(`⚡ BATCH DISCHARGE: Stabilized ${unlockedSelected.length} selected nodes!`);
              } else {
                showBanner(`⚠️ BATCH DISCHARGE BLOCKED: All selected nodes are locked!`);
              }
            }}
            className="w-full py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 hover:text-white border border-amber-500/40 rounded-sm font-bold uppercase text-[8px] tracking-wider cursor-pointer flex items-center justify-center gap-1 transition-all shadow-sm"
          >
            <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>Discharge ({computedStressZones.filter(z => selectedDiagnosticNodeIds.includes(z.id) && !z.locked).length})</span>
          </button>
        </div>
      ) : (
        <div className="absolute top-3 left-3 z-30 flex flex-col gap-1.5 items-start">
          <div className="bg-slate-950/85 border border-cyan-500/30 px-2 py-1.5 rounded shadow text-[8px] font-mono text-cyan-300 flex items-center gap-1.5 select-none pointer-events-none">
            <span className="animate-pulse">🎯</span>
            <span>Click & drag on ring to select multiple nodes</span>
          </div>
          <button
            onClick={handlePingSector}
            className="bg-slate-950/90 hover:bg-amber-950/80 active:bg-amber-900/90 border border-amber-500/40 hover:border-amber-500/70 text-amber-300 hover:text-white px-2 py-1 rounded shadow-lg text-[8px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all select-none"
            title="Ping Navigation Ring to temporarily highlight quadrant with highest aggregate stress"
          >
            <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>Ping Sector</span>
          </button>
        </div>
      )}

      {/* Dynamic Interactive Tooltip Overlay */}
      {hoveredDiagnosticNode && (() => {
        const activeZone = computedStressZones.find(z => z.id === hoveredDiagnosticNode.id);
        const activeStress = activeZone ? activeZone.stress : hoveredDiagnosticNode.stress;
        const isLocked = activeZone ? !!activeZone.locked : !!lockedDiagnosticNodes[hoveredDiagnosticNode.id];

        // Calculate quadrant (Q1: 0-89°, Q2: 90-179°, Q3: 180-269°, Q4: 270-359°)
        const angle = ((hoveredDiagnosticNode.angle % 360) + 360) % 360;
        const quadNum = Math.floor(angle / 90) + 1;
        const quadName = `Q${quadNum}`;
        const quadrantMinAngle = (quadNum - 1) * 90;
        const quadrantMaxAngle = quadNum * 90 - 1;
        const quadrantNodes = computedStressZones.filter(z => {
          const a = ((z.angle % 360) + 360) % 360;
          return a >= quadrantMinAngle && a <= quadrantMaxAngle;
        });

        // Sparkline history data (5 readings)
        const sparklineReadings = [
          Math.max(0.05, Math.min(0.98, activeStress * 0.82)),
          Math.max(0.05, Math.min(0.98, activeStress * 0.89)),
          Math.max(0.05, Math.min(0.98, activeStress * 0.94)),
          Math.max(0.05, Math.min(0.98, activeStress * 0.98)),
          activeStress
        ];
        const isRising = sparklineReadings[4] >= sparklineReadings[0];

        // Priority level calculation
        const priorityLabel = activeStress > 0.75 ? 'HIGH' : activeStress > 0.45 ? 'MEDIUM' : 'LOW';
        const priorityClass = activeStress > 0.75 
          ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse font-extrabold' 
          : activeStress > 0.45 
          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold' 
          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold';

        return (
          <div 
            className="absolute z-50 bg-slate-950/95 border border-amber-500/30 p-3 rounded-md shadow-[0_0_20px_rgba(245,158,11,0.25)] text-xs font-mono text-slate-300 w-56 pointer-events-auto transition-all duration-200"
            style={{
              left: `${(hoveredDiagnosticNode.x / 400) * 100}%`,
              top: `${(hoveredDiagnosticNode.y / 400) * 100}%`,
              transform: 'translate(-50%, -108%)',
            }}
            onMouseEnter={() => setHoveredDiagnosticNode(hoveredDiagnosticNode)}
            onMouseLeave={() => setHoveredDiagnosticNode(null)}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
              <span className={`font-bold text-[9px] tracking-wider uppercase flex items-center gap-1 ${isLocked ? 'text-blue-400' : 'text-amber-400'}`}>
                {isLocked ? '🔒' : '⚙️'} {hoveredDiagnosticNode.name}
              </span>
              <span className="text-[8px] text-slate-500">θ: {hoveredDiagnosticNode.angle}° ({quadName})</span>
            </div>
            
            <div className="space-y-1 mb-2">
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-400 uppercase">Current Stress:</span>
                <span className={`font-bold ${isLocked ? 'text-blue-400' : activeStress > 0.75 ? 'text-red-400 animate-pulse font-extrabold' : 'text-emerald-400'}`}>
                  {(activeStress * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-400 uppercase">System Status:</span>
                <span className={`font-bold ${isLocked ? 'text-blue-400 font-semibold' : activeStress > 0.75 ? 'text-red-400 font-extrabold animate-pulse' : 'text-emerald-400'}`}>
                  {isLocked ? 'LOCKED' : activeStress > 0.75 ? '⚠️ DANGER' : '✓ STABLE'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[9px] pt-0.5">
                <span className="text-slate-400 uppercase">Urgency Rating:</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase border ${priorityClass}`}>
                  Priority: {priorityLabel}
                </span>
              </div>
            </div>

            {/* 5-Reading Stress Sparkline */}
            <div className="my-2 p-1.5 bg-slate-900/90 rounded border border-white/10">
              <div className="flex justify-between items-center text-[7.5px] text-slate-400 mb-1">
                <span>STRESS SPARKLINE (5 READINGS)</span>
                <span className={`font-bold ${isRising ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {isRising ? '▲ RISING' : '▼ STABLE'}
                </span>
              </div>
              <svg viewBox="0 0 100 20" className="w-full h-5 overflow-visible">
                <polyline
                  fill="none"
                  stroke={isLocked ? '#60a5fa' : activeStress > 0.75 ? '#f87171' : '#34d399'}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparklineReadings.map((val, idx) => `${idx * 25},${20 - val * 18}`).join(' ')}
                />
                {sparklineReadings.map((val, idx) => (
                  <circle
                    key={idx}
                    cx={idx * 25}
                    cy={20 - val * 18}
                    r={idx === 4 ? 2.5 : 1.5}
                    fill={idx === 4 ? '#ffffff' : (isLocked ? '#60a5fa' : activeStress > 0.75 ? '#f87171' : '#34d399')}
                  />
                ))}
              </svg>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const nextLockedState = !isLocked;
                  setLockedDiagnosticNodes(prev => ({
                    ...prev,
                    [hoveredDiagnosticNode.id]: nextLockedState
                  }));
                  triggerLockAnimation([hoveredDiagnosticNode.id], nextLockedState);
                  addLog('INFO', `Diagnostic node ${hoveredDiagnosticNode.name} has been ${nextLockedState ? 'LOCKED' : 'UNLOCKED'} for structural monitoring.`);
                }}
                className={`w-full py-1.5 px-2 rounded-sm text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1 border ${
                  isLocked 
                    ? 'bg-blue-600/20 hover:bg-blue-600/35 border-blue-500/40 text-blue-300 hover:text-white' 
                    : 'bg-slate-900/80 hover:bg-slate-800 border-white/15 text-slate-300 hover:text-white'
                }`}
              >
                {isLocked ? <Unlock className="w-2.5 h-2.5 text-blue-400" /> : <Lock className="w-2.5 h-2.5 text-slate-400" />}
                <span>{isLocked ? 'Unlock Node' : 'Lock Node'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLocked) return;
                  addLog('REPAIR', `Injected localized nanites to Segment ${hoveredDiagnosticNode.name} at Vector θ: ${hoveredDiagnosticNode.angle}°. Discharging structural pressure.`);
                  showBanner(`⚡ NANITE STABILIZER: Discharged Segment ${hoveredDiagnosticNode.name} (Pressure: ${(activeStress*100).toFixed(0)}% ➔ 15%)`);
                  setCumulativeNanitesDischarged(prev => prev + 150);
                  setDischargedDiagnosticNodes(prev => ({ ...prev, [hoveredDiagnosticNode.id]: 0.15 }));
                }}
                disabled={isLocked}
                className={`w-full py-1.5 px-2 rounded-sm text-[8px] font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1 border ${
                  isLocked
                    ? 'bg-slate-850/40 text-slate-500 border-white/5 cursor-not-allowed opacity-40'
                    : 'bg-amber-500/10 hover:bg-amber-500/25 active:bg-amber-500/45 text-amber-300 hover:text-white border border-amber-500/30 hover:border-amber-500/60 cursor-pointer'
                }`}
              >
                <Wrench className="w-2.5 h-2.5 text-amber-400" />
                <span>{isLocked ? 'Discharge Prevented' : 'Discharge Nanites'}</span>
              </button>

              {/* Full Quadrant Reset with Confirmation Dialog */}
              {quadrantConfirmNodeId === hoveredDiagnosticNode.id ? (
                <div className="p-1.5 bg-red-950/80 border border-red-500/50 rounded flex flex-col gap-1 text-[8px]">
                  <span className="text-red-200 font-bold text-center uppercase">
                    ⚠️ Reset all nodes in {quadName} ({quadrantNodes.length} nodes)?
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const overrides: Record<string, number> = {};
                        quadrantNodes.forEach(node => {
                          overrides[node.id] = 0.15;
                        });
                        setDischargedDiagnosticNodes(prev => ({ ...prev, ...overrides }));
                        setQuadrantConfirmNodeId(null);
                        addLog('REPAIR', `Full Quadrant Reset: Reset all stress data for ${quadrantNodes.length} nodes in Quadrant ${quadName}.`);
                        showBanner(`♻️ QUADRANT RESET: Cleared stress data for all nodes in ${quadName}!`);
                      }}
                      className="flex-1 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded uppercase text-[7.5px] cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuadrantConfirmNodeId(null);
                      }}
                      className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded uppercase text-[7.5px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuadrantConfirmNodeId(hoveredDiagnosticNode.id);
                  }}
                  className="w-full py-1.5 px-2 bg-purple-600/20 hover:bg-purple-600/35 text-purple-300 hover:text-white border border-purple-500/30 rounded-sm font-bold uppercase text-[8px] tracking-wider cursor-pointer flex items-center justify-center gap-1 transition-all"
                >
                  <RotateCcw className="w-2.5 h-2.5 text-purple-400" />
                  <span>Full Quadrant Reset ({quadName})</span>
                </button>
              )}

              {/* Batch Disconnect All button when batch selections are active */}
              {selectedDiagnosticNodeIds.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const count = selectedDiagnosticNodeIds.length;
                    setSelectedDiagnosticNodeIds([]);
                    addLog('INFO', `Batch Disconnect: Removed all ${count} active batch node selections.`);
                    showBanner(`🔌 BATCH DISCONNECT: Deselected ${count} nodes.`);
                  }}
                  className="w-full py-1.5 px-2 bg-rose-600/20 hover:bg-rose-600/35 text-rose-200 hover:text-white border border-rose-500/40 rounded-sm font-bold uppercase text-[8px] tracking-wider cursor-pointer flex items-center justify-center gap-1 transition-all shadow-sm"
                >
                  <Unlink className="w-2.5 h-2.5 text-rose-400" />
                  <span>Batch Disconnect All ({selectedDiagnosticNodeIds.length})</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Mass Discharge Alert Overlay */}
      {hasMoreThanTwoHighStress && (
        <div className="absolute top-3 right-3 z-40 bg-slate-950/95 border border-red-500/40 p-2.5 rounded-md shadow-[0_0_15px_rgba(239,68,68,0.25)] font-mono text-[9px] text-slate-300 max-w-[190px] flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-red-400 font-bold uppercase tracking-wider animate-pulse">
            <span className="text-xs">⚠️</span>
            <span>Strain Overflow</span>
          </div>
          <p className="text-[8px] text-slate-400 leading-normal uppercase">
            {highStressNodes.length} sections exceeding critical 80% stress threshold.
          </p>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => {
                const highStressIds = highStressNodes.map(n => n.id);
                executeBatchLock(highStressIds);
              }}
              className="w-full py-1.5 px-2 bg-blue-600/20 hover:bg-blue-600/40 active:bg-blue-600/60 text-blue-200 hover:text-white border border-blue-500/40 hover:border-blue-500/60 rounded-sm font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1"
            >
              <Lock className="w-2.5 h-2.5 text-blue-400" />
              <span>Lock All Nodes ({highStressNodes.length})</span>
            </button>

            <button
              onClick={() => {
                const nodesToDischarge = computedStressZones.filter(z => z.stress > 0.8 && !z.locked);
                if (nodesToDischarge.length > 0) {
                  const overrides: Record<string, number> = {};
                  nodesToDischarge.forEach(node => {
                    overrides[node.id] = 0.15;
                    addLog('REPAIR', `Mass Nanite Discharge: Fully discharged critical segment ${node.name} to 15%.`);
                  });
                  setDischargedDiagnosticNodes(prev => ({ ...prev, ...overrides }));
                  setCumulativeNanitesDischarged(prev => prev + 150 * nodesToDischarge.length);
                  showBanner(`⚡ MASS DISCHARGE: Simultaneously stabilized ${nodesToDischarge.length} segments!`);
                } else {
                  showBanner(`⚠️ MASS DISCHARGE BLOCKED: All critical segments are locked!`);
                }
              }}
              className="w-full py-1.5 px-2 bg-red-600/20 hover:bg-red-600/40 active:bg-red-600/60 text-red-200 hover:text-white border border-red-500/40 hover:border-red-500/60 rounded-sm font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1"
            >
              <Zap className="w-3 h-3 text-red-400 animate-bounce" />
              <span>Mass Discharge</span>
            </button>
          </div>
        </div>
      )}
    </div>
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

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] tracking-widest uppercase opacity-80 font-mono">
            {/* Live Vitality Heartbeat Indicator */}
            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-sm border ${heartbeatDetails.bgClass} transition-all duration-300 shadow-md`}>
              <div className="relative flex items-center justify-center w-5 h-5">
                <span 
                  className="absolute h-4 w-4 rounded-full opacity-60 animate-ping"
                  style={{ 
                    animationDuration: heartbeatDetails.pulseSpeed,
                    backgroundColor: heartbeatDetails.glowColor
                  }}
                />
                <Activity 
                  className={`w-4 h-4 ${heartbeatDetails.colorClass} animate-vessel-heartbeat relative z-10`}
                  style={{
                    filter: `drop-shadow(0 0 5px ${heartbeatDetails.glowColor})`,
                    '--pulse-speed': heartbeatDetails.pulseSpeed
                  } as CSSProperties}
                />
              </div>
              <div className="flex flex-col select-none leading-tight font-mono text-[9px]">
                <span className="text-slate-500 font-bold uppercase text-[7px] tracking-wider">VESSEL HEARTBEAT</span>
                <span className={`${heartbeatDetails.colorClass} font-bold tracking-widest flex items-center gap-1.5`}>
                  {heartbeatDetails.bpm} BPM <span className="text-slate-700 font-normal">|</span> {heartbeatDetails.statusText}
                </span>
              </div>
              {/* Dynamic Micro EKG Grid Waveform */}
              <div className="hidden xl:block w-14 h-5 border-l border-white/10 pl-2 overflow-hidden">
                <svg className="w-full h-full text-slate-800" viewBox="0 0 60 20" fill="none">
                  <path 
                    d="M 0 10 L 15 10 L 18 2 L 21 18 L 24 10 L 30 10 L 33 5 L 36 15 L 39 10 L 60 10" 
                    stroke="currentColor" 
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${heartbeatDetails.colorClass} animate-ekg-sweep`}
                    style={{
                      strokeDasharray: '120',
                      strokeDashoffset: '120',
                      filter: `drop-shadow(0 0 2px ${heartbeatDetails.glowColor})`,
                      '--pulse-speed': heartbeatDetails.pulseSpeed
                    } as CSSProperties}
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
              Network: {wsConnected ? 'ONLINE' : 'DEMO LINKED'}
            </div>
            <div className="flex items-center text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
              Epoch: 842.1
            </div>
            <div className="text-slate-400 mr-2">
              ID: 0xFD...2A9 // Port 3000
            </div>
            
            {/* Firebase Sync Indicator */}
            <div className="flex items-center border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 md:pl-6 gap-3">
              {isFirebaseLoading ? (
                <div className="flex items-center text-slate-500 gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  Firebase: Syncing...
                </div>
              ) : currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center text-emerald-400 gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Cloud Backup: Active ({currentUser.displayName || currentUser.email})
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="text-[8px] text-slate-500 hover:text-red-400 border border-slate-500/20 hover:border-red-400/30 px-1.5 py-0.5 rounded transition-all duration-200 cursor-pointer uppercase font-semibold"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center text-slate-500 gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                    Cloud Sync: Offline
                  </div>
                  <button 
                    onClick={handleGoogleSignIn}
                    className="text-[8.5px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded transition-all duration-200 cursor-pointer uppercase font-bold flex items-center gap-1.5 hover:shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                  >
                    <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                    Connect Google Cloud
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Unified Controls & Tab Selector */}
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsWorkspaceOpen(true)}
                className="px-3 py-2 rounded-sm bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5 font-mono text-xs uppercase font-bold tracking-wider"
                title="Open Google Workspace Deck (Drive, Sheets, Gmail, Docs)"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Workspace Deck</span>
              </button>

              <button
                onClick={handleShareBridgeStatus}
                className="px-3 py-2 rounded-sm bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5 font-mono text-xs uppercase font-bold tracking-wider"
                title="Copy current hull integrity, resonance levels, and active diagnostic status summary to clipboard"
              >
                {isShareCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Share Bridge Status</span>
                  </>
                )}
              </button>

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
            </div>
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase mr-1">Shortcuts: Ctrl+T (Toggle View) | Shift+R (Manual Repair) | Shift+L (Lock Critical) | Shift+U (Unlock Selection)</span>
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
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono tracking-widest text-amber-500/60 uppercase hidden lg:inline">Ethics and Sustainability Fused</span>
                  <button
                    onClick={exportManifestToCSV}
                    className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-sm font-mono text-[9px] sm:text-[10px] uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-all duration-300"
                    title="Export Manifest as CSV"
                  >
                    <Download className="w-3 h-3" />
                    CSV
                  </button>
                  <button
                    onClick={exportManifestToPDF}
                    className="px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-sm font-mono text-[9px] sm:text-[10px] uppercase tracking-widest flex items-center gap-1.5 cursor-pointer transition-all duration-300"
                    title="Export Full Status Report & Manifest as PDF"
                  >
                    <FileText className="w-3 h-3" />
                    Export Report (PDF)
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
                        onClick={() => setIsOverhaulConfirmOpen(true)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <button
                      onClick={handlePingSector}
                      className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/35 active:bg-amber-500/50 text-amber-300 hover:text-white border border-amber-500/40 hover:border-amber-500/70 rounded-sm font-mono text-[9px] uppercase tracking-wider cursor-pointer transition-all shadow-sm select-none"
                      title="Ping Navigation Ring to temporarily highlight quadrant with highest aggregate stress"
                    >
                      <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                      <span>Ping Sector</span>
                    </button>
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
                    onClick={() => setIsClearLogsConfirmOpen(true)}
                    className="text-[9px] px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-sm tracking-wider uppercase transition-all cursor-pointer"
                  >
                    Clear Logs
                  </button>

                  <div className="relative group">
                    <button
                      className="text-[9px] px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-sm tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1"
                      title="Download Filtered Logs"
                    >
                      <Download className="w-3 h-3" />
                      Download Logs
                    </button>
                    <div className="absolute right-0 mt-1 w-28 bg-slate-950 border border-white/10 rounded-sm shadow-xl hidden group-hover:block z-50 font-mono text-[9px]">
                      <button
                        onClick={downloadLogsAsTXT}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-white/5 text-slate-300 hover:text-white transition-colors cursor-pointer uppercase border-b border-white/5"
                      >
                        TXT Format
                      </button>
                      <button
                        onClick={downloadLogsAsJSON}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-white/5 text-slate-300 hover:text-white transition-colors cursor-pointer uppercase"
                      >
                        JSON Format
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowTerminalSettings(prev => !prev)}
                    className={`text-[9px] px-2.5 py-1 rounded-sm tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 border ${
                      showTerminalSettings 
                        ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.1)]' 
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400 hover:text-white'
                    }`}
                    title="Configure Terminal Log Buffer & Settings"
                  >
                    <Settings className={`w-3 h-3 ${showTerminalSettings ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
                    Settings
                  </button>
                </div>
              </div>

              {/* Terminal Settings Panel (Unfolds on toggle) */}
              {showTerminalSettings && (
                <div className="p-3 mb-3 bg-slate-950/90 border border-amber-500/20 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-amber-500/10 text-amber-500">
                      <Settings className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p className="text-white font-bold uppercase tracking-wider text-[9px]">Terminal Buffer Configuration</p>
                      <p className="text-slate-500 text-[8px]">Optimize UI rendering loop and memory buffers</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 animate-fadeIn">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={autoPurge}
                          onChange={(e) => {
                            setAutoPurge(e.target.checked);
                            addLog('INFO', `Log auto-purge ${e.target.checked ? 'ENABLED (Limit: 50)' : 'DISABLED (Limit: 100)'}.`);
                          }}
                          className="sr-only"
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors duration-200 relative ${autoPurge ? 'bg-amber-500' : 'bg-slate-800'}`}>
                          <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-black transition-transform duration-200 ${autoPurge ? 'transform translate-x-4' : ''}`} />
                        </div>
                      </div>
                      <span className="text-slate-300 font-bold tracking-wider text-[9px] uppercase">
                        AUTO-PURGE (&gt;50 LOGS)
                      </span>
                    </label>
                    <span className="text-slate-600">|</span>
                    <span className={`text-[8px] px-1.5 py-0.5 font-bold tracking-wider rounded uppercase ${autoPurge ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-900 text-slate-500 border border-white/5'}`}>
                      {autoPurge ? 'Performance Mode' : 'Standard Mode'}
                    </span>
                  </div>
                </div>
              )}

              {/* Vessel Status Summary (Last 60 Minutes) */}
              <div className="mb-4 bg-slate-950/60 border border-white/5 p-3.5 rounded-sm">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-300 tracking-[0.15em] uppercase">Vessel Status Summary (Last 60 Minutes)</span>
                  <div className="h-[1px] flex-1 bg-white/5 ml-2" />
                  <span className="text-[8px] text-slate-500 font-mono tracking-wider">REAL-TIME TELEMETRY WINDOW</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Total Alerts */}
                  <div className={`p-2.5 rounded bg-black/40 border transition-all ${last60MinStats.alerts > 0 ? 'border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.05)]' : 'border-white/5'}`}>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 tracking-wider uppercase font-bold mb-1">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className={`w-3 h-3 ${last60MinStats.alerts > 0 ? 'text-red-500 animate-pulse' : 'text-slate-500'}`} />
                        Total Alerts
                      </span>
                      {last60MinStats.alerts > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-bold font-mono ${last60MinStats.alerts > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                        {last60MinStats.alerts}
                      </span>
                      <span className="text-[8px] text-slate-500">EVENTS</span>
                    </div>
                  </div>

                  {/* Total Repairs */}
                  <div className={`p-2.5 rounded bg-black/40 border transition-all ${last60MinStats.repairs > 0 ? 'border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.05)]' : 'border-white/5'}`}>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 tracking-wider uppercase font-bold mb-1">
                      <span className="flex items-center gap-1">
                        <Wrench className={`w-3 h-3 ${last60MinStats.repairs > 0 ? 'text-cyan-400' : 'text-slate-500'}`} />
                        Total Repairs
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-bold font-mono ${last60MinStats.repairs > 0 ? 'text-cyan-400' : 'text-slate-300'}`}>
                        {last60MinStats.repairs}
                      </span>
                      <span className="text-[8px] text-slate-500">CYCLES</span>
                    </div>
                  </div>

                  {/* Total Successes */}
                  <div className={`p-2.5 rounded bg-black/40 border transition-all ${last60MinStats.successes > 0 ? 'border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]' : 'border-white/5'}`}>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 tracking-wider uppercase font-bold mb-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className={`w-3 h-3 ${last60MinStats.successes > 0 ? 'text-emerald-400' : 'text-slate-500'}`} />
                        Total Success
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-bold font-mono ${last60MinStats.successes > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {last60MinStats.successes}
                      </span>
                      <span className="text-[8px] text-slate-500">TASKS</span>
                    </div>
                  </div>

                  {/* Active Throughput / Buffer Logs */}
                  <div className="p-2.5 rounded bg-black/40 border border-white/5 transition-all">
                    <div className="flex items-center justify-between text-[9px] text-slate-500 tracking-wider uppercase font-bold mb-1">
                      <span className="flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-slate-400" />
                        Active Log Count
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold font-mono text-white">
                        {last60MinStats.total}
                      </span>
                      <span className="text-[8px] text-slate-500 font-bold">
                        / {last60MinStats.activeBufferCount} TOTAL CACHED
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Header: Quick Filters, Time Range & Search Bar */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2.5 mb-3 rounded-sm bg-slate-950/80 border border-white/5 text-[10px]">
                <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center gap-3 w-full lg:w-auto">
                  {/* Quick Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mr-1">Quick Filters:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(['ALL', 'INFO', 'ALERT', 'REPAIR', 'SUCCESS'] as const).map((filter) => {
                        const isActive = logFilter === filter;
                        let activeStyle = '';
                        let icon = null;

                        switch (filter) {
                          case 'ALL':
                            activeStyle = isActive 
                              ? 'bg-slate-800 text-white border-slate-600 shadow-[0_0_8px_rgba(255,255,255,0.1)]' 
                              : 'bg-black/40 text-slate-400 hover:text-slate-200 border-white/5 hover:border-white/10';
                            icon = <Terminal className="w-3 h-3" />;
                            break;
                          case 'INFO':
                            activeStyle = isActive 
                              ? 'bg-blue-950/40 text-blue-400 border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.15)]' 
                              : 'bg-black/40 text-slate-400 hover:text-blue-300 border-white/5 hover:border-blue-500/10';
                            icon = <Info className="w-3 h-3 text-blue-500/70" />;
                            break;
                          case 'ALERT':
                            activeStyle = isActive 
                              ? 'bg-red-950/40 text-red-400 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.15)] animate-pulse' 
                              : 'bg-black/40 text-slate-400 hover:text-red-300 border-white/5 hover:border-red-500/10';
                            icon = <AlertTriangle className="w-3 h-3 text-red-500/70" />;
                            break;
                          case 'REPAIR':
                            activeStyle = isActive 
                              ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]' 
                              : 'bg-black/40 text-slate-400 hover:text-cyan-300 border-white/5 hover:border-cyan-500/10';
                            icon = <Wrench className="w-3 h-3 text-cyan-500/70" />;
                            break;
                          case 'SUCCESS':
                            activeStyle = isActive 
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                              : 'bg-black/40 text-slate-400 hover:text-emerald-300 border-white/5 hover:border-emerald-500/10';
                            icon = <CheckCircle2 className="w-3 h-3 text-emerald-500/70" />;
                            break;
                        }

                        return (
                          <button
                            key={filter}
                            onClick={() => {
                              setLogFilter(filter);
                              addLog('INFO', `Terminal logs filtered to ${filter === 'ALL' ? 'ALL LEVELS' : filter}.`);
                            }}
                            className={`px-2.5 py-1 rounded-sm border font-mono text-[9px] font-bold tracking-wider flex items-center gap-1.5 transition-all duration-200 cursor-pointer uppercase ${activeStyle}`}
                          >
                            {icon}
                            {filter}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Range Selector */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mr-1">Time Interval:</span>
                    <div className="flex items-center gap-1 bg-black/60 border border-white/10 focus-within:border-amber-500/40 rounded-sm px-2 py-1 transition-all">
                      <input
                        type="time"
                        step="1"
                        value={logStartTime}
                        onChange={(e) => {
                          setLogStartTime(e.target.value);
                          if (e.target.value) {
                            addLog('INFO', `Terminal log interval start: ${e.target.value}.`);
                          }
                        }}
                        className="bg-transparent border-none text-white focus:outline-none font-mono text-[9px] uppercase tracking-wider cursor-pointer w-20 [color-scheme:dark]"
                        title="Start Time Boundary"
                      />
                      <span className="text-slate-600 font-mono text-[9px] px-0.5">to</span>
                      <input
                        type="time"
                        step="1"
                        value={logEndTime}
                        onChange={(e) => {
                          setLogEndTime(e.target.value);
                          if (e.target.value) {
                            addLog('INFO', `Terminal log interval end: ${e.target.value}.`);
                          }
                        }}
                        className="bg-transparent border-none text-white focus:outline-none font-mono text-[9px] uppercase tracking-wider cursor-pointer w-20 [color-scheme:dark]"
                        title="End Time Boundary"
                      />
                      {(logStartTime || logEndTime) && (
                        <button
                          onClick={() => {
                            setLogStartTime('');
                            setLogEndTime('');
                            addLog('INFO', `Terminal log time interval filters reset.`);
                          }}
                          className="ml-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Reset Time Filters"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search Bar Input */}
                  <div className="flex items-center gap-2 bg-black/60 border border-white/10 focus-within:border-amber-500/40 rounded-sm px-2.5 py-1.5 w-full sm:w-48 transition-all duration-200">
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="SEARCH LOGS..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="bg-transparent border-none text-white focus:outline-none placeholder-slate-600 font-mono text-[9px] w-full uppercase tracking-wider"
                    />
                    {logSearchQuery && (
                      <button 
                        onClick={() => setLogSearchQuery('')} 
                        className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                        title="Clear Search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[8px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 font-bold tracking-wider select-none justify-between lg:justify-end">
                  <span>TOTAL CACHED: {logs.length} EVENTS</span>
                  {(logFilter !== 'ALL' || logSearchQuery.trim() !== '' || logStartTime || logEndTime) && (
                    <span className="text-amber-500">
                      ({filteredLogs.length} MATCHED)
                    </span>
                  )}
                </div>
              </div>

              {/* Terminal View */}
              <div className="bg-black/95 rounded-sm border border-white/5 p-4 h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 space-y-2 text-[11px] leading-relaxed select-text shadow-inner">
                {(() => {
                  if (filteredLogs.length === 0) {
                    return (
                      <p className="text-slate-600 italic text-center py-8">
                        No matches found for the selected filter and query in current flight session.
                      </p>
                    );
                  }
                  
                  return filteredLogs.map((log) => {
                    let levelColor = 'text-blue-400 bg-blue-500/5 border-blue-500/10';
                    let textClass = 'text-slate-300';
                    let statusIcon = <Info className="w-3 h-3 text-blue-400 shrink-0" />;
                    let statusDotColor = 'bg-blue-400/80 shadow-[0_0_6px_#3b82f6]';
                    
                    if (log.level === 'ALERT') {
                      levelColor = 'text-red-400 bg-red-500/10 border-red-500/20 animate-pulse';
                      textClass = 'text-red-300 font-bold';
                      statusIcon = <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />;
                      statusDotColor = 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping';
                    } else if (log.level === 'REPAIR') {
                      levelColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                      textClass = 'text-cyan-300';
                      statusIcon = <Wrench className="w-3 h-3 text-cyan-400 shrink-0" />;
                      statusDotColor = 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]';
                    } else if (log.level === 'SUCCESS') {
                      levelColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
                      textClass = 'text-emerald-300 font-semibold';
                      statusIcon = <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />;
                      statusDotColor = 'bg-emerald-500 shadow-[0_0_6px_#10b981]';
                    }

                    return (
                      <div key={log.id} className="flex items-start gap-2.5 hover:bg-white/5 p-1 rounded transition-colors duration-150 border border-transparent hover:border-white/5">
                        <span className="text-[9px] text-slate-600 select-none font-mono mt-0.5">[{log.timestamp}]</span>
                        <div className="flex items-center justify-center mt-1.5 w-1.5 h-1.5 relative">
                          <span className={`absolute h-1.5 w-1.5 rounded-full ${statusDotColor}`} />
                        </div>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-sm border font-bold uppercase tracking-wider select-none flex items-center gap-1 ${levelColor}`}>
                          {statusIcon}
                          {log.level}
                        </span>
                        <p className={`flex-1 ${textClass}`}>
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
                <span>BUFFER CAPACITY: {autoPurge ? '50' : '100'} LINES</span>
                <span className="text-slate-400">LOCAL BACKUP: {lastBackupTime}</span>
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

      {/* Full Subsystem Overhaul Confirmation */}
      <ConfirmationDialog
        isOpen={isOverhaulConfirmOpen}
        onClose={() => setIsOverhaulConfirmOpen(false)}
        onConfirm={handleFullOverhaul}
        title="Full Subsystem Overhaul"
        description="Executing a Full Subsystem Overhaul resets all mechanical degradation patterns and restores materials stress capacity to standard baselines. Subsystems will be temporarily offline during recalibration. This action is irreversible."
        confirmText="Initiate Overhaul"
        cancelText="Abort Overhaul"
        variant="warning"
        requireTextConfirm="OVERHAUL"
      />

      {/* Clear Logs Confirmation */}
      <ConfirmationDialog
        isOpen={isClearLogsConfirmOpen}
        onClose={() => setIsClearLogsConfirmOpen(false)}
        onConfirm={handleClearLogs}
        title="Purge Operational logs"
        description="Are you sure you want to purge all flight deck logs? This action will clear your local visual buffer of real-time bridge telemetry and structural alerts. Note that secure cloud logs are immutable and will remain intact."
        confirmText="Purge Logs"
        cancelText="Abort Purge"
        variant="danger"
        requireTextConfirm="CLEAR"
      />

      {/* Batch Lock/Unlock Confirmation (>5 nodes) */}
      <ConfirmationDialog
        isOpen={!!batchConfirmState?.isOpen}
        onClose={() => setBatchConfirmState(null)}
        onConfirm={handleConfirmBatchAction}
        title={batchConfirmState?.actionType === 'lock' ? `Batch Lock Authorization (${batchConfirmState?.targetNodeIds.length} Nodes)` : `Batch Unlock Authorization (${batchConfirmState?.targetNodeIds.length} Nodes)`}
        description={
          batchConfirmState?.actionType === 'lock'
            ? `You are about to lock ${batchConfirmState?.targetNodeIds.length} diagnostic nodes simultaneously across the Navigation Ring array. Locking more than 5 nodes alters bridge-wide structural constraint parameters.`
            : `You are about to unlock ${batchConfirmState?.targetNodeIds.length} diagnostic nodes simultaneously across the Navigation Ring array. Unlocking more than 5 nodes releases structural constraint parameters on a major portion of the vessel.`
        }
        confirmText={batchConfirmState?.actionType === 'lock' ? `Authorize Lock (${batchConfirmState?.targetNodeIds.length})` : `Authorize Unlock (${batchConfirmState?.targetNodeIds.length})`}
        cancelText="Abort Action"
        variant={batchConfirmState?.actionType === 'lock' ? 'warning' : 'info'}
      />

      {/* Google Workspace Deck Drawer Modal */}
      <WorkspaceHub
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        accessToken={googleAccessToken}
        onSignInRequest={handleGoogleSignIn}
        hullIntegrity={hullIntegrity}
        resonance={ledger.resonance}
        computedStressZones={computedStressZones}
        briefingNarrative={activeBriefing.briefing_narrative}
        addLog={addLog}
        showBanner={showBanner}
      />
    </div>
  );
}
