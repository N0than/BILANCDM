import { EstimatedData, ActualData, Target, TargetPerformance } from '../types';

function normalizeTargetName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^h(\d+)-(\d+)$/, 'hommes $1-$2')
    .replace(/^f(\d+)-(\d+)$/, 'femmes $1-$2')
    .replace(/^hommes\s+(\d+)-(\d+)$/, 'hommes $1-$2')
    .replace(/^femmes\s+(\d+)-(\d+)$/, 'femmes $1-$2')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getTodayDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function filterEstimatedDataByCutoff(
  estimatedData: EstimatedData[],
  cutoffDate: Date | null
): EstimatedData[] {
  if (!cutoffDate) return estimatedData;

  return estimatedData.filter(d => {
    const transposedDate = new Date(d.date_transposed);
    return transposedDate <= cutoffDate;
  });
}

export function filterActualDataByDevice(
  actualData: ActualData[],
  deviceProgramIds: string[]
): ActualData[] {
  return actualData.filter(d => {
    if (d.program_id === null) {
      return false;
    }
    return deviceProgramIds.includes(d.program_id);
  });
}

export function calculateTargetPerformances(
  estimatedData: EstimatedData[],
  actualData: ActualData[],
  targets: Target[],
  advertiserId: string | null,
  cutoffDate: Date | null,
  skipAdvertiserFilter: boolean = false
): TargetPerformance[] {
  const filteredEstimated = estimatedData;

  const filteredActual = (advertiserId && !skipAdvertiserFilter)
    ? actualData.filter(d => d.advertiser_id === advertiserId)
    : actualData;

  const estimatedWithCutoff = filterEstimatedDataByCutoff(filteredEstimated, cutoffDate);

  const targetMap = new Map<string, { originalName: string; targets: Target[] }>();
  targets.forEach(target => {
    const key = normalizeTargetName(target.name);
    if (!targetMap.has(key)) {
      targetMap.set(key, { originalName: target.name, targets: [] });
    }
    targetMap.get(key)!.targets.push(target);
  });

  return Array.from(targetMap.entries()).map(([normalizedKey, { originalName, targets: targetGroup }]) => {
    let estimated = 0;
    let actual = 0;

    targetGroup.forEach(target => {
      estimated += estimatedWithCutoff.reduce((sum, d) => {
        return sum + (d.target_performances[target.id] || 0);
      }, 0);

      actual += filteredActual.reduce((sum, d) => {
        return sum + (d.target_performances[target.id] || 0);
      }, 0);
    });

    const gap = actual - estimated;
    const delivery_rate = estimated > 0 ? (actual / estimated) * 100 : 0;

    let status: 'ahead' | 'on-track' | 'behind';
    if (delivery_rate >= 105) {
      status = 'ahead';
    } else if (delivery_rate >= 95) {
      status = 'on-track';
    } else {
      status = 'behind';
    }

    return {
      target_name: originalName,
      estimated,
      actual,
      gap,
      delivery_rate,
      status
    };
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0
  }).format(num);
}

export function formatPercentage(num: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(num) + '%';
}

