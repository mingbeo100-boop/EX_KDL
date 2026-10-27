import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Settings,
  X,
  ShieldCheck,
  Info
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  atRiskCount?: number;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface NavItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isWarning?: boolean;
  tag?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  atRiskCount,
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const [modalType, setModalType] = useState<'account' | 'help' | 'settings' | null>(null);

  const navigationGroups: NavGroup[] = [
    {
      group: 'Tổng quan học vụ',
      items: [
        {
          id: 'overview',
          label: 'Tổng quan học vụ',
          shortLabel: 'Tổng quan',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      group: 'Quản lý đào tạo',
      items: [
        {
          id: 'performance',
          label: 'Kết quả học tập',
          shortLabel: 'Kết quả',
          icon: GraduationCap,
        },
        {
          id: 'courses',
          label: 'Học phần & Lớp',
          shortLabel: 'Môn học',
          icon: BookOpen,
        },
        {
          id: 'attendance',
          label: 'Chuyên cần học vụ',
          shortLabel: 'Chuyên cần',
          icon: CalendarCheck,
        },
        {
          id: 'credits',
          label: 'Tiến độ tín chỉ',
          shortLabel: 'Tín chỉ',
          icon: TrendingUp,
        },
        {
          id: 'early_warning',
          label: 'Cảnh báo học tập',
          shortLabel: 'Cảnh báo',
          icon: AlertTriangle,
          badge: atRiskCount && atRiskCount > 0 ? `${atRiskCount}` : undefined,
          isWarning: true,
        },
      ],
    },
    {
      group: 'Phân tích & Kho dữ liệu',
      items: [
        {
          id: 'file_analysis',
          label: 'Phân tích tệp dữ liệu',
          shortLabel: 'Tệp dữ liệu',
          icon: UploadCloud,
          tag: 'Tool',
        },
        {
          id: 'architecture',
          label: 'Kiến trúc DW',
          shortLabel: 'Kiến trúc',
          icon: Layers,
        },
        {
          id: 'logical',
          label: 'Sơ đồ Logic (Star)',
          shortLabel: 'Logic DW',
          icon: Network,
        },
        {
          id: 'physical',
          label: 'Sơ đồ Vật lý & DDL',
          shortLabel: 'Vật lý & DDL',
          icon: Database,
        },
        {
          id: 'dictionary',
          label: 'Từ điển dữ liệu',
          shortLabel: 'Data Dict',
          icon: BookMarked,
        },
        {
          id: 'etl',
          label: 'Quản trị Pipeline ETL',
          shortLabel: 'ETL Pipeline',
          icon: RefreshCw,
        },
      ],
    },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-[#0D1F35]/60 z-40 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-[#DFE5ED] flex flex-col transition-all duration-200 ease-in-out shadow-sm select-none
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* 1. Brand Header */}
        <div className="h-16 px-4 border-b border-[#DFE5ED] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-[#142B49] text-white flex items-center justify-center shrink-0 shadow-xs border border-[#0D1F35]">
              <School className="w-5 h-5 text-slate-100" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <h1 className="text-base font-bold text-[#142B49] tracking-tight leading-none font-serif">
                    EduPulse
                  </h1>
                  <span className="text-[9px] font-bold bg-[#142B49]/10 text-[#142B49] px-1.5 py-0.5 rounded border border-[#142B49]/20">
                    DW
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[#637187] mt-1 truncate">
                  Institutional Intelligence
                </p>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md text-[#637187] hover:bg-[#F4F6F9] hover:text-[#142B49] lg:hidden"
            title="Đóng điều hướng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. User Profile Area (Under brand area as in Acadex reference) */}
        <div className={`p-3 border-b border-[#DFE5ED] bg-[#F8FAFC] transition-all shrink-0 ${isCollapsed ? 'text-center' : ''}`}>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#142B49] text-white flex items-center justify-center font-bold text-xs shrink-0 border-2 border-white shadow-xs">
              QL
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#142B49] truncate block">
                    Cán bộ Quản lý Đào tạo
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#18856B] shrink-0" title="Trực tuyến" />
                </div>
                <div className="text-[11px] text-[#637187] truncate">
                  Phòng QLĐT & ĐBCL
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Navigation Groups (Scrollable vertically) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
          {navigationGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#637187]">
                  {group.group}
                </div>
              )}
              {isCollapsed && (
                <div className="h-px bg-[#DFE5ED] my-2 mx-1" />
              )}
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center rounded-lg text-xs font-medium transition-all group relative ${
                        isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-[#142B49] text-white font-semibold shadow-xs'
                          : 'text-[#1B2738] hover:bg-[#F4F6F9] hover:text-[#142B49]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-white'
                              : 'text-[#637187] group-hover:text-[#142B49]'
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>

                      {/* Right Tag / Badge */}
                      {!isCollapsed && item.badge && (
                        <span
                          className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full tabular-nums ${
                            isActive
                              ? 'bg-white text-[#C43D4B]'
                              : 'bg-[#C43D4B] text-white shadow-xs'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {!isCollapsed && item.tag && (
                        <span
                          className={`ml-2 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wide ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-academic/10 text-academic border border-academic/20'
                          }`}
                        >
                          {item.tag}
                        </span>
                      )}

                      {/* Tooltip on Collapsed hover */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#142B49] text-white text-xs rounded-md shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-medium">
                          {item.label}
                          {item.badge && ` (${item.badge} ca)`}
                        </div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* 4. Footer Sidebar (Account, Help, Settings & Collapse Toggle) */}
        <div className="p-3 border-t border-[#DFE5ED] bg-white space-y-1 shrink-0">
          <button
            onClick={() => setModalType('account')}
            title={isCollapsed ? 'Hồ sơ cán bộ' : undefined}
            className={`w-full flex items-center rounded-lg text-xs font-medium text-[#637187] hover:bg-[#F4F6F9] hover:text-[#142B49] transition-colors ${
              isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Hồ sơ cán bộ</span>}
          </button>

          <button
            onClick={() => setModalType('help')}
            title={isCollapsed ? 'Trợ giúp & Hướng dẫn' : undefined}
            className={`w-full flex items-center rounded-lg text-xs font-medium text-[#637187] hover:bg-[#F4F6F9] hover:text-[#142B49] transition-colors ${
              isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'
            }`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Trợ giúp & Tài liệu</span>}
          </button>

          <button
            onClick={() => setModalType('settings')}
            title={isCollapsed ? 'Cài đặt hệ thống' : undefined}
            className={`w-full flex items-center rounded-lg text-xs font-medium text-[#637187] hover:bg-[#F4F6F9] hover:text-[#142B49] transition-colors ${
              isCollapsed ? 'justify-center p-2' : 'space-x-2.5 px-3 py-2'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Cài đặt hệ thống</span>}
          </button>

          {/* Desktop Collapse / Expand Toggle Button */}
          <div className="pt-2 border-t border-[#DFE5ED]">
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className={`w-full flex items-center rounded-lg text-xs font-semibold text-[#637187] hover:bg-[#F4F6F9] hover:text-[#142B49] transition-colors ${
                isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
              }`}
              title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              {!isCollapsed && <span>Thu gọn thanh bên</span>}
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-[#142B49]" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-[#637187]" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Auxiliary Dialog Modals for Account, Help & Settings */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D1F35]/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-[#DFE5ED] rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFE5ED]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#142B49] text-white flex items-center justify-center">
                  {modalType === 'account' && <UserCheck className="w-4 h-4" />}
                  {modalType === 'help' && <HelpCircle className="w-4 h-4" />}
                  {modalType === 'settings' && <Settings className="w-4 h-4" />}
                </div>
                <h3 className="text-sm font-bold text-[#142B49]">
                  {modalType === 'account' && 'Thông Tin Cán Bộ Đào Tạo'}
                  {modalType === 'help' && 'Trợ Giúp & Hướng Dẫn Sử Dụng'}
                  {modalType === 'settings' && 'Thông Số Hệ Thống Kho Dữ Liệu'}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-[#637187] hover:text-[#142B49] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalType === 'account' && (
              <div className="space-y-3 text-xs text-[#1B2738]">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DFE5ED] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#637187]">Họ và tên:</span>
                    <span className="font-bold text-[#142B49]">TS. Nguyễn Văn Quản</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#637187]">Chức danh:</span>
                    <span className="font-medium">Chuyên viên Quản lý Đào tạo & ĐBCL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#637187]">Đơn vị công tác:</span>
                    <span className="font-medium">Phòng Đào tạo - Trường Đại học Công nghệ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#637187]">Phân quyền truy cập:</span>
                    <span className="font-bold text-[#18856B]">Administrator (Full OLAP Access)</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#637187]">
                  Tài khoản có quyền giám sát toàn bộ báo cáo học vụ, thực thi chu trình ETL và trích xuất dữ liệu sinh viên.
                </p>
              </div>
            )}

            {modalType === 'help' && (
              <div className="space-y-3 text-xs text-[#1B2738]">
                <p className="leading-relaxed text-[#637187]">
                  Hệ thống <strong>EduPulse</strong> cung cấp công cụ phân tích học vụ toàn diện xây dựng trên mô hình Kho Dữ Liệu 
                  (Ralph Kimball Star Schema) chuẩn mực cho giáo dục đại học.
                </p>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DFE5ED] space-y-1.5 text-[11px]">
                  <div>• <strong>Bộ lọc:</strong> Chọn Học kỳ, Khoa, Ngành để tự động tính toán lại tất cả các KPI.</div>
                  <div>• <strong>Cảnh báo sớm:</strong> Nhận diện sinh viên có GPA &lt; 2.0 hoặc chuyên cần &lt; 70%.</div>
                  <div>• <strong>Phân tích tệp:</strong> Kéo thả file .csv/.xlsx để trích xuất thống kê tức thì.</div>
                  <div>• <strong>Kho Dữ Liệu:</strong> Kiểm tra DDL, sơ đồ ERD và quy trình ETL có lưu vết kiểm toán.</div>
                </div>
              </div>
            )}

            {modalType === 'settings' && (
              <div className="space-y-3 text-xs text-[#1B2738]">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DFE5ED] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#637187]">Kiến trúc Data Warehouse:</span>
                    <span className="font-mono font-bold text-[#142B49]">Kimball Star Schema</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#637187]">Fact Table Grain:</span>
                    <span className="font-mono text-academic">1 bản ghi / SV / MH / HK</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#637187]">Backend Engine:</span>
                    <span className="font-medium">FastAPI Python 3.12 (Port 8000)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#637187]">Frontend App:</span>
                    <span className="font-medium">React 18 + Vite + Tailwind CSS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#637187]">Cloudflare Tunnel:</span>
                    <span className="font-bold text-[#18856B]">Active (Trực tuyến)</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-1.5 bg-[#142B49] text-white rounded-lg text-xs font-semibold hover:bg-[#0D1F35] transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
