import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, AlertTriangle, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';
import { FilterState } from '../types';

interface CreditProgressProps {
  filters: FilterState;
}

export const CreditProgress: React.FC<CreditProgressProps> = ({ filters }) => {
  const [data, setData] = useState<{
    cohort_metrics: Array<{ cohort_year: number; students_count: number; total_attempted: number; total_earned: number; avg_credits_per_student: number; completion_pct: number }>;
    major_metrics: Array<{ major_name: string; required_credits: number; students_count: number; avg_accumulated_credits: number; completion_pct: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setIsLoading(true);
    setError(null);
    api.getCredits(filters)
      .then((res) => setData(res))
      .catch((err) => {
        console.error(err);
        setError('Không thể kết nối đến máy chủ EduPulse Backend để tải tiến độ tín chỉ.');
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
        <p className="text-xs font-semibold text-[#637187]">Đang truy vấn phân tích tiến độ tích lũy tín chỉ...</p>
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
          <h3 className="text-sm font-bold text-[#142B49]">Lỗi kết nối tiến độ tín chỉ</h3>
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

  const { cohort_metrics, major_metrics } = data;

  return (
    <div className="space-y-6">
      {/* Cohort Progression Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cohort_metrics.map((c) => (
          <div key={c.cohort_year} className="bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#142B49] uppercase tracking-wider">Khóa tuyển sinh {c.cohort_year}</span>
              <span className="text-[11px] font-semibold bg-[#F4F6F9] text-[#637187] px-2 py-0.5 rounded-[4px] border border-[#DFE5ED] tabular-nums">
                {c.students_count} sinh viên
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#142B49] tabular-nums">
                {c.avg_credits_per_student} <span className="text-xs font-normal text-[#637187]">tín chỉ TB / SV</span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-2 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="bg-[#315D91] h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (c.avg_credits_per_student / 130) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#637187] mt-2">
                <span>Tỷ lệ hoàn thành: <b className="text-[#142B49] tabular-nums">{c.completion_pct}%</b></span>
                <span>Chuẩn đầu ra: 130 TC</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cohort Progress Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#315D91]" />
              <span>Tín chỉ Trung bình Tích lũy theo Khóa Tuyển sinh</span>
            </h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cohort_metrics} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="cohort_year" stroke="#637187" fontSize={11} tickMargin={8} tickFormatter={(v) => `Khóa ${v}`} />
                <YAxis domain={[0, 140]} stroke="#637187" fontSize={11} unit=" TC" tickMargin={4} />
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
                <Bar dataKey="avg_credits_per_student" name="Tín chỉ TB/SV" fill="#315D91" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Major Progress Table */}
        <div className="lg:col-span-6 bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <h2 className="text-sm font-bold text-[#142B49] flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#315D91]" />
              <span>Tiến độ Tích lũy theo Chuyên ngành Đào tạo</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#637187] uppercase font-semibold border-y border-[#DFE5ED]">
                <tr>
                  <th className="py-2.5 px-3">Chuyên ngành</th>
                  <th className="py-2.5 px-2 text-center">Yêu cầu</th>
                  <th className="py-2.5 px-2 text-center">Tích lũy TB</th>
                  <th className="py-2.5 px-3 text-right">Tỷ lệ hoàn thành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {major_metrics.map((m) => (
                  <tr key={m.major_name} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-3 font-medium text-[#1B2738]">{m.major_name}</td>
                    <td className="py-2.5 px-2 text-center text-[#637187] tabular-nums">{m.required_credits} TC</td>
                    <td className="py-2.5 px-2 text-center font-bold text-[#142B49] tabular-nums">{m.avg_accumulated_credits} TC</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#18856B] tabular-nums">{m.completion_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

