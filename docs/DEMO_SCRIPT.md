# KỊCH BẢN THUYẾT TRÌNH DEMO ĐỒ ÁN (5 — 7 PHÚT)
## Đề tài: EduPulse — Student Learning Analytics & Data Warehouse

---

### PHẦN 1: MỞ ĐẦU & VẤN ĐỀ NGHIỆP VỤ (1 Phút)
- **Kính chào Thầy/Cô và Hội đồng đánh giá:**
  "Em xin phép đại diện nhóm trình bày đồ án môn Kho Dữ Liệu với đề tài: **EduPulse — Student Learning Analytics & Data Warehouse**."
- **Đặt vấn đề:**
  "Các hệ thống quản lý đào tạo hiện nay chủ yếu phục vụ tác nghiệp CRUD hàng ngày. Nhà trường thường thiếu một kho dữ liệu lịch sử tập trung để trả lời các câu hỏi chiến lược:
  * Điểm trung bình và tỷ lệ đạt môn qua các học kỳ biến động ra sao?
  * Đâu là những môn học 'nút cổ chai' có tỷ lệ trượt cao nhất cần bổ sung trợ giảng?
  * Mối tương quan thực nghiệm giữa chuyên cần và điểm thi là gì?
  * Làm thế nào để tự động cảnh báo sớm những sinh viên có nguy cơ thôi học theo quy tắc minh bạch?
  EduPulse được xây dựng từ đầu để giải quyết trọn vẹn bài toán này bằng kiến trúc Kimball Star Schema kết hợp với ứng dụng web phân tích trực quan."

---

### PHẦN 2: KIẾN TRÚC KHO DỮ LIỆU & SƠ ĐỒ SAO (1.5 Phút)
- **Mở trang số 7: "Kiến trúc Kho Dữ Liệu" trên thanh Sidebar:**
  "Hệ thống EduPulse tuân thủ kiến trúc phân tầng chuẩn của một Data Warehouse hiện đại gồm 5 tầng:
  1. **Tầng OLTP**: Mô phỏng hệ thống quản trị đào tạo đại học gồm 4 khoa, 8 ngành, 22 môn học, 5 học kỳ và 500 sinh viên.
  2. **Tầng Staging**: Tiếp nhận dữ liệu và áp dụng 7 cổng kiểm soát chất lượng (Quality Gates).
  3. **Tầng Pipeline ETL**: Chuyển đổi điểm, áp dụng SCD Type 2 và nạp Fact an toàn (Idempotent Upsert).
  4. **Tầng Star Schema**: Bảng Fact `fact_student_performance` trung tâm cùng các Dimension vệ tinh.
  5. **Tầng API & UI**: FastAPI và React Dashboard."
- **Mở trang số 8: "Sơ đồ Logic (Star Schema)":**
  "Grain của bảng Fact chính là: *Một bản ghi cho một lượt đăng ký môn học của một sinh viên trong một lớp học phần tại một học kỳ*.
  Điểm nổi bật:
  * Toàn bộ Dimension đều dùng Surrogate Key kiểu số nguyên.
  * Chiều `dim_student` được quản lý lịch sử bằng **SCD Type 2** (`valid_from`, `valid_to`, `is_current`).
  * Chiều suy biến `section_id` được giữ trực tiếp trong Fact."

---

### PHẦN 3: DASHBOARD TỔNG QUAN & BỘ LỌC ĐA CHIỀU (2 Phút)
- **Mở trang số 1: "Dashboard Tổng quan":**
  "Tại trang tổng quan, toàn bộ các chỉ số KPI đều được tính toán theo nguyên tắc toán học chính xác từ kho dữ liệu:
  * **Sinh viên duy nhất:** 403 sinh viên (tính bằng `COUNT(DISTINCT student_key)`, tuyệt đối không cộng dồn số lượt đăng ký môn).
  * **GPA Tín chỉ trọng số:** Tính bằng `SUM(gpa_point_4 * credits) / SUM(credits)` chuẩn hệ 4.
  * **Tỷ lệ Đạt & Trượt:** Tính trực tiếp từ số lượt đạt trên tổng số lượt học, tổng bằng đúng 100%.
  * **Top môn trượt cao nhất:** Tự động lọc ra Giải tích 1 (35%), Xử lý tín hiệu số (30%) và Cấu trúc dữ liệu (28%)."
