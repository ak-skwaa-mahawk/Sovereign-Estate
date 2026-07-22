# Sovereign Manifold

Full-stack edge-governance ledger control console and vessel bridge for the **FPT-Ω Synara Class vessel**.

---

## 🏛️ System Architecture

```
[Raw Telemetry Input]
       │
       ▼
[Feedback_processor_theory/parser_outputs]
       │
       ▼ (telemetry-pipe.sh)
[Sovereign-Estate-App/data/queue]
       │
       ▼
[oracle-worker.ts] ──► [Embedded Ganache EVM Node]
                            │ (data/ganache_db)
                            ▼
                     [AGLLOracle.sol Contract]
                            │
                            ▼ (Paginated getLogs + Fallback RPC)
                     [server/routes/oracle.ts State Cache]
                            │
                            ▼ (REST API /api/oracle/state)
                     [OracleResonanceHUD / UI Console]
                       ├── Multi-Metric Recharts Visualizer
                       └── Real-Time Alert Engine (<0.8000 Resonance / >20% Friction)
```

The system architecture forms an end-to-end telemetry ingestion, EVM ledger indexing, and real-time visualization pipeline:

1. **Telemetry Pipeline**: Raw vessel sensors output telemetry through parser scripts into `data/queue`.
2. **Oracle Worker**: `oracle-worker.ts` processes incoming queue files and submits verified state transactions to the embedded EVM node.
3. **EVM Ledger**: An embedded Ganache node running on `http://127.0.0.1:8545` executes state transitions on `AGLLOracle.sol` with persistent state stored in `data/ganache_db`.
4. **Paginated Hydration**: Backend service `server/routes/oracle.ts` queries contract logs in 2,000-block chunks with automatic primary and fallback RPC retry logic.
5. **HUD & Console UI**: The React client fetches state via `/api/oracle/state` and renders responsive telemetry metrics, interactive spatial hull models, and real-time alert triggers.

---

## ⚙️ Local Ganache EVM Setup & Usage

### 1. Embedded EVM Engine
The system utilizes an embedded Ganache EVM instance listening on `http://127.0.0.1:8545` (Chain ID `1337`).

* **State Persistence**: The EVM state is automatically saved to and loaded from `data/ganache_db`. State persists across process restarts.
* **Smart Contract**: `AGLLOracle.sol` is deployed at startup if no existing instance is detected.

### 2. Log Hydration & Failover
On startup and during periodic synchronization, `hydrateStateFromChain` performs chunked log indexing:

* **Chunk Size**: Queries event logs in blocks of `2000` to prevent RPC query timeouts.
* **Failover Logic**: If the primary RPC endpoint fails or drops connection, the worker automatically switches to the secondary fallback RPC endpoint before re-attempting the query.

### 3. Queue Processor
To manually queue telemetry payload for contract ingestion:

```bash
# Push payload to queue directory
echo '{"cycle": 7, "resonance": 0.9600, "friction": 0.042}' > data/queue/telemetry-$(date +%s).json
```

---

## ⌨️ Global Keyboard Shortcuts

The app includes a global hotkey engine. Press <kbd>?</kbd> anywhere in the application to display the **Shortcuts & Hotkeys Guide** modal (equipped with instant search filtering).

| Shortcut | Action / Target | Description |
|---|---|---|
| <kbd>Ctrl</kbd> + <kbd>T</kbd> | View Toggle | Switch between **Sovereign Council Dashboard** and **FPT-Ω Vessel Bridge** |
| <kbd>Shift</kbd> + <kbd>R</kbd> | Nanite Repair | Execute **Nanite Structural Restoration** routine across damaged hull zones |
| <kbd>Shift</kbd> + <kbd>L</kbd> | Batch Lock | Lock all diagnostic nodes currently exceeding the **85% stress threshold** |
| <kbd>Shift</kbd> + <kbd>U</kbd> | Batch Unlock | Unlock all currently locked diagnostic nodes in active selection |
| <kbd>?</kbd> | Hotkey Modal | Toggle the **Shortcuts & Hotkeys** interactive reference modal |
| <kbd>Esc</kbd> | Modal Dismiss | Dismiss active overlay dialogs, workspace deck, or shortcuts modal |

---

## 🚀 Operational Guidelines: Vessel Bridge Components

### 1. Sovereign Council Dashboard
* **Node Telemetry Matrix**: Displays node operational stress, thermal signatures, and resonance alignment.
* **Stress Threshold Safeguards**: Nodes reaching or exceeding `85%` stress must be locked via <kbd>Shift</kbd> + <kbd>L</kbd> or manual selection to prevent systemic cascade failure.
* **Nanite Restoration**: Triggering <kbd>Shift</kbd> + <kbd>R</kbd> applies nanite alloy re-alignment to restore structural integrity.

### 2. FPT-Ω Vessel Bridge
* **Spatial Hull Visualizer**: Interactive sector-by-sector view showing hull density, shielding, and kinetic dampener levels.
* **Sub-System Controls**: Direct control over propulsion matrix, power distribution nodes, and environmental scrubbers.

### 3. Oracle Resonance HUD
* **Recharts Visualizer**: Real-time rendering of historical resonance curves (e.g. latest cycle indexed at `0.9600` resonance).
* **Threshold Warning Engine**:
  * **Critical Anomaly**: Triggers automated warning banners when resonance drops below `0.8000`.
  * **Friction Warning**: Triggers alerts when internal friction exceeds `20%`.

### 4. Workspace Deck & Exports
* **Google Workspace Hub**: Launch integrated Workspace tools (Drive, Sheets, Docs, Gmail) for operational logging.
* **PDF State Certification**: Generate signed, downloadable PDF vessel status reports containing complete telemetry logs and node diagnostic summaries.

---

## 🛠️ Tech Stack & Dependencies

* **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Motion, D3.js
* **Backend**: Node.js, Express, `tsx`, `esbuild`
* **EVM & Smart Contracts**: Solidity (`AGLLOracle.sol`), Ganache EVM, Ethers.js
* **Persistence & Security**: Firebase Authentication, Firestore, client-side PDF generation (`jspdf`)

---

## 🚀 Quickstart Guide

```bash
# 1. Install dependencies
npm install

# 2. Launch development server (Express + Vite on port 3000)
npm run dev

# 3. Production Build & Start
npm run build
npm run start
```

---

## 📜 Governance & License

Sovereign Estate Control Architecture. Proprietary & Confidential.
