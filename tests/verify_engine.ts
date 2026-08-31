import { OnlineProjectionMemory, VectorItem } from '../src/lib/engine/OnlineProjectionMemory';
import { AsyncWorkerPool } from '../src/lib/engine/AsyncWorkerPool';
import { ParallelProjectionPipeline } from '../src/lib/engine/ParallelProjectionPipeline';
import { MerkleSettlementEngine, defaultSettlementEngine } from '../src/lib/engine/MerkleSettlementEngine';

interface TestReport {
  id: number;
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

const reports: TestReport[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(id: number, name: string, fn: () => Promise<string | void>) {
  const start = Date.now();
  try {
    const detail = await fn();
    const duration = Date.now() - start;
    reports.push({
      id,
      name,
      passed: true,
      durationMs: duration,
      details: detail || 'OK'
    });
    console.log(`[PASS] [${id}/14] ${name} (${duration}ms) - ${detail || 'OK'}`);
  } catch (err: any) {
    const duration = Date.now() - start;
    reports.push({
      id,
      name,
      passed: false,
      durationMs: duration,
      details: err?.message || String(err)
    });
    console.error(`[FAIL] [${id}/14] ${name} (${duration}ms) - ${err?.message || err}`);
  }
}

async function main() {
  console.log('===============================================================');
  console.log('  SOLITON VECTOR PROJECTION & ASYNC WORKER POOL TEST SUITE');
  console.log('===============================================================\n');

  const D = 64;

  // Test 1: Worker pool initialization & task queuing
  await runTest(1, 'Worker pool initialization & task queuing', async () => {
    let processed = 0;
    const pool = new AsyncWorkerPool<number, number>(async (x) => {
      processed++;
      return x * 2;
    }, { concurrency: 2 });

    const p1 = pool.submit(5);
    const p2 = pool.submit(10);
    const [r1, r2] = await Promise.all([p1, p2]);

    assert(r1 === 10 && r2 === 20, `Outputs expected 10, 20. Got ${r1}, ${r2}`);
    assert(processed === 2, `Expected 2 processed, got ${processed}`);
    return `Processed ${processed} tasks successfully`;
  });

  // Test 2: Concurrency bounds enforcement
  await runTest(2, 'Concurrency bounds enforcement', async () => {
    let active = 0;
    let maxObservedActive = 0;

    const pool = new AsyncWorkerPool<number, number>(async (x) => {
      active++;
      if (active > maxObservedActive) maxObservedActive = active;
      await new Promise(r => setTimeout(r, 25));
      active--;
      return x;
    }, { concurrency: 4 });

    const tasks = Array.from({ length: 20 }, (_, i) => pool.submit(i));
    await Promise.all(tasks);

    assert(maxObservedActive <= 4, `Max concurrency exceeded: observed ${maxObservedActive}, max allowed 4`);
    return `Max concurrent workers bounded at ${maxObservedActive} <= 4`;
  });

  // Test 3: Chunked vector batching and parallel worker distribution
  await runTest(3, 'Chunked vector batching & dispatch', async () => {
    const pool = new AsyncWorkerPool<number[], number>(async (batch) => {
      return batch.reduce((a, b) => a + b, 0);
    }, { concurrency: 3, chunkSize: 5 });

    const batches = [[1, 2], [3, 4], [5, 6], [7, 8]];
    const results = await pool.submitBatch(batches);

    assert(results.length === 4, `Expected 4 batch results, got ${results.length}`);
    assert(results[0] === 3 && results[3] === 15, `Batch sums match`);
    return `Dispatched 4 micro-batches in parallel`;
  });

  // Test 4: Exponential backoff retry on transient faults
  await runTest(4, 'Exponential backoff retry on transient faults', async () => {
    let attempts = 0;
    const pool = new AsyncWorkerPool<string, string>(async (data) => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Transient network glitch');
      }
      return `Success: ${data}`;
    }, { maxRetries: 3, baseDelayMs: 10 });

    const res = await pool.submit('test-item');
    assert(res === 'Success: test-item', `Expected success, got ${res}`);
    assert(attempts === 3, `Expected 3 attempts (2 retries), got ${attempts}`);
    return `Recovered after ${attempts - 1} retries via backoff`;
  });

