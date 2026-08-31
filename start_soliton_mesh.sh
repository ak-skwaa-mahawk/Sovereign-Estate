#!/usr/bin/env bash

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_DIR" || exit 1

LOG_DIR="$BASE_DIR/logs"
mkdir -p "$LOG_DIR"

echo "=================================================="
echo "   SOLITON MESH ORCHESTRATOR STARTUP"
echo "=================================================="

echo "[1/6] Terminating existing server/watcher processes..."
pkill -9 -f "synthesis_server" 2>/dev/null
pkill -9 -f "watch_ledger" 2>/dev/null
pkill -9 -f "peer_node" 2>/dev/null
sleep 1

if [ -z "$XAI_API_KEY" ]; then
    echo "[WARNING] XAI_API_KEY is not set."
fi

echo "[2/6] Starting synthesis_server.ts on port 3000..."
npx tsx synthesis_server.ts > "$LOG_DIR/synthesis_server.log" 2>&1 &
echo $! > "$LOG_DIR/synthesis_server.pid"

echo "[3/6] Starting peer_node.py on WebSocket port 4001..."
python3 -u peer_node.py > "$LOG_DIR/peer_4001.log" 2>&1 &
echo $! > "$LOG_DIR/peer_4001.pid"

echo "[4/6] Starting peer_node_4002.py on WebSocket port 4002..."
python3 -u peer_node_4002.py > "$LOG_DIR/peer_4002.log" 2>&1 &
echo $! > "$LOG_DIR/peer_4002.pid"

echo "[5/6] Starting watch_ledger.py background daemon..."
python3 -u watch_ledger.py > "$LOG_DIR/watcher.log" 2>&1 &
echo $! > "$LOG_DIR/watcher.pid"

sleep 2
echo "[6/6] Executing initial gossip broadcast cycle..."
python3 -u gossip_broadcaster.py

echo "=================================================="
echo "   SOLITON MESH SERVICES ACTIVE"
echo "   - Synthesis API: http://localhost:3000/synthesize"
echo "   - Peer Node 4001: ws://localhost:4001"
echo "   - Peer Node 4002: ws://localhost:4002"
echo "=================================================="
