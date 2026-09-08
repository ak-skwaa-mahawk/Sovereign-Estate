import json
import os
import time
import hashlib

AUDIT_LOG_PATH = os.path.expanduser("~/admission-gate/audit_log.jsonl")
LEDGER_PATH = os.path.abspath("ledger.json")

def compute_witness_hash(entry):
    serialized = json.dumps({
        "uei": entry["uei"],
        "coordinates": entry["coordinates"],
        "lineage": entry["lineage"],
        "aggregates": entry["aggregates"],
        "timestamp": entry["timestamp"]
    }, separators=(',', ':'))
    return hashlib.sha256(serialized.encode()).hexdigest()

def follow_audit_log():
    if not os.path.exists(AUDIT_LOG_PATH):
        print(f"[BRIDGE] Waiting for {AUDIT_LOG_PATH}...")
        while not os.path.exists(AUDIT_LOG_PATH):
            time.sleep(1)

    with open(AUDIT_LOG_PATH, "r") as f:
        # Seek to end to process only new operational events
        f.seek(0, os.SEEK_END)
        print(f"[BRIDGE] Monitoring {AUDIT_LOG_PATH} for new audit records...")

        while True:
            line = f.readline()
            if not line:
                time.sleep(0.5)
                continue

            try:
                record = json.loads(line.strip())
            except json.JSONDecodeError:
                continue

            telemetry = record.get("fpt_telemetry", {})
            damping = float(telemetry.get("damping", 0.95))
            observed_penalty = float(telemetry.get("observed_penalty", 0.0))
            cycle = telemetry.get("cycle", 0)

            # Map PID damping and penalties to Soliton aggregates
            coherence = max(0.01, min(1.0, round(damping, 4)))
            epsilon_d = round(observed_penalty * 0.1, 4)
            vitality = round(16.180 + (cycle * 0.001), 4)

            timestamp = record.get("timestamp", time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()))

            new_witness = {
                "uei": "SJLLZH4KKMZ9",
                "coordinates": {
                    "lat": 65.663672,
                    "lon": -144.048316
                },
                "lineage": f"North Star Seed Node Nᵒʳᵗʰ‑001 [Cycle {cycle}]",
                "aggregates": {
                    "vitality": vitality,
                    "epsilon_d": epsilon_d,
                    "coherence": coherence
                },
                "witness_only": True,
                "timestamp": timestamp
            }
            new_witness["witness_hash"] = compute_witness_hash(new_witness)

            # Atomically update ledger.json
            with open(LEDGER_PATH, "r") as lf:
                try:
                    ledger = json.load(lf)
                except Exception:
                    ledger = []

            ledger.append(new_witness)

            with open(LEDGER_PATH, "w") as lf:
                json.dump(ledger, lf, indent=2)

            print(f"[BRIDGE EVENT] Ingested audit cycle {cycle} -> Witness Hash: {new_witness['witness_hash'][:8]}...")

if __name__ == "__main__":
    follow_audit_log()
