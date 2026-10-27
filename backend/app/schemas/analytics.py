"""
Pydantic Schemas for EduPulse Analytics API.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class FilterOptions(BaseModel):
    semesters: List[Dict[str, Any]]
    departments: List[Dict[str, Any]]
    majors: List[Dict[str, Any]]
    courses: List[Dict[str, Any]]

class OverviewKPIs(BaseModel):
    unique_students: int
    total_enrollments: int
    avg_score_10: float
    credit_weighted_gpa_4: float
    pass_rate_pct: float
    fail_rate_pct: float
    avg_attendance_pct: float
    at_risk_students_count: int
    credits_attempted_sum: int
    credits_earned_sum: int
    credit_completion_pct: float

class SemesterTrendPoint(BaseModel):
    semester_id: str
    term_name: str
    academic_year: str
    chronological_order: int
    unique_students: int
    enrollments: int
    avg_score_10: float
    credit_weighted_gpa_4: float
    pass_rate_pct: float
    avg_attendance_pct: float

class DepartmentMetric(BaseModel):
    department_id: str
    department_name: str
    unique_students: int
    enrollments: int
    avg_score_10: float
    pass_rate_pct: float
    fail_rate_pct: float
    avg_attendance_pct: float

class TopFailureCourse(BaseModel):
    course_code: str
    course_name: str
    department_name: str
    credits: int
    total_enrollments: int
    failed_count: int
    fail_rate_pct: float
    avg_score: float

class GradeDistributionItem(BaseModel):
    letter_grade: str
    count: int
    percentage: float

class AttendanceScoreBin(BaseModel):
    bracket: str
    min_attendance: float
    max_attendance: float
    enrollment_count: int
    avg_score_10: float
    pass_rate_pct: float

class OverviewResponse(BaseModel):
    kpis: OverviewKPIs
    semester_trends: List[SemesterTrendPoint]
    department_metrics: List[DepartmentMetric]
    top_failure_courses: List[TopFailureCourse]
    grade_distribution: List[GradeDistributionItem]
    attendance_correlation: List[AttendanceScoreBin]

class StudentEarlyWarningItem(BaseModel):
    student_id: str
    full_name: str
    gender: str
    cohort_year: int
    major_name: str
    department_name: str
    status: str
    semester_id: str
    term_name: str
    courses_enrolled: int
    courses_failed: int
    semester_gpa_4: float
    semester_avg_score_10: float
    avg_attendance_pct: float
    risk_level: str  # 'HIGH', 'MEDIUM', 'WATCHLIST'
    risk_reasons: List[str]
    suggested_action: str
