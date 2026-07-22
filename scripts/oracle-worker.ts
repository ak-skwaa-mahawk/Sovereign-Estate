import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Zod Schema for incoming pulse payload validation
const PulsePayloadSchema = z.object({
  T: z.number().min(0).max(100),
  I: z.number().min(0).max(100),
  F: z.number().min(0).max(100),
  proofHash: z.string().optional(),
});

type PulsePayload = z.infer<typeof PulsePayloadSchema>;

async function main() {
  const isSepolia = process.argv.includes("sepolia") || process.env.NETWORK === "sepolia";
  const rpcUrl = isSepolia
    ? (process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org")
    : (process.env.RPC_URL || "http://127.0.0.1:8545");

  const privateKey = process.env.RELAYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("❌ Missing RELAYER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY in .env");
  }

  // Contract Address Resolution (Env Override > oracle-address.json)
  let contractAddress = process.env.AGLL_ORACLE_ADDRESS;
  const oracleMetaPath = path.resolve("data/oracle-address.json");

  if (!contractAddress && fs.existsSync(oracleMetaPath)) {
    const meta = JSON.parse(fs.readFileSync(oracleMetaPath, "utf8"));
    contractAddress = meta.address;
  }

  if (!contractAddress) {
    throw new Error("❌ Oracle contract address could not be resolved from env or data/oracle-address.json");
  }

  // Contract ABI Loading
  const artifactPath = path.resolve("artifacts/contracts/AGLLOracle.sol/AGLLOracle.json");
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`❌ Missing contract artifact at ${artifactPath}`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Ethers Initialization
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

  console.log(`🤖 AGLL Oracle Worker Online`);
  console.log(`  🌐 Network Target : ${isSepolia ? "Sepolia Testnet" : "Local Network"}`);
  console.log(`  🔗 RPC Endpoint   : ${rpcUrl}`);
  console.log(`  👤 Relayer Wallet : ${wallet.address}`);
  console.log(`  📜 Target Contract : ${contractAddress}`);

  // Helper: Submit pulse to contract
  async function transmitPulse(payload: PulsePayload, sourceLabel: string) {
    try {
      const proofHash = payload.proofHash || ethers.keccak256(ethers.toUtf8Bytes(`worker_pulse_${Date.now()}`));
      console.log(`\n⏳ Transmitting pulse [Source: ${sourceLabel}] (T=${payload.T}, I=${payload.I}, F=${payload.F})...`);

      // Dynamic Gas Bump for Sepolia reliability
      const feeData = await provider.getFeeData();
      const txOptions: ethers.Overrides = {};
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        txOptions.maxFeePerGas = (feeData.maxFeePerGas * 120n) / 100n; // +20% buffer
        txOptions.maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas * 120n) / 100n;
      }

      const tx = await contract.pulseResonance(payload.T, payload.I, payload.F, proofHash, txOptions);
      console.log(`  🚀 Tx Sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`  ✅ Mined in Block ${receipt.blockNumber} (Gas Used: ${receipt.gasUsed.toString()})`);
    } catch (err: any) {
      console.error(`  ❌ Transmission Failed [${sourceLabel}]:`, err.message || err);
    }
  }

  // --- 1. File Watcher Setup ---
  const queueDir = path.resolve("data/queue");
  if (!fs.existsSync(queueDir)) {
    fs.mkdirSync(queueDir, { recursive: true });
  }

  console.log(`  📁 Watching folder  : ${queueDir}`);

  async function processQueue() {
    const files = fs.readdirSync(queueDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(queueDir, file);
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        const validated = PulsePayloadSchema.parse(parsed);

        await transmitPulse(validated, file);
      } catch (err: any) {
        console.error(`  ⚠️ Skipped invalid queue file ${file}:`, err.message);
      } finally {
        fs.unlinkSync(filePath); // Cleanup processed payload file
      }
    }
  }

  // Initial queue processing pass
  await processQueue();

  // Watch for new files
  fs.watch(queueDir, async (eventType, filename) => {
    if (eventType === "rename" && filename && filename.endsWith(".json")) {
      const filePath = path.join(queueDir, filename);
      if (fs.existsSync(filePath)) {
        await processQueue();
      }
    }
  });

  // --- 2. Optional Interval/Heartbeat Timer Mode ---
  const intervalArg = process.argv.find((arg) => arg.startsWith("--interval="));
  const intervalSec = intervalArg
    ? parseInt(intervalArg.split("=")[1], 10)
    : process.env.WORKER_INTERVAL_SEC
    ? parseInt(process.env.WORKER_INTERVAL_SEC, 10)
    : 0;

  if (intervalSec > 0) {
    console.log(`  ⏱️ Timer Heartbeat  : Active (Every ${intervalSec} seconds)`);
    setInterval(async () => {
      const mockPulse: PulsePayload = {
        T: Math.floor(Math.random() * 20) + 75, // 75..95
        I: Math.floor(Math.random() * 20) + 75, // 75..95
        F: Math.floor(Math.random() * 10) + 1,   // 1..10
      };
      await transmitPulse(mockPulse, "timer-heartbeat");
    }, intervalSec * 1000);
  }

  console.log(`\n📡 Worker actively listening... Press Ctrl+C to stop.`);
}

main().catch((err) => {
  console.error("💥 Worker Fatal Error:", err);
  process.exit(1);
});
