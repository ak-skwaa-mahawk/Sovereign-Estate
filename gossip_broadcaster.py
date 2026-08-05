import argparse
import asyncio
import json
import os
import sys
import websockets

DEFAULT_PEERS = {
    "4001": "ws://localhost:4001",
    "4002": "ws://localhost:4002",
    "northstar": "wss://northstar.soliton.registry:4001"
}

FALLBACK_ENDPOINT = "ws://localhost:4001"
LEDGER_PATH = os.path.abspath("ledger.json")

def load_latest_witness():
    if not os.path.exists(LEDGER_PATH):
        return None
    try:
        with open(LEDGER_PATH, "r") as f:
            data = json.load(f)
            return data[-1] if isinstance(data, list) else data
    except Exception as e:
        print(f"[LEDGER ERROR] {e}")
        return None

async def send_gossip(uri, payload):
    target_uri = uri
    is_fallback = False

    try:
        async with websockets.connect(target_uri, open_timeout=3) as websocket:
            await websocket.send(json.dumps(payload))
            response = await websocket.recv()
            hash_short = payload.get("payload", {}).get("witness_hash", "N/A")[:8]
            print(f"[GOSSIP SUCCESS] Broadcasted hash {hash_short}... -> {target_uri}")
            return
    except Exception as e:
        if "northstar.soliton.registry" in uri:
            print(f"[GOSSIP REDIRECT] Target {uri} unreachable ({type(e).__name__}). Rerouting to local fallback {FALLBACK_ENDPOINT}...")
            target_uri = FALLBACK_ENDPOINT
            is_fallback = True
        else:
            print(f"[GOSSIP UNREACHABLE] Peer {uri} -> {type(e).__name__}")
            return

    if is_fallback:
        try:
            async with websockets.connect(target_uri, open_timeout=3) as websocket:
                await websocket.send(json.dumps(payload))
                response = await websocket.recv()
                hash_short = payload.get("payload", {}).get("witness_hash", "N/A")[:8]
                print(f"[GOSSIP SUCCESS (FALLBACK)] Broadcasted hash {hash_short}... -> {target_uri} [re-routed from remote]")
        except Exception as e:
            print(f"[GOSSIP FALLBACK FAILED] {target_uri} -> {type(e).__name__}")

def parse_target(target_arg):
    if not target_arg or target_arg.lower() == "all":
        return list(DEFAULT_PEERS.values())
    
    if target_arg in DEFAULT_PEERS:
        return [DEFAULT_PEERS[target_arg]]
    
    if target_arg.startswith("ws://") or target_arg.startswith("wss://"):
        return [target_arg]
    
    if target_arg.isdigit():
        return [f"ws://localhost:{target_arg}"]

    print(f"[CLI ERROR] Unrecognized target '{target_arg}'. Use 4001, 4002, northstar, all, or a full ws:// URI.")
    sys.exit(1)

async def main():
    parser = argparse.ArgumentParser(description="Soliton Mesh Gossip Broadcaster")
    parser.add_argument(
        "-t", "--target",
        type=str,
        default="all",
        help="Target peer (e.g. 4001, 4002, northstar, all, or custom ws:// URI)"
    )
    args = parser.parse_args()

    targets = parse_target(args.target)

    witness = load_latest_witness()
    if not witness:
        print("[GOSSIP ERROR] No valid witness record found in ledger.")
        return

    packet = {
        "type": "GOSSIP_WITNESS_ANNOUNCE",
        "node_id": witness.get("lineage", "UNKNOWN_NODE"),
        "payload": witness
    }

    print(f"\n=== Soliton Mesh Gossip Broadcast Targets ({len(targets)}) ===")
    tasks = [send_gossip(uri, packet) for uri in targets]
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