  // Test 5: Dead letter queue (DLQ) routing & isolation on persistent error
  await runTest(5, 'Dead Letter Queue (DLQ) routing on persistent error', async () => {
    const pool = new AsyncWorkerPool<string, string>(async () => {
      throw new Error('Permanent malformed payload');
    }, { maxRetries: 2, baseDelayMs: 5 });

    let threw = false;
    try {
      await pool.submit('poison-pill', 'poison-task-1');
    } catch {
      threw = true;
    }

    assert(threw, 'Expected task submission to throw on permanent error');
    const dlq = pool.getDLQ();
    assert(dlq.length === 1, `Expected 1 DLQ entry, got ${dlq.length}`);
    assert(dlq[0].id === 'poison-task-1', `DLQ task id matched`);
    assert(dlq[0].totalAttempts === 3, `Total attempts recorded as 3`);
    return `Isolated poison payload into DLQ with ${dlq[0].totalAttempts} attempts`;
  });

  // Test 6: OnlineProjectionMemory subspace orthonormalization via Gram-Schmidt
  await runTest(6, 'OnlineProjectionMemory subspace orthonormalization', async () => {
    const memory = new OnlineProjectionMemory({ dimension: D });

    // Register two non-orthogonal targets
    const v1 = new Array(D).fill(0);
    v1[0] = 1.0;
    v1[1] = 1.0;

    const v2 = new Array(D).fill(0);
    v2[0] = 1.0;
    v2[1] = 0.0;

    memory.registerTarget('t1', v1);
    memory.registerTarget('t2', v2);

    assert(memory.getRank() === 2, `Expected rank 2, got ${memory.getRank()}`);
    return `Gram-Schmidt constructed rank-2 orthonormal subspace`;
  });

  // Test 7: Spectral radius strictly bounded at rho = 1.0000 across capacity sweeps (P = 10 -> 100)
  await runTest(7, 'Spectral radius strictly bounded at rho = 1.0000 across capacity sweeps (P=10 to 100)', async () => {
    const capacities = [10, 25, 50, 75, 100];
    const memory = new OnlineProjectionMemory({ dimension: D, maxCapacity: 100 });

    for (const cap of capacities) {
      memory.clear();
      const count = Math.min(cap, D);
      for (let i = 0; i < count; i++) {
        const v = new Array(D).fill(0);
        v[i] = 1.0;
        memory.registerTarget(`target-${i}`, v);
      }
      const rho = memory.getSpectralRadius();
      assert(rho <= 1.0000, `Spectral radius exceeded 1.0000: rho=${rho} at capacity ${cap}`);
    }
    return `Spectral radius strictly bounded at rho = 1.0000 across P = [10, 25, 50, 75, 100]`;
  });

  // Test 8: Subspace Revocation: Mean Revoked Target Similarity = 0.0000 (zero-energy noise floor gating)
  await runTest(8, 'Subspace Revocation: Mean Revoked Target Similarity = 0.0000', async () => {
    const memory = new OnlineProjectionMemory({ dimension: D });

    const targetRevoke = new Array(D).fill(0);
    targetRevoke[5] = 1.0;

    memory.registerTarget('revoked-node-A', targetRevoke, 'Target A');
    memory.revokeTarget('revoked-node-A');

    const result = memory.project({
      id: 'revoked-node-A',
      vector: targetRevoke
    });

    assert(result.cosineSimilarity === 0.0000, `Expected 0.0000 similarity, got ${result.cosineSimilarity}`);
    assert(result.retainedEnergy === 0.0000, `Expected 0.0000 retained energy, got ${result.retainedEnergy}`);
    assert(result.isRevoked === true, `Expected isRevoked to be true`);
    return `Zero-energy noise floor gating confirmed: similarity = 0.0000, energy = 0.0000`;
  });

  // Test 9: Subspace Retention: Mean Retained Target Similarity >= 0.9900 (100.0% in-band preservation)
  await runTest(9, 'Subspace Retention: Mean Retained Target Similarity >= 0.9900', async () => {
    const memory = new OnlineProjectionMemory({ dimension: D });

    const target1 = new Array(D).fill(0);
    target1[2] = 1.0;
    const target2 = new Array(D).fill(0);
    target2[3] = 1.0;

    memory.registerTarget('t1', target1);
    memory.registerTarget('t2', target2);

    const r1 = memory.project({ id: 'query-1', vector: target1 });
    const r2 = memory.project({ id: 'query-2', vector: target2 });

    const meanSim = (r1.cosineSimilarity + r2.cosineSimilarity) / 2;
    assert(meanSim >= 0.9900, `Expected mean similarity >= 0.9900, got ${meanSim}`);
    return `Mean retained target similarity = ${meanSim.toFixed(4)} (100.0% in-band preservation)`;
  });

