import React from 'react';
import { Menu, RefreshCw, CheckCircle2, School, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';

interface UtilityHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  onToggleMobileMenu: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const UtilityHeader: React.FC<UtilityHeaderProps> = ({
  onRefresh,
  isLoading,
  onToggleMobileMenu,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <header className="h-16 bg-white border-b border-[#DFE5ED] sticky top-0 z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs">
      {/* Left: Mobile hamburger, Collapse toggle & Institutional breadcrumb/tag */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg text-[#142B49] hover:bg-[#F4F6F9] border border-[#DFE5ED] lg:hidden transition-colors"
          title="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle Icon Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 rounded-lg text-[#637187] hover:text-[#142B49] hover:bg-[#F4F6F9] border border-[#DFE5ED] transition-colors"
          title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-[#142B49]" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-[#637187]" />
          )}
        </button>

        {/* Institutional Unit & Academic Term */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block">
            <div className="text-[10px] font-bold text-[#637187] uppercase tracking-wider">
              Trường Đại Học Công Nghệ • Phòng Đào Tạo & ĐBCL
            </div>
            <div className="text-xs font-semibold text-[#142B49]">
              Hệ Thống Phân Tích Dữ Liệu Học Vụ EduPulse
            </div>
          </div>
          <div className="sm:hidden text-xs font-bold text-[#142B49]">
            EduPulse DW
          </div>
        </div>
      </div>

      {/* Right: Academic Term, DW Status & Refresh Action */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 text-xs">
        {/* Semester Tag */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#F4F6F9] border border-[#DFE5ED] text-[#142B49] text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#315D91]" />
          <span>Học kỳ 1 • 2024–2025</span>
        </div>

        {/* DW Status Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#18856B]/10 text-[#18856B] border border-[#18856B]/20 text-[11px] font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Kho dữ liệu:</span>
          <span className="font-semibold">Trực tuyến</span>
        </div>

        {/* Sync / Refresh DW Action */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#142B49] bg-white border border-[#DFE5ED] rounded-lg hover:bg-[#F4F6F9] hover:border-[#CBD5E1] active:scale-95 transition-all shadow-xs disabled:opacity-50 shrink-0"
          title="Đồng bộ và làm mới dữ liệu từ Kho Dữ Liệu"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#315D91] ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Đồng bộ DW</span>
        </button>

        {/* User Avatar Mini */}
        <div className="w-8 h-8 rounded-full bg-[#142B49] text-white flex items-center justify-center font-bold text-xs border border-white shadow-xs shrink-0">
          QL
        </div>
      </div>
    </header>
  );
};
