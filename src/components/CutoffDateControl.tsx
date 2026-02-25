import React from 'react';
import { Calendar } from 'lucide-react';
import { useCutoffDate } from '../contexts/CutoffContext';
import { formatDate } from '../utils/dateUtils';

export default function CutoffDateControl() {
  const { cutoffDate, setCutoffDate } = useCutoffDate();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    newDate.setHours(0, 0, 0, 0);
    setCutoffDate(newDate);
  };

  const dateString = cutoffDate.toISOString().split('T')[0];

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-4 py-2">
      <Calendar className="w-4 h-4 text-slate-600" />
      <input
        type="date"
        value={dateString}
        onChange={handleDateChange}
        className="text-sm font-medium text-slate-700 cursor-pointer focus:outline-none"
      />
      <span className="text-xs text-slate-500">
        {formatDate(cutoffDate)}
      </span>
    </div>
  );
}
