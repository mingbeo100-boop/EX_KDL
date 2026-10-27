-- ====================================================================
-- EDUPULSE DATA WAREHOUSE - STAR SCHEMA DDL
-- Database Type: Compatible with SQLite 3 & PostgreSQL 14+
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. DIMENSION TABLES
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dim_department (
    department_key INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id VARCHAR(20) NOT NULL UNIQUE,
    department_name VARCHAR(100) NOT NULL,
    faculty_dean VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS dim_major (
    major_key INTEGER PRIMARY KEY AUTOINCREMENT,
    major_id VARCHAR(20) NOT NULL UNIQUE,
    major_name VARCHAR(100) NOT NULL,
    department_key INTEGER NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    required_credits INTEGER NOT NULL DEFAULT 130,
    FOREIGN KEY (department_key) REFERENCES dim_department(department_key)
);

CREATE TABLE IF NOT EXISTS dim_student (
    student_key INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id VARCHAR(20) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    birth_year INTEGER NOT NULL,
    cohort_year INTEGER NOT NULL,
    major_key INTEGER NOT NULL,
    major_name VARCHAR(100) NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ENROLLED',
    valid_from TIMESTAMP NOT NULL,
    valid_to TIMESTAMP NULL,
    is_current INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (major_key) REFERENCES dim_major(major_key)
);

CREATE TABLE IF NOT EXISTS dim_course (
    course_key INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code VARCHAR(20) NOT NULL UNIQUE,
    course_name VARCHAR(150) NOT NULL,
    credits INTEGER NOT NULL,
    department_key INTEGER NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    course_level VARCHAR(20) NOT NULL, -- 'FOUNDATION', 'CORE', 'ELECTIVE'
    is_core INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (department_key) REFERENCES dim_department(department_key)
);

CREATE TABLE IF NOT EXISTS dim_semester (
    semester_key INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id VARCHAR(20) NOT NULL UNIQUE, -- e.g., '2023_HK1'
    academic_year VARCHAR(20) NOT NULL,      -- e.g., '2023-2024'
    term_name VARCHAR(20) NOT NULL,          -- 'Học kỳ 1', 'Học kỳ 2'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    chronological_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_date (
    date_key INTEGER PRIMARY KEY, -- Format: YYYYMMDD
    date_actual DATE NOT NULL UNIQUE,
    day INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    semester_id VARCHAR(20)
);

-- --------------------------------------------------------------------
-- 2. FACT TABLES
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fact_student_performance (
    performance_key INTEGER PRIMARY KEY AUTOINCREMENT,
    student_key INTEGER NOT NULL,
    course_key INTEGER NOT NULL,
    semester_key INTEGER NOT NULL,
    major_key INTEGER NOT NULL,
    department_key INTEGER NOT NULL,
    date_key INTEGER,
    section_id VARCHAR(50) NOT NULL,
    
    -- Measures
    attendance_rate REAL NOT NULL,      -- 0.00 to 100.00%
    midterm_score REAL,                -- Scale 10
    final_score REAL,                  -- Scale 10
    total_score REAL NOT NULL,          -- Scale 10 (midterm*0.4 + final*0.6)
    gpa_point_4 REAL NOT NULL,          -- Scale 4.0 (A=4, B=3, C=2, D=1, F=0)
    letter_grade VARCHAR(5) NOT NULL,   -- A+, A, B+, B, C+, C, D+, D, F
    credits_attempted INTEGER NOT NULL,
    credits_earned INTEGER NOT NULL,    -- Equal to attempted if passed, else 0
    is_passed INTEGER NOT NULL,         -- 1 if total_score >= 4.0 else 0
    is_retake INTEGER NOT NULL DEFAULT 0,
    
    -- Audit & Lineage
    batch_id INTEGER NOT NULL,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_key) REFERENCES dim_student(student_key),
    FOREIGN KEY (course_key) REFERENCES dim_course(course_key),
    FOREIGN KEY (semester_key) REFERENCES dim_semester(semester_key),
    FOREIGN KEY (major_key) REFERENCES dim_major(major_key),
    FOREIGN KEY (department_key) REFERENCES dim_department(department_key)
);

CREATE TABLE IF NOT EXISTS fact_attendance_aggregate (
    attendance_agg_key INTEGER PRIMARY KEY AUTOINCREMENT,
    student_key INTEGER NOT NULL,
    course_key INTEGER NOT NULL,
    semester_key INTEGER NOT NULL,
    total_sessions INTEGER NOT NULL,
    present_sessions INTEGER NOT NULL,
    excused_absent_sessions INTEGER NOT NULL,
    unexcused_absent_sessions INTEGER NOT NULL,
    attendance_percentage REAL NOT NULL,
    batch_id INTEGER NOT NULL,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_key) REFERENCES dim_student(student_key),
    FOREIGN KEY (course_key) REFERENCES dim_course(course_key),
    FOREIGN KEY (semester_key) REFERENCES dim_semester(semester_key)
);

-- --------------------------------------------------------------------
-- 3. AUDIT & QUALITY METRICS TABLES
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS etl_audit_log (
    batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'FAILED', 'WARNING'
    rows_extracted INTEGER DEFAULT 0,
    rows_valid INTEGER DEFAULT 0,
    rows_rejected INTEGER DEFAULT 0,
    rows_loaded_dim INTEGER DEFAULT 0,
    rows_loaded_fact INTEGER DEFAULT 0,
    execution_duration_sec REAL DEFAULT 0,
    details TEXT
);

CREATE TABLE IF NOT EXISTS etl_rejected_records (
    reject_id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    source_table VARCHAR(50) NOT NULL,
    record_identifier VARCHAR(100),
    reason_code VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    raw_data TEXT,
    rejected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES etl_audit_log(batch_id)
);

-- --------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES
-- --------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_fsp_student ON fact_student_performance(student_key);
CREATE INDEX IF NOT EXISTS idx_fsp_course ON fact_student_performance(course_key);
CREATE INDEX IF NOT EXISTS idx_fsp_semester ON fact_student_performance(semester_key);
CREATE INDEX IF NOT EXISTS idx_fsp_dept ON fact_student_performance(department_key);
CREATE INDEX IF NOT EXISTS idx_fsp_major ON fact_student_performance(major_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fsp_grain ON fact_student_performance(student_key, course_key, semester_key);

CREATE INDEX IF NOT EXISTS idx_dim_student_id ON dim_student(student_id);
CREATE INDEX IF NOT EXISTS idx_dim_student_current ON dim_student(student_id, is_current);