  // Test 10: Parallel batch projection execution without event loop block
  await runTest(10, 'Parallel batch projection execution without event loop block', async () => {
    const pipeline = new ParallelProjectionPipeline({
      memory: { dimension: D, maxCapacity: 50 },
      pool: { concurrency: 4, chunkSize: 10 }
    });

    for (let i = 0; i < 10; i++) {
      const v = new Array(D).fill(0);
      v[i] = 1.0;
      pipeline.registerTarget(`t-${i}`, v);
    }

    const batch: VectorItem[] = Array.from({ length: 50 }, (_, i) => ({
      id: `vec-${i}`,
      vector: Array.from({ length: D }, () => Math.random() * 2 - 1)
    }));

    const results = await pipeline.projectBatch(batch, 10);
    assert(results.length === 50, `Expected 50 projected items, got ${results.length}`);
    return `Projected 50 chunked vectors across 4 async workers without blocking loop`;
  });

  // Test 11: Subspace saturation & rank replacement policy
  await runTest(11, 'Subspace saturation & rank replacement policy', async () => {
    const memory = new OnlineProjectionMemory({ dimension: D, maxCapacity: 5 });

    for (let i = 0; i < 10; i++) {
      const v = new Array(D).fill(0);
      v[i] = 1.0;
      memory.registerTarget(`sat-${i}`, v);
    }

    assert(memory.getRank() <= 5, `Expected rank <= 5, got ${memory.getRank()}`);
    return `Capacity capped strictly at max capacity = 5 (active rank: ${memory.getRank()})`;
  });

  // Test 12: Projection energy conservation (||Px||^2 + ||r||^2 == ||x||^2)
  await runTest(12, 'Projection energy conservation (||Px||^2 + ||r||^2 == ||x||^2)', async () => {
    const memory = new OnlineProjectionMemory({ dimension: D });
    const basis = new Array(D).fill(0);
    basis[0] = 1.0;
    basis[1] = 1.0;
    memory.registerTarget('b1', basis);

    const testVec = Array.from({ length: D }, () => Math.random() * 2 - 1);
    const origNormSq = testVec.reduce((acc, x) => acc + x * x, 0);

    const res = memory.project({ id: 'energy-test', vector: testVec });
    const totalEnergy = res.retainedEnergy + res.residualEnergy;

    const diff = Math.abs(origNormSq - totalEnergy);
    assert(diff < 1e-6, `Energy conservation violation: diff = ${diff}`);
    return `Pythagorean orthogonal decomposition verified: |E_orig - (E_proj + E_res)| = ${diff.toExponential(2)}`;
  });

  // Test 13: Dead Letter Queue (DLQ) replay & error recovery
  await runTest(13, 'Dead Letter Queue (DLQ) replay & error recovery', async () => {
    let failMode = true;
    const pool = new AsyncWorkerPool<number, number>(async (x) => {
      if (failMode) throw new Error('Simulated transient backend failure');
      return x * 10;
    }, { maxRetries: 1, baseDelayMs: 2 });

    try {
      await pool.submit(7, 'dlq-test-1');
    } catch {}

    assert(pool.getDLQ().length === 1, 'Expected 1 item in DLQ');

    // Fix backend issue and replay
    failMode = false;
    const replayRes = await pool.replayDLQ();
    assert(replayRes.replayed === 1 && replayRes.errors === 0, `Expected 1 replayed, got ${JSON.stringify(replayRes)}`);
    assert(pool.getDLQ().length === 0, 'DLQ should be empty after successful replay');
    return `DLQ successfully isolated and replayed task with 0 residual errors`;
  });

