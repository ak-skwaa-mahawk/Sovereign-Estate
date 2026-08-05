#!/usr/bin/env bash

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$BASE_DIR/logs"

echo "Stopping Soliton Mesh background services..."

for pidfile in synthesis_server.pid peer_4001.pid peer_4002.pid watcher.pid; do
    if [ -f "$LOG_DIR/$pidfile" ]; then
        kill -9 "$(cat "$LOG_DIR/$pidfile")" 2>/dev/null
        rm -f "$LOG_DIR/$pidfile"
    fi
done

pkill -9 -f "synthesis_server" 2>/dev/null
pkill -9 -f "peer_node" 2>/dev/null
pkill -9 -f "watch_ledger" 2>/dev/null

echo "All Soliton Mesh background processes stopped."
