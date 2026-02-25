export function transposeDate(date2025: Date): Date {
  const transposed = new Date(date2025);
  transposed.setFullYear(transposed.getFullYear() + 1);
  return transposed;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function parseExcelDate(excelDate: number): Date {
  const baseDate = new Date(1900, 0, 1);
  const days = excelDate - 2;
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
}

export function parseFlexibleDate(dateValue: any): Date | null {
  if (!dateValue && dateValue !== 0) return null;

  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim();
    const parts = trimmed.split('/');

    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);

      if (year < 100) {
        year += 2000;
      }

      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && month >= 0 && month < 12) {
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
  }

  return null;
}
