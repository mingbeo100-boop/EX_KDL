-- ====================================================================
-- EDUPULSE OPERATIONAL SYSTEM (OLTP) DDL
-- Simulates the university academic management transactional database
-- ====================================================================

CREATE TABLE IF NOT EXISTS departments (
    department_id VARCHAR(20) PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    faculty_dean VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS majors (
    major_id VARCHAR(20) PRIMARY KEY,
    major_name VARCHAR(100) NOT NULL,
    department_id VARCHAR(20) NOT NULL,
    required_credits INTEGER NOT NULL DEFAULT 130,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    birth_year INTEGER NOT NULL,
    cohort_year INTEGER NOT NULL,
    major_id VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ENROLLED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (major_id) REFERENCES majors(major_id)
);

CREATE TABLE IF NOT EXISTS courses (
    course_code VARCHAR(20) PRIMARY KEY,
    course_name VARCHAR(150) NOT NULL,
    credits INTEGER NOT NULL,
    department_id VARCHAR(20) NOT NULL,
    course_level VARCHAR(20) NOT NULL,
    is_core INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE IF NOT EXISTS semesters (
    semester_id VARCHAR(20) PRIMARY KEY,
    academic_year VARCHAR(20) NOT NULL,
    term_name VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    chronological_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS class_sections (
    section_id VARCHAR(50) PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL,
    semester_id VARCHAR(20) NOT NULL,
    lecturer_name VARCHAR(100) NOT NULL,
    max_capacity INTEGER DEFAULT 60,
    FOREIGN KEY (course_code) REFERENCES courses(course_code),
    FOREIGN KEY (semester_id) REFERENCES semesters(semester_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id VARCHAR(20) NOT NULL,
    section_id VARCHAR(50) NOT NULL,
    course_code VARCHAR(20) NOT NULL,
    semester_id VARCHAR(20) NOT NULL,
    midterm_score REAL,
    final_score REAL,
    total_score REAL,
    letter_grade VARCHAR(5),
    gpa_point_4 REAL,
    attendance_rate REAL,
    is_retake INTEGER DEFAULT 0,
    enrollment_date DATE,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (section_id) REFERENCES class_sections(section_id),
    FOREIGN KEY (course_code) REFERENCES courses(course_code),
    FOREIGN KEY (semester_id) REFERENCES semesters(semester_id)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
    attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id VARCHAR(20) NOT NULL,
    section_id VARCHAR(50) NOT NULL,
    session_number INTEGER NOT NULL,
    session_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL, -- 'PRESENT', 'ABSENT_EXCUSED', 'ABSENT_UNEXCUSED'
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (section_id) REFERENCES class_sections(section_id)
);
