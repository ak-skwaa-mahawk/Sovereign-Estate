import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;
const LEDGER_PATH = path.resolve("./ledger.json");

app.use(express.json());

function readLedger() {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  const raw = fs.readFileSync(LEDGER_PATH, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeLedger(data: any) {
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function generateWitnessHash(payload: any): string {
  const serialized = JSON.stringify({
    uei: payload.uei,
    coordinates: payload.coordinates,
    lineage: payload.lineage,
    aggregates: payload.aggregates,
    timestamp: payload.timestamp
  });
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

app.get("/ledger", (_req: Request, res: Response) => {
  res.json(readLedger());
});

app.get("/synthesize", async (_req: Request, res: Response) => {
  const ledger = readLedger();
  if (!ledger || ledger.length === 0) {
    return res.status(404).json({ error: "Ledger empty or missing" });
  }

  const witness = ledger[ledger.length - 1];
  const uei = witness.uei || "UNKNOWN";
  const lineage = witness.lineage || "UNKNOWN";
  const aggregates = witness.aggregates || {};
  const lat = witness.coordinates?.lat;
  const lon = witness.coordinates?.lon;
  const hash = witness.witness_hash || "N/A";

  const prompt = `Perform a concise witness audit for record UEI ${uei} (${lineage}).
Scalar Aggregates:
- Vitality: ${aggregates.vitality}
- Epsilon_d: ${aggregates.epsilon_d}
- Coherence: ${aggregates.coherence}
Location: (${lat}, ${lon})
Witness Hash: ${hash}`;

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return res.json({
      witness_hash: hash,
      synthesis: `**Ledger Witness Audit: ${uei}**\n\n- **Lineage/Location**: ${lineage} @ (${lat}, ${lon})\n- **Scalar Aggregates**:\n  - vitality: ${aggregates.vitality?.toFixed(3)}\n  - epsilon_d: ${aggregates.epsilon_d?.toFixed(3)}\n  - coherence: ${aggregates.coherence?.toFixed(4)}\n\n**State synthesis**: ${
        aggregates.coherence > 0.5 ? "Coherent active state." : "Decohered witness remnant."
      }`
    });
  }

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "grok-2-1212",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data: any = await response.json();
    if (!response.ok) {
      console.error("[GROK API ERROR]", data);
      return res.status(response.status).json({ error: "xAI API Error", details: data });
    }

    const synthesisText = data.choices?.[0]?.message?.content || "No response generated";
    res.json({
      witness_hash: hash,
      synthesis: synthesisText
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to communicate with Grok API", details: err.message });
  }
});

app.post("/recohere", (req: Request, res: Response) => {
  const ledger = readLedger();
  if (!ledger || ledger.length === 0) {
    return res.status(404).json({ error: "Ledger empty or missing" });
  }

  const previousWitness = ledger[ledger.length - 1];
  const targetCoherence = typeof req.body?.coherence === "number" ? req.body.coherence : 1.0;
  const targetEpsilon = typeof req.body?.epsilon_d === "number" ? req.body.epsilon_d : 0.0;
  const timestamp = new Date().toISOString();

  const newSnapshot = {
    uei: previousWitness.uei,
    coordinates: previousWitness.coordinates,
    lineage: previousWitness.lineage,
    aggregates: {
      vitality: previousWitness.aggregates?.vitality || 16.0,
      epsilon_d: targetEpsilon,
      coherence: targetCoherence
    },
    witness_only: previousWitness.witness_only ?? true,
    timestamp: timestamp,
    witness_hash: ""
  };

  newSnapshot.witness_hash = generateWitnessHash(newSnapshot);

  ledger.push(newSnapshot);
  writeLedger(ledger);

  console.log(`[SOLITON NODE] Appended snapshot #${ledger.length} for ${newSnapshot.uei} -> Hash: ${newSnapshot.witness_hash.slice(0, 8)}...`);

  res.json({
    status: "RECOHERED_SNAPSHOT_APPENDED",
    total_records: ledger.length,
    message: `New state snapshot appended for ${newSnapshot.uei}`,
    record: newSnapshot
  });
});

app.listen(PORT, () => {
  console.log(`[SOLITON NODE] Synthesis server active on http://localhost:${PORT}`);
});
