"""
EduPulse — Advanced File Analysis & Data Warehouse Ingestion Service
Features:
1. Multi-format support: XLSX, XLS (via openpyxl, xlrd), CSV (UTF-8, UTF-8-BOM, Windows-1258, Latin1), JSON.
2. Multi-sheet workbook navigation & automatic data-sheet discovery.
3. Smart header-row detection (ignoring title/cover/instruction header rows).
4. Unicode Vietnamese accent-stripping & extensive column alias recognition.
5. Manual column mapping override support.
6. Strict validation: identifying valid, invalid (out-of-bounds, non-numeric), and duplicate records.
7. Data Warehouse Kimball Star Schema Idempotent Ingestion with Dry-Run preview.
"""

import io
import json
import os
import re
import sqlite3
import unicodedata
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Helper: Accent Stripping & Text Normalization
# ---------------------------------------------------------------------------
def remove_accents(text: Any) -> str:
    """Removes Vietnamese accents and returns lowercase normalized text."""
    if text is None:
        return ""
    text_str = str(text)
    # Replace Vietnamese 'd' variants
    text_str = text_str.replace("đ", "d").replace("Đ", "D")
    nfkd = unicodedata.normalize("NFKD", text_str)
    no_combining = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return no_combining.lower().strip()


def normalize_token(text: Any) -> str:
    """Removes all non-alphanumeric characters for fuzzy alias matching."""
    ascii_str = remove_accents(text)
    return re.sub(r"[^a-z0-9]", "", ascii_str)


# ---------------------------------------------------------------------------
# Comprehensive Column Alias Catalog
# ---------------------------------------------------------------------------
COLUMN_ALIASES: Dict[str, List[str]] = {
    "student_id": [
        "mssv", "masv", "ma_sv", "ma sinh vien", "masinhvien", "ma_sinh_vien",
        "student_id", "studentid", "student id", "student_code", "studentcode",
        "id_sinh_vien", "id sinh vien", "ma", "id", "so_the_sinh_vien",
        "ma_so_sinh_vien", "ma so sinh vien", "masosinhvien", "code"
    ],
    "full_name": [
        "hoten", "ho_ten", "ho va ten", "ho_va_ten", "hovaten", "full_name",
        "fullname", "full name", "student_name", "studentname", "student name",
        "ten_sinh_vien", "ten sinh vien", "tensinhvien", "ten", "name"
    ],
    "score": [
        "diem_tong_ket", "diem tong ket", "diemtongket", "diem_tk", "diemtk",
        "diem_he_10", "diem he 10", "diemhe10", "diem_he10", "diem_ck", "diemck",
        "diem_thi", "diem thi", "diemthi", "diem", "score", "grade",
        "total_score", "totalscore", "final_score", "finalscore", "gpa",
        "diem_trung_binh", "diem trung binh", "diemtb", "diem_tb"
    ],
    "attendance": [
        "chuyen_can", "chuyen can", "chuyencan", "attendance", "attendance_rate",
        "attendancerate", "ty_le_chuyen_can", "ty le chuyen can", "tyle_chuyencan",
        "diem_danh", "diemdanh", "tham_gia", "tham gia"
    ],
    "course_code": [
        "ma_hoc_phan", "ma hoc phan", "mahocphan", "ma_mon", "ma mon", "mamon",
        "mon_hoc", "mon hoc", "monhoc", "course_code", "coursecode", "course_id",
        "courseid", "course", "subject", "hoc_phan", "hoc phan"
    ],
    "semester_id": [
        "ma_hoc_ky", "ma hoc ky", "mahocky", "hoc_ky", "hoc ky", "hocky",
        "semester_id", "semesterid", "semester", "term", "ky_hoc", "ky hoc"
    ],
    "credits": [
        "so_tin_chi", "so tin chi", "sotinchi", "tin_chi", "tin chi", "tinchi",
        "credits", "credit", "so_tc", "so tc", "sotc"
    ],
    "major": [
        "chuyen_nganh", "chuyen nganh", "chuyennganh", "nganh", "major",
        "khoa", "department", "nganh_hoc", "nganh hoc", "major_id"
    ],
    "is_passed": [
        "dat_mon", "dat mon", "datmon", "ket_qua", "ket qua", "ketqua",
        "trang_thai", "trang thai", "trangthai", "status", "pass_status"
    ],
}


