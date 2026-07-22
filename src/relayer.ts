import { ethers } from "ethers";

const AGLL_ORACLE_ABI = [
  "function pulseResonance(uint256 T, uint256 I, uint256 F, bytes32 proofHash) external",
  "function cycleCount() view returns (uint256)",
  "event OraclePulse(uint256 indexed cycle, uint256 T, uint256 I, uint256 F, uint256 resonance, bytes32 indexed proofHash, uint256 timestamp)"
];

export interface RelayerConfig {
  rpcUrl: string;
  privateKey: string;
  oracleAddress: string;
}

export class OracleRelayer {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private oracleContract: ethers.Contract;

  constructor(config: RelayerConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.oracleContract = new ethers.Contract(config.oracleAddress, AGLL_ORACLE_ABI, this.wallet);
  }

  static fromEnv(): OracleRelayer {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.RELAYER_PRIVATE_KEY;
    const oracleAddress = process.env.AGLL_ORACLE_ADDRESS;

    if (!rpcUrl || !privateKey || !oracleAddress) {
      throw new Error(
        "[Relayer Error] Missing required environment variables: RPC_URL, RELAYER_PRIVATE_KEY, or AGLL_ORACLE_ADDRESS."
      );
    }

    return new OracleRelayer({ rpcUrl, privateKey, oracleAddress });
  }

  async submitPulse(T: number, I: number, F: number, rawPayload: string) {
    if (T + I + F > 300) {
      console.error(`[Relayer] Invalid parameters: T(${T}) + I(${I}) + F(${F}) exceeds 300.`);
      return null;
    }

    const proofHash = ethers.keccak256(ethers.toUtf8Bytes(rawPayload));

    try {
      console.log(`[Relayer] Submitting pulse: T=${T}, I=${I}, F=${F}`);
      const tx = await this.oracleContract.pulseResonance(T, I, F, proofHash);
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error("[Relayer] Error submitting pulse:", error);
      throw error;
    }
  }

  listenToPulses(onPulse: (eventData: any) => void) {
    this.oracleContract.on("OraclePulse", (cycle, T, I, F, resonance, proofHash, timestamp) => {
      onPulse({
        cycle: cycle.toString(),
        T: T.toString(),
        I: I.toString(),
        F: F.toString(),
        resonance: (Number(resonance) / 10000).toFixed(4),
        proofHash,
        timestamp: new Date(Number(timestamp) * 1000).toISOString()
      });
    });
  }
}
