"""
EduPulse — Data Warehouse Architecture, SCD Type 2 & KPI Comprehensive Tests
Validates:
1. SQLite Foreign Key referential integrity enforcement.
2. Kimball Star Schema SCD Type 2 lifecycle (insert, idempotent rerun, SCD1 in-place update, SCD2 version expiration).
3. Fact table historical dimension version resolution.
4. Unique student metric stability against SCD2 version proliferation.
5. Independent mathematical validation of KPI formulas.
6. Transparent early-warning academic risk boundary heuristics.
"""

import os
import sqlite3
import pytest
import pandas as pd
from datetime import datetime
from backend.app.services.analytics_service import AnalyticsService
from etl.load import WarehouseLoader

@pytest.fixture
def temp_dw_loader(tmp_path):
    """Creates an isolated temporary Data Warehouse database for hermetic testing."""
    db_file = str(tmp_path / "test_edupulse_dw.db")
    loader = WarehouseLoader(dw_db_path=db_file)
    return loader, db_file

def test_sqlite_foreign_key_enforcement(temp_dw_loader):
    """
    Test 1: Referential Integrity Enforcement
    Verifies that attempting to insert a Fact record with an invalid course_key
    violates foreign key constraints and raises sqlite3.IntegrityError.
    """
    loader, db_file = temp_dw_loader
    conn = loader.get_connection()
    cursor = conn.cursor()
    
    # Insert prerequisite dimension records
    cursor.execute("INSERT INTO dim_department (department_id, department_name) VALUES ('CNTT', 'Khoa CNTT')")
    dept_key = cursor.lastrowid
    cursor.execute("INSERT INTO dim_major (major_id, major_name, department_key, department_name) VALUES ('KTPM', 'Kỹ thuật PM', ?, 'Khoa CNTT')", (dept_key,))
    major_key = cursor.lastrowid
    cursor.execute("""
        INSERT INTO dim_student (student_id, full_name, gender, birth_year, cohort_year, major_key, major_name, department_name, status, valid_from, is_current)
        VALUES ('SV999', 'Nguyen Van Test', 'NAM', 2004, 2022, ?, 'Kỹ thuật PM', 'Khoa CNTT', 'ENROLLED', '2023-01-01', 1)
    """, (major_key,))
    student_key = cursor.lastrowid
    cursor.execute("INSERT INTO dim_semester (semester_id, academic_year, term_name, start_date, end_date, chronological_order) VALUES ('2023_HK1', '2023-2024', 'HK1', '2023-09-01', '2024-01-15', 1)")
    sem_key = cursor.lastrowid
    conn.commit()

    # Attempt to insert Fact with non-existent course_key = 999999
    with pytest.raises(sqlite3.IntegrityError):
        cursor.execute("""
            INSERT INTO fact_student_performance (
                student_key, course_key, semester_key, major_key, department_key, section_id,
                attendance_rate, total_score, gpa_point_4, letter_grade, credits_attempted,
                credits_earned, is_passed, is_retake, batch_id
            ) VALUES (?, 999999, ?, ?, ?, 'SEC_01', 90.0, 8.0, 3.5, 'B+', 3, 3, 1, 0, 1)
        """, (student_key, sem_key, major_key, dept_key))
        conn.commit()

    conn.close()

