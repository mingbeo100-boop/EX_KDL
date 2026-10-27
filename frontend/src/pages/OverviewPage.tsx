import React from 'react';
import {
  Users,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  BookOpen,
  Info
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { OverviewData } from '../types';
import { KPICard } from '../components/KPICard';

interface OverviewPageProps {
  data: OverviewData | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// Institutional Academic Palette for Letter Grades
const GRADE_COLORS: Record<string, string> = {
  'A+': '#18856B',
  'A': '#22A384',
  'B+': '#315D91',
  'B': '#507EBA',
  'C+': '#B7791F',
  'C': '#CFA04E',
  'D+': '#D97706',
  'D': '#E5933A',
  'F': '#C43D4B',
};

export const OverviewPage: React.FC<OverviewPageProps> = ({ data, isLoading, error, onRetry }) => {
  // 1. Loading State
  if (isLoading) {
    return (
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-16 shadow-inst-card flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#142B49] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[#637187]">
          Đang truy vấn và tổng hợp dữ liệu từ Kho Dữ Liệu Học Vụ (Kimball Star Schema)...
        </p>
      </div>
    );
  }

  // 2. Error / Connection Failure State
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

  // 3. Empty State (Connected successfully but no data recorded)
  if (data.kpis.total_enrollments === 0) {
    return (
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-12 shadow-inst-card flex flex-col items-center justify-center space-y-3 text-center">
        <Info className="w-8 h-8 text-[#637187]" />
        <h3 className="text-sm font-bold text-[#142B49]">Kho Dữ Liệu chưa có dữ liệu học vụ phù hợp</h3>
        <p className="text-xs text-[#637187] max-w-md">
          Không tìm thấy bản ghi nào khớp với tiêu chí lọc đã chọn. Hãy thử chọn học kỳ hoặc khoa đào tạo khác, hoặc kích hoạt tiến trình ETL để nạp dữ liệu.
        </p>
      </div>
    );
  }

  const { kpis, semester_trends, department_metrics, top_failure_courses, grade_distribution, attendance_correlation } = data;

  return (
    <div className="space-y-6">
      {/* 1. Six Core KPIs (Label -> Value -> Context -> Status) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          label="Tổng số sinh viên"
          value={kpis.unique_students.toLocaleString()}
          unit="SV"
          context="Dữ liệu ghi nhận từ 4 khóa tuyển sinh (K2021 - K2024)"
          statusText={`${kpis.total_enrollments.toLocaleString()} lượt đăng ký`}
          statusType="neutral"
          icon={Users}
        />
        <KPICard
          label="Điểm TB (Hệ 10)"
          value={kpis.avg_score_10.toFixed(2)}
          unit="/ 10.0"
          context="Điểm trung bình cộng toàn trường theo bộ lọc"
          statusText={kpis.avg_score_10 >= 7.0 ? 'Xếp loại: Khá trở lên' : 'Xếp loại: Trung bình'}
          statusType={kpis.avg_score_10 >= 7.0 ? 'positive' : 'warning'}
          icon={Award}
        />
        <KPICard
          label="GPA Tín chỉ (Hệ 4)"
          value={kpis.credit_weighted_gpa_4.toFixed(2)}
          unit="/ 4.0"
          context="Trọng số theo số tín chỉ quy đổi của môn học"
          statusText="Chuẩn đánh giá học lực đại học"
          statusType="neutral"
          icon={TrendingUp}
        />
        <KPICard
          label="Tỷ lệ hoàn thành môn"
          value={`${kpis.pass_rate_pct.toFixed(1)}%`}
          context="Tỷ lệ hoàn thành đạt điểm yêu cầu (Điểm ≥ 4.0)"
          statusText={`Tỷ lệ trượt: ${kpis.fail_rate_pct.toFixed(1)}%`}
          statusType={kpis.pass_rate_pct >= 85 ? 'positive' : 'warning'}
          icon={CheckCircle2}
        />
        <KPICard
          label="Chuyên cần trung bình"
          value={`${kpis.avg_attendance_pct.toFixed(1)}%`}
          context="Mức độ hiện diện buổi học theo thời khóa biểu"
          statusText="Chuẩn dự thi tối thiểu: 75%"
          statusType={kpis.avg_attendance_pct >= 80 ? 'positive' : 'warning'}
          icon={Clock}
        />
        <KPICard
          label="Cần can thiệp học tập"
          value={kpis.at_risk_students_count}
          unit="SV"
          context="Tiêu chí: GPA < 2.0 hoặc chuyên cần < 75%"
          statusText="Cần CVHT rà soát & hỗ trợ"
          statusType="critical"
          isCritical={kpis.at_risk_students_count > 0}
          icon={AlertTriangle}
        />
      </div>

      {/* 2. Analytical Charts: Semester Trends & Department Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Semester Trend Chart */}
        <div className="lg:col-span-7 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#315D91]" />
                <span>Xu hướng Điểm trung bình & Tỷ lệ Đạt qua các Học kỳ</span>
              </h2>
              <p className="text-xs text-[#637187] mt-0.5">
                Quan sát diễn biến chất lượng đào tạo theo trục thời gian học vụ
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#637187] bg-[#F4F6F9] px-2.5 py-1 rounded-[4px] border border-[#DFE5ED]">
              {semester_trends.length} học kỳ
            </span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={semester_trends} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="semester_id" stroke="#637187" fontSize={11} tickMargin={8} />
                <YAxis yAxisId="left" domain={[0, 10]} stroke="#315D91" fontSize={11} tickMargin={4} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#18856B" fontSize={11} unit="%" tickMargin={4} />
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
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avg_score_10"
                  name="Điểm TB (Hệ 10)"
                  stroke="#315D91"
                  strokeWidth={2.2}
                  dot={{ r: 3.5, fill: '#315D91' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pass_rate_pct"
                  name="Tỷ lệ đạt (%)"
                  stroke="#18856B"
                  strokeWidth={2.2}
                  dot={{ r: 3.5, fill: '#18856B' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Performance Comparison */}
        <div className="lg:col-span-5 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-[#315D91]" />
                <span>So sánh Kết quả giữa các Khoa Đào tạo</span>
              </h2>
              <p className="text-xs text-[#637187] mt-0.5">
                Điểm trung bình học tập tích lũy phân bổ theo từng đơn vị
              </p>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={department_metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="department_id" stroke="#637187" fontSize={11} tickMargin={8} />
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
      </div>

      {/* 3. Top Bottleneck Courses & Letter Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Failure Courses */}
        <div className="lg:col-span-6 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-[#C43D4B]" />
                <span>Học phần Cần Lưu Ý về Tỷ lệ Trượt Môn</span>
              </h2>
              <p className="text-xs text-[#637187] mt-0.5">
                Xác định các học phần trọng điểm có nguy cơ làm chậm tiến độ tốt nghiệp
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#637187] uppercase font-semibold border-y border-[#DFE5ED]">
                <tr>
                  <th className="py-2.5 px-3">Mã HP</th>
                  <th className="py-2.5 px-3">Tên học phần</th>
                  <th className="py-2.5 px-2 text-center">Đăng ký</th>
                  <th className="py-2.5 px-2 text-center">Chưa đạt</th>
                  <th className="py-2.5 px-3 text-right">Tỷ lệ chưa đạt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {top_failure_courses.map((c) => (
                  <tr key={c.course_code} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[#142B49]">{c.course_code}</td>
                    <td className="py-2.5 px-3 font-medium text-[#1B2738] truncate max-w-[180px]">{c.course_name}</td>
                    <td className="py-2.5 px-2 text-center text-[#637187] tabular-nums">{c.total_enrollments}</td>
                    <td className="py-2.5 px-2 text-center font-semibold text-[#C43D4B] tabular-nums">{c.failed_count}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#C43D4B] tabular-nums">
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#FDF2F2] border border-[#F9D0D5]">
                        {c.fail_rate_pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="lg:col-span-6 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-[#315D91]" />
                <span>Phân phối Bậc Điểm Chữ (A+ đến F)</span>
              </h2>
              <p className="text-xs text-[#637187] mt-0.5">
                Tỷ lệ % các bậc điểm tích lũy học phần theo quy chế đào tạo tín chỉ
              </p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grade_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="letter_grade" stroke="#637187" fontSize={11} tickMargin={8} />
                <YAxis stroke="#637187" fontSize={11} unit="%" tickMargin={4} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Tỷ lệ']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '6px',
                    color: '#1B2738',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(13, 31, 53, 0.08)'
                  }}
                />
                <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                  {grade_distribution.map((entry) => (
                    <Cell key={entry.letter_grade} fill={GRADE_COLORS[entry.letter_grade] || '#315D91'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Institutional Empirical Study Panel: Attendance & Academic Outcome */}
      <div className="bg-[#142B49] text-white rounded-[8px] p-6 shadow-inst-card border border-[#0D1F35]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-[4px] bg-[#0D1F35] text-[#94B3D4] border border-[#315D91]/30">
                <Info className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm tracking-wide text-white">
                Báo cáo Thực nghiệm: Mối liên hệ giữa Tỷ lệ Chuyên cần & Kết quả Điểm số
              </h3>
            </div>
            <p className="text-xs text-[#CBD5E1] max-w-3xl leading-relaxed">
              Kho dữ liệu EduPulse phân tách và đo lường sự tương quan thực nghiệm giữa mức độ hiện diện lớp học và điểm tổng kết môn học.
              (Lưu ý: Đo lường mối liên hệ quan sát được trong dữ liệu đào tạo, phục vụ công tác định hướng và tư vấn học vụ).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {attendance_correlation.map((bin) => (
            <div
              key={bin.bracket}
              className="bg-[#0D1F35]/70 rounded-[6px] p-3.5 border border-[#315D91]/30 space-y-2"
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#94B3D4]">
                <span>Khoảng chuyên cần</span>
                <span className="text-white font-bold">{bin.bracket}</span>
              </div>
              <div className="flex items-baseline justify-between pt-1 border-t border-[#315D91]/20">
                <span className="text-lg font-bold text-white tabular-nums">{bin.avg_score_10.toFixed(2)}/10</span>
                <span className="text-xs font-semibold text-[#34D399] tabular-nums">Đạt {bin.pass_rate_pct.toFixed(1)}%</span>
              </div>
              <p className="text-[10px] text-[#6E87A5] tabular-nums">
                {bin.enrollment_count.toLocaleString()} lượt đăng ký ghi nhận
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

