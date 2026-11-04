import { PrintBatch, SheetLeaf } from '../types';

export const ORDINAL_ARABIC: Record<number, string> = {
  1: 'الأولى',
  2: 'الثانية',
  3: 'الثالثة',
  4: 'الرابعة',
  5: 'الخامسة',
  6: 'السادسة',
  7: 'السابعة',
  8: 'الثامنة',
  9: 'التاسعة',
  10: 'العاشرة',
  11: 'الحادية عشرة',
  12: 'الثانية عشرة',
  13: 'الثالثة عشرة',
  14: 'الرابعة عشرة',
  15: 'الخامسة عشرة',
  16: 'السادسة عشرة',
  17: 'السابعة عشرة',
  18: 'الثامنة عشرة',
  19: 'التاسعة عشرة',
  20: 'العشرون',
};

export const ARABIC_MONTH_NAMES: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

/**
 * Returns clean Arabic month with year, e.g. "2026-11" -> "نوفمبر 2026"
 */
export function getArabicMonthName(monthStr?: string): string {
  if (!monthStr) return '';
  const clean = monthStr.trim();
  const parts = clean.split('-');
  if (parts.length >= 2) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const mName = ARABIC_MONTH_NAMES[m] || m;
    return `${mName} ${y}`;
  }
  return clean;
}

/**
 * Returns month name only without year, e.g. "2026-11" -> "نوفمبر"
 */
export function getArabicMonthOnly(monthStr?: string): string {
  if (!monthStr) return '';
  const clean = monthStr.trim();
  const parts = clean.split('-');
  if (parts.length >= 2) {
    const m = parts[1].padStart(2, '0');
    return ARABIC_MONTH_NAMES[m] || m;
  }
  return clean;
}

/**
 * Returns the Arabic ordinal name for a batch number (e.g. 1 -> "الدفعة الأولى", 2 -> "الدفعة الثانية")
 */
export function getBatchOrdinalName(batchNum: number): string {
  const ordinal = ORDINAL_ARABIC[batchNum];
  return ordinal ? `الدفعة ${ordinal}` : `الدفعة ${batchNum}`;
}

/**
 * Calculates or retrieves the sequence of the batch within its specific CATEGORY and its ACCOUNTING MONTH.
 * In a new month (e.g. November, December), the sequence resets to Batch 1 (الدفعة الأولى).
 */
export function getCategoryBatchNumber(
  batch: Partial<PrintBatch>,
  allBatches: PrintBatch[] = []
): number {
  const targetMonth = batch.accountingMonth || (batch.date ? batch.date.slice(0, 7) : '');

  if (!batch.category || allBatches.length === 0) {
    return batch.categoryBatchNumber || batch.batchNumber || 1;
  }

  // Filter batches of the SAME category AND SAME accounting month
  const monthCatBatches = allBatches
    .filter((b) => {
      if (b.category !== batch.category) return false;
      if (!targetMonth) return true;
      const bMonth = b.accountingMonth || (b.date ? b.date.slice(0, 7) : '');
      return bMonth === targetMonth;
    })
    .sort(
      (a, b) =>
        new Date(a.createdAt || a.date || '').getTime() -
        new Date(b.createdAt || b.date || '').getTime()
    );

  const idx = monthCatBatches.findIndex((b) => b.id === batch.id);
  if (idx >= 0) {
    return idx + 1;
  }

  // If already stored and non-zero
  if (batch.id && batch.categoryBatchNumber && batch.categoryBatchNumber > 0) {
    // Check if categoryBatchNumber was recorded within this month
    return batch.categoryBatchNumber;
  }

  // Next sequential batch number for this month and category
  return monthCatBatches.length + 1;
}

/**
 * Returns full batch title with month, e.g.:
 * "الدفعة الأولى (نوفمبر 2026)" or "الدفعة الثانية (نوفمبر 2026)"
 */
