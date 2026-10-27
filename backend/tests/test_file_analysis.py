"""
Tests for Ad-hoc File Upload and Analysis Service & Endpoints.
"""

import io
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.services.file_analysis_service import FileAnalysisService

client = TestClient(app)

def test_file_analysis_service_csv():
    service = FileAnalysisService()
    csv_data = b"mssv,ho_ten,diem_tong_ket,chuyen_can\nSV01,Nguyen Van A,8.5,90.0\nSV02,Tran Van B,3.0,60.0"
    res = service.parse_file(csv_data, "test_grades.csv")
    
    assert res["total_rows"] == 2
    assert res["total_columns"] == 4
    assert res["detected_columns"]["score"] == "diem_tong_ket"
    assert res["score_stats"]["pass_count"] == 1
    assert res["score_stats"]["fail_count"] == 1
    assert res["at_risk_count"] == 1
    assert res["at_risk_students"][0]["student_id"] == "SV02"

def test_api_sample_files_list():
    res = client.get("/api/analysis/sample-files")
    assert res.status_code == 200
    files = res.json()
    assert isinstance(files, list)
    assert len(files) > 0

def test_api_load_sample_file():
    sample_name = "bang_diem_thi_mon_cs102.csv"
    res = client.get(f"/api/analysis/load-sample?name={sample_name}")
    assert res.status_code == 200
    payload = res.json()
    assert payload["success"] is True
    data = payload["data"]
    assert data["total_rows"] > 0
    assert data["score_stats"] is not None

def test_api_upload_file_multipart():
    csv_content = "mssv,ho_ten,diem_tong_ket,chuyen_can\nSV202299,Le Thi C,9.0,95.0\nSV202298,Do Van D,2.5,50.0"
    files = {"file": ("danh_sach.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/api/analysis/upload-file", files=files)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total_rows"] == 2
    assert data["score_stats"]["mean"] == 5.75

def test_file_analysis_custom_columns_with_manual_mapping():
    service = FileAnalysisService()
    # Simulating a file like BaoCao_TonKho or custom format with unconventional column names
    csv_data = b"MaHang,TenHang,GiaBan,TyLe\nMH001,San Pham A,8.5,90.0\nMH002,San Pham B,3.5,60.0"
    
    # 1. Without mapping: student_id and score are None
    unmapped = service.parse_file(csv_data, "BaoCao_TonKho.csv")
    assert unmapped["detected_columns"]["student_id"] is None
    assert unmapped["detected_columns"]["score"] is None
    assert unmapped["has_score_column"] is False

    # 2. With manual mapping: user maps MaHang -> student_id, GiaBan -> score
    mapped = service.parse_file(
        csv_data,
        "BaoCao_TonKho.csv",
        manual_mapping={"student_id": "MaHang", "score": "GiaBan"}
    )
    assert mapped["detected_columns"]["student_id"] == "MaHang"
    assert mapped["detected_columns"]["score"] == "GiaBan"
    assert mapped["has_score_column"] is True
    assert mapped["score_stats"]["mean"] == 6.0
    assert mapped["at_risk_count"] == 1

def test_file_analysis_general_file_profiling():
    service = FileAnalysisService()
    # General non-academic file: product inventory with semicolon delimiter
    csv_data = b"product_id;product_name;price;stock_qty;category\nP100;Laptop Pro;1500;25;Electronics\nP101;Office Chair;250;100;Furniture\nP102;Mouse Wireless;30;200;Electronics\nP103;Desk Lamp;45;60;Furniture"
    res = service.parse_file(csv_data, "inventory.csv")

    assert res["total_rows"] == 4
    assert res["total_columns"] == 5
    assert res["dataset_category"] == "general"
    assert res["numeric_columns_count"] >= 2  # price, stock_qty
    assert res["categorical_columns_count"] >= 2  # product_name, category
    assert res["missing_cells_count"] == 0
    assert res["has_score_column"] is False

    # Check numeric profiling on price column
    price_col = next((c for c in res["columns"] if c["column_name"] == "price"), None)
    assert price_col is not None
    assert price_col["is_numeric"] is True
    assert price_col["min"] == 30.0
    assert price_col["max"] == 1500.0
    assert price_col["mean"] == (1500 + 250 + 30 + 45) / 4
    assert len(price_col["histogram"]) > 0

    # Check categorical profiling on category column
    cat_col = next((c for c in res["columns"] if c["column_name"] == "category"), None)
    assert cat_col is not None
    assert cat_col["is_numeric"] is False
    assert len(cat_col["top_values"]) > 0
    assert cat_col["top_values"][0]["count"] == 2

def test_file_analysis_tsv_delimiter():
    service = FileAnalysisService()
    tsv_data = b"col_a\tcol_b\tcol_c\n1\talpha\t10.5\n2\tbeta\t20.5\n3\tgamma\t30.5"
    res = service.parse_file(tsv_data, "sample.tsv")
    assert res["total_rows"] == 3
    assert res["total_columns"] == 3
    assert res["dataset_category"] == "general"


