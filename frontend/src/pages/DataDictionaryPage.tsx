import React, { useState, useEffect } from 'react';
import { BookMarked, Search, Filter, Database, Key, CheckCircle2, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { DataDictionaryDoc, DataDictionaryTable } from '../types';

export const DataDictionaryPage: React.FC = () => {
  const [doc, setDoc] = useState<DataDictionaryDoc | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedTable, setSelectedTable] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDictionary = () => {
    setIsLoading(true);
    setError(null);
    api.getDataDictionary()
      .then((res) => setDoc(res))
      .catch((err) => {
        console.error(err);
        setError('Không thể kết nối đến máy chủ EduPulse Backend để tải Data Dictionary.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchDictionary();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-white border border-inst-border rounded-xl">
        <div className="w-8 h-8 border-2 border-academic border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-inst-text-secondary">Đang đồng bộ Data Dictionary từ siêu dữ liệu kho dữ liệu...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="bg-white border border-[#F9D0D5] rounded-xl p-12 shadow-inst-card flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-[#FDF2F2] flex items-center justify-center text-[#C43D4B]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-sm font-bold text-[#142B49]">Lỗi kết nối Data Dictionary</h3>
          <p className="text-xs text-[#637187]">
            {error || 'Máy chủ backend không phản hồi hoặc đang gặp sự cố.'}
          </p>
        </div>
        <button
          onClick={fetchDictionary}
          className="flex items-center space-x-2 px-4 py-2 bg-[#142B49] hover:bg-[#1E3A5F] text-white text-xs font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>Thử lại kết nối</span>
        </button>
      </div>
    );
  }

  // Filter tables
  const filteredTables = doc.tables.filter((tbl) => {
    if (selectedType !== 'ALL' && tbl.table_type !== selectedType) return false;
    if (selectedTable !== 'ALL' && tbl.table_name !== selectedTable) return false;
    return true;
  });

  // Filter columns inside tables based on search
  const displayedTables = filteredTables.map((tbl) => {
    const matchingCols = tbl.columns.filter((c) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        tbl.table_name.toLowerCase().includes(term) ||
        c.validation_rules.toLowerCase().includes(term)
      );
    });
    return { ...tbl, columns: matchingCols };
  }).filter((tbl) => tbl.columns.length > 0);

  return (
    <div className="space-y-6">
      {/* Institutional Banner Header */}
      <div className="bg-white border border-inst-border rounded-xl p-6 shadow-inst-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-inst-navy text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookMarked className="w-5 h-5 text-slate-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-academic bg-academic/10 px-2 py-0.5 rounded">
                Danh mục Siêu Dữ liệu (Metadata Repository)
              </span>
              <span className="text-xs text-inst-text-secondary">• Chuẩn hóa Từ điển Dữ liệu</span>
            </div>
            <h2 className="text-base font-bold text-inst-text mt-1">
              Từ Điển Dữ Liệu Tương Tác (Data Dictionary)
            </h2>
            <p className="text-xs text-inst-text-secondary mt-0.5 max-w-2xl leading-relaxed">
              Tài liệu hóa chi tiết siêu dữ liệu của Kho dữ liệu học vụ: Định nghĩa từng cột, kiểu dữ liệu, ràng buộc khóa, 
              quy tắc kiểm định nghiệp vụ và giá trị mẫu phục vụ phân tích.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-inst-text-secondary">Quy mô từ điển:</span>
          <span className="font-bold text-academic bg-academic/10 px-2.5 py-1 rounded border border-academic/20 tabular-nums">
            {doc.tables.length} bảng dữ liệu
          </span>
        </div>
      </div>

      {/* Controls Bar: Search & Type Filter */}
      <div className="bg-white border border-inst-border rounded-xl p-4 shadow-inst-card flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên trường, tên bảng, quy tắc nghiệp vụ, kiểu dữ liệu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-inst-canvas border border-inst-border rounded-lg text-inst-text placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-academic focus:border-academic"
          />
        </div>

        {/* Filter by Type */}
        <div className="flex items-center space-x-1 text-xs">
          {['ALL', 'FACT', 'DIMENSION', 'AUDIT'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors border ${
                selectedType === type
                  ? 'bg-inst-navy text-white border-inst-navy'
                  : 'bg-inst-canvas text-inst-text-secondary border-inst-border hover:bg-slate-200'
              }`}
            >
              {type === 'ALL' ? 'Tất cả phân loại' : type}
            </button>
          ))}
        </div>

        {/* Select Table */}
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="text-xs font-medium bg-inst-canvas border border-inst-border rounded-lg px-3 py-1.5 text-inst-text focus:outline-none focus:ring-1 focus:ring-academic"
        >
          <option value="ALL">Tất cả bảng ({doc.tables.length})</option>
          {doc.tables.map((t) => (
            <option key={t.table_name} value={t.table_name}>
              {t.table_name} ({t.table_type})
            </option>
          ))}
        </select>
      </div>

      {/* Tables & Columns Details */}
      <div className="space-y-6">
        {displayedTables.map((tbl) => {
          const isFact = tbl.table_type === 'FACT';
          const isDim = tbl.table_type === 'DIMENSION';

          return (
            <div key={tbl.table_name} className="bg-white border border-inst-border rounded-xl overflow-hidden shadow-inst-card">
              {/* Table Header Card */}
              <div className="p-4 bg-inst-canvas border-b border-inst-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h3 className="text-sm font-bold font-mono text-inst-navy">{tbl.table_name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                        isFact
                          ? 'bg-inst-navy text-white border-inst-navy'
                          : isDim
                          ? 'bg-academic/10 text-academic border-academic/20'
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      {tbl.table_type}
                    </span>
                  </div>
                  <p className="text-xs text-inst-text-secondary mt-1">{tbl.description}</p>
                </div>

                <div className="text-left md:text-right bg-white md:bg-transparent p-2 md:p-0 rounded border md:border-0 border-inst-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-inst-text-secondary block">
                    Độ chi tiết hạt dữ liệu (Grain)
                  </span>
                  <span className="text-xs font-medium text-inst-text font-mono">{tbl.grain}</span>
                </div>
              </div>

              {/* Columns Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-inst-text-secondary font-bold border-b border-inst-border uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Tên trường</th>
                      <th className="py-2.5 px-3">Kiểu dữ liệu</th>
                      <th className="py-2.5 px-2 text-center">Khóa</th>
                      <th className="py-2.5 px-2 text-center">Null?</th>
                      <th className="py-2.5 px-3">Đơn vị đo</th>
                      <th className="py-2.5 px-4 min-w-[200px]">Mô tả nghiệp vụ</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Quy tắc kiểm tra</th>
                      <th className="py-2.5 px-3">Giá trị mẫu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-inst-border">
                    {tbl.columns.map((c) => (
                      <tr key={c.name} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-inst-navy">{c.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{c.data_type}</td>
                        <td className="py-2.5 px-2 text-center">
                          {c.is_pk && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-inst-warning/10 text-inst-warning border border-inst-warning/30">
                              PK
                            </span>
                          )}
                          {c.is_fk && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-academic/10 text-academic border border-academic/30">
                              FK
                            </span>
                          )}
                          {!c.is_pk && !c.is_fk && <span className="text-slate-300">-</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-500 font-mono text-[10px]">
                          {c.nullable ? 'YES' : 'NO'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">{c.unit}</td>
                        <td className="py-2.5 px-4 text-inst-text leading-relaxed">{c.description}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px]">{c.validation_rules}</td>
                        <td className="py-2.5 px-3 font-mono text-inst-navy font-semibold bg-inst-canvas/40 tabular-nums">
                          {c.sample_value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