export function getBatchFullDisplayName(
  batch: Partial<PrintBatch>,
  allBatches: PrintBatch[] = []
): string {
  const catBNum = getCategoryBatchNumber(batch, allBatches);
  const ordinal = getBatchOrdinalName(catBNum);
  const month = batch.accountingMonth || (batch.date ? batch.date.slice(0, 7) : '');
  const monthName = getArabicMonthName(month);
  return monthName ? `${ordinal} (${monthName})` : ordinal;
}

/**
 * Formats a sheet label with both its leaf number and its batch in clear Arabic.
 * Examples:
 * - "شيت 2 من الدفعة الأولى (نوفمبر)"
 * - "شيت 1 من الدفعة الأولى"
 */
export function formatSheetWithBatch(
  sheet: SheetLeaf,
  batch?: PrintBatch,
  allBatches?: PrintBatch[]
): string {
  const b = batch || (allBatches ? allBatches.find((x) => x.id === sheet.batchId) : undefined);
  const catBatchNum =
    b && allBatches
      ? getCategoryBatchNumber(b, allBatches)
      : sheet.categoryBatchNumber ||
        (b ? getCategoryBatchNumber(b, allBatches) : sheet.batchNumber || 1);
  const batchName = getBatchOrdinalName(catBatchNum);
  const month = b?.accountingMonth || (b?.date ? b.date.slice(0, 7) : sheet.accountingMonth);
  const monthName = getArabicMonthOnly(month);
  const monthSuffix = monthName ? ` (${monthName})` : '';
  return `شيت ${sheet.leafNumber} من ${batchName}${monthSuffix}`;
}

/**
 * Short badge format, e.g. "شيت #2 (د.الأولى • نوفمبر)"
 */
export function formatSheetBadge(
  sheet: SheetLeaf,
  batch?: PrintBatch,
  allBatches?: PrintBatch[]
): string {
  const b = batch || (allBatches ? allBatches.find((x) => x.id === sheet.batchId) : undefined);
  const catBatchNum =
    b && allBatches
      ? getCategoryBatchNumber(b, allBatches)
      : sheet.categoryBatchNumber ||
        (b ? getCategoryBatchNumber(b, allBatches) : sheet.batchNumber || 1);
  const ordinal = ORDINAL_ARABIC[catBatchNum] || `${catBatchNum}`;
  const month = b?.accountingMonth || (b?.date ? b.date.slice(0, 7) : sheet.accountingMonth);
  const monthName = getArabicMonthOnly(month);
  const suffix = monthName ? ` • ${monthName}` : '';
  return `شيت #${sheet.leafNumber} (د.${ordinal}${suffix})`;
}

/**
 * Resolves a sheetCode string (e.g. "QZ-500-B2-S003") to a friendly Arabic label even if SheetLeaf object is missing.
 */
export function formatSheetCodeWithBatch(
  sheetCode: string,
  allSheets: SheetLeaf[] = [],
  allBatches: PrintBatch[] = []
): string {
  const found = allSheets.find((s) => s.sheetCode === sheetCode);
  if (found) {
    return formatSheetWithBatch(found, undefined, allBatches);
  }
  const bMatch = sheetCode.match(/B(\d+)/);
  const sMatch = sheetCode.match(/S(\d+)/);
  const bNum = bMatch ? parseInt(bMatch[1], 10) : 1;
  const leafNum = sMatch ? parseInt(sMatch[1], 10) : 1;
  const bInfo = allBatches.find(
    (b) => b.batchNumber === bNum || b.id.includes(String(bNum).padStart(3, '0'))
  );
  const catBNum = bInfo ? getCategoryBatchNumber(bInfo, allBatches) : bNum;
  const batchName = getBatchOrdinalName(catBNum);
  const month = bInfo?.accountingMonth || (bInfo?.date ? bInfo.date.slice(0, 7) : '');
  const monthName = getArabicMonthOnly(month);
  const monthSuffix = monthName ? ` (${monthName})` : '';
  return `شيت ${leafNum} من ${batchName}${monthSuffix}`;
}

