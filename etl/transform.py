"""
EduPulse ETL Pipeline — Transform & Quality Module
Validates schemas, enforces referential integrity, detects duplicates, logs rejected records,
and calculates derived dimensional facts and measures.
"""

import json
import pandas as pd
import numpy as np

class DataTransformer:
    def __init__(self):
        self.rejected_records = []
        
    def transform_departments(self, df):
        clean_df = df.dropna(subset=["department_id", "department_name"]).copy()
        clean_df["department_id"] = clean_df["department_id"].str.strip().str.upper()
        clean_df["department_name"] = clean_df["department_name"].str.strip()
        clean_df = clean_df.drop_duplicates(subset=["department_id"])
        return clean_df

    def transform_majors(self, df, valid_dept_ids):
        clean_df = df.dropna(subset=["major_id", "major_name", "department_id"]).copy()
        clean_df["major_id"] = clean_df["major_id"].str.strip().str.upper()
        clean_df["major_name"] = clean_df["major_name"].str.strip()
        clean_df["department_id"] = clean_df["department_id"].str.strip().str.upper()
        
        # Foreign key check
        is_valid_dept = clean_df["department_id"].isin(valid_dept_ids)
        invalid = clean_df[~is_valid_dept]
        for _, row in invalid.iterrows():
            self.rejected_records.append({
                "source_table": "majors",
                "record_identifier": str(row.get("major_id")),
                "reason_code": "MISSING_FOREIGN_KEY",
                "error_message": f"department_id '{row.get('department_id')}' does not exist in departments.",
                "raw_data": json.dumps(row.to_dict(), ensure_ascii=False)
            })
            
        clean_df = clean_df[is_valid_dept].drop_duplicates(subset=["major_id"])
        return clean_df

    def transform_courses(self, df, valid_dept_ids):
        clean_df = df.dropna(subset=["course_code", "course_name", "department_id"]).copy()
        clean_df["course_code"] = clean_df["course_code"].str.strip().str.upper()
        clean_df["course_name"] = clean_df["course_name"].str.strip()
        clean_df["department_id"] = clean_df["department_id"].str.strip().str.upper()
        clean_df["credits"] = pd.to_numeric(clean_df["credits"], errors="coerce").fillna(3).astype(int)
        
        is_valid_dept = clean_df["department_id"].isin(valid_dept_ids)
        clean_df = clean_df[is_valid_dept].drop_duplicates(subset=["course_code"])
        return clean_df

    def transform_semesters(self, df):
        clean_df = df.dropna(subset=["semester_id", "start_date", "end_date"]).copy()
        clean_df["semester_id"] = clean_df["semester_id"].str.strip()
        clean_df["chronological_order"] = pd.to_numeric(clean_df["chronological_order"], errors="coerce").astype(int)
        clean_df = clean_df.drop_duplicates(subset=["semester_id"])
        return clean_df

    def transform_students(self, df, valid_major_ids):
        clean_df = df.dropna(subset=["student_id", "full_name", "major_id"]).copy()
        clean_df["student_id"] = clean_df["student_id"].str.strip()
        clean_df["full_name"] = clean_df["full_name"].str.strip()
        clean_df["major_id"] = clean_df["major_id"].str.strip().str.upper()
        clean_df["cohort_year"] = pd.to_numeric(clean_df["cohort_year"], errors="coerce").fillna(2022).astype(int)
        clean_df["birth_year"] = pd.to_numeric(clean_df["birth_year"], errors="coerce").fillna(2004).astype(int)
        
        is_valid_major = clean_df["major_id"].isin(valid_major_ids)
        clean_df = clean_df[is_valid_major].drop_duplicates(subset=["student_id"])
        return clean_df

    def transform_enrollments(self, df_enrollments, valid_students, valid_courses, valid_semesters):
        """
        Main quality filter and measure transformation for FactStudentPerformance.
        Detects anomalies, validates ranges, logs rejected records, and computes derived metrics.
        """
        valid_student_ids = set(valid_students["student_id"])
        course_credit_map = dict(zip(valid_courses["course_code"], valid_courses["credits"]))
        valid_semester_ids = set(valid_semesters["semester_id"])
        
        valid_rows = []
        seen_grains = set()
        
        for _, row in df_enrollments.iterrows():
            row_dict = row.to_dict()
            s_id = str(row_dict.get("student_id", "")).strip()
            c_code = str(row_dict.get("course_code", "")).strip().upper()
            sem_id = str(row_dict.get("semester_id", "")).strip()
            identifier = f"{s_id}-{c_code}-{sem_id}"
            
            # Check 1: Mandatory Fields
            if not s_id or not c_code or not sem_id:
                self.rejected_records.append({
                    "source_table": "enrollments",
                    "record_identifier": identifier,
                    "reason_code": "NULL_MANDATORY_FIELD",
                    "error_message": "student_id, course_code, or semester_id is missing or null.",
                    "raw_data": json.dumps(row_dict, default=str, ensure_ascii=False)
                })
                continue
                
            # Check 2: Foreign Key Student
            if s_id not in valid_student_ids:
                self.rejected_records.append({
                    "source_table": "enrollments",
                    "record_identifier": identifier,
                    "reason_code": "MISSING_FOREIGN_KEY",
                    "error_message": f"Student ID '{s_id}' does not exist in student registry.",
                    "raw_data": json.dumps(row_dict, default=str, ensure_ascii=False)
                })
                continue
                
            # Check 3: Foreign Key Course
            if c_code not in course_credit_map:
                self.rejected_records.append({
                    "source_table": "enrollments",
                    "record_identifier": identifier,
                    "reason_code": "MISSING_FOREIGN_KEY",
                    "error_message": f"Course Code '{c_code}' does not exist in course catalog.",
                    "raw_data": json.dumps(row_dict, default=str, ensure_ascii=False)
                })
                continue
                
            # Check 4: Foreign Key Semester
            if sem_id not in valid_semester_ids:
                self.rejected_records.append({
                    "source_table": "enrollments",
                    "record_identifier": identifier,
                    "reason_code": "MISSING_FOREIGN_KEY",
                    "error_message": f"Semester ID '{sem_id}' does not exist in academic calendar.",
                    "raw_data": json.dumps(row_dict, default=str, ensure_ascii=False)
                })
                continue
                
            # Check 5: Duplicate Grain Check
            grain_key = (s_id, c_code, sem_id)
            if grain_key in seen_grains:
                self.rejected_records.append({
                    "source_table": "enrollments",
                    "record_identifier": identifier,
                    "reason_code": "DUPLICATE_GRAIN",
                    "error_message": f"Duplicate enrollment for student '{s_id}', course '{c_code}', semester '{sem_id}'.",
                    "raw_data": json.dumps(row_dict, default=str, ensure_ascii=False)
                })
                continue
            seen_grains.add(grain_key)
            
            # Check 6: Score Range Validation
            try:
                total_score = float(row_dict.get("total_score", 0.0))
            except (ValueError, TypeError):
                total_score = -1.0
                
            if total_score < 0.0 or total_score > 10.0:
                self.rejected_records.append({
                    "source_table": "enrollments",
                    "record_identifier": identifier,
                    "reason_code": "INVALID_SCORE_RANGE",
                    "error_message": f"Total score {total_score} is out of allowable range [0.0, 10.0].",
                    "raw_data": json.dumps(row_dict, default=str, ensure_ascii=False)
                })
                continue
                
            # Check 7: Attendance Rate Range Validation
            try:
                attendance_rate = float(row_dict.get("attendance_rate", 0.0))
            except (ValueError, TypeError):
                attendance_rate = -1.0
                
            if attendance_rate < 0.0 or attendance_rate > 100.0:
                self.rejected_records.append({
                    "source_table": "enrollments",
                    "record_identifier": identifier,
                    "reason_code": "INVALID_ATTENDANCE_RATE",
                    "error_message": f"Attendance rate {attendance_rate}% is out of allowable range [0.0, 100.0].",
                    "raw_data": json.dumps(row_dict, default=str, ensure_ascii=False)
                })
                continue
                
            # Calculations & Measures
            credits_attempted = course_credit_map[c_code]
            is_passed = 1 if total_score >= 4.0 else 0
            credits_earned = credits_attempted if is_passed == 1 else 0
            
            midterm = row_dict.get("midterm_score")
            final = row_dict.get("final_score")
            
            # Valid record ready for fact load
            valid_rows.append({
                "student_id": s_id,
                "course_code": c_code,
                "semester_id": sem_id,
                "section_id": str(row_dict.get("section_id", f"SEC_{c_code}_{sem_id}_01")),
                "attendance_rate": attendance_rate,
                "midterm_score": float(midterm) if midterm is not None else None,
                "final_score": float(final) if final is not None else None,
                "total_score": total_score,
                "gpa_point_4": float(row_dict.get("gpa_point_4", 0.0)),
                "letter_grade": str(row_dict.get("letter_grade", "F")),
                "credits_attempted": credits_attempted,
                "credits_earned": credits_earned,
                "is_passed": is_passed,
                "is_retake": int(row_dict.get("is_retake", 0)),
                "enrollment_date": str(row_dict.get("enrollment_date", "2023-09-10"))
            })
            
        df_valid = pd.DataFrame(valid_rows)
        return df_valid, self.rejected_records
