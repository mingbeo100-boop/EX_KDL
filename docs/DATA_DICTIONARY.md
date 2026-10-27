# EduPulse — Data Dictionary Document
## Complete Metadata & Business Rules Reference

Dưới đây là từ điển dữ liệu chính thức của Kho Dữ Liệu EduPulse, đồng bộ trực tiếp với file `database/data_dictionary.json` và cấu trúc bảng vật lý.

---

### 1. Bảng `fact_student_performance`
- **Loại bảng:** FACT
- **Mô tả nghiệp vụ:** Bảng Fact trung tâm ghi nhận kết quả học tập, điểm số thành phần, điểm tổng kết và chuyên cần cho mỗi lượt sinh viên đăng ký một môn học trong học kỳ.
- **Grain:** 1 bản ghi cho 1 lượt đăng ký học phần của 1 sinh viên trong 1 lớp học phần tại 1 học kỳ `(student_key, course_key, semester_key)`.

| Tên Cột | Kiểu | Khóa | Null? | Đơn vị | Mô tả nghiệp vụ | Quy tắc kiểm tra | Giá trị mẫu |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `performance_key` | INTEGER | PK | NO | ID | Khóa thay thế bản ghi | > 0, Unique | 1 |
| `student_key` | INTEGER | FK | NO | SK | Trỏ đến dim_student | Tồn tại trong dim_student | 104 |
| `course_key` | INTEGER | FK | NO | SK | Trỏ đến dim_course | Tồn tại trong dim_course | 12 |
| `semester_key` | INTEGER | FK | NO | SK | Trỏ đến dim_semester | Tồn tại trong dim_semester | 3 |
| `major_key` | INTEGER | FK | NO | SK | Trỏ đến dim_major | Tồn tại trong dim_major | 2 |
| `department_key` | INTEGER | FK | NO | SK | Trỏ đến dim_department | Tồn tại trong dim_department | 1 |
| `date_key` | INTEGER | FK | YES | YYYYMMDD | Ngày hoàn thành môn | Định dạng số nguyên ngày | 20240115 |
| `section_id` | VARCHAR(50) | - | NO | Code | Mã lớp học phần (Degenerate Dim) | Không rỗng | SEC_CS101_20231_01 |
| `attendance_rate` | REAL | - | NO | % | Tỷ lệ tham dự lớp học | 0.00 <= rate <= 100.00 | 88.5 |
| `midterm_score` | REAL | - | YES | Thang 10 | Điểm kiểm tra giữa kỳ | 0.0 <= score <= 10.0 | 7.5 |
| `final_score` | REAL | - | YES | Thang 10 | Điểm thi kết thúc học phần | 0.0 <= score <= 10.0 | 8.0 |
| `total_score` | REAL | - | NO | Thang 10 | Điểm tổng kết: midterm*0.4 + final*0.6 | 0.0 <= score <= 10.0 | 7.8 |
| `gpa_point_4` | REAL | - | NO | Thang 4 | Quy đổi hệ 4 theo chuẩn GD&ĐT | 0.0 <= gpa <= 4.0 | 3.2 |
| `letter_grade` | VARCHAR(5) | - | NO | Chữ | Xếp loại điểm chữ | Thuộc tập A+, A, B+.. F | B+ |
| `credits_attempted`| INTEGER | - | NO | Tín chỉ | Số tín chỉ của môn học | 1 <= creds <= 6 | 3 |
| `credits_earned` | INTEGER | - | NO | Tín chỉ | Tín chỉ tích lũy đạt được | 0 nếu trượt, bằng attempted nếu đạt | 3 |
| `is_passed` | INTEGER | - | NO | Cờ 0/1 | Chỉ báo đạt môn (total >= 4.0) | IN (0, 1) | 1 |
| `is_retake` | INTEGER | - | NO | Cờ 0/1 | Chỉ báo sinh viên học lại | IN (0, 1) | 0 |
| `batch_id` | INTEGER | FK | NO | Batch ID | Mã đợt chạy ETL đưa dữ liệu vào | Tồn tại trong etl_audit_log | 1 |
| `loaded_at` | TIMESTAMP | - | NO | Datetime | Thời điểm nạp bản ghi vào Fact | ISO Datetime | 2026-10-20 14:00:00 |

---

### 2. Bảng `dim_student`
- **Loại bảng:** DIMENSION (SCD Type 2)
- **Mô tả nghiệp vụ:** Chiều sinh viên theo dõi lịch sử biến động chuyên ngành hoặc trạng thái đào tạo.
- **Grain:** 1 bản ghi cho 1 phiên bản hiệu lực của một sinh viên `(student_id, valid_from)`.

