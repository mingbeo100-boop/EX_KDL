import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { FilterOptions, FilterState } from '../types';

interface FilterBarProps {
  options: FilterOptions | null;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  disabled?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({ options, filters, setFilters, disabled }) => {
  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const handleReset = () => {
    setFilters({
      semester_id: '',
      department_id: '',
      major_id: '',
      course_code: '',
      cohort_year: '',
    });
  };

  const filteredMajors = options?.majors.filter((m) => {
    if (!filters.department_id) return true;
    return true; // handled by backend
  }) || [];

  return (
    <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-3 sm:p-4 shadow-inst-card flex flex-wrap items-center gap-3">
      <div className="flex items-center space-x-2 text-[11px] font-bold text-[#142B49] uppercase tracking-wider pl-1 shrink-0">
        <Filter className="w-3.5 h-3.5 text-[#315D91]" />
        <span>Bộ lọc học vụ:</span>
      </div>

      {/* Semester */}
      <div className="min-w-[150px] flex-1">
        <select
          value={filters.semester_id}
          disabled={disabled || !options}
          onChange={(e) => setFilters((prev) => ({ ...prev, semester_id: e.target.value }))}
          className="w-full text-xs font-medium bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] px-2.5 py-1.5 text-[#1B2738] focus:outline-none focus:border-[#315D91] focus:ring-1 focus:ring-[#315D91]"
        >
          <option value="">Tất cả học kỳ</option>
          {options?.semesters.map((s) => (
            <option key={s.semester_id} value={s.semester_id}>
              {s.semester_id} ({s.term_name} • {s.academic_year})
            </option>
          ))}
        </select>
      </div>

      {/* Department */}
      <div className="min-w-[160px] flex-1">
        <select
          value={filters.department_id}
          disabled={disabled || !options}
          onChange={(e) => {
            const newDept = e.target.value;
            setFilters((prev) => ({ ...prev, department_id: newDept, major_id: '' }));
          }}
          className="w-full text-xs font-medium bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] px-2.5 py-1.5 text-[#1B2738] focus:outline-none focus:border-[#315D91] focus:ring-1 focus:ring-[#315D91]"
        >
          <option value="">Tất cả khoa đào tạo</option>
          {options?.departments.map((d) => (
            <option key={d.department_id} value={d.department_id}>
              {d.department_name} ({d.department_id})
            </option>
          ))}
        </select>
      </div>

      {/* Major */}
      <div className="min-w-[150px] flex-1">
        <select
          value={filters.major_id}
          disabled={disabled || !options}
          onChange={(e) => setFilters((prev) => ({ ...prev, major_id: e.target.value }))}
          className="w-full text-xs font-medium bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] px-2.5 py-1.5 text-[#1B2738] focus:outline-none focus:border-[#315D91] focus:ring-1 focus:ring-[#315D91]"
        >
          <option value="">Tất cả chuyên ngành</option>
          {filteredMajors.map((m) => (
            <option key={m.major_id} value={m.major_id}>
              {m.major_name} ({m.major_id})
            </option>
          ))}
        </select>
      </div>

      {/* Cohort Year */}
      <div className="min-w-[120px]">
        <select
          value={filters.cohort_year}
          disabled={disabled || !options}
          onChange={(e) => setFilters((prev) => ({ ...prev, cohort_year: e.target.value }))}
          className="w-full text-xs font-medium bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] px-2.5 py-1.5 text-[#1B2738] focus:outline-none focus:border-[#315D91] focus:ring-1 focus:ring-[#315D91]"
        >
          <option value="">Tất cả khóa tuyển sinh</option>
          {options?.cohorts.map((c) => (
            <option key={c} value={c.toString()}>
              Khóa tuyển sinh {c}
            </option>
          ))}
        </select>
      </div>

      {/* Reset button */}
      {hasActiveFilters && (
        <button
          onClick={handleReset}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FEF6E7] text-[#B7791F] border border-[#FCE1B4] rounded-[6px] text-xs font-semibold hover:bg-[#FDECCE] transition-colors"
          title="Xóa tất cả tiêu chí bộ lọc"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </button>
      )}
    </div>
  );
};

