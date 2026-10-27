import React, { useState } from 'react';
import { Database, Key, Shield, FileCode, Check, Copy, Layers, Cpu, Server, Zap } from 'lucide-react';

export const PhysicalSchemaPage: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const physicalTables = [
    {
      name: 'fact_student_performance',
      type: 'FACT TABLE',
      grain: '1 bản ghi / 1 sinh viên / 1 học phần / 1 học kỳ',
      desc: 'Bảng Fact trung tâm lưu trữ kết quả học tập từng học phần, điểm đánh giá quá trình/kết thúc và tỷ lệ chuyên cần.',
      pks: ['performance_key (INTEGER PRIMARY KEY)'],
      fks: [
        'student_key → dim_student(student_key)',
        'course_key → dim_course(course_key)',
        'semester_key → dim_semester(semester_key)',
        'major_key → dim_major(major_key)',
        'department_key → dim_department(department_key)',
        'date_key → dim_date(date_key)',
      ],
      indexes: [
        'idx_fsp_student ON (student_key)',
        'idx_fsp_course ON (course_key)',
        'idx_fsp_semester ON (semester_key)',
        'idx_fsp_grain UNIQUE ON (student_key, course_key, semester_key)',
      ],
    },
    {
      name: 'dim_student',
      type: 'DIMENSION (SCD TYPE 2)',
      grain: '1 bản ghi / phiên bản lịch sử của sinh viên',
      desc: 'Chiều sinh viên lưu trữ thuộc tính nhân khẩu học và trạng thái học vụ. Hỗ trợ theo dõi biến động ngành học theo thời gian.',
      pks: ['student_key (INTEGER PRIMARY KEY AUTOINCREMENT)'],
      fks: ['major_key → dim_major(major_key)'],
      indexes: [
        'idx_dim_student_id ON (student_id)',
        'idx_dim_student_current ON (student_id, is_current)',
      ],
    },
    {
      name: 'dim_course',
      type: 'DIMENSION',
      grain: '1 bản ghi / môn học chuẩn hóa',
      desc: 'Chiều môn học định nghĩa số tín chỉ, khoa phụ trách và khối kiến thức quy chuẩn trong khung chương trình đào tạo.',
      pks: ['course_key (INTEGER PRIMARY KEY AUTOINCREMENT)'],
      fks: ['department_key → dim_department(department_key)'],
      indexes: ['idx_dim_course_code UNIQUE ON (course_code)'],
    },
    {
      name: 'dim_semester',
      type: 'DIMENSION',
      grain: '1 bản ghi / học kỳ đào tạo',
      desc: 'Chiều trục thời gian học vụ theo thứ tự niên khóa biên niên (Chronological Order), phục vụ phân tích xu hướng dọc.',
      pks: ['semester_key (INTEGER PRIMARY KEY AUTOINCREMENT)'],
      fks: [],
      indexes: [
        'idx_dim_sem_id UNIQUE ON (semester_id)',
        'idx_dim_sem_order ON (chronological_order)',
      ],
    },
    {
      name: 'etl_audit_log',
      type: 'AUDIT LOG',
      grain: '1 bản ghi / 1 đợt thực thi pipeline',
      desc: 'Nhật ký kiểm toán hệ thống ghi lại lịch sử các đợt ETL/ELT: số dòng trích xuất, hợp lệ, từ chối và thời lượng.',
      pks: ['batch_id (INTEGER PRIMARY KEY AUTOINCREMENT)'],
      fks: [],
      indexes: ['idx_etl_start_time ON (start_time DESC)'],
    },
    {
      name: 'etl_rejected_records',
      type: 'AUDIT & REJECT',
      grain: '1 bản ghi / 1 dòng dữ liệu bị loại bỏ',
      desc: 'Kho lưu vết chi tiết các bản ghi bị từ chối do vi phạm tính toàn vẹn khóa ngoại, trùng lặp hạt dữ liệu hoặc lỗi kiểm định.',
      pks: ['reject_id (INTEGER PRIMARY KEY AUTOINCREMENT)'],
      fks: ['batch_id → etl_audit_log(batch_id)'],
      indexes: ['idx_err_batch ON (batch_id)', 'idx_err_reason ON (reason_code)'],
    },
  ];

  const sqlDDL = `-- ====================================================================
-- EDUPULSE DATA WAREHOUSE - STAR SCHEMA DDL
-- Dialect: ANSI SQL / SQLite 3 & PostgreSQL 14+
-- Standard: Kimball Star Schema for Higher Education Analytics
-- ====================================================================

CREATE TABLE dim_department (
    department_key INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id VARCHAR(20) NOT NULL UNIQUE,
    department_name VARCHAR(100) NOT NULL,
    faculty_dean VARCHAR(100)
);

CREATE TABLE dim_major (
    major_key INTEGER PRIMARY KEY AUTOINCREMENT,
    major_id VARCHAR(20) NOT NULL UNIQUE,
    major_name VARCHAR(100) NOT NULL,
    department_key INTEGER NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    required_credits INTEGER NOT NULL DEFAULT 130,
    FOREIGN KEY (department_key) REFERENCES dim_department(department_key)
);

CREATE TABLE dim_student (
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

CREATE TABLE dim_course (
    course_key INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code VARCHAR(20) NOT NULL UNIQUE,
    course_name VARCHAR(150) NOT NULL,
    credits INTEGER NOT NULL,
    department_key INTEGER NOT NULL,
    knowledge_block VARCHAR(100) NOT NULL,
    FOREIGN KEY (department_key) REFERENCES dim_department(department_key)
);

CREATE TABLE dim_semester (
    semester_key INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id VARCHAR(20) NOT NULL UNIQUE,
    academic_year VARCHAR(20) NOT NULL,
    semester_name VARCHAR(30) NOT NULL,
    chronological_order INTEGER NOT NULL
);

CREATE TABLE fact_student_performance (
    performance_key INTEGER PRIMARY KEY AUTOINCREMENT,
    student_key INTEGER NOT NULL,
    course_key INTEGER NOT NULL,
    semester_key INTEGER NOT NULL,
    major_key INTEGER NOT NULL,
    department_key INTEGER NOT NULL,
    date_key INTEGER,
    section_id VARCHAR(50) NOT NULL,
    attendance_rate REAL NOT NULL,
    midterm_score REAL,
    final_score REAL,
    total_score REAL NOT NULL,
    gpa_point_4 REAL NOT NULL,
    letter_grade VARCHAR(5) NOT NULL,
    credits_attempted INTEGER NOT NULL,
    credits_earned INTEGER NOT NULL,
    is_passed INTEGER NOT NULL,
    is_retake INTEGER NOT NULL DEFAULT 0,
    batch_id INTEGER NOT NULL,
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_key) REFERENCES dim_student(student_key),
    FOREIGN KEY (course_key) REFERENCES dim_course(course_key),
    FOREIGN KEY (semester_key) REFERENCES dim_semester(semester_key),
    FOREIGN KEY (major_key) REFERENCES dim_major(major_key),
    FOREIGN KEY (department_key) REFERENCES dim_department(department_key)
);

-- ====================================================================
-- PERFORMANCE INDEXING & CONSTRAINTS
-- ====================================================================

CREATE UNIQUE INDEX idx_fsp_grain 
ON fact_student_performance(student_key, course_key, semester_key);

CREATE INDEX idx_fsp_student ON fact_student_performance(student_key);
CREATE INDEX idx_fsp_course ON fact_student_performance(course_key);
CREATE INDEX idx_fsp_semester ON fact_student_performance(semester_key);
CREATE INDEX idx_dim_student_id ON dim_student(student_id);
CREATE INDEX idx_dim_student_current ON dim_student(student_id, is_current);
CREATE UNIQUE INDEX idx_dim_course_code ON dim_course(course_code);
CREATE UNIQUE INDEX idx_dim_sem_id ON dim_semester(semester_id);
CREATE INDEX idx_dim_sem_order ON dim_semester(chronological_order);`;

  const copyDDL = () => {
    navigator.clipboard.writeText(sqlDDL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Institutional Header Banner */}
      <div className="bg-white border border-inst-border rounded-xl p-6 shadow-inst-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-inst-navy text-white flex items-center justify-center shrink-0 shadow-xs">
              <Database className="w-5 h-5 text-slate-100" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-academic bg-academic/10 px-2 py-0.5 rounded">
                  Kiến trúc Vật lý Kho Dữ liệu
                </span>
                <span className="text-xs text-inst-text-secondary">• Chuẩn hóa RDBMS OLAP</span>
              </div>
              <h2 className="text-base font-bold text-inst-text mt-1">
                Thiết kế Sơ đồ Vật lý & Chiến lược Chỉ mục (Physical Schema & Indexing)
              </h2>
              <p className="text-xs text-inst-text-secondary mt-0.5 max-w-3xl leading-relaxed">
                Đặc tả kỹ thuật bảng dữ liệu vật lý, ràng buộc khóa chính/ngoại, chuẩn hóa kiểu dữ liệu và chỉ mục B-Tree 
                tối ưu hóa cho các truy vấn phân tích tổng hợp (Aggregation Queries) trên khối dữ liệu học vụ lớn.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 self-stretch lg:self-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-inst-border text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-inst-canvas border border-inst-border text-center">
              <span className="text-[10px] font-bold text-inst-text-secondary uppercase block">Tổng số bảng</span>
              <span className="text-sm font-bold text-inst-navy tabular-nums">6 Tables</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-inst-canvas border border-inst-border text-center">
              <span className="text-[10px] font-bold text-inst-text-secondary uppercase block">Fact Grain</span>
              <span className="text-sm font-bold text-academic tabular-nums">SV • MH • HK</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-inst-canvas border border-inst-border text-center">
              <span className="text-[10px] font-bold text-inst-text-secondary uppercase block">Chỉ mục B-Tree</span>
              <span className="text-sm font-bold text-inst-positive tabular-nums">11 Indexes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Physical Table Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {physicalTables.map((t) => {
          const isFact = t.type.includes('FACT');
          const isDim = t.type.includes('DIMENSION');
          const isAudit = t.type.includes('AUDIT');

          return (
            <div
              key={t.name}
              className="bg-white border border-inst-border rounded-xl p-5 shadow-inst-card flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-inst-border">
                  <div className="flex items-center space-x-2">
                    <Server className={`w-4 h-4 ${isFact ? 'text-inst-navy' : isDim ? 'text-academic' : 'text-inst-text-secondary'}`} />
                    <span className="font-mono text-xs font-bold text-inst-text">{t.name}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                      isFact
                        ? 'bg-inst-navy text-white border-inst-navy'
                        : isDim
                        ? 'bg-academic/10 text-academic border-academic/20'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {t.type}
                  </span>
                </div>

                <p className="text-xs text-inst-text-secondary my-3 leading-relaxed">{t.desc}</p>

                <div className="bg-inst-canvas/60 border border-inst-border rounded-lg p-2.5 mb-3 text-[11px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-inst-text-secondary block">
                    Hạt dữ liệu (Grain):
                  </span>
                  <span className="font-medium text-inst-text">{t.grain}</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-inst-text-secondary block">
                      Khóa chính (PK):
                    </span>
                    <span className="font-mono text-[11px] text-academic font-semibold">
                      {t.pks.join(', ')}
                    </span>
                  </div>

                  {t.fks.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-inst-text-secondary block">
                        Khóa ngoại liên kết (FK):
                      </span>
                      <ul className="text-[11px] font-mono text-inst-text-secondary space-y-0.5 mt-0.5">
                        {t.fks.map((fk) => (
                          <li key={fk} className="flex items-center space-x-1">
                            <span className="text-slate-400">↳</span>
                            <span>{fk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-inst-text-secondary block">
                      Chỉ mục tăng tốc (B-Tree Indexes):
                    </span>
                    <ul className="text-[11px] font-mono text-inst-text-secondary space-y-0.5 mt-0.5">
                      {t.indexes.map((idx) => (
                        <li key={idx} className="flex items-center space-x-1.5">
                          <Zap className="w-3 h-3 text-inst-warning shrink-0" />
                          <span className="text-slate-700">{idx}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-inst-border text-[11px] text-inst-text-secondary flex items-center justify-between">
                <span>Ràng buộc toàn vẹn: Referential Integrity</span>
                <span className="font-mono text-[10px] text-slate-500">ENGINE=InnoDB / WAL</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SQL DDL Code Snippet */}
      <div className="bg-white border border-inst-border rounded-xl p-5 shadow-inst-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-inst-border gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-academic/10 text-academic flex items-center justify-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-inst-text uppercase tracking-wider block">
                Mã nguồn DDL Khởi tạo Kho Dữ Liệu (dw_schema.sql)
              </span>
              <span className="text-[11px] text-inst-text-secondary">
                Tương thích SQLite 3 & PostgreSQL 14+ • Tự động tạo bảng, khóa và chỉ mục hiệu năng
              </span>
            </div>
          </div>
          <button
            onClick={copyDDL}
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-inst-canvas hover:bg-slate-200 border border-inst-border text-inst-text text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-inst-positive" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép DDL' : 'Sao chép mã DDL'}</span>
          </button>
        </div>
        <pre className="p-4 bg-inst-deep text-slate-200 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed max-h-96 border border-slate-800">
          {sqlDDL}
        </pre>
      </div>
    </div>
  );
};
