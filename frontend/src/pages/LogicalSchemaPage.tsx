import React, { useState } from 'react';
import { Network, Check, Copy } from 'lucide-react';

export const LogicalSchemaPage: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const mermaidCode = `erDiagram
    FACT_STUDENT_PERFORMANCE }o--|| DIM_STUDENT : "has student"
    FACT_STUDENT_PERFORMANCE }o--|| DIM_COURSE : "enrolled course"
    FACT_STUDENT_PERFORMANCE }o--|| DIM_SEMESTER : "in semester"
    FACT_STUDENT_PERFORMANCE }o--|| DIM_DEPARTMENT : "under department"
    FACT_STUDENT_PERFORMANCE }o--|| DIM_MAJOR : "in major"
    FACT_STUDENT_PERFORMANCE }o--|| DIM_DATE : "completed on"
    
    DIM_STUDENT }o--|| DIM_MAJOR : "belongs to"
    DIM_MAJOR }o--|| DIM_DEPARTMENT : "administered by"
    DIM_COURSE }o--|| DIM_DEPARTMENT : "offered by"

    FACT_STUDENT_PERFORMANCE {
        int performance_key PK
        int student_key FK
        int course_key FK
        int semester_key FK
        int major_key FK
        int department_key FK
        int date_key FK
        string section_id "Degenerate Dim"
        float attendance_rate "Measure"
        float midterm_score "Measure"
        float final_score "Measure"
        float total_score "Measure"
        float gpa_point_4 "Measure"
        string letter_grade
        int credits_attempted "Measure"
        int credits_earned "Measure"
        int is_passed "Measure"
        int is_retake
    }

    DIM_STUDENT {
        int student_key PK
        string student_id "Natural Key"
        string full_name
        string gender
        int birth_year
        int cohort_year
        string major_name
        string department_name
        string status
        timestamp valid_from "SCD Type 2"
        timestamp valid_to "SCD Type 2"
        int is_current "SCD Type 2"
    }

    DIM_COURSE {
        int course_key PK
        string course_code "Natural Key"
        string course_name
        int credits
        string department_name
        string course_level
        int is_core
    }

    DIM_SEMESTER {
        int semester_key PK
        string semester_id "Natural Key"
        string academic_year
        string term_name
        date start_date
        date end_date
        int chronological_order
    }

    DIM_DEPARTMENT {
        int department_key PK
        string department_id "Natural Key"
        string department_name
        string faculty_dean
    }

    DIM_MAJOR {
        int major_key PK
        string major_id "Natural Key"
        string major_name
        int required_credits
    }`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-6 shadow-inst-card">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-[6px] bg-[#142B49] text-white flex items-center justify-center shadow-xs">
            <Network className="w-5 h-5 text-blue-200" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#142B49]">Sơ đồ Logic Kho Dữ Liệu (Kimball Star Schema)</h2>
            <p className="text-xs text-[#637187]">Mô hình hóa chiều xung quanh Bảng Fact Trung tâm và các Bảng Chiều vệ tinh</p>
          </div>
        </div>

        <div className="p-4 bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px] text-xs text-[#1B2738] mt-4">
          <span className="font-bold text-[#142B49]">Định nghĩa Hạt dữ liệu (Fact Grain):</span>
          <p className="mt-1 text-[#637187] leading-relaxed">
            Grain của bảng Fact trung tâm <code>fact_student_performance</code> là: <b>Một bản ghi đại diện cho một lượt sinh viên đăng ký tham gia một lớp học phần tại một học kỳ cụ thể</b>.
            Khóa hạt bao gồm bộ ba <code>(student_key, course_key, semester_key)</code> đảm bảo tính duy nhất và không bị trùng lặp.
          </p>
        </div>
      </div>

      {/* Visual Star Schema Representation Cards */}
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-6 shadow-inst-card">
        <div className="border-b border-[#F1F5F9] pb-3 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#637187] text-center">
            Bố Cục Chiều & Bảng Fact Trung Tâm (Star Schema Architecture)
          </h3>
        </div>

        <div className="flex flex-col items-center space-y-6">
          {/* Top Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="p-4 bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px]">
              <span className="text-[10px] font-bold text-[#315D91] uppercase">Chiều Sinh viên (SCD 2)</span>
              <h4 className="font-bold text-[#142B49] text-xs mt-1">dim_student</h4>
              <p className="text-[11px] text-[#637187] mt-1">student_key (PK), student_id, full_name, cohort_year, is_current</p>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px]">
              <span className="text-[10px] font-bold text-[#315D91] uppercase">Chiều Môn học</span>
              <h4 className="font-bold text-[#142B49] text-xs mt-1">dim_course</h4>
              <p className="text-[11px] text-[#637187] mt-1">course_key (PK), course_code, course_name, credits, course_level</p>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px]">
              <span className="text-[10px] font-bold text-[#315D91] uppercase">Chiều Học kỳ</span>
              <h4 className="font-bold text-[#142B49] text-xs mt-1">dim_semester</h4>
              <p className="text-[11px] text-[#637187] mt-1">semester_key (PK), semester_id, academic_year, chronological_order</p>
            </div>
          </div>

          {/* Central Fact Card */}
          <div className="w-full max-w-2xl bg-[#142B49] text-white rounded-[8px] p-6 shadow-inst-card border border-[#0D1F35] text-center relative">
            <div className="inline-block px-3 py-1 rounded-[4px] bg-[#0D1F35] text-[#94B3D4] text-[10px] font-bold uppercase tracking-wider mb-2 border border-[#315D91]/40">
              Bảng Fact Trung tâm
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">fact_student_performance</h3>
            <p className="text-xs text-[#CBD5E1] mt-1 max-w-md mx-auto">
              Lưu trữ mọi kết quả học tập, điểm thành phần, điểm quy đổi hệ 4 và chuyên cần
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-[#315D91]/30 text-left text-xs">
              <div className="p-2.5 rounded-[4px] bg-[#0D1F35]/70 border border-[#315D91]/20">
                <span className="text-[10px] text-[#94B3D4] block font-mono">Measures Điểm</span>
                <span className="font-bold text-white text-[11px]">midterm, final, total</span>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#0D1F35]/70 border border-[#315D91]/20">
                <span className="text-[10px] text-[#94B3D4] block font-mono">Measures Hệ 4</span>
                <span className="font-bold text-white text-[11px]">gpa_point_4, letter_grade</span>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#0D1F35]/70 border border-[#315D91]/20">
                <span className="text-[10px] text-[#94B3D4] block font-mono">Measures Tín chỉ</span>
                <span className="font-bold text-white text-[11px]">attempted, earned</span>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#0D1F35]/70 border border-[#315D91]/20">
                <span className="text-[10px] text-[#94B3D4] block font-mono">Chỉ báo Chuyên cần</span>
                <span className="font-bold text-white text-[11px]">attendance_rate %</span>
              </div>
            </div>
          </div>

          {/* Bottom Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="p-4 bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px]">
              <span className="text-[10px] font-bold text-[#315D91] uppercase">Chiều Khoa</span>
              <h4 className="font-bold text-[#142B49] text-xs mt-1">dim_department</h4>
              <p className="text-[11px] text-[#637187] mt-1">department_key (PK), department_id, department_name, faculty_dean</p>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px]">
              <span className="text-[10px] font-bold text-[#315D91] uppercase">Chiều Chuyên ngành</span>
              <h4 className="font-bold text-[#142B49] text-xs mt-1">dim_major</h4>
              <p className="text-[11px] text-[#637187] mt-1">major_key (PK), major_id, major_name, required_credits</p>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#DFE5ED] rounded-[6px]">
              <span className="text-[10px] font-bold text-[#315D91] uppercase">Chiều Ngày tháng</span>
              <h4 className="font-bold text-[#142B49] text-xs mt-1">dim_date</h4>
              <p className="text-[11px] text-[#637187] mt-1">date_key (YYYYMMDD), date_actual, day, month, year, quarter</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mermaid Schema Code Block */}
      <div className="bg-white border border-[#DFE5ED] rounded-[8px] p-5 shadow-inst-card">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F1F5F9]">
          <span className="text-xs font-bold text-[#142B49] uppercase tracking-wider">
            Mã định nghĩa Sơ đồ Thực thể Quan hệ (Mermaid ERD)
          </span>
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[6px] bg-[#F4F6F9] hover:bg-[#E1E9F2] text-[#142B49] text-xs font-semibold transition-colors border border-[#DFE5ED]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#18856B]" /> : <Copy className="w-3.5 h-3.5 text-[#315D91]" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép Mermaid'}</span>
          </button>
        </div>
        <pre className="p-4 bg-[#0D1F35] text-[#CBD5E1] rounded-[6px] text-xs font-mono overflow-x-auto leading-relaxed border border-[#142B49]">
          {mermaidCode}
        </pre>
      </div>
    </div>
  );
};

