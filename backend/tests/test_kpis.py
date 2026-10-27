"""
Unit and Integration Tests for Academic KPI Calculations and Mathematical Consistency.
Verifies no "average-of-averages" fallacies and ensures strict correctness.
"""

import pytest
import sqlite3
import os
from backend.app.services.analytics_service import AnalyticsService

@pytest.fixture
def service():
    return AnalyticsService()

def test_unique_students_not_enrollment_sum(service):
    """
    Critical Check: Total unique students must be COUNT(DISTINCT student_key)
    and strictly less than total enrollments across courses.
    """
    res = service.get_overview()
    kpis = res["kpis"]
    unique_students = kpis["unique_students"]
    total_enrollments = kpis["total_enrollments"]
    
    assert unique_students > 0
    assert total_enrollments > unique_students, "Enrollments must be greater than unique student count."

def test_pass_and_fail_rate_complementary(service):
    """
    Pass rate % + Fail rate % must equal 100.0% within floating point tolerance.
    """
    res = service.get_overview()
    kpis = res["kpis"]
    pass_pct = kpis["pass_rate_pct"]
    fail_pct = kpis["fail_rate_pct"]
    
    total = round(pass_pct + fail_pct, 1)
    assert total == 100.0, f"Expected 100.0%, got {total}% (Pass: {pass_pct}, Fail: {fail_pct})"

def test_credit_weighted_gpa_formula(service):
    """
    Ensures GPA is credit-weighted: SUM(gpa4 * credits) / SUM(credits).
    Verifies that courses with higher credit weights impact GPA proportionally.
    """
    conn = service._get_conn()
    cursor = conn.cursor()
    row = cursor.execute("""
        SELECT 
            SUM(fsp.gpa_point_4 * fsp.credits_attempted) * 1.0 / SUM(fsp.credits_attempted) as weighted_gpa,
            AVG(fsp.gpa_point_4) as simple_unweighted_gpa
        FROM fact_student_performance fsp
    """).fetchone()
    conn.close()
    
    weighted = round(row["weighted_gpa"], 2)
    kpis = service.get_overview()["kpis"]
    assert kpis["credit_weighted_gpa_4"] == weighted

def test_empty_filter_safety(service):
    """
    Edge case: When filters match zero records, ensure service does not raise DivisionByZero
    and returns safe 0.0 values.
    """
    res = service.get_overview(department_id="NON_EXISTENT_DEPARTMENT_XYZ")
    kpis = res["kpis"]
    assert kpis["unique_students"] == 0
    assert kpis["total_enrollments"] == 0
    assert kpis["avg_score_10"] == 0.0
    assert kpis["credit_weighted_gpa_4"] == 0.0
    assert kpis["pass_rate_pct"] == 0.0
    assert kpis["fail_rate_pct"] == 0.0
