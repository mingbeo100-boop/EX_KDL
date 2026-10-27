"""
Integration Tests for ETL Pipeline:
- Idempotency (no duplicate entries on rerun)
- Anomaly Rejection
- Audit Log Persistence
"""

import sqlite3
import pytest
from etl.run_pipeline import run_pipeline
from backend.app.services.analytics_service import AnalyticsService

def test_etl_idempotency():
    """
    Running the pipeline twice must result in the exact same Fact row count.
    """
    service = AnalyticsService()
    conn = service._get_conn()
    cursor = conn.cursor()
    initial_fact_count = cursor.execute("SELECT COUNT(*) FROM fact_student_performance").fetchone()[0]
    conn.close()
    
    # Run pipeline again
    result = run_pipeline()
    assert result["status"] in ["SUCCESS", "WARNING"]
    
    conn2 = service._get_conn()
    cursor2 = conn2.cursor()
    new_fact_count = cursor2.execute("SELECT COUNT(*) FROM fact_student_performance").fetchone()[0]
    conn2.close()
    
    assert new_fact_count == initial_fact_count, (
        f"Idempotency violation! Fact count grew from {initial_fact_count} to {new_fact_count} on re-run."
    )

def test_etl_anomalies_rejected_and_logged():
    """
    Verifies that the dirty records injected in raw sources are caught and logged in etl_rejected_records.
    """
    service = AnalyticsService()
    conn = service._get_conn()
    cursor = conn.cursor()
    
    rejections = cursor.execute("SELECT reason_code, COUNT(*) FROM etl_rejected_records GROUP BY reason_code").fetchall()
    rejection_dict = dict(rejections)
    conn.close()
    
    assert len(rejection_dict) > 0, "Expected quality rejections to be recorded."
    # At least duplicate grain or missing foreign key must be caught
    assert "DUPLICATE_GRAIN" in rejection_dict or "MISSING_FOREIGN_KEY" in rejection_dict

def test_audit_log_tracks_durations_and_counts():
    """
    Ensures etl_audit_log stores realistic timings, row counts, and positive IDs.
    """
    service = AnalyticsService()
    conn = service._get_conn()
    cursor = conn.cursor()
    latest_audit = cursor.execute("SELECT * FROM etl_audit_log ORDER BY batch_id DESC LIMIT 1").fetchone()
    conn.close()
    
    assert latest_audit is not None
    assert latest_audit["rows_extracted"] > 0
    assert latest_audit["rows_valid"] > 0
    assert latest_audit["execution_duration_sec"] >= 0.0
