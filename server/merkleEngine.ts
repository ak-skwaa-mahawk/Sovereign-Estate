import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { MerkleTree } from "merkletreejs";

const DB_PATH = path.join(process.cwd(), "relayer.db");
let dbInstance: Database | null = null;

async function getDb(): Promise<Database> {
  if (!dbInstance) {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } else {
      dbInstance = new SQL.Database();
    }

    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS leaves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        commit_hash TEXT UNIQUE,
        ipfs_cid TEXT,
        leaf_hash TEXT,
        epoch_id INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS epochs (
        epoch_id INTEGER PRIMARY KEY AUTOINCREMENT,
        merkle_root TEXT,
        tx_hash TEXT,
        leaf_count INTEGER,
        anchored_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    saveDb();
  }
  return dbInstance;
}

function saveDb() {
  if (dbInstance) {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * Compute leaf hash: keccak256(commitHash || ipfsCid)
 */
export function computeLeafHash(commitHash: string, ipfsCid: string): string {
  return ethers.solidityPackedKeccak256(
    ["string", "string"],
    [commitHash, ipfsCid]
  );
}

/**
 * Queue incoming commit + CID into pending leaves table
 */
export async function queueLeaf(commitHash: string, ipfsCid: string) {
  const db = await getDb();
  const leafHash = computeLeafHash(commitHash, ipfsCid);
  
  try {
    db.run(
      "INSERT OR IGNORE INTO leaves (commit_hash, ipfs_cid, leaf_hash) VALUES (?, ?, ?)",
      [commitHash, ipfsCid, leafHash]
    );
    saveDb();
  } catch (err) {
    console.error("Error queuing leaf:", err);
  }
  return leafHash;
}

/**
 * Process pending leaves and seal into an Epoch Merkle Root
 */
export async function processEpochBatch(threshold: number = 8) {
  const db = await getDb();
  const res = db.exec("SELECT id, leaf_hash FROM leaves WHERE epoch_id IS NULL ORDER BY id ASC");

  if (!res.length || !res[0].values) {
    return { status: "pending", count: 0, threshold };
  }

  const pendingLeaves = res[0].values.map((row) => ({
    id: row[0] as number,
    leaf_hash: row[1] as string,
  }));

  if (pendingLeaves.length < threshold) {
    return { status: "pending", count: pendingLeaves.length, threshold };
  }

  const leafHashes = pendingLeaves.map((l) => l.leaf_hash);
  const tree = new MerkleTree(leafHashes, ethers.keccak256, { sortPairs: true });
  const merkleRoot = tree.getHexRoot();

  db.run("INSERT INTO epochs (merkle_root, leaf_count) VALUES (?, ?)", [
    merkleRoot,
    pendingLeaves.length,
  ]);
  
  const epochRes = db.exec("SELECT last_insert_rowid()");
  const newEpochId = epochRes[0].values[0][0] as number;

  for (const leaf of pendingLeaves) {
    db.run("UPDATE leaves SET epoch_id = ? WHERE id = ?", [newEpochId, leaf.id]);
  }

  saveDb();

  return {
    status: "anchored",
    epochId: newEpochId,
    merkleRoot,
    leafCount: pendingLeaves.length,
  };
}

/**
 * Generate cryptographic inclusion proof for a given commit hash
 */
export async function generateInclusionProof(commitHash: string) {
  const db = await getDb();
  
  // Find target leaf
  const leafRes = db.exec(`SELECT epoch_id, leaf_hash FROM leaves WHERE commit_hash = '${commitHash}'`);
  if (!leafRes.length || !leafRes[0].values.length) {
    return { status: "not_found", message: "Commit not found in database." };
  }

  const epochId = leafRes[0].values[0][0] as number | null;
  const targetLeafHash = leafRes[0].values[0][1] as string;

  if (!epochId) {
    return { status: "pending", message: "Commit is queued but not yet anchored in a sealed epoch." };
  }

  // Fetch epoch root
  const epochRes = db.exec(`SELECT merkle_root FROM epochs WHERE epoch_id = ${epochId}`);
  const merkleRoot = epochRes[0].values[0][0] as string;

  // Fetch all leaves belonging to this epoch to reconstruct tree
  const allLeavesRes = db.exec(`SELECT leaf_hash FROM leaves WHERE epoch_id = ${epochId} ORDER BY id ASC`);
  const leafHashes = allLeavesRes[0].values.map((row) => row[0] as string);

  const tree = new MerkleTree(leafHashes, ethers.keccak256, { sortPairs: true });
  const proof = tree.getHexProof(targetLeafHash);
  const isValid = tree.verify(proof, targetLeafHash, merkleRoot);

  return {
    status: "verified",
    commitHash,
    epochId,
    merkleRoot,
    leafHash: targetLeafHash,
    proof,
    isValid,
  };
}
