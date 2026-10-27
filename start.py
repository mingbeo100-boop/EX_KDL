"""
EduPulse — All-in-One Master Launcher
Combines database/ETL check, FastAPI Backend (port 8000),
Vite Frontend (port 5173), and Cloudflare Public Tunnel (https://*.trycloudflare.com)
into a single unified runner.
"""

import os
import sys
import time
import re
import signal
import atexit
import argparse
import subprocess
import threading
import webbrowser
import urllib.request

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
subprocesses_list = []

def cleanup():
    """Dọn dẹp triệt để các tiến trình con khi dừng chương trình."""
    if not subprocesses_list:
        return
    print("\n[EduPulse] Đang dừng toàn bộ các tiến trình dịch vụ...", flush=True)
    for p in subprocesses_list:
        try:
            if sys.platform == "win32":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True)
            else:
                p.terminate()
        except Exception:
            pass
    kill_dangling_cloudflared()
    print("[EduPulse] Đã tắt an toàn toàn bộ hệ thống.\n", flush=True)


atexit.register(cleanup)

def signal_handler(sig, frame):
    cleanup()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def kill_dangling_cloudflared():
    """Tắt các tiến trình cloudflared cũ nếu còn sót lại."""
    if sys.platform == "win32":
        try:
            subprocess.run(["taskkill", "/F", "/IM", "cloudflared.exe"], capture_output=True)
        except Exception:
            pass

def free_port_if_stuck(port: int):
    """Giải phóng cổng nếu bị tiến trình cũ chiếm dụng trên Windows."""
    if sys.platform != "win32":
        return
    try:
        res = subprocess.run(f"netstat -ano | findstr :{port}", shell=True, capture_output=True, text=True)
        for line in res.stdout.strip().splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and f":{port}" in parts[1] and parts[3] == "LISTENING":
                pid = parts[-1]
                if pid and pid != "0":
                    subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True)
    except Exception:
        pass

