import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  Search,
  BarChart2,
  PieChart as PieIcon,
  FileText,
  Database,
  CheckCircle2,
  ClipboardPaste,
  ArrowRight,
  Info,
  Sliders,
  RefreshCw,
  Layers,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Hash,
  Type,
  Table,
  Sparkles,
  Filter,
  X,
  FileCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { FileAnalysisResult, FileAnalysisColumn } from '../types';

const GRADE_COLORS = ['#C43D4B', '#D97706', '#B7791F', '#315D91', '#18856B'];
const PALETTE_COLORS = ['#315D91', '#18856B', '#D97706', '#7C3AED', '#C43D4B', '#0284C7', '#059669', '#D946EF'];

type TabType = 'columns' | 'academic' | 'preview' | 'dictionary';

export const FileAnalysisPage: React.FC = () => {
  const [result, setResult] = useState<FileAnalysisResult | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentSampleName, setCurrentSampleName] = useState<string>('');
  const [currentSheet, setCurrentSheet] = useState<string>('');
  const [sampleFiles, setSampleFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('columns');
  const [selectedColumnName, setSelectedColumnName] = useState<string>('');

  // Manual column mapping state
  const [manualMapping, setManualMapping] = useState<Record<string, string>>({
    student_id: '',
    full_name: '',
    score: '',
    attendance: '',
    major: '',
    course_code: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync manualMapping and default column when result changes
  const updateMappingFromResult = (data: FileAnalysisResult) => {
    setResult(data);
    setCurrentSheet(data.active_sheet || '');
    const newMapping = {
      student_id: data.detected_columns?.student_id || '',
      full_name: data.detected_columns?.full_name || '',
      score: data.detected_columns?.score || '',
      attendance: data.detected_columns?.attendance || '',
      major: data.detected_columns?.major || '',
      course_code: data.detected_columns?.course_code || '',
    };
    setManualMapping(newMapping);

    // Default selected column for exploratory visualization
    if (data.columns && data.columns.length > 0) {
      const firstNumeric = data.columns.find((c) => c.is_numeric);
      const chosenCol = firstNumeric ? firstNumeric.column_name : data.columns[0].column_name;
      setSelectedColumnName(chosenCol);
    }

    // Default tab: if academic with score stats -> columns or academic, else columns
    if (data.dataset_category === 'academic' && data.has_score_column) {
      setActiveTab('columns');
    } else {
      setActiveTab('columns');
    }
  };

  // Load sample file list on mount
  useEffect(() => {
    api.getSampleFiles()
      .then((files) => {
        setSampleFiles(files);
        if (files.length > 0 && !result && !currentFile) {
          handleLoadSample(files[0]);
        }
      })
      .catch((err) => console.warn(err));
  }, []);

  // Handle Clipboard Paste (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // 1. If clipboard contains file(s)
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        uploadSelectedFile(file);
        return;
      }

      // 2. If clipboard contains tabular text (e.g. copied rows from Excel/Sheets)
      const text = e.clipboardData?.getData('text');
      if (text && text.trim().length > 10 && (text.includes('\t') || text.includes(',') || text.includes(';'))) {
        let csvContent = text;
        if (text.includes('\t') && !text.includes(',')) {
          csvContent = text
            .split('\n')
            .map((line) =>
              line
                .split('\t')
                .map((cell) => `"${cell.replace(/"/g, '""')}"`)
                .join(',')
            )
            .join('\n');
        }
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const pastedFile = new File([blob], 'clipboard_data.csv', { type: 'text/csv' });
        uploadSelectedFile(pastedFile);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const uploadSelectedFile = async (file: File, sheetName?: string, mappingOverride?: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    setImportMessage(null);
    setCurrentFile(file);
    setCurrentSampleName('');

    try {
      const data = await api.uploadFile(file, sheetName, mappingOverride);
      updateMappingFromResult(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải hoặc phân tích tệp dữ liệu');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadSelectedFile(file);
    }
  };

  const handleLoadSample = async (fileName: string, sheetName?: string, mappingOverride?: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    setImportMessage(null);
    setCurrentFile(null);
    setCurrentSampleName(fileName);

    try {
      const data = await api.loadSampleFile(fileName, sheetName, mappingOverride);
      updateMappingFromResult(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi nạp tệp mẫu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyMapping = () => {
    if (currentFile) {
      uploadSelectedFile(currentFile, currentSheet, manualMapping);
    } else if (currentSampleName) {
      handleLoadSample(currentSampleName, currentSheet, manualMapping);
    }
  };

  const handleResetMapping = () => {
    if (currentFile) {
      uploadSelectedFile(currentFile, currentSheet, {});
    } else if (currentSampleName) {
      handleLoadSample(currentSampleName, currentSheet, {});
    }
  };

  const handleSheetChange = (newSheet: string) => {
    setCurrentSheet(newSheet);
    if (currentFile) {
      uploadSelectedFile(currentFile, newSheet, manualMapping);
    } else if (currentSampleName) {
      handleLoadSample(currentSampleName, newSheet, manualMapping);
    }
  };

  const handleImportToDW = async () => {
    if (!result?.detected_columns?.student_id) {
      setError('Không thể nạp vào Kho Dữ Liệu vì chưa xác định được cột Mã Sinh Viên. Vui lòng mở bảng "Ánh xạ cột thủ công" bên dưới để chọn đúng cột.');
      setIsMappingOpen(true);
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportMessage(null);

    try {
      const res = await api.importToDW(currentFile, currentSampleName, currentSheet, manualMapping);
      setImportMessage(
        res.message ||
          `Đã nạp thành công ${res.imported_count} bản ghi vào Kho Dữ Liệu! Toàn bộ bảng điều khiển học vụ đã cập nhật.`
      );
    } catch (err: any) {
      setError(err.message || 'Lỗi khi nạp dữ liệu vào Kho Dữ Liệu');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredPreview =
    result?.preview_rows.filter((row) => {
      if (!searchTerm) return true;
      return Object.values(row).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }) || [];

  // Currently selected column for EDA
  const selectedCol: FileAnalysisColumn | undefined = result?.columns.find(
    (c) => c.column_name === selectedColumnName
  ) || result?.columns[0];

  const isAcademicDataset = result?.dataset_category === 'academic' || !!(result?.detected_columns?.student_id && result?.has_score_column);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white border border-[#DFE5ED] rounded-xl p-6 shadow-inst-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#142B49] text-white flex items-center justify-center shrink-0 shadow-xs">
            <UploadCloud className="w-5 h-5 text-slate-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#315D91] bg-[#315D91]/10 px-2 py-0.5 rounded">
                Công Cụ Phân Tích & Khám Phá Dữ Liệu
              </span>
              <span className="text-xs text-[#637187]">• Universal File Ingestion & Exploratory Analysis</span>
            </div>
            <h2 className="text-base font-bold text-[#142B49] mt-1">
              Phân Tích Bất Kỳ Tệp Dữ Liệu Nào (Excel, CSV, TSV, JSON, TXT)
            </h2>
            <p className="text-xs text-[#637187] mt-0.5 max-w-3xl leading-relaxed">
              Bạn có thể tải lên <b>mọi tệp dữ liệu bất kỳ</b> (báo cáo doanh thu, tồn kho, khảo sát, nhân sự hoặc bảng điểm học vụ). 
              Hệ thống tự động phát hiện dấu phân cách (dấu phẩy, chấm phẩy, tab, pipe), tự động phân tích phân bố của từng cột số và cột phân loại, 
              đồng thời hỗ trợ ánh xạ để đồng bộ vào Kho Dữ Liệu Kimball Star Schema.
            </p>
          </div>
        </div>

        {/* Action Buttons: Upload New File & Sample files */}
        <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold bg-[#142B49] hover:bg-[#0D1F35] text-white rounded-lg shadow-xs transition-all active:scale-95"
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>Tải tệp từ máy tính</span>
          </button>

          {sampleFiles.length > 0 && (
            <div className="flex items-center space-x-1">
              {sampleFiles.map((sf) => (
                <button
                  key={sf}
                  onClick={() => handleLoadSample(sf)}
                  disabled={isLoading}
                  className={`px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    currentSampleName === sf && !currentFile
                      ? 'bg-slate-200 text-[#142B49] border-slate-400 font-bold'
                      : 'bg-[#F4F6F9] text-[#637187] border-[#DFE5ED] hover:bg-slate-200 hover:text-[#142B49]'
                  }`}
                  title={`Nạp tệp ví dụ: ${sf}`}
                >
                  Mẫu: {sf.length > 18 ? sf.substring(0, 15) + '...' : sf}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Drag & Drop & Paste Upload Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) {
            uploadSelectedFile(file);
          }
        }}
        className={`bg-white border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          isDragging
            ? 'border-[#315D91] bg-[#315D91]/5 ring-4 ring-[#315D91]/10'
            : 'border-[#CBD5E1] hover:border-[#315D91]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".csv,.xlsx,.xls,.xlsm,.json,.txt,.tsv"
          className="hidden"
          id="universal-file-upload"
        />
        <label
          htmlFor="universal-file-upload"
          className="cursor-pointer flex flex-col items-center justify-center space-y-2"
        >
          <div className="w-12 h-12 rounded-xl bg-[#F0F4F9] text-[#315D91] flex items-center justify-center border border-[#DFE5ED] shadow-xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-[#142B49]">
            Kéo thả tệp dữ liệu vào đây, nhấp để chọn tệp từ máy tính, hoặc nhấn <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono text-slate-800">Ctrl + V</kbd> để dán bảng tính
          </div>
          <p className="text-xs text-[#637187] max-w-lg leading-relaxed">
            Hỗ trợ <b>Excel (.xlsx, .xls)</b>, <b>CSV/TSV (.csv, .tsv)</b>, <b>JSON</b> hoặc <b>TXT</b> (tự động phát hiện dấu phẩy, chấm phẩy, tab). 
            Không giới hạn tên cột hay cấu trúc mẫu!
          </p>
          <div className="flex items-center space-x-2 pt-1 text-[11px] text-[#315D91] font-semibold">
            <ClipboardPaste className="w-4 h-4" />
            <span>Mẹo: Bạn có thể sao chép trực tiếp bất kỳ vùng dữ liệu nào từ Excel/Google Sheets rồi nhấn Ctrl+V vào trang này.</span>
          </div>
        </label>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-[#FDF2F2] border border-[#F9D0D5] text-[#C43D4B] text-xs font-semibold rounded-xl flex items-start space-x-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-[#C43D4B] shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{error}</span>
          </div>
        </div>
      )}

      {importMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importMessage}</span>
        </div>
      )}

      {isLoading && (
        <div className="py-16 text-center space-y-3 bg-white border border-[#DFE5ED] rounded-xl">
          <div className="w-8 h-8 border-3 border-[#142B49] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#637187] font-medium">Đang tự động nhận diện cấu trúc tệp, mã hóa và trích xuất chỉ số thống kê từng cột...</p>
        </div>
      )}

      {/* 3. Main Analysis Workspace */}
      {!isLoading && result && (
        <div className="space-y-6">
          {/* File Overview Summary Bar */}
          <div className="bg-[#142B49] text-white rounded-xl p-5 shadow-inst-card flex flex-wrap items-center justify-between gap-4 border border-[#0D1F35]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94B3D4] block">
                  Tệp Đang Phân Tích
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isAcademicDataset
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {isAcademicDataset ? '🎓 Dữ Liệu Học Vụ' : '📊 Dữ Liệu Bảng Tổng Quát'}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <FileText className="w-4 h-4 text-[#CBD5E1]" />
                <h3 className="text-sm font-bold text-white font-mono">{result.file_name}</h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs">
              <div>
                <span className="text-[#94B3D4] block text-[10px]">Tổng số dòng</span>
                <span className="font-bold text-white text-sm tabular-nums">{result.total_rows.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#94B3D4] block text-[10px]">Số lượng cột</span>
                <span className="font-bold text-white text-sm tabular-nums">{result.total_columns} cột</span>
              </div>
              <div>
                <span className="text-[#94B3D4] block text-[10px]">Cột định lượng (Số)</span>
                <span className="font-bold text-emerald-400 text-sm tabular-nums">
                  {result.numeric_columns_count ?? result.columns.filter((c) => c.is_numeric).length}
                </span>
              </div>
              <div>
                <span className="text-[#94B3D4] block text-[10px]">Cột danh mục (Chuỗi)</span>
                <span className="font-bold text-blue-300 text-sm tabular-nums">
                  {result.categorical_columns_count ?? result.columns.filter((c) => !c.is_numeric).length}
                </span>
              </div>
              <div>
                <span className="text-[#94B3D4] block text-[10px]">Ô trống (Missing)</span>
                <span className={`font-bold text-sm tabular-nums ${
                  (result.missing_cells_pct || 0) > 0 ? 'text-amber-300' : 'text-emerald-400'
                }`}>
                  {result.missing_cells_pct !== undefined ? `${result.missing_cells_pct}%` : '0%'}
                </span>
              </div>
              <button
                onClick={() => setIsMappingOpen((prev) => !prev)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-600 transition-all active:scale-95"
              >
                <Sliders className="w-3.5 h-3.5 text-[#94B3D4]" />
                <span>Ánh xạ cột {isMappingOpen ? '▲' : '▼'}</span>
              </button>
            </div>
          </div>

          {/* Excel Workbook Multi-Sheet Selector */}
          {result.sheet_names && result.sheet_names.length > 1 && (
            <div className="bg-white border border-[#DFE5ED] rounded-xl p-4 shadow-inst-card flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#142B49]">
                <Layers className="w-4 h-4 text-[#315D91]" />
                <span>Trang tính (Sheets):</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {result.sheet_names.map((sheet) => (
                  <button
                    key={sheet}
                    onClick={() => handleSheetChange(sheet)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                      (currentSheet || result.active_sheet) === sheet
                        ? 'bg-[#315D91] text-white border-[#315D91]'
                        : 'bg-[#F4F6F9] text-[#142B49] border-[#DFE5ED] hover:bg-slate-200'
                    }`}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Manual Column Mapping Collapsible Panel */}
          {isMappingOpen && (
            <div className="bg-white border border-[#315D91]/30 rounded-xl p-5 shadow-inst-card space-y-4 ring-2 ring-[#315D91]/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#F1F5F9] gap-2">
                <div>
                  <h3 className="text-xs font-bold text-[#142B49] uppercase tracking-wider flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-[#315D91]" />
                    <span>Cấu Hình Ánh Xạ Cột Thủ Công (Manual Column Mapping)</span>
                  </h3>
                  <p className="text-[11px] text-[#637187] mt-0.5">
                    Nếu tệp này là dữ liệu sinh viên/học vụ nhưng dùng tên cột tùy chỉnh (ví dụ "Ma_Hoc_Vien", "Diem_Thi", "Ty_Le"), hãy ánh xạ sang các trường hệ thống để kích hoạt đầy đủ biểu đồ học vụ và nạp vào Kho Dữ Liệu:
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleResetMapping}
                    className="px-3 py-1.5 text-xs font-semibold text-[#637187] bg-[#F4F6F9] hover:bg-slate-200 rounded-lg border border-[#DFE5ED] transition-all"
                  >
                    Khôi phục tự động
                  </button>
                  <button
                    onClick={handleApplyMapping}
                    className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#315D91] hover:bg-[#254770] rounded-lg shadow-xs transition-all active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Áp dụng & Phân tích lại</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Student ID */}
                <div className="space-y-1.5 p-3 rounded-lg bg-[#F8FAFC] border border-[#DFE5ED]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#142B49] flex items-center space-x-1.5">
                      <span>Mã Sinh Viên / Mã Định Danh</span>
                    </label>
                    {manualMapping.student_id ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.5 rounded">Đã gán</span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-200 font-medium px-1.5 py-0.5 rounded">Tùy chọn</span>
                    )}
                  </div>
                  <select
                    value={manualMapping.student_id || ''}
                    onChange={(e) => setManualMapping({ ...manualMapping, student_id: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-[#CBD5E1] rounded-lg text-[#142B49] focus:outline-none focus:border-[#315D91]"
                  >
                    <option value="">-- Không ánh xạ --</option>
                    {result.columns.map((col) => (
                      <option key={col.column_name} value={col.column_name}>
                        {col.column_name} (vd: {col.sample || 'trống'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Full Name */}
                <div className="space-y-1.5 p-3 rounded-lg bg-[#F8FAFC] border border-[#DFE5ED]">
                  <label className="text-xs font-bold text-[#142B49] block">
                    Họ và Tên / Tên Đối Tượng
                  </label>
                  <select
                    value={manualMapping.full_name || ''}
                    onChange={(e) => setManualMapping({ ...manualMapping, full_name: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-[#CBD5E1] rounded-lg text-[#142B49] focus:outline-none focus:border-[#315D91]"
                  >
                    <option value="">-- Không ánh xạ --</option>
                    {result.columns.map((col) => (
                      <option key={col.column_name} value={col.column_name}>
                        {col.column_name} (vd: {col.sample || 'trống'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Score */}
                <div className="space-y-1.5 p-3 rounded-lg bg-[#F8FAFC] border border-[#DFE5ED]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#142B49]">
                      Điểm Số (Thang 0 - 10)
                    </label>
                    {manualMapping.score ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.5 rounded">Đã gán</span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-200 font-medium px-1.5 py-0.5 rounded">Tùy chọn</span>
                    )}
                  </div>
                  <select
                    value={manualMapping.score || ''}
                    onChange={(e) => setManualMapping({ ...manualMapping, score: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-[#CBD5E1] rounded-lg text-[#142B49] focus:outline-none focus:border-[#315D91]"
                  >
                    <option value="">-- Không ánh xạ --</option>
                    {result.columns.map((col) => (
                      <option key={col.column_name} value={col.column_name}>
                        {col.column_name} (vd: {col.sample || 'trống'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Attendance */}
                <div className="space-y-1.5 p-3 rounded-lg bg-[#F8FAFC] border border-[#DFE5ED]">
                  <label className="text-xs font-bold text-[#142B49] block">
                    Tỷ Lệ Chuyên Cần (%)
                  </label>
                  <select
                    value={manualMapping.attendance || ''}
                    onChange={(e) => setManualMapping({ ...manualMapping, attendance: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-[#CBD5E1] rounded-lg text-[#142B49] focus:outline-none focus:border-[#315D91]"
                  >
                    <option value="">-- Không ánh xạ --</option>
                    {result.columns.map((col) => (
                      <option key={col.column_name} value={col.column_name}>
                        {col.column_name} (vd: {col.sample || 'trống'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Major */}
                <div className="space-y-1.5 p-3 rounded-lg bg-[#F8FAFC] border border-[#DFE5ED]">
                  <label className="text-xs font-bold text-[#142B49] block">
                    Chuyên Ngành / Phân Loại
                  </label>
                  <select
                    value={manualMapping.major || ''}
                    onChange={(e) => setManualMapping({ ...manualMapping, major: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-[#CBD5E1] rounded-lg text-[#142B49] focus:outline-none focus:border-[#315D91]"
                  >
                    <option value="">-- Không ánh xạ --</option>
                    {result.columns.map((col) => (
                      <option key={col.column_name} value={col.column_name}>
                        {col.column_name} (vd: {col.sample || 'trống'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Course Code */}
                <div className="space-y-1.5 p-3 rounded-lg bg-[#F8FAFC] border border-[#DFE5ED]">
                  <label className="text-xs font-bold text-[#142B49] block">
                    Mã Học Phần / Mã Danh Mục
                  </label>
                  <select
                    value={manualMapping.course_code || ''}
                    onChange={(e) => setManualMapping({ ...manualMapping, course_code: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-[#CBD5E1] rounded-lg text-[#142B49] focus:outline-none focus:border-[#315D91]"
                  >
                    <option value="">-- Không ánh xạ --</option>
                    {result.columns.map((col) => (
                      <option key={col.column_name} value={col.column_name}>
                        {col.column_name} (vd: {col.sample || 'trống'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Data Warehouse Sync Banner (If student ID is mapped/detected) */}
          {result.detected_columns?.student_id && (
            <div className="bg-white border border-[#DFE5ED] rounded-xl p-5 shadow-inst-card flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-l-4 border-l-[#315D91]">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#315D91] bg-[#315D91]/10 px-2 py-0.5 rounded">
                    Đồng Bộ Kho Dữ Liệu (DW Ingestion)
                  </span>
                  <span className="text-xs text-[#637187]">• Star Schema Kimball Integration</span>
                </div>
                <h3 className="text-sm font-bold text-[#142B49]">
                  Nạp dữ liệu từ tệp này vào Kho Dữ Liệu EduPulse?
                </h3>
                <p className="text-xs text-[#637187] max-w-3xl leading-relaxed">
                  Đã xác định cột mã sinh viên (<b className="text-emerald-700">{result.detected_columns.student_id}</b>). Bạn có thể nạp tệp này để cập nhật đồng bộ các màn hình Tổng quan, Kết quả học tập và Cảnh báo sớm.
                </p>
              </div>

              <div className="shrink-0 self-stretch lg:self-auto">
                <button
                  onClick={handleImportToDW}
                  disabled={isImporting}
                  className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-[#142B49] hover:bg-[#0D1F35] text-white border border-slate-700 transition-all shadow-inst-card active:scale-95"
                >
                  <Database className={`w-4 h-4 ${isImporting ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                  <span>{isImporting ? 'Đang nạp vào Kho Dữ Liệu...' : 'Nạp dữ liệu vào toàn hệ thống (DW Sync)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. Navigation Tabs */}
          <div className="flex border-b border-[#DFE5ED] space-x-1 sm:space-x-4">
            <button
              onClick={() => setActiveTab('columns')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
                activeTab === 'columns'
                  ? 'border-[#315D91] text-[#315D91]'
                  : 'border-transparent text-[#637187] hover:text-[#142B49]'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Khám Phá Phân Bố Theo Cột ({result.total_columns})</span>
            </button>

            <button
              onClick={() => setActiveTab('academic')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
                activeTab === 'academic'
                  ? 'border-[#315D91] text-[#315D91]'
                  : 'border-transparent text-[#637187] hover:text-[#142B49]'
              }`}
            >
              <PieIcon className="w-4 h-4" />
              <span>Chỉ Số Học Vụ & Cảnh Báo</span>
              {result.has_score_column && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                  Sẵn sàng
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
                activeTab === 'preview'
                  ? 'border-[#315D91] text-[#315D91]'
                  : 'border-transparent text-[#637187] hover:text-[#142B49]'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Xem Trước Dữ Liệu ({result.preview_rows.length} dòng)</span>
            </button>

            <button
              onClick={() => setActiveTab('dictionary')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
                activeTab === 'dictionary'
                  ? 'border-[#315D91] text-[#315D91]'
                  : 'border-transparent text-[#637187] hover:text-[#142B49]'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Từ Điển Cột & Chất Lượng</span>
            </button>
          </div>

          {/* TAB 1: UNIVERSAL COLUMN EXPLORER (EDA) */}
          {activeTab === 'columns' && (
            <div className="space-y-6">
              {/* Column Selection Toolbar */}
              <div className="bg-white border border-[#DFE5ED] rounded-xl p-4 shadow-inst-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-[#315D91]" />
                  <span className="text-xs font-bold text-[#142B49]">Chọn cột để khám phá phân bố:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedColumnName}
                    onChange={(e) => setSelectedColumnName(e.target.value)}
                    className="text-xs p-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#142B49] font-bold focus:outline-none focus:border-[#315D91] min-w-[240px]"
                  >
                    {result.columns.map((c) => (
                      <option key={c.column_name} value={c.column_name}>
                        {c.is_numeric ? '🔢 [Số] ' : '🔤 [Danh mục] '} {c.column_name} ({c.non_null_count}/{result.total_rows} dòng)
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full pb-1 md:pb-0">
                    {result.columns.slice(0, 6).map((c) => (
                      <button
                        key={c.column_name}
                        onClick={() => setSelectedColumnName(c.column_name)}
                        className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all flex items-center space-x-1 ${
                          selectedColumnName === c.column_name
                            ? 'bg-[#315D91] text-white shadow-xs'
                            : 'bg-[#F4F6F9] text-[#637187] hover:bg-slate-200'
                        }`}
                      >
                        {c.is_numeric ? <Hash className="w-3 h-3" /> : <Type className="w-3 h-3" />}
                        <span>{c.column_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {selectedCol ? (
                <div className="space-y-6">
                  {/* Selected Column Stat Cards */}
                  {selectedCol.is_numeric ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="bg-white border border-[#DFE5ED] rounded-xl p-3.5 shadow-inst-card">
                        <span className="text-[10px] font-bold text-[#637187] uppercase">Giá trị Nhỏ Nhất (Min)</span>
                        <div className="text-xl font-bold text-[#142B49] mt-1 tabular-nums">{selectedCol.min ?? '-'}</div>
                        <p className="text-[11px] text-[#637187] mt-0.5">Biên dưới dữ liệu</p>
                      </div>

                      <div className="bg-white border border-[#DFE5ED] rounded-xl p-3.5 shadow-inst-card">
                        <span className="text-[10px] font-bold text-[#637187] uppercase">Giá trị Lớn Nhất (Max)</span>
                        <div className="text-xl font-bold text-[#142B49] mt-1 tabular-nums">{selectedCol.max ?? '-'}</div>
                        <p className="text-[11px] text-[#637187] mt-0.5">Biên trên dữ liệu</p>
                      </div>

                      <div className="bg-white border border-[#DFE5ED] rounded-xl p-3.5 shadow-inst-card">
                        <span className="text-[10px] font-bold text-[#637187] uppercase">Trung Bình (Mean)</span>
                        <div className="text-xl font-bold text-[#315D91] mt-1 tabular-nums">{selectedCol.mean ?? '-'}</div>
                        <p className="text-[11px] text-[#637187] mt-0.5">Kỳ vọng trung bình</p>
                      </div>

                      <div className="bg-white border border-[#DFE5ED] rounded-xl p-3.5 shadow-inst-card">
                        <span className="text-[10px] font-bold text-[#637187] uppercase">Trung Vị (Median)</span>
                        <div className="text-xl font-bold text-[#142B49] mt-1 tabular-nums">{selectedCol.median ?? '-'}</div>
                        <p className="text-[11px] text-[#637187] mt-0.5">Điểm giữa 50%</p>
                      </div>

                      <div className="bg-white border border-[#DFE5ED] rounded-xl p-3.5 shadow-inst-card">
                        <span className="text-[10px] font-bold text-[#637187] uppercase">Độ Lệch Chuẩn (Std)</span>
                        <div className="text-xl font-bold text-[#142B49] mt-1 tabular-nums">{selectedCol.std ?? '-'}</div>
                        <p className="text-[11px] text-[#637187] mt-0.5">Mức độ phân tán</p>
                      </div>

                      <div className="bg-white border border-[#DFE5ED] rounded-xl p-3.5 shadow-inst-card">
                        <span className="text-[10px] font-bold text-[#637187] uppercase">Tổng Cộng (Sum)</span>
                        <div className="text-xl font-bold text-[#18856B] mt-1 tabular-nums">
                          {selectedCol.sum !== undefined ? selectedCol.sum.toLocaleString() : '-'}
                        </div>
                        <p className="text-[11px] text-[#637187] mt-0.5">{selectedCol.non_null_count} giá trị</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white border border-[#DFE5ED] rounded-xl p-3.5 shadow-inst-card">
                        <span className="text-[10px] font-bold text-[#637187] uppercase">Số Giá Trị Phân Biệt</span>
                        <div className="text-xl font-bold text-[#142B49] mt-1 tabular-nums">
                          {selectedCol.unique_count ?? '-'}
                        </div>
                        <p className="text-[11px] text-[#637187] mt-0.5">Các giá trị khác nhau</p>
                      </div>

                      <div className="bg-white border border-[#DFE5ED] rounded-xl p-3.5 shadow-inst-card">
                        <span className="text-[10px] font-bold text-[#637187] uppercase">Bản Ghi Có Dữ Liệu</span>
                        <div className="text-xl font-bold text-[#18856B] mt-1 tabular-nums">
                          {selectedCol.non_null_count} / {result.total_rows}
                        </div>
                        <p className="text-[11px] text-[#637187] mt-0.5">
                          Tỷ lệ điền: {roundPct((selectedCol.non_null_count / (result.total_rows || 1)) * 100)}%
                        </p>
                      </div>

                      <div className="bg-white border border-[#DFE5ED] rounded-xl p-3.5 shadow-inst-card">
                        <span className="text-[10px] font-bold text-[#637187] uppercase">Số Lượng Ô Trống</span>
                        <div className={`text-xl font-bold mt-1 tabular-nums ${selectedCol.null_count > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {selectedCol.null_count}
                        </div>
                        <p className="text-[11px] text-[#637187] mt-0.5">
                          Tỷ lệ trống: {selectedCol.null_pct ?? 0}%
                        </p>
                      </div>

                      <div className="bg-white border border-[#DFE5ED] rounded-xl p-3.5 shadow-inst-card">
                        <span className="text-[10px] font-bold text-[#637187] uppercase">Giá Trị Phổ Biến Nhất</span>
                        <div className="text-sm font-bold text-[#315D91] mt-1 truncate" title={selectedCol.top_values?.[0]?.value}>
                          {selectedCol.top_values?.[0]?.value || selectedCol.sample || '-'}
                        </div>
                        <p className="text-[11px] text-[#637187] mt-0.5">
                          {selectedCol.top_values?.[0] ? `${selectedCol.top_values[0].count} lần (${selectedCol.top_values[0].percentage}%)` : 'Mẫu quan sát'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Distribution Chart */}
                  <div className="bg-white border border-[#DFE5ED] rounded-xl p-5 shadow-inst-card">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-4 border-b border-[#F1F5F9] gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-[#142B49] uppercase tracking-wider flex items-center space-x-2">
                          <BarChart2 className="w-4 h-4 text-[#315D91]" />
                          <span>
                            {selectedCol.is_numeric
                              ? `Biểu Đồ Phân Bố Tần Số (Histogram): Cột "${selectedCol.column_name}"`
                              : `Biểu Đồ Tần Suất Giá Trị Hàng Đầu (Top Values): Cột "${selectedCol.column_name}"`}
                          </span>
                        </h3>
                        <p className="text-[11px] text-[#637187] mt-0.5">
                          Kiểu dữ liệu: <code className="bg-slate-100 px-1 py-0.5 rounded text-[#142B49] font-mono">{selectedCol.raw_dtype || selectedCol.data_type}</code> • 
                          Phân loại: <b>{selectedCol.is_numeric ? 'Định lượng (Numeric)' : 'Định tính / Phân loại (Categorical)'}</b>
                        </p>
                      </div>

                      <span className="text-xs bg-[#F0F4F9] text-[#315D91] px-2.5 py-1 rounded-lg font-bold">
                        {selectedCol.non_null_count.toLocaleString()} dòng dữ liệu
                      </span>
                    </div>

                    {selectedCol.is_numeric && selectedCol.histogram && selectedCol.histogram.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={selectedCol.histogram} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis
                              dataKey="bin"
                              stroke="#637187"
                              fontSize={11}
                              interval={0}
                              angle={-20}
                              textAnchor="end"
                              height={45}
                            />
                            <YAxis stroke="#637187" fontSize={11} tickMargin={4} />
                            <Tooltip
                              formatter={(value: any, name: any, item: any) => [
                                `${value} dòng (${item.payload.percentage}%)`,
                                'Số lượng'
                              ]}
                              labelFormatter={(label: any) => `Khoảng giá trị: ${label}`}
                              contentStyle={{
                                backgroundColor: '#FFFFFF',
                                borderColor: '#CBD5E1',
                                borderRadius: '6px',
                                color: '#1B2738',
                                fontSize: '12px',
                                boxShadow: '0 4px 12px rgba(13, 31, 53, 0.08)'
                              }}
                            />
                            <Bar dataKey="count" name="Số dòng" radius={[4, 4, 0, 0]}>
                              {selectedCol.histogram.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PALETTE_COLORS[index % PALETTE_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : !selectedCol.is_numeric && selectedCol.top_values && selectedCol.top_values.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={selectedCol.top_values}
                            margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis type="number" stroke="#637187" fontSize={11} />
                            <YAxis
                              dataKey="value"
                              type="category"
                              stroke="#637187"
                              fontSize={11}
                              width={120}
                              tickFormatter={(val) => (String(val).length > 18 ? String(val).substring(0, 16) + '...' : String(val))}
                            />
                            <Tooltip
                              formatter={(value: any, name: any, item: any) => [
                                `${value} lần (${item.payload.percentage}%)`,
                                'Số lần xuất hiện'
                              ]}
                              contentStyle={{
                                backgroundColor: '#FFFFFF',
                                borderColor: '#CBD5E1',
                                borderRadius: '6px',
                                color: '#1B2738',
                                fontSize: '12px',
                                boxShadow: '0 4px 12px rgba(13, 31, 53, 0.08)'
                              }}
                            />
                            <Bar dataKey="count" name="Tần số" radius={[0, 4, 4, 0]}>
                              {selectedCol.top_values.map((entry, index) => (
                                <Cell key={`cat-cell-${index}`} fill={PALETTE_COLORS[index % PALETTE_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-[#637187]">
                        Không có đủ giá trị số để hiển thị biểu đồ phân bố cho cột này.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: ACADEMIC INSIGHTS & AT-RISK */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              {result.score_stats ? (
                <>
                  {/* Academic KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="bg-white border border-[#DFE5ED] rounded-xl p-4 shadow-inst-card">
                      <span className="text-[10px] font-bold text-[#637187] uppercase">Điểm TB (Mean)</span>
                      <div className="text-2xl font-bold text-[#142B49] mt-1 tabular-nums">{result.score_stats.mean}</div>
                      <p className="text-[11px] text-[#637187] mt-1 tabular-nums">Trung vị: {result.score_stats.median}</p>
                    </div>

                    <div className="bg-white border border-[#DFE5ED] rounded-xl p-4 shadow-inst-card">
                      <span className="text-[10px] font-bold text-[#637187] uppercase">Độ lệch chuẩn (Std)</span>
                      <div className="text-2xl font-bold text-[#142B49] mt-1 tabular-nums">{result.score_stats.std}</div>
                      <p className="text-[11px] text-[#637187] mt-1">Biên độ dao động</p>
                    </div>

                    <div className="bg-white border border-[#DFE5ED] rounded-xl p-4 shadow-inst-card">
                      <span className="text-[10px] font-bold text-[#637187] uppercase">Biên độ Min - Max</span>
                      <div className="text-2xl font-bold text-[#142B49] mt-1 tabular-nums">
                        {result.score_stats.min} — {result.score_stats.max}
                      </div>
                      <p className="text-[11px] text-[#637187] mt-1">Thang điểm 10</p>
                    </div>

                    <div className="bg-white border border-[#DFE5ED] rounded-xl p-4 shadow-inst-card">
                      <span className="text-[10px] font-bold text-[#637187] uppercase">Tỷ lệ Đạt môn</span>
                      <div className="text-2xl font-bold text-[#18856B] mt-1 tabular-nums">{result.score_stats.pass_rate_pct}%</div>
                      <p className="text-[11px] text-[#637187] mt-1 tabular-nums">{result.score_stats.pass_count} SV đạt</p>
                    </div>

                    <div className="bg-white border border-[#DFE5ED] rounded-xl p-4 shadow-inst-card border-l-[3px] border-l-[#C43D4B]">
                      <span className="text-[10px] font-bold text-[#C43D4B] uppercase">Tỷ lệ Chưa đạt</span>
                      <div className="text-2xl font-bold text-[#C43D4B] mt-1 tabular-nums">{result.score_stats.fail_rate_pct}%</div>
                      <p className="text-[11px] text-[#637187] mt-1 tabular-nums">{result.score_stats.fail_count} SV chưa đạt</p>
                    </div>

                    <div className="bg-white border border-[#DFE5ED] rounded-xl p-4 shadow-inst-card border-l-[3px] border-l-[#C43D4B]">
                      <span className="text-[10px] font-bold text-[#C43D4B] uppercase">Cần Cảnh báo</span>
                      <div className="text-2xl font-bold text-[#C43D4B] mt-1 tabular-nums">{result.at_risk_count} SV</div>
                      <p className="text-[11px] text-[#637187] mt-1">Điểm &lt; 4 hoặc Vắng &gt; 25%</p>
                    </div>
                  </div>

                  {/* Charts (Grade Distribution & Pass/Fail Ratio) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Grade Distribution Bar Chart */}
                    <div className="lg:col-span-8 bg-white border border-[#DFE5ED] rounded-xl p-5 shadow-inst-card">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
                        <h3 className="text-xs font-bold text-[#142B49] uppercase tracking-wider flex items-center space-x-2">
                          <BarChart2 className="w-4 h-4 text-[#315D91]" />
                          <span>Phân bố Thang điểm của Tệp Dữ liệu (Grade Histogram)</span>
                        </h3>
                      </div>

                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={result.grade_distribution} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="grade" stroke="#637187" fontSize={11} tickMargin={8} />
                            <YAxis stroke="#637187" fontSize={11} tickMargin={4} />
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
                            <Bar dataKey="count" name="Số lượng SV" radius={[4, 4, 0, 0]}>
                              {result.grade_distribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Pass vs Fail Ratio */}
                    <div className="lg:col-span-4 bg-white border border-[#DFE5ED] rounded-xl p-5 shadow-inst-card flex flex-col justify-between">
                      <div>
                        <div className="mb-4 pb-3 border-b border-[#F1F5F9]">
                          <h3 className="text-xs font-bold text-[#142B49] uppercase tracking-wider flex items-center space-x-2">
                            <PieIcon className="w-4 h-4 text-[#18856B]" />
                            <span>Tỷ trọng Đạt vs Chưa Đạt</span>
                          </h3>
                        </div>

                        <div className="space-y-3">
                          <div className="p-3 bg-[#EBF7F2] border border-[#C2E8D7] rounded-lg">
                            <div className="flex justify-between items-center text-xs font-semibold text-[#18856B]">
                              <span>Đạt chuẩn học phần (&ge; 4.0):</span>
                              <span className="font-bold text-[#18856B] text-sm tabular-nums">
                                {result.score_stats.pass_count} SV ({result.score_stats.pass_rate_pct}%)
                              </span>
                            </div>
                          </div>
                          <div className="p-3 bg-[#FDF2F2] border border-[#F9D0D5] rounded-lg">
                            <div className="flex justify-between items-center text-xs font-semibold text-[#C43D4B]">
                              <span>Chưa đạt chuẩn (&lt; 4.0):</span>
                              <span className="font-bold text-[#C43D4B] text-sm tabular-nums">
                                {result.score_stats.fail_count} SV ({result.score_stats.fail_rate_pct}%)
                              </span>
                            </div>
                          </div>

                          {result.attendance_stats && (
                            <div className="p-3 bg-[#F0F4F9] border border-[#DFE5ED] rounded-lg text-xs text-[#142B49]">
                              <span className="font-bold block mb-1">Chỉ số Chuyên cần:</span>
                              <span className="text-[#637187]">
                                Trung bình: <b className="text-[#142B49] tabular-nums">{result.attendance_stats.mean}%</b> • Dưới ngưỡng 75%: <b className="text-[#C43D4B] tabular-nums">{result.attendance_stats.below_75_count} SV</b>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* At-Risk Students detected inside uploaded file */}
                  {result.at_risk_students.length > 0 && (
                    <div className="bg-white border border-[#DFE5ED] rounded-xl p-5 shadow-inst-card">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F1F5F9]">
                        <h3 className="text-xs font-bold text-[#142B49] uppercase tracking-wider flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-[#C43D4B]" />
                          <span>Sinh viên có nguy cơ phát hiện trong tệp ({result.at_risk_students.length} trường hợp)</span>
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#F8FAFC] text-[#637187] uppercase font-semibold border-y border-[#DFE5ED]">
                            <tr>
                              <th className="py-2.5 px-3">Dòng</th>
                              <th className="py-2.5 px-3">Mã SV</th>
                              <th className="py-2.5 px-3">Họ và tên</th>
                              <th className="py-2.5 px-2 text-center">Điểm số</th>
                              <th className="py-2.5 px-2 text-center">Chuyên cần</th>
                              <th className="py-2.5 px-3">Nguyên nhân</th>
                              <th className="py-2.5 px-3">Hành động khuyến nghị</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {result.at_risk_students.map((st, i) => (
                              <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                                <td className="py-2.5 px-3 text-[#637187] font-mono">#{st.row_index}</td>
                                <td className="py-2.5 px-3 font-semibold text-[#142B49]">{st.student_id}</td>
                                <td className="py-2.5 px-3 font-medium text-[#1B2738]">{st.full_name}</td>
                                <td className="py-2.5 px-2 text-center font-bold text-[#C43D4B] tabular-nums">
                                  {st.score !== null ? st.score : '-'}
                                </td>
                                <td className="py-2.5 px-2 text-center font-medium text-[#1B2738] tabular-nums">
                                  {st.attendance !== null ? `${st.attendance}%` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-[#C43D4B] font-semibold">{st.reasons.join(', ')}</td>
                                <td className="py-2.5 px-3 text-[#637187] italic">→ {st.recommended_action}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Information card when file is general without academic scores */
                <div className="bg-white border border-[#DFE5ED] rounded-xl p-8 text-center space-y-4 shadow-inst-card">
                  <div className="w-14 h-14 bg-blue-50 text-[#315D91] rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h3 className="text-sm font-bold text-[#142B49]">
                      Tệp dữ liệu này đang phân tích ở chế độ Tổng Quát (General Dataset)
                    </h3>
                    <p className="text-xs text-[#637187] leading-relaxed">
                      Tệp hiện tại ({result.file_name}) chưa có cột điểm số quy chuẩn (0–10). Nếu đây là bảng điểm học sinh/sinh viên với tên cột đặc thù, bạn có thể chỉ định cột điểm trong mục <b>Ánh xạ cột thủ công</b> để tự động kích hoạt tính năng tính tỷ lệ Đạt/Hỏng, phổ điểm và cảnh báo học vụ.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => setIsMappingOpen(true)}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold bg-[#315D91] hover:bg-[#254770] text-white rounded-lg shadow-xs transition-all"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Mở bảng Ánh Xạ Cột Thủ Công</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('columns')}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-[#F4F6F9] text-[#142B49] border border-[#DFE5ED] hover:bg-slate-200 rounded-lg transition-all"
                    >
                      <BarChart2 className="w-3.5 h-3.5 text-[#315D91]" />
                      <span>Xem Phân Bố Cột Khác</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DATA PREVIEW TABLE */}
          {activeTab === 'preview' && (
            <div className="bg-white border border-[#DFE5ED] rounded-xl p-5 shadow-inst-card">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="text-xs font-bold text-[#142B49] uppercase tracking-wider flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#315D91]" />
                    <span>Bảng Xem Trước Dữ Liệu Tệp (Data Preview — Top 50 Dòng)</span>
                  </h3>
                  <p className="text-[11px] text-[#637187] mt-0.5">
                    Đang hiển thị {filteredPreview.length} / {result.preview_rows.length} dòng nạp vào bộ nhớ tạm.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#637187]" />
                  <input
                    type="text"
                    placeholder="Lọc dữ liệu bảng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#DFE5ED] rounded-lg text-[#1B2738] focus:outline-none focus:border-[#315D91] focus:ring-1 focus:ring-[#315D91]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#637187] font-semibold border-y border-[#DFE5ED] sticky top-0 z-10 font-mono text-[11px]">
                    <tr>
                      <th className="py-2 px-2 text-center">STT</th>
                      {result.columns.map((c) => {
                        const isSid = c.column_name === result.detected_columns?.student_id;
                        const isScore = c.column_name === result.detected_columns?.score;
                        return (
                          <th
                            key={c.column_name}
                            className={`py-2 px-3 whitespace-nowrap ${
                              isSid
                                ? 'bg-emerald-50 text-emerald-800 font-bold border-b-2 border-emerald-500'
                                : isScore
                                ? 'bg-blue-50 text-blue-800 font-bold border-b-2 border-blue-500'
                                : ''
                            }`}
                          >
                            <div className="flex items-center space-x-1">
                              <span>{c.column_name}</span>
                              {c.is_numeric ? (
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1 rounded">123</span>
                              ) : (
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded">Aa</span>
                              )}
                              {isSid && <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1 rounded">MSSV</span>}
                              {isScore && <span className="text-[9px] bg-blue-200 text-blue-900 px-1 rounded">Điểm</span>}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px]">
                    {filteredPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2 px-2 text-center text-[#637187] tabular-nums">{idx + 1}</td>
                        {result.columns.map((c) => {
                          const isSid = c.column_name === result.detected_columns?.student_id;
                          const isScore = c.column_name === result.detected_columns?.score;
                          return (
                            <td
                              key={c.column_name}
                              className={`py-2 px-3 whitespace-nowrap ${
                                isSid
                                  ? 'bg-emerald-50/40 font-semibold text-emerald-900'
                                  : isScore
                                  ? 'bg-blue-50/40 font-bold text-blue-900'
                                  : 'text-[#1B2738]'
                              }`}
                            >
                              {row[c.column_name] !== null ? String(row[c.column_name]) : <span className="text-[#94B3D4] italic">null</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DATA DICTIONARY & QUALITY REPORT */}
          {activeTab === 'dictionary' && (
            <div className="bg-white border border-[#DFE5ED] rounded-xl p-5 shadow-inst-card space-y-4">
              <div className="pb-3 border-b border-[#F1F5F9]">
                <h3 className="text-xs font-bold text-[#142B49] uppercase tracking-wider flex items-center space-x-2">
                  <FileCheck className="w-4 h-4 text-[#315D91]" />
                  <span>Báo Cáo Cấu Trúc & Chất Lượng Cột (Data Dictionary & Column Profiling)</span>
                </h3>
                <p className="text-[11px] text-[#637187] mt-0.5">
                  Tổng hợp kiểu dữ liệu, tỷ lệ khuyết thiếu (Null percentage), số lượng giá trị phân biệt và phân loại cho toàn bộ {result.total_columns} cột trong tệp.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#637187] font-semibold border-y border-[#DFE5ED]">
                    <tr>
                      <th className="py-2.5 px-3">Tên Cột</th>
                      <th className="py-2.5 px-3">Phân Loại</th>
                      <th className="py-2.5 px-3">Kiểu Gốc (dtype)</th>
                      <th className="py-2.5 px-3 text-right">Dòng Hợp Lệ</th>
                      <th className="py-2.5 px-3 text-right">Ô Trống (Null)</th>
                      <th className="py-2.5 px-3 text-right">Giá Trị Phân Biệt</th>
                      <th className="py-2.5 px-3">Giá Trị Mẫu / Thống Kê Nhanh</th>
                      <th className="py-2.5 px-2 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {result.columns.map((col) => (
                      <tr key={col.column_name} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-3 font-bold font-mono text-[#142B49]">
                          {col.column_name}
                        </td>
                        <td className="py-2.5 px-3">
                          {col.is_numeric ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                              🔢 Định lượng (Số)
                            </span>
                          ) : (
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                              🔤 Định tính (Chuỗi)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#637187] text-[11px]">
                          {col.raw_dtype || col.data_type}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums text-[#142B49]">
                          {col.non_null_count.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums">
                          <span className={col.null_count > 0 ? 'text-amber-600 font-bold' : 'text-[#637187]'}>
                            {col.null_count} ({col.null_pct ?? 0}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums text-[#142B49]">
                          {col.unique_count !== undefined ? col.unique_count.toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-[#637187] text-[11px]">
                          {col.is_numeric && col.min !== undefined && col.max !== undefined ? (
                            <span>Min: <b>{col.min}</b>, Max: <b>{col.max}</b>, Mean: <b>{col.mean}</b></span>
                          ) : (
                            <span className="italic truncate block max-w-xs" title={col.sample}>
                              Mẫu: "{col.sample || 'trống'}"
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => {
                              setSelectedColumnName(col.column_name);
                              setActiveTab('columns');
                            }}
                            className="px-2 py-1 bg-[#F0F4F9] hover:bg-[#315D91] hover:text-white text-[#315D91] text-[10px] font-bold rounded transition-all"
                          >
                            Xem phân bố →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function roundPct(val: number): number {
  return Math.round(val * 10) / 10;
}
