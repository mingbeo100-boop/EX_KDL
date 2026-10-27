"""
EduPulse FastAPI API Endpoints.
"""

import os
import json
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from app.services.analytics_service import AnalyticsService

router = APIRouter()
analytics = AnalyticsService()

# -------------------------------------------------------------
# 0. System Health Check
# -------------------------------------------------------------
@router.get("/health")
def health_check():
    try:
        conn = analytics._get_conn()
        cursor = conn.cursor()
        dw_count = cursor.execute("SELECT COUNT(*) FROM fact_student_performance").fetchone()[0]
        conn.close()
        return {
            "status": "HEALTHY",
            "database": "CONNECTED",
            "fact_rows": dw_count,
            "version": "1.0.0"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unhealthy: {str(e)}")

# -------------------------------------------------------------
# 1. Filters Metadata
# -------------------------------------------------------------

@router.get("/filters/options")
def get_filter_options():
    try:
        return analytics.get_filter_options()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------
# 2. Overview Dashboard
# -------------------------------------------------------------
@router.get("/analytics/overview")
def get_overview(
    semester_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    major_id: Optional[str] = Query(None),
    course_code: Optional[str] = Query(None),
    cohort_year: Optional[int] = Query(None)
):
    try:
        return analytics.get_overview(
            semester_id=semester_id,
            department_id=department_id,
            major_id=major_id,
            course_code=course_code,
            cohort_year=cohort_year
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------
# 3. Course Analytics
# -------------------------------------------------------------
@router.get("/analytics/courses")
def get_courses(
    semester_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    course_code: Optional[str] = Query(None)
):
    try:
        return analytics.get_course_analytics(
            semester_id=semester_id,
            department_id=department_id,
            course_code=course_code
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------
# 4. Attendance Analytics
# -------------------------------------------------------------
@router.get("/analytics/attendance")
def get_attendance(
    semester_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None)
):
    try:
        return analytics.get_attendance_analytics(
            semester_id=semester_id,
            department_id=department_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------
# 5. Credit Progress & Retention
# -------------------------------------------------------------
@router.get("/analytics/credits")
def get_credits(
    department_id: Optional[str] = Query(None),
    cohort_year: Optional[int] = Query(None)
):
    try:
        return analytics.get_credit_progress(
            department_id=department_id,
            cohort_year=cohort_year
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------
# 6. Early Warning / At-Risk Students
# -------------------------------------------------------------
@router.get("/analytics/early-warning")
def get_early_warning(
    semester_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    major_id: Optional[str] = Query(None),
    risk_tier: Optional[str] = Query(None)
):
    try:
        return analytics.get_early_warning_students(
            semester_id=semester_id,
            department_id=department_id,
            major_id=major_id,
            risk_tier=risk_tier
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------------------------------------
# 7. Metadata / Data Dictionary
# -------------------------------------------------------------
@router.get("/metadata/data-dictionary")
def get_data_dictionary():
    edupulse_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    base_dir = edupulse_dir if os.path.basename(edupulse_dir) == "Edupulse" else os.path.join(edupulse_dir, "Edupulse")
    dict_path = os.path.join(base_dir, "database", "data_dictionary.json")
    if not os.path.exists(dict_path):
        raise HTTPException(status_code=404, detail="Data dictionary not found")
        
    with open(dict_path, "r", encoding="utf-8") as f:
        return json.load(f)

# -------------------------------------------------------------
# 8. ETL Quality & Pipeline Trigger
# -------------------------------------------------------------
@router.get("/etl/status")
def get_etl_status():
    try:
        return analytics.get_etl_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/etl/rejections")
def get_etl_rejections(
    batch_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200)
):
    try:
        return analytics.get_etl_rejections(batch_id=batch_id, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/etl/trigger")
def trigger_etl_pipeline():
    try:
        from etl.run_pipeline import run_pipeline
        result = run_pipeline()
        return {
            "success": True,
            "message": "ETL pipeline ran successfully with idempotent upsert.",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ETL execution failed: {str(e)}")

# -------------------------------------------------------------
# 9. Ad-Hoc Academic File Ingestion & Analysis
# -------------------------------------------------------------
from fastapi import UploadFile, File, Form
from app.services.file_analysis_service import FileAnalysisService

file_analyzer = FileAnalysisService()

@router.post("/analysis/upload-file")
async def upload_and_analyze_file(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
    manual_mapping: Optional[str] = Form(None),
):
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Tệp tin rỗng, vui lòng chọn tệp hợp lệ.")
            
        mapping_dict = None
        if manual_mapping:
            try:
                mapping_dict = json.loads(manual_mapping)
            except Exception:
                pass

        analysis_result = file_analyzer.parse_file(
            content, file.filename, sheet_name=sheet_name, manual_mapping=mapping_dict
        )
        return {
            "success": True,
            "data": analysis_result
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý tệp: {str(e)}")

@router.get("/analysis/sample-files")
def get_sample_files():
    try:
        return file_analyzer.get_sample_files()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis/load-sample")
def load_sample_file(
    name: str = Query(..., description="Tên tệp mẫu"),
    sheet_name: Optional[str] = Query(None),
    manual_mapping: Optional[str] = Query(None),
):
    try:
        mapping_dict = None
        if manual_mapping:
            try:
                mapping_dict = json.loads(manual_mapping)
            except Exception:
                pass
        data = file_analyzer.load_sample_file(name, sheet_name=sheet_name, manual_mapping=mapping_dict)
        return {
            "success": True,
            "data": data
        }
    except FileNotFoundError as fe:
        raise HTTPException(status_code=404, detail=str(fe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analysis/import-to-dw")
async def import_file_to_warehouse(
    file: Optional[UploadFile] = File(None),
    sample_name: Optional[str] = Form(None),
    sheet_name: Optional[str] = Form(None),
    manual_mapping: Optional[str] = Form(None),
):
    try:
        if file is not None:
            content = await file.read()
            if len(content) > 0:
                filename = file.filename
            elif sample_name:
                full_path = os.path.join(file_analyzer.sample_dir, sample_name)
                with open(full_path, "rb") as f:
                    content = f.read()
                filename = sample_name
            else:
                raise HTTPException(status_code=400, detail="Tệp tin rỗng.")
        elif sample_name:
            full_path = os.path.join(file_analyzer.sample_dir, sample_name)
            if not os.path.exists(full_path):
                raise HTTPException(status_code=404, detail="Tệp mẫu không tồn tại.")
            with open(full_path, "rb") as f:
                content = f.read()
            filename = sample_name
        else:
            raise HTTPException(status_code=400, detail="Không có tệp dữ liệu được cung cấp.")
            
        mapping_dict = None
        if manual_mapping:
            try:
                mapping_dict = json.loads(manual_mapping)
            except Exception:
                pass

        result = file_analyzer.import_to_dw(
            content, filename, sheet_name=sheet_name, manual_mapping=mapping_dict
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi nạp vào Kho Dữ Liệu: {str(e)}")