def is_backend_ready() -> bool:
    """Kiểm tra backend FastAPI đã phản hồi chưa."""
    try:
        req = urllib.request.Request("http://127.0.0.1:8000/", headers={"User-Agent": "EduPulseChecker"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            data = resp.read().decode(errors="ignore")
            return "EduPulse" in data or resp.status == 200
    except Exception:
        return False

def is_frontend_ready() -> bool:
    """Kiểm tra frontend React Vite đã phản hồi chưa."""
    try:
        req = urllib.request.Request("http://127.0.0.1:5173/", headers={"User-Agent": "EduPulseChecker"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False

def copy_to_clipboard(text: str) -> bool:
    """Sao chép đường dẫn vào clipboard Windows."""
    try:
        subprocess.run("clip", input=text, text=True, check=True)
        return True
    except Exception:
        return False

def find_valid_python() -> str:
    """Tự động tìm kiếm interpreter Python khả dụng trên mọi máy."""
    test_code = "import fastapi, uvicorn, sqlalchemy, pydantic, pandas, numpy; print('READY')"
    candidates = [
        sys.executable,
        "python",
        "py -3.11",
        "py",
        "python3",
    ]
    for cand in candidates:
        if not cand:
            continue
        try:
            cmd = cand.split() + ["-c", test_code]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
            if res.returncode == 0 and "READY" in res.stdout:
                return cand
        except Exception:
            continue
    # Nếu chưa cài đủ thư viện, dùng sys.executable hoặc python mặc định
    return sys.executable or "python"

def ensure_python_dependencies(py_bin: str):
    """Tự động kiểm tra và cài đặt thư viện Python nếu máy người dùng chưa cài."""
    test_code = "import fastapi, uvicorn, sqlalchemy, pydantic, pandas, numpy"
    cmd = py_bin.split() + ["-c", test_code]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
        if res.returncode != 0:
            req_file = os.path.join(BASE_DIR, "backend", "requirements.txt")
            print("\n[EduPulse] Phát hiện máy tính chưa cài đủ thư viện Python backend.", flush=True)
            print(f"           Đang tự động chạy pip install từ {req_file}...", flush=True)
            install_cmd = py_bin.split() + ["-m", "pip", "install", "-r", req_file]
            subprocess.run(install_cmd, check=True)
            print("[EduPulse] Đã cài đặt xong các thư viện Python backend! ✅\n", flush=True)
    except Exception as e:
        print(f"[Gợi ý] Nếu gặp lỗi thiếu thư viện backend, vui lòng chạy: pip install -r backend/requirements.txt ({e})", flush=True)

def ensure_frontend_dependencies():
    """Tự động kiểm tra và chạy npm install nếu người dùng giải nén chưa có node_modules."""
    frontend_dir = os.path.join(BASE_DIR, "frontend")
    node_modules_dir = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules_dir):
        print("\n[EduPulse] Phát hiện Frontend chưa có thư mục node_modules (lần đầu giải nén).", flush=True)
        print("           Đang tự động chạy 'npm install'...", flush=True)
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        try:
            subprocess.run([npm_cmd, "install"], cwd=frontend_dir, check=True)
            print("[EduPulse] Đã cài đặt gói thư viện Frontend thành công! ✅\n", flush=True)
        except Exception as e:
            print(f"[CẢNH BÁO] Không thể tự động chạy npm install: {e}", flush=True)
            print("Vui lòng mở cmd/terminal tại thư mục frontend và gõ: npm install\n", flush=True)

def ensure_database():
    """Kiểm tra và tự động khởi tạo Data Warehouse nếu chưa có."""
    dw_path = os.path.join(BASE_DIR, "database", "edupulse_dw.db")
    if not os.path.exists(dw_path):
        py_bin = find_valid_python()
        ensure_python_dependencies(py_bin)
        print("[1/4] Khởi tạo CSDL mẫu & chạy ETL nạp kho dữ liệu Star Schema...", flush=True)
        cmd_gen = py_bin.split() + ["data_generator/generate_synthetic_data.py"]
        cmd_etl = py_bin.split() + ["etl/run_pipeline.py"]
        subprocess.run(cmd_gen, cwd=BASE_DIR, check=True)
        subprocess.run(cmd_etl, cwd=BASE_DIR, check=True)
        print("      Dữ liệu mẫu và kho dữ liệu đã khởi tạo thành công! ✅", flush=True)
    else:
        print("[1/4] Kho Dữ Liệu EduPulse (Data Warehouse) đã sẵn sàng. ✅", flush=True)

def start_backend():
    """Khởi động backend FastAPI trên cổng 8000 kèm ghi log và bắt lỗi chi tiết."""
    if is_backend_ready():
        print("[2/4] Backend FastAPI (Cổng 8000) đã đang chạy sẵn. ✅", flush=True)
        return

    free_port_if_stuck(8000)
    time.sleep(0.5)

    py_bin = find_valid_python()
    ensure_python_dependencies(py_bin)
    print(f"[2/4] Đang khởi động Backend FastAPI (Cổng 8000) bằng [{py_bin}]...", flush=True)

    log_path = os.path.join(BASE_DIR, "backend", "backend.log")
    log_file = open(log_path, "w", encoding="utf-8")

    creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000) if sys.platform == "win32" else 0
    backend_cmd = py_bin.split() + ["-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"]
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=BASE_DIR,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=creation_flags
    )
    subprocesses_list.append(backend_proc)

    ready = False
    for _ in range(30):
        time.sleep(0.5)
        # Kiểm tra xem tiến trình backend có bị crash không
        poll_res = backend_proc.poll()
        if poll_res is not None:
            log_file.close()
            with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                err_content = f.read()
            print(f"\n[LỖI KHỞI ĐỘNG] Backend FastAPI đã dừng đột ngột (Exit Code: {poll_res})!", flush=True)
            print("Chi tiết lỗi:\n" + ("-" * 60) + f"\n{err_content}\n" + ("-" * 60), flush=True)
            cleanup()
            sys.exit(1)

        if is_backend_ready():
            ready = True
            break

    if ready:
        print("      Backend FastAPI đã sẵn sàng! ✅", flush=True)
    else:
        print(f"      Cảnh báo: Backend chưa phản hồi sau 15s. Chi tiết ghi tại: {log_path}", flush=True)


def start_frontend():
    """Khởi động frontend React Vite trên cổng 5173."""
    if is_frontend_ready():
        print("[3/4] Frontend React Vite (Cổng 5173) đã đang chạy sẵn. ✅", flush=True)
        return

    ensure_frontend_dependencies()
    free_port_if_stuck(5173)
    time.sleep(0.5)

    print("[3/4] Đang khởi động Frontend React Vite (Cổng 5173)...", flush=True)
    frontend_dir = os.path.join(BASE_DIR, "frontend")
    frontend_cmd = "npm.cmd run dev" if sys.platform == "win32" else "npm run dev"
    creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000) if sys.platform == "win32" else 0
    frontend_proc = subprocess.Popen(
        frontend_cmd,
        shell=True,
        cwd=frontend_dir,
        creationflags=creation_flags
    )
    subprocesses_list.append(frontend_proc)

    ready = False
    for _ in range(30):
        time.sleep(0.5)
        if is_frontend_ready():
            ready = True
            break

    if ready:
        print("      Frontend React Vite đã sẵn sàng! ✅", flush=True)
    else:
        print("      Frontend React Vite đang chạy nền.", flush=True)