- **Thao tác tương tác Bộ lọc (FilterBar):**
  * Chọn thử: `Khoa Công nghệ Thông tin (CNTT)` → Toàn bộ KPI, biểu đồ xu hướng học kỳ, phân phối điểm và bảng top môn lập tức cập nhật theo phạm vi Khoa.
  * Nhấn nút **'Đặt lại' (Reset)** → Dashboard quay về phạm vi toàn trường mượt mà, không giật lag.

---

### PHẦN 4: HỆ THỐNG CẢNH BÁO SỚM & TIẾN ĐỘ TÍN CHỈ (1 Phút)
- **Mở trang số 6: "Cảnh báo học tập":**
  "Đây là tính năng giá trị nhất phục vụ cố vấn học tập:
  * Hệ thống áp dụng luật minh bạch (Transparent Heuristics):
    - **Báo động đỏ (High Risk):** Chuyên cần < 65% hoặc GPA < 1.5.
    - **Cảnh báo vàng (Medium Risk):** GPA < 2.0 hoặc Trượt ≥ 2 môn.
    - **Theo dõi (Watchlist):** Trượt 1 môn nhưng GPA ≥ 2.0.
  * Mỗi sinh viên trong bảng đều có chuỗi lý do rõ ràng và đề xuất can thiệp cụ thể."
- **Mở trang số 5: "Tiến độ tín chỉ":**
  "Theo dõi tiến độ tích lũy theo từng khóa tuyển sinh (Khóa 2021, 2022, 2023, 2024) so với chuẩn tốt nghiệp 130 tín chỉ."

---

### PHẦN 5: DEMO TRỰC TIẾP QUY TRÌNH ETL & DATA QUALITY (1 Phút)
- **Mở trang số 11: "Quy trình ETL & Quality":**
  "Để chứng minh pipeline ETL là xử lý thực tế chứ không phải số liệu giả lập:
  * Em nhấn nút **'Chạy Pipeline ETL ngay'**."
  *(Nhấn nút và chờ 0.5s)*
  * "Hệ thống vừa hoàn thành đợt chạy mới, sinh ra Batch ID tiếp theo.
  * **Chứng minh tính lặp an toàn (Idempotency):** Số lượng bản ghi Fact vẫn giữ nguyên chính xác 4,310 dòng, không hề bị nhân đôi dữ liệu.
  * **Chứng minh kiểm soát chất lượng:** Tại bảng *Nhật ký Bản ghi Bị từ chối*, hệ thống đã bắt thành công 4 bản ghi dị thường giả định (điểm tổng kết > 10, chuyên cần > 100%, mã sinh viên không tồn tại) kèm lý do từ chối và dữ liệu JSON thô."

---

### PHẦN 6: TỪ ĐIỂN DỮ LIỆU & KẾT LUẬN (0.5 Phút)
- **Mở trang số 10: "Data Dictionary":**
  "Toàn bộ cấu trúc bảng và trường dữ liệu đều được ghi chép đầy đủ trong Từ điển dữ liệu tương tác, hỗ trợ tìm kiếm tức thì theo từ khóa."
- **Kết luận:**
  "EduPulse đã đáp ứng đầy đủ tất cả các tiêu chí của đồ án môn Kho Dữ Liệu:
  1. Kho dữ liệu Star Schema chuẩn mực với Fact/Dimension rõ ràng.
  2. Pipeline ETL thực tế có xử lý chất lượng, SCD Type 2 và Idempotency.
  3. Ứng dụng web trực quan, bộ lọc động và hệ thống cảnh báo học tập.
  4. Bộ kiểm thử tự động 13/13 tests đều đạt yêu cầu.
  Em xin chân thành cảm ơn Thầy/Cô đã lắng nghe và rất mong nhận được câu hỏi góp ý từ Hội đồng!"
