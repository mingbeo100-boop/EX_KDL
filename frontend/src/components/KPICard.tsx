import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  context: string;
  statusText?: string;
  statusType?: 'neutral' | 'positive' | 'warning' | 'critical';
  icon?: LucideIcon;
  isCritical?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  unit,
  context,
  statusText,
  statusType = 'neutral',
  icon: Icon,
  isCritical = false,
}) => {
  const statusStyles = {
    neutral: 'bg-[#F4F6F9] text-[#637187] border-[#DFE5ED]',
    positive: 'bg-[#EBF7F2] text-[#18856B] border-[#C2E8D7]',
    warning: 'bg-[#FEF6E7] text-[#B7791F] border-[#FCE1B4]',
    critical: 'bg-[#FDF2F2] text-[#C43D4B] border-[#F9D0D5]',
  };

  return (
    <div
      className={`bg-white border rounded-[8px] p-4 sm:p-5 shadow-inst-card flex flex-col justify-between transition-all duration-150 ${
        isCritical
          ? 'border-l-[4px] border-l-[#C43D4B] border-t-[#DFE5ED] border-r-[#DFE5ED] border-b-[#DFE5ED]'
          : 'border-[#DFE5ED] hover:border-[#CBD5E1]'
      }`}
    >
      {/* 1. Label */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#637187] leading-tight">
            {label}
          </span>
          {Icon && (
            <Icon
              className={`w-4 h-4 shrink-0 ${
                isCritical ? 'text-[#C43D4B]' : 'text-[#6E87A5]'
              }`}
            />
          )}
        </div>

        {/* 2. Value */}
        <div className="flex items-baseline space-x-1.5 my-1.5">
          <span
            className={`text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums ${
              isCritical ? 'text-[#C43D4B]' : 'text-[#142B49]'
            }`}
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs font-semibold text-[#637187] tabular-nums">
              {unit}
            </span>
          )}
        </div>

        {/* 3. Context */}
        <p className="text-xs text-[#637187] leading-relaxed mt-1">
          {context}
        </p>
      </div>

      {/* 4. Status */}
      {statusText && (
        <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-[11px]">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-[4px] font-semibold border ${statusStyles[statusType]}`}
          >
            {statusText}
          </span>
        </div>
      )}
    </div>
  );
};

