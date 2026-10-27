import React, { useState, useEffect } from 'react';
import { BookOpen, Search, AlertTriangle, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { CourseItem, SectionBreakdown, FilterState } from '../types';

interface CoursesPageProps {
  filters: FilterState;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({ filters }) => {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [sections, setSections] = useState<SectionBreakdown[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = () => {
    setIsLoading(true);
    setError(null);
    api.getCourses({ ...filters, course_code: selectedCourse || undefined })
      .then((res) => {
        setCourses(res.courses);
        if (!selectedCourse && res.courses.length > 0) {
          setSelectedCourse(res.courses[0].course_code);
        }
        setSections(res.selected_course_sections);
      })
      .catch((err) => {
        console.error(err);
        setError('Không thể kết nối đến máy chủ EduPulse Backend để tải danh mục học phần.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCourses();
  }, [filters, selectedCourse]);

  const filteredCourses = courses.filter(
    (c) =>
      c.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.department_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-white border border-[#F9D0D5] rounded-[8px] p-6 shadow-inst-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-[#FDF2F2] flex items-center justify-center text-[#C43D4B] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#142B49]">Lỗi kết nối máy chủ</h3>
              <p className="text-xs text-[#637187]">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchCourses}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#142B49] hover:bg-[#1E3A5F] text-white text-xs font-medium rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Header & Search */}
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-4 shadow-inst-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-[#315D91]" />
            <span>Danh mục Học phần & Đánh giá Hiệu quả Giảng dạy</span>
          </h2>
          <p className="text-xs text-[#637187] mt-0.5">Tổng số {courses.length} học phần đang được giám sát chất lượng</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#637187]" />
          <input
            type="text"
            placeholder="Tìm theo mã hoặc tên môn học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] text-[#1B2738] focus:outline-none focus:border-[#315D91] focus:ring-1 focus:ring-[#315D91]"
          />
        </div>
      </div>

      {/* Main Grid: Course List & Section Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Course Catalog Table */}
        <div className="lg:col-span-8 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F1F5F9]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#637187]">
              Bảng chỉ số học phần (Chọn một học phần để phân rã chi tiết lớp)
            </h3>
            <span className="text-[11px] text-[#637187] tabular-nums">{filteredCourses.length} môn</span>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#637187] uppercase font-semibold border-y border-[#DFE5ED] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Mã HP</th>
                  <th className="py-2.5 px-3">Tên học phần</th>
                  <th className="py-2.5 px-2 text-center">Tín chỉ</th>
                  <th className="py-2.5 px-2 text-center">Lượt học</th>
                  <th className="py-2.5 px-2 text-center">Điểm TB</th>
                  <th className="py-2.5 px-2 text-center">Tỷ lệ Đạt</th>
                  <th className="py-2.5 px-3 text-right">Tỷ lệ Chưa đạt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredCourses.map((c) => {
                  const isSelected = selectedCourse === c.course_code;
                  return (
                    <tr
                      key={c.course_code}
                      onClick={() => setSelectedCourse(c.course_code)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#F0F4F9] font-medium border-l-[3px] border-l-[#142B49]' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-[#142B49]">{c.course_code}</td>
                      <td className="py-2.5 px-3 text-[#1B2738] truncate max-w-[200px]">{c.course_name}</td>
                      <td className="py-2.5 px-2 text-center text-[#637187] tabular-nums">{c.credits}</td>
                      <td className="py-2.5 px-2 text-center text-[#637187] tabular-nums">{c.total_enrollments}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#142B49] tabular-nums">{c.avg_score_10.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-center text-[#18856B] font-semibold tabular-nums">{c.pass_rate_pct.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-[4px] text-[11px] font-semibold tabular-nums ${
                            c.fail_rate_pct >= 25
                              ? 'bg-[#FDF2F2] text-[#C43D4B] border border-[#F9D0D5]'
                              : c.fail_rate_pct >= 15
                              ? 'bg-[#FEF6E7] text-[#B7791F] border border-[#FCE1B4]'
                              : 'bg-[#F4F6F9] text-[#637187] border border-[#DFE5ED]'
                          }`}
                        >
                          {c.fail_rate_pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section Drilldown Panel */}
        <div className="lg:col-span-4 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="border-b border-[#F1F5F9] pb-3 mb-4">
            <span className="text-[11px] font-bold text-[#315D91] uppercase tracking-wider">Chi tiết Phân rã Lớp học phần</span>
            <h3 className="text-base font-bold text-[#142B49] mt-0.5">{selectedCourse || 'Chưa chọn học phần'}</h3>
            <p className="text-xs text-[#637187]">Phân bổ chỉ số theo từng lớp môn học thực tế</p>
          </div>

          {sections.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#637187]">Không có dữ liệu lớp học phần cho môn này</div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {sections.map((sec) => (
                <div key={sec.section_id} className="p-3 bg-[#F8FAFC] rounded-[6px] border border-[#DFE5ED] hover:border-[#CBD5E1] transition-all text-xs">
                  <div className="flex items-center justify-between font-bold text-[#142B49]">
                    <span className="truncate">{sec.section_id}</span>
                    <span className="text-[10px] bg-[#E1E9F2] text-[#142B49] px-2 py-0.5 rounded-[4px]">
                      {sec.semester_id}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-[#DFE5ED] text-[11px]">
                    <div>
                      <span className="text-[#637187] block text-[10px]">Sĩ số lớp</span>
                      <span className="font-semibold text-[#1B2738] tabular-nums">{sec.section_size} SV</span>
                    </div>
                    <div>
                      <span className="text-[#637187] block text-[10px]">Điểm TB</span>
                      <span className="font-bold text-[#142B49] tabular-nums">{sec.avg_score.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[#637187] block text-[10px]">Tỷ lệ Đạt</span>
                      <span className="font-bold text-[#18856B] tabular-nums">{sec.pass_rate_pct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

