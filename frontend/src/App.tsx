import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { UtilityHeader } from './components/UtilityHeader';
import { FilterBar } from './components/FilterBar';
import { OverviewPage } from './pages/OverviewPage';
import { PerformancePage } from './pages/PerformancePage';
import { CoursesPage } from './pages/CoursesPage';
import { AttendancePage } from './pages/AttendancePage';
import { CreditProgress } from './pages/CreditProgress';
import { EarlyWarningPage } from './pages/EarlyWarningPage';
import { FileAnalysisPage } from './pages/FileAnalysisPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { LogicalSchemaPage } from './pages/LogicalSchemaPage';
import { PhysicalSchemaPage } from './pages/PhysicalSchemaPage';
import { DataDictionaryPage } from './pages/DataDictionaryPage';
import { ETLPipelinePage } from './pages/ETLPipelinePage';
import { api } from './services/api';
import { FilterOptions, FilterState, OverviewData } from './types';
import { ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';

export function App() {
  const getInitialTab = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || window.location.hash.replace('#/', '').replace('#', '');
      if (tab) return tab;
    } catch (e) {}
    return 'overview';
  };
  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  };

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || window.location.hash.replace('#/', '').replace('#', '');
      if (tab) setActiveTabState(tab);
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    semester_id: '',
    department_id: '',
    major_id: '',
    course_code: '',
    cohort_year: '',
  });

  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch filter options once
  useEffect(() => {
    api.getFilterOptions()
      .then((opts) => setFilterOptions(opts))
      .catch((err) => console.warn('Backend chưa phản hồi:', err));
  }, []);

  // Fetch overview data whenever filters change
  const fetchOverview = () => {
    setIsLoading(true);
    setError(null);
    api.getOverview(filters)
      .then((data) => setOverviewData(data))
      .catch((err) => {
        console.error(err);
        setError('Không thể kết nối đến máy chủ EduPulse Backend (cổng 8000). Vui lòng đảm bảo backend đang hoạt động.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchOverview();
  }, [filters]);

  const pageMeta: Record<string, { title: string; subtitle: string; category: string }> = {
    overview: {
      category: 'Tổng quan học vụ',
      title: 'Bảng Điều Khiển Tổng Quan Chỉ Số Đào Tạo',
      subtitle: 'Báo cáo chỉ số học tập toàn diện: Sinh viên duy nhất, GPA trọng số tín chỉ, Tỷ lệ Đạt/Trượt và Cảnh báo học tập',
    },
    performance: {
      category: 'Quản lý đào tạo',
      title: 'Phân Tích Kết Quả Học Tập & Điểm Thi',
      subtitle: 'Đánh giá điểm số theo thang 10 & thang 4, xếp loại điểm chữ (A+ đến F) và so sánh chất lượng giữa các khoa đào tạo',
    },
    courses: {
      category: 'Quản lý đào tạo',
      title: 'Hiệu Quả Giảng Dạy & Phân Tích Môn Học',
      subtitle: 'Tỷ lệ đạt/trượt từng học phần và thông số chi tiết theo từng lớp học phần (Class Sections)',
    },
    attendance: {
      category: 'Quản lý đào tạo',
      title: 'Tương Quan Chuyên Cần & Kết Quả Học Tập',
      subtitle: 'Mối liên hệ thực nghiệm giữa tỷ lệ tham gia lớp học và điểm tổng kết học phần',
    },
    credits: {
      category: 'Quản lý đào tạo',
      title: 'Tiến Độ Tích Lũy Tín Chỉ & Chuẩn Đầu Ra',
      subtitle: 'Đo lường tiến độ tích lũy tín chỉ theo từng khóa tuyển sinh và phát hiện nguy cơ chậm tốt nghiệp',
    },
    early_warning: {
      category: 'Quản lý đào tạo',
      title: 'Hệ Thống Cảnh Báo Học Tập & Can Thiệp Sớm',
      subtitle: 'Hệ thống quy tắc minh bạch hỗ trợ Cố vấn học tập (CVHT) can thiệp hỗ trợ sinh viên nguy cơ',
    },
    file_analysis: {
      category: 'Phân tích & Kho dữ liệu',
      title: 'Phân Tích & Kiểm Tra Chất Lượng Tệp Dữ Liệu',
      subtitle: 'Tải lên bảng điểm thi, sổ chuyên cần (.csv, .xlsx, .json) để trích xuất chỉ số thống kê và kiểm tra chất lượng',
    },
    architecture: {
      category: 'Phân tích & Kho dữ liệu',
      title: 'Kiến Trúc Tổng Thể Kho Dữ Liệu EduPulse',
      subtitle: 'Mô hình phân tầng: Nguồn OLTP tác nghiệp → Vùng đệm Staging → Pipeline ETL → Star Schema DW → Lớp API',
    },
    logical: {
      category: 'Phân tích & Kho dữ liệu',
      title: 'Sơ Đồ Logic Chiều (Kimball Star Schema)',
      subtitle: 'Bảng Fact trung tâm, các bảng Dimension vệ tinh và định nghĩa độ chi tiết hạt (Fact Grain)',
    },
    physical: {
      category: 'Phân tích & Kho dữ liệu',
      title: 'Sơ Đồ Vật Lý, Cấu Trúc Bảng & Mã DDL',
      subtitle: 'Cấu trúc bảng, kiểu dữ liệu, ràng buộc khóa chính/ngoại và chiến lược chỉ mục (Indexing Strategy)',
    },
    dictionary: {
      category: 'Phân tích & Kho dữ liệu',
      title: 'Từ Điển Dữ Liệu Học Vụ (Data Dictionary)',
      subtitle: 'Siêu dữ liệu chi tiết: kiểu dữ liệu, nullability, validation rules, đơn vị đo và giá trị mẫu thực tế',
    },
    etl: {
      category: 'Phân tích & Kho dữ liệu',
      title: 'Quản Trị Pipeline ETL & Giám Sát Chất Lượng',
      subtitle: 'Thực thi pipeline, xác thực tính lặp an toàn (Idempotency) và quản lý bản ghi bị từ chối',
    },
  };

  const current = pageMeta[activeTab] || {
    category: 'EduPulse',
    title: 'Hệ Thống Phân Tích Dữ Liệu Học Vụ',
    subtitle: 'Nền tảng Quản trị và Báo cáo Đào tạo Đại học',
  };

  const showFilterBar = ['overview', 'performance', 'courses', 'attendance', 'credits', 'early_warning'].includes(activeTab);

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col font-sans">
      {/* 1. Region A — Fixed Left Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        atRiskCount={overviewData?.kpis.at_risk_students_count}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* 2. Region B — Main Workspace (Right of sidebar, occupies remaining width) */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ease-in-out ${
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* 2.1 Utility Header (No module tabs, pure utility bar) */}
        <UtilityHeader
          onRefresh={fetchOverview}
          isLoading={isLoading}
          onToggleMobileMenu={() => setMobileOpen((prev) => !prev)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        />

        {/* 2.2 Workspace Content Area */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Page Header (Breadcrumbs, Title, Subtitle, Actions) */}
          <div className="bg-white border border-[#DFE5ED] rounded-xl p-5 shadow-inst-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-1.5 text-[11px] text-[#637187] font-medium mb-1">
                <span>Học viện</span>
                <ChevronRight className="w-3 h-3 text-[#94B3D4]" />
                <span className="text-[#315D91] font-semibold">{current.category}</span>
                <ChevronRight className="w-3 h-3 text-[#94B3D4]" />
                <span className="text-[#142B49] font-medium">{current.title}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#142B49] tracking-tight">{current.title}</h2>
              <p className="text-xs text-[#637187] mt-0.5">{current.subtitle}</p>
            </div>

            <button
              onClick={fetchOverview}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-[#142B49] bg-[#F4F6F9] border border-[#DFE5ED] rounded-lg hover:bg-slate-200 hover:border-[#CBD5E1] active:scale-95 transition-all shadow-xs disabled:opacity-50 shrink-0"
              title="Đồng bộ và làm mới dữ liệu từ Kho Dữ Liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#315D91] ${isLoading ? 'animate-spin' : ''}`} />
              <span>Đồng bộ DW</span>
            </button>
          </div>

          {error && (
            <div className="p-4 bg-[#FDF2F2] border border-[#F9D0D5] text-[#C43D4B] rounded-xl text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Academic Filters Section */}
          {showFilterBar && (
            <FilterBar
              options={filterOptions}
              filters={filters}
              setFilters={setFilters}
              disabled={isLoading}
            />
          )}

          {/* Active Module Content */}
          <div className="transition-all duration-150">
            {activeTab === 'overview' && (
              <OverviewPage
                data={overviewData}
                isLoading={isLoading}
                error={error}
                onRetry={fetchOverview}
              />
            )}
            {activeTab === 'performance' && (
              <PerformancePage
                data={overviewData}
                isLoading={isLoading}
                error={error}
                onRetry={fetchOverview}
              />
            )}
            {activeTab === 'courses' && <CoursesPage filters={filters} />}
            {activeTab === 'attendance' && <AttendancePage filters={filters} />}
            {activeTab === 'credits' && <CreditProgress filters={filters} />}
            {activeTab === 'early_warning' && <EarlyWarningPage filters={filters} />}
            {activeTab === 'file_analysis' && <FileAnalysisPage />}
            {activeTab === 'architecture' && <ArchitecturePage />}
            {activeTab === 'logical' && <LogicalSchemaPage />}
            {activeTab === 'physical' && <PhysicalSchemaPage />}
            {activeTab === 'dictionary' && <DataDictionaryPage />}
            {activeTab === 'etl' && <ETLPipelinePage />}
          </div>
        </main>

        {/* 2.3 Institutional Footer */}
        <footer className="bg-[#0D1F35] text-[#94B3D4] text-xs border-t border-[#142B49] py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <p className="font-semibold text-slate-100">
                TRƯỜNG ĐẠI HỌC CÔNG NGHỆ • PHÒNG ĐÀO TẠO & ĐẢM BẢO CHẤT LƯỢNG
              </p>
              <p className="text-[11px] text-[#6E87A5]">
                EduPulse Institutional Intelligence Platform • Kiến trúc Kho Dữ Liệu Kimball Star Schema • Phiên bản 1.0.0
              </p>
            </div>

            <div className="text-center sm:text-right text-[11px] space-y-1">
              <p className="text-slate-300">Cơ sở dữ liệu: SQLite 3 / PostgreSQL Data Warehouse</p>
              <p className="text-[#6E87A5]">Bảo lưu mọi quyền © 2024 - 2026</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
