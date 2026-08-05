import asyncio
import json
import websockets

PORT = 4002
HOST = "0.0.0.0"

async def handler(websocket):
    peer_addr = websocket.remote_address
    print(f"[PEER 4002] Incoming connection from {peer_addr[0]}:{peer_addr[1]}")
    try:
        async for message in websocket:
            print(f"\n[PEER 4002] Received Gossip Packet ({len(message)} bytes):")
            try:
                data = json.loads(message)
                print(json.dumps(data, indent=2))
            except json.JSONDecodeError:
                print(f"Raw Message: {message}")
            
            ack = {"status": "received", "node": "peer_4002"}
            await websocket.send(json.dumps(ack))
    except websockets.exceptions.ConnectionClosed:
        print(f"[PEER 4002] Connection closed by {peer_addr[0]}:{peer_addr[1]}")
    except Exception as e:
        print(f"[PEER 4002 ERROR] {e}")

async def main():
    print(f"[PEER 4002] Starting Soliton Mesh WebSocket Listener on ws://{HOST}:{PORT}...")
    async with websockets.serve(handler, HOST, PORT):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[PEER 4002] Server shut down by user.")
