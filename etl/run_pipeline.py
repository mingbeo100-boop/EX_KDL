"""
EduPulse ETL Pipeline — Master Runner
Orchestrates end-to-end data processing:
1. Extract from OLTP or raw CSV
2. Cleanse and validate schemas
3. Reject corrupted or unreferenced records
4. Load Dimension tables (SCD Type 2 enabled)
5. Load Fact tables (Idempotent upsert)
6. Write audit trail and error metrics
"""

import os
import sys
import time
from datetime import datetime

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from etl.extract import DataExtractor
from etl.transform import DataTransformer
from etl.load import WarehouseLoader

def run_pipeline():
    start_time_dt = datetime.now()
    t0 = time.time()
    print("=" * 65)
    print("EDUPULSE ETL PIPELINE — STARTING EXECUTION")
    print(f"Timestamp: {start_time_dt.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)
    
    # 1. EXTRACT
    print("[1/4] Extracting operational sources...")
    extractor = DataExtractor()
    extracted = extractor.extract(prefer_oltp=True)
    raw_enrollments = extracted["enrollments"]
    total_extracted_count = len(raw_enrollments)
    print(f"      Source: {extracted['source_type']}")
    print(f"      Departments: {len(extracted['departments'])} | Majors: {len(extracted['majors'])}")
    print(f"      Courses: {len(extracted['courses'])} | Semesters: {len(extracted['semesters'])}")
    print(f"      Students: {len(extracted['students'])} | Enrollments: {total_extracted_count}")

    # 2. TRANSFORM & VALIDATE
    print("[2/4] Cleansing, validating integrity, and deriving measures...")
    transformer = DataTransformer()
    clean_depts = transformer.transform_departments(extracted["departments"])
    valid_dept_ids = set(clean_depts["department_id"])
    
    clean_majors = transformer.transform_majors(extracted["majors"], valid_dept_ids)
    valid_major_ids = set(clean_majors["major_id"])
    
    clean_courses = transformer.transform_courses(extracted["courses"], valid_dept_ids)
    clean_semesters = transformer.transform_semesters(extracted["semesters"])
    clean_students = transformer.transform_students(extracted["students"], valid_major_ids)
    
    valid_enrollments, rejected_records = transformer.transform_enrollments(
        raw_enrollments, clean_students, clean_courses, clean_semesters
    )
    print(f"      Valid enrollments for fact load: {len(valid_enrollments)}")
    print(f"      Rejected records identified: {len(rejected_records)}")
    for r in rejected_records:
        print(f"        -> Rejection [{r['reason_code']}] {r['record_identifier']}: {r['error_message']}")

    # 3. LOAD DIMENSIONS & FACTS
    print("[3/4] Loading Kimball Star Schema Warehouse...")
    loader = WarehouseLoader()
    key_maps = loader.load_dimensions(
        clean_depts, clean_majors, clean_courses, clean_semesters, clean_students
    )
    
    dim_loaded_count = (
        len(key_maps["dept_key_map"]) +
        len(key_maps["major_key_map"]) +
        len(key_maps["course_key_map"]) +
        len(key_maps["semester_key_map"]) +
        len(key_maps["student_key_map"])
    )
    print(f"      Dimension keys mapped: {dim_loaded_count} active surrogate entities")
    
    # Record preliminary audit to get batch_id
    end_time_dt = datetime.now()
    duration_sec = round(time.time() - t0, 2)
    
    audit_data = {
        "pipeline_name": "EDUPULSE_STAR_SCHEMA_ETL",
        "start_time": start_time_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "end_time": end_time_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "status": "SUCCESS" if len(rejected_records) < 100 else "WARNING",
        "rows_extracted": total_extracted_count,
        "rows_valid": len(valid_enrollments),
        "rows_rejected": len(rejected_records),
        "rows_loaded_dim": dim_loaded_count,
        "rows_loaded_fact": len(valid_enrollments),
        "execution_duration_sec": duration_sec,
        "details": f"Processed {total_extracted_count} raw enrollment entries with {len(rejected_records)} quality exclusions."
    }
    
    batch_id = loader.record_audit(audit_data, rejected_records)
    print(f"      Assigned Audit Batch ID: #{batch_id}")
    
    # Fact Load
    fact_loaded_count = loader.load_fact_performance(valid_enrollments, key_maps, batch_id)
    print(f"      FactStudentPerformance records loaded (idempotent upsert): {fact_loaded_count}")

    # 4. SUMMARY & VERIFICATION
    print("[4/4] Finalizing ETL Pipeline Run...")
    print("=" * 65)
    print(f"ETL COMPLETE in {duration_sec}s | Batch #{batch_id} | Status: {audit_data['status']}")
    print(f"Total Extracted: {total_extracted_count} | Valid Fact Rows: {fact_loaded_count} | Rejections: {len(rejected_records)}")
    print("=" * 65)
    
    return {
        "batch_id": batch_id,
        "status": audit_data["status"],
        "rows_extracted": total_extracted_count,
        "rows_valid": len(valid_enrollments),
        "rows_rejected": len(rejected_records),
        "rows_loaded_fact": fact_loaded_count,
        "execution_duration_sec": duration_sec,
        "rejected_sample": rejected_records[:5]
    }

if __name__ == "__main__":
    run_pipeline()
