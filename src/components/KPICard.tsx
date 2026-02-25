import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  estimated: number;
  actual: number;
  unit?: string;
  showPercentage?: boolean;
}

export default function KPICard({ title, estimated, actual, unit = '', showPercentage = true }: KPICardProps) {
  const gap = actual - estimated;
  const percentage = estimated > 0 ? ((actual / estimated) * 100) : 0;

  const status = percentage >= 105 ? 'ahead' : percentage >= 95 ? 'on-track' : 'behind';

  const statusColors = {
    ahead: 'bg-green-50 border-green-200',
    'on-track': 'bg-orange-50 border-orange-200',
    behind: 'bg-red-50 border-red-200'
  };

  const statusTextColors = {
    ahead: 'text-green-700',
    'on-track': 'text-orange-700',
    behind: 'text-red-700'
  };

  const statusIcons = {
    ahead: <TrendingUp className="w-5 h-5" />,
    'on-track': <Minus className="w-5 h-5" />,
    behind: <TrendingDown className="w-5 h-5" />
  };

  return (
    <div className={`bg-white rounded-xl border-2 ${statusColors[status]} p-6 shadow-sm`}>
      <h3 className="text-sm font-medium text-slate-600 mb-4">{title}</h3>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-500 mb-1">Estimé</p>
          <p className="text-2xl font-bold text-slate-900">
            {new Intl.NumberFormat('fr-FR').format(estimated)} {unit}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-1">Réel</p>
          <p className="text-2xl font-bold text-slate-900">
            {new Intl.NumberFormat('fr-FR').format(actual)} {unit}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${statusTextColors[status]}`}>
              {statusIcons[status]}
              <span className="font-semibold">
                {gap >= 0 ? '+' : ''}{new Intl.NumberFormat('fr-FR').format(gap)} {unit}
              </span>
            </div>

            {showPercentage && (
              <span className={`text-sm font-medium ${statusTextColors[status]}`}>
                {percentage.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
