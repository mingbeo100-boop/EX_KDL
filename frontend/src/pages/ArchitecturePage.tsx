import React from 'react';
import { Layers, Database, ShieldCheck, Server, Terminal, MonitorCheck } from 'lucide-react';

export const ArchitecturePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-6 shadow-inst-card">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-[6px] bg-[#142B49] text-white flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5 text-blue-200" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#142B49]">Kiến trúc Tổng thể Kho Dữ Liệu EduPulse</h2>
            <p className="text-xs text-[#637187]">Mô hình Kimball Dimensional Data Warehouse với phân tách rõ rệt 5 tầng dữ liệu học vụ</p>
          </div>
        </div>

        <p className="text-xs text-[#1B2738] leading-relaxed max-w-4xl">
          EduPulse được thiết kế theo phương pháp luận mô hình hóa chiều Kimball (Dimensional Modeling).
          Hệ thống đảm bảo tính toàn vẹn dữ liệu từ lớp nguồn tác nghiệp (OLTP), đi qua vùng đệm Staging kiểm tra chất lượng (Data Cleansing & Validation),
          nạp vào Kho dữ liệu Star Schema với khóa thay thế (Surrogate Keys) và quản lý lịch sử SCD Type 2,
          cung cấp lớp API phân tích phục vụ trực tiếp cho Dashboard ra quyết định đào tạo.
        </p>
      </div>

      {/* Visual Layer Flow Diagram */}
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-6 shadow-inst-card">
        <div className="border-b border-[#F1F5F9] pb-3 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#637187]">
            Sơ đồ Luồng Dữ liệu Phân tầng (5-Tier Institutional Architecture)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {/* Tier 1: Source */}
          <div className="bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#E1E9F2] text-[#142B49]">TẦNG 1</span>
                <Server className="w-4 h-4 text-[#637187]" />
              </div>
              <h4 className="font-bold text-[#142B49] text-xs mb-1">Dữ liệu Nghiệp vụ (OLTP)</h4>
              <p className="text-[11px] text-[#637187]">Hệ thống quản lý đào tạo trường đại học:</p>
              <ul className="text-[11px] text-[#1B2738] space-y-1 mt-2 list-disc list-inside">
                <li>Bảng sinh viên, ngành</li>
                <li>Lớp học phần, môn học</li>
                <li>Điểm thành phần & thi</li>
                <li>Nhật ký điểm danh</li>
              </ul>
            </div>
            <div className="mt-4 pt-2 border-t border-[#DFE5ED] text-[10px] text-[#637187] font-mono">
              edupulse_oltp.db
            </div>
          </div>

          {/* Tier 2: Staging */}
          <div className="bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#E1E9F2] text-[#142B49]">TẦNG 2</span>
                <ShieldCheck className="w-4 h-4 text-[#315D91]" />
              </div>
              <h4 className="font-bold text-[#142B49] text-xs mb-1">Vùng đệm Staging</h4>
              <p className="text-[11px] text-[#637187]">Tiếp nhận và kiểm soát chất lượng:</p>
              <ul className="text-[11px] text-[#1B2738] space-y-1 mt-2 list-disc list-inside">
                <li>Kiểm tra kiểu & bắt buộc</li>
                <li>Phát hiện trùng lặp grain</li>
                <li>Xác thực khóa ngoại tham chiếu</li>
                <li>Ghi nhận bản ghi từ chối</li>
              </ul>
            </div>
            <div className="mt-4 pt-2 border-t border-[#DFE5ED] text-[10px] text-[#315D91] font-mono">
              etl/transform.py
            </div>
          </div>

          {/* Tier 3: ETL Engine */}
          <div className="bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#E1E9F2] text-[#142B49]">TẦNG 3</span>
                <Terminal className="w-4 h-4 text-[#315D91]" />
              </div>
              <h4 className="font-bold text-[#142B49] text-xs mb-1">Pipeline ETL Xử lý</h4>
              <p className="text-[11px] text-[#637187]">Chuyển đổi và nạp an toàn:</p>
              <ul className="text-[11px] text-[#1B2738] space-y-1 mt-2 list-disc list-inside">
                <li>Quy đổi GPA hệ 4 & điểm chữ</li>
                <li>Tính credits_earned, is_passed</li>
                <li>Xử lý SCD Type 2 cho DimStudent</li>
                <li>Bảo đảm Idempotent Upsert</li>
              </ul>
            </div>
            <div className="mt-4 pt-2 border-t border-[#DFE5ED] text-[10px] text-[#315D91] font-mono">
              etl/run_pipeline.py
            </div>
          </div>

          {/* Tier 4: Star Schema DW */}
          <div className="bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#E1E9F2] text-[#142B49]">TẦNG 4</span>
                <Database className="w-4 h-4 text-[#18856B]" />
              </div>
              <h4 className="font-bold text-[#142B49] text-xs mb-1">Kho Dữ Liệu Star Schema</h4>
              <p className="text-[11px] text-[#637187]">Lưu trữ tối ưu cho phân tích OLAP:</p>
              <ul className="text-[11px] text-[#1B2738] space-y-1 mt-2 list-disc list-inside">
                <li><b>FactStudentPerformance</b></li>
                <li><b>FactAttendanceAggregate</b></li>
                <li>DimStudent (SCD 2)</li>
                <li>DimCourse, DimSemester, DimDept</li>
              </ul>
            </div>
            <div className="mt-4 pt-2 border-t border-[#DFE5ED] text-[10px] text-[#18856B] font-mono">
              edupulse_dw.db
            </div>
          </div>

          {/* Tier 5: API & UI */}
          <div className="bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#E1E9F2] text-[#142B49]">TẦNG 5</span>
                <MonitorCheck className="w-4 h-4 text-[#315D91]" />
              </div>
              <h4 className="font-bold text-[#142B49] text-xs mb-1">Lớp API & Giao diện</h4>
              <p className="text-[11px] text-[#637187]">Phục vụ phân tích đa chiều:</p>
              <ul className="text-[11px] text-[#1B2738] space-y-1 mt-2 list-disc list-inside">
                <li>FastAPI Analytics Service</li>
                <li>Bộ lọc động đa chiều</li>
                <li>Dashboard KPIs & Biểu đồ</li>
                <li>Cảnh báo học tập sớm</li>
              </ul>
            </div>
            <div className="mt-4 pt-2 border-t border-[#DFE5ED] text-[10px] text-[#315D91] font-mono">
              React 18 + Vite + Recharts
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Principles Table */}
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-6 shadow-inst-card">
        <h3 className="text-sm font-bold text-[#142B49] mb-3 pb-2 border-b border-[#F1F5F9]">
          Các Nguyên tắc Thiết kế Cốt lõi của EduPulse
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-[#F8FAFC] rounded-[6px] border border-[#DFE5ED]">
            <span className="font-bold text-[#142B49] block mb-1">1. Phân biệt Rõ ràng Khóa Tự nhiên & Khóa Thay thế:</span>
            <p className="text-[#637187] leading-relaxed">
              Mọi bảng Dimension đều sử dụng Surrogate Key kiểu số nguyên tự tăng (Integer PK) làm khóa chính, cô lập kho dữ liệu khỏi những thay đổi định dạng từ hệ thống nguồn (ví dụ: student_id 'SV2022001' được ánh xạ sang student_key 104).
            </p>
          </div>
          <div className="p-3.5 bg-[#F8FAFC] rounded-[6px] border border-[#DFE5ED]">
            <span className="font-bold text-[#142B49] block mb-1">2. Quản lý Lịch sử Thuộc tính bằng SCD Type 2:</span>
            <p className="text-[#637187] leading-relaxed">
              DimStudent lưu trữ các trường valid_from, valid_to và is_current. Khi sinh viên chuyển ngành hoặc thay đổi trạng thái, phiên bản cũ được đóng lại và phiên bản mới được mở, đảm bảo kết quả môn học ở kỳ trước phản ánh đúng chuyên ngành tại thời điểm đó.
            </p>
          </div>
          <div className="p-3.5 bg-[#F8FAFC] rounded-[6px] border border-[#DFE5ED]">
            <span className="font-bold text-[#142B49] block mb-1">3. Tính Đúng đắn của Phép Tổng hợp (No Average-of-Averages):</span>
            <p className="text-[#637187] leading-relaxed">
              Tỷ lệ đạt, tỷ lệ trượt và GPA tích lũy luôn được tính từ tổng số lượt đăng ký hoặc tổng trọng số tín chỉ cấp bản ghi thô, tuyệt đối không cộng trung bình cộng các tỷ lệ phần trăm đã được làm tròn.
            </p>
          </div>
          <div className="p-3.5 bg-[#F8FAFC] rounded-[6px] border border-[#DFE5ED]">
            <span className="font-bold text-[#142B49] block mb-1">4. Tính Lặp an toàn của Quy trình ETL (Idempotency):</span>
            <p className="text-[#637187] leading-relaxed">
              Định danh hạt của Fact (student_key, course_key, semester_key) được bảo vệ bằng cơ chế Upsert (ON CONFLICT DO UPDATE). Chạy lại cùng một batch dữ liệu nguồn đảm bảo không làm nhân đôi số bản ghi hoặc lệch các chỉ số đo lường.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

