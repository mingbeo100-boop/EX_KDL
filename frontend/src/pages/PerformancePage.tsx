import React from 'react';
import { Award, GraduationCap, BarChart2, PieChart as PieIcon, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { OverviewData } from '../types';

interface PerformancePageProps {
  data: OverviewData | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const COLORS = ['#18856B', '#22A384', '#315D91', '#507EBA', '#B7791F', '#CFA04E', '#D97706', '#E5933A', '#C43D4B'];

export const PerformancePage: React.FC<PerformancePageProps> = ({ data, isLoading, error, onRetry }) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-16 shadow-inst-card flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#142B49] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[#637187]">Đang truy vấn phân tích kết quả học tập...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-[#F9D0D5] rounded-[8px] p-12 shadow-inst-card flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[#FDF2F2] flex items-center justify-center text-[#C43D4B]">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-sm font-bold text-[#142B49]">Không thể kết nối đến máy chủ EduPulse Backend</h3>
          <p className="text-xs text-[#637187]">
            {error || 'Máy chủ backend không phản hồi hoặc đang khởi động lại. Vui lòng kiểm tra tiến trình FastAPI trên cổng 8000.'}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center space-x-2 px-4 py-2 bg-[#142B49] hover:bg-[#1E3A5F] text-white text-xs font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Thử lại kết nối</span>
          </button>
        )}
      </div>
    );
  }

  if (data.kpis.total_enrollments === 0) {
    return (
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-12 shadow-inst-card flex flex-col items-center justify-center space-y-3 text-center">
        <Info className="w-8 h-8 text-[#637187]" />
        <h3 className="text-sm font-bold text-[#142B49]">Kho Dữ Liệu chưa có dữ liệu kết quả học tập phù hợp</h3>
        <p className="text-xs text-[#637187] max-w-md">
          Không tìm thấy bản ghi nào khớp với tiêu chí lọc đã chọn. Hãy thử chọn học kỳ hoặc khoa đào tạo khác.
        </p>
      </div>
    );
  }

  const { department_metrics, grade_distribution, kpis } = data;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-4 shadow-inst-card">
          <span className="text-[11px] font-semibold text-[#637187] uppercase tracking-wider">Điểm TB toàn trường</span>
          <div className="text-2xl font-bold text-[#142B49] mt-1 tabular-nums">{kpis.avg_score_10.toFixed(2)} / 10</div>
          <p className="text-xs text-[#637187] mt-1 tabular-nums">GPA Tín chỉ: {kpis.credit_weighted_gpa_4.toFixed(2)} / 4.0</p>
        </div>
        <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-4 shadow-inst-card">
          <span className="text-[11px] font-semibold text-[#637187] uppercase tracking-wider">Tỷ lệ hoàn thành (Pass)</span>
          <div className="text-2xl font-bold text-[#18856B] mt-1 tabular-nums">{kpis.pass_rate_pct.toFixed(1)}%</div>
          <p className="text-xs text-[#637187] mt-1">Đạt chuẩn kết quả học phần</p>
        </div>
        <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-4 shadow-inst-card border-l-[3px] border-l-[#C43D4B]">
          <span className="text-[11px] font-semibold text-[#637187] uppercase tracking-wider">Tỷ lệ chưa đạt (Fail)</span>
          <div className="text-2xl font-bold text-[#C43D4B] mt-1 tabular-nums">{kpis.fail_rate_pct.toFixed(1)}%</div>
          <p className="text-xs text-[#637187] mt-1">Học phần chưa tích lũy tín chỉ</p>
        </div>
        <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-4 shadow-inst-card">
          <span className="text-[11px] font-semibold text-[#637187] uppercase tracking-wider">Tổng tín chỉ tích lũy</span>
          <div className="text-2xl font-bold text-[#315D91] mt-1 tabular-nums">{kpis.credits_earned_sum.toLocaleString()}</div>
          <p className="text-xs text-[#637187] mt-1 tabular-nums">Tỷ lệ hoàn thành: {kpis.credit_completion_pct.toFixed(1)}%</p>
        </div>
      </div>

      {/* Row 1: Department Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-[#315D91]" />
              <span>So sánh Kết quả Học tập theo Khoa Đào tạo</span>
            </h2>
            <span className="text-[11px] text-[#637187]">Thang điểm 10.0</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={department_metrics} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="department_name" stroke="#637187" fontSize={11} tickMargin={8} />
                <YAxis domain={[0, 10]} stroke="#637187" fontSize={11} tickMargin={4} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '6px',
                    color: '#1B2738',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(13, 31, 53, 0.08)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="avg_score_10" name="Điểm TB (Hệ 10)" fill="#315D91" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-[#18856B]" />
              <span>Tỷ trọng Bậc Điểm Chữ</span>
            </h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={grade_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="letter_grade"
                >
                  {grade_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} lượt`, `Điểm ${name}`]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '6px',
                    color: '#1B2738',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(13, 31, 53, 0.08)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-[#F1F5F9] text-[11px] text-center">
            {grade_distribution.slice(0, 6).map((g) => (
              <div key={g.letter_grade} className="bg-[#F8FAFC] p-1.5 rounded-[4px] border border-[#DFE5ED]">
                <span className="font-bold text-[#142B49]">{g.letter_grade}: </span>
                <span className="text-[#637187] tabular-nums">{g.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Department Summary Table */}
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
        <h2 className="text-sm font-bold text-[#142B49] mb-3 pb-2 border-b border-[#F1F5F9] flex items-center space-x-2">
          <GraduationCap className="w-4 h-4 text-[#315D91]" />
          <span>Bảng Tổng hợp Chỉ số Học tập theo Khoa Đào tạo</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#637187] uppercase font-semibold border-y border-[#DFE5ED]">
              <tr>
                <th className="py-2.5 px-3">Mã khoa</th>
                <th className="py-2.5 px-3">Tên khoa đào tạo</th>
                <th className="py-2.5 px-3 text-center">Sinh viên duy nhất</th>
                <th className="py-2.5 px-3 text-center">Lượt học</th>
                <th className="py-2.5 px-3 text-center">Điểm TB (10)</th>
                <th className="py-2.5 px-3 text-center">Tỷ lệ Đạt</th>
                <th className="py-2.5 px-3 text-center">Tỷ lệ Chưa đạt</th>
                <th className="py-2.5 px-3 text-center">Chuyên cần TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {department_metrics.map((dept) => (
                <tr key={dept.department_id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-3 font-bold text-[#142B49]">{dept.department_id}</td>
                  <td className="py-3 px-3 font-semibold text-[#1B2738]">{dept.department_name}</td>
                  <td className="py-3 px-3 text-center font-medium text-[#637187] tabular-nums">{dept.unique_students} SV</td>
                  <td className="py-3 px-3 text-center text-[#637187] tabular-nums">{dept.enrollments}</td>
                  <td className="py-3 px-3 text-center font-bold text-[#142B49] tabular-nums">{dept.avg_score_10.toFixed(2)}</td>
                  <td className="py-3 px-3 text-center font-semibold text-[#18856B] tabular-nums">{dept.pass_rate_pct.toFixed(1)}%</td>
                  <td className="py-3 px-3 text-center font-semibold text-[#C43D4B] tabular-nums">{dept.fail_rate_pct.toFixed(1)}%</td>
                  <td className="py-3 px-3 text-center font-medium text-[#637187] tabular-nums">{dept.avg_attendance_pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

