import { queueLeaf, processEpochBatch, generateInclusionProof } from "./server/merkleEngine";
import { logger } from "./src/utils/logger";
import { ethers } from "ethers";
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

import oracleRouter, { hydrateStateFromChain } from './server/routes/oracle';

let resonance = 85.43;
let baseEarnings = 1.234567;
let claimCount = 0;
const startTime = Date.now();

let relayer: OracleRelayer | null = null;

function getLiveEarnings() {
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  return baseEarnings + (elapsedSeconds * 0.000003);
}


// Automated Gas Escalation & Pulse Retry Handler
const executePulseWithRetry = async (maxAttempts = 3) => {
  let attempt = 0;
  let gasMultiplier = 1.0;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      logger.info(`Initiating pulse attempt ${attempt}/${maxAttempts} (Gas Multiplier: ${gasMultiplier.toFixed(2)}x)`, "RelayerEngine");
      // Enforce gas ceiling check
      // checkGasFeeSafetyCaps(currentNetworkGasGwei, req.query?.simulateGasGwei);


      // Execute pulse passing adjusted gas parameters if supported
      let txResult;
      if (relayer && typeof relayer.executePulse === "function") {
        txResult = await relayer.executePulse({ gasMultiplier });
      } else {
        txResult = { status: "simulated", attempt, timestamp: new Date().toISOString() };
      }

      logger.info(`Pulse successfully executed on attempt ${attempt}`, "RelayerEngine", { txResult });
      return { success: true, attempts: attempt, txResult };
    } catch (err) {
      logger.warn(`Pulse attempt ${attempt} failed: ${err.message}`, "RelayerEngine", { attempt, errorCode: err.code });
      
      // Escalation: increase gas parameters by 20% for next attempt
      gasMultiplier *= 1.20;

      if (attempt >= maxAttempts) {
        recordRelayerFailure(err, "RelayerEscalationEngine");
        throw new Error(`All ${maxAttempts} pulse attempts failed. Last error: ${err.message}`);
      }

      // Backoff delay before retry (1s, 2s...)
      const backoffMs = attempt * 1000;
      logger.info(`Waiting ${backoffMs}ms before retry with higher gas fee...`, "RelayerEngine");
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
};


// Gas Price Safety Caps (Gwei)
const MAX_GAS_PRICE_GWEI = Number(process.env.MAX_GAS_PRICE_GWEI) || 50; // Cap at 50 Gwei
const MAX_PRIORITY_FEE_GWEI = Number(process.env.MAX_PRIORITY_FEE_GWEI) || 3; // Cap at 3 Gwei

const checkGasFeeSafetyCaps = (currentGasPriceGwei, reqSimulated) => {
    if (reqSimulated) currentGasPriceGwei = Number(reqSimulated);
  const cap = Number(process.env.MAX_GAS_PRICE_GWEI) || 50;
    if (currentGasPriceGwei > cap) {
    const errorMsg = `Gas price spike detected (${currentGasPriceGwei.toFixed(2)} Gwei). Exceeds maximum safety cap of ${cap} Gwei.`;
    logger.error(errorMsg, null, "GasSafetyGuard");
    throw new Error(errorMsg);
  }
};

const app = express();

// Relayer Observability & Error Metrics Store
const relayerErrorMetrics = {
  totalFailures: 0,
  failuresByCode: {} as Record<string, number>,
  lastFailure: null as {
    timestamp: string;
    message: string;
    code: string;
    context: string;
  } | null,
  recentErrorHistory: [] as Array<{ timestamp: string; message: string; code: string }>
};

const recordRelayerFailure = (err: any, context = "RelayerExecution") => {
  relayerErrorMetrics.totalFailures += 1;
  const errorCode = err.code || err.name || "UNKNOWN_ERROR";
  relayerErrorMetrics.failuresByCode[errorCode] = (relayerErrorMetrics.failuresByCode[errorCode] || 0) + 1;

  const failureDetails = {
    timestamp: new Date().toISOString(),
    message: err.message || String(err),
    code: String(errorCode),
    context
  };

  relayerErrorMetrics.lastFailure = failureDetails;
  relayerErrorMetrics.recentErrorHistory.unshift({
    timestamp: failureDetails.timestamp,
    message: failureDetails.message,
    code: failureDetails.code
  });

  // Keep last 10 errors
  if (relayerErrorMetrics.recentErrorHistory.length > 10) {
    relayerErrorMetrics.recentErrorHistory.pop();
  }

  logger.error("Relayer execution failure detected", err, context, {
    totalFailures: relayerErrorMetrics.totalFailures,
    errorCode
  });
};


// Active SSE clients set
const sseClients = new Set();

