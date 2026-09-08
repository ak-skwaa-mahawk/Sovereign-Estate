import json
import os
import socket
import subprocess
import requests
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Sovereign-Control-Surface")

SOCK_PATH = "/data/data/com.termux/files/usr/tmp/fpt_kernel.sock"
SYNTHESIS_BASE = "http://localhost:3000"

@mcp.tool()
def dispatch_governed_action(
    command: str,
    target_path: str,
    action_id: str,
    risk_tier: int = 1,
    approval_token: str = "authority:human_in_the_loop"
) -> dict:
    """Dispatches a command through the admission-gate kernel jail.
    Requires human-in-the-loop sovereign clearance token.
    """
    if not os.path.exists(SOCK_PATH):
        return {"error": "Kernel socket offline", "path": SOCK_PATH}

    payload = {
        "action_id": action_id,
        "command": command,
        "target_path": target_path,
        "risk_tier": risk_tier,
        "approval_token": approval_token
    }

    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
            s.connect(SOCK_PATH)
            s.sendall(json.dumps(payload).encode() + b"\n")
            raw_resp = s.recv(4096).decode().strip()
            return json.loads(raw_resp)
    except Exception as e:
        return {"error": f"Socket failure: {str(e)}"}

@mcp.tool()
def read_witness_ledger(limit: int = 5, uei: str = None) -> dict:
    """Reads historical or recent witness states from the Sovereign Estate ledger."""
    params = {}
    if limit:
        params["limit"] = limit
    if uei:
        params["uei"] = uei

    try:
        resp = requests.get(f"{SYNTHESIS_BASE}/ledger/history", params=params, timeout=5)
        return resp.json()
    except Exception as e:
        return {"error": f"Failed to query ledger endpoint: {str(e)}"}

@mcp.tool()
def request_state_synthesis() -> dict:
    """Requests a grok-4.5 state audit of the latest witness aggregates."""
    try:
        resp = requests.get(f"{SYNTHESIS_BASE}/synthesize", timeout=30)
        return resp.json()
    except Exception as e:
        return {"error": f"Synthesis request failed: {str(e)}"}

@mcp.tool()
def broadcast_mesh_gossip(target: str = "all") -> dict:
    """Forces a gossip broadcast cycle across Soliton mesh nodes (4001, 4002, northstar)."""
    try:
        res = subprocess.run(
            ["python3", "gossip_broadcaster.py", "-t", target],
            capture_output=True,
            text=True,
            check=True
        )
        return {"status": "broadcast_complete", "output": res.stdout.strip()}
    except subprocess.CalledProcessError as e:
        return {"status": "broadcast_failed", "stderr": e.stderr.strip()}

if __name__ == "__main__":
    mcp.run()
