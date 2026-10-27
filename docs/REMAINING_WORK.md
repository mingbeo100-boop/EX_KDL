# Danh sách Phần Chưa Hoàn Thiện & Hướng Phát Triển Đồ Án Cuối Kỳ
## EduPulse — Student Learning Analytics

Tài liệu này ghi nhận hiện trạng hoàn thành của phiên bản hiện tại, các giới hạn đã được kiểm soát và lộ trình mở rộng thành Đồ án tốt nghiệp / Khóa luận cuối khóa.

---

### 1. Hiện trạng Hoàn thành (Scope Delivered)

- [x] Khởi tạo dự án từ đầu trong thư mục `Edupulse` với cấu trúc module tách biệt (`backend`, `frontend`, `database`, `data_generator`, `etl`, `docs`).
- [x] Thiết kế Star Schema với 2 bảng Fact (`fact_student_performance`, `fact_attendance_aggregate`) và 6 bảng Dimension (`dim_student`, `dim_course`, `dim_semester`, `dim_department`, `dim_major`, `dim_date`).
- [x] Cơ chế Surrogate Keys và SCD Type 2 cho chiều sinh viên (`valid_from`, `valid_to`, `is_current`).
- [x] Bộ sinh dữ liệu giả lập có seed cố định (`seed=42`) với 4 khoa, 8 ngành, 22 môn học, 5 học kỳ, 500 sinh viên và 4,379 lượt đăng ký.
- [x] Cài đặt 4 bản ghi bất thường kiểm thử (điểm > 10, chuyên cần > 100%, mã SV không tồn tại, mã môn không tồn tại) để kiểm chứng cơ chế từ chối dữ liệu xấu.
- [x] Pipeline ETL hoàn chỉnh với 7 bước kiểm tra chất lượng, ghi log kiểm toán (`etl_audit_log`), ghi nhật ký từ chối (`etl_rejected_records`), và đảm bảo tính lặp an toàn (Idempotent Upsert).
- [x] Backend FastAPI hiệu năng cao với 11 API endpoints, tính toán KPI chính xác (credit-weighted GPA, pass/fail rate không lấy trung bình của trung bình).
- [x] Giao diện người dùng React 18 + TypeScript + Vite + Tailwind CSS với 11 trang đầy đủ chức năng và bộ lọc đa chiều.
- [x] Từ điển dữ liệu tương tác (Data Dictionary) đồng bộ với schema thực tế và hỗ trợ tìm kiếm.
- [x] Bộ kiểm thử tự động `pytest` gồm 13 tests kiểm tra toàn diện KPI, ETL, Idempotency và Schema Integrity.

---

### 2. Giới hạn Kỹ thuật của Phiên bản Hiện tại

1. **Cơ sở dữ liệu mặc định là SQLite:**
   - *Lý do:* Để đảm bảo dự án chạy được ngay lập tức trên máy tính của Hội đồng và sinh viên mà không đòi hỏi cài đặt, cấu hình port hay mật khẩu PostgreSQL.
   - *Đã giải quyết:* Mã nguồn sử dụng SQLAlchemy và chuẩn ANSI SQL, chỉ cần truyền biến môi trường `DATABASE_URL=postgresql://user:pass@localhost:5432/edupulse_dw` là hệ thống sẽ tự động chuyển sang PostgreSQL mà không cần sửa code.

2. **Dữ liệu chuyên cần được mô phỏng theo lượt học phần:**
   - *Hiện trạng:* Chuyên cần đã có bảng tổng hợp `fact_attendance_aggregate` và chi tiết log 15 tuần học.
   - *Giới hạn:* Chưa tích hợp hệ thống quét thẻ sinh viên RFID hay điểm danh khuôn mặt thực tế tại phòng học.

3. **Chưa có phân quyền tài khoản (RBAC):**
   - *Hiện trạng:* Giao diện mở trực tiếp cho ban giám hiệu và cố vấn học tập demo xem toàn bộ dữ liệu.
   - *Giới hạn:* Chưa giới hạn quyền xem theo từng giảng viên hay từng sinh viên.

---

### 3. Hướng Mở Rộng cho Đồ Án Tốt Nghiệp / Cuối Kỳ

1. **Kiến trúc Dữ liệu Thời gian Thực (Real-time Streaming Ingestion):**
   - Triển khai Apache Kafka kết hợp Change Data Capture (Debezium) để đồng bộ dữ liệu điểm danh và đăng ký môn học tức thời từ hệ thống OLTP sang Staging thay vì chạy theo batch định kỳ.

2. **Mô hình Máy học Dự đoán Nguy cơ Bỏ học (Predictive ML for Dropout Risk):**
   - Hiện tại hệ thống sử dụng luật minh bạch (Transparent Heuristics: GPA < 2.0 hoặc chuyên cần < 75%).
   - Hướng mở rộng: Huấn luyện mô hình Random Forest hoặc XGBoost dựa trên chuỗi thời gian điểm thành phần và tần suất tương tác hệ thống LMS (Moodle) để dự đoán sinh viên có nguy cơ trượt môn trước kỳ thi 4 tuần.

3. **Cổng Thông tin Sinh viên Cá nhân hóa (Student Portal & Advising Workspace):**
   - Xây dựng giao diện riêng cho sinh viên để theo dõi tiến độ tích lũy tín chỉ cá nhân, mô phỏng các môn tự chọn cần học để đạt GPA mục tiêu.
   - Giao diện dành riêng cho Cố vấn học tập (CVHT) có thể gửi tin nhắn nhắc nhở trực tiếp qua Email hoặc SMS đến sinh viên trong diện Báo động đỏ.
