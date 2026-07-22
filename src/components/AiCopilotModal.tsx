import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Globe, 
  Cpu, 
  Sparkles, 
  X, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Activity,
  Search,
  MessageSquare,
  MapPin,
  Image as ImageIcon,
  Video,
  Mic,
  MicOff,
  Zap,
  Sliders,
  Upload,
  BrainCircuit,
  Volume2,
  Download,
  Edit3
} from 'lucide-react';

interface AiCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  vesselState: {
    hullIntegrity: number;
    resonance: number;
    computedStressZones: any[];
    nanitesUsed: number;
    repairTaskQueue?: any[];
  };
  onExecuteBulkRepair?: (nodeIds?: string[]) => void;
  onEnqueueMultipleNodes?: (nodeIds: string[]) => void;
  addLog?: (type: string, message: string) => void;
  showBanner?: (message: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelUsed?: string;
  groundingSources?: Array<{ title: string; url: string }>;
  isSearch?: boolean;
  isMaps?: boolean;
}

interface DiagnosticAnalysis {
  overallStatus: 'NOMINAL' | 'ELEVATED' | 'CRITICAL';
  executiveSummary: string;
  priorityNodeRepairIds: string[];
  recommendedActions: string[];
  calculatedSystemEfficiency: number;
}

export const AiCopilotModal: React.FC<AiCopilotModalProps> = ({
  isOpen,
  onClose,
  vesselState,
  onExecuteBulkRepair,
  onEnqueueMultipleNodes,
  addLog,
  showBanner
}) => {
  const [activeTab, setActiveTab] = useState<'copilot' | 'grounding' | 'multimodal' | 'imageStudio' | 'voiceLive' | 'diagnostic'>('copilot');

  // Chat state
  const [selectedModel, setSelectedModel] = useState<'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [thinkingMode, setThinkingMode] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Commander, SYNARA-AI Bridge Intelligence initialized. All neural sub-routines engaged. How may I assist with vessel operations, spatial grounding, or image synthesis?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.5-flash'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Grounding state
  const [groundingMode, setGroundingMode] = useState<'search' | 'maps'>('search');

  // Multimodal state
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaFileBase64, setMediaFileBase64] = useState<string | null>(null);
  const [mediaMimeType, setMediaMimeType] = useState<string>('image/jpeg');
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [multimodalPrompt, setMultimodalPrompt] = useState<string>('');
  const [multimodalResult, setMultimodalResult] = useState<string | null>(null);
  const [isAnalyzingMedia, setIsAnalyzingMedia] = useState<boolean>(false);

  // Image Studio state
  const [imagePrompt, setImagePrompt] = useState<string>('Futuristic quantum vessel engine matrix blueprint with emerald energy conduits');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [editInstruction, setEditInstruction] = useState<string>('Add glowing cybernetic nanite grid overlay');
  const [isEditingImage, setIsEditingImage] = useState<boolean>(false);

  // Voice / Live state
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('Idle - Ready for live voice feedback');
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);

  // Diagnostic state
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen && (activeTab === 'copilot' || activeTab === 'grounding')) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, activeTab]);

  if (!isOpen) return null;

  // Speak assistant response in Voice mode
  const speakText = (text: string) => {
    if (!speechSupported) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const handleSendMessage = async (customPrompt?: string, overrideMode?: 'search' | 'maps' | 'complex' | 'fast') => {
    const textToSend = (customPrompt || inputQuery).trim();
    if (!textToSend || isLoading) return;

    let modeParam: string | undefined = overrideMode;
    if (activeTab === 'grounding') {
      modeParam = groundingMode;
    } else if (thinkingMode && selectedModel === 'gemini-3.1-pro-preview') {
      modeParam = 'thinking';
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSearch: modeParam === 'search',
      isMaps: modeParam === 'maps'
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputQuery('');
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .slice(-6)
        .map(m => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/gemini/copilot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history,
          model: selectedModel,
          mode: modeParam,
          vesselState
        })
      });

      const data = await res.json();

      if (data.success) {
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: data.modelUsed,
          groundingSources: data.groundingSources,
          isSearch: modeParam === 'search',
          isMaps: modeParam === 'maps'
        };
        setMessages(prev => [...prev, assistantMsg]);

        if (isVoiceActive) {
          speakText(data.text);
        }

        if (addLog) addLog('INFO', `SYNARA-AI: Response generated via ${data.modelUsed || selectedModel}`);
      } else {
        throw new Error(data.error || 'Failed to receive AI copilot response.');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `⚠️ SYNARA-AI Alert: ${err.message || 'Transmission disrupted.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Multimodal File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video/');
    setMediaType(isVid ? 'video' : 'image');
    setMediaMimeType(file.type);

    const url = URL.createObjectURL(file);
    setMediaPreviewUrl(url);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setMediaFileBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Load sample media for quick demo testing
  const loadSampleMedia = (type: 'image' | 'video') => {
    if (type === 'image') {
      setMediaType('image');
      setMediaMimeType('image/png');
      // Create SVG canvas data URL for demo sample image
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#020617"/><circle cx="200" cy="150" r="90" fill="none" stroke="#06b6d4" stroke-width="4"/><circle cx="200" cy="150" r="40" fill="none" stroke="#ef4444" stroke-width="6"/><text x="200" y="155" fill="#f87171" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle">CRITICAL STRESS NODE</text><line x1="110" y1="150" x2="290" y2="150" stroke="#10b981" stroke-width="2" stroke-dasharray="4,4"/><text x="200" y="270" fill="#38bdf8" font-family="monospace" font-size="12" text-anchor="middle">SECTOR 99-Q HULL INTEGRITY SCAN</text></svg>`;
      const base64 = btoa(svg);
      setMediaFileBase64(base64);
      setMediaMimeType('image/svg+xml');
      setMediaPreviewUrl(`data:image/svg+xml;base64,${base64}`);
      setMultimodalPrompt('Identify critical stress nodes and calculate nanite repair priority from this hull scan.');
    } else {
      setMediaType('video');
      setMediaMimeType('video/mp4');
      // Set dummy base64 for video analysis test
      const dummyBase64 = btoa('SAMPLE_FLIGHT_RECORDER_TELEMETRY_VIDEO_STREAM');
      setMediaFileBase64(dummyBase64);
      setMediaPreviewUrl(null);
      setMultimodalPrompt('Analyze this tactical flight recorder video stream for anomaly timestamps, thruster vectoring errors, and hull stress peaks.');
    }
  };

  const handleMultimodalAnalyze = async () => {
    if (!mediaFileBase64) return;
    setIsAnalyzingMedia(true);
    setMultimodalResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-multimodal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: mediaFileBase64,
          mimeType: mediaMimeType,
          prompt: multimodalPrompt,
          mediaType
        })
      });

      const data = await res.json();
      if (data.success) {
        setMultimodalResult(data.text);
        if (addLog) addLog('INFO', `SYNARA-AI: Completed multimodal ${mediaType} analysis via gemini-3.1-pro-preview`);
      } else {
        throw new Error(data.error || 'Failed to analyze media file.');
      }
    } catch (err: any) {
      setMultimodalResult(`⚠️ Multimodal Analysis Failed: ${err.message}`);
    } finally {
      setIsAnalyzingMedia(false);
    }
  };

  // Image Generation Handler (gemini-3-pro-image-preview)
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;
    setIsGeneratingImage(true);

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          size: imageSize,
          action: 'create'
        })
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        if (addLog) addLog('INFO', `SYNARA-AI: Generated ${imageSize} Tactical Hologram via ${data.modelUsed}`);
        if (showBanner) showBanner(`🖼️ TACTICAL HOLOGRAM GENERATED (${imageSize})`);
      } else {
        throw new Error(data.error || 'Image generation failed.');
      }
    } catch (err: any) {
      if (showBanner) showBanner(`⚠️ Image Generation Error: ${err.message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Image Edit Handler (gemini-3.1-flash-image-preview)
  const handleEditImage = async () => {
    if (!generatedImageUrl || !editInstruction.trim() || isEditingImage) return;
    setIsEditingImage(true);

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          editInstruction,
          sourceImageData: generatedImageUrl,
          size: imageSize,
          action: 'edit'
        })
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        if (addLog) addLog('INFO', `SYNARA-AI: Edited Tactical Hologram via ${data.modelUsed}`);
        if (showBanner) showBanner(`✨ TACTICAL HOLOGRAM EDITED VIA GEMINI`);
      } else {
        throw new Error(data.error || 'Image edit failed.');
      }
    } catch (err: any) {
      if (showBanner) showBanner(`⚠️ Image Edit Error: ${err.message}`);
    } finally {
      setIsEditingImage(false);
    }
  };

  const runVesselDiagnostic = async () => {
    setIsAnalyzing(true);
    setDiagError(null);
    try {
      const res = await fetch('/api/gemini/analyze-vessel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vesselState)
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setDiagnosticData(data.analysis);
        if (addLog) addLog('REPAIR', `SYNARA-AI Diagnostic Completed: Vessel status ${data.analysis.overallStatus} (${data.analysis.calculatedSystemEfficiency}% Efficiency)`);
        if (showBanner) showBanner(`🤖 AI DIAGNOSTIC COMPLETE: Status ${data.analysis.overallStatus} (${data.analysis.calculatedSystemEfficiency}% Efficiency)`);
      } else {
        throw new Error(data.error || 'Diagnostic scan returned invalid schema.');
      }
    } catch (err: any) {
      setDiagError(err.message || 'Failed to complete AI diagnostic scan.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[90vh] bg-slate-900/95 border border-cyan-500/40 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden font-mono text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/90 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/40 rounded-md text-cyan-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wider text-cyan-300 uppercase">SYNARA-AI Intelligence Suite</h2>
                <span className="px-2 py-0.5 text-[9px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full uppercase tracking-widest">
                  Gemini Multi-Model
                </span>
              </div>
              <p className="text-[10px] text-slate-400">FPT-Ω Synara Class Bridge Intelligence & Neural Diagnostics</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-md transition-colors cursor-pointer"
            title="Close SYNARA-AI Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950/70 border-b border-slate-800/80 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'copilot'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Bridge Copilot</span>
          </button>

          <button
            onClick={() => setActiveTab('grounding')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'grounding'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Search & Maps</span>
          </button>

          <button
            onClick={() => setActiveTab('multimodal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'multimodal'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-purple-400" />
            <span>Image & Video AI</span>
          </button>

          <button
            onClick={() => setActiveTab('imageStudio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'imageStudio'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Hologram Studio (1K/2K/4K)</span>
          </button>

          <button
            onClick={() => setActiveTab('voiceLive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'voiceLive'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            <span>Live Voice Bridge</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('diagnostic');
              if (!diagnosticData && !isAnalyzing) runVesselDiagnostic();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'diagnostic'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Diagnostic Scan</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-900/60">
          
          {/* TAB 1: Bridge Copilot Multi-turn Chat */}
          {activeTab === 'copilot' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Model & Thinking Controls Header */}
              <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Model:</span>
                  <select
                    value={selectedModel}
                    onChange={(e: any) => setSelectedModel(e.target.value)}
                    className="px-2.5 py-1 bg-slate-900 border border-cyan-500/40 rounded text-cyan-300 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="gemini-3.5-flash">gemini-3.5-flash (General Copilot)</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex Reasoning)</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Low-Latency Turbo)</option>
                  </select>
                </div>

                {selectedModel === 'gemini-3.1-pro-preview' && (
                  <label className="flex items-center gap-2 text-[11px] text-purple-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={thinkingMode}
                      onChange={e => setThinkingMode(e.target.checked)}
                      className="w-3.5 h-3.5 accent-purple-500 rounded cursor-pointer"
                    />
                    <span className="font-bold flex items-center gap-1">
                      <BrainCircuit className="w-3.5 h-3.5 text-purple-400" /> Enable Thinking Mode (High)
                    </span>
                  </label>
                )}

                {selectedModel === 'gemini-3.1-flash-lite' && (
                  <span className="flex items-center gap-1 text-[11px] text-amber-300 font-bold">
                    <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" /> Fast Low-Latency Responses
                  </span>
                )}
              </div>

              {/* Quick Prompts Bar */}
              <div className="px-5 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold whitespace-nowrap">Tactical Quick Prompts:</span>
                <button
                  onClick={() => handleSendMessage('Calculate current sovereign resonance decay rate and recommend harmonic locking steps.')}
                  className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 rounded text-[10px] whitespace-nowrap cursor-pointer transition-colors"
                >
                  ⚡ Calculate Resonance
                </button>
                <button
                  onClick={() => handleSendMessage('Prioritize navigation ring nodes needing nanite discharge based on hull strain.')}
                  className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded text-[10px] whitespace-nowrap cursor-pointer transition-colors"
                >
                  🛠️ Prioritize Nodes
                </button>
                <button
                  onClick={() => handleSendMessage('Provide a high-level briefing on the Fireseed Drive quantum containment field.', 'complex')}
                  className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded text-[10px] whitespace-nowrap cursor-pointer transition-colors"
                >
                  🧠 Fireseed Drive Analysis
                </button>
              </div>

              {/* Chat Message Scroll Region */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400">
                      <span>{msg.role === 'user' ? 'Commander' : 'SYNARA-AI'}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                      {msg.modelUsed && (
                        <span className="px-1.5 py-0.2 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded text-[8px] font-bold">
                          {msg.modelUsed}
                        </span>
                      )}
                    </div>

                    <div
                      className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-100 rounded-tr-none'
                          : 'bg-slate-950/80 border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="mr-auto flex items-center gap-2 p-3.5 bg-slate-950/80 border border-slate-800 text-slate-400 rounded-lg text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>SYNARA-AI executing query via {selectedModel}...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={e => setInputQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Query SYNARA-AI Bridge Copilot using ${selectedModel}...`}
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700/80 focus:border-cyan-500 text-xs text-white placeholder-slate-500 rounded-md outline-none transition-colors"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputQuery.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-40 text-slate-950 font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs uppercase tracking-wider"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Search & Maps Grounding */}
          {activeTab === 'grounding' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Grounding Source:</span>
                  <button
                    onClick={() => setGroundingMode('search')}
                    className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                      groundingMode === 'search'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Google Search</span>
                  </button>
                  <button
                    onClick={() => setGroundingMode('maps')}
                    className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                      groundingMode === 'maps'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                  </button>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Model: gemini-3.5-flash with {groundingMode === 'search' ? 'googleSearch' : 'googleMaps'} tool
                </span>
              </div>

              {/* Chat messages with grounding sources */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[10px] text-slate-400">
                      <span>{msg.role === 'user' ? 'Commander' : 'SYNARA-AI Grounded Officer'}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                      {msg.isSearch && (
                        <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[8px] font-bold">
                          SEARCH GROUNDED
                        </span>
                      )}
                      {msg.isMaps && (
                        <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded text-[8px] font-bold">
                          MAPS GROUNDED
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 rounded-lg border text-xs leading-relaxed bg-slate-950/80 border-slate-800 text-slate-200">
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Grounding Citations */}
                      {msg.groundingSources && msg.groundingSources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Grounded Citations & Locations:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.groundingSources.map((source, idx) => (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-[10px] rounded transition-colors"
                              >
                                <span className="truncate max-w-[200px]">{source.title}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="mr-auto flex items-center gap-2 p-3.5 bg-slate-950/80 border border-slate-800 text-slate-400 rounded-lg text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Retrieving grounded spatial telemetry...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={e => setInputQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(undefined, groundingMode);
                    }
                  }}
                  placeholder={
                    groundingMode === 'search'
                      ? "Search space weather, orbital station telemetry, or current astronomical data..."
                      : "Search ground stations, coordinates, or navigation landmarks..."
                  }
                  className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700/80 focus:border-emerald-500 text-xs text-white placeholder-slate-500 rounded-md outline-none transition-colors"
                />
                <button
                  onClick={() => handleSendMessage(undefined, groundingMode)}
                  disabled={isLoading || !inputQuery.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs uppercase tracking-wider"
                >
                  <span>Search</span>
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Image & Video AI Multimodal Analysis */}
          {activeTab === 'multimodal' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">Multimodal Media Scanner (Image & Video)</h3>
                  <p className="text-[11px] text-slate-400">Powered by gemini-3.1-pro-preview for deep visual and video understanding</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadSampleMedia('image')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded text-[10px] cursor-pointer transition-colors"
                  >
                    🖼️ Sample Hull Scan
                  </button>
                  <button
                    onClick={() => loadSampleMedia('video')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 rounded text-[10px] cursor-pointer transition-colors"
                  >
                    📹 Sample Flight Recorder Video
                  </button>
                </div>
              </div>

              {/* Upload Zone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Upload Photo or Video:
                  </label>
                  <div className="relative border-2 border-dashed border-purple-500/40 hover:border-purple-400 rounded-lg p-6 bg-slate-950/60 flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-purple-400 mb-2" />
                    <p className="text-xs text-slate-300 font-bold">Click or drag image/video file here</p>
                    <p className="text-[10px] text-slate-500 mt-1">Supports PNG, JPG, MP4, WEBM</p>
                  </div>

                  {mediaPreviewUrl && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Media Preview:</span>
                      {mediaType === 'image' ? (
                        <img src={mediaPreviewUrl} alt="Media Preview" className="max-h-48 rounded mx-auto object-contain" />
                      ) : (
                        <video src={mediaPreviewUrl} controls className="max-h-48 rounded mx-auto" />
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Diagnostic Query Prompt:
                    </label>
                    <textarea
                      value={multimodalPrompt}
                      onChange={e => setMultimodalPrompt(e.target.value)}
                      placeholder="Describe what you want Gemini 3.1 Pro to analyze in this media..."
                      className="w-full h-20 p-3 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    onClick={handleMultimodalAnalyze}
                    disabled={!mediaFileBase64 || isAnalyzingMedia}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-slate-950 font-bold rounded text-xs uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isAnalyzingMedia ? 'Analyzing Media via Gemini Pro...' : 'Analyze Media'}</span>
                  </button>
                </div>

                {/* Result Display */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-5 flex flex-col space-y-3">
                  <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" /> Multimodal Diagnostic Output
                  </h4>

                  {isAnalyzingMedia && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 py-12">
                      <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
                      <p className="text-xs">Processing visual & temporal tensors in gemini-3.1-pro-preview...</p>
                    </div>
                  )}

                  {multimodalResult && !isAnalyzingMedia && (
                    <div className="flex-1 overflow-y-auto p-3 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-mono">
                      {multimodalResult}
                    </div>
                  )}

                  {!multimodalResult && !isAnalyzingMedia && (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-500 italic py-12">
                      Upload an image/video and click "Analyze Media" to view AI output.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Tactical Hologram Studio (Image Generation 1K/2K/4K & Editing) */}
          {activeTab === 'imageStudio' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider">Tactical Hologram & Asset Studio</h3>
                  <p className="text-[11px] text-slate-400">Generate with gemini-3-pro-image-preview (1K/2K/4K) and edit with gemini-3.1-flash-image-preview</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Generation Controls */}
                <div className="space-y-4 bg-slate-950/60 p-5 border border-slate-800 rounded-lg">
                  <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-400" /> 1. Generate Hologram Asset
                  </h4>

                  <div className="space-y-2">
                    <label className="block text-xs text-slate-300 font-bold uppercase tracking-wider">Prompt:</label>
                    <textarea
                      value={imagePrompt}
                      onChange={e => setImagePrompt(e.target.value)}
                      placeholder="Prompt for tactical vessel asset..."
                      className="w-full h-20 p-3 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs text-slate-300 font-bold uppercase tracking-wider">Image Resolution / Size:</label>
                    <div className="flex items-center gap-2">
                      {(['1K', '2K', '4K'] as const).map(sz => (
                        <button
                          key={sz}
                          onClick={() => setImageSize(sz)}
                          className={`flex-1 py-1.5 rounded border text-xs font-bold transition-all cursor-pointer ${
                            imageSize === sz
                              ? 'bg-blue-600 text-slate-950 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {sz} Size
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-slate-950 font-bold rounded text-xs uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isGeneratingImage ? 'Synthesizing Hologram...' : `Generate ${imageSize} Image`}</span>
                  </button>

                  {/* Editing Section */}
                  {generatedImageUrl && (
                    <div className="pt-4 border-t border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-cyan-400" /> 2. Prompt-Based Image Editing
                      </h4>
                      <input
                        type="text"
                        value={editInstruction}
                        onChange={e => setEditInstruction(e.target.value)}
                        placeholder="Edit instruction (e.g. Add glowing nanite aura)..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={handleEditImage}
                        disabled={isEditingImage || !editInstruction.trim()}
                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold rounded text-xs uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isEditingImage ? 'Editing Image via Gemini...' : 'Apply Image Edit'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Display Canvas */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-5 flex flex-col items-center justify-center min-h-[320px] relative">
                  {isGeneratingImage && (
                    <div className="flex flex-col items-center gap-3 text-blue-400">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                      <span className="text-xs font-bold">Rendering {imageSize} Holographic Matrix...</span>
                    </div>
                  )}

                  {!isGeneratingImage && generatedImageUrl && (
                    <div className="space-y-3 w-full text-center">
                      <img
                        src={generatedImageUrl}
                        alt="Generated Tactical Hologram"
                        className="max-h-80 w-auto mx-auto rounded border border-blue-500/40 shadow-lg object-contain"
                      />
                      <a
                        href={generatedImageUrl}
                        download={`synara-hologram-${imageSize}.png`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 text-xs rounded transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download {imageSize} PNG</span>
                      </a>
                    </div>
                  )}

                  {!isGeneratingImage && !generatedImageUrl && (
                    <div className="text-xs text-slate-500 italic text-center">
                      Enter prompt and click "Generate" to synthesize a {imageSize} tactical hologram.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Live Voice Bridge */}
          {activeTab === 'voiceLive' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wider">Live Voice Bridge & Audio Synthesis</h3>
                  <p className="text-[11px] text-slate-400">Real-time verbal conversation using gemini-3.1-flash-live-preview and Web Speech API</p>
                </div>
              </div>

              <div className="max-w-xl mx-auto p-8 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center text-center space-y-6 shadow-xl">
                <div className={`p-6 rounded-full border-2 transition-all duration-300 ${
                  isVoiceActive 
                    ? 'bg-rose-500/20 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)] animate-pulse' 
                    : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}>
                  {isVoiceActive ? (
                    <Mic className="w-12 h-12 text-rose-400" />
                  ) : (
                    <MicOff className="w-12 h-12 text-slate-500" />
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-200">
                    {isVoiceActive ? 'SYNARA-AI Voice Channel Active' : 'Voice Channel Standby'}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">{voiceStatus}</p>
                </div>

                <button
                  onClick={() => {
                    const nextState = !isVoiceActive;
                    setIsVoiceActive(nextState);
                    setVoiceStatus(nextState ? 'Active - SYNARA-AI listening and speaking verbal responses...' : 'Idle - Voice stream suspended.');
                    if (nextState) {
                      speakText('SYNARA-AI Voice Channel engaged. Ready for verbal commands, Commander.');
                    } else {
                      window.speechSynthesis?.cancel();
                    }
                  }}
                  className={`px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                    isVoiceActive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                      : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isVoiceActive ? 'Disconnect Voice' : 'Connect Voice Bridge'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: AI Diagnostic Scan */}
          {activeTab === 'diagnostic' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Automated Vessel Diagnostic Scan</h3>
                  <p className="text-[11px] text-slate-400">Structured telemetry evaluation powered by Gemini 3.6 Flash</p>
                </div>
                <button
                  onClick={runVesselDiagnostic}
                  disabled={isAnalyzing}
                  className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'Scanning...' : 'Re-Run Diagnostic'}</span>
                </button>
              </div>

              {isAnalyzing && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-xs tracking-wider">Evaluating stress matrices & nanite balance across navigation ring...</p>
                </div>
              )}

              {diagError && (
                <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span>{diagError}</span>
                </div>
              )}

              {diagnosticData && !isAnalyzing && (
                <div className="space-y-6">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Vessel Status</span>
                      <div className="mt-1 flex items-center gap-2">
                        {diagnosticData.overallStatus === 'NOMINAL' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {diagnosticData.overallStatus === 'ELEVATED' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                        {diagnosticData.overallStatus === 'CRITICAL' && <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />}
                        <span className={`text-base font-extrabold tracking-wider ${
                          diagnosticData.overallStatus === 'NOMINAL' ? 'text-emerald-400' :
                          diagnosticData.overallStatus === 'ELEVATED' ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {diagnosticData.overallStatus}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">System Efficiency</span>
                      <p className="mt-1 text-base font-extrabold text-cyan-400 font-mono">
                        {diagnosticData.calculatedSystemEfficiency}%
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Urgently Stressed Nodes</span>
                      <p className="mt-1 text-base font-extrabold text-teal-300 font-mono">
                        {diagnosticData.priorityNodeRepairIds.length} Node(s)
                      </p>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" /> Executive AI Assessment
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {diagnosticData.executiveSummary}
                    </p>
                  </div>

                  {/* Priority Repair Action Banner */}
                  {diagnosticData.priorityNodeRepairIds.length > 0 && (
                    <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">AI Nanite Action Recommended</h4>
                        <p className="text-[11px] text-slate-400">
                          Nodes identified for immediate repair: {diagnosticData.priorityNodeRepairIds.join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {onEnqueueMultipleNodes && (
                          <button
                            onClick={() => {
                              onEnqueueMultipleNodes(diagnosticData.priorityNodeRepairIds);
                              onClose();
                            }}
                            className="px-3.5 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-bold rounded text-xs uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            <span>Flag for Task Queue</span>
                          </button>
                        )}
                        {onExecuteBulkRepair && (
                          <button
                            onClick={() => {
                              onExecuteBulkRepair(diagnosticData.priorityNodeRepairIds);
                              onClose();
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-xs uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap"
                          >
                            <Wrench className="w-4 h-4" />
                            <span>Execute Bulk Repair</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recommended Bridge Actions */}
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recommended Operational Actions</h4>
                    <ul className="space-y-2">
                      {diagnosticData.recommendedActions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
