import asyncio
import json
import websockets

PORT = 4001
HOST = "0.0.0.0"

async def handler(websocket):
    peer_addr = websocket.remote_address
    print(f"[PEER 4001] Incoming connection from {peer_addr[0]}:{peer_addr[1]}")
    try:
        async for message in websocket:
            print(f"\n[PEER 4001] Received Gossip Packet ({len(message)} bytes):")
            try:
                data = json.loads(message)
                print(json.dumps(data, indent=2))
            except json.JSONDecodeError:
                print(f"Raw Message: {message}")
            
            # Send acknowledgement back to broadcaster
            ack = {"status": "received", "node": "peer_4001"}
            await websocket.send(json.dumps(ack))
    except websockets.exceptions.ConnectionClosed:
        print(f"[PEER 4001] Connection closed by {peer_addr[0]}:{peer_addr[1]}")
    except Exception as e:
        print(f"[PEER 4001 ERROR] {e}")

async def main():
    print(f"[PEER 4001] Starting Soliton Mesh WebSocket Listener on ws://{HOST}:{PORT}...")
    async with websockets.serve(handler, HOST, PORT):
        await asyncio.Future()  # Keep server running indefinitely

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[PEER 4001] Server shut down by user.")
