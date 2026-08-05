import os
import time
import subprocess
import requests

LEDGER_PATH = os.path.abspath("ledger.json")
SYNTHESIS_URL = "http://localhost:3000/synthesize"

def get_mtime():
    try:
        return os.path.getmtime(LEDGER_PATH)
    except OSError:
        return 0

def handle_change():
    print("\n[FILE WATCHER] Ledger modification detected.")
    
    # 1. Trigger synthesis evaluation
    try:
        resp = requests.get(SYNTHESIS_URL, timeout=5)
        if resp.status_code == 200:
            print("[FILE WATCHER] Synthesis updated successfully.")
        else:
            print(f"[FILE WATCHER ERROR] Server responded with status: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"[FILE WATCHER ERROR] Failed to connect to synthesis server: {e}")

    # 2. Trigger gossip broadcast cycle across active peers
    try:
        print("[FILE WATCHER] Launching gossip broadcast cycle...")
        subprocess.run(["python3", "-u", "gossip_broadcaster.py"], check=True)
    except Exception as e:
        print(f"[FILE WATCHER ERROR] Gossip broadcast failed: {e}")

def main():
    print(f"[FILE WATCHER] Monitoring {LEDGER_PATH} for changes...")
    last_mtime = get_mtime()

    while True:
        time.sleep(1)
        current_mtime = get_mtime()
        if current_mtime != last_mtime and current_mtime != 0:
            last_mtime = current_mtime
            handle_change()

if __name__ == "__main__":
    main()