def ensure_cloudflared_binary() -> str:
    """Đảm bảo binary cloudflared tồn tại, tải về nếu thiếu."""
    cloudflared_path = os.path.join(BASE_DIR, "bin", "cloudflared.exe")
    if not os.path.exists(cloudflared_path):
        fallback_path = os.path.join(os.path.dirname(BASE_DIR), "AI_EX", "cloudflared.exe")
        if os.path.exists(fallback_path):
            import shutil
            os.makedirs(os.path.dirname(cloudflared_path), exist_ok=True)
            shutil.copy2(fallback_path, cloudflared_path)
            return cloudflared_path

        print("      Đang tải cloudflared binary chính thức...", flush=True)
        os.makedirs(os.path.dirname(cloudflared_path), exist_ok=True)
        url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
        urllib.request.urlretrieve(url, cloudflared_path)

    return cloudflared_path

def start_cloudflare_tunnel():
    """Khởi chạy Cloudflare Tunnel cho Frontend và trả về Public URL."""
    kill_dangling_cloudflared()
    print("[4/4] Đang thiết lập đường hầm Cloudflare Tunnel...", flush=True)

    cloudflared_path = ensure_cloudflared_binary()
    cf_cmd = [cloudflared_path, "tunnel", "--url", "http://localhost:5173", "--no-autoupdate"]
    creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000) if sys.platform == "win32" else 0

    cf_proc = subprocess.Popen(
        cf_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        encoding="utf-8",
        errors="ignore",
        creationflags=creation_flags
    )
    subprocesses_list.append(cf_proc)

    public_url_container = {"url": None}
    url_pattern = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")
    url_file_path = os.path.join(BASE_DIR, "CLOUDFLARE_URL.txt")

    def monitor_output():
        for line in cf_proc.stdout:
            match = url_pattern.search(line)
            if match and not public_url_container["url"]:
                pub_url = match.group(0)
                public_url_container["url"] = pub_url
                with open(url_file_path, "w", encoding="utf-8") as f:
                    f.write(f"PUBLIC_URL={pub_url}\n")
                    f.write("LOCAL_FRONTEND=http://localhost:5173\n")
                    f.write("LOCAL_BACKEND=http://127.0.0.1:8000/docs\n")
                    f.write(f"UPDATED_AT={time.strftime('%Y-%m-%d %H:%M:%S')}\n")

                copied = copy_to_clipboard(pub_url)

                print("\n" + "=" * 70, flush=True)
                print("🎉 HỆ THỐNG EDUPULSE ĐÃ KHỞI CHẠY ĐẦY ĐỦ THÀNH CÔNG!", flush=True)
                print("=" * 70, flush=True)
                print("🌐 ĐƯỜNG DẪN TRUY CẬP TRỰC TUYẾN (CLOUDFLARE PUBLIC TUNNEL):", flush=True)
                print(f"\n   👉 {pub_url} 👈\n", flush=True)
                if copied:
                    print("📋 Đã tự động sao chép link công khai vào bộ nhớ tạm (Clipboard)!", flush=True)
                print("📍 Localhost Web UI:  http://localhost:5173", flush=True)
                print("📄 Backend Swagger:   http://127.0.0.1:8000/docs", flush=True)
                print(f"💾 File lưu link:     {url_file_path}", flush=True)
                print("=" * 70, flush=True)
                print("💡 Nhấn Ctrl + C để dừng toàn bộ hệ thống bất cứ lúc nào.\n", flush=True)

                try:
                    webbrowser.open(pub_url)
                except Exception:
                    pass

    t = threading.Thread(target=monitor_output, daemon=True)
    t.start()

