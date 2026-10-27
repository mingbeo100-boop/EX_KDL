import React, { useState, useEffect } from 'react';
import { CalendarCheck, TrendingUp, Info, AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import { api } from '../services/api';
import { FilterState } from '../types';

interface AttendancePageProps {
  filters: FilterState;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ filters }) => {
  const [data, setData] = useState<{
    brackets: Array<{ bracket: string; count: number; avg_score: number; pass_rate_pct: number }>;
    department_attendance: Array<{ department_name: string; avg_attendance_pct: number; avg_score_10: number }>;
    scatter_samples: Array<{ attendance_rate: number; total_score: number; letter_grade: string; course_code: string }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setIsLoading(true);
    setError(null);
    api.getAttendance(filters)
      .then((res) => setData(res))
      .catch((err) => {
        console.error(err);
        setError('Không thể kết nối đến máy chủ EduPulse Backend để tải dữ liệu chuyên cần.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  if (isLoading) {
    return (
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-16 shadow-inst-card flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#142B49] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[#637187]">Đang truy vấn phân tích chuyên cần học tập...</p>
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
          <h3 className="text-sm font-bold text-[#142B49]">Lỗi kết nối dữ liệu chuyên cần</h3>
          <p className="text-xs text-[#637187]">
            {error || 'Máy chủ backend không phản hồi hoặc đang gặp sự cố.'}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center space-x-2 px-4 py-2 bg-[#142B49] hover:bg-[#1E3A5F] text-white text-xs font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Thử lại kết nối</span>
        </button>
      </div>
    );
  }

  const { brackets, department_attendance, scatter_samples } = data;

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner */}
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-4 text-xs text-[#1B2738] shadow-inst-card flex items-start space-x-3">
        <Info className="w-4 h-4 text-[#315D91] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-[#142B49]">Nguyên lý phân tích chuyên cần:</span>
          <p className="text-[#637187] leading-relaxed">
            EduPulse đo lường mối tương quan thống kê giữa tần suất hiện diện lớp học và điểm tổng kết học phần.
            Dữ liệu thực nghiệm xác nhận mối liên hệ đồng biến rõ rệt giữa mức độ chuyên cần và tỷ lệ đạt môn học.
            Thông số này đóng vai trò chỉ báo sớm quan trọng giúp Cố vấn học tập (CVHT) chủ động nắm bắt và hỗ trợ kịp thời.
          </p>
        </div>
      </div>

      {/* 4 Attendance Brackets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {brackets.map((b) => (
          <div key={b.bracket} className="bg-white border border-[#DFE5ED] rounded-[8px] p-4 shadow-inst-card">
            <span className="text-[11px] font-semibold text-[#637187] uppercase tracking-wider">{b.bracket}</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-[#142B49] tabular-nums">{b.avg_score.toFixed(2)}/10</span>
              <span className="text-xs font-semibold text-[#18856B] tabular-nums">Đạt {b.pass_rate_pct.toFixed(1)}%</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#637187]">
              <span>Lượt học phần:</span>
              <span className="font-semibold text-[#142B49] tabular-nums">{b.count.toLocaleString()} lượt</span>
            </div>
          </div>
        ))}
      </div>

      {/* Attendance by Department */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
              <CalendarCheck className="w-4 h-4 text-[#315D91]" />
              <span>Tỷ lệ Chuyên cần Trung bình theo Khoa Đào tạo (%)</span>
            </h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={department_attendance} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="department_name" stroke="#637187" fontSize={11} tickMargin={8} />
                <YAxis domain={[0, 100]} stroke="#637187" fontSize={11} unit="%" tickMargin={4} />
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
                <Bar dataKey="avg_attendance_pct" name="Chuyên cần TB (%)" fill="#315D91" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scatter Samples */}
        <div className="lg:col-span-6 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#315D91]" />
              <span>Phân bố Mẫu Thực nghiệm: Chuyên cần vs Điểm Tổng kết</span>
            </h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" dataKey="attendance_rate" name="Chuyên cần" unit="%" domain={[40, 100]} stroke="#637187" fontSize={11} tickMargin={8} />
                <YAxis type="number" dataKey="total_score" name="Điểm" unit="đ" domain={[0, 10]} stroke="#637187" fontSize={11} tickMargin={4} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#CBD5E1',
                    borderRadius: '6px',
                    color: '#1B2738',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(13, 31, 53, 0.08)'
                  }}
                />
                <Scatter data={scatter_samples} fill="#315D91" opacity={0.55} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