def test_scd_type_2_full_lifecycle(temp_dw_loader):
    """
    Test 2: Complete SCD Type 2 Lifecycle
    - Step A: Insert initial student record -> 1 active version.
    - Step B: Re-run with identical data -> 0 new versions created (idempotency).
    - Step C: Update non-tracked attribute (full_name) -> SCD Type 1 in-place update (still 1 version).
    - Step D: Change major -> SCD Type 2 version split (version 1 closed, version 2 created active).
    """
    loader, db_file = temp_dw_loader
    
    depts = pd.DataFrame([
        {"department_id": "CNTT", "department_name": "Khoa CNTT", "faculty_dean": "Dean 1"},
        {"department_id": "KTTC", "department_name": "Khoa Kinh Te", "faculty_dean": "Dean 2"}
    ])
    majors = pd.DataFrame([
        {"major_id": "KTPM", "major_name": "Kỹ thuật Phần mềm", "department_id": "CNTT", "required_credits": 135},
        {"major_id": "QTKD", "major_name": "Quản trị Kinh doanh", "department_id": "KTTC", "required_credits": 128}
    ])
    courses = pd.DataFrame([
        {"course_code": "CS101", "course_name": "Lap Trinh", "department_id": "CNTT", "credits": 3, "course_level": "CORE", "is_core": 1}
    ])
    semesters = pd.DataFrame([
        {"semester_id": "2023_HK1", "academic_year": "2023-2024", "term_name": "HK1", "start_date": "2023-09-01", "end_date": "2024-01-15", "chronological_order": 1}
    ])
    
    # Step A: Initial load
    students_v1 = pd.DataFrame([{
        "student_id": "SV_SCD2_01",
        "full_name": "Tran Van An",
        "gender": "NAM",
        "birth_year": 2004,
        "cohort_year": 2022,
        "major_id": "KTPM",
        "status": "ENROLLED"
    }])
    
    maps = loader.load_dimensions(depts, majors, courses, semesters, students_v1)
    
    conn = loader.get_connection()
    cursor = conn.cursor()
    v1_rows = cursor.execute("SELECT student_key, full_name, major_name, valid_to, is_current FROM dim_student WHERE student_id = 'SV_SCD2_01'").fetchall()
    assert len(v1_rows) == 1
    assert v1_rows[0][1] == "Tran Van An"
    assert v1_rows[0][2] == "Kỹ thuật Phần mềm"
    assert v1_rows[0][3] is None  # valid_to is NULL for active version
    assert v1_rows[0][4] == 1     # is_current is 1
    v1_key = v1_rows[0][0]
    
    # Step B: Idempotent rerun with same data
    loader.load_dimensions(depts, majors, courses, semesters, students_v1)
    v1_rerun_rows = cursor.execute("SELECT student_key FROM dim_student WHERE student_id = 'SV_SCD2_01'").fetchall()
    assert len(v1_rerun_rows) == 1, "Idempotency violation: duplicate student versions created on rerun!"
    
    # Step C: SCD Type 1 in-place update (Name fix)
    students_v1_fixed_name = pd.DataFrame([{
        "student_id": "SV_SCD2_01",
        "full_name": "Tran Van An (Da Chinh Ten)",
        "gender": "NAM",
        "birth_year": 2004,
        "cohort_year": 2022,
        "major_id": "KTPM",
        "status": "ENROLLED"
    }])
    loader.load_dimensions(depts, majors, courses, semesters, students_v1_fixed_name)
    v1_scd1_rows = cursor.execute("SELECT student_key, full_name, is_current FROM dim_student WHERE student_id = 'SV_SCD2_01'").fetchall()
    assert len(v1_scd1_rows) == 1
    assert v1_scd1_rows[0][0] == v1_key
    assert v1_scd1_rows[0][1] == "Tran Van An (Da Chinh Ten)"
    
    # Step D: SCD Type 2 tracked change (Transfer to QTKD)
    students_v2_new_major = pd.DataFrame([{
        "student_id": "SV_SCD2_01",
        "full_name": "Tran Van An (Da Chinh Ten)",
        "gender": "NAM",
        "birth_year": 2004,
        "cohort_year": 2022,
        "major_id": "QTKD",
        "status": "ENROLLED"
    }])
    loader.load_dimensions(depts, majors, courses, semesters, students_v2_new_major)
    
    all_versions = cursor.execute("SELECT student_key, major_name, valid_to, is_current FROM dim_student WHERE student_id = 'SV_SCD2_01' ORDER BY student_key ASC").fetchall()
    assert len(all_versions) == 2, f"Expected 2 versions after major transfer, got {len(all_versions)}"
    
    # Version 1 must be closed
    assert all_versions[0][0] == v1_key
    assert all_versions[0][1] == "Kỹ thuật Phần mềm"
    assert all_versions[0][2] is not None  # valid_to is filled
    assert all_versions[0][3] == 0         # is_current is 0
    
    # Version 2 must be open and active
    assert all_versions[1][1] == "Quản trị Kinh doanh"
    assert all_versions[1][2] is None      # valid_to is NULL
    assert all_versions[1][3] == 1         # is_current is 1
    
    conn.close()

