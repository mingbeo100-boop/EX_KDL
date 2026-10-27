# BÁO CÁO KHẮC PHỤC LỖI KẾT NỐI BACKEND & DASHBOARD TREO LOADING (EDUPULSE)

## 1. Nguyên nhân gốc được xác nhận (Root Causes)

Sau quá trình điều tra toàn diện kiến trúc khởi chạy và luồng dữ liệu Frontend → Vite Proxy → FastAPI → SQLite Data Warehouse, 3 nguyên nhân cốt lõi gây ra lỗi thực tế đã được xác định:

### A. Backend FastAPI bị sập ngay khi khởi động do sai Python Interpreter
- Trên máy trạm của người dùng, lệnh `python` mặc định trỏ về CPython 3.14 thuộc `uv` (`C:\Users\Admin\AppData\Roaming\uv\python\cpython-3.14.7-windows-x86_64-none\python.exe`). Môi trường này thiếu các thư viện cốt lõi (`numpy`, `pandas`).
- Trong khi đó, toàn bộ dependencies sản phẩm (`fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, `pandas`, `numpy`, `pytest`) đã được cài đặt đầy đủ tại Python 3.11 (`C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe`).
- Do [start.py](file:///c:/Skills-Stitch/Edupulse/start.py) và các script launcher trước đây sử dụng `sys.executable` / `python` không qua kiểm tra thư viện, uvicorn bị crash ngay lập tức với lỗi `ModuleNotFoundError: No module named 'numpy'`.

### B. Cơ chế che giấu lỗi trong Launcher (Silent Process Crash)
- Trong [start.py](file:///c:/Skills-Stitch/Edupulse/start.py), tiến trình backend được gọi với cờ `CREATE_NO_WINDOW`, bỏ qua việc theo dõi `backend_proc.poll()`.
- Khi uvicorn crash, launcher vẫn tiếp tục mở Vite Frontend và Cloudflare Tunnel. Kết quả là cổng 8000 không hề mở.
- Khi người dùng truy cập từ xa qua Cloudflare Tunnel (`https://*.trycloudflare.com`), Vite dev server nhận request `/api/*` và chuyển tiếp đến `http://127.0.0.1:8000`. Do không có tiến trình nào lắng nghe trên cổng 8000, Vite proxy trả về mã lỗi `502 Bad Gateway` (hoặc `Connection Refused`).

### C. Lỗi bẫy trạng thái Loading trong Frontend UI (UI State Deadlock)
- Trong component [OverviewPage.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/OverviewPage.tsx) và các trang phân tích liên quan ([PerformancePage.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/PerformancePage.tsx), [AttendancePage.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/AttendancePage.tsx), [CreditProgress.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/CreditProgress.tsx), [DataDictionaryPage.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/DataDictionaryPage.tsx)), điều kiện render dữ liệu được viết dưới dạng:
  ```tsx
  if (isLoading || !data) {
    return (
      <div>
        <Spinner />
        <p>Đang truy vấn và tổng hợp dữ liệu từ Kho Dữ Liệu Học Vụ (Kimball Star Schema)...</p>
      </div>
    );
  }
  ```
- Khi API gặp lỗi (502 hoặc Network Error), hook gọi API bắt lỗi (catch), đặt `isLoading = false` nhưng `data = null`.
- Biểu thức `isLoading || !data` trở thành `false || true => true`. Hậu quả: Giao diện rơi vào vòng lặp hiển thị loading spinner và thông điệp Kimball Star Schema vô thời hạn, không chuyển sang thông báo lỗi và không cung cấp nút Thử lại (Retry).

---

## 2. Những file đã sửa (Modified Files)

1. [start.py](file:///c:/Skills-Stitch/Edupulse/start.py): Thêm logic tự động dò tìm Python có đủ thư viện (`find_valid_python()`), bắt lỗi crash của tiến trình backend và ghi log vào `backend/backend.log`.
2. [start_all.bat](file:///c:/Skills-Stitch/Edupulse/start_all.bat): Cập nhật ưu tiên Python 3.11 trước PATH python.
3. [start_cloudflare.bat](file:///c:/Skills-Stitch/Edupulse/start_cloudflare.bat): Đồng bộ logic ưu tiên Python 3.11.
4. [backend/main.py](file:///c:/Skills-Stitch/Edupulse/backend/main.py): Cấu hình CORS chuẩn W3C (`allow_credentials=False` khi `allow_origins=["*"]`).
5. [frontend/src/pages/OverviewPage.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/OverviewPage.tsx): Tách biệt hoàn toàn `isLoading`, `error`, và `empty state`; thêm giao diện báo lỗi kèm nút "Thử lại kết nối".
6. [frontend/src/pages/PerformancePage.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/PerformancePage.tsx): Tách biệt `isLoading`, `error`, và `empty state`; thêm nút "Thử lại kết nối".
7. [frontend/src/pages/AttendancePage.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/AttendancePage.tsx): Bổ sung `error` state, retry callback, không để spinner quay vô tận khi mất kết nối.
8. [frontend/src/pages/CreditProgress.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/CreditProgress.tsx): Bổ sung `error` state và cơ chế retry khi fetch thất bại.
9. [frontend/src/pages/CoursesPage.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/CoursesPage.tsx): Bổ sung banner cảnh báo lỗi kết nối và nút thử lại khi không tải được danh mục học phần.
10. [frontend/src/pages/EarlyWarningPage.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/EarlyWarningPage.tsx): Bổ sung thông báo lỗi kết nối rõ ràng thay vì hiển thị "0 sinh viên vi phạm".
11. [frontend/src/pages/DataDictionaryPage.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/DataDictionaryPage.tsx): Tách riêng `isLoading` và `error` state, cung cấp nút thử lại.
12. [frontend/src/pages/ETLPipelinePage.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/pages/ETLPipelinePage.tsx): Hiển thị thông báo lỗi chi tiết khi không truy vấn được trạng thái ETL.
13. [frontend/src/App.tsx](file:///c:/Skills-Stitch/Edupulse/frontend/src/App.tsx): Truyền `error` và hàm `onRetry={fetchOverview}` xuống `OverviewPage` và `PerformancePage`.

---

## 3. Nội dung thay đổi chính (Key Architectural Changes)

### A. Tách biệt 3 trạng thái trong UI (Loading, Error, Empty)
- **Trạng thái Đang tải (Loading)**: Chỉ hiển thị spinner khi request đang thực sự bay trên mạng (`isLoading === true`).
- **Trạng thái Lỗi kết nối (Error / Backend Failure)**: Khi request thất bại hoặc backend chưa bật, dừng spinner lập tức, hiển thị thẻ cảnh báo lỗi viền đỏ institutional với thông điệp rõ ràng và nút "Thử lại kết nối" (Retry).
- **Trạng thái Chưa có dữ liệu (Empty Data)**: Nếu kết nối thành công nhưng bộ lọc không trả về bản ghi nào (`total_enrollments === 0`), hiển thị trạng thái empty state học thuật giải thích lý do, không nhầm lẫn với lỗi rớt mạng backend.

### B. Cơ chế Dò tìm Python Interpreter Thông minh
- Hàm `find_valid_python()` thực hiện chạy đoạn mã kiểm thử độc lập:
  `import fastapi, uvicorn, sqlalchemy, pydantic, pandas, numpy; print('READY')`
  qua các đường dẫn ứng viên (Python 3.11, py -3.11, PATH python).
- Nếu phát hiện tiến trình backend dừng đột ngột, [start.py](file:///c:/Skills-Stitch/Edupulse/start.py) ngay lập tức đọc file `backend/backend.log`, in nguyên nhân chi tiết ra màn hình console và dừng an toàn thay vì âm thầm bỏ qua.

### C. CORS và Reverse Proxy Đồng nhất
- Vite `frontend/vite.config.ts` giữ vai trò single origin reverse proxy: chuyển tiếp `/api` đến `http://127.0.0.1:8000`.
- Mọi client (dù ở `localhost:5173` hay qua `https://*.trycloudflare.com`) đều gửi request tương đối dạng `/api/analytics/overview`. Trình duyệt của người dùng không cần phải kết nối trực tiếp đến cổng 8000, tránh triệt để lỗi mixed-content hoặc gọi nhầm `localhost` trên máy khách.

---

## 4. Cấu hình chạy Local (Local Setup)

- **Backend**: FastAPI lắng nghe tại `http://127.0.0.1:8000`
- **Frontend**: Vite Dev Server lắng nghe tại `http://0.0.0.0:5173`
- **Proxy**: Vite chuyển tiếp mọi đường dẫn `/api/*` sang `http://127.0.0.1:8000`
- **Database**: 
  - OLTP: [database/edupulse_oltp.db](file:///c:/Skills-Stitch/Edupulse/database/edupulse_oltp.db)
  - Data Warehouse (Star Schema): [database/edupulse_dw.db](file:///c:/Skills-Stitch/Edupulse/database/edupulse_dw.db)

---

## 5. Cấu hình sử dụng Cloudflare Tunnel (Tunnel Setup)

- **Công cụ**: `bin/cloudflared.exe` (Cloudflare Quick Tunnel)
- **Cấu hình chuyển tiếp**: Chuyển tiếp toàn bộ traffic từ domain công khai `https://*.trycloudflare.com` về `http://localhost:5173`.
- **Luồng dữ liệu**:
  ```
  [Trình duyệt từ xa]
          │ (HTTPS)
          ▼
  [Cloudflare Tunnel Edge]
          │
          ▼
  [Vite Dev Server (Port 5173)]
          ├── HTML/JS/CSS Assets
          └── Proxy `/api/*` ──► [FastAPI Backend (Port 8000)]
                                        │
                                        ▼
                                [SQLite DW (Star Schema)]
  ```
- **Xác minh Tunnel**: Đã kiểm tra trực tiếp qua domain:
  `https://controversy-medium-powell-publishers.trycloudflare.com/api/analytics/overview`
  -> Kết quả trả về `200 OK` với dữ liệu thực tế `unique_students: 419, total_enrollments: 4339`.

---

## 6. Các lệnh khởi chạy chính xác (Execution Commands)

### Cách 1: Khởi chạy toàn diện một lệnh (Khuyên dùng)
```powershell
python start.py
```
Hoặc chạy file batch:
```cmd
start_all.bat
```
*(Tự động kiểm tra DW, khởi động FastAPI cổng 8000, khởi động Vite cổng 5173, thiết lập Cloudflare Tunnel và tự động sao chép link công khai vào Clipboard).*

### Cách 2: Khởi chạy chỉ chạy Local (Không mở Cloudflare Tunnel)
```powershell
python start.py --local
```

### Cách 3: Khởi chạy từng thành phần thủ công (Dành cho Debug)
- **Terminal 1 (Backend)**:
  ```powershell
  C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
  ```
- **Terminal 2 (Frontend)**:
  ```cmd
  cd frontend
  npm.cmd run dev
  ```
- **Terminal 3 (Cloudflare Tunnel - nếu cần)**:
  ```powershell
  .\bin\cloudflared.exe tunnel --url http://localhost:5173 --no-autoupdate
  ```

---

## 7. Kết quả kiểm thử Backend (Backend Verification)

Chạy bộ kiểm thử tự động toàn diện:
```powershell
C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe -m pytest backend/tests -v
```
**Kết quả thực tế:**
```
======================== 24 passed, 1 warning in 3.26s ========================
```
- `test_api_health_endpoint`: PASSED
- `test_api_overview_endpoint`: PASSED
- `test_api_courses_endpoint`: PASSED
- `test_api_attendance_endpoint`: PASSED
- `test_api_credits_endpoint`: PASSED
- `test_api_early_warning_endpoint`: PASSED
- `test_data_dictionary_matches_database`: PASSED
- `test_etl_idempotency`: PASSED
- `test_etl_anomalies_rejected_and_logged`: PASSED
- `test_audit_log_tracks_durations_and_counts`: PASSED
- `test_scd_type_2_full_lifecycle`: PASSED
- `test_independent_mathematical_kpi_verification`: PASSED

---

## 8. Kết quả kiểm thử Frontend (Frontend Verification)

Chạy kiểm tra typecheck và build production:
```cmd
cd frontend
npm.cmd run build
```
**Kết quả thực tế:**
```
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.4 building client environment for production...
transforming...
✓ 2519 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.96 kB │ gzip:   0.59 kB
dist/assets/index-PTI8w-a9.css   35.82 kB │ gzip:   6.85 kB
dist/assets/index-BlPwNe6o.js   827.35 kB │ gzip: 224.23 kB
✓ built in 2.09s
```
- Không có lỗi TypeScript (`tsc -b`).
- Bản build hoàn chỉnh, không có syntax hoặc import error.

---

## 9. Những phần chưa thể kiểm tra (Unverified Items)

- **Cloudflare Tunnel Domain cố định**: Hệ thống sử dụng Quick Tunnels miễn phí của Cloudflare (`*.trycloudflare.com`), do đó mỗi lần khởi động lại tunnel, URL công khai sẽ thay đổi ngẫu nhiên. Đây là hành vi tiêu chuẩn của Cloudflare Quick Tunnels.
- **Môi trường thiết bị di động thực tế**: Đã kiểm tra tính đáp ứng qua viewport responsive của trình duyệt và tunnel công khai; chưa kiểm thử trên thiết bị phần cứng iOS/Android thực tế.

---

## 10. Các lỗi còn tồn tại (Known Issues / Backlog)

- Không còn lỗi chặn luồng (Zero blocking defects).
- Cảnh báo Vite build: Bundle Javascript chính (`index-BlPwNe6o.js`) đạt 827 kB (lớn hơn ngưỡng 500 kB do tích hợp toàn bộ thư viện vẽ biểu đồ `recharts` và bộ icons `lucide-react`). Đây là cảnh báo tối ưu hóa code-splitting, không ảnh hưởng đến tính đúng đắn và tốc độ thực thi của hệ thống.
