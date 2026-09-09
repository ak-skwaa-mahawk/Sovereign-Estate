import json
import os
import socket
import subprocess
import ctypes
import time
import asyncio
import requests
from mcp.server.mcpserver import MCPServer

mcp = MCPServer("Sovereign-Control-Surface")

SOCK_PATH = "/data/data/com.termux/files/usr/tmp/fpt_kernel.sock"
SYNTHESIS_BASE = "http://localhost:3000"
JIGGLER_LIB_PATH = "/data/data/com.termux/files/home/Jiggler/jiggler_native.so"

# ---------------------------------------------------------
# Native Jiggler C-FFI Structures
# ---------------------------------------------------------
class SovereignMetric(ctypes.Structure):
    _fields_ = [
        ("pose", ctypes.c_double * 3),          # [d, r, sigma_t]
        ("stability_score", ctypes.c_double),    # rho
        ("resonance_delta", ctypes.c_double),    # baseline intent
        ("timestamp", ctypes.c_uint64)
    ]

class DerivedMetric(ctypes.Structure):
    _fields_ = [
        ("optimized_resonance", ctypes.c_double),
        ("lifecycle_epoch", ctypes.c_uint64)
    ]

class GuardedOutput(ctypes.Structure):
    _fields_ = [
        ("allowed", ctypes.c_bool),
        ("fidelity", ctypes.c_double),
        ("neutralized_reason", ctypes.c_char_p),
        ("derived_metric", ctypes.POINTER(DerivedMetric))
    ]

_jiggler_lib = None
if os.path.exists(JIGGLER_LIB_PATH):
    try:
        _jiggler_lib = ctypes.CDLL(JIGGLER_LIB_PATH)
        _jiggler_lib.check_extraction_guard.argtypes = [ctypes.POINTER(SovereignMetric)]
        _jiggler_lib.check_extraction_guard.restype = GuardedOutput
    except Exception:
        _jiggler_lib = None

# ---------------------------------------------------------
# Synchronous Helper Functions
# ---------------------------------------------------------
def _dispatch_socket_sync(payload: dict) -> dict:
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
        s.settimeout(5.0)
        s.connect(SOCK_PATH)
        s.sendall(json.dumps(payload).encode() + b"\n")
        raw_resp = s.recv(4096).decode().strip()
        return json.loads(raw_resp)

def _gossip_sync(target: str, base_dir: str) -> dict:
    broadcaster = os.path.join(base_dir, "gossip_broadcaster.py")
    res = subprocess.run(
        ["python3", "-u", broadcaster, "-t", target],
        capture_output=True,
        text=True,
        check=True
    )
    return {"status": "broadcast_complete", "output": res.stdout.strip()}

# ---------------------------------------------------------
# MCP Tools (Async-enabled for non-blocking stdio loop)
# ---------------------------------------------------------
@mcp.tool()
async def verify_manifold_metric(
    d: float = 27.5,
    r: float = 155.0,
    sigma_t: float = 62.0,
    rho: float = 0.325,
    resonance_delta: float = 0.87
) -> dict:
    """Validates telemetry pose and stability invariants against the Tordial-GS Goldilocks basin via Jiggler native FFI."""
    if _jiggler_lib is None:
        return {"error": "Native Jiggler binary unavailable", "path": JIGGLER_LIB_PATH}

    metric = SovereignMetric()
    metric.pose = (ctypes.c_double * 3)(d, r, sigma_t)
    metric.stability_score = rho
    metric.resonance_delta = resonance_delta
    metric.timestamp = int(time.time())

    res = _jiggler_lib.check_extraction_guard(ctypes.byref(metric))
    
    reason = res.neutralized_reason.decode('utf-8') if res.neutralized_reason else None
    opt_resonance = None
    epoch = None
    if res.derived_metric:
        opt_resonance = res.derived_metric.contents.optimized_resonance
        epoch = res.derived_metric.contents.lifecycle_epoch

    return {
        "allowed": res.allowed,
        "fidelity": res.fidelity,
        "neutralized_reason": reason,
        "derived_metric": {
            "optimized_resonance": opt_resonance,
            "lifecycle_epoch": epoch
        } if opt_resonance is not None else None,
        "input_vector": {"d": d, "r": r, "sigma_t": sigma_t, "rho": rho, "resonance_delta": resonance_delta}
    }

