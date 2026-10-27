"""
EduPulse — Synthetic Data Generator
Generates realistic, deterministic university training & academic data with seed=42.
Produces raw CSVs and populates the simulated OLTP database (edupulse_oltp.db).
Includes controlled edge-case anomalies to validate ETL quality rejection pipelines.
"""

import os
import random
import sqlite3
import pandas as pd
from datetime import datetime, timedelta

def generate_all_data(output_dir="raw_data", oltp_db_path="../database/edupulse_oltp.db"):
    random.seed(42)
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    raw_dir = os.path.join(current_dir, output_dir)
    os.makedirs(raw_dir, exist_ok=True)
    
    oltp_full_path = os.path.join(current_dir, oltp_db_path)
    os.makedirs(os.path.dirname(oltp_full_path), exist_ok=True)
    
    # -------------------------------------------------------------
    # 1. Departments (4 faculties)
    # -------------------------------------------------------------
    departments = [
        {"department_id": "CNTT", "department_name": "Khoa Công nghệ Thông tin", "faculty_dean": "PGS.TS. Trần Đình Dũng"},
        {"department_id": "DTVT", "department_name": "Khoa Điện tử Viễn thông", "faculty_dean": "TS. Lê Hoàng Mai"},
        {"department_id": "KTTC", "department_name": "Khoa Kinh tế & Tài chính", "faculty_dean": "PGS.TS. Nguyễn Văn Hưng"},
        {"department_id": "NN", "department_name": "Khoa Ngoại ngữ Ứng dụng", "faculty_dean": "TS. Phạm Quỳnh Anh"},
    ]
    df_departments = pd.DataFrame(departments)
    df_departments.to_csv(os.path.join(raw_dir, "departments.csv"), index=False, encoding="utf-8-sig")
    
    # -------------------------------------------------------------
    # 2. Majors (8 programs)
    # -------------------------------------------------------------
    majors = [
        {"major_id": "KTPM", "major_name": "Kỹ thuật Phần mềm", "department_id": "CNTT", "required_credits": 135},
        {"major_id": "KHMT", "major_name": "Khoa học Máy tính", "department_id": "CNTT", "required_credits": 135},
        {"major_id": "ATTT", "major_name": "An toàn Thông tin", "department_id": "CNTT", "required_credits": 132},
        {"major_id": "DTVT_TT", "major_name": "Kỹ thuật Viễn thông", "department_id": "DTVT", "required_credits": 130},
        {"major_id": "IOT", "major_name": "Kỹ thuật IoT & Hệ thống Nhúng", "department_id": "DTVT", "required_credits": 132},
        {"major_id": "QTKD", "major_name": "Quản trị Kinh doanh", "department_id": "KTTC", "required_credits": 128},
        {"major_id": "TCNH", "major_name": "Tài chính - Ngân hàng", "department_id": "KTTC", "required_credits": 128},
        {"major_id": "NNA", "major_name": "Ngôn ngữ Anh Thương mại", "department_id": "NN", "required_credits": 125},
    ]
    df_majors = pd.DataFrame(majors)
    df_majors.to_csv(os.path.join(raw_dir, "majors.csv"), index=False, encoding="utf-8-sig")

    # -------------------------------------------------------------
    # 3. Courses (22 courses with difficulty profiles)
    # -------------------------------------------------------------
    courses_data = [
        # CNTT courses
        ("CS101", "Nhập môn Lập trình Python", 3, "CNTT", "FOUNDATION", 1, 0.12),
        ("CS102", "Cấu trúc Dữ liệu và Giải thuật", 4, "CNTT", "CORE", 1, 0.28), # High failure rate
        ("CS201", "Cơ sở Dữ liệu & Hệ quản trị CSDL", 3, "CNTT", "CORE", 1, 0.15),
        ("CS202", "Lập trình Web Hiện đại", 3, "CNTT", "ELECTIVE", 0, 0.08),
        ("CS301", "Kiến trúc Kho dữ liệu & BI", 3, "CNTT", "CORE", 1, 0.14),
        ("CS302", "Hệ điều hành & Mạng máy tính", 4, "CNTT", "CORE", 1, 0.25), # Difficult
        ("CS303", "Trí tuệ Nhân tạo Cơ sở", 3, "CNTT", "CORE", 1, 0.18),
        ("CS401", "Đồ án Tốt nghiệp CNTT", 4, "CNTT", "CORE", 1, 0.04),
        
        # DTVT courses
        ("ET101", "Mạch điện & Điện tử Tương tự", 3, "DTVT", "FOUNDATION", 1, 0.22),
        ("ET201", "Xử lý Tín hiệu Số", 4, "DTVT", "CORE", 1, 0.30), # Tough
        ("ET202", "Vi điều khiển & Lập trình Nhúng", 3, "DTVT", "CORE", 1, 0.16),
        ("ET301", "Giao thức Truyền thông IoT", 3, "DTVT", "ELECTIVE", 0, 0.10),
        
        # KTTC courses
        ("BA101", "Kinh tế Vi mô & Vĩ mô", 3, "KTTC", "FOUNDATION", 1, 0.18),
        ("BA102", "Nguyên lý Kế toán", 3, "KTTC", "FOUNDATION", 1, 0.20),
        ("BA201", "Quản trị Tài chính Doanh nghiệp", 3, "KTTC", "CORE", 1, 0.24),
        ("BA202", "Phân tích Dữ liệu Kinh doanh", 3, "KTTC", "CORE", 1, 0.12),
        ("BA301", "Marketing Căn bản & Kỹ thuật số", 3, "KTTC", "ELECTIVE", 0, 0.07),
        
        # General & Languages
        ("GE101", "Giải tích 1 cho Kỹ thuật", 4, "CNTT", "FOUNDATION", 1, 0.35), # Very high fail rate
        ("GE102", "Đại số Tuyến tính & Xác suất", 3, "CNTT", "FOUNDATION", 1, 0.26),
        ("EN101", "Tiếng Anh Học thuật 1", 3, "NN", "FOUNDATION", 1, 0.14),
        ("EN102", "Tiếng Anh Giao tiếp & Thuyết trình", 3, "NN", "ELECTIVE", 0, 0.06),
        ("EN201", "Tiếng Anh Chuyên ngành Kỹ thuật", 3, "NN", "CORE", 1, 0.10),
    ]
    
    courses = []
    course_difficulty_map = {}
    for code, name, creds, dept, lvl, core, base_fail in courses_data:
        courses.append({
            "course_code": code,
            "course_name": name,
            "credits": creds,
            "department_id": dept,
            "course_level": lvl,
            "is_core": core
        })
        course_difficulty_map[code] = base_fail
        
    df_courses = pd.DataFrame(courses)
    df_courses.to_csv(os.path.join(raw_dir, "courses.csv"), index=False, encoding="utf-8-sig")

    # -------------------------------------------------------------
    # 4. Semesters (5 semesters)
    # -------------------------------------------------------------
    semesters = [
        {"semester_id": "2023_HK1", "academic_year": "2023-2024", "term_name": "Học kỳ 1", "start_date": "2023-09-05", "end_date": "2024-01-20", "chronological_order": 1},
        {"semester_id": "2023_HK2", "academic_year": "2023-2024", "term_name": "Học kỳ 2", "start_date": "2024-02-15", "end_date": "2024-06-30", "chronological_order": 2},
        {"semester_id": "2024_HK1", "academic_year": "2024-2025", "term_name": "Học kỳ 1", "start_date": "2024-09-05", "end_date": "2025-01-20", "chronological_order": 3},
        {"semester_id": "2024_HK2", "academic_year": "2024-2025", "term_name": "Học kỳ 2", "start_date": "2025-02-15", "end_date": "2025-06-30", "chronological_order": 4},
        {"semester_id": "2025_HK1", "academic_year": "2025-2026", "term_name": "Học kỳ 1", "start_date": "2025-09-05", "end_date": "2026-01-20", "chronological_order": 5},
    ]
    df_semesters = pd.DataFrame(semesters)
    df_semesters.to_csv(os.path.join(raw_dir, "semesters.csv"), index=False, encoding="utf-8-sig")

    # -------------------------------------------------------------
    # 5. Students (500 synthetic students)
    # -------------------------------------------------------------
    first_names_male = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương"]
    middle_names_male = ["Văn", "Hoàng", "Minh", "Hải", "Tuấn", "Quốc", "Đức", "Thành", "Gia", "Hữu", "Bảo"]
    last_names_male = ["An", "Bình", "Cường", "Dũng", "Đạt", "Hải", "Hiếu", "Huy", "Khoa", "Long", "Nam", "Nghĩa", "Phúc", "Quân", "Sơn", "Thắng", "Tùng", "Vinh"]
    
    first_names_fem = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đoàn", "Đinh", "Lâm"]
    middle_names_fem = ["Thị", "Ngọc", "Thanh", "Phương", "Khánh", "Thu", "Mai", "Như", "Diệu"]
    last_names_fem = ["Anh", "Châu", "Dung", "Hà", "Hạnh", "Hoa", "Hương", "Lan", "Linh", "Mai", "Nga", "Nhi", "Phương", "Quỳnh", "Thảo", "Trang", "Uyên", "Yến"]

    major_ids = [m["major_id"] for m in majors]
    cohorts = [2021, 2022, 2023, 2024]
    
    students = []
    student_academic_ability = {} # latent ability factor 0.4 to 1.6
    
    for i in range(1, 501):
        sid = f"SV{2020 + (i % 5):04d}{i:04d}" # e.g. SV20220104
        gender = "Nam" if random.random() < 0.62 else "Nữ"
        if gender == "Nam":
            name = f"{random.choice(first_names_male)} {random.choice(middle_names_male)} {random.choice(last_names_male)}"
        else:
            name = f"{random.choice(first_names_fem)} {random.choice(middle_names_fem)} {random.choice(last_names_fem)}"
            
        cohort = random.choices(cohorts, weights=[0.15, 0.30, 0.35, 0.20])[0]
        birth_year = cohort - 18
        major = random.choice(major_ids)
        
        status = "ENROLLED"
        if cohort == 2021 and random.random() < 0.15:
            status = "GRADUATED"
        elif random.random() < 0.03:
            status = "SUSPENDED"
            
        students.append({
            "student_id": sid,
            "full_name": name,
            "gender": gender,
            "birth_year": birth_year,
            "cohort_year": cohort,
            "major_id": major,
            "status": status
        })
        
        # Latent ability determines student base performance
        base_ability = random.gauss(1.0, 0.22)
        student_academic_ability[sid] = max(0.4, min(1.6, base_ability))
        
    df_students = pd.DataFrame(students)
    df_students.to_csv(os.path.join(raw_dir, "students.csv"), index=False, encoding="utf-8-sig")

    # -------------------------------------------------------------
    # 6. Class Sections (for all courses across semesters)
    # -------------------------------------------------------------
    lecturers = [
        "ThS. Vũ Tiến Dũng", "TS. Nguyễn Minh Hải", "ThS. Trần Thu Trang",
        "TS. Phạm Quang Huy", "ThS. Lê Bảo Ngọc", "TS. Hoàng Quốc Tuấn",
        "ThS. Đỗ Thùy Linh", "PGS.TS. Đặng Thanh Sơn"
    ]
    
    class_sections = []
    section_map = {} # (course_code, semester_id) -> list of section_ids
    
    sec_count = 1
    for sem in semesters:
        s_id = sem["semester_id"]
        for c in courses:
            c_code = c["course_code"]
            num_sec = random.choice([2, 3])
            section_map[(c_code, s_id)] = []
            for s_idx in range(1, num_sec + 1):
                sec_id = f"SEC_{c_code}_{s_id}_{s_idx:02d}"
                class_sections.append({
                    "section_id": sec_id,
                    "course_code": c_code,
                    "semester_id": s_id,
                    "lecturer_name": random.choice(lecturers),
                    "max_capacity": 65
                })
                section_map[(c_code, s_id)].append(sec_id)
                sec_count += 1
                
    df_sections = pd.DataFrame(class_sections)
    df_sections.to_csv(os.path.join(raw_dir, "class_sections.csv"), index=False, encoding="utf-8-sig")

    # -------------------------------------------------------------
    # 7. Enrollments & Attendance
    # -------------------------------------------------------------
    enrollments = []
    attendance_records = []
    
    # Track historical failed courses per student to model retakes
    student_past_failures = {s["student_id"]: set() for s in students}
    
    # Sort semesters chronologically
    sorted_semesters = sorted(semesters, key=lambda x: x["chronological_order"])
    
    enrollment_id_counter = 1
    
    for sem in sorted_semesters:
        s_id = sem["semester_id"]
        sem_num = sem["chronological_order"]
        sem_start = datetime.strptime(sem["start_date"], "%Y-%m-%d")
        
        # Eligible students active in this semester
        for st in students:
            sid = st["student_id"]
            cohort = st["cohort_year"]
            
            # Student enters when semester starts
            cohort_first_sem = (cohort - 2021) * 2 + 1
            if sem_num < cohort_first_sem:
                continue
            if st["status"] == "GRADUATED" and sem_num >= 4:
                continue
            if st["status"] == "SUSPENDED" and sem_num >= 3:
                continue
                
            ability = student_academic_ability[sid]
            major = st["major_id"]
            
            # Select 4 to 6 courses for student
            # Prioritize retakes first
            eligible_courses = []
            for f_code in list(student_past_failures[sid]):
                eligible_courses.append((f_code, 1)) # retake = 1
                student_past_failures[sid].remove(f_code)
                
            # Filter courses appropriate for major & department
            dept_id = next(m["department_id"] for m in majors if m["major_id"] == major)
            dept_courses = [c["course_code"] for c in courses if c["department_id"] == dept_id or c["course_level"] == "FOUNDATION"]
            other_courses = [c["course_code"] for c in courses if c["course_code"] not in dept_courses]
            
            needed_count = random.randint(4, 5) - len(eligible_courses)
            if needed_count > 0:
                sampled = random.sample(dept_courses, min(needed_count, len(dept_courses)))
                for sc in sampled:
                    eligible_courses.append((sc, 0)) # retake = 0
                    
            for c_code, is_retake in eligible_courses:
                sec_list = section_map.get((c_code, s_id), [])
                if not sec_list:
                    continue
                chosen_sec = random.choice(sec_list)
                
                # Realistic attendance calculation
                # Correlated with student ability + random variation
                base_att = 82.0 + (ability - 1.0) * 18.0 + random.gauss(0, 7.0)
                if is_retake:
                    base_att += random.uniform(-5.0, 5.0)
                attendance_rate = round(max(40.0, min(100.0, base_att)), 1)
                
                # Score calculations
                course_fail_prop = course_difficulty_map.get(c_code, 0.15)
                # Ability effect + attendance penalty
                att_factor = (attendance_rate / 100.0)
                
                # If attendance < 70%, strong score penalty
                score_center = (ability * 6.5) * (0.8 + 0.25 * att_factor) - (course_fail_prop * 3.5)
                midterm = round(max(1.0, min(10.0, random.gauss(score_center, 1.2))), 1)
                final = round(max(1.0, min(10.0, random.gauss(score_center + 0.2, 1.3))), 1)
                
                total_score = round(midterm * 0.4 + final * 0.6, 1)
                
                # If attendance is severely low (< 65%), automatic failure or cap at 3.5
                if attendance_rate < 60.0:
                    total_score = min(total_score, 3.5)
                    final = min(final, 3.0)
                    
                # Letter grade & GPA scale 4
                if total_score >= 8.5:
                    letter = "A" if total_score < 9.0 else "A+"
                    gpa4 = 4.0
                elif total_score >= 8.0:
                    letter = "B+"
                    gpa4 = 3.5
                elif total_score >= 7.0:
                    letter = "B"
                    gpa4 = 3.0
                elif total_score >= 6.5:
                    letter = "C+"
                    gpa4 = 2.5
                elif total_score >= 5.5:
                    letter = "C"
                    gpa4 = 2.0
                elif total_score >= 5.0:
                    letter = "D+"
                    gpa4 = 1.5
                elif total_score >= 4.0:
                    letter = "D"
                    gpa4 = 1.0
                else:
                    letter = "F"
                    gpa4 = 0.0
                    student_past_failures[sid].add(c_code)
                    
                enr_date = (sem_start + timedelta(days=random.randint(1, 14))).strftime("%Y-%m-%d")
                
                enrollments.append({
                    "enrollment_id": enrollment_id_counter,
                    "student_id": sid,
                    "section_id": chosen_sec,
                    "course_code": c_code,
                    "semester_id": s_id,
                    "midterm_score": midterm,
                    "final_score": final,
                    "total_score": total_score,
                    "letter_grade": letter,
                    "gpa_point_4": gpa4,
                    "attendance_rate": attendance_rate,
                    "is_retake": is_retake,
                    "enrollment_date": enr_date
                })
                
                # Attendance aggregate sessions (15 weeks)
                total_sessions = 15
                present_cnt = round((attendance_rate / 100.0) * total_sessions)
                present_cnt = min(total_sessions, max(0, present_cnt))
                absent_cnt = total_sessions - present_cnt
                excused_cnt = random.randint(0, min(2, absent_cnt)) if absent_cnt > 0 else 0
                unexcused_cnt = absent_cnt - excused_cnt
                
                attendance_records.append({
                    "student_id": sid,
                    "section_id": chosen_sec,
                    "course_code": c_code,
                    "semester_id": s_id,
                    "total_sessions": total_sessions,
                    "present_sessions": present_cnt,
                    "excused_absent_sessions": excused_cnt,
                    "unexcused_absent_sessions": unexcused_cnt,
                    "attendance_percentage": attendance_rate
                })
                
                enrollment_id_counter += 1

    # -------------------------------------------------------------
    # Controlled Anomalies for Data Quality Testing (ETL Rejection)
    # -------------------------------------------------------------
    # 1. Out of range total score (> 10)
    enrollments.append({
        "enrollment_id": 99901,
        "student_id": "SV20220005",
        "section_id": "SEC_CS101_2023_HK1_01",
        "course_code": "CS101",
        "semester_id": "2023_HK1",
        "midterm_score": 12.5,
        "final_score": 15.0,
        "total_score": 14.0, # INVALID > 10.0
        "letter_grade": "A+",
        "gpa_point_4": 4.0,
        "attendance_rate": 90.0,
        "is_retake": 0,
        "enrollment_date": "2023-09-10"
    })
    
    # 2. Non-existent student reference (Referential integrity failure)
    enrollments.append({
        "enrollment_id": 99902,
        "student_id": "SV_UNKNOWN_9999", # UNKNOWN STUDENT
        "section_id": "SEC_CS101_2023_HK1_01",
        "course_code": "CS101",
        "semester_id": "2023_HK1",
        "midterm_score": 7.0,
        "final_score": 7.5,
        "total_score": 7.3,
        "letter_grade": "B",
        "gpa_point_4": 3.0,
        "attendance_rate": 85.0,
        "is_retake": 0,
        "enrollment_date": "2023-09-10"
    })
    
    # 3. Non-existent course code
    enrollments.append({
        "enrollment_id": 99903,
        "student_id": "SV20220010",
        "section_id": "SEC_CS101_2023_HK1_01",
        "course_code": "NON_EXIST_99", # UNKNOWN COURSE
        "semester_id": "2023_HK1",
        "midterm_score": 8.0,
        "final_score": 8.0,
        "total_score": 8.0,
        "letter_grade": "B+",
        "gpa_point_4": 3.5,
        "attendance_rate": 90.0,
        "is_retake": 0,
        "enrollment_date": "2023-09-10"
    })

    # 4. Out of range attendance rate (< 0 or > 100)
    enrollments.append({
        "enrollment_id": 99904,
        "student_id": "SV20220015",
        "section_id": "SEC_CS102_2023_HK1_01",
        "course_code": "CS102",
        "semester_id": "2023_HK1",
        "midterm_score": 6.0,
        "final_score": 6.0,
        "total_score": 6.0,
        "letter_grade": "C",
        "gpa_point_4": 2.0,
        "attendance_rate": 125.0, # INVALID > 100%
        "is_retake": 0,
        "enrollment_date": "2023-09-10"
    })

    # Save to CSV
    df_enrollments = pd.DataFrame(enrollments)
    df_enrollments.to_csv(os.path.join(raw_dir, "enrollments.csv"), index=False, encoding="utf-8-sig")
    
    df_attendance = pd.DataFrame(attendance_records)
    df_attendance.to_csv(os.path.join(raw_dir, "attendance_logs.csv"), index=False, encoding="utf-8-sig")

    # -------------------------------------------------------------
    # 8. Populate OLTP Database (Simulated Source System)
    # -------------------------------------------------------------
    conn = sqlite3.connect(oltp_full_path)
    cursor = conn.cursor()
    
    # Read and apply OLTP DDL
    oltp_ddl_path = os.path.join(current_dir, "../database/oltp_schema.sql")
    with open(oltp_ddl_path, "r", encoding="utf-8") as f:
        cursor.executescript(f.read())
        
    # Clear existing tables to ensure clean reload
    for tbl in ["attendance_logs", "enrollments", "class_sections", "students", "courses", "semesters", "majors", "departments"]:
        cursor.execute(f"DELETE FROM {tbl};")
        
    df_departments.to_sql("departments", conn, if_exists="append", index=False)
    df_majors.to_sql("majors", conn, if_exists="append", index=False)
    df_students.to_sql("students", conn, if_exists="append", index=False)
    df_courses.to_sql("courses", conn, if_exists="append", index=False)
    df_semesters.to_sql("semesters", conn, if_exists="append", index=False)
    df_sections.to_sql("class_sections", conn, if_exists="append", index=False)
    df_enrollments.to_sql("enrollments", conn, if_exists="append", index=False)
    
    conn.commit()
    conn.close()
    
    print(f"Data Generation Completed Successfully!")
    print(f"- Raw CSV files saved to: {raw_dir}")
    print(f"- Departments: {len(departments)}")
    print(f"- Majors: {len(majors)}")
    print(f"- Courses: {len(courses)}")
    print(f"- Semesters: {len(semesters)}")
    print(f"- Students: {len(students)}")
    print(f"- Total Enrollments (including 4 test anomalies): {len(enrollments)}")
    print(f"- OLTP database initialized at: {oltp_full_path}")
    
    return {
        "departments": len(departments),
        "majors": len(majors),
        "courses": len(courses),
        "semesters": len(semesters),
        "students": len(students),
        "enrollments": len(enrollments),
    }

if __name__ == "__main__":
    generate_all_data()
