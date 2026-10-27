import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  UploadCloud,
  Layers,
  Network,
  Database,
  BookMarked,
  RefreshCw,
  School,
  UserCheck,
  CheckCircle2
} from 'lucide-react';

interface TopNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  atRiskCount?: number;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ activeTab, setActiveTab, atRiskCount }) => {
  const navSections = [
    {
      group: 'Phân tích Học vụ',
      items: [
        { id: 'overview', label: 'Tổng quan học vụ', icon: LayoutDashboard },
        { id: 'performance', label: 'Kết quả học tập', icon: GraduationCap },
        { id: 'courses', label: 'Học phần & Lớp', icon: BookOpen },
        { id: 'attendance', label: 'Chuyên cần', icon: CalendarCheck },
        { id: 'credits', label: 'Tiến độ tín chỉ', icon: TrendingUp },
        {
          id: 'early_warning',
          label: 'Cảnh báo sớm',
          icon: AlertTriangle,
          badge: atRiskCount && atRiskCount > 0 ? `${atRiskCount}` : undefined,
          isWarning: true,
        },
      ],
    },
    {
      group: 'Công cụ Dữ liệu',
      items: [
        { id: 'file_analysis', label: 'Phân tích tệp dữ liệu', icon: UploadCloud },
      ],
    },
    {
      group: 'Kho Dữ liệu & ETL',
      items: [
        { id: 'architecture', label: 'Kiến trúc DW', icon: Layers },
        { id: 'logical', label: 'Sơ đồ Logic', icon: Network },
        { id: 'physical', label: 'Sơ đồ Vật lý', icon: Database },
        { id: 'dictionary', label: 'Từ điển dữ liệu', icon: BookMarked },
        { id: 'etl', label: 'Quản trị ETL', icon: RefreshCw },
      ],
    },
  ];

  return (
    <header className="bg-white border-b border-[#DFE5ED] sticky top-0 z-40 shadow-inst-card">
      {/* 1. Institutional Brand Header */}
      <div className="bg-[#142B49] text-white px-5 sm:px-8 py-3 border-b border-[#0D1F35]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Institution Logo & System Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-[8px] bg-[#0D1F35] border border-[#315D91]/40 flex items-center justify-center text-white shrink-0 shadow-xs">
              <School className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#6E87A5] tracking-wider uppercase">
                Trường Đại Học Công Nghệ • Phòng Đào Tạo & ĐBCL
              </div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  EduPulse — Hệ Thống Phân Tích Dữ Liệu Học Vụ
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#0D1F35] text-[#94B3D4] border border-[#315D91]/30">
                  Kimball Star Schema
                </span>
              </div>
            </div>
          </div>

          {/* Institutional Status & Academic Term Metadata */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-[6px] bg-[#0D1F35]/70 border border-[#315D91]/30 text-[#CBD5E1]">
              <span className="text-[11px] font-medium text-slate-300">Học kỳ I • Năm học 2024–2025</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-[6px] bg-[#0F2D24] text-[#34D399] border border-[#18856B]/40 text-[11px] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Kho dữ liệu: Hoạt động</span>
            </div>

            <div className="flex items-center space-x-2 pl-3 border-l border-[#315D91]/40 text-slate-200">
              <div className="w-7 h-7 rounded-[6px] bg-[#0D1F35] border border-[#315D91]/40 flex items-center justify-center text-[#94B3D4]">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="hidden md:block text-left leading-tight">
                <span className="text-xs font-semibold block text-slate-100">Cán bộ QLĐT</span>
                <span className="text-[10px] text-[#6E87A5] block">Quyền Quản trị viên</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Structured Primary Navigation Tabs Bar */}
      <nav className="bg-[#FFFFFF] border-b border-[#DFE5ED] px-4 sm:px-8 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center space-x-6">
          {navSections.map((section, idx) => (
            <div key={section.group} className="flex items-center space-x-1 py-1">
              {idx > 0 && (
                <div className="h-4 w-px bg-[#DFE5ED] mx-2 shrink-0 hidden sm:block" />
              )}
              <span className="text-[10px] font-bold text-[#6E87A5] uppercase tracking-wider hidden xl:inline-block mr-1">
                {section.group}:
              </span>
              <div className="flex items-center space-x-1">
                {section.items.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors duration-150 ${
                        isActive
                          ? 'border-[#142B49] text-[#142B49] font-bold bg-[#F4F6F9]/80 rounded-t-[6px]'
                          : 'border-transparent text-[#637187] hover:text-[#1B2738] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#142B49]' : 'text-[#6E87A5]'}`} />
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ml-1 tabular-nums ${
                          tab.isWarning
                            ? 'bg-[#C43D4B] text-white'
                            : 'bg-[#142B49] text-white'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
};

