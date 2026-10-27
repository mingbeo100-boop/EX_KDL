export interface FilterState {
  semester_id: string;
  department_id: string;
  major_id: string;
  course_code: string;
  cohort_year: string;
}

export interface FilterOptions {
  semesters: Array<{ semester_id: string; academic_year: string; term_name: string; chronological_order: number }>;
  departments: Array<{ department_id: string; department_name: string }>;
  majors: Array<{ major_id: string; major_name: string; department_key: number }>;
  courses: Array<{ course_code: string; course_name: string; credits: number; department_name: string; course_level: string }>;
  cohorts: number[];
}

export interface OverviewKPIs {
  unique_students: number;
  total_enrollments: number;
  avg_score_10: number;
  credit_weighted_gpa_4: number;
  pass_rate_pct: number;
  fail_rate_pct: number;
  avg_attendance_pct: number;
  at_risk_students_count: number;
  credits_attempted_sum: number;
  credits_earned_sum: number;
  credit_completion_pct: number;
}

export interface SemesterTrendPoint {
  semester_id: string;
  term_name: string;
  academic_year: string;
  chronological_order: number;
  unique_students: number;
  enrollments: number;
  avg_score_10: number;
  credit_weighted_gpa_4: number;
  pass_rate_pct: number;
  avg_attendance_pct: number;
}

export interface DepartmentMetric {
  department_id: string;
  department_name: string;
  unique_students: number;
  enrollments: number;
  avg_score_10: number;
  pass_rate_pct: number;
  fail_rate_pct: number;
  avg_attendance_pct: number;
}

export interface TopFailureCourse {
  course_code: string;
  course_name: string;
  department_name: string;
  credits: number;
  total_enrollments: number;
  failed_count: number;
  fail_rate_pct: number;
  avg_score: number;
}

export interface GradeDistributionItem {
  letter_grade: string;
  count: number;
  percentage: number;
}

export interface AttendanceScoreBin {
  bracket: string;
  enrollment_count: number;
  avg_score_10: number;
  pass_rate_pct: number;
}

export interface OverviewData {
  kpis: OverviewKPIs;
  semester_trends: SemesterTrendPoint[];
  department_metrics: DepartmentMetric[];
  top_failure_courses: TopFailureCourse[];
  grade_distribution: GradeDistributionItem[];
  attendance_correlation: AttendanceScoreBin[];
}

export interface CourseItem {
  course_code: string;
  course_name: string;
  department_name: string;
  credits: number;
  course_level: string;
  total_enrollments: number;
  unique_students: number;
  avg_score_10: number;
  avg_attendance_pct: number;
  pass_rate_pct: number;
  fail_rate_pct: number;
  retake_enrollments: number;
}

export interface SectionBreakdown {
  section_id: string;
  semester_id: string;
  section_size: number;
  avg_score: number;
  pass_rate_pct: number;
  avg_attendance: number;
}

export interface EarlyWarningStudent {
  student_id: string;
  full_name: string;
  gender: string;
  cohort_year: number;
  major_name: string;
  department_name: string;
  status: string;
  semester_id: string;
  term_name: string;
  courses_enrolled: number;
  courses_failed: number;
  semester_gpa_4: number;
  semester_avg_score_10: number;
  avg_attendance_pct: number;
  risk_level: 'HIGH' | 'MEDIUM' | 'WATCHLIST';
  risk_reasons: string[];
  suggested_action: string;
}

export interface DataDictionaryColumn {
  name: string;
  data_type: string;
  is_pk: boolean;
  is_fk: boolean;
  references?: string;
  nullable: boolean;
  default: string | null;
  unit: string;
  description: string;
  validation_rules: string;
  sample_value: string;
}

export interface DataDictionaryTable {
  table_name: string;
  table_type: 'FACT' | 'DIMENSION' | 'AUDIT';
  description: string;
  grain: string;
  columns: DataDictionaryColumn[];
}

export interface DataDictionaryDoc {
  system_info: {
    project_name: string;
    architecture: string;
    version: string;
    last_updated: string;
  };
  tables: DataDictionaryTable[];
}

export interface ETLAuditLog {
  batch_id: number;
  pipeline_name: string;
  start_time: string;
  end_time: string;
  status: string;
  rows_extracted: number;
  rows_valid: number;
  rows_rejected: number;
  rows_loaded_dim: number;
  rows_loaded_fact: number;
  execution_duration_sec: number;
  details: string;
}

export interface ETLRejectedRecord {
  reject_id: number;
  batch_id: number;
  source_table: string;
  record_identifier: string;
  reason_code: string;
  error_message: string;
  raw_data: string;
}

export interface FileAnalysisColumn {
  column_name: string;
  data_type: string;
  raw_dtype?: string;
  non_null_count: number;
  null_count: number;
  null_pct?: number;
  unique_count?: number;
  sample: string;
  is_numeric?: boolean;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  sum?: number;
  histogram?: Array<{ bin: string; count: number; min: number; max: number; percentage: number }>;
  top_values?: Array<{ value: string; count: number; percentage: number }>;
}

export interface FileAnalysisResult {
  file_name: string;
  dataset_category?: 'academic' | 'general';
  sheet_names?: string[];
  active_sheet?: string;
  header_row?: number;
  total_rows: number;
  total_columns: number;
  numeric_columns_count?: number;
  categorical_columns_count?: number;
  missing_cells_count?: number;
  missing_cells_pct?: number;
  memory_usage_kb?: number;
  valid_rows_count?: number;
  invalid_rows_count?: number;
  duplicate_rows: number;
  has_score_column?: boolean;
  detected_columns: {
    student_id: string | null;
    full_name: string | null;
    score: string | null;
    attendance: string | null;
    major?: string | null;
    course_code?: string | null;
    semester_id?: string | null;
    credits?: string | null;
  };
  columns: FileAnalysisColumn[];
  score_stats: {
    score_column: string;
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    std: number;
    pass_count: number;
    fail_count: number;
    pass_rate_pct: number;
    fail_rate_pct: number;
    is_scale_10: boolean;
  } | null;
  attendance_stats: {
    attendance_column: string;
    mean: number;
    median: number;
    min: number;
    max: number;
    below_75_count: number;
  } | null;
  grade_distribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
  at_risk_count: number;
  at_risk_students: Array<{
    row_index: number;
    student_id: string;
    full_name: string;
    score: number | null;
    attendance: number | null;
    reasons: string[];
    recommended_action: string;
  }>;
  anomalies: string[];
  preview_rows: Array<Record<string, any>>;
}