def test_unique_students_metric_with_scd2_multiple_versions(temp_dw_loader):
    """
    Test 3: Unique Students Calculation with Multi-Version Student
    Ensures that when a student has 2 historical versions in dim_student,
    the analytics service correctly reports 1 unique student (not 2).
    """
    loader, db_file = temp_dw_loader
    conn = loader.get_connection()
    cursor = conn.cursor()
    
    # Setup dimension keys
    cursor.execute("INSERT INTO dim_department (department_id, department_name) VALUES ('CNTT', 'Khoa CNTT')")
    d1 = cursor.lastrowid
    cursor.execute("INSERT INTO dim_major (major_id, major_name, department_key, department_name) VALUES ('KTPM', 'KTPM', ?, 'Khoa CNTT')", (d1,))
    m1 = cursor.lastrowid
    cursor.execute("INSERT INTO dim_major (major_id, major_name, department_key, department_name) VALUES ('KHMT', 'KHMT', ?, 'Khoa CNTT')", (d1,))
    m2 = cursor.lastrowid
    
    # Insert 2 versions of SAME student SV001
    cursor.execute("""
        INSERT INTO dim_student (student_id, full_name, gender, birth_year, cohort_year, major_key, major_name, department_name, status, valid_from, valid_to, is_current)
        VALUES ('SV001', 'Nguyen Van A', 'NAM', 2004, 2022, ?, 'KTPM', 'Khoa CNTT', 'ENROLLED', '2022-09-01', '2023-08-31', 0)
    """, (m1,))
    sk1 = cursor.lastrowid
    
    cursor.execute("""
        INSERT INTO dim_student (student_id, full_name, gender, birth_year, cohort_year, major_key, major_name, department_name, status, valid_from, valid_to, is_current)
        VALUES ('SV001', 'Nguyen Van A', 'NAM', 2004, 2022, ?, 'KHMT', 'Khoa CNTT', 'ENROLLED', '2023-09-01', NULL, 1)
    """, (m2,))
    sk2 = cursor.lastrowid
    
    cursor.execute("INSERT INTO dim_course (course_code, course_name, credits, department_key, department_name, course_level, is_core) VALUES ('CS101', 'Lap Trinh', 3, ?, 'Khoa CNTT', 'CORE', 1)", (d1,))
    c1 = cursor.lastrowid
    cursor.execute("INSERT INTO dim_course (course_code, course_name, credits, department_key, department_name, course_level, is_core) VALUES ('CS102', 'CTDL', 4, ?, 'Khoa CNTT', 'CORE', 1)", (d1,))
    c2 = cursor.lastrowid
    
    cursor.execute("INSERT INTO dim_semester (semester_id, academic_year, term_name, start_date, end_date, chronological_order) VALUES ('2022_HK1', '2022-2023', 'HK1', '2022-09-01', '2023-01-15', 1)")
    sem1 = cursor.lastrowid
    cursor.execute("INSERT INTO dim_semester (semester_id, academic_year, term_name, start_date, end_date, chronological_order) VALUES ('2023_HK1', '2023-2024', 'HK1', '2023-09-01', '2024-01-15', 2)")
    sem2 = cursor.lastrowid
    
    # Facts: 1 enrollment in Sem 1 (under version 1), 1 enrollment in Sem 2 (under version 2)
    cursor.execute("""
        INSERT INTO fact_student_performance (
            student_key, course_key, semester_key, major_key, department_key, section_id,
            attendance_rate, total_score, gpa_point_4, letter_grade, credits_attempted,
            credits_earned, is_passed, is_retake, batch_id
        ) VALUES (?, ?, ?, ?, ?, 'SEC_01', 90.0, 8.0, 3.5, 'B+', 3, 3, 1, 0, 1)
    """, (sk1, c1, sem1, m1, d1))
    
    cursor.execute("""
        INSERT INTO fact_student_performance (
            student_key, course_key, semester_key, major_key, department_key, section_id,
            attendance_rate, total_score, gpa_point_4, letter_grade, credits_attempted,
            credits_earned, is_passed, is_retake, batch_id
        ) VALUES (?, ?, ?, ?, ?, 'SEC_02', 85.0, 7.5, 3.0, 'B', 4, 4, 1, 0, 1)
    """, (sk2, c2, sem2, m2, d1))
    
    conn.commit()
    conn.close()
    
    # Query via AnalyticsService
    srv = AnalyticsService(db_path=db_file)
    overview = srv.get_overview()
    kpis = overview["kpis"]
    
    # Must be 1 unique student, NOT 2!
    assert kpis["unique_students"] == 1, f"Expected 1 unique student across 2 SCD2 versions, but got {kpis['unique_students']}"
    assert kpis["total_enrollments"] == 2

