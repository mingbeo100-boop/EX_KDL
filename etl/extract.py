"""
EduPulse ETL Pipeline — Extract Module
Extracts data from the operational database (OLTP) or raw CSV sources into Staging DataFrames.
"""

import os
import sqlite3
import pandas as pd

class DataExtractor:
    def __init__(self, raw_data_dir=None, oltp_db_path=None):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.raw_data_dir = raw_data_dir or os.path.join(base_dir, "data_generator", "raw_data")
        self.oltp_db_path = oltp_db_path or os.path.join(base_dir, "database", "edupulse_oltp.db")
        
    def extract_from_oltp(self):
        """Extract all operational entities from SQLite OLTP database."""
        if not os.path.exists(self.oltp_db_path):
            raise FileNotFoundError(f"OLTP database not found at {self.oltp_db_path}. Run data generator first.")
            
        conn = sqlite3.connect(self.oltp_db_path)
        try:
            departments = pd.read_sql("SELECT * FROM departments", conn)
            majors = pd.read_sql("SELECT * FROM majors", conn)
            students = pd.read_sql("SELECT * FROM students", conn)
            courses = pd.read_sql("SELECT * FROM courses", conn)
            semesters = pd.read_sql("SELECT * FROM semesters ORDER BY chronological_order", conn)
            sections = pd.read_sql("SELECT * FROM class_sections", conn)
            enrollments = pd.read_sql("SELECT * FROM enrollments", conn)
            
            return {
                "source_type": "OLTP_DATABASE",
                "departments": departments,
                "majors": majors,
                "students": students,
                "courses": courses,
                "semesters": semesters,
                "sections": sections,
                "enrollments": enrollments
            }
        finally:
            conn.close()

    def extract_from_csv(self):
        """Fallback extractor directly reading raw CSV files."""
        if not os.path.exists(self.raw_data_dir):
            raise FileNotFoundError(f"Raw data directory not found at {self.raw_data_dir}")
            
        departments = pd.read_csv(os.path.join(self.raw_data_dir, "departments.csv"))
        majors = pd.read_csv(os.path.join(self.raw_data_dir, "majors.csv"))
        students = pd.read_csv(os.path.join(self.raw_data_dir, "students.csv"))
        courses = pd.read_csv(os.path.join(self.raw_data_dir, "courses.csv"))
        semesters = pd.read_csv(os.path.join(self.raw_data_dir, "semesters.csv"))
        sections = pd.read_csv(os.path.join(self.raw_data_dir, "class_sections.csv"))
        enrollments = pd.read_csv(os.path.join(self.raw_data_dir, "enrollments.csv"))
        
        return {
            "source_type": "CSV_FILES",
            "departments": departments,
            "majors": majors,
            "students": students,
            "courses": courses,
            "semesters": semesters,
            "sections": sections,
            "enrollments": enrollments
        }

    def extract(self, prefer_oltp=True):
        if prefer_oltp and os.path.exists(self.oltp_db_path):
            return self.extract_from_oltp()
        return self.extract_from_csv()