@mcp.tool()
async def dispatch_governed_action(
    command: str,
    target_path: str,
    action_id: str,
    risk_tier: int = 1,
    approval_token: str = "authority:human_in_the_loop"
) -> dict:
    """Dispatches a command through the admission-gate kernel jail. Requires human-in-the-loop sovereign token."""
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
        return await asyncio.to_thread(_dispatch_socket_sync, payload)
    except Exception as e:
        return {"error": f"Socket failure: {str(e)}"}

@mcp.tool()
async def read_witness_ledger(limit: int = 5, uei: str = None) -> dict:
    """Reads historical or recent witness states from the Sovereign Estate ledger."""
    params = {}
    if limit:
        params["limit"] = limit
    if uei:
        params["uei"] = uei

    try:
        resp = await asyncio.to_thread(lambda: requests.get(f"{SYNTHESIS_BASE}/ledger/history", params=params, timeout=5))
        return resp.json()
    except Exception as e:
        return {"error": f"Failed to query ledger endpoint: {str(e)}"}

@mcp.tool()
async def request_state_synthesis() -> dict:
    """Requests a grok-4.5 state audit of the latest witness aggregates."""
    try:
        resp = await asyncio.to_thread(lambda: requests.get(f"{SYNTHESIS_BASE}/synthesize", timeout=30))
        return resp.json()
    except Exception as e:
        return {"error": f"Synthesis request failed: {str(e)}"}

@mcp.tool()
async def broadcast_mesh_gossip(target: str = "all") -> dict:
    """Forces a gossip broadcast cycle across Soliton mesh nodes (4001, 4002, northstar)."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        return await asyncio.to_thread(_gossip_sync, target, base_dir)
    except subprocess.CalledProcessError as e:
        return {"status": "broadcast_failed", "stderr": e.stderr.strip()}



# ---------------------------------------------------------
# Sovereign Manifold Extensions
# ---------------------------------------------------------
MANIFOLD_DIR = "/data/data/com.termux/files/home/sovereign-manifold"

def _run_governance_sync() -> dict:
    import subprocess
    script = os.path.join(MANIFOLD_DIR, "tools/active_governance.py")
    res = subprocess.run(["python3", script], capture_output=True, text=True, cwd=MANIFOLD_DIR)
    if res.returncode != 0:
        return {"status": "governance_failed", "stderr": res.stderr.strip()}
    
    # Read newly appended ledger wire entry
    wire_path = os.path.expanduser("~/Turbo_Takeoff/public_ledger_wire.jsonl")
    with open(wire_path, 'r') as f:
        latest = json.loads(f.readlines()[-1].strip())
    return {"status": "consensus_sealed", "output": res.stdout.strip(), "sealed_block": latest}

def _query_surplus_sync(window: int) -> dict:
    sys_path_save = list(os.sys.path)
    tools_dir = os.path.join(MANIFOLD_DIR, "tools")
    if tools_dir not in os.sys.path:
        os.sys.path.insert(0, tools_dir)
    try:
        import tordial_mcp_server
        server = tordial_mcp_server.TordialMCPServer()
        return server.get_surplus_vector(window_seconds=window)
    finally:
        os.sys.path = sys_path_save

@mcp.tool()
async def trigger_active_governance() -> dict:
    """Convenes the 4-agent cognitive council (Grok, Harper, Benjamin, Lucas) to execute 5D policy debate and cryptographic ledger sealing."""
    return await asyncio.to_thread(_run_governance_sync)

@mcp.tool()
async def read_surplus_vector(window_seconds: int = 60) -> dict:
    """Reads real-time predictive surplus energy, trajectory velocity deltas, and Kalman filter uncertainty from the manifold store."""
    return await asyncio.to_thread(_query_surplus_sync, window_seconds)

if __name__ == "__main__":
    mcp.run()