def test_independent_mathematical_kpi_verification(temp_dw_loader):
    """
    Test 4: Strict Mathematical Invariant Testing
    Setup ground truth test case:
    Course 1 (3 credits): Score 10.0, GPA 4.0, Pass=1
    Course 2 (4 credits): Score 2.0, GPA 0.0, Pass=0 (Fail)
    
    Expected Values:
    - Credit weighted GPA = (4.0*3 + 0.0*4) / (3 + 4) = 12 / 7 = 1.71
    - Pass rate % = 1 / 2 * 100 = 50.0%
    - Fail rate % = 1 / 2 * 100 = 50.0%
    - Pass + Fail = 100.0%
    """
    loader, db_file = temp_dw_loader
    conn = loader.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("INSERT INTO dim_department (department_id, department_name) VALUES ('CNTT', 'Khoa CNTT')")
    d = cursor.lastrowid
    cursor.execute("INSERT INTO dim_major (major_id, major_name, department_key, department_name) VALUES ('KTPM', 'KTPM', ?, 'Khoa CNTT')", (d,))
    m = cursor.lastrowid
    cursor.execute("INSERT INTO dim_student (student_id, full_name, gender, birth_year, cohort_year, major_key, major_name, department_name, status, valid_from, is_current) VALUES ('SV1', 'Test', 'NAM', 2004, 2022, ?, 'KTPM', 'Khoa CNTT', 'ENROLLED', '2023-01-01', 1)", (m,))
    s = cursor.lastrowid
    cursor.execute("INSERT INTO dim_semester (semester_id, academic_year, term_name, start_date, end_date, chronological_order) VALUES ('2023_HK1', '2023-2024', 'HK1', '2023-09-01', '2024-01-15', 1)")
    sem = cursor.lastrowid
    
    cursor.execute("INSERT INTO dim_course (course_code, course_name, credits, department_key, department_name, course_level, is_core) VALUES ('C1', 'C1', 3, ?, 'Khoa CNTT', 'CORE', 1)", (d,))
    c1 = cursor.lastrowid
    cursor.execute("INSERT INTO dim_course (course_code, course_name, credits, department_key, department_name, course_level, is_core) VALUES ('C2', 'C2', 4, ?, 'Khoa CNTT', 'CORE', 1)", (d,))
    c2 = cursor.lastrowid
    
    # Fact 1: Course 1 (3 cr), Score 10.0, GPA 4.0, Passed
    cursor.execute("""
        INSERT INTO fact_student_performance (
            student_key, course_key, semester_key, major_key, department_key, section_id,
            attendance_rate, total_score, gpa_point_4, letter_grade, credits_attempted,
            credits_earned, is_passed, is_retake, batch_id
        ) VALUES (?, ?, ?, ?, ?, 'S1', 95.0, 10.0, 4.0, 'A+', 3, 3, 1, 0, 1)
    """, (s, c1, sem, m, d))
    
    # Fact 2: Course 2 (4 cr), Score 2.0, GPA 0.0, Failed
    cursor.execute("""
        INSERT INTO fact_student_performance (
            student_key, course_key, semester_key, major_key, department_key, section_id,
            attendance_rate, total_score, gpa_point_4, letter_grade, credits_attempted,
            credits_earned, is_passed, is_retake, batch_id
        ) VALUES (?, ?, ?, ?, ?, 'S2', 60.0, 2.0, 0.0, 'F', 4, 0, 0, 0, 1)
    """, (s, c2, sem, m, d))
    
    conn.commit()
    conn.close()
    
    srv = AnalyticsService(db_path=db_file)
    kpis = srv.get_overview()["kpis"]
    
    assert kpis["credit_weighted_gpa_4"] == 1.71
    assert kpis["pass_rate_pct"] == 50.0
    assert kpis["fail_rate_pct"] == 50.0
    assert round(kpis["pass_rate_pct"] + kpis["fail_rate_pct"], 1) == 100.0

