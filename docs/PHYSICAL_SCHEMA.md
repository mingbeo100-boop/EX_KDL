# EduPulse — Physical Schema Document
## Physical Database Design, DDL & Indexing Strategy

### 1. Nền tảng Công nghệ & Lưu trữ

Kho dữ liệu EduPulse được thiết kế tương thích hoàn toàn với:
- **SQLite 3**: Môi trường chạy nhanh gọn, không phụ thuộc service ngoài, lý tưởng cho demo đồ án, kiểm thử tự động CI/CD và chấm điểm.
- **PostgreSQL 14+**: Tương thích 100% cú pháp SQL chuẩn (ANSI SQL) với cùng bộ DDL, sẵn sàng nâng cấp lên môi trường production lớn bằng cách thay đổi biến môi trường `DATABASE_URL`.

---

### 2. Chi tiết Cấu trúc Vật lý Các Bảng

#### Bảng Fact: `fact_student_performance`
| Tên Cột | Kiểu Dữ liệu | Ràng buộc | Mục đích & Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `performance_key` | INTEGER | PRIMARY KEY AUTOINCREMENT | Khóa thay thế duy nhất bản ghi kết quả học phần |
| `student_key` | INTEGER | NOT NULL, FK dim_student | Khóa ngoại sinh viên tại thời điểm học |
| `course_key` | INTEGER | NOT NULL, FK dim_course | Khóa ngoại môn học |
| `semester_key` | INTEGER | NOT NULL, FK dim_semester | Khóa ngoại học kỳ diễn ra |
| `major_key` | INTEGER | NOT NULL, FK dim_major | Khóa ngoại chuyên ngành tại thời điểm học |
| `department_key` | INTEGER | NOT NULL, FK dim_department | Khóa ngoại khoa quản lý |
| `date_key` | INTEGER | NULL, FK dim_date | Khóa ngoại ngày ghi nhận điểm (YYYYMMDD) |
| `section_id` | VARCHAR(50) | NOT NULL | Chiều suy biến mã lớp học phần |
| `attendance_rate` | REAL | NOT NULL | Tỷ lệ tham dự lớp (0.00% - 100.00%) |
| `midterm_score` | REAL | NULL | Điểm kiểm tra giữa kỳ (0.0 - 10.0) |
| `final_score` | REAL | NULL | Điểm thi cuối kỳ (0.0 - 10.0) |
| `total_score` | REAL | NOT NULL | Điểm tổng kết học phần (0.0 - 10.0) |
| `gpa_point_4` | REAL | NOT NULL | Điểm quy đổi hệ 4 tín chỉ (0.0 - 4.0) |
| `letter_grade` | VARCHAR(5) | NOT NULL | Điểm chữ (A+, A, B+, B, C+, C, D+, D, F) |
| `credits_attempted` | INTEGER | NOT NULL | Số tín chỉ đăng ký học của môn |
| `credits_earned` | INTEGER | NOT NULL | Số tín chỉ đạt được (bằng 0 nếu trượt) |
| `is_passed` | INTEGER | NOT NULL | Cờ đạt môn (1: total_score >= 4.0; 0: trượt) |
| `is_retake` | INTEGER | NOT NULL DEFAULT 0 | Cờ học lại (1: học lại, 0: lần đầu) |
| `batch_id` | INTEGER | NOT NULL, FK etl_audit_log | Mã đợt chạy ETL nạp bản ghi |
| `loaded_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm nạp bản ghi |

---

### 3. Chiến lược Đánh Chỉ mục (Indexing Strategy)

Để tối ưu hóa các thao tác lọc đa chiều và JOIN trong Star Schema, hệ thống thiết lập các chỉ mục vật lý:

1. **Chỉ mục Thực thi Hạt dữ liệu (Grain Integrity Index):**
   ```sql
   CREATE UNIQUE INDEX idx_fsp_grain 
   ON fact_student_performance(student_key, course_key, semester_key);
   ```
   *Mục đích:* Ngăn chặn tuyệt đối tình trạng nhân đôi bản ghi khi chạy lại ETL (Idempotency).

2. **Chỉ mục Khóa ngoại Phục vụ Star-JOIN:**
   ```sql
   CREATE INDEX idx_fsp_student ON fact_student_performance(student_key);
   CREATE INDEX idx_fsp_course ON fact_student_performance(course_key);
   CREATE INDEX idx_fsp_semester ON fact_student_performance(semester_key);
   CREATE INDEX idx_fsp_dept ON fact_student_performance(department_key);
   CREATE INDEX idx_fsp_major ON fact_student_performance(major_key);
   ```
   *Mục đích:* Giúp công cụ cơ sở dữ liệu thực hiện Hash Join và Index Scan thay vì Full Table Scan khi người dùng lọc theo Khoa, Ngành, Học kỳ trên Dashboard.

3. **Chỉ mục Truy vấn Phiên bản Hiện hành SCD Type 2:**
   ```sql
   CREATE INDEX idx_dim_student_current ON dim_student(student_id, is_current);
   ```
   *Mục đích:* Tối ưu hóa truy vấn tìm kiếm phiên bản sinh viên đang còn hiệu lực khi nạp Fact mới.

---

### 4. Bảng Kiểm toán & Chất lượng Dữ liệu

```sql
CREATE TABLE etl_audit_log (
    batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'FAILED', 'WARNING'
    rows_extracted INTEGER DEFAULT 0,
    rows_valid INTEGER DEFAULT 0,
    rows_rejected INTEGER DEFAULT 0,
    rows_loaded_dim INTEGER DEFAULT 0,
    rows_loaded_fact INTEGER DEFAULT 0,
    execution_duration_sec REAL DEFAULT 0,
    details TEXT
);

CREATE TABLE etl_rejected_records (
    reject_id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    source_table VARCHAR(50) NOT NULL,
    record_identifier VARCHAR(100),
    reason_code VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    raw_data TEXT,
    rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES etl_audit_log(batch_id)
);
```
