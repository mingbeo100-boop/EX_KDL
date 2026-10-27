import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Database, FileText, Play, Activity } from 'lucide-react';
import { api } from '../services/api';
import { ETLAuditLog, ETLRejectedRecord } from '../types';

export const ETLPipelinePage: React.FC = () => {
  const [latestRun, setLatestRun] = useState<ETLAuditLog | null>(null);
  const [runHistory, setRunHistory] = useState<ETLAuditLog[]>([]);
  const [rejections, setRejections] = useState<ETLRejectedRecord[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setIsLoading(true);
    setError(null);
    Promise.all([api.getETLStatus(), api.getETLRejections()])
      .then(([statusRes, rejectionsRes]) => {
        setLatestRun(statusRes.latest_run);
        setRunHistory(statusRes.run_history);
        setRejections(rejectionsRes);
      })
      .catch((err) => {
        console.error(err);
        setError('Không thể kết nối đến máy chủ EduPulse Backend để tải trạng thái ETL.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerETL = async () => {
    setIsExecuting(true);
    setMessage(null);
    try {
      const res = await api.triggerETL();
      setMessage(`Đã kích hoạt ETL thành công! Batch #${res.data.batch_id} đã xử lý ${res.data.rows_extracted} dòng trong ${res.data.execution_duration_sec}s.`);
      loadData();
    } catch (err: any) {
      setMessage(`Lỗi khi chạy ETL: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Institutional Action Header */}
      <div className="bg-white border border-inst-border rounded-xl p-6 shadow-inst-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-inst-navy text-white flex items-center justify-center shrink-0 shadow-xs">
            <RefreshCw className={`w-5 h-5 text-slate-100 ${isExecuting ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-academic bg-academic/10 px-2 py-0.5 rounded">
                Dữ liệu & Tích hợp Hệ thống
              </span>
              <span className="text-xs text-inst-text-secondary">• Idempotent Data Pipeline</span>
            </div>
            <h2 className="text-base font-bold text-inst-text mt-1">
              Quy trình ETL/ELT & Giám sát Chất lượng Dữ liệu
            </h2>
            <p className="text-xs text-inst-text-secondary mt-0.5 max-w-2xl leading-relaxed">
              Kiểm toán thực thi đồng bộ dữ liệu từ nguồn tác nghiệp (OLTP) sang Kho dữ liệu học vụ (Star Schema), 
              đảm bảo tính lặp an toàn và lưu vết các bản ghi không đạt chuẩn chất lượng.
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerETL}
          disabled={isExecuting}
          className="flex items-center space-x-2 px-4 py-2 bg-inst-navy hover:bg-inst-deep text-white rounded-lg text-xs font-bold transition-all shadow-inst-card active:scale-95 disabled:opacity-50 shrink-0 border border-slate-700"
        >
          <Play className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
          <span>{isExecuting ? 'Đang thực thi ETL...' : 'Chạy Pipeline ETL ngay'}</span>
        </button>
      </div>

      {message && (
        <div className="bg-inst-positive/10 border border-inst-positive/20 text-inst-positive rounded-xl p-4 text-xs font-semibold flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-inst-positive shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-[#FDF2F2] border border-[#F9D0D5] text-[#C43D4B] rounded-xl p-4 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-[#142B49] hover:bg-[#1E3A5F] text-white rounded text-[11px] font-medium transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Latest Run KPI Summary */}
      {latestRun && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-inst-border rounded-xl p-4 shadow-inst-card">
            <span className="text-[10px] font-bold text-inst-text-secondary uppercase tracking-wider block">
              Mã đợt chạy (Batch)
            </span>
            <div className="text-2xl font-bold text-inst-navy mt-1 tabular-nums font-mono">
              #{latestRun.batch_id}
            </div>
            <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-inst-positive/10 text-inst-positive border border-inst-positive/20">
              {latestRun.status}
            </span>
          </div>

          <div className="bg-white border border-inst-border rounded-xl p-4 shadow-inst-card">
            <span className="text-[10px] font-bold text-inst-text-secondary uppercase tracking-wider block">
              Dòng trích xuất (Extract)
            </span>
            <div className="text-2xl font-bold text-inst-text mt-1 tabular-nums">
              {latestRun.rows_extracted.toLocaleString()}
            </div>
            <p className="text-[11px] text-inst-text-secondary mt-1">Từ nguồn tác nghiệp OLTP</p>
          </div>

          <div className="bg-white border border-inst-border rounded-xl p-4 shadow-inst-card">
            <span className="text-[10px] font-bold text-inst-text-secondary uppercase tracking-wider block">
              Nạp Fact thành công
            </span>
            <div className="text-2xl font-bold text-inst-positive mt-1 tabular-nums">
              {latestRun.rows_loaded_fact.toLocaleString()}
            </div>
            <p className="text-[11px] text-inst-text-secondary mt-1">Chuẩn hóa Grain SV-MH-HK</p>
          </div>

          <div className="bg-white border border-inst-border rounded-xl p-4 shadow-inst-card">
            <span className="text-[10px] font-bold text-inst-text-secondary uppercase tracking-wider block">
              Bản ghi bị từ chối
            </span>
            <div className="text-2xl font-bold text-inst-critical mt-1 tabular-nums">
              {latestRun.rows_rejected}
            </div>
            <p className="text-[11px] text-inst-text-secondary mt-1">Vi phạm quy tắc làm sạch</p>
          </div>

          <div className="bg-white border border-inst-border rounded-xl p-4 shadow-inst-card">
            <span className="text-[10px] font-bold text-inst-text-secondary uppercase tracking-wider block">
              Thời lượng thực thi
            </span>
            <div className="text-2xl font-bold text-academic mt-1 tabular-nums">
              {latestRun.execution_duration_sec}s
            </div>
            <p className="text-[11px] text-inst-text-secondary mt-1 font-mono text-[10px] truncate">
              {latestRun.end_time}
            </p>
          </div>
        </div>
      )}

      {/* Row 2: Rejected Records Inspector */}
      <div className="bg-white border border-inst-border rounded-xl p-5 shadow-inst-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-inst-border gap-2">
          <div>
            <h3 className="text-sm font-bold text-inst-text flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-inst-critical" />
              <span>Nhật ký Bản ghi Bị từ chối (ETL Rejected Records)</span>
            </h3>
            <p className="text-xs text-inst-text-secondary mt-0.5">
              Chi tiết lỗi kiểm tra toàn vẹn khóa ngoại, trùng lặp hạt dữ liệu (Grain) và điểm nằm ngoài miền giá trị
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-inst-critical/10 text-inst-critical border border-inst-critical/20 tabular-nums self-start sm:self-auto">
            {rejections.length} bản ghi vi phạm
          </span>
        </div>

        <div className="overflow-x-auto max-h-[360px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-inst-text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-inst-border sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Batch</th>
                <th className="py-2.5 px-3">Mã định danh bản ghi</th>
                <th className="py-2.5 px-3">Mã lỗi</th>
                <th className="py-2.5 px-4 min-w-[200px]">Lý do từ chối</th>
                <th className="py-2.5 px-3">Dữ liệu thô (JSON Payload)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inst-border font-mono text-[11px]">
              {rejections.map((r) => (
                <tr key={r.reject_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 text-slate-500 font-bold tabular-nums">#{r.batch_id}</td>
                  <td className="py-2.5 px-3 text-academic font-semibold">{r.record_identifier}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-inst-critical/10 text-inst-critical border border-inst-critical/20">
                      {r.reason_code}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-sans text-inst-text">{r.error_message}</td>
                  <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">{r.raw_data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Audit Execution History */}
      <div className="bg-white border border-inst-border rounded-xl p-5 shadow-inst-card">
        <div className="pb-3 mb-3 border-b border-inst-border">
          <h3 className="text-sm font-bold text-inst-text flex items-center space-x-2">
            <FileText className="w-4 h-4 text-inst-navy" />
            <span>Lịch sử Thực thi Pipeline (ETL Audit Log)</span>
          </h3>
          <p className="text-xs text-inst-text-secondary mt-0.5">
            Lưu vết tự động mỗi phiên trích xuất, chuyển đổi và nạp dữ liệu với đầy đủ thông số định lượng
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-inst-text-secondary font-bold uppercase text-[10px] tracking-wider border-b border-inst-border">
              <tr>
                <th className="py-2.5 px-3">Mã Batch</th>
                <th className="py-2.5 px-3">Tên Pipeline</th>
                <th className="py-2.5 px-3">Thời gian chạy</th>
                <th className="py-2.5 px-2 text-center">Trạng thái</th>
                <th className="py-2.5 px-2 text-center">Trích xuất</th>
                <th className="py-2.5 px-2 text-center">Hợp lệ</th>
                <th className="py-2.5 px-2 text-center">Bị loại</th>
                <th className="py-2.5 px-2 text-center">Fact nạp</th>
                <th className="py-2.5 px-3 text-right">Thời lượng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inst-border font-mono text-[11px]">
              {runHistory.map((h) => (
                <tr key={h.batch_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-academic tabular-nums">#{h.batch_id}</td>
                  <td className="py-2.5 px-3 font-medium text-inst-text font-sans">{h.pipeline_name}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-[10px]">{h.start_time}</td>
                  <td className="py-2.5 px-2 text-center font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-inst-positive/10 text-inst-positive border border-inst-positive/20">
                      {h.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-600 tabular-nums">{h.rows_extracted.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-center font-semibold text-inst-positive tabular-nums">{h.rows_valid.toLocaleString()}</td>
                  <td className="py-2.5 px-2 text-center font-semibold text-inst-critical tabular-nums">{h.rows_rejected}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-inst-navy tabular-nums">{h.rows_loaded_fact.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-inst-text tabular-nums">{h.execution_duration_sec}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
