# EduPulse — Student Learning Analytics & Data Warehouse
### Nền tảng Phân tích Hiệu quả Học tập Sinh viên & Kho Dữ Liệu Học vụ

---

## 1. Giới thiệu Đề tài

**EduPulse** là hệ thống phân tích dữ liệu học tập và kho dữ liệu học vụ (Student Learning Analytics & Data Warehouse) được xây dựng hoàn chỉnh từ đầu phục vụ đồ án môn **Kho Dữ Liệu (Data Warehouse & BI)** tại trường đại học.

Hệ thống không phải là một website quản lý sinh viên CRUD thông thường, mà tập trung vào **phân tích dữ liệu lịch sử đa chiều (OLAP)**, tối ưu hóa các phép tính tổng hợp lớn, quản lý biến động dữ liệu theo thời gian (SCD Type 2) và phát hiện sớm các nhóm sinh viên có nguy cơ học tập theo các quy tắc minh bạch.

---

## 2. Điểm Nhấn Kiến Trúc & Kỹ Thuật

- **Mô hình Hạt (Fact Grain) chuẩn mực:**
  * Bảng Fact trung tâm `fact_student_performance`: 1 bản ghi đại diện cho 1 lượt sinh viên đăng ký học một môn học trong một lớp học phần tại một học kỳ `(student_key, course_key, semester_key)`.
- **Cơ chế Khóa thay thế & Quản lý Lịch sử (SCD Type 2):**
  * Tất cả các bảng Dimension đều sử dụng Surrogate Key (INTEGER PK).
  * `dim_student` theo dõi lịch sử chuyển ngành và trạng thái qua `valid_from`, `valid_to`, `is_current`.
- **Pipeline ETL Kiểm soát Chất lượng & Tính Lặp An Toàn (Idempotency):**
  * 7 cổng kiểm soát dữ liệu: định dạng, bắt buộc, toàn vẹn khóa ngoại, điểm ngoài biên [0-10], chuyên cần ngoài biên [0-100%].
  * Ghi nhật ký bản ghi bị từ chối vào `etl_rejected_records`.
  * Cơ chế Idempotent Upsert (`ON CONFLICT DO UPDATE`) bảo đảm chạy lại cùng một batch không bao giờ nhân đôi dữ liệu.
- **Tính Đúng đắn Toán học của các Phép Tổng hợp (Aggregate Accuracy):**
  * Tuyệt đối không cộng trung bình cộng các tỷ lệ (No average-of-averages).
  * GPA tín chỉ hệ 4 = `SUM(gpa_point_4 * credits_attempted) / SUM(credits_attempted)`.
  * Tỷ lệ đạt % = `SUM(is_passed) * 100 / COUNT(*)`.
  * Sinh viên duy nhất = `COUNT(DISTINCT student_key)` (không cộng dồn số lượt đăng ký).
- **Bộ Kiểm thử Tự động 100% Pass:**
  * 13 bài kiểm thử `pytest` kiểm tra chặt chẽ công thức KPI, ETL, Idempotency, API và sự đồng bộ giữa Data Dictionary và Database.

---

## 3. Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ lựa chọn | Lý do lựa chọn |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript + Vite | Tốc độ build cực nhanh, type safety, cấu trúc module rõ ràng |
| **Giao diện (UI)** | Tailwind CSS 3.4 + Lucide Icons | Thiết kế hiện đại, bảng màu Navy/Blue trang nhã, responsive desktop |
| **Biểu đồ (Charts)** | Recharts | Thư viện biểu đồ SVG linh hoạt cho Bar, Line, Area, Scatter |
| **Backend API** | Python 3.11 + FastAPI + Pydantic v2 | Hiệu năng cao, tự động sinh tài liệu Swagger UI `/docs` |
| **Kho Dữ Liệu (DW)**| SQLite 3 / PostgreSQL 14+ | Chạy độc lập 100% không cần setup phức tạp; hỗ trợ PostgreSQL qua URL |
| **ETL Engine** | Python + pandas + SQLAlchemy | Trích xuất, làm sạch, chuyển đổi, nạp và ghi log kiểm toán |
| **Kiểm thử** | pytest + FastAPI TestClient | 13 bài test tự động bao phủ logic cốt lõi |