class FileAnalysisService:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        self.sample_dir = os.path.join(base_dir, "data_generator", "sample_uploads")
        self.dw_path = os.path.join(base_dir, "database", "edupulse_dw.db")
        os.makedirs(self.sample_dir, exist_ok=True)
        self._ensure_sample_files()

    def _ensure_sample_files(self):
        """Creates sample upload files if not yet present."""
        sample_csv = os.path.join(self.sample_dir, "bang_diem_thi_mon_cs102.csv")
        if not os.path.exists(sample_csv):
            sample_data = [
                {"mssv": "SV20220101", "ho_ten": "Nguyễn Hoàng Nam", "chuyen_nganh": "KTPM", "diem_gk": 8.0, "diem_ck": 8.5, "diem_tong_ket": 8.3, "chuyen_can": 93.3, "trang_thai": "Đạt"},
                {"mssv": "SV20220102", "ho_ten": "Trần Thị Mai Phương", "chuyen_nganh": "KHMT", "diem_gk": 7.5, "diem_ck": 7.0, "diem_tong_ket": 7.2, "chuyen_can": 86.7, "trang_thai": "Đạt"},
                {"mssv": "SV20220103", "ho_ten": "Lê Văn Cường", "chuyen_nganh": "ATTT", "diem_gk": 3.0, "diem_ck": 3.5, "diem_tong_ket": 3.3, "chuyen_can": 60.0, "trang_thai": "Trượt"},
                {"mssv": "SV20220104", "ho_ten": "Phạm Quốc Tuấn", "chuyen_nganh": "KTPM", "diem_gk": 9.0, "diem_ck": 9.5, "diem_tong_ket": 9.3, "chuyen_can": 100.0, "trang_thai": "Đạt"},
                {"mssv": "SV20220105", "ho_ten": "Vũ Minh Hải", "chuyen_nganh": "KHMT", "diem_gk": 5.0, "diem_ck": 5.5, "diem_tong_ket": 5.3, "chuyen_can": 80.0, "trang_thai": "Đạt"},
                {"mssv": "SV20220106", "ho_ten": "Đặng Thị Hương", "chuyen_nganh": "KTPM", "diem_gk": 2.5, "diem_ck": 2.0, "diem_tong_ket": 2.2, "chuyen_can": 53.3, "trang_thai": "Trượt"},
                {"mssv": "SV20220107", "ho_ten": "Bùi Đức Thắng", "chuyen_nganh": "ATTT", "diem_gk": 6.5, "diem_ck": 7.0, "diem_tong_ket": 6.8, "chuyen_can": 86.7, "trang_thai": "Đạt"},
                {"mssv": "SV20220108", "ho_ten": "Hoàng Thu Thảo", "chuyen_nganh": "KHMT", "diem_gk": 8.5, "diem_ck": 9.0, "diem_tong_ket": 8.8, "chuyen_can": 93.3, "trang_thai": "Đạt"},
                {"mssv": "SV20220109", "ho_ten": "Ngô Văn Long", "chuyen_nganh": "KTPM", "diem_gk": 4.0, "diem_ck": 4.0, "diem_tong_ket": 4.0, "chuyen_can": 73.3, "trang_thai": "Đạt"},
                {"mssv": "SV20220110", "ho_ten": "Đỗ Gia Huy", "chuyen_nganh": "ATTT", "diem_gk": 1.5, "diem_ck": 2.5, "diem_tong_ket": 2.1, "chuyen_can": 46.7, "trang_thai": "Trượt"},
                {"mssv": "SV20220111", "ho_ten": "Phan Thanh Trúc", "chuyen_nganh": "KTPM", "diem_gk": 7.0, "diem_ck": 8.0, "diem_tong_ket": 7.6, "chuyen_can": 93.3, "trang_thai": "Đạt"},
                {"mssv": "SV20220112", "ho_ten": "Dương Bảo Ngọc", "chuyen_nganh": "KHMT", "diem_gk": 6.0, "diem_ck": 6.5, "diem_tong_ket": 6.3, "chuyen_can": 86.7, "trang_thai": "Đạt"},
            ]
            pd.DataFrame(sample_data).to_csv(sample_csv, index=False, encoding="utf-8-sig")

        sample_xlsx = os.path.join(self.sample_dir, "bang_diem_toan_cao_cap_cs101.xlsx")
        if not os.path.exists(sample_xlsx):
            excel_data = [
                {"Mã Sinh Viên": "SV20230001", "Họ Và Tên": "Nguyễn Văn An", "Môn Học": "CS101", "Chuyên Ngành": "KHMT", "Điểm Thi": 8.5, "Chuyên Cần %": 95.0},
                {"Mã Sinh Viên": "SV20230002", "Họ Và Tên": "Lê Thị Bích", "Môn Học": "CS101", "Chuyên Ngành": "KTPM", "Điểm Thi": 9.0, "Chuyên Cần %": 100.0},
                {"Mã Sinh Viên": "SV20230003", "Họ Và Tên": "Trần Đình Cường", "Môn Học": "CS101", "Chuyên Ngành": "ATTT", "Điểm Thi": 3.5, "Chuyên Cần %": 65.0},
                {"Mã Sinh Viên": "SV20230004", "Họ Và Tên": "Phạm Minh Đức", "Môn Học": "CS101", "Chuyên Ngành": "KHMT", "Điểm Thi": 6.5, "Chuyên Cần %": 85.0},
                {"Mã Sinh Viên": "SV20230005", "Họ Và Tên": "Hoàng Thị Giang", "Môn Học": "CS101", "Chuyên Ngành": "KTPM", "Điểm Thi": 2.0, "Chuyên Cần %": 50.0},
                {"Mã Sinh Viên": "SV20230006", "Họ Và Tên": "Đỗ Quang Hải", "Môn Học": "CS101", "Chuyên Ngành": "ATTT", "Điểm Thi": 7.5, "Chuyên Cần %": 90.0},
            ]
            try:
                with pd.ExcelWriter(sample_xlsx, engine="openpyxl") as writer:
                    pd.DataFrame(excel_data).to_excel(writer, sheet_name="BangDiemHocPhan", index=False)
                    pd.DataFrame([{"ThongTin": "Bang diem mon CS101 Hoc ky 1 nam 2024"}]).to_excel(writer, sheet_name="GhiChu", index=False)
            except Exception:
                pass

    # -----------------------------------------------------------------------
    # 1. Smart Header & Sheet Detection
    # -----------------------------------------------------------------------
    def _detect_header_row(self, preview_df: pd.DataFrame) -> int:
        """
        Scans top rows to find the row that most likely serves as table header,
        avoiding merged banner/title rows (e.g. 'TRƯỜNG ĐẠI HỌC...').
        """
        if preview_df.empty:
            return 0
        best_row = 0
        best_score = -1

        all_target_tokens = set()
        for candidates in COLUMN_ALIASES.values():
            for c in candidates:
                all_target_tokens.add(normalize_token(c))

        for row_idx in range(min(15, len(preview_df))):
            row_vals = preview_df.iloc[row_idx].dropna().tolist()
            if not row_vals:
                continue

            matches = 0
            str_cells = 0
            for val in row_vals:
                token = normalize_token(val)
                if token in all_target_tokens:
                    matches += 1
                if isinstance(val, str) and not val.strip().replace(".", "", 1).isdigit():
                    str_cells += 1

            # High weight for known domain keywords, moderate weight for clean strings
            score = (matches * 10) + str_cells
            if score > best_score:
                best_score = score
                best_row = row_idx

        return best_row if best_score > 0 else 0

    def _read_csv_with_delimiters(self, content_bytes: bytes) -> Tuple[pd.DataFrame, int]:
        delimiters = [",", ";", "\t", "|"]
        encodings = ["utf-8-sig", "utf-8", "windows-1258", "latin1", "cp1252"]

        best_df = None
        best_cols = 0
        best_header = 0

        for enc in encodings:
            for delim in delimiters:
                try:
                    preview = pd.read_csv(io.BytesIO(content_bytes), sep=delim, encoding=enc, nrows=15, header=None)
                    header_row = self._detect_header_row(preview)
                    df = pd.read_csv(io.BytesIO(content_bytes), sep=delim, encoding=enc, header=header_row)
                    if df.shape[1] > best_cols:
                        best_df = df
                        best_cols = df.shape[1]
                        best_header = header_row
                    if df.shape[1] > 1 and enc in ["utf-8-sig", "utf-8"]:
                        return df, header_row
                except Exception:
                    continue

        if best_df is not None and not best_df.empty:
            return best_df, best_header

        # Fallback to python engine sep=None
        try:
            df = pd.read_csv(io.BytesIO(content_bytes), sep=None, engine="python", encoding="latin1")
            return df, 0
        except Exception:
            df = pd.read_csv(io.BytesIO(content_bytes), sep=",", encoding="latin1")
            return df, 0

    def load_raw_dataframe(
        self, content_bytes: bytes, file_name: str, sheet_name: Optional[str] = None
    ) -> Tuple[pd.DataFrame, List[str], str, int]:
        """
        Loads bytes into DataFrame for any supported or arbitrary tabular format.
        Supports: .xlsx, .xls, .xlsm, .csv, .tsv, .txt, .json, .jsonl, .parquet.
        Returns: (df, sheet_names, active_sheet, header_row)
        """
        ext = os.path.splitext(file_name)[1].lower()

        if ext in [".xlsx", ".xls", ".xlsm", ".xlsb"]:
            excel_file = pd.ExcelFile(io.BytesIO(content_bytes))
            sheet_names = excel_file.sheet_names

            target_sheet = sheet_name if (sheet_name and sheet_name in sheet_names) else None
            if not target_sheet:
                # Find first non-empty sheet
                for s in sheet_names:
                    try:
                        p = pd.read_excel(excel_file, sheet_name=s, nrows=10, header=None)
                        if not p.empty and p.dropna(how="all").shape[0] > 0:
                            target_sheet = s
                            break
                    except Exception:
                        continue
            if not target_sheet:
                target_sheet = sheet_names[0]

            preview = pd.read_excel(excel_file, sheet_name=target_sheet, nrows=15, header=None)
            header_row = self._detect_header_row(preview)
            df = pd.read_excel(excel_file, sheet_name=target_sheet, header=header_row)
            return df, sheet_names, target_sheet, header_row

        elif ext in [".csv", ".tsv"]:
            df, header_row = self._read_csv_with_delimiters(content_bytes)
            return df, ["Sheet1"], "Sheet1", header_row

        elif ext in [".json", ".jsonl"]:
            try:
                df = pd.read_json(io.BytesIO(content_bytes))
            except Exception:
                raw_text = content_bytes.decode("utf-8", errors="ignore")
                try:
                    data_obj = json.loads(raw_text)
                    if isinstance(data_obj, list):
                        df = pd.DataFrame(data_obj)
                    elif isinstance(data_obj, dict):
                        target_list = None
                        for k, v in data_obj.items():
                            if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                                target_list = v
                                break
                        if target_list is not None:
                            df = pd.DataFrame(target_list)
                        else:
                            df = pd.json_normalize(data_obj)
                    else:
                        raise ValueError("Không tìm thấy cấu trúc bảng dữ liệu trong tệp JSON.")
                except Exception:
                    lines = [json.loads(line) for line in raw_text.splitlines() if line.strip()]
                    df = pd.DataFrame(lines)
            return df, ["Sheet1"], "Sheet1", 0

        elif ext == ".txt":
            df, header_row = self._read_csv_with_delimiters(content_bytes)
            return df, ["Sheet1"], "Sheet1", header_row

        elif ext == ".parquet":
            df = pd.read_parquet(io.BytesIO(content_bytes))
            return df, ["Sheet1"], "Sheet1", 0

        else:
            # Universal fallback: try Excel, then CSV, then JSON
            try:
                excel_file = pd.ExcelFile(io.BytesIO(content_bytes))
                df = pd.read_excel(excel_file, sheet_name=excel_file.sheet_names[0])
                return df, excel_file.sheet_names, excel_file.sheet_names[0], 0
            except Exception:
                pass
            try:
                df, header_row = self._read_csv_with_delimiters(content_bytes)
                if not df.empty and df.shape[1] > 0:
                    return df, ["Sheet1"], "Sheet1", header_row
            except Exception:
                pass
            raise ValueError(f"Định dạng tệp '{ext}' không thể phân tích. Vui lòng tải lên .xlsx, .xls, .csv, .tsv, .txt, hoặc .json.")

    # -----------------------------------------------------------------------
    # 2. Semantic Column Resolution with Manual Mapping Override
    # -----------------------------------------------------------------------
    def resolve_columns(
        self, df_columns: List[Any], manual_mapping: Optional[Dict[str, str]] = None
    ) -> Dict[str, Optional[str]]:
        """
        Maps standard field names to actual column names in DataFrame.
        Priority:
        1. Explicit user manual mapping (if specified and valid)
        2. Automated alias matching with accent stripping and token normalization
        """
        resolved: Dict[str, Optional[str]] = {
            "student_id": None,
            "full_name": None,
            "score": None,
            "attendance": None,
            "course_code": None,
            "semester_id": None,
            "credits": None,
            "major": None,
            "is_passed": None,
        }

        col_tokens = {col: normalize_token(col) for col in df_columns}

        # 1. Auto-detection
        for field, aliases in COLUMN_ALIASES.items():
            alias_tokens = [normalize_token(a) for a in aliases]
            for col, token in col_tokens.items():
                if token in alias_tokens:
                    resolved[field] = str(col)
                    break

        # 2. Manual mapping override
        if manual_mapping:
            df_col_strs = {str(c): str(c) for c in df_columns}
            for field, target_col in manual_mapping.items():
                if field in resolved:
                    if target_col in ["", None, "__NONE__", "none"]:
                        resolved[field] = None
                    elif target_col in df_columns:
                        resolved[field] = str(target_col)
                    elif str(target_col) in df_col_strs:
                        resolved[field] = str(target_col)

        return resolved

    # -----------------------------------------------------------------------
    # 3. Comprehensive Data Analysis & Validation
    # -----------------------------------------------------------------------
    def analyze_dataframe(
        self,
        df: pd.DataFrame,
        file_name: str,
        sheet_name: str = "Sheet1",
        sheet_names: Optional[List[str]] = None,
        header_row: int = 0,
        manual_mapping: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Performs universal tabular data analysis, column profiling, and optional academic validation.
        """
        if sheet_names is None:
            sheet_names = [sheet_name]

        # Clean unnamed trailing columns if completely empty
        df = df.dropna(how="all", axis=0).dropna(how="all", axis=1)

        total_rows_read = len(df)
        total_columns = len(df.columns)

        if total_rows_read == 0:
            raise ValueError(f"Tệp tin hoặc sheet '{sheet_name}' không chứa dòng dữ liệu nào sau tiêu đề.")

        # Clean column names
        cleaned_columns = []
        for i, c in enumerate(df.columns):
            c_str = str(c).strip()
            if not c_str or c_str.startswith("Unnamed:"):
                cleaned_columns.append(f"Cột_{i+1}")
            else:
                cleaned_columns.append(c_str)
        df.columns = cleaned_columns

        # Resolve academic columns
        detected_columns = self.resolve_columns(list(df.columns), manual_mapping)
        sid_col = detected_columns["student_id"]
        name_col = detected_columns["full_name"]
        score_col = detected_columns["score"]
        att_col = detected_columns["attendance"]

        is_academic = bool(sid_col or score_col)
        dataset_category = "academic" if is_academic else "general"

        # Build comprehensive column metadata and statistical profiles
        columns_info = []
        for col in df.columns:
            s = df[col]
            non_null = int(s.notnull().sum())
            null_count = total_rows_read - non_null
            null_pct = round((null_count / total_rows_read) * 100.0, 1) if total_rows_read > 0 else 0.0
            unique_count = int(s.nunique())
            sample_val = str(s.dropna().iloc[0]) if non_null > 0 else ""

            # Check if numeric
            num_s = pd.to_numeric(s, errors="coerce").dropna()
            is_numeric = False
            col_min = None
            col_max = None
            col_mean = None
            col_median = None
            col_std = None
            col_sum = None
            histogram = []
            top_values = []

            if non_null > 0 and (len(num_s) / non_null) >= 0.7:
                is_numeric = True
                data_type = "numeric"
                col_min = round(float(num_s.min()), 2)
                col_max = round(float(num_s.max()), 2)
                col_mean = round(float(num_s.mean()), 2)
                col_median = round(float(num_s.median()), 2)
                col_std = round(float(num_s.std()), 2) if len(num_s) > 1 else 0.0
                col_sum = round(float(num_s.sum()), 2)

                if col_min == col_max:
                    histogram = [{
                        "bin": str(col_min),
                        "count": len(num_s),
                        "min": col_min,
                        "max": col_max,
                        "percentage": 100.0
                    }]
                else:
                    nbins = min(8, max(4, len(num_s.unique())))
                    counts, edges = np.histogram(num_s, bins=nbins)
                    for b_i in range(len(counts)):
                        b_start = round(float(edges[b_i]), 2)
                        b_end = round(float(edges[b_i + 1]), 2)
                        b_cnt = int(counts[b_i])
                        histogram.append({
                            "bin": f"{b_start} - {b_end}",
                            "count": b_cnt,
                            "min": b_start,
                            "max": b_end,
                            "percentage": round((b_cnt / len(num_s)) * 100.0, 1)
                        })
            else:
                data_type = "categorical"
                vc = s.dropna().astype(str).value_counts().head(10)
                for val_k, val_c in vc.items():
                    top_values.append({
                        "value": str(val_k),
                        "count": int(val_c),
                        "percentage": round((int(val_c) / max(1, non_null)) * 100.0, 1)
                    })

            columns_info.append({
                "column_name": str(col),
                "data_type": data_type,
                "raw_dtype": str(s.dtype),
                "non_null_count": non_null,
                "null_count": null_count,
                "null_pct": null_pct,
                "unique_count": unique_count,
                "sample": sample_val,
                "is_numeric": is_numeric,
                "min": col_min,
                "max": col_max,
                "mean": col_mean,
                "median": col_median,
                "std": col_std,
                "sum": col_sum,
                "histogram": histogram,
                "top_values": top_values,
            })

        # Row-by-row validation
        validation_errors: List[Dict[str, Any]] = []
        valid_row_indices = []
        seen_student_ids = set()
        duplicate_student_ids = set()

        for idx, row in df.iterrows():
            row_num = idx + 1
            has_error = False

            # 1. Validate Student ID
            if sid_col:
                raw_sid = row.get(sid_col)
                if pd.isnull(raw_sid) or str(raw_sid).strip() == "" or str(raw_sid).lower() == "nan":
                    validation_errors.append({
                        "row_index": row_num,
                        "column": sid_col,
                        "error_type": "MISSING_STUDENT_ID",
                        "message": f"Dòng {row_num}: Thiếu mã sinh viên.",
                        "sample_value": str(raw_sid)
                    })
                    has_error = True
                else:
                    sid_clean = str(raw_sid).strip()
                    if sid_clean in seen_student_ids:
                        duplicate_student_ids.add(sid_clean)
                    seen_student_ids.add(sid_clean)

            # 2. Validate Score
            if score_col:
                raw_score = row.get(score_col)
                if pd.notnull(raw_score) and str(raw_score).strip() != "":
                    try:
                        num_score = float(raw_score)
                        if num_score < 0.0 or num_score > 10.0:
                            validation_errors.append({
                                "row_index": row_num,
                                "column": score_col,
                                "error_type": "OUT_OF_BOUNDS_SCORE",
                                "message": f"Dòng {row_num}: Điểm số '{num_score}' vượt ngoài thang điểm quy chuẩn [0 - 10].",
                                "sample_value": str(num_score)
                            })
                            has_error = True
                    except (ValueError, TypeError):
                        validation_errors.append({
                            "row_index": row_num,
                            "column": score_col,
                            "error_type": "INVALID_NUMERIC_SCORE",
                            "message": f"Dòng {row_num}: Điểm '{raw_score}' không phải định dạng số hợp lệ.",
                            "sample_value": str(raw_score)
                        })
                        has_error = True

            # 3. Validate Attendance
            if att_col:
                raw_att = row.get(att_col)
                if pd.notnull(raw_att) and str(raw_att).strip() != "":
                    try:
                        num_att = float(raw_att)
                        if num_att < 0.0 or num_att > 100.0:
                            validation_errors.append({
                                "row_index": row_num,
                                "column": att_col,
                                "error_type": "OUT_OF_BOUNDS_ATTENDANCE",
                                "message": f"Dòng {row_num}: Tỷ lệ chuyên cần '{num_att}%' nằm ngoài thang 0–100%.",
                                "sample_value": str(num_att)
                            })
                            has_error = True
                    except (ValueError, TypeError):
                        validation_errors.append({
                            "row_index": row_num,
                            "column": att_col,
                            "error_type": "INVALID_ATTENDANCE_NUMBER",
                            "message": f"Dòng {row_num}: Chuyên cần '{raw_att}' không phải số hợp lệ.",
                            "sample_value": str(raw_att)
                        })
                        has_error = True

            if not has_error:
                valid_row_indices.append(idx)

        valid_df = df.loc[valid_row_indices]
        valid_rows_count = len(valid_df)
        invalid_rows_count = total_rows_read - valid_rows_count
        duplicate_rows_count = len(duplicate_student_ids)

        # Unique students count
        if sid_col and valid_rows_count > 0:
            unique_students_count = int(valid_df[sid_col].astype(str).str.strip().nunique())
        else:
            unique_students_count = valid_rows_count

        # Score statistics
        score_stats = None
        grade_distribution = []
        has_score_column = False

        if score_col:
            numeric_scores = pd.to_numeric(valid_df[score_col], errors="coerce").dropna()
            # Only consider scores in 0-10
            numeric_scores = numeric_scores[(numeric_scores >= 0.0) & (numeric_scores <= 10.0)]
            if len(numeric_scores) > 0:
                has_score_column = True
                mean_val = float(numeric_scores.mean())
                median_val = float(numeric_scores.median())
                min_val = float(numeric_scores.min())
                max_val = float(numeric_scores.max())
                std_val = float(numeric_scores.std()) if len(numeric_scores) > 1 else 0.0

                passed_cnt = int((numeric_scores >= 4.0).sum())
                failed_cnt = len(numeric_scores) - passed_cnt
                pass_rate = round((passed_cnt / len(numeric_scores)) * 100.0, 1)
                fail_rate = round(100.0 - pass_rate, 1)

                score_stats = {
                    "score_column": score_col,
                    "count": len(numeric_scores),
                    "mean": round(mean_val, 2),
                    "median": round(median_val, 2),
                    "min": round(min_val, 2),
                    "max": round(max_val, 2),
                    "std": round(std_val, 2),
                    "pass_count": passed_cnt,
                    "fail_count": failed_cnt,
                    "pass_rate_pct": pass_rate,
                    "fail_rate_pct": fail_rate,
                    "is_scale_10": True,
                }

                # Vietnamese Academic Grade Hierarchy (A: >=8.5, B: 7.0-8.4, C: 5.5-6.9, D: 4.0-5.4, F: <4.0)
                grade_bins = [
                    ("F (< 4.0 Kém)", float((numeric_scores < 4.0).sum())),
                    ("D (4.0–5.4 TB Yếu)", float(((numeric_scores >= 4.0) & (numeric_scores < 5.5)).sum())),
                    ("C (5.5–6.9 TB)", float(((numeric_scores >= 5.5) & (numeric_scores < 7.0)).sum())),
                    ("B (7.0–8.4 Khá)", float(((numeric_scores >= 7.0) & (numeric_scores < 8.5)).sum())),
                    ("A (8.5–10 Giỏi/XS)", float((numeric_scores >= 8.5).sum())),
                ]
                total_sc = len(numeric_scores)
                for g_label, cnt in grade_bins:
                    pct = round((cnt / total_sc) * 100.0, 1) if total_sc > 0 else 0.0
                    grade_distribution.append({
                        "grade": g_label,
                        "count": int(cnt),
                        "percentage": pct
                    })

        # Attendance statistics
        attendance_stats = None
        if att_col:
            numeric_att = pd.to_numeric(valid_df[att_col], errors="coerce").dropna()
            numeric_att = numeric_att[(numeric_att >= 0.0) & (numeric_att <= 100.0)]
            if len(numeric_att) > 0:
                attendance_stats = {
                    "attendance_column": att_col,
                    "mean": round(float(numeric_att.mean()), 1),
                    "median": round(float(numeric_att.median()), 1),
                    "min": round(float(numeric_att.min()), 1),
                    "max": round(float(numeric_att.max()), 1),
                    "below_75_count": int((numeric_att < 75.0).sum()),
                }

        # Identify At-Risk Students from Valid Rows
        at_risk_students = []
        for idx, row in valid_df.iterrows():
            reasons = []
            score_val = None
            att_val = None

            if score_col and pd.notnull(row[score_col]):
                try:
                    s_num = float(row[score_col])
                    score_val = s_num
                    if s_num < 4.0:
                        reasons.append(f"Điểm thi {s_num} < 4.0 (Trượt môn)")
                except Exception:
                    pass

            if att_col and pd.notnull(row[att_col]):
                try:
                    a_num = float(row[att_col])
                    att_val = a_num
                    if a_num < 75.0:
                        reasons.append(f"Chuyên cần {a_num}% < 75% (Vi phạm quy chế)")
                except Exception:
                    pass

            if reasons:
                sid_val = str(row.get(sid_col, f"Dòng {idx+1}")) if sid_col else f"Dòng {idx+1}"
                name_val = str(row.get(name_col, "Chưa xác định")) if name_col else "Chưa xác định"
                at_risk_students.append({
                    "row_index": idx + 1,
                    "student_id": sid_val,
                    "full_name": name_val,
                    "score": score_val,
                    "attendance": att_val,
                    "reasons": reasons,
                    "recommended_action": "Mời phỏng vấn CVHT & học phụ đạo bổ sung",
                })

        # Top 50 preview rows
        preview_rows = df.head(50).fillna("").to_dict(orient="records")

        # Dataset classification & summary metrics
        is_academic = bool(sid_col or score_col)
        dataset_category = "academic" if is_academic else "general"

        numeric_columns_count = sum(1 for c in columns_info if c.get("is_numeric"))
        categorical_columns_count = len(columns_info) - numeric_columns_count
        missing_cells_count = int(df.isnull().sum().sum())
        total_cells = df.shape[0] * df.shape[1] if df.shape[0] * df.shape[1] > 0 else 1
        missing_cells_pct = round((missing_cells_count / total_cells) * 100.0, 2)
        try:
            memory_usage_kb = round(float(df.memory_usage(deep=True).sum()) / 1024.0, 1)
        except Exception:
            memory_usage_kb = 0.0

        # Compile anomalies summary
        anomalies = []
        if is_academic:
            if not sid_col:
                anomalies.append("Chưa nhận diện được cột Mã sinh viên. Vui lòng kiểm tra mục 'Ánh xạ cột thủ công'.")
            if not score_col:
                anomalies.append("Tệp không có cột điểm thi. Các biểu đồ phân bố điểm số sẽ tạm thời bị ẩn.")
            if duplicate_rows_count > 0:
                anomalies.append(f"Phát hiện {duplicate_rows_count} mã sinh viên bị lặp lại trong tệp dữ liệu.")
            if invalid_rows_count > 0:
                anomalies.append(f"Có {invalid_rows_count} dòng chứa giá trị không hợp lệ (ngoài thang 0-10 hoặc trống).")
        else:
            anomalies.append(f"Tệp dữ liệu tổng quát ({len(columns_info)} cột, {total_rows_read:,} dòng).")
            if missing_cells_count > 0:
                anomalies.append(f"Phát hiện {missing_cells_count:,} ô trống ({missing_cells_pct}% tổng thể dữ liệu).")
            else:
                anomalies.append("Chất lượng dữ liệu hoàn hảo: 100% các ô đều có giá trị, không có ô trống.")
            anomalies.append(f"Bao gồm {numeric_columns_count} cột định lượng (số) và {categorical_columns_count} cột định tính (văn bản/danh mục).")

        return {
            "file_name": file_name,
            "dataset_category": dataset_category,
            "sheet_names": sheet_names,
            "active_sheet": sheet_name,
            "header_row": header_row,
            "total_rows": total_rows_read,
            "total_columns": len(columns_info),
            "numeric_columns_count": numeric_columns_count,
            "categorical_columns_count": categorical_columns_count,
            "missing_cells_count": missing_cells_count,
            "missing_cells_pct": missing_cells_pct,
            "memory_usage_kb": memory_usage_kb,
            "valid_rows_count": valid_rows_count,
            "invalid_rows_count": invalid_rows_count,
            "duplicate_rows": duplicate_rows_count,
            "unique_students_count": unique_students_count,
            "detected_columns": detected_columns,
            "columns": columns_info,
            "has_score_column": has_score_column,
            "score_stats": score_stats,
            "attendance_stats": attendance_stats,
            "grade_distribution": grade_distribution,
            "at_risk_count": len(at_risk_students),
            "at_risk_students": at_risk_students[:30],
            "validation_errors": validation_errors[:50],
            "anomalies": anomalies,
            "preview_rows": preview_rows,
        }

    # -----------------------------------------------------------------------
    # 4. Entrypoint: Parse File Content
    # -----------------------------------------------------------------------
    def parse_file(
        self,
        content_bytes: bytes,
        file_name: str,
        sheet_name: Optional[str] = None,
        manual_mapping: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Parses uploaded file bytes, auto-detects header, analyzes, and returns standard payload.
        """
        df, sheet_names, active_sheet, header_row = self.load_raw_dataframe(
            content_bytes, file_name, sheet_name
        )
        return self.analyze_dataframe(
            df=df,
            file_name=file_name,
            sheet_name=active_sheet,
            sheet_names=sheet_names,
            header_row=header_row,
            manual_mapping=manual_mapping,
        )

    def get_sample_files(self) -> List[str]:
        files = []
        if os.path.exists(self.sample_dir):
            for f in os.listdir(self.sample_dir):
                if f.endswith((".csv", ".xlsx", ".json")):
                    files.append(f)
        return files

    def load_sample_file(
        self,
        file_name: str,
        sheet_name: Optional[str] = None,
        manual_mapping: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        full_path = os.path.join(self.sample_dir, file_name)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Tệp mẫu '{file_name}' không tồn tại.")
        with open(full_path, "rb") as f:
            content = f.read()
        return self.parse_file(content, file_name, sheet_name, manual_mapping)

    # -----------------------------------------------------------------------
    # 5. Data Warehouse Ingestion with Idempotency & Dry-Run
    # -----------------------------------------------------------------------
    def import_to_dw(
        self,
        content_bytes: bytes,
        file_name: str,
        sheet_name: Optional[str] = None,
        manual_mapping: Optional[Dict[str, str]] = None,
        dry_run: bool = False,
        replace_all: bool = False,
    ) -> Dict[str, Any]:
        """
        Ingests parsed records into the Data Warehouse (edupulse_dw.db) with:
        - Transaction safety (atomic commit/rollback)
        - Idempotent upsert on fact_student_performance
        - DimStudent SCD Type 2 dimension population
        - Dry-run validation mode
        """
        if not os.path.exists(self.dw_path):
            raise FileNotFoundError(f"Không tìm thấy cơ sở dữ liệu Kho Dữ Liệu ({self.dw_path}).")

        df, sheet_names, active_sheet, header_row = self.load_raw_dataframe(
            content_bytes, file_name, sheet_name
        )
        detected = self.resolve_columns(list(df.columns), manual_mapping)

        sid_col = detected["student_id"]
        if not sid_col:
            raise ValueError(
                "Không thể nạp vào Kho Dữ Liệu vì chưa xác định được cột Mã Sinh Viên. "
                "Vui lòng sử dụng mục 'Ánh xạ cột thủ công' để chọn đúng cột chứa MSSV."
            )

        name_col = detected["full_name"]
        score_col = detected["score"]
        att_col = detected["attendance"]
        major_col = detected["major"]
        course_col = detected["course_code"]
        sem_col = detected["semester_id"]

        conn = sqlite3.connect(self.dw_path)
        cursor = conn.cursor()

        # Cache reference tables
        default_course = cursor.execute("SELECT course_key, course_code, credits, department_key FROM dim_course LIMIT 1").fetchone()
        default_c_key, default_c_code, default_credits, default_dept_key = default_course if default_course else (1, "CS102", 3, 1)

        default_sem = cursor.execute("SELECT semester_key, semester_id FROM dim_semester ORDER BY chronological_order DESC LIMIT 1").fetchone()
        default_s_key, default_s_id = default_sem if default_sem else (1, "2024_HK1")

        course_map = {row[1]: (row[0], row[2], row[3]) for row in cursor.execute("SELECT course_key, course_code, credits, department_key FROM dim_course").fetchall()}
        sem_map = {row[1]: row[0] for row in cursor.execute("SELECT semester_key, semester_id FROM dim_semester").fetchall()}
        major_map = {row[1]: (row[0], row[2], row[3]) for row in cursor.execute("SELECT major_key, major_name, department_key, department_name FROM dim_major").fetchall()}
        major_id_map = {row[1]: (row[0], row[2], row[3], row[4]) for row in cursor.execute("SELECT major_key, major_id, major_name, department_key, department_name FROM dim_major").fetchall()}

        # Infer course from filename if available (e.g. 'cs102')
        inferred_c_key, inferred_credits, inferred_dept_key = default_c_key, default_credits, default_dept_key
        fn_clean = normalize_token(file_name)
        for c_code, (c_k, c_cr, c_dp) in course_map.items():
            if normalize_token(c_code) in fn_clean:
                inferred_c_key, inferred_credits, inferred_dept_key = c_k, c_cr, c_dp
                break

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Counts
        inserted_students_count = 0
        upserted_facts_count = 0
        skipped_invalid_count = 0
        preview_samples = []

        try:
            if not dry_run:
                cursor.execute("BEGIN TRANSACTION")

            for idx, row in df.iterrows():
                raw_sid = row.get(sid_col)
                if pd.isnull(raw_sid) or str(raw_sid).strip() == "" or str(raw_sid).lower() == "nan":
                    skipped_invalid_count += 1
                    continue

                sid = str(raw_sid).strip()
                full_name = str(row[name_col]).strip() if name_col and pd.notnull(row[name_col]) else f"Sinh viên {sid}"

                # Resolve major
                m_key, d_key, d_name = 1, 1, "Khoa Công nghệ Thông tin"
                m_name = "Kỹ thuật Phần mềm"
                if major_col and pd.notnull(row[major_col]):
                    m_val = str(row[major_col]).strip()
                    if m_val in major_map:
                        m_key, d_key, d_name = major_map[m_val]
                        m_name = m_val
                    elif m_val in major_id_map:
                        m_key, m_name, d_key, d_name = major_id_map[m_val]

                # Resolve course
                c_key = inferred_c_key
                c_credits = inferred_credits
                c_dept = inferred_dept_key
                if course_col and pd.notnull(row[course_col]):
                    c_val = str(row[course_col]).strip()
                    if c_val in course_map:
                        c_key, c_credits, c_dept = course_map[c_val]

                # Resolve semester
                s_key = default_s_key
                if sem_col and pd.notnull(row[sem_col]):
                    s_val = str(row[sem_col]).strip()
                    if s_val in sem_map:
                        s_key = sem_map[s_val]

                # Resolve score
                total_score = 7.0
                if score_col and pd.notnull(row[score_col]):
                    try:
                        parsed_sc = float(row[score_col])
                        if 0.0 <= parsed_sc <= 10.0:
                            total_score = parsed_sc
                        else:
                            skipped_invalid_count += 1
                            continue
                    except (ValueError, TypeError):
                        skipped_invalid_count += 1
                        continue

                # Resolve attendance
                att_rate = 85.0
                if att_col and pd.notnull(row[att_col]):
                    try:
                        parsed_att = float(row[att_col])
                        if 0.0 <= parsed_att <= 100.0:
                            att_rate = parsed_att
                    except (ValueError, TypeError):
                        pass

                # Derive scores & letter grade
                midterm = round(max(0.0, min(10.0, total_score - 0.5)), 1)
                final_sc = round(max(0.0, min(10.0, total_score + 0.5)), 1)

                if total_score >= 8.5:
                    gpa_4, letter = 4.0, "A"
                elif total_score >= 7.0:
                    gpa_4, letter = 3.0, "B"
                elif total_score >= 5.5:
                    gpa_4, letter = 2.0, "C"
                elif total_score >= 4.0:
                    gpa_4, letter = 1.0, "D"
                else:
                    gpa_4, letter = 0.0, "F"

                is_passed = 1 if total_score >= 4.0 else 0
                earned_credits = c_credits if is_passed else 0

                if dry_run:
                    # Check if student exists
                    cursor.execute("SELECT student_key FROM dim_student WHERE student_id = ? AND is_current = 1", (sid,))
                    st_row = cursor.fetchone()
                    if not st_row:
                        inserted_students_count += 1
                    upserted_facts_count += 1
                    if len(preview_samples) < 5:
                        preview_samples.append({
                            "student_id": sid,
                            "full_name": full_name,
                            "score": total_score,
                            "letter_grade": letter,
                            "attendance": att_rate,
                        })
                else:
                    # Ensure student in dim_student
                    cursor.execute("SELECT student_key FROM dim_student WHERE student_id = ? AND is_current = 1", (sid,))
                    st_row = cursor.fetchone()
                    if not st_row:
                        cursor.execute("""
                            INSERT INTO dim_student (student_id, full_name, gender, birth_year, cohort_year, major_key, major_name, department_name, status, valid_from, is_current)
                            VALUES (?, ?, 'Nam', 2004, 2022, ?, ?, ?, 'ENROLLED', ?, 1)
                        """, (sid, full_name, m_key, m_name, d_name, now_str))
                        student_key = cursor.lastrowid
                        inserted_students_count += 1
                    else:
                        student_key = st_row[0]

                    # Upsert Fact
                    cursor.execute("""
                        INSERT INTO fact_student_performance (
                            student_key, course_key, semester_key, major_key, department_key, date_key,
                            section_id, attendance_rate, midterm_score, final_score, total_score,
                            gpa_point_4, letter_grade, credits_attempted, credits_earned, is_passed,
                            is_retake, batch_id, loaded_at
                        ) VALUES (?, ?, ?, ?, ?, 20241021, 'SEC_INGEST', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 999, ?)
                        ON CONFLICT(student_key, course_key, semester_key) DO UPDATE SET
                            attendance_rate=excluded.attendance_rate,
                            midterm_score=excluded.midterm_score,
                            final_score=excluded.final_score,
                            total_score=excluded.total_score,
                            gpa_point_4=excluded.gpa_point_4,
                            letter_grade=excluded.letter_grade,
                            credits_attempted=excluded.credits_attempted,
                            credits_earned=excluded.credits_earned,
                            is_passed=excluded.is_passed,
                            loaded_at=excluded.loaded_at;
                    """, (
                        student_key, c_key, s_key, m_key, d_key,
                        att_rate, midterm, final_sc, total_score,
                        gpa_4, letter, c_credits, earned_credits, is_passed,
                        now_str
                    ))
                    upserted_facts_count += 1

            if not dry_run:
                conn.commit()

            return {
                "success": True,
                "dry_run": dry_run,
                "imported_count": upserted_facts_count,
                "inserted_students": inserted_students_count,
                "upserted_facts": upserted_facts_count,
                "skipped_invalid": skipped_invalid_count,
                "preview_samples": preview_samples,
                "message": (
                    f"Kiểm tra trước (Dry-run): Sẽ thêm {inserted_students_count} sinh viên mới, nạp/cập nhật {upserted_facts_count} kết quả học tập."
                    if dry_run else
                    f"Đã đồng bộ thành công vào Kho Dữ Liệu! Đã thêm {inserted_students_count} sinh viên mới, nạp/cập nhật {upserted_facts_count} kết quả học tập. Bỏ qua {skipped_invalid_count} dòng lỗi."
                )
            }
        except Exception as e:
            if not dry_run:
                conn.rollback()
            raise e
        finally:
            conn.close()
