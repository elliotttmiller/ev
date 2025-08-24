import os
import signal
import subprocess
import sys
import time
import psutil
import requests

# --- CONFIGURATION ---
BACKEND_PORT = 5000
FRONTEND_PORT = 5173
BACKEND_CMD = [sys.executable, 'main.py']
FRONTEND_CMD = ['npm', 'run', 'dev']
BACKEND_DIR = os.path.join(os.path.dirname(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BACKEND_DIR, '../frontend'))
BACKEND_URL = f'http://localhost:{BACKEND_PORT}'
FRONTEND_URL = f'http://localhost:{FRONTEND_PORT}'

# --- UTILS ---
def kill_process_on_port(port):
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            for conn in proc.net_connections(kind='inet'):
                if conn.laddr and conn.laddr.port == port:
                    print(f"[DEBUG] Killing process {proc.pid} on port {port}...")
                    proc.kill()
        except (psutil.AccessDenied, psutil.NoSuchProcess, AttributeError):
            continue

def scan_backend_endpoints():
    try:
        resp = requests.get(f'{BACKEND_URL}/openapi.json', timeout=5)
        if resp.status_code == 200:
            endpoints = [path for path in resp.json().get('paths', {})]
            print(f"[INFO] Backend endpoints detected:")
            for ep in endpoints:
                print(f"  - {ep}")
        else:
            print(f"[ERROR] Could not fetch backend endpoints. Status: {resp.status_code}")
    except Exception as e:
        print(f"[ERROR] Backend endpoint scan failed: {e}")

# --- MAIN ---
if __name__ == '__main__':
    print("[INFO] Shutting down any running backend/frontend servers...")
    kill_process_on_port(BACKEND_PORT)
    kill_process_on_port(FRONTEND_PORT)
    time.sleep(2)

    print("[INFO] Starting backend server...")
    backend_proc = subprocess.Popen(BACKEND_CMD, cwd=BACKEND_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    time.sleep(3)

    print("[INFO] Starting frontend server...")
    frontend_proc = subprocess.Popen(FRONTEND_CMD, cwd=FRONTEND_DIR, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    print("[INFO] All servers started. Access the app at http://localhost:5173")
    print("[INFO] Press Ctrl+C to stop all servers.")

    # Stream logs and scan endpoints
    try:
        scan_backend_endpoints()
        while True:
            # Stream backend logs
            if backend_proc.poll() is None:
                for line in backend_proc.stdout:
                    print(f"[BACKEND] {line.strip()}")
            # Stream frontend logs
            if frontend_proc.poll() is None:
                for line in frontend_proc.stdout:
                    print(f"[FRONTEND] {line.strip()}")
            time.sleep(1)
    except KeyboardInterrupt:
        print("[INFO] Stopping servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("[INFO] Shutdown complete.")
    except Exception as e:
        print(f"[ERROR] Exception in startup script: {e}")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("[INFO] Shutdown complete.")