---

## 4. Cấu Trúc Thư Mục Dự Án

```
Edupulse/
├── backend/
│   ├── app/
│   │   ├── api/endpoints.py          # 11 RESTful endpoints
│   │   ├── core/database.py          # Session & engine kết nối DB
│   │   ├── schemas/analytics.py      # Pydantic validation schemas
│   │   └── services/analytics_service.py # Star Schema query engine
│   ├── tests/
│   │   ├── test_kpis.py              # Kiểm thử tính đúng đắn toán học KPI
│   │   ├── test_etl.py               # Kiểm thử Idempotency & Anomaly rejection
│   │   └── test_api_and_dictionary.py# Kiểm thử API & tính đồng bộ Data Dictionary
│   ├── requirements.txt
│   └── main.py                       # FastAPI entrypoint (port 8000)
├── database/
│   ├── dw_schema.sql                 # DDL Star Schema kho dữ liệu
│   ├── oltp_schema.sql               # DDL cơ sở dữ liệu tác nghiệp
│   ├── data_dictionary.json          # Từ điển dữ liệu cấu trúc JSON
│   ├── edupulse_dw.db                # File SQLite Data Warehouse
│   └── edupulse_oltp.db              # File SQLite hệ thống nguồn OLTP
├── data_generator/
│   ├── generate_synthetic_data.py    # Sinh dữ liệu giả lập seed=42
│   └── raw_data/                     # Thư mục CSV nguồn (students, courses,...)
├── etl/
│   ├── extract.py                    # Trích xuất nguồn OLTP/CSV
│   ├── transform.py                  # Làm sạch, kiểm tra & từ chối dữ liệu
│   ├── load.py                       # Nạp Dimension & Fact (SCD 2, Idempotent)
│   └── run_pipeline.py               # Master ETL runner
├── frontend/
│   ├── src/
│   │   ├── components/               # Sidebar, Header, FilterBar, KPICard
│   │   ├── pages/                    # 11 trang phân tích & tài liệu
│   │   ├── services/api.ts           # Typed API client
│   │   ├── types/index.ts            # TypeScript interfaces
│   │   ├── App.tsx                   # Main router
│   │   └── index.css                 # Tailwind base styles
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── ARCHITECTURE.md               # Tài liệu kiến trúc 5 tầng
│   ├── LOGICAL_SCHEMA.md             # Tài liệu sơ đồ logic Star Schema
│   ├── PHYSICAL_SCHEMA.md            # Tài liệu sơ đồ vật lý, indexes, DDL
│   ├── DATA_DICTIONARY.md            # Tài liệu Data Dictionary đầy đủ
│   ├── DEMO_SCRIPT.md                # Kịch bản thuyết trình demo 5-7 phút
│   └── REMAINING_WORK.md             # Giới hạn & hướng phát triển đồ án cuối kỳ
├── .env.example                      # File cấu hình môi trường mẫu
├── start_all.bat                     # File kích hoạt 1-click trên Windows (gọi start.py)
├── start.py                          # File kích hoạt duy nhất khởi chạy toàn bộ hệ thống
└── README.md                         # Hướng dẫn dự án chính
```

---

## 5. Hướng Dẫn Cài Đặt & Khởi Chạy

### Cách 1: Khởi chạy toàn bộ hệ thống bằng 1 lệnh duy nhất (Khuyên dùng)
Chạy lệnh Python:
```bash
python start.py
```
Hoặc nhấp đúp vào file `start_all.bat` trên Windows.

Script sẽ tự động:
1. Kiểm tra CSDL & tự sinh dữ liệu mẫu + chạy ETL nếu chưa có.
2. Dọn cổng và khởi chạy Backend FastAPI tại `http://127.0.0.1:8000`.
3. Khởi chạy Frontend React Vite tại `http://localhost:5173`.
4. Thiết lập Cloudflare Public Tunnel (`https://*.trycloudflare.com`), tự copy link và mở trình duyệt.
*(Để chạy chỉ cục bộ không mở Cloudflare: `python start.py --local`)*