def main():
    parser = argparse.ArgumentParser(description="EduPulse Unified Runner")
    parser.add_argument(
        "--no-tunnel", "--local", dest="no_tunnel", action="store_true",
        help="Chỉ chạy cục bộ (Backend + Frontend), không bật Cloudflare Tunnel"
    )
    parser.add_argument(
        "--online", "--tunnel", dest="online", action="store_true",
        help="Chạy đầy đủ và bật Cloudflare Public Tunnel"
    )
    args = parser.parse_args()

    os.chdir(BASE_DIR)

    # Nếu chạy trực tiếp không tham số trong terminal tương tác, cho phép chọn chế độ
    if not args.no_tunnel and not args.online and sys.stdin and sys.stdin.isatty() and len(sys.argv) == 1:
        print("=" * 70, flush=True)
        print("   EDUPULSE — BỘ KHỞI CHẠY HỆ THỐNG TOÀN DIỆN (ALL-IN-ONE)", flush=True)
        print("=" * 70, flush=True)
        print("  [1] Chạy Đầy Đủ + Kết Nối Online Cloudflare Tunnel (Mặc định)")
        print("  [2] Chỉ Chạy Cục Bộ (Localhost: Frontend 5173 & Backend 8000)")
        try:
            choice = input("\n👉 Chọn chế độ [1/2] (Nhấn Enter để chọn 1): ").strip()
            if choice == "2":
                args.no_tunnel = True
        except (EOFError, KeyboardInterrupt):
            pass

    print("=" * 70, flush=True)
    print("   EDUPULSE — ĐANG KHỞI ĐỘNG HỆ THỐNG...", flush=True)
    print("=" * 70, flush=True)

    # 1. Cơ sở dữ liệu & ETL
    ensure_database()

    # 2. Backend FastAPI
    start_backend()

    # 3. Frontend React Vite
    start_frontend()

    # 4. Cloudflare Tunnel (hoặc chỉ Local)
    if not args.no_tunnel:
        start_cloudflare_tunnel()
    else:
        print("\n" + "=" * 70, flush=True)
        print("🎉 HỆ THỐNG EDUPULSE ĐÃ KHỞI CHẠY CỤC BỘ THÀNH CÔNG!", flush=True)
        print("=" * 70, flush=True)
        print("📍 Localhost Web UI:  http://localhost:5173", flush=True)
        print("📄 Backend Swagger:   http://127.0.0.1:8000/docs", flush=True)
        print("=" * 70, flush=True)
        print("💡 Nhấn Ctrl + C để dừng toàn bộ hệ thống bất cứ lúc nào.\n", flush=True)
        try:
            webbrowser.open("http://localhost:5173")
        except Exception:
            pass

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