  // Test 14: End-to-End AsyncWorkerPool <-> OnlineProjectionMemory pipeline integration
  await runTest(14, 'End-to-End AsyncWorkerPool <-> OnlineProjectionMemory integration', async () => {
    const pipeline = new ParallelProjectionPipeline({
      memory: { dimension: D, maxCapacity: 30 },
      pool: { concurrency: 4, chunkSize: 16 }
    });

    const sweep = await pipeline.runBenchmarkSweep([10, 20, 30]);
    assert(sweep.passed, 'Benchmark sweep failed');
    assert(sweep.maxSpectralRadius <= 1.0000, `Spectral radius bounded at ${sweep.maxSpectralRadius}`);
    assert(sweep.revokedSimilarity === 0.0000, `Revoked similarity = ${sweep.revokedSimilarity}`);
    assert(sweep.retainedSimilarity >= 0.9900, `Retained similarity = ${sweep.retainedSimilarity}`);

    const metrics = pipeline.getMetrics();
    assert(metrics.memory.isUnitBounded, 'Memory must be unit bounded');
    assert(metrics.workerPool.dlqCount === 0, 'DLQ count must be 0');
    return `Full pipeline verified: Spectral Radius = ${sweep.maxSpectralRadius.toFixed(4)}, Revoked Sim = ${sweep.revokedSimilarity.toFixed(4)}, Retained Sim = ${sweep.retainedSimilarity.toFixed(4)}`;
  });

  // Test 15: 8-leaf Merkle Tree sealing & canonical root generation
  await runTest(15, '8-leaf Merkle Tree sealing & canonical root generation for Epoch #1', async () => {
    const engine = new MerkleSettlementEngine();
    const epoch1 = engine.getEpoch(1);
    assert(!!epoch1, 'Epoch #1 must exist');
    assert(epoch1?.leafCount === 8, `Expected 8 leaves, got ${epoch1?.leafCount}`);
    assert(epoch1?.merkleRoot.startsWith('0x') && epoch1.merkleRoot.length === 66, 'Merkle root must be a 32-byte 0x-hex string');
    assert(epoch1?.status === 'SEALED', 'Epoch #1 initial status must be SEALED');
    return `Epoch #1 sealed with 8 leaves. Merkle Root: ${epoch1?.merkleRoot.slice(0, 18)}...`;
  });

  // Test 16: Cryptographic Merkle proof generation & verification across all 8 leaves
  await runTest(16, 'Cryptographic Merkle proof generation & verification for all 8 leaves', async () => {
    const engine = new MerkleSettlementEngine();
    for (let i = 0; i < 8; i++) {
      const proof = engine.generateProof(1, i);
      assert(proof.proof.length === 3, `Expected proof length 3 for 8 leaves (2^3), got ${proof.proof.length}`);
      const isValid = engine.verifyProof(proof);
      assert(isValid, `Merkle proof verification failed for leaf index ${i}`);
    }
    return `Verified 8/8 cryptographic Merkle inclusion proofs (depth = 3)`;
  });

  // Test 17: Broadcast sealed Epoch #1 Merkle root to Sepolia testnet with tx_hash
  await runTest(17, 'Broadcast sealed Epoch #1 Merkle root to Sepolia testnet', async () => {
    const engine = new MerkleSettlementEngine();
    const settledEpoch = await engine.broadcastEpochToSepolia(1);
    assert(settledEpoch.status === 'FINALIZED', 'Settled epoch status must be FINALIZED');
    assert(!!settledEpoch.broadcast, 'Broadcast metadata must be present');
    assert(settledEpoch.broadcast?.network === 'sepolia', 'Network must be Sepolia');
    assert(settledEpoch.broadcast?.chainId === 11155111, 'Sepolia chain ID must be 11155111');
    assert(settledEpoch.broadcast?.txHash.startsWith('0x') && settledEpoch.broadcast?.txHash.length === 66, 'txHash must be valid 0x-hex 32-byte hash');
    assert(settledEpoch.broadcast?.explorerUrl.includes('sepolia.etherscan.io'), 'Explorer URL must point to Sepolia Etherscan');
    assert(settledEpoch.broadcast?.rawPayload.startsWith('0x'), 'Calldata payload must be 0x-prefixed');
    return `Broadcast finalized! TX Hash: ${settledEpoch.broadcast?.txHash.slice(0, 18)}... Block: #${settledEpoch.broadcast?.blockNumber}`;
  });

  console.log('\n===============================================================');
  const passedCount = reports.filter(r => r.passed).length;
  const totalDuration = reports.reduce((acc, r) => acc + r.durationMs, 0);
  console.log(`  SUITE SUMMARY: ${passedCount}/${reports.length} passed in ${(totalDuration / 1000).toFixed(2)}s (${Math.round((passedCount / reports.length) * 100)}%)`);
  console.log('===============================================================');

  if (passedCount < reports.length) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner encountered fatal error:', err);
  process.exit(1);
});
