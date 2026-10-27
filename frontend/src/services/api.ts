import {
  FilterOptions,
  FilterState,
  OverviewData,
  CourseItem,
  SectionBreakdown,
  EarlyWarningStudent,
  DataDictionaryDoc,
  ETLAuditLog,
  ETLRejectedRecord,
} from '../types';

const API_BASE = '/api';

function buildQuery(filters?: Partial<FilterState>): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.semester_id) params.append('semester_id', filters.semester_id);
  if (filters.department_id) params.append('department_id', filters.department_id);
  if (filters.major_id) params.append('major_id', filters.major_id);
  if (filters.course_code) params.append('course_code', filters.course_code);
  if (filters.cohort_year) params.append('cohort_year', filters.cohort_year);
  const q = params.toString();
  return q ? `?${q}` : '';
}

export const api = {
  async getFilterOptions(): Promise<FilterOptions> {
    const res = await fetch(`${API_BASE}/filters/options`);
    if (!res.ok) throw new Error('Không thể tải bộ lọc danh mục');
    return res.json();
  },

  async getOverview(filters?: Partial<FilterState>): Promise<OverviewData> {
    const q = buildQuery(filters);
    const res = await fetch(`${API_BASE}/analytics/overview${q}`);
    if (!res.ok) throw new Error('Không thể tải dữ liệu tổng quan');
    return res.json();
  },

  async getCourses(filters?: Partial<FilterState>): Promise<{ courses: CourseItem[]; selected_course_sections: SectionBreakdown[] }> {
    const q = buildQuery(filters);
    const res = await fetch(`${API_BASE}/analytics/courses${q}`);
    if (!res.ok) throw new Error('Không thể tải phân tích môn học');
    return res.json();
  },

  async getAttendance(filters?: Partial<FilterState>): Promise<{
    brackets: Array<{ bracket: string; count: number; avg_score: number; pass_rate_pct: number }>;
    department_attendance: Array<{ department_name: string; avg_attendance_pct: number; avg_score_10: number }>;
    scatter_samples: Array<{ attendance_rate: number; total_score: number; letter_grade: string; course_code: string }>;
  }> {
    const q = buildQuery(filters);
    const res = await fetch(`${API_BASE}/analytics/attendance${q}`);
    if (!res.ok) throw new Error('Không thể tải phân tích chuyên cần');
    return res.json();
  },

  async getCredits(filters?: Partial<FilterState>): Promise<{
    cohort_metrics: Array<{ cohort_year: number; students_count: number; total_attempted: number; total_earned: number; avg_credits_per_student: number; completion_pct: number }>;
    major_metrics: Array<{ major_name: string; required_credits: number; students_count: number; avg_accumulated_credits: number; completion_pct: number }>;
  }> {
    const q = buildQuery(filters);
    const res = await fetch(`${API_BASE}/analytics/credits${q}`);
    if (!res.ok) throw new Error('Không thể tải phân tích tiến độ tín chỉ');
    return res.json();
  },

  async getEarlyWarning(filters?: Partial<FilterState>, riskTier?: string): Promise<EarlyWarningStudent[]> {
    const params = new URLSearchParams();
    if (filters?.semester_id) params.append('semester_id', filters.semester_id);
    if (filters?.department_id) params.append('department_id', filters.department_id);
    if (filters?.major_id) params.append('major_id', filters.major_id);
    if (riskTier) params.append('risk_tier', riskTier);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/analytics/early-warning${q}`);
    if (!res.ok) throw new Error('Không thể tải danh sách cảnh báo học tập');
    return res.json();
  },

  async getDataDictionary(): Promise<DataDictionaryDoc> {
    const res = await fetch(`${API_BASE}/metadata/data-dictionary`);
    if (!res.ok) throw new Error('Không thể tải Data Dictionary');
    return res.json();
  },

  async getETLStatus(): Promise<{ latest_run: ETLAuditLog | null; run_history: ETLAuditLog[] }> {
    const res = await fetch(`${API_BASE}/etl/status`);
    if (!res.ok) throw new Error('Không thể tải trạng thái ETL');
    return res.json();
  },

  async getETLRejections(batchId?: number): Promise<ETLRejectedRecord[]> {
    const url = batchId ? `${API_BASE}/etl/rejections?batch_id=${batchId}` : `${API_BASE}/etl/rejections?limit=50`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Không thể tải bản ghi bị từ chối');
    return res.json();
  },

  async triggerETL(): Promise<{ success: boolean; message: string; data: any }> {
    const res = await fetch(`${API_BASE}/etl/trigger`, { method: 'POST' });
    if (!res.ok) throw new Error('Thực thi pipeline ETL thất bại');
    return res.json();
  },

  async uploadFile(file: File, sheetName?: string, manualMapping?: Record<string, string>): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (sheetName) {
      formData.append('sheet_name', sheetName);
    }
    if (manualMapping) {
      formData.append('manual_mapping', JSON.stringify(manualMapping));
    }
    const res = await fetch(`${API_BASE}/analysis/upload-file`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Tải tệp lên thất bại' }));
      throw new Error(err.detail || 'Lỗi xử lý tệp');
    }
    const data = await res.json();
    return data.data;
  },

  async getSampleFiles(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/analysis/sample-files`);
    if (!res.ok) throw new Error('Không thể lấy danh sách tệp mẫu');
    return res.json();
  },

  async loadSampleFile(name: string, sheetName?: string, manualMapping?: Record<string, string>): Promise<any> {
    const params = new URLSearchParams();
    params.append('name', name);
    if (sheetName) params.append('sheet_name', sheetName);
    if (manualMapping) params.append('manual_mapping', JSON.stringify(manualMapping));

    const res = await fetch(`${API_BASE}/analysis/load-sample?${params.toString()}`);
    if (!res.ok) throw new Error('Không thể tải tệp mẫu');
    const data = await res.json();
    return data.data;
  },

  async importToDW(
    file?: File | null,
    sampleName?: string,
    sheetName?: string,
    manualMapping?: Record<string, string>
  ): Promise<{ success: boolean; imported_count: number; message: string }> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (sampleName) {
      formData.append('sample_name', sampleName);
    }
    if (sheetName) {
      formData.append('sheet_name', sheetName);
    }
    if (manualMapping) {
      formData.append('manual_mapping', JSON.stringify(manualMapping));
    }
    const res = await fetch(`${API_BASE}/analysis/import-to-dw`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Nạp vào Kho Dữ Liệu thất bại' }));
      throw new Error(err.detail || 'Lỗi khi nạp vào Kho Dữ Liệu');
    }
    return res.json();
  },
};
