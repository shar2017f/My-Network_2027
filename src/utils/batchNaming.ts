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

/**
 * Returns the Arabic ordinal name for a batch number (e.g. 1 -> "الدفعة الأولى", 2 -> "الدفعة الثانية")
 */
export function getBatchOrdinalName(batchNum: number): string {
  const ordinal = ORDINAL_ARABIC[batchNum];
  return ordinal ? `الدفعة ${ordinal}` : `الدفعة ${batchNum}`;
}

/**
 * Calculates or retrieves the sequence of the batch within its specific category (1st batch of 500, 2nd batch of 500, etc.)
 */
export function getCategoryBatchNumber(batch: Partial<PrintBatch>, allBatches: PrintBatch[] = []): number {
  if (batch.categoryBatchNumber && batch.categoryBatchNumber > 0) {
    return batch.categoryBatchNumber;
  }
  if (!batch.category || allBatches.length === 0) {
    return batch.batchNumber || 1;
  }
  const catBatches = allBatches
    .filter((b) => b.category === batch.category)
    .sort((a, b) => new Date(a.createdAt || a.date || '').getTime() - new Date(b.createdAt || b.date || '').getTime());
  const idx = catBatches.findIndex((b) => b.id === batch.id);
  return idx >= 0 ? idx + 1 : catBatches.length + 1;
}

/**
 * Formats a sheet label with both its leaf number and its batch in clear Arabic.
 * Examples:
 * - "شيت 2 من الدفعة الأولى"
 * - "شيت 1 من الدفعة الثانية"
 * - "شيت 15 من الدفعة الثانية"
 */
export function formatSheetWithBatch(
  sheet: SheetLeaf,
  batch?: PrintBatch,
  allBatches?: PrintBatch[]
): string {
  const b = batch || (allBatches ? allBatches.find((x) => x.id === sheet.batchId) : undefined);
  const catBatchNum = sheet.categoryBatchNumber || (b ? getCategoryBatchNumber(b, allBatches) : (sheet.batchNumber || 1));
  const batchName = getBatchOrdinalName(catBatchNum);
  return `شيت ${sheet.leafNumber} من ${batchName}`;
}

/**
 * Short badge format, e.g. "شيت #2 (الدفعة الأولى)"
 */
export function formatSheetBadge(
  sheet: SheetLeaf,
  batch?: PrintBatch,
  allBatches?: PrintBatch[]
): string {
  const b = batch || (allBatches ? allBatches.find((x) => x.id === sheet.batchId) : undefined);
  const catBatchNum = sheet.categoryBatchNumber || (b ? getCategoryBatchNumber(b, allBatches) : (sheet.batchNumber || 1));
  const ordinal = ORDINAL_ARABIC[catBatchNum] || `${catBatchNum}`;
  return `شيت #${sheet.leafNumber} (د.${ordinal})`;
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
  const bInfo = allBatches.find((b) => b.batchNumber === bNum || b.id.includes(String(bNum).padStart(3, '0')));
  const catBNum = bInfo ? getCategoryBatchNumber(bInfo, allBatches) : bNum;
  const batchName = getBatchOrdinalName(catBNum);
  return `شيت ${leafNum} من ${batchName}`;
}

/**
 * Groups multiple sheet codes by batch and formats them cleanly into readable Arabic.
 * Example output:
 * "شيت 2، 3 من الدفعة الأولى • شيت 1 إلى 5 من الدفعة الثانية"
 */
export function formatSheetListGrouped(
  sheetCodes: string[],
  allSheets: SheetLeaf[] = [],
  allBatches: PrintBatch[] = []
): string {
  if (!sheetCodes || sheetCodes.length === 0) return 'لا يوجد شيتات';

  // Group by resolved batch
  const groups = new Map<number, { batchName: string; leaves: number[] }>();

  sheetCodes.forEach((code) => {
    const s = allSheets.find((x) => x.sheetCode === code);
    let catBNum = 1;
    let leafNum = 1;

    if (s) {
      const bInfo = allBatches.find((b) => b.id === s.batchId);
      catBNum = s.categoryBatchNumber || (bInfo ? getCategoryBatchNumber(bInfo, allBatches) : (s.batchNumber || 1));
      leafNum = s.leafNumber;
    } else {
      const bMatch = code.match(/B(\d+)/);
      const sMatch = code.match(/S(\d+)/);
      const bNum = bMatch ? parseInt(bMatch[1], 10) : 1;
      leafNum = sMatch ? parseInt(sMatch[1], 10) : 1;
      const bInfo = allBatches.find((b) => b.batchNumber === bNum || b.id.includes(String(bNum).padStart(3, '0')));
      catBNum = bInfo ? getCategoryBatchNumber(bInfo, allBatches) : bNum;
    }

    if (!groups.has(catBNum)) {
      groups.set(catBNum, {
        batchName: getBatchOrdinalName(catBNum),
        leaves: [],
      });
    }
    if (!groups.get(catBNum)!.leaves.includes(leafNum)) {
      groups.get(catBNum)!.leaves.push(leafNum);
    }
  });

  const sortedBatchKeys = Array.from(groups.keys()).sort((a, b) => a - b);
  const parts: string[] = [];

  sortedBatchKeys.forEach((key) => {
    const group = groups.get(key)!;
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