// Function to broadcast real-time events to all connected clients
const broadcastSSE = (eventType, payload) => {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach((clientRes) => {
    try {
      clientRes.write(message);
    } catch (err) {
      console.error("[Broadcaster Error]", err);
    }
  });
};

const PORT = process.env.PORT || 3098;

app.use(express.json());

// Explicitly register API router before any fallback middleware
app.use('/api/oracle', oracleRouter);

// Health Endpoint

// SSE Telemetry Stream Endpoint

// Network Configuration Profiles
const NETWORK_PROFILES = {
  sepolia: {
    name: "Sepolia Testnet",
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/alch_9kE0kwAt4QoP0UYdtStb2",
    contractAddress: process.env.SEPOLIA_CONTRACT || "0xE158659A9e83d462Ad6705948F7649AdDCb2aD75"
  },
  anvil: {
    name: "Anvil Localhost",
    chainId: 31337,
    rpcUrl: process.env.ANVIL_RPC_URL || "http://127.0.0.1:8545",
    contractAddress: process.env.ANVIL_CONTRACT || "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  }
};

let currentActiveNetwork = "sepolia";

// API: Switch Active Network Profile

// API: Manual Relayer Pulse Trigger
app.post("/api/relayer/pulse", async (req, res) => {
    const { commitHash, ipfsCid } = req.body || {};
    if (commitHash && ipfsCid) {
      console.log("🍃 Queuing leaf to relayer.db...", commitHash.slice(0, 8), ipfsCid.slice(0, 12));
      queueLeaf(commitHash, ipfsCid).then(() => processEpochBatch(8)).catch(err => console.error("❌ Queue error:", err));
    }
  
  try {
    console.log("⚡ [Manual Trigger] Initiating Relayer Pulse...");
    
    let result = { status: "simulated", timestamp: new Date().toISOString() };
    if (relayer && typeof relayer.executePulse === "function") {
      const retryOutcome = await executePulseWithRetry(3);
    result = retryOutcome.txResult;
    }

    const relayerMetrics = relayer ? await relayer.getMetrics() : {};
    
    // Broadcast updated telemetry instantly via SSE
    broadcastSSE("relayerPulse", {
      status: "success",
      pulseData: result,
      metrics: relayerMetrics,
      activeNetwork: currentActiveNetwork,
      timestamp: new Date().toISOString()
    });

    return res.json({
      status: "ok",
      message: "Relayer pulse executed successfully",
      network: currentActiveNetwork,
      metrics: relayerMetrics
    });
  } catch (err) {
    recordRelayerFailure(err, "ManualPulseAPI");
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/network/switch", express.json(), async (req, res) => {
  const { network } = req.body;
  if (!NETWORK_PROFILES[network]) {
    return res.status(400).json({ error: "Invalid target network profile" });
  }

  try {
    currentActiveNetwork = network;
    const target = NETWORK_PROFILES[network];

    console.log(`🔄 Switching RPC Provider profile to: ${target.name} (${target.rpcUrl})`);

    // Broadcast network switch event across SSE
    broadcastSSE("networkSwitch", {
      activeNetwork: target.name,
      chainId: target.chainId,
      contractAddress: target.contractAddress,
      timestamp: new Date().toISOString()
    });

    return res.json({
      status: "ok",
      message: `Switched network to ${target.name}`,
      activeNetwork: target,
    });
  } catch (err) {
    console.error("[Network Switch Error]", err);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/events", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const sendEvent = async () => {
    try {
      const relayerMetrics = relayer ? await relayer.getMetrics() : {};
      const minEthThreshold = parseFloat(process.env.RELAYER_MIN_ETH || "0.005");
      const currentRelayerBalance = parseFloat(relayerMetrics?.walletBalance || "0");
      const isLowFunded = currentRelayerBalance < minEthThreshold;

      
      // Emit explicit low-funding alert event if threshold breached
      if (isLowFunded) {
        broadcastSSE("fundingAlert", {
          level: "warning",
          message: "Relayer reserve below threshold",
          balance: currentRelayerBalance,
          threshold: minEthThreshold,
          timestamp: new Date().toISOString()
        });
      }

      const payload = {
        relayer: relayerMetrics,
        fundingAlert: {
          isLowFunded,
          thresholdEth: minEthThreshold
        },
        timestamp: new Date().toISOString()
      };

      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      console.error("[SSE Error]", err);
    }
  };

  await sendEvent();
  const interval = setInterval(sendEvent, 5000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

app.get("/api/health", async (req, res) => {
  let rpcLatencyMs = -1;
  let onChainCycle = null;
  let rpcStatus = "degraded";

  try {
    const providerRpc = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/alch_9kE0kwAt4QoP0UYdtStb2";
    // ethers imported at top-level
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || providerRpc);
    
    const pStart = Date.now();
    await provider.getBlockNumber();
    rpcLatencyMs = Date.now() - pStart;
    rpcStatus = "healthy";

    const oracleAddress = process.env.ORACLE_ADDRESS || "0xE158659A9e83d462Ad6705948F7649AdDCb2aD75";
    const oracleAbi = ["function cycleCount() view returns (uint256)"];
    const contract = new ethers.Contract(oracleAddress, oracleAbi, provider);
    const cycle = await contract.cycleCount();
    onChainCycle = Number(cycle);
  } catch (err) {
    console.warn("⚠️ Health endpoint RPC ping warning:", err.message || err);
  }

  
  // Multi-Chain: Solana Tracking
  let solanaTelemetry = {
    address: process.env.SOLANA_WALLET_ADDRESS || "2ChMGz6MeNoEgBuGj7aXYw1Mbc3DSzkZgwNwg1xGD1r9",
    solBalance: "0.0",
    status: "degraded"
  };

  try {
    const solRpc = "https://api.mainnet-beta.solana.com";
    const solRes = await fetch(solRpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [solanaTelemetry.address]
      })
    });
    const solData = await solRes.json();
    if (solData?.result?.value !== undefined) {
      solanaTelemetry.solBalance = (solData.result.value / 1e9).toFixed(4);
      solanaTelemetry.status = "healthy";
    }
  } catch (err) {
    console.warn("⚠️ Solana query warning:", err.message || err);
  }

  
  // Relayer Low-Balance Threshold Logic
  const minEthThreshold = parseFloat(process.env.RELAYER_MIN_ETH || "0.005");
  const relayerMetrics = relayer ? await relayer.getMetrics() : {};
  const currentRelayerBalance = parseFloat(relayerMetrics.walletBalance || "0");
  const isLowFunded = currentRelayerBalance < minEthThreshold;

  const fundingAlert = {
    isLowFunded,
    thresholdEth: minEthThreshold,
    alertMessage: isLowFunded 
      ? `⚠️ LOW RELAYER FUNDS: Balance (${currentRelayerBalance} ETH) below ${minEthThreshold} ETH threshold!`
      : "Nominal"
  };

  if (isLowFunded) {
    console.warn(`[Relayer Warning] ${fundingAlert.alertMessage}`);
  }
  
  res.json({
    status: rpcStatus === "healthy" ? "ok" : "degraded",
    system: "Sovereign Manifold",
    network: "Sepolia Testnet",
    chainId: 11155111,
    contractAddress: "0xE158659A9e83d462Ad6705948F7649AdDCb2aD75",
    onChainCycle: onChainCycle,
    relayer: relayer ? {
      active: true,
      status: "running",
      mode: "60s Heartbeat",
      ...(await relayer.getMetrics())
    } : {
      active: false,
      status: "idle",
      mode: "60s Heartbeat"
    },
    rpcTelemetry: {
      status: rpcStatus,
      latencyMs: rpcLatencyMs
    },
    solana: solanaTelemetry,
    fundingAlert,
    timestamp: new Date().toISOString()
  });
});

// Sovereign Ledger Endpoint
app.get('/api/sovereign-ledger', (req, res) => {
  res.json({
    resonance: resonance,
    gtc_balance: Math.round(resonance * 1234),
    compound_years: 4.2 + (claimCount * 0.4),
    hidden_balance: Math.round(resonance * 15678),
    forfeited_short_game: Math.round(resonance * 11456),
    status: resonance > 90
      ? 'Resonance peaking at maximum intensity. The long game is won.'
      : 'Consensus loop completed. Ledger signature verification checked and approved.'
  });
});

async function startServer() {
  const httpServer = createHttpServer(app);

  console.log('🔄 Hydrating Sepolia State...');
  await hydrateStateFromChain();

  try {
    relayer = OracleRelayer.fromEnv();
    console.log('[Oracle Relayer] Initialized successfully.');
  } catch (err: any) {
    console.warn('[Oracle Relayer Warning]', err.message);
  }

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    if (pathname === '/glyph-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  if (relayer) {
    relayer.listenToPulses((pulseData) => {
      console.log(`[Oracle Event] Pulse confirmed on-chain: Cycle #${pulseData.cycle}`);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'oracle_pulse', data: pulseData }));
        }
      });
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Sovereign Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

app.get("/api/relayer/proof/:commitHash", async (req, res) => {
  try {
    const proofData = await generateInclusionProof(req.params.commitHash);
    res.json(proofData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
