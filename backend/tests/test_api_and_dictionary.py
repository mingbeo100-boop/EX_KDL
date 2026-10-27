"""
Tests for API Endpoints & Data Dictionary Schema Consistency.
"""

import json
import sqlite3
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.services.analytics_service import AnalyticsService

client = TestClient(app)

def test_api_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert data["database"] == "CONNECTED"
    assert data["fact_rows"] > 0

def test_api_overview_endpoint():

    res = client.get("/api/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert "semester_trends" in data
    assert "department_metrics" in data
    assert "top_failure_courses" in data

def test_api_courses_endpoint():
    res = client.get("/api/analytics/courses")
    assert res.status_code == 200
    data = res.json()
    assert "courses" in data
    assert len(data["courses"]) > 0

def test_api_attendance_endpoint():
    res = client.get("/api/analytics/attendance")
    assert res.status_code == 200
    data = res.json()
    assert "brackets" in data

def test_api_credits_endpoint():
    res = client.get("/api/analytics/credits")
    assert res.status_code == 200
    data = res.json()
    assert "cohort_metrics" in data

def test_api_early_warning_endpoint():
    res = client.get("/api/analytics/early-warning")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        first = data[0]
        assert "risk_level" in first
        assert "risk_reasons" in first
        assert "suggested_action" in first

def test_data_dictionary_matches_database():
    """
    Ensures that every table and column documented in data_dictionary.json
    physically exists in the Data Warehouse SQLite database.
    """
    res = client.get("/api/metadata/data-dictionary")
    assert res.status_code == 200
    doc = res.json()
    
    service = AnalyticsService()
    conn = service._get_conn()
    cursor = conn.cursor()
    
    # Get all tables in database
    db_tables = [r[0] for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    
    for tbl in doc["tables"]:
        tname = tbl["table_name"]
        assert tname in db_tables, f"Table '{tname}' documented in Data Dictionary is missing in database!"
        
        # Verify columns exist
        col_info = cursor.execute(f"PRAGMA table_info({tname})").fetchall()
        db_cols = [c[1] for c in col_info]
        for col in tbl["columns"]:
            cname = col["name"]
            assert cname in db_cols, f"Column '{cname}' of table '{tname}' documented in Dictionary is missing from DB!"
            
    conn.close()
