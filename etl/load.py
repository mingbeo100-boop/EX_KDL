"""
EduPulse ETL Pipeline — Load Module
Loads clean Dimensions and Facts into the Data Warehouse.
Enforces Kimball Star Schema surrogate keys, SCD Type 2 tracking, idempotency,
and logs audit metrics.
"""

import os
import sqlite3
import pandas as pd
from datetime import datetime

class WarehouseLoader:
    def __init__(self, dw_db_path=None):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.dw_db_path = dw_db_path or os.path.join(base_dir, "database", "edupulse_dw.db")
        self.dw_schema_path = os.path.join(base_dir, "database", "dw_schema.sql")
        self._ensure_schema()
        
    def _ensure_schema(self):
        """Execute DDL if tables do not exist."""
        os.makedirs(os.path.dirname(self.dw_db_path), exist_ok=True)
        conn = sqlite3.connect(self.dw_db_path)
        conn.execute("PRAGMA foreign_keys = ON;")
        with open(self.dw_schema_path, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()
        conn.close()

    def get_connection(self):
        conn = sqlite3.connect(self.dw_db_path)
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn


    def load_dimensions(self, departments, majors, courses, semesters, students):
        """
        Loads all dimensions and returns surrogate key lookup dictionaries.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # 1. DimDepartment
        for _, r in departments.iterrows():
            cursor.execute("""
                INSERT INTO dim_department (department_id, department_name, faculty_dean)
                VALUES (?, ?, ?)
                ON CONFLICT(department_id) DO UPDATE SET
                    department_name=excluded.department_name,
                    faculty_dean=excluded.faculty_dean;
            """, (r["department_id"], r["department_name"], r.get("faculty_dean")))
        conn.commit()
        
        dept_key_map = dict(cursor.execute("SELECT department_id, department_key FROM dim_department").fetchall())
        
        # 2. DimMajor
        for _, r in majors.iterrows():
            dept_key = dept_key_map.get(r["department_id"])
            dept_name = next((d["department_name"] for _, d in departments.iterrows() if d["department_id"] == r["department_id"]), "")
            cursor.execute("""
                INSERT INTO dim_major (major_id, major_name, department_key, department_name, required_credits)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(major_id) DO UPDATE SET
                    major_name=excluded.major_name,
                    department_key=excluded.department_key,
                    department_name=excluded.department_name,
                    required_credits=excluded.required_credits;
            """, (r["major_id"], r["major_name"], dept_key, dept_name, int(r.get("required_credits", 130))))
        conn.commit()
        
        major_key_map = dict(cursor.execute("SELECT major_id, major_key FROM dim_major").fetchall())
        
        # 3. DimCourse
        for _, r in courses.iterrows():
            dept_key = dept_key_map.get(r["department_id"])
            dept_name = next((d["department_name"] for _, d in departments.iterrows() if d["department_id"] == r["department_id"]), "")
            cursor.execute("""
                INSERT INTO dim_course (course_code, course_name, credits, department_key, department_name, course_level, is_core)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(course_code) DO UPDATE SET
                    course_name=excluded.course_name,
                    credits=excluded.credits,
                    department_key=excluded.department_key,
                    department_name=excluded.department_name,
                    course_level=excluded.course_level,
                    is_core=excluded.is_core;
            """, (r["course_code"], r["course_name"], int(r["credits"]), dept_key, dept_name, r["course_level"], int(r.get("is_core", 1))))
        conn.commit()
        
        course_key_map = dict(cursor.execute("SELECT course_code, course_key FROM dim_course").fetchall())
        
        # 4. DimSemester
        for _, r in semesters.iterrows():
            cursor.execute("""
                INSERT INTO dim_semester (semester_id, academic_year, term_name, start_date, end_date, chronological_order)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(semester_id) DO UPDATE SET
                    academic_year=excluded.academic_year,
                    term_name=excluded.term_name,
                    start_date=excluded.start_date,
                    end_date=excluded.end_date,
                    chronological_order=excluded.chronological_order;
            """, (r["semester_id"], r["academic_year"], r["term_name"], r["start_date"], r["end_date"], int(r["chronological_order"])))
        conn.commit()
        
        semester_key_map = dict(cursor.execute("SELECT semester_id, semester_key FROM dim_semester").fetchall())
        
        # 5. DimDate
        # Populate dates for semesters
        for _, r in semesters.iterrows():
            start_dt = datetime.strptime(r["start_date"], "%Y-%m-%d")
            end_dt = datetime.strptime(r["end_date"], "%Y-%m-%d")
            curr = start_dt
            while curr <= end_dt:
                date_k = int(curr.strftime("%Y%m%d"))
                cursor.execute("""
                    INSERT OR IGNORE INTO dim_date (date_key, date_actual, day, month, year, quarter, semester_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                """, (date_k, curr.strftime("%Y-%m-%d"), curr.day, curr.month, curr.year, (curr.month - 1) // 3 + 1, r["semester_id"]))
                curr += pd.Timedelta(days=1)
        conn.commit()

        # 6. DimStudent with SCD Type 2 logic
        # Check current record; if major or status changed, close out previous version and create new one
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for _, r in students.iterrows():
            sid = r["student_id"]
            m_id = r["major_id"]
            m_key = major_key_map.get(m_id)
            
            # Lookup major details
            major_rec = majors[majors["major_id"] == m_id].iloc[0]
            m_name = major_rec["major_name"]
            d_id = major_rec["department_id"]
            d_name = next((d["department_name"] for _, d in departments.iterrows() if d["department_id"] == d_id), "")
            
            cursor.execute("SELECT student_key, major_key, status FROM dim_student WHERE student_id = ? AND is_current = 1", (sid,))
            existing = cursor.fetchone()
            
            if existing is None:
                # Insert initial version
                cursor.execute("""
                    INSERT INTO dim_student (student_id, full_name, gender, birth_year, cohort_year, major_key, major_name, department_name, status, valid_from, valid_to, is_current)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1);
                """, (sid, r["full_name"], r["gender"], int(r["birth_year"]), int(r["cohort_year"]), m_key, m_name, d_name, r["status"], now_str))
            else:
                s_key, old_m_key, old_status = existing
                if old_m_key != m_key or old_status != r["status"]:
                    # SCD Type 2 change detected: expire current record
                    cursor.execute("""
                        UPDATE dim_student
                        SET valid_to = ?, is_current = 0
                        WHERE student_key = ?;
                    """, (now_str, s_key))
                    # Insert new active version
                    cursor.execute("""
                        INSERT INTO dim_student (student_id, full_name, gender, birth_year, cohort_year, major_key, major_name, department_name, status, valid_from, valid_to, is_current)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1);
                    """, (sid, r["full_name"], r["gender"], int(r["birth_year"]), int(r["cohort_year"]), m_key, m_name, d_name, r["status"], now_str))
                else:
                    # SCD Type 1 in-place update for non-tracked descriptive attributes
                    cursor.execute("""
                        UPDATE dim_student
                        SET full_name = ?, gender = ?, birth_year = ?, cohort_year = ?
                        WHERE student_key = ?;
                    """, (r["full_name"], r["gender"], int(r["birth_year"]), int(r["cohort_year"]), s_key))

        conn.commit()
        
        # Student key mapping for current versions and historical versions
        student_key_map = dict(cursor.execute("SELECT student_id, student_key FROM dim_student WHERE is_current = 1").fetchall())
        
        # All historical versions grouped by student_id for date-based fact resolution
        student_all_versions = {}
        for row in cursor.execute("SELECT student_id, student_key, valid_from, valid_to, is_current FROM dim_student ORDER BY student_key ASC").fetchall():
            s_id, sk, vf, vt, isc = row
            student_all_versions.setdefault(s_id, []).append({
                "student_key": sk,
                "valid_from": vf,
                "valid_to": vt,
                "is_current": isc
            })
            
        student_to_dept_map = dict(cursor.execute("""
            SELECT ds.student_key, dm.department_key
            FROM dim_student ds
            JOIN dim_major dm ON ds.major_key = dm.major_key
        """).fetchall())
        student_to_major_map = dict(cursor.execute("SELECT student_key, major_key FROM dim_student").fetchall())

        conn.close()
        
        return {
            "dept_key_map": dept_key_map,
            "major_key_map": major_key_map,
            "course_key_map": course_key_map,
            "semester_key_map": semester_key_map,
            "student_key_map": student_key_map,
            "student_all_versions": student_all_versions,
            "student_to_dept_map": student_to_dept_map,
            "student_to_major_map": student_to_major_map
        }

    def load_fact_performance(self, df_valid_enrollments, key_maps, batch_id):
        """
        Loads FactStudentPerformance idempotently.
        Resolves the appropriate dimension surrogate key (SCD Type 2 aware)
        and executes idempotent upsert on (student_key, course_key, semester_key).
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        st_map = key_maps["student_key_map"]
        st_versions = key_maps.get("student_all_versions", {})
        co_map = key_maps["course_key_map"]
        se_map = key_maps["semester_key_map"]
        st_dept_map = key_maps["student_to_dept_map"]
        st_major_map = key_maps["student_to_major_map"]
        
        records_loaded = 0
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        for _, r in df_valid_enrollments.iterrows():
            s_id = r["student_id"]
            versions = st_versions.get(s_id)
            enr_date = str(r.get("enrollment_date", "2023-09-10"))
            
            # Resolve surrogate key based on historical validity
            s_key = None
            if versions and len(versions) > 1:
                for v in versions:
                    vf = v["valid_from"]
                    vt = v["valid_to"]
                    if vf <= enr_date and (vt is None or vt >= enr_date):
                        s_key = v["student_key"]
                        break
            if not s_key:
                s_key = st_map.get(s_id)
                
            c_key = co_map.get(r["course_code"])
            sem_key = se_map.get(r["semester_id"])
            
            if not s_key or not c_key or not sem_key:
                continue
                
            m_key = st_major_map.get(s_key, 1)
            d_key = st_dept_map.get(s_key, 1)

            
            # Date key YYYYMMDD
            enr_dt_str = str(r.get("enrollment_date", "2023-09-10")).replace("-", "")
            try:
                date_k = int(enr_dt_str[:8])
            except ValueError:
                date_k = None
                
            cursor.execute("""
                INSERT INTO fact_student_performance (
                    student_key, course_key, semester_key, major_key, department_key, date_key,
                    section_id, attendance_rate, midterm_score, final_score, total_score,
                    gpa_point_4, letter_grade, credits_attempted, credits_earned, is_passed,
                    is_retake, batch_id, loaded_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(student_key, course_key, semester_key) DO UPDATE SET
                    section_id=excluded.section_id,
                    attendance_rate=excluded.attendance_rate,
                    midterm_score=excluded.midterm_score,
                    final_score=excluded.final_score,
                    total_score=excluded.total_score,
                    gpa_point_4=excluded.gpa_point_4,
                    letter_grade=excluded.letter_grade,
                    credits_attempted=excluded.credits_attempted,
                    credits_earned=excluded.credits_earned,
                    is_passed=excluded.is_passed,
                    is_retake=excluded.is_retake,
                    batch_id=excluded.batch_id,
                    loaded_at=excluded.loaded_at;
            """, (
                s_key, c_key, sem_key, m_key, d_key, date_k,
                str(r["section_id"]), float(r["attendance_rate"]),
                float(r["midterm_score"]) if pd.notnull(r["midterm_score"]) else None,
                float(r["final_score"]) if pd.notnull(r["final_score"]) else None,
                float(r["total_score"]), float(r["gpa_point_4"]), str(r["letter_grade"]),
                int(r["credits_attempted"]), int(r["credits_earned"]), int(r["is_passed"]),
                int(r.get("is_retake", 0)), batch_id, now_str
            ))
            records_loaded += 1
            
        conn.commit()
        conn.close()
        return records_loaded

    def record_audit(self, audit_info, rejected_records):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO etl_audit_log (
                pipeline_name, start_time, end_time, status, rows_extracted,
                rows_valid, rows_rejected, rows_loaded_dim, rows_loaded_fact,
                execution_duration_sec, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            audit_info["pipeline_name"],
            audit_info["start_time"],
            audit_info["end_time"],
            audit_info["status"],
            audit_info["rows_extracted"],
            audit_info["rows_valid"],
            audit_info["rows_rejected"],
            audit_info["rows_loaded_dim"],
            audit_info["rows_loaded_fact"],
            audit_info["execution_duration_sec"],
            audit_info.get("details", "")
        ))
        batch_id = cursor.lastrowid
        
        for rej in rejected_records:
            cursor.execute("""
                INSERT INTO etl_rejected_records (
                    batch_id, source_table, record_identifier, reason_code, error_message, raw_data
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                batch_id, rej["source_table"], rej["record_identifier"],
                rej["reason_code"], rej["error_message"], rej.get("raw_data")
            ))
            
        conn.commit()
        conn.close()
        return batch_id
