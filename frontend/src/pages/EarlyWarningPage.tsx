import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, HelpCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { EarlyWarningStudent, FilterState } from '../types';

interface EarlyWarningPageProps {
  filters: FilterState;
}

export const EarlyWarningPage: React.FC<EarlyWarningPageProps> = ({ filters }) => {
  const [students, setStudents] = useState<EarlyWarningStudent[]>([]);
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEarlyWarning = () => {
    setIsLoading(true);
    setError(null);
    api.getEarlyWarning(filters, riskFilter || undefined)
      .then((res) => setStudents(res))
      .catch((err) => {
        console.error(err);
        setError('Không thể kết nối đến máy chủ EduPulse Backend để tải danh sách cảnh báo.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchEarlyWarning();
  }, [filters, riskFilter]);

  const filteredStudents = students.filter(
    (s) =>
      s.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.major_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const highCount = students.filter((s) => s.risk_level === 'HIGH').length;
  const mediumCount = students.filter((s) => s.risk_level === 'MEDIUM').length;
  const watchCount = students.filter((s) => s.risk_level === 'WATCHLIST').length;

  return (
    <div className="space-y-6">
      {/* Policy Explanation Banner */}
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-4 text-xs text-[#1B2738] shadow-inst-card flex items-start space-x-3">
        <HelpCircle className="w-4 h-4 text-[#315D91] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-[#142B49]">Quy chế Cảnh báo Học tập & Can thiệp Sớm (Academic Standing Heuristics):</span>
          <p className="text-[#637187] leading-relaxed">
            Hệ thống phân tích dữ liệu tự động rà soát sinh viên theo 3 nhóm điều kiện:
            (1) GPA học kỳ &lt; 2.0 / 4.0; (2) Tỷ lệ chuyên cần &lt; 75%; hoặc (3) Chưa đạt &ge; 1 học phần.
            Mỗi trường hợp đi kèm mã nguyên nhân định lượng và đề xuất giải pháp can thiệp cho Cố vấn học tập (CVHT).
          </p>
        </div>
      </div>

      {/* Risk Tier Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setRiskFilter('')}
          className={`cursor-pointer bg-white border rounded-[8px] p-4 shadow-inst-card transition-all ${
            riskFilter === '' ? 'border-[#142B49] ring-2 ring-[#142B49]/10' : 'border-[#DFE5ED] hover:border-[#CBD5E1]'
          }`}
        >
          <span className="text-[11px] font-semibold text-[#637187] uppercase tracking-wider">Tất cả trường hợp</span>
          <div className="text-2xl font-bold text-[#142B49] mt-1 tabular-nums">{students.length}</div>
          <p className="text-[11px] text-[#637187] mt-1">Tổng số sinh viên cần rà soát</p>
        </div>

        <div
          onClick={() => setRiskFilter('HIGH')}
          className={`cursor-pointer bg-white border rounded-[8px] p-4 shadow-inst-card transition-all border-l-4 border-l-[#C43D4B] ${
            riskFilter === 'HIGH' ? 'border-r-[#C43D4B] border-t-[#C43D4B] border-b-[#C43D4B] ring-2 ring-[#C43D4B]/10' : 'border-[#DFE5ED] hover:border-[#CBD5E1]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#C43D4B] uppercase tracking-wider">Mức 1: Báo động đỏ</span>
          </div>
          <div className="text-2xl font-bold text-[#C43D4B] mt-1 tabular-nums">{highCount}</div>
          <p className="text-[11px] text-[#637187] mt-1">Chuyên cần &lt; 65% hoặc GPA &lt; 1.5</p>
        </div>

        <div
          onClick={() => setRiskFilter('MEDIUM')}
          className={`cursor-pointer bg-white border rounded-[8px] p-4 shadow-inst-card transition-all border-l-4 border-l-[#B7791F] ${
            riskFilter === 'MEDIUM' ? 'border-r-[#B7791F] border-t-[#B7791F] border-b-[#B7791F] ring-2 ring-[#B7791F]/10' : 'border-[#DFE5ED] hover:border-[#CBD5E1]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#B7791F] uppercase tracking-wider">Mức 2: Cảnh báo vàng</span>
          </div>
          <div className="text-2xl font-bold text-[#B7791F] mt-1 tabular-nums">{mediumCount}</div>
          <p className="text-[11px] text-[#637187] mt-1">GPA &lt; 2.0 hoặc chưa đạt &ge; 2 môn</p>
        </div>

        <div
          onClick={() => setRiskFilter('WATCHLIST')}
          className={`cursor-pointer bg-white border rounded-[8px] p-4 shadow-inst-card transition-all border-l-4 border-l-[#315D91] ${
            riskFilter === 'WATCHLIST' ? 'border-r-[#315D91] border-t-[#315D91] border-b-[#315D91] ring-2 ring-[#315D91]/10' : 'border-[#DFE5ED] hover:border-[#CBD5E1]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#315D91] uppercase tracking-wider">Mức 3: Theo dõi</span>
          </div>
          <div className="text-2xl font-bold text-[#315D91] mt-1 tabular-nums">{watchCount}</div>
          <p className="text-[11px] text-[#637187] mt-1">Chưa đạt 1 môn, GPA &ge; 2.0</p>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F1F5F9]">
          <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-[#C43D4B]" />
            <span>Danh sách Chi tiết Sinh viên Cần Hỗ trợ Học tập</span>
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#637187]" />
            <input
              type="text"
              placeholder="Tìm theo MSSV, Họ tên, Ngành..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] text-[#1B2738] focus:outline-none focus:border-[#315D91] focus:ring-1 focus:ring-[#315D91]"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#637187]">Đang truy vấn danh sách sinh viên cảnh báo...</div>
        ) : error ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <AlertTriangle className="w-6 h-6 text-[#C43D4B]" />
            <p className="text-xs text-[#C43D4B] font-medium">{error}</p>
            <button
              onClick={fetchEarlyWarning}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#142B49] hover:bg-[#1E3A5F] text-white text-xs font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#637187]">Không có sinh viên nào trong diện cần can thiệp với bộ lọc hiện tại.</div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#637187] uppercase font-semibold border-y border-[#DFE5ED] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Phân loại</th>
                  <th className="py-2.5 px-3">Mã SV</th>
                  <th className="py-2.5 px-3">Họ và tên</th>
                  <th className="py-2.5 px-3">Chuyên ngành</th>
                  <th className="py-2.5 px-2 text-center">Học kỳ</th>
                  <th className="py-2.5 px-2 text-center">GPA (4)</th>
                  <th className="py-2.5 px-2 text-center">Chuyên cần</th>
                  <th className="py-2.5 px-2 text-center">Môn trượt</th>
                  <th className="py-2.5 px-4">Lý do định lượng & Đề xuất can thiệp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredStudents.map((s, idx) => (
                  <tr key={`${s.student_id}-${s.semester_id}-${idx}`} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3">
                      {s.risk_level === 'HIGH' && (
                        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#FDF2F2] text-[#C43D4B] border border-[#F9D0D5]">
                          Báo động đỏ
                        </span>
                      )}
                      {s.risk_level === 'MEDIUM' && (
                        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#FEF6E7] text-[#B7791F] border border-[#FCE1B4]">
                          Cảnh báo vàng
                        </span>
                      )}
                      {s.risk_level === 'WATCHLIST' && (
                        <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#F0F4F9] text-[#315D91] border border-[#C3D3E6]">
                          Theo dõi
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#142B49]">{s.student_id}</td>
                    <td className="py-3 px-3 font-medium text-[#1B2738]">{s.full_name}</td>
                    <td className="py-3 px-3 text-[#637187] truncate max-w-[150px]">{s.major_name}</td>
                    <td className="py-3 px-2 text-center text-[#637187] font-medium">{s.semester_id}</td>
                    <td className="py-3 px-2 text-center font-bold text-[#C43D4B] tabular-nums">{s.semester_gpa_4.toFixed(2)}</td>
                    <td className="py-3 px-2 text-center font-medium text-[#1B2738] tabular-nums">{s.avg_attendance_pct.toFixed(1)}%</td>
                    <td className="py-3 px-2 text-center font-bold text-[#C43D4B] tabular-nums">{s.courses_failed}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[#1B2738] text-[11px]">
                          {s.risk_reasons.join(' • ')}
                        </div>
                        <div className="text-[11px] text-[#637187]">
                          → {s.suggested_action}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