def test_early_warning_risk_heuristics_boundaries(temp_dw_loader):
    """
    Test 5: Early Warning Tier Decision Boundaries
    - Student A: Attendance 64.0% -> HIGH risk tier (< 65%).
    - Student B: Attendance 70.0%, GPA 1.8 -> MEDIUM risk tier (65-74% or GPA 1.5-1.99).
    - Student C: Attendance 90.0%, GPA 2.5, 1 course failed -> WATCHLIST tier.
    - Student D: Attendance 90.0%, GPA 3.0, 0 failed -> NOT at risk.
    """
    loader, db_file = temp_dw_loader
    conn = loader.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("INSERT INTO dim_department (department_id, department_name) VALUES ('CNTT', 'Khoa CNTT')")
    d = cursor.lastrowid
    cursor.execute("INSERT INTO dim_major (major_id, major_name, department_key, department_name) VALUES ('KTPM', 'KTPM', ?, 'Khoa CNTT')", (d,))
    m = cursor.lastrowid
    cursor.execute("INSERT INTO dim_semester (semester_id, academic_year, term_name, start_date, end_date, chronological_order) VALUES ('2023_HK1', '2023-2024', 'HK1', '2023-09-01', '2024-01-15', 1)")
    sem = cursor.lastrowid
    cursor.execute("INSERT INTO dim_course (course_code, course_name, credits, department_key, department_name, course_level, is_core) VALUES ('CS101', 'CS101', 3, ?, 'Khoa CNTT', 'CORE', 1)", (d,))
    c1 = cursor.lastrowid
    
    def add_student_perf(s_id, att, gpa, score, is_pass):
        cursor.execute("INSERT INTO dim_student (student_id, full_name, gender, birth_year, cohort_year, major_key, major_name, department_name, status, valid_from, is_current) VALUES (?, 'Student', 'NAM', 2004, 2022, ?, 'KTPM', 'Khoa CNTT', 'ENROLLED', '2023-01-01', 1)", (s_id, m))
        sk = cursor.lastrowid
        cursor.execute("""
            INSERT INTO fact_student_performance (
                student_key, course_key, semester_key, major_key, department_key, section_id,
                attendance_rate, total_score, gpa_point_4, letter_grade, credits_attempted,
                credits_earned, is_passed, is_retake, batch_id
            ) VALUES (?, ?, ?, ?, ?, 'SEC', ?, ?, ?, 'GRADE', 3, 3, ?, 0, 1)
        """, (sk, c1, sem, m, d, att, score, gpa, is_pass))
        
    add_student_perf("S_HIGH", 64.0, 3.0, 7.0, 1)    # Attendance < 65%
    add_student_perf("S_MED", 70.0, 1.8, 5.0, 1)     # Attendance 70%, GPA 1.8
    add_student_perf("S_WATCH", 90.0, 2.5, 3.5, 0)   # Failed 1 course, GPA >= 2.0
    add_student_perf("S_SAFE", 95.0, 3.5, 8.5, 1)    # Clean
    
    conn.commit()
    conn.close()
    
    srv = AnalyticsService(db_path=db_file)
    warnings = srv.get_early_warning_students(semester_id="2023_HK1")
    warning_map = {w["student_id"]: w["risk_level"] for w in warnings}
    
    assert warning_map.get("S_HIGH") == "HIGH"
    assert warning_map.get("S_MED") == "MEDIUM"
    assert warning_map.get("S_WATCH") == "WATCHLIST"
    assert "S_SAFE" not in warning_map