### Cách 2: Khởi chạy thủ công từng phần

#### Bước 1: Cài đặt thư viện Python
```bash
pip install fastapi uvicorn sqlalchemy pydantic pandas pytest httpx
```

#### Bước 2: Sinh dữ liệu mẫu & Chạy Pipeline ETL
```bash
python data_generator/generate_synthetic_data.py
python etl/run_pipeline.py
```

#### Bước 3: Chạy bộ kiểm thử tự động (Tùy chọn)
```bash
python -m pytest backend/tests -v
```
*(Kết quả mong đợi: 13/13 tests passed)*

#### Bước 4: Khởi chạy Backend
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API Swagger UI sẵn sàng tại: `http://127.0.0.1:8000/docs`

#### Bước 5: Khởi chạy Frontend
```bash
cd frontend
npm install
npm run dev
```
Truy cập giao diện tại: `http://localhost:5173`

---

## 6. Danh Sách 11 Trang Giao Diện Web

1. **Dashboard Tổng quan (`/`):** KPI sinh viên duy nhất, GPA trọng số, tỷ lệ đạt/trượt, xu hướng học kỳ, so sánh khoa, top môn trượt cao và tương quan chuyên cần.
2. **Phân tích Kết quả học tập:** Điểm trung bình hệ 10 & hệ 4, xếp loại điểm chữ (A+ đến F), bảng so sánh chi tiết các khoa.
3. **Phân tích Môn học:** Bảng chỉ số 22 môn học, tìm kiếm theo tên/mã môn, drill-down xem chi tiết từng lớp học phần (Sections).
4. **Phân tích Chuyên cần:** Phân chia 4 mức độ chuyên cần (< 65%, 65-74%, 75-84%, >= 85%), biểu đồ scatter tương quan thực nghiệm.
5. **Phân tích Tiến độ Tín chỉ:** Theo dõi tín chỉ tích lũy trung bình theo từng khóa tuyển sinh (2021, 2022, 2023, 2024) so với chuẩn tốt nghiệp 130 tín chỉ.
6. **Cảnh báo Học tập Sớm:** Phân loại Báo động đỏ, Cảnh báo vàng, Danh sách theo dõi kèm lý do minh bạch và đề xuất can thiệp cho CVHT.
7. **Kiến trúc Kho Dữ Liệu:** Sơ đồ 5 tầng luồng dữ liệu (OLTP → Staging → ETL → Star Schema → API/UI).
8. **Sơ đồ Logic (Star Schema):** Bảng Fact trung tâm, các bảng Dimension vệ tinh, giải thích Grain và mã nguồn Mermaid ERD.
9. **Sơ đồ Vật lý & DDL:** Cấu trúc chi tiết kiểu dữ liệu, khóa chính, khóa ngoại, chiến lược chỉ mục (Indexes) và mã nguồn DDL SQL.
10. **Data Dictionary:** Từ điển dữ liệu tương tác đầy đủ, hỗ trợ tìm kiếm theo trường dữ liệu, xem validation rules, nullability và giá trị mẫu.
11. **Quy trình ETL & Chất lượng Dữ liệu:** Nút kích hoạt chạy ETL trực tiếp trên web, theo dõi nhật ký kiểm toán (Audit Logs) và danh sách bản ghi bị từ chối (Rejected Records).

---

## 7. Tài Liệu Bổ Trợ Đi Kèm

- [Tài liệu Kiến trúc](docs/ARCHITECTURE.md)
- [Tài liệu Sơ đồ Logic Star Schema](docs/LOGICAL_SCHEMA.md)
- [Tài liệu Sơ đồ Vật lý & DDL](docs/PHYSICAL_SCHEMA.md)
- [Từ điển Dữ liệu Chi tiết](docs/DATA_DICTIONARY.md)
- [Kịch bản Thuyết trình 5-7 Phút](docs/DEMO_SCRIPT.md)
- [Giới hạn & Lộ trình Đồ án Cuối kỳ](docs/REMAINING_WORK.md)
