"""
EduPulse Analytics Service
Performs star-schema dimensional analytical queries with dynamic multi-dimensional filtering.
Enforces strict mathematical accuracy for aggregations (no average-of-averages).
"""

import sqlite3
import os

class AnalyticsService:
    def __init__(self, db_path=None):
        # file is Edupulse/backend/app/services/analytics_service.py
        # 3 levels up is Edupulse root
        edupulse_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        # If edupulse_dir is already named Edupulse, use it directly
        if os.path.basename(edupulse_dir) == "Edupulse":
            base_dir = edupulse_dir
        else:
            base_dir = os.path.join(edupulse_dir, "Edupulse")
        self.db_path = db_path or os.path.join(base_dir, "database", "edupulse_dw.db")

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.row_factory = sqlite3.Row
        return conn

    def _build_filter_clause(self, semester_id=None, department_id=None, major_id=None, course_code=None, cohort_year=None):
        conditions = []
        params = []
        if semester_id:
            conditions.append("dsem.semester_id = ?")
            params.append(semester_id)
        if department_id:
            conditions.append("dd.department_id = ?")
            params.append(department_id)
        if major_id:
            conditions.append("dm.major_id = ?")
            params.append(major_id)
        if course_code:
            conditions.append("dc.course_code = ?")
            params.append(course_code)
        if cohort_year:
            conditions.append("ds.cohort_year = ?")
            params.append(int(cohort_year))
            
        where_sql = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        return where_sql, params

    def get_filter_options(self):
        conn = self._get_conn()
        cursor = conn.cursor()
        
        semesters = [dict(r) for r in cursor.execute("""
            SELECT semester_id, academic_year, term_name, chronological_order 
            FROM dim_semester ORDER BY chronological_order
        """).fetchall()]
        
        departments = [dict(r) for r in cursor.execute("""
            SELECT department_id, department_name FROM dim_department ORDER BY department_name
        """).fetchall()]
        
        majors = [dict(r) for r in cursor.execute("""
            SELECT major_id, major_name, department_key FROM dim_major ORDER BY major_name
        """).fetchall()]
        
        courses = [dict(r) for r in cursor.execute("""
            SELECT course_code, course_name, credits, department_name, course_level FROM dim_course ORDER BY course_code
        """).fetchall()]
        
        cohorts = [r[0] for r in cursor.execute("SELECT DISTINCT cohort_year FROM dim_student ORDER BY cohort_year").fetchall()]
        
        conn.close()
        return {
            "semesters": semesters,
            "departments": departments,
            "majors": majors,
            "courses": courses,
            "cohorts": cohorts
        }

    def get_overview(self, semester_id=None, department_id=None, major_id=None, course_code=None, cohort_year=None):
        conn = self._get_conn()
        cursor = conn.cursor()
        where_sql, params = self._build_filter_clause(semester_id, department_id, major_id, course_code, cohort_year)

        base_join = f"""
            FROM fact_student_performance fsp
            JOIN dim_student ds ON fsp.student_key = ds.student_key
            JOIN dim_course dc ON fsp.course_key = dc.course_key
            JOIN dim_semester dsem ON fsp.semester_key = dsem.semester_key
            JOIN dim_department dd ON fsp.department_key = dd.department_key
            JOIN dim_major dm ON fsp.major_key = dm.major_key
            {where_sql}
        """

        # 1. Core KPIs
        kpi_query = f"""
            SELECT 
                COUNT(DISTINCT ds.student_id) as unique_students,
                COUNT(*) as total_enrollments,
                COALESCE(AVG(fsp.total_score), 0.0) as avg_score_10,
                COALESCE(SUM(fsp.gpa_point_4 * fsp.credits_attempted) * 1.0 / NULLIF(SUM(fsp.credits_attempted), 0), 0.0) as credit_weighted_gpa_4,
                COALESCE(SUM(fsp.is_passed) * 100.0 / NULLIF(COUNT(*), 0), 0.0) as pass_rate_pct,
                COALESCE((COUNT(*) - SUM(fsp.is_passed)) * 100.0 / NULLIF(COUNT(*), 0), 0.0) as fail_rate_pct,
                COALESCE(AVG(fsp.attendance_rate), 0.0) as avg_attendance_pct,
                COALESCE(SUM(fsp.credits_attempted), 0) as credits_attempted_sum,
                COALESCE(SUM(fsp.credits_earned), 0) as credits_earned_sum,
                COALESCE(SUM(fsp.credits_earned) * 100.0 / NULLIF(SUM(fsp.credits_attempted), 0), 0.0) as credit_completion_pct
            {base_join}
        """
        kpi_row = dict(cursor.execute(kpi_query, params).fetchone())
        
        # Round decimals for crisp UI presentation
        kpi_row["avg_score_10"] = round(kpi_row["avg_score_10"], 2)
        kpi_row["credit_weighted_gpa_4"] = round(kpi_row["credit_weighted_gpa_4"], 2)
        kpi_row["pass_rate_pct"] = round(kpi_row["pass_rate_pct"], 1)
        kpi_row["fail_rate_pct"] = round(kpi_row["fail_rate_pct"], 1)
        kpi_row["avg_attendance_pct"] = round(kpi_row["avg_attendance_pct"], 1)
        kpi_row["credit_completion_pct"] = round(kpi_row["credit_completion_pct"], 1)

        # 2. At-risk students count (Students in current filter meeting GPA < 2.0 OR attendance < 75% OR failed >= 2 courses)
        at_risk_query = f"""
            SELECT COUNT(*) FROM (
                SELECT ds.student_id
                {base_join}
                GROUP BY ds.student_id
                HAVING (
                    (SUM(fsp.gpa_point_4 * fsp.credits_attempted) * 1.0 / NULLIF(SUM(fsp.credits_attempted), 0) < 2.0)
                    OR (AVG(fsp.attendance_rate) < 75.0)
                    OR (SUM(CASE WHEN fsp.is_passed = 0 THEN 1 ELSE 0 END) >= 2)
                )
            )
        """
        at_risk_count = cursor.execute(at_risk_query, params).fetchone()[0]
        kpi_row["at_risk_students_count"] = at_risk_count

        # 3. Semester Trends (Chronological)
        trend_query = f"""
            SELECT 
                dsem.semester_id,
                dsem.term_name,
                dsem.academic_year,
                dsem.chronological_order,
                COUNT(DISTINCT ds.student_id) as unique_students,
                COUNT(*) as enrollments,
                ROUND(AVG(fsp.total_score), 2) as avg_score_10,
                ROUND(SUM(fsp.gpa_point_4 * fsp.credits_attempted) * 1.0 / NULLIF(SUM(fsp.credits_attempted), 0), 2) as credit_weighted_gpa_4,
                ROUND(SUM(fsp.is_passed) * 100.0 / COUNT(*), 1) as pass_rate_pct,
                ROUND(AVG(fsp.attendance_rate), 1) as avg_attendance_pct
            {base_join}
            GROUP BY dsem.semester_id, dsem.term_name, dsem.academic_year, dsem.chronological_order
            ORDER BY dsem.chronological_order ASC
        """
        semester_trends = [dict(r) for r in cursor.execute(trend_query, params).fetchall()]

        # 4. Department Comparison
        dept_query = f"""
            SELECT 
                dd.department_id,
                dd.department_name,
                COUNT(DISTINCT ds.student_id) as unique_students,
                COUNT(*) as enrollments,
                ROUND(AVG(fsp.total_score), 2) as avg_score_10,
                ROUND(SUM(fsp.is_passed) * 100.0 / COUNT(*), 1) as pass_rate_pct,
                ROUND((COUNT(*) - SUM(fsp.is_passed)) * 100.0 / COUNT(*), 1) as fail_rate_pct,
                ROUND(AVG(fsp.attendance_rate), 1) as avg_attendance_pct
            {base_join}
            GROUP BY dd.department_id, dd.department_name
            ORDER BY avg_score_10 DESC
        """
        department_metrics = [dict(r) for r in cursor.execute(dept_query, params).fetchall()]

        # 5. Top Courses with Highest Fail Rate (min 20 enrollments)
        top_fail_query = f"""
            SELECT 
                dc.course_code,
                dc.course_name,
                dc.department_name,
                dc.credits,
                COUNT(*) as total_enrollments,
                SUM(CASE WHEN fsp.is_passed = 0 THEN 1 ELSE 0 END) as failed_count,
                ROUND((SUM(CASE WHEN fsp.is_passed = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 1) as fail_rate_pct,
                ROUND(AVG(fsp.total_score), 2) as avg_score
            {base_join}
            GROUP BY dc.course_code, dc.course_name, dc.department_name, dc.credits
            HAVING total_enrollments >= 10
            ORDER BY fail_rate_pct DESC
            LIMIT 6
        """
        top_failure_courses = [dict(r) for r in cursor.execute(top_fail_query, params).fetchall()]

        # 6. Letter Grade Distribution
        grade_order = ["A+", "A", "B+", "B", "C+", "C", "D+", "D", "F"]
        grade_query = f"""
            SELECT 
                fsp.letter_grade,
                COUNT(*) as count
            {base_join}
            GROUP BY fsp.letter_grade
        """
        grade_map = {r["letter_grade"]: r["count"] for r in cursor.execute(grade_query, params).fetchall()}
        total_enr = kpi_row["total_enrollments"] or 1
        grade_distribution = [
            {
                "letter_grade": g,
                "count": grade_map.get(g, 0),
                "percentage": round(grade_map.get(g, 0) * 100.0 / total_enr, 1)
            }
            for g in grade_order
        ]

        # 7. Attendance vs Score Bins
        corr_query = f"""
            SELECT 
                CASE 
                    WHEN fsp.attendance_rate < 65.0 THEN '< 65% (Nguy cơ)'
                    WHEN fsp.attendance_rate < 75.0 THEN '65% - 74% (Cảnh báo)'
                    WHEN fsp.attendance_rate < 85.0 THEN '75% - 84% (Đạt)'
                    ELSE '>= 85% (Tốt)'
                END as bracket,
                COUNT(*) as enrollment_count,
                ROUND(AVG(fsp.total_score), 2) as avg_score_10,
                ROUND(SUM(fsp.is_passed) * 100.0 / COUNT(*), 1) as pass_rate_pct
            {base_join}
            GROUP BY bracket
            ORDER BY avg_score_10 ASC
        """
        raw_corr = [dict(r) for r in cursor.execute(corr_query, params).fetchall()]
        
        conn.close()
        return {
            "kpis": kpi_row,
            "semester_trends": semester_trends,
            "department_metrics": department_metrics,
            "top_failure_courses": top_failure_courses,
            "grade_distribution": grade_distribution,
            "attendance_correlation": raw_corr
        }

    def get_course_analytics(self, semester_id=None, department_id=None, course_code=None):
        conn = self._get_conn()
        cursor = conn.cursor()
        where_sql, params = self._build_filter_clause(semester_id=semester_id, department_id=department_id, course_code=course_code)

        base_join = f"""
            FROM fact_student_performance fsp
            JOIN dim_student ds ON fsp.student_key = ds.student_key
            JOIN dim_course dc ON fsp.course_key = dc.course_key
            JOIN dim_semester dsem ON fsp.semester_key = dsem.semester_key
            JOIN dim_department dd ON fsp.department_key = dd.department_key
            JOIN dim_major dm ON fsp.major_key = dm.major_key
            {where_sql}
        """

        courses_summary_query = f"""
            SELECT 
                dc.course_code,
                dc.course_name,
                dc.department_name,
                dc.credits,
                dc.course_level,
                COUNT(*) as total_enrollments,
                COUNT(DISTINCT ds.student_id) as unique_students,
                ROUND(AVG(fsp.total_score), 2) as avg_score_10,
                ROUND(AVG(fsp.attendance_rate), 1) as avg_attendance_pct,
                ROUND(SUM(fsp.is_passed) * 100.0 / COUNT(*), 1) as pass_rate_pct,
                ROUND((COUNT(*) - SUM(fsp.is_passed)) * 100.0 / COUNT(*), 1) as fail_rate_pct,
                SUM(fsp.is_retake) as retake_enrollments
            {base_join}
            GROUP BY dc.course_code, dc.course_name, dc.department_name, dc.credits, dc.course_level
            ORDER BY total_enrollments DESC
        """
        course_list = [dict(r) for r in cursor.execute(courses_summary_query, params).fetchall()]

        # Section-level breakdown if single course selected or top course
        section_breakdown = []
        if course_code or len(course_list) > 0:
            target_code = course_code or course_list[0]["course_code"]
            sec_query = f"""
                SELECT 
                    fsp.section_id,
                    dsem.semester_id,
                    COUNT(*) as section_size,
                    ROUND(AVG(fsp.total_score), 2) as avg_score,
                    ROUND(SUM(fsp.is_passed) * 100.0 / COUNT(*), 1) as pass_rate_pct,
                    ROUND(AVG(fsp.attendance_rate), 1) as avg_attendance
                FROM fact_student_performance fsp
                JOIN dim_course dc ON fsp.course_key = dc.course_key
                JOIN dim_semester dsem ON fsp.semester_key = dsem.semester_key
                WHERE dc.course_code = ?
                GROUP BY fsp.section_id, dsem.semester_id
                ORDER BY dsem.chronological_order DESC, fsp.section_id ASC
                LIMIT 12
            """
            section_breakdown = [dict(r) for r in cursor.execute(sec_query, (target_code,)).fetchall()]

        conn.close()
        return {
            "courses": course_list,
            "selected_course_sections": section_breakdown
        }

    def get_attendance_analytics(self, semester_id=None, department_id=None):
        conn = self._get_conn()
        cursor = conn.cursor()
        where_sql, params = self._build_filter_clause(semester_id=semester_id, department_id=department_id)

        base_join = f"""
            FROM fact_student_performance fsp
            JOIN dim_student ds ON fsp.student_key = ds.student_key
            JOIN dim_course dc ON fsp.course_key = dc.course_key
            JOIN dim_semester dsem ON fsp.semester_key = dsem.semester_key
            JOIN dim_department dd ON fsp.department_key = dd.department_key
            JOIN dim_major dm ON fsp.major_key = dm.major_key
            {where_sql}
        """

        # Brackets distribution
        brackets_query = f"""
            SELECT 
                CASE 
                    WHEN fsp.attendance_rate < 65.0 THEN 'Nguy cơ (< 65%)'
                    WHEN fsp.attendance_rate < 75.0 THEN 'Cảnh báo (65-74%)'
                    WHEN fsp.attendance_rate < 85.0 THEN 'Khá (75-84%)'
                    ELSE 'Tốt (>= 85%)'
                END as bracket,
                COUNT(*) as count,
                ROUND(AVG(fsp.total_score), 2) as avg_score,
                ROUND(SUM(fsp.is_passed) * 100.0 / COUNT(*), 1) as pass_rate_pct
            {base_join}
            GROUP BY bracket
            ORDER BY avg_score ASC
        """
        brackets = [dict(r) for r in cursor.execute(brackets_query, params).fetchall()]

        # Attendance by Department
        dept_att_query = f"""
            SELECT 
                dd.department_name,
                ROUND(AVG(fsp.attendance_rate), 1) as avg_attendance_pct,
                ROUND(AVG(fsp.total_score), 2) as avg_score_10
            {base_join}
            GROUP BY dd.department_name
            ORDER BY avg_attendance_pct DESC
        """
        dept_attendance = [dict(r) for r in cursor.execute(dept_att_query, params).fetchall()]

        # Scatter plot sample points (attendance vs score)
        scatter_query = f"""
            SELECT 
                fsp.attendance_rate,
                fsp.total_score,
                fsp.letter_grade,
                dc.course_code
            {base_join}
            ORDER BY fsp.performance_key DESC
            LIMIT 300
        """
        scatter_points = [dict(r) for r in cursor.execute(scatter_query, params).fetchall()]

        conn.close()
        return {
            "brackets": brackets,
            "department_attendance": dept_attendance,
            "scatter_samples": scatter_points
        }

    def get_credit_progress(self, department_id=None, cohort_year=None):
        conn = self._get_conn()
        cursor = conn.cursor()
        where_sql, params = self._build_filter_clause(department_id=department_id, cohort_year=cohort_year)

        base_join = f"""
            FROM fact_student_performance fsp
            JOIN dim_student ds ON fsp.student_key = ds.student_key
            JOIN dim_course dc ON fsp.course_key = dc.course_key
            JOIN dim_semester dsem ON fsp.semester_key = dsem.semester_key
            JOIN dim_department dd ON fsp.department_key = dd.department_key
            JOIN dim_major dm ON fsp.major_key = dm.major_key
            {where_sql}
        """

        # Cohort progress
        cohort_query = f"""
            SELECT 
                ds.cohort_year,
                COUNT(DISTINCT ds.student_id) as students_count,
                SUM(fsp.credits_attempted) as total_attempted,
                SUM(fsp.credits_earned) as total_earned,
                ROUND(SUM(fsp.credits_earned) * 1.0 / COUNT(DISTINCT ds.student_id), 1) as avg_credits_per_student,
                ROUND(SUM(fsp.credits_earned) * 100.0 / NULLIF(SUM(fsp.credits_attempted), 0), 1) as completion_pct
            {base_join}
            GROUP BY ds.cohort_year
            ORDER BY ds.cohort_year ASC
        """
        cohort_metrics = [dict(r) for r in cursor.execute(cohort_query, params).fetchall()]

        # Major progress
        major_query = f"""
            SELECT 
                dm.major_name,
                dm.required_credits,
                COUNT(DISTINCT ds.student_id) as students_count,
                ROUND(SUM(fsp.credits_earned) * 1.0 / COUNT(DISTINCT ds.student_id), 1) as avg_accumulated_credits,
                ROUND(SUM(fsp.credits_earned) * 100.0 / NULLIF(SUM(fsp.credits_attempted), 0), 1) as completion_pct
            {base_join}
            GROUP BY dm.major_name, dm.required_credits
            ORDER BY completion_pct DESC
        """
        major_metrics = [dict(r) for r in cursor.execute(major_query, params).fetchall()]

        conn.close()
        return {
            "cohort_metrics": cohort_metrics,
            "major_metrics": major_metrics
        }

    def get_early_warning_students(self, semester_id=None, department_id=None, major_id=None, risk_tier=None):
        """
        Detects at-risk students based on transparent multi-condition rules:
        - High Risk: Semester Attendance < 65% OR Semester GPA < 1.5
        - Medium Risk: Semester Attendance 65-74% OR Semester GPA 1.5-1.99 OR Failed >= 2 courses
        - Watchlist: Failed 1 course but GPA >= 2.0
        """
        conn = self._get_conn()
        cursor = conn.cursor()
        where_sql, params = self._build_filter_clause(semester_id, department_id, major_id)

        base_join = f"""
            FROM fact_student_performance fsp
            JOIN dim_student ds ON fsp.student_key = ds.student_key
            JOIN dim_course dc ON fsp.course_key = dc.course_key
            JOIN dim_semester dsem ON fsp.semester_key = dsem.semester_key
            JOIN dim_department dd ON fsp.department_key = dd.department_key
            JOIN dim_major dm ON fsp.major_key = dm.major_key
            {where_sql}
        """

        student_sem_query = f"""
            SELECT 
                ds.student_id,
                ds.full_name,
                ds.gender,
                ds.cohort_year,
                ds.status,
                dm.major_name,
                dd.department_name,
                dsem.semester_id,
                dsem.term_name,
                COUNT(*) as courses_enrolled,
                SUM(CASE WHEN fsp.is_passed = 0 THEN 1 ELSE 0 END) as courses_failed,
                ROUND(AVG(fsp.total_score), 2) as semester_avg_score_10,
                ROUND(SUM(fsp.gpa_point_4 * fsp.credits_attempted) * 1.0 / NULLIF(SUM(fsp.credits_attempted), 0), 2) as semester_gpa_4,
                ROUND(AVG(fsp.attendance_rate), 1) as avg_attendance_pct
            {base_join}
            GROUP BY 
                ds.student_id, ds.full_name, ds.gender, ds.cohort_year, ds.status,
                dm.major_name, dd.department_name, dsem.semester_id, dsem.term_name
            HAVING (
                semester_gpa_4 < 2.0 
                OR avg_attendance_pct < 75.0 
                OR courses_failed >= 1
            )
            ORDER BY 
                CASE 
                    WHEN (avg_attendance_pct < 65.0 OR semester_gpa_4 < 1.5) THEN 1
                    WHEN (avg_attendance_pct < 75.0 OR semester_gpa_4 < 2.0 OR courses_failed >= 2) THEN 2
                    ELSE 3
                END ASC,
                courses_failed DESC,
                semester_gpa_4 ASC
        """
        rows = cursor.execute(student_sem_query, params).fetchall()
        
        at_risk_list = []
        for r in rows:
            gpa = r["semester_gpa_4"] or 0.0
            att = r["avg_attendance_pct"] or 0.0
            fails = r["courses_failed"] or 0
            
            reasons = []
            if gpa < 1.5:
                reasons.append(f"GPA {gpa} rất thấp (< 1.5/4.0)")
            elif gpa < 2.0:
                reasons.append(f"GPA {gpa} dưới chuẩn (< 2.0/4.0)")
                
            if att < 65.0:
                reasons.append(f"Chuyên cần {att}% ở mức báo động (< 65%)")
            elif att < 75.0:
                reasons.append(f"Chuyên cần {att}% không đạt chuẩn (< 75%)")
                
            if fails >= 2:
                reasons.append(f"Trượt {fails} môn học trong học kỳ")
            elif fails == 1:
                reasons.append(f"Trượt 1 môn học")

            # Determine risk tier
            if att < 65.0 or gpa < 1.5:
                tier = "HIGH"
                action = "Gặp cố vấn học tập khẩn cấp, xem xét giảm tải tín chỉ và thông báo gia đình."
            elif att < 75.0 or gpa < 2.0 or fails >= 2:
                tier = "MEDIUM"
                action = "Mời sinh viên trao đổi kế hoạch cải thiện, theo dõi điểm danh định kỳ."
            else:
                tier = "WATCHLIST"
                action = "Nhắc nhở học tập và hỗ trợ đăng ký học lại sớm môn trượt."

            if risk_tier and tier != risk_tier:
                continue

            at_risk_list.append({
                "student_id": r["student_id"],
                "full_name": r["full_name"],
                "gender": r["gender"],
                "cohort_year": r["cohort_year"],
                "major_name": r["major_name"],
                "department_name": r["department_name"],
                "status": r["status"],
                "semester_id": r["semester_id"],
                "term_name": r["term_name"],
                "courses_enrolled": r["courses_enrolled"],
                "courses_failed": fails,
                "semester_gpa_4": gpa,
                "semester_avg_score_10": r["semester_avg_score_10"] or 0.0,
                "avg_attendance_pct": att,
                "risk_level": tier,
                "risk_reasons": reasons,
                "suggested_action": action
            })

        conn.close()
        return at_risk_list

    def get_etl_status(self):
        conn = self._get_conn()
        cursor = conn.cursor()
        
        latest_audit = cursor.execute("""
            SELECT * FROM etl_audit_log ORDER BY batch_id DESC LIMIT 1
        """).fetchone()
        
        all_logs = [dict(r) for r in cursor.execute("""
            SELECT * FROM etl_audit_log ORDER BY batch_id DESC LIMIT 10
        """).fetchall()]
        
        conn.close()
        return {
            "latest_run": dict(latest_audit) if latest_audit else None,
            "run_history": all_logs
        }

    def get_etl_rejections(self, batch_id=None, limit=50):
        conn = self._get_conn()
        cursor = conn.cursor()
        
        if batch_id:
            rejections = [dict(r) for r in cursor.execute("""
                SELECT * FROM etl_rejected_records WHERE batch_id = ? ORDER BY reject_id DESC LIMIT ?
            """, (int(batch_id), limit)).fetchall()]
        else:
            rejections = [dict(r) for r in cursor.execute("""
                SELECT * FROM etl_rejected_records ORDER BY reject_id DESC LIMIT ?
            """, (limit,)).fetchall()]
            
        conn.close()
        return rejections