| Tên Cột | Kiểu | Khóa | Null? | Mô tả nghiệp vụ | Giá trị mẫu |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `student_key` | INTEGER | PK | NO | Khóa thay thế duy nhất từng phiên bản | 1 |
| `student_id` | VARCHAR(20) | - | NO | Mã sinh viên tự nhiên (Business Key) | SV2022001 |
| `full_name` | VARCHAR(100) | - | NO | Họ và tên sinh viên | Nguyễn Hoàng Nam |
| `gender` | VARCHAR(10) | - | NO | Giới tính (Nam / Nữ) | Nam |
| `birth_year` | INTEGER | - | NO | Năm sinh | 2004 |
| `cohort_year` | INTEGER | - | NO | Khóa trúng tuyển nhập học | 2022 |
| `major_key` | INTEGER | FK | NO | Khóa ngoại ngành đào tạo | 1 |
| `major_name` | VARCHAR(100) | - | NO | Tên chuyên ngành (Denormalized) | Kỹ thuật Phần mềm |
| `department_name`| VARCHAR(100) | - | NO | Tên khoa quản lý | Công nghệ Thông tin |
| `status` | VARCHAR(30) | - | NO | Trạng thái: ENROLLED, GRADUATED, SUSPENDED | ENROLLED |
| `valid_from` | TIMESTAMP | - | NO | Thời điểm bắt đầu hiệu lực bản ghi | 2022-09-01 00:00:00 |
| `valid_to` | TIMESTAMP | - | YES | Thời điểm hết hiệu lực (NULL nếu hiện hành) | NULL |
| `is_current` | INTEGER | - | NO | Cờ bản ghi hiện hành nhất (1: Hiện hành, 0: Cũ) | 1 |

---

### 3. Bảng `dim_course`
- **Loại bảng:** DIMENSION
- **Mô tả nghiệp vụ:** Chiều môn học chứa mã học phần, số tín chỉ và khối kiến thức.
- **Grain:** 1 bản ghi cho 1 môn học.

| Tên Cột | Kiểu | Khóa | Null? | Mô tả nghiệp vụ | Giá trị mẫu |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `course_key` | INTEGER | PK | NO | Khóa thay thế môn học | 1 |
| `course_code` | VARCHAR(20) | - | NO | Mã học phần tự nhiên (CS101) | CS101 |
| `course_name` | VARCHAR(150) | - | NO | Tên học phần | Nhập môn Lập trình Python |
| `credits` | INTEGER | - | NO | Số tín chỉ của môn học | 3 |
| `department_key`| INTEGER | FK | NO | Khóa ngoại khoa phụ trách | 1 |
| `department_name`| VARCHAR(100)| - | NO | Tên khoa phụ trách | Công nghệ Thông tin |
| `course_level` | VARCHAR(20) | - | NO | Khối kiến thức: FOUNDATION, CORE, ELECTIVE | FOUNDATION |
| `is_core` | INTEGER | - | NO | Chỉ báo môn bắt buộc (1) hay tự chọn (0) | 1 |

---

### 4. Bảng `dim_semester`
- **Loại bảng:** DIMENSION
- **Mô tả nghiệp vụ:** Chiều học kỳ đại diện cho trục thời gian học vụ.
- **Grain:** 1 bản ghi cho 1 học kỳ.

| Tên Cột | Kiểu | Khóa | Null? | Mô tả nghiệp vụ | Giá trị mẫu |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `semester_key` | INTEGER | PK | NO | Khóa thay thế học kỳ | 1 |
| `semester_id` | VARCHAR(20) | - | NO | Mã học kỳ nghiệp vụ (2023_HK1) | 2023_HK1 |
| `academic_year` | VARCHAR(20) | - | NO | Niên khóa (2023-2024) | 2023-2024 |
| `term_name` | VARCHAR(20) | - | NO | Tên kỳ (Học kỳ 1, Học kỳ 2) | Học kỳ 1 |
| `start_date` | DATE | - | NO | Ngày bắt đầu kỳ học | 2023-09-05 |
| `end_date` | DATE | - | NO | Ngày kết thúc kỳ học | 2024-01-20 |
| `chronological_order` | INTEGER | - | NO | Thứ tự tuyến tính phục vụ vẽ đồ thị xu hướng | 1 |

---

### 5. Bảng `etl_audit_log` & `etl_rejected_records`
- **etl_audit_log:** Ghi nhận lịch sử từng đợt chạy ETL (`batch_id`, `pipeline_name`, `start_time`, `end_time`, `status`, `rows_extracted`, `rows_valid`, `rows_rejected`, `rows_loaded_fact`, `execution_duration_sec`).
- **etl_rejected_records:** Lưu trữ chi tiết từng dòng dữ liệu bị từ chối (`reject_id`, `batch_id`, `source_table`, `record_identifier`, `reason_code`, `error_message`, `raw_data`).
