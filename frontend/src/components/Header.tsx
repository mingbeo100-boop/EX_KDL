import React from 'react';
import { Database, RefreshCw, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onRefresh, isLoading }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-8 py-4 flex items-center justify-between shadow-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>Star Schema DW</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-xs disabled:opacity-50"
            title="Làm mới dữ liệu từ Data Warehouse"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>
        )}
      </div>
    </header>
  );
};
