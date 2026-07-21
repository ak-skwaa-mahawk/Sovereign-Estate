#!/bin/bash

echo "🌌 [ORCHESTRATOR]: Initializing Sovereign-Estate execution stack..."

echo "🧹 Clearing port 3000 namespace..."
pkill -f tsx
pkill -f node

echo "🚀 Booting up HTTP + WebSockets server..."
npm run dev &
SERVER_PID=$!

# Allow 4 seconds for Node/tsx to initialize and bind port 3000
sleep 4

echo "📡 Launching telemetry load injector..."
python3 ~/Turbo_Takeoff/tools/scenario_injector.py &
INJECTOR_PID=$!

trap "echo '🛑 Stopping stack...'; kill $SERVER_PID $INJECTOR_PID; exit" INT TERM
wait