/**
 * Groups multiple sheet codes by batch and formats them cleanly into readable Arabic.
 * Correctly distinguishes batches across different months.
 * Example output:
 * "شيت 1 إلى 5 من الدفعة الأولى (نوفمبر) • شيت 2 من الدفعة الأولى (أكتوبر)"
 */
export function formatSheetListGrouped(
  sheetCodes: string[],
  allSheets: SheetLeaf[] = [],
  allBatches: PrintBatch[] = []
): string {
  if (!sheetCodes || sheetCodes.length === 0) return 'لا يوجد شيتات';

  // Group by resolved batch identifier (batchId or resolved key)
  const groups = new Map<string, { batchName: string; leaves: number[]; sortOrder: number }>();

  sheetCodes.forEach((code) => {
    const s = allSheets.find((x) => x.sheetCode === code);
    let catBNum = 1;
    let leafNum = 1;
    let groupKey = 'batch-default';
    let monthName = '';

    if (s) {
      const bInfo = allBatches.find((b) => b.id === s.batchId);
      catBNum =
        bInfo && allBatches.length > 0
          ? getCategoryBatchNumber(bInfo, allBatches)
          : s.categoryBatchNumber ||
            (bInfo ? getCategoryBatchNumber(bInfo, allBatches) : s.batchNumber || 1);
      leafNum = s.leafNumber;
      groupKey = s.batchId || `batch-${catBNum}`;
      const m = bInfo?.accountingMonth || (bInfo?.date ? bInfo.date.slice(0, 7) : s.accountingMonth);
      monthName = getArabicMonthOnly(m);
    } else {
      const bMatch = code.match(/B(\d+)/);
      const sMatch = code.match(/S(\d+)/);
      const bNum = bMatch ? parseInt(bMatch[1], 10) : 1;
      leafNum = sMatch ? parseInt(sMatch[1], 10) : 1;
      const bInfo = allBatches.find(
        (b) => b.batchNumber === bNum || b.id.includes(String(bNum).padStart(3, '0'))
      );
      catBNum = bInfo ? getCategoryBatchNumber(bInfo, allBatches) : bNum;
      groupKey = bInfo?.id || `b-${bNum}`;
      const m = bInfo?.accountingMonth || (bInfo?.date ? bInfo.date.slice(0, 7) : '');
      monthName = getArabicMonthOnly(m);
    }

    const monthSuffix = monthName ? ` (${monthName})` : '';
    const fullBatchName = `${getBatchOrdinalName(catBNum)}${monthSuffix}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        batchName: fullBatchName,
        leaves: [],
        sortOrder: catBNum,
      });
    }
    if (!groups.get(groupKey)!.leaves.includes(leafNum)) {
      groups.get(groupKey)!.leaves.push(leafNum);
    }
  });

  const sortedGroups = Array.from(groups.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  const parts: string[] = [];

  sortedGroups.forEach((group) => {
    const sortedLeaves = group.leaves.sort((a, b) => a - b);

    // Check if continuous sequence of 3 or more (e.g. 1..15)
    let isContinuous = sortedLeaves.length >= 3;
    if (isContinuous) {
      for (let i = 1; i < sortedLeaves.length; i++) {
        if (sortedLeaves[i] !== sortedLeaves[i - 1] + 1) {
          isContinuous = false;
          break;
        }
      }
    }

    let leafText = '';
    if (isContinuous) {
      leafText = `شيت ${sortedLeaves[0]} إلى ${sortedLeaves[sortedLeaves.length - 1]}`;
    } else {
      leafText = `شيت ${sortedLeaves.join('، ')}`;
    }

    parts.push(`${leafText} من ${group.batchName}`);
  });

  return parts.join(' • ');
}
