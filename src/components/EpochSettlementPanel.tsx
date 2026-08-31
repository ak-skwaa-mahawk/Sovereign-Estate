import React, { useState, useEffect } from 'react';
import {
  Layers,
  Send,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Hash,
  Activity,
  Cpu,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

interface EpochBroadcast {
  network: string;
  chainId: number;
  contractAddress?: string;
  txHash: string;
  blockNumber: number;
  gasUsed: number;
  effectiveGasPriceGwei: string;
  status: string;
  broadcastedAt: string;
  confirmedAt: string;
  explorerUrl: string;
  rawPayload: string;
}

interface LeafMeta {
  index: number;
  witnessHash: string;
  lineage?: string;
  timestamp?: string;
  uei?: string;
}

interface EpochData {
  epochId: number;
  status: 'OPEN' | 'SEALED' | 'BROADCASTED' | 'FINALIZED';
  leafCount: number;
  leaves: string[];
  leafMetadata: LeafMeta[];
  merkleRoot: string;
  sealedAt?: string;
  broadcast?: EpochBroadcast;
}

interface MerkleProofResponse {
  leafIndex: number;
  leafHash: string;
  isValid: boolean;
  proof: {
    proof: Array<{ position: 'left' | 'right'; hash: string }>;
    root: string;
  };
}

export function EpochSettlementPanel() {
  const [epoch, setEpoch] = useState<EpochData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [selectedLeafIndex, setSelectedLeafIndex] = useState<number>(0);
  const [leafProof, setLeafProof] = useState<MerkleProofResponse | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchEpochData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/settlement/epoch?epochId=1');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.epoch) {
        setEpoch(data.epoch);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch epoch settlement status');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProof = async (leafIdx: number) => {
    try {
      const res = await fetch(`/api/settlement/proof?epochId=1&leafIndex=${leafIdx}`);
      if (res.ok) {
        const data = await res.json();
        setLeafProof(data);
      }
    } catch (e) {
      console.error('Failed to fetch proof:', e);
    }
  };

  useEffect(() => {
    fetchEpochData();
  }, []);

  useEffect(() => {
    if (epoch && epoch.leaves && epoch.leaves.length > 0) {
      fetchProof(selectedLeafIndex);
    }
  }, [epoch, selectedLeafIndex]);

  const handleBroadcast = async () => {
    setIsBroadcasting(true);
    setErrorMessage(null);
    setBroadcastSuccess(null);
    try {
      const res = await fetch('/api/settlement/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epochId: 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Broadcast failed');
      
      setEpoch(data.epoch);
      setBroadcastSuccess(`Settlement finalized! TX: ${data.tx_hash.slice(0, 16)}...`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Sepolia broadcast encountered an error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div id="sepolia-settlement-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-200 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white tracking-wide">
                On-Chain Batch Settlement (Sepolia Testnet)
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Epoch #1
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Locally sealed 8-leaf Merkle root with canonical inclusion proofs & on-chain verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-settlement-btn"
            onClick={fetchEpochData}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            id="broadcast-sepolia-btn"
            onClick={handleBroadcast}
            disabled={isBroadcasting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-lg ${
              epoch?.broadcast
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
            }`}
          >
            {isBroadcasting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Broadcasting...</span>
              </>
            ) : epoch?.broadcast ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Re-Broadcast Epoch #1</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Broadcast Epoch #1 to Sepolia</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {broadcastSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{broadcastSuccess}</span>
          </div>
          {epoch?.broadcast?.explorerUrl && (
            <a
              href={epoch.broadcast.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline flex items-center gap-1 text-emerald-300 hover:text-white"
            >
              View on Etherscan <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Epoch Status</span>
          </div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                epoch?.status === 'FINALIZED'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-white">{epoch?.status || 'SEALED'}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {epoch?.leafCount || 8} Leaves (Depth = 3)
          </div>
        </div>

        {/* Network & Chain */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Target Network</span>
          </div>
          <div className="text-sm font-semibold text-white">
            Sepolia Testnet
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1">
            Chain ID: 11155111
          </div>
        </div>

        {/* Block / Gas */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg">
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Settlement Block</span>
          </div>
          <div className="text-sm font-semibold text-white font-mono">
            {epoch?.broadcast?.blockNumber ? `#${epoch.broadcast.blockNumber}` : 'Pending Broadcast'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {epoch?.broadcast ? `Gas: ${epoch.broadcast.gasUsed} @ ${epoch.broadcast.effectiveGasPriceGwei} Gwei` : 'EIP-1559 Standard'}
          </div>
        </div>

        {/* Merkle Root */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sealed Merkle Root</span>
            </span>
            {epoch?.merkleRoot && (
              <button
                onClick={() => copyToClipboard(epoch.merkleRoot, 'root')}
                className="text-slate-400 hover:text-white"
                title="Copy Merkle Root"
              >
                {copiedHash === 'root' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="text-xs font-mono text-emerald-400 truncate" title={epoch?.merkleRoot}>
            {epoch?.merkleRoot || '0x...'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Canonical 256-bit hash
          </div>
        </div>
      </div>

      {/* Broadcast Details if finalized */}
      {epoch?.broadcast && (
        <div className="p-4 bg-slate-950 border border-indigo-500/20 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              On-Chain Transaction Hash (tx_hash)
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {epoch.broadcast.broadcastedAt}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-xs text-slate-200">
            <span className="truncate mr-2 text-indigo-300 font-semibold">{epoch.broadcast.txHash}</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyToClipboard(epoch.broadcast!.txHash, 'tx')}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                title="Copy tx_hash"
              >
                {copiedHash === 'tx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={epoch.broadcast.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-300"
                title="Open Sepolia Etherscan"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Merkle Leaf Proof Inspector */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            8-Leaf Merkle Tree & Inclusion Proofs
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Leaves: 8 (Tree Height = 3)
          </span>
        </div>

        {/* Leaves Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {epoch?.leaves.map((leaf, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedLeafIndex(idx)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                selectedLeafIndex === idx
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="text-[10px] font-mono text-slate-400">Leaf #{idx + 1}</div>
              <div className="text-xs font-mono font-semibold truncate text-indigo-300">
                {leaf.slice(0, 8)}...
              </div>
            </button>
          ))}
        </div>

        {/* Selected Leaf Detail & Inclusion Proof */}
        {leafProof && (
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-300 font-semibold">
                Proof Verification for Leaf #{selectedLeafIndex + 1}:
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Valid Cryptographic Inclusion
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {leafProof.proof.proof.map((step, sIdx) => (
                <div key={sIdx} className="p-2.5 bg-slate-900 border border-slate-800/80 rounded text-[11px]">
                  <div className="text-slate-400 font-mono mb-0.5">
                    Layer {sIdx + 1} Sibling ({step.position.toUpperCase()})
                  </div>
                  <div className="font-mono text-slate-300 truncate" title={step.hash}>
                    {step.hash}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
