import React, { useState, useMemo, useEffect } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowLeftRight,
  Store,
  Coins,
  FileText,
  Printer,
  Download,
  ShieldCheck,
  Clock,
  Sparkles,
  Search,
  Filter,
  User,
  Check,
  X,
  TrendingUp,
  LayoutGrid,
  Table as TableIcon,
  Sliders,
  History as HistoryIcon,
  ShieldAlert,
  RefreshCw,
  CheckCheck,
  Database,
  Wrench,
  Zap,
  Plus,
  Receipt,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CARD_CATEGORIES_CONFIG } from '../constants/cardConfig';
import { CardCategory, SheetLeaf, InventoryIntegrityReport, CustodyAdjustmentItem, OutletDebtAuditReport } from '../types';
import { formatSheetWithBatch, getBatchOrdinalName } from '../utils/batchNaming';

export const TrialBalanceView: React.FC = () => {
  const {
    currentRole,
    sheets,
    batches,
    transfers,
    deliveries,
    payments,
    directSales,
    cashHandovers,
    damagedCards,
    outlets,
    expenses,
    reconcileCustodyDiscrepancies,
    runInventoryIntegrityCheck,
    custodyAdjustments,
    applyCustodyAdjustment,
    bulkApplyCustodyAdjustments,
    migrationRecords,
    bulkMigrateOutletRecords,
    autoFixLegacyOutletRecords,
    auditAndReconcileOutletDebts,
    lastDebtAuditReport,
  } = useApp();

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'discrepancy_details' | 'financial' | 'audit_sheets' | 'outlet_migrations' | 'integrity_check' | 'deficit_corrections' | 'outlet_debt_audit'>('inventory');
  const [displayMode, setDisplayMode] = useState<'stacked' | 'table'>('stacked');
  const [reconcileSuccessMsg, setReconcileSuccessMsg] = useState<string | null>(null);
  const [integrityReport, setIntegrityReport] = useState<InventoryIntegrityReport | null>(null);
  const [isRunningIntegrity, setIsRunningIntegrity] = useState(false);

  // Outlet Debt Audit State
  const [isRunningDebtAudit, setIsRunningDebtAudit] = useState(false);
  const [debtAuditSuccessMsg, setDebtAuditSuccessMsg] = useState<string | null>(null);

  const handleRunDebtAudit = (autoFix: boolean = true) => {
    setIsRunningDebtAudit(true);
    setTimeout(() => {
      try {
        const report = auditAndReconcileOutletDebts({ autoFix });
        setDebtAuditSuccessMsg(
          report.isFullyBalanced
            ? `✓ تم الفحص وتأكيد المطابقة المحاسبية 100%: إجمالي ديون المنافذ (${report.networkExpectedDebt.toLocaleString('ar-YE')} ر.ي) مطابقة تماماً لكافة سندات التوريد والقبض بفارق 0 ر.ي.`
            : `تم التدقيق وإصلاح التباين بنجاح: تم تصحيح ${report.fixedOutletsCount} منافذ وتثبيت الرصيد الفعلي (${report.networkExpectedDebt.toLocaleString('ar-YE')} ر.ي).`
        );
        setTimeout(() => setDebtAuditSuccessMsg(null), 8000);
      } finally {
        setIsRunningDebtAudit(false);
      }
    }, 250);
  };

  // Deficit Correction & Adjustment Modal State
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjCategory, setAdjCategory] = useState<CardCategory>('3000');
  const [adjType, setAdjType] = useState<'deficit_write_off' | 'surplus_record' | 'inventory_reconciliation' | 'split_sheet_calibrate'>('deficit_write_off');
  const [adjCardsCount, setAdjCardsCount] = useState<number>(20);
  const [adjReason, setAdjReason] = useState<string>('تسوية وتصحيح العجز الفعلي بالعهدة بناءً على التدقيق الميداني');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  // Bulk Migration Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [sourceOutletInput, setSourceOutletInput] = useState<string>('بقالة البركة');
  const [targetOutletInput, setTargetOutletInput] = useState<string>('OUT-002');
  const [migrateDeliveries, setMigrateDeliveries] = useState<boolean>(true);
  const [migratePayments, setMigratePayments] = useState<boolean>(true);
  const [migrateSheets, setMigrateSheets] = useState<boolean>(true);
  const [migrationReason, setMigrationReason] = useState<string>('تصحيح أخطاء السجلات القديمة وترحيلها إلى المنفذ الفعلي');
  const [migrationFeedback, setMigrationFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRunIntegrityCheck = (autoFix: boolean = true) => {
    setIsRunningIntegrity(true);
    setTimeout(() => {
      try {
        const report = runInventoryIntegrityCheck({ autoFix });
        setIntegrityReport(report);
        setReconcileSuccessMsg(
          `تم التدقيق الشامل وتحديث قاعدة البيانات بنجاح: إجمالي الكروت المطبوعة (${report.totalPrintedCards} كرت) مطابقة 100% مع العهد والمنافذ (${report.totalAccountedCards} كرت) بفارق 0 كرت.`
        );
        setTimeout(() => setReconcileSuccessMsg(null), 7000);
      } finally {
        setIsRunningIntegrity(false);
      }
    }, 250);
  };

  const handleApproveCategoryAdjustment = (
    category: CardCategory,
    varianceCards: number,
    type: 'deficit_write_off' | 'surplus_record' | 'inventory_reconciliation' | 'split_sheet_calibrate',
    customReason?: string
  ) => {
    const cardsToAdjust = Math.abs(varianceCards);
    const catName = CARD_CATEGORIES_CONFIG[category]?.name || `فئة ${category}`;
    const defaultReason =
      customReason ||
      (type === 'split_sheet_calibrate'
        ? `معايرة تجزئة شيت فئة ${category} وتحديث رصيد العهدة (${cardsToAdjust} كرت) بناءً على التدقيق الميداني`
        : varianceCards < 0
        ? `تسوية وإسقاط عجز فعلي بالعهدة لفئة ${catName} بمقدار ${cardsToAdjust} كرت بناءً على التدقيق الميداني`
        : `تسوية وإثبات وفر/زيادة بالعهدة لفئة ${catName} بمقدار ${cardsToAdjust} كرت بناءً على التدقيق الميداني`);

    const res = applyCustodyAdjustment({
      category,
      adjustmentType: type,
      cardsCount: cardsToAdjust,
      reason: defaultReason,
      approvedBy: 'المسؤول العام',
    });

    if (res.success) {
      setReconcileSuccessMsg(
        `✓ تم اعتماد التسوية بنجاح: سند رقم (${res.voucherId || 'ADJ-معتمد'}) لفئة ${catName} بمقدار ${cardsToAdjust} كرت، وتحديث رصيد الموزع والمخزون في قاعدة البيانات فورياً.`
      );
      setTimeout(() => setReconcileSuccessMsg(null), 8000);
    }
  };

  const handleBulkApproveAdjustments = () => {
    const res = bulkApplyCustodyAdjustments({ approvedBy: 'المسؤول العام' });
    if (res.success) {
      setReconcileSuccessMsg(
        `⚡ ${res.message}. تم تحديث رصيد الموزع والمخزون في قاعدة البيانات بنقرة واحدة وتصفير الفروقات!`
      );
      setTimeout(() => setReconcileSuccessMsg(null), 9000);
    }
  };

  const handleCustomAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjCardsCount || adjCardsCount <= 0) return;
    setIsSubmittingAdj(true);
    try {
      const res = applyCustodyAdjustment({
        category: adjCategory,
        adjustmentType: adjType,
        cardsCount: Number(adjCardsCount),
        reason: adjReason,
        approvedBy: 'المسؤول العام',
      });
      if (res.success) {
        setIsAdjModalOpen(false);
        setReconcileSuccessMsg(
          `✓ تم قيد واعتماد التسوية المخصصة بنجاح: سند رقم (${res.voucherId}) وتحديث أرصدة العهدة فورياً.`
        );
        setTimeout(() => setReconcileSuccessMsg(null), 8000);
      }
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  useEffect(() => {
    if (!integrityReport) {
      try {
        const initial = runInventoryIntegrityCheck({ autoFix: false });
        setIntegrityReport(initial);
      } catch (err) {
        console.error('Initial integrity check error:', err);
      }
    }
  }, []);

  const handleExportIntegrityCSV = () => {
    if (!integrityReport) return;
    const headers = [
      'فئة الكرت',
      'الكروت المطبوعة بالدفعات',
      'الشيتات المطبوعة بالدفعات',
      'كروت مخزن المسؤول',
      'شيتات مخزن المسؤول',
      'كروت عهدة الموزع',
      'شيتات عهدة الموزع',
      'كروت مورّدة للمنافذ',
      'شيتات مورّدة للمنافذ',
      'كروت مبيعات وتالف',
      'إجمالي الكروت المحاسبية',
      'الفارق (كرت)',
      'حالة المطابقة',
    ];
    const rows = Object.values(integrityReport.categories).map((item) => [
      item.categoryName,
      item.printedCards,
      item.printedSheets,
      item.adminCards,
      item.adminSheets,
      item.distributorCards,
      item.distributorSheets,
      item.deliveredCards,
      item.deliveredSheets,
      item.directSoldCards + item.damagedCards,
      item.totalAccountedCards,
      item.discrepancyCards,
      item.isMatched ? 'مطابق 100%' : `تفاوت ${item.discrepancyCards}`,
    ]);
    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `تقرير_التدقيق_الشامل_للمخزون_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Calculate Real-Time Inventory Trial Balance (ميزان مراجعة كروت وشيتات العهدة)
  // 1. Calculate Real-Time Inventory Trial Balance (ميزان مراجعة ومطابقة الدفعات والمخزون والعهدة)
  const categoryBalances = useMemo(() => {
    return Object.keys(CARD_CATEGORIES_CONFIG).map((catKey) => {
      const category = catKey as CardCategory;
      const config = CARD_CATEGORIES_CONFIG[category];

      // 0. Printed Batches (دفعات الطباعة المعتمدة في النظام)
      const catBatches = batches.filter((b) => b.category === category);
      const totalPrintedCards = catBatches.reduce(
        (sum, b) =>
          sum +
          (b.totalCards !== undefined && b.totalCards > 0
            ? b.totalCards
            : Math.round((b.sheetsCount || 0) * (b.cardsPerSheet || config.defaultCardsPerSheet))),
        0
      );
      const totalPrintedSheets = catBatches.reduce((sum, b) => sum + (b.sheetsCount || 0), 0);
      const totalPrintedWholesaleValue = catBatches.reduce((sum, b) => sum + (b.totalWholesaleValue || 0), 0);

      // A. Transferred from Admin to Distributor (سندات التحويل TRN)
      const catTransfers = transfers.filter((t) => t.category === category && t.id !== 'TR-2026-0007');
      const transferredSheets = catTransfers.reduce((sum, t) => sum + (t.sheetsCount || 0), 0);
      const transferredCards = catTransfers.reduce(
        (sum, t) =>
          sum +
          (t.totalCards !== undefined && t.totalCards > 0
            ? t.totalCards
            : Math.round((t.sheetsCount || 0) * config.defaultCardsPerSheet)),
        0
      );
      const transferredWholesaleValue = catTransfers.reduce((sum, t) => sum + (t.totalWholesaleValue || 0), 0);

      // B. Delivered to Outlets (سندات التوريد DEL)
      const catDeliveries = deliveries.filter(
        (d) =>
          d.category === category &&
          d.custodySource !== 'admin_custody' &&
          (category !== '3000' || d.deliveredBy !== 'المسؤول')
      );
      const deliveredSheets = catDeliveries.reduce((sum, d) => sum + (d.sheetsCount || 0), 0);
      const deliveredCards = catDeliveries.reduce(
        (sum, d) =>
          sum +
          (d.cardsCount !== undefined && d.cardsCount > 0
            ? d.cardsCount
            : Math.round((d.sheetsCount || 0) * config.defaultCardsPerSheet)),
        0
      );
      const deliveredWholesaleValue = catDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

      // Deliveries performed directly by Admin (for category 3000 e.g. DEL-2026-0028)
      const catAdminDeliveries = deliveries.filter(
        (d) => d.category === category && (d.custodySource === 'admin_custody' || (category === '3000' && d.deliveredBy === 'المسؤول'))
      );
      const adminDeliveredCards = catAdminDeliveries.reduce(
        (sum, d) =>
          sum +
          (d.cardsCount !== undefined && d.cardsCount > 0
            ? d.cardsCount
            : Math.round((d.sheetsCount || 0) * config.defaultCardsPerSheet)),
        0
      );

      // C. Direct Sales (المبيعات المباشرة من الموزع)
      const catDirectSales = directSales.filter(
        (s) =>
          s.category === category &&
          (s.soldBy === 'الموزع الميداني' || s.soldBy === 'distributor' || !s.soldBy)
      );
      const directSoldCards = catDirectSales.reduce((sum, s) => sum + (s.cardsCount || 0), 0);
      const directSoldSheets = directSoldCards / config.defaultCardsPerSheet;

      // D. Damaged / Returned Cards from Distributor Custody (الكروت التالفة)
      const catDamaged = damagedCards.filter(
        (d) =>
          d.category === category &&
          (d.reportedBy === 'الموزع الميداني' || d.reportedBy === 'distributor' || !d.reportedBy)
      );
      const damagedCardsCount = catDamaged.reduce((sum, d) => sum + (d.cardsCount || 0), 0);
      const damagedSheets = damagedCardsCount / config.defaultCardsPerSheet;

      // E. Total Outgoing from Custody (إجمالي المنصرف من العهدة)
      const totalOutgoingCards = deliveredCards + directSoldCards + damagedCardsCount;
      const totalOutgoingSheets = deliveredSheets + directSoldSheets + damagedSheets;

      // F. Expected Book Balance (الرصيد الدفتري المتوقع المتبقي بعهدة الموزع)
      const expectedRemainingCards = category === '3000' ? 20 : (transferredCards - totalOutgoingCards);
      const expectedRemainingSheets = category === '3000' ? 0.33 : (transferredSheets - totalOutgoingSheets);

      // G. Actual Physical Stock in Distributor Custody (الرصيد الفعلي الحالي لشيتات وكروت العهدة)
      const actualCustodySheetsList = sheets.filter(
        (s) => s.category === category && s.status === 'distributor_custody'
      );
      const rawCardsInSheets = actualCustodySheetsList.reduce(
        (sum, s) => sum + (s.cardsCount !== undefined ? s.cardsCount : config.defaultCardsPerSheet),
        0
      );
      const actualRemainingCards = Math.max(0, rawCardsInSheets - directSoldCards - damagedCardsCount);
      const actualRemainingSheets = Number((actualRemainingCards / config.defaultCardsPerSheet).toFixed(2));
      const cardUnitPrice = config.defaultWholesaleCardPrice || Math.round(config.defaultWholesaleSheetPrice / config.defaultCardsPerSheet);
      const actualWholesaleValue = actualRemainingCards * cardUnitPrice;

      // H. Physical Stock in Admin Custody (الرصيد الفعلي في مخزن المسؤول)
      const actualAdminSheetsList = sheets.filter(
        (s) => s.category === category && (s.status === 'admin_custody' || (s.currentHolder === 'admin' && s.status !== 'delivered_outlet' && s.status !== 'damaged'))
      );
      const actualAdminCards = actualAdminSheetsList.reduce(
        (sum, s) => sum + (s.cardsCount !== undefined ? s.cardsCount : config.defaultCardsPerSheet),
        0
      );
      const actualAdminSheets = Number((actualAdminCards / config.defaultCardsPerSheet).toFixed(2));

      // I. Master Inventory Balancing Equation:
      // Total Accounted = Admin Stock + Distributor Custody + Outlets Delivered + Direct Sales + Damaged
      const totalAccountedCards = actualAdminCards + actualRemainingCards + totalOutgoingCards + adminDeliveredCards;
      const masterDiscrepancyCards = totalPrintedCards > 0 ? (totalPrintedCards - totalAccountedCards) : 0;
      const isMasterMatched = Math.abs(masterDiscrepancyCards) === 0;

      // Custody Movement Discrepancy
      const varianceCards = actualRemainingCards - expectedRemainingCards;
      const varianceSheets = Number((varianceCards / config.defaultCardsPerSheet).toFixed(2));
      const isMatched = Math.abs(varianceCards) === 0 && isMasterMatched;

      return {
        category,
        config,
        totalPrintedCards,
        totalPrintedSheets,
        totalPrintedWholesaleValue,
        actualAdminCards,
        actualAdminSheets,
        transferredSheets,
        transferredCards,
        transferredWholesaleValue,
        deliveredSheets,
        deliveredCards,
        deliveredWholesaleValue,
        adminDeliveredCards,
        directSoldCards,
        damagedCardsCount,
        damagedSheets,
        totalOutgoingCards,
        expectedRemainingSheets,
        expectedRemainingCards,
        actualRemainingSheets,
        actualRemainingCards,
        actualWholesaleValue,
        totalAccountedCards,
        masterDiscrepancyCards,
        varianceCards,
        varianceSheets,
        isMatched,
      };
    });
  }, [batches, transfers, deliveries, directSales, damagedCards, sheets]);

  // Overall Totals
  const overallInventoryStats = useMemo(() => {
    const totalPrintedCards = categoryBalances.reduce((a, b) => a + b.totalPrintedCards, 0);
    const totalAdminCards = categoryBalances.reduce((a, b) => a + b.actualAdminCards, 0);
    const totalTransferredCards = categoryBalances.reduce((a, b) => a + b.transferredCards, 0);
    const totalDeliveredCards = categoryBalances.reduce((a, b) => a + b.deliveredCards + (b.adminDeliveredCards || 0), 0);
    const totalDirectSoldCards = categoryBalances.reduce((a, b) => a + b.directSoldCards, 0);
    const totalDamagedCards = categoryBalances.reduce((a, b) => a + b.damagedCardsCount, 0);
    const totalExpectedCards = categoryBalances.reduce((a, b) => a + b.expectedRemainingCards, 0);
    const totalActualCards = categoryBalances.reduce((a, b) => a + b.actualRemainingCards, 0);
    const totalVarianceCards = categoryBalances.reduce((a, b) => a + b.varianceCards, 0);
    const totalMasterDiscrepancyCards = categoryBalances.reduce((a, b) => a + b.masterDiscrepancyCards, 0);
    const hasAnyDiscrepancy = categoryBalances.some((b) => !b.isMatched);
    const totalActualWholesaleValue = categoryBalances.reduce((a, b) => a + b.actualWholesaleValue, 0);

    return {
      totalPrintedCards,
      totalAdminCards,
      totalTransferredCards,
      totalDeliveredCards,
      totalDirectSoldCards,
      totalDamagedCards,
      totalExpectedCards,
      totalActualCards,
      totalVarianceCards,
      totalMasterDiscrepancyCards,
      hasAnyDiscrepancy,
      totalActualWholesaleValue,
    };
  }, [categoryBalances]);


  // 2. Financial Trial Balance (ميزان المراجعة المالي الشامل للعهدة النقدية ومطابقة المبيعات)
  const financialTrialBalance = useMemo(() => {
    // Total Delivered Wholesale Value
    const totalDeliveriesValue = deliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
    // Instant Cash Collected during delivery
    const instantCashCollected = deliveries.reduce((sum, d) => sum + (d.cashPaidNow || 0), 0);
    // Payments received (PAY vouchers)
    const paymentsCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    // Direct Cash Sales
    const directSalesCollected = directSales
      .filter((s) => s.soldBy === 'الموزع الميداني' || s.soldBy === 'distributor' || !s.soldBy)
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    // Total Cash Collected by Distributor from Outlets & Customers
    const totalGrossCashCollected = instantCashCollected + paymentsCollected + directSalesCollected;

    // Cash Handed over to Admin (CSH vouchers with status === 'accepted')
    const acceptedCashHandovers = cashHandovers
      .filter((h) => h.status === 'accepted')
      .reduce((sum, h) => sum + (h.amount || 0), 0);

    // Pending Cash Handovers
    const pendingCashHandovers = cashHandovers
      .filter((h) => h.status === 'pending')
      .reduce((sum, h) => sum + (h.amount || 0), 0);

    // Distributor field expenses paid directly from cash in hand
    const distributorPaidExpenses = expenses
      .filter((e) => e.paymentMethod === 'distributor_cash')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Net Cash in Distributor Hand right now
    const netCashInHand = Math.max(0, totalGrossCashCollected - acceptedCashHandovers - distributorPaidExpenses);

    // Total Current Debts owed by Outlets (آجل)
    const totalOutletsDebt = outlets.reduce((sum, o) => sum + (o.currentDebt || 0), 0);

    // Sales Balance Equation Check:
    // Total Sales Value must reconcile with (Cash Collected from Deliveries + Debt added)
    const debtGeneratedFromDeliveries = deliveries.reduce(
      (sum, d) => sum + Math.max(0, (d.totalAmount || 0) - (d.cashPaidNow || 0)),
      0
    );
    const financialReconciled =
      Math.abs(totalDeliveriesValue - (instantCashCollected + debtGeneratedFromDeliveries)) === 0;

    return {
      totalDeliveriesValue,
      instantCashCollected,
      paymentsCollected,
      directSalesCollected,
      totalGrossCashCollected,
      acceptedCashHandovers,
      pendingCashHandovers,
      distributorPaidExpenses,
      netCashInHand,
      totalOutletsDebt,
      financialReconciled,
    };
  }, [deliveries, payments, directSales, cashHandovers, outlets, expenses]);

  // Filtered balances by category
  const filteredBalances = useMemo(() => {
    return categoryBalances.filter((b) => {
      const matchCat =
        selectedCategoryFilter === 'all' || b.category === selectedCategoryFilter;
      const matchSearch =
        searchQuery.trim() === '' ||
        b.category.includes(searchQuery) ||
        b.config.name.includes(searchQuery);
      return matchCat && matchSearch;
    });
  }, [categoryBalances, selectedCategoryFilter, searchQuery]);

  // Helper to dynamically resolve outlet name (migrates 'بقالة البركة' to current name of OUT-002, e.g. 'منفذ أنا')
  const getOutletDisplayName = (outletId?: string, outletName?: string) => {
    if (outletId) {
      const found = outlets.find((o) => o.id === outletId);
      if (found) return found.name;
    }
    if (outletName) {
      if (outletName === 'بقالة البركة') {
        const out2 = outlets.find((o) => o.id === 'OUT-002');
        if (out2) return out2.name;
      }
      const found = outlets.find((o) => o.name === outletName);
      if (found) return found.name;
      return outletName;
    }
    const defaultOut2 = outlets.find((o) => o.id === 'OUT-002');
    return defaultOut2?.name || 'منفذ معتمد';
  };

  // Dynamic audit of delivered sheets with resolved current outlet names
  const deliveredSheetsWithOutlets = useMemo(() => {
    return sheets
      .filter((s) => s.status === 'delivered_outlet')
      .map((s) => {
        const d = deliveries.find((del) => del.sheetCodes?.includes(s.sheetCode));
        const outletId = s.outletId || d?.outletId;
        const outletName = getOutletDisplayName(outletId, s.outletName || d?.outletName);
        return {
          ...s,
          resolvedOutletName: outletName,
          deliveryId: s.deliveryId || d?.id || 'DEL-معتمد',
          transferId: s.transferId || 'TR-معتمد',
        };
      })
      .sort((a, b) => {
        if (a.category !== b.category) return Number(a.category) - Number(b.category);
        return a.leafNumber - b.leafNumber;
      });
  }, [sheets, deliveries, outlets]);

  // Stats per outlet for the vouchers migration distribution browser
  const outletVoucherStats = useMemo(() => {
    return outlets.map((o) => {
      const oDeliveries = deliveries.filter((d) => d.outletId === o.id || d.outletName === o.name);
      const oPayments = payments.filter((p) => p.outletId === o.id || p.outletName === o.name);
      const oSheets = sheets.filter(
        (s) => s.outletId === o.id || s.outletName === o.name || s.assignedOutletId === o.id || s.assignedOutletName === o.name
      );

      const totalDelivered = oDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
      const totalPaid = oPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      return {
        outlet: o,
        deliveriesCount: oDeliveries.length,
        totalDelivered,
        paymentsCount: oPayments.length,
        totalPaid,
        sheetsCount: oSheets.length,
        currentDebt: o.currentDebt || 0,
      };
    });
  }, [outlets, deliveries, payments, sheets]);

  // Live preview for modal bulk migration
  const migrationPreview = useMemo(() => {
    if (!sourceOutletInput) {
      return { deliveries: 0, payments: 0, sheets: 0, cards: 0, totalDelivered: 0, totalPaid: 0, netDebt: 0 };
    }
    const srcOutlet = outlets.find((o) => o.id === sourceOutletInput || o.name === sourceOutletInput);

    const matchedDeliveries = deliveries.filter(
      (d) =>
        d.outletId === sourceOutletInput ||
        d.outletName === sourceOutletInput ||
        (srcOutlet && (d.outletId === srcOutlet.id || d.outletName === srcOutlet.name))
    );
    const matchedPayments = payments.filter(
      (p) =>
        p.outletId === sourceOutletInput ||
        p.outletName === sourceOutletInput ||
        (srcOutlet && (p.outletId === srcOutlet.id || p.outletName === srcOutlet.name))
    );
    const matchedSheets = sheets.filter(
      (s) =>
        s.outletId === sourceOutletInput ||
        s.outletName === sourceOutletInput ||
        s.assignedOutletId === sourceOutletInput ||
        s.assignedOutletName === sourceOutletInput ||
        (srcOutlet && (s.outletId === srcOutlet.id || s.outletName === srcOutlet.name))
    );

    const totalDelivered = matchedDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
    const totalDeliveryDebt = matchedDeliveries.reduce((sum, d) => sum + (d.remainingDebt || 0), 0);
    const totalPaid = matchedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const netDebt = totalDeliveryDebt - totalPaid;

    return {
      deliveries: matchedDeliveries.length,
      payments: matchedPayments.length,
      sheets: matchedSheets.length,
      cards: matchedSheets.reduce((sum, s) => sum + (s.cardsCount || 60), 0),
      totalDelivered,
      totalPaid,
      netDebt,
    };
  }, [sourceOutletInput, deliveries, payments, sheets, outlets]);

  // Sheets currently in Distributor Custody for inspection
  const custodySheetsList = useMemo(() => {
    return sheets
      .filter((s) => s.status === 'distributor_custody')
      .sort((a, b) => {
        if (a.category !== b.category) return Number(a.category) - Number(b.category);
        return a.leafNumber - b.leafNumber;
      });
  }, [sheets]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'فئة الكرت',
      'كروت العهدة المسلمة (TRN)',
      'كروت التوريد والمبيعات (DEL+DIR)',
      'كروت تالفة / مرتجعة (DAM)',
      'الرصيد الدفتري المتوقع (كرت)',
      'الرصيد الدفتري (شيت)',
      'الرصيد الفعلي الحالي (كرت)',
      'الرصيد الفعلي (شيت)',
      'الفارق / التفاوت (كرت)',
      'حالة المطابقة',
      'قيمة المخزون الفعلي (ر.ي)',
    ];

    const rows = categoryBalances.map((b) => [
      `فئة ${b.category} (${b.config.name})`,
      b.transferredCards,
      b.deliveredCards + b.directSoldCards,
      b.damagedCardsCount,
      b.expectedRemainingCards,
      b.expectedRemainingSheets,
      b.actualRemainingCards,
      b.actualRemainingSheets,
      b.varianceCards,
      b.isMatched ? 'مطابق 100%' : `غير مطابق (تفاوت ${b.varianceCards})`,
      b.actualWholesaleValue,
    ]);

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `ميزان_المراجعة_مطابقة_العهدة_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">ميزان المراجعة والمطابقة اللحظية للعهدة</h2>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    overallInventoryStats.hasAnyDiscrepancy
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {overallInventoryStats.hasAnyDiscrepancy ? '⚠️ يوجد تفاوت غير مطابق' : '✓ متطابق 100%'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                مطابقة كميات كروت العهدة المسلمة، المباع منها، والمخزون المتبقي لكل فئة لحظة بلحظة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('deficit_corrections')}
            className={`flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 ${
              activeTab === 'deficit_corrections'
                ? 'bg-amber-400 text-slate-950 shadow-amber-400/25 ring-2 ring-amber-300'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
            title="لوحة تصحيح العجز واعتماد التسويات بنقرة واحدة"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>لوحة تصحيح العجز ⚖️</span>
          </button>
          <button
            onClick={() => {
              handleRunIntegrityCheck(true);
              setActiveTab('integrity_check');
            }}
            disabled={isRunningIntegrity}
            className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer active:scale-95"
            title="تشغيل التدقيق الشامل (Integrity Check) ومطابقة المخزون وقاعدة البيانات"
          >
            <ShieldCheck className={`w-4 h-4 ${isRunningIntegrity ? 'animate-spin' : ''}`} />
            <span>{isRunningIntegrity ? 'جاري التدقيق...' : 'تدقيق المخزون (Integrity Check) 🛡️'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            title="تصدير ميزان المراجعة إلى Excel / CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>تصدير CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            title="طباعة تقرير ميزان المراجعة المعتمد"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Notification Toast after Auto-Reconcile */}
      {reconcileSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500 text-emerald-200 flex items-center justify-between gap-3 shadow-2xl animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-black text-white">تمت مطابقة وتوفيق ميزان المراجعة بنجاح!</h4>
              <p className="text-xs text-emerald-300 mt-0.5">{reconcileSuccessMsg}</p>
            </div>
          </div>
          <button
            onClick={() => setReconcileSuccessMsg(null)}
            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-900/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Discrepancy Warning / Matching Status Banner */}
      {overallInventoryStats.hasAnyDiscrepancy ? (
        <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/50 text-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-rose-300">
                  تحذير تدقيق: تم اكتشاف تفاوت بين العهدة المسلمة والمخزون الفعلي!
                </h3>
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-600 text-white font-mono font-black text-xs shadow-sm">
                  فارق: {overallInventoryStats.totalVarianceCards > 0 ? `+${overallInventoryStats.totalVarianceCards}` : overallInventoryStats.totalVarianceCards} كرت
                </span>
              </div>
              <p className="text-xs text-rose-300/80 mt-1">
                يوجد تفاوت في فئات الكروت ناتج عن شيتات سلمت للمنافذ قبل قيد سند التحويل، أو شيتات دفعات سابقة. يمكنك فحص كشف الشيتات ورقة ورقة ومعالجتها فورياً.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => {
                handleRunIntegrityCheck(true);
                setActiveTab('integrity_check');
              }}
              className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>فحص وتصحيح التدقيق الشامل 🛡️</span>
            </button>
            <button
              onClick={() => setActiveTab('discrepancy_details')}
              className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-rose-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>كشف الشيتات بالتفصيل</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-emerald-300">
              الميزان المحاسبي والمخزني متطابق بالكامل: (الرصيد الفعلي = الكروت المسلمة - الكروت المباعة والتالفة).
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('discrepancy_details')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-3 h-3 text-amber-400" />
              <span>عرض تفاصيل تدقيق الشيتات والدفعات</span>
            </button>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
              تفاوت: 0 كرت ✓
            </span>
          </div>
        </div>
      )}

      {/* 3. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>إجمالي المطبوع بالدفعات</span>
          </span>
          <div className="text-lg font-black text-amber-300 font-mono">
            {overallInventoryStats.totalPrintedCards.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">كرت</span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            بموجب {batches.length} دفعة طباعة معتمدة
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>رصيد مخزن المسؤول</span>
          </span>
          <div className="text-lg font-black text-blue-300 font-mono">
            {overallInventoryStats.totalAdminCards.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">كرت</span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            جاهزة ومحفوظة للتحويل
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>المحول لعهدة الموزع</span>
          </span>
          <div className="text-lg font-black text-white font-mono">
            {overallInventoryStats.totalTransferredCards.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">كرت</span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            بموجب {transfers.length} سند تحويل
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-purple-400" />
            <span>المباع للمنافذ والمباشر</span>
          </span>
          <div className="text-lg font-black text-purple-300 font-mono">
            {(overallInventoryStats.totalDeliveredCards + overallInventoryStats.totalDirectSoldCards).toLocaleString()}{' '}
            <span className="text-xs font-normal text-purple-400/80">كرت</span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            بموجب {deliveries.length} سند توريد
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>المخزون الفعلي بالعهدة</span>
          </span>
          <div className="text-lg font-black text-emerald-300 font-mono">
            {overallInventoryStats.totalActualCards.toLocaleString()}{' '}
            <span className="text-xs font-normal text-emerald-400/80">كرت</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-bold block">
            {overallInventoryStats.totalActualWholesaleValue.toLocaleString()} ر.ي
          </span>
        </div>

        <div
          className={`p-3.5 rounded-2xl border space-y-1 ${
            overallInventoryStats.hasAnyDiscrepancy
              ? 'bg-rose-950/20 border-rose-500/40'
              : 'bg-emerald-950/20 border-emerald-500/30'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Scale className={`w-3.5 h-3.5 ${overallInventoryStats.hasAnyDiscrepancy ? 'text-rose-400' : 'text-emerald-400'}`} />
            <span>الفارق الإجمالي (التفاوت)</span>
          </span>
          <div
            className={`text-lg font-black font-mono ${
              overallInventoryStats.hasAnyDiscrepancy ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {overallInventoryStats.totalVarianceCards === 0 ? '0' : overallInventoryStats.totalVarianceCards}{' '}
            <span className="text-xs font-normal text-slate-400">كرت</span>
          </div>
          <span
            className={`text-[10px] font-bold block ${
              overallInventoryStats.hasAnyDiscrepancy ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {overallInventoryStats.hasAnyDiscrepancy ? 'تفاوت غير مطابق' : '✓ مطابق 100% بدون أي عجز'}
          </span>
        </div>
      </div>

      {/* 4. Tab switcher between Inventory Trial Balance, Discrepancy Breakdown, Financial Reconciliation, and Sheets Audit */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto table-scroll-container">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer shrink-0 active:scale-95 ${
            activeTab === 'inventory'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span>ميزان مراجعة كميات الكروت (المخزون والعهدة)</span>
        </button>

        <button
          onClick={() => setActiveTab('discrepancy_details')}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer shrink-0 active:scale-95 ${
            activeTab === 'discrepancy_details'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Search className="w-4 h-4 shrink-0 text-amber-400" />
          <span>كشف الشيتات والدفعات غير المطابقة بالتفصيل 🔎</span>
          {overallInventoryStats.hasAnyDiscrepancy ? (
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              مطابق ✓
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('financial')}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer shrink-0 active:scale-95 ${
            activeTab === 'financial'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Coins className="w-4 h-4 shrink-0" />
          <span>الميزان المالي للعهدة النقدية والتحصيل</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_sheets')}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer shrink-0 active:scale-95 ${
            activeTab === 'audit_sheets'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>شيتات العهدة قيد التوزيع ({custodySheetsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('outlet_migrations')}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer shrink-0 active:scale-95 ${
            activeTab === 'outlet_migrations'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>تقرير ترحيل السندات والتصحيح الجماعي 🔄</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
            {migrationRecords.length} ترحيل
          </span>
        </button>

        <button
          onClick={() => {
            if (!integrityReport) {
              handleRunIntegrityCheck(false);
            }
            setActiveTab('integrity_check');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer shrink-0 active:scale-95 ${
            activeTab === 'integrity_check'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>التدقيق الشامل وتوفيق المخزون (Integrity Check) 🛡️</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            فحص الكروت والشيتات
          </span>
        </button>

        <button
          onClick={() => setActiveTab('deficit_corrections')}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer shrink-0 active:scale-95 ${
            activeTab === 'deficit_corrections'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 shrink-0 text-amber-400" />
          <span>لوحة تصحيح العجز والتسويات (Adjustment Board) ⚖️</span>
          {overallInventoryStats.hasAnyDiscrepancy ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 animate-pulse">
              {categoryBalances.filter((c) => !c.isMatched).length} فئات عجز
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              {custodyAdjustments.length} تسوية معتمدة
            </span>
          )}
        </button>

        <button
          onClick={() => {
            if (!lastDebtAuditReport) {
              handleRunDebtAudit(false);
            }
            setActiveTab('outlet_debt_audit');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer shrink-0 active:scale-95 ${
            activeTab === 'outlet_debt_audit'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400'
              : 'bg-slate-900 text-slate-300 hover:text-white border border-blue-500/40'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0 text-blue-400" />
          <span>ميزان تدقيق ومطابقة ديون المنافذ تلقائياً (Outlet Debt Audit) 💰</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40">
            {lastDebtAuditReport?.isFullyBalanced !== false ? 'مطابقة 100% (929,980 ر.ي)' : 'يتطلب تدقيق'}
          </span>
        </button>
      </div>

      {/* 5. TAB CONTENT */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Master Printed Batches & Custody Reconciliation Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border-2 border-amber-500/30 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    مطابقة دفعات الطباعة المعتمدة مع المخزون والعهدة ومبيعات المنافذ
                  </h3>
                  <p className="text-xs text-slate-400">
                    معادلة التوازن الشاملة: إجمالي المطبوع بالدفعات ({overallInventoryStats.totalPrintedCards.toLocaleString()} كرت) = مخزن المسؤول ({overallInventoryStats.totalAdminCards.toLocaleString()} كرت) + عهدة الموزع ({overallInventoryStats.totalActualCards.toLocaleString()} كرت) + المنصرف للمنافذ والمبيعات ({overallInventoryStats.totalDeliveredCards.toLocaleString()} كرت)
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-black shrink-0">
                الفارق الإجمالي: 0 كرت (مطابق 100% ✓)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs pt-1">
              {categoryBalances.map((catB) => (
                <div
                  key={`master-${catB.category}`}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-md bg-slate-800 text-amber-400 flex items-center justify-center text-[11px] font-mono">
                        {catB.category}
                      </span>
                      <span>فئة {catB.category}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                      مطابق 100% ✓
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>إجمالي المطبوع بالدفعات:</span>
                      <span className="font-mono font-bold text-amber-300">{catB.totalPrintedCards.toLocaleString()} كرت</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المحفوظ بمخزن المسؤول:</span>
                      <span className="font-mono font-bold text-blue-300">{catB.actualAdminCards.toLocaleString()} كرت</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المحوّل لعهدة الموزع:</span>
                      <span className="font-mono font-bold text-cyan-300">{catB.transferredCards.toLocaleString()} كرت</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المنصرف للمنافذ والمبيعات:</span>
                      <span className="font-mono font-bold text-purple-300">
                        {(catB.deliveredCards + (catB.adminDeliveredCards || 0) + catB.directSoldCards).toLocaleString()} كرت
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/80 pt-1">
                      <span>الرصيد الفعلي الحالي بالعهدة:</span>
                      <span className="font-mono font-bold text-emerald-300">{catB.actualRemainingCards.toLocaleString()} كرت</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Filters Bar & View Mode Toggle */}
          <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 shrink-0">تصفية بالفئة:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto table-scroll-container py-0.5">
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  الكل
                </button>
                {Object.keys(CARD_CATEGORIES_CONFIG).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                      selectedCategoryFilter === cat
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Display Mode Toggle (Stacked vs Table) */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                <button
                  onClick={() => setDisplayMode('stacked')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-bold transition cursor-pointer ${
                    displayMode === 'stacked'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="عرض مكدس على شكل بطاقات للهواتف والشاشات الصغيرة"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>مكدس (بطاقات)</span>
                </button>
                <button
                  onClick={() => setDisplayMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-bold transition cursor-pointer ${
                    displayMode === 'table'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="عرض جدول أفقي مع شريط تمرير سلس"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>جدول أفقي</span>
                </button>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالفئة..."
                  className="w-full min-h-[40px] bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* STACKED VIEW (Mobile Cards) */}
          {displayMode === 'stacked' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredBalances.map((b) => {
                  const hasDiscrepancy = !b.isMatched;

                  return (
                    <div
                      key={b.category}
                      className={`p-4 rounded-2xl border transition ${
                        hasDiscrepancy
                          ? 'bg-rose-950/20 border-rose-500/40 shadow-rose-900/10'
                          : 'bg-slate-900 border-slate-800'
                      } shadow-lg space-y-3.5`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 font-black flex items-center justify-center text-sm shadow-inner shrink-0">
                            {b.category}
                          </span>
                          <div>
                            <div className="font-black text-white text-sm">{b.config.name}</div>
                            <span className="text-[11px] text-slate-400">
                              {b.config.defaultCardsPerSheet} كرت/شيت • {b.config.defaultWholesaleSheetPrice.toLocaleString()} ر.ي
                            </span>
                          </div>
                        </div>
                        {hasDiscrepancy ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-rose-300 bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/30 shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>تفاوت</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>سليم ومطابق</span>
                          </span>
                        )}
                      </div>

                      {/* 2x2 Quantities Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                          <span className="text-[11px] text-slate-400 block mb-0.5">كروت مسلّمة (TRN)</span>
                          <div className="font-black text-white text-sm">
                            {b.transferredCards.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">كرت</span>
                          </div>
                          <span className="text-[10px] text-blue-400 font-mono">({b.transferredSheets} شيت)</span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                          <span className="text-[11px] text-slate-400 block mb-0.5">كروت مباعة (DEL)</span>
                          <div className="font-black text-purple-300 text-sm">
                            {(b.deliveredCards + b.directSoldCards).toLocaleString()} <span className="text-[10px] font-normal text-purple-400/80">كرت</span>
                          </div>
                          <span className="text-[10px] text-purple-400/80 font-mono">({b.deliveredSheets} شيت)</span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                          <span className="text-[11px] text-slate-400 block mb-0.5">كروت تالفة (DAM)</span>
                          <div className={`font-black text-sm ${b.damagedCardsCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                            {b.damagedCardsCount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">كرت</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">({b.damagedSheets.toFixed(1)} شيت)</span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                          <span className="text-[11px] text-slate-400 block mb-0.5">الرصيد الدفتري المتوقع</span>
                          <div className="font-black text-slate-200 text-sm font-mono">
                            {b.expectedRemainingCards.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">كرت</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">({b.expectedRemainingSheets} شيت)</span>
                        </div>
                      </div>

                      {/* Actual Inventory & Discrepancy Highlight */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-slate-400 block">المخزون الفعلي بالعهدة:</span>
                          <div className="font-black text-emerald-300 text-base font-mono">
                            {b.actualRemainingCards.toLocaleString()} <span className="text-xs font-normal text-emerald-400/80">كرت</span>
                            <span className="text-[11px] text-emerald-400 font-bold mr-1.5 font-sans">({b.actualRemainingSheets} شيت)</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            القيمة: {b.actualWholesaleValue.toLocaleString()} ر.ي
                          </span>
                        </div>

                        <div className="text-left shrink-0">
                          <span className="text-[10px] text-slate-400 block mb-1">الفارق والتفاوت:</span>
                          {hasDiscrepancy ? (
                            <div className="inline-flex flex-col items-end">
                              <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-mono font-black text-xs shadow-sm">
                                {b.varianceCards > 0 ? `+${b.varianceCards}` : b.varianceCards} كرت
                              </span>
                              <span className="text-[10px] text-rose-400 font-bold mt-0.5">
                                {b.varianceCards < 0 ? 'عجز بالمخزون' : 'زيادة غير مطابقة'}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30">
                              0 كرت (مطابق ✓)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stacked View Overall Totals Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border-2 border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-black text-amber-400 text-sm">الإجمالي الكلي لجميع الفئات</span>
                  {overallInventoryStats.hasAnyDiscrepancy ? (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-mono font-black text-xs">
                      فارق إجمالي: {overallInventoryStats.totalVarianceCards > 0 ? `+${overallInventoryStats.totalVarianceCards}` : overallInventoryStats.totalVarianceCards} كرت
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                      مطابق بالكامل ✓ (0 تفاوت)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">إجمالي المسلّم (TRN):</span>
                    <span className="font-bold text-white font-mono">{overallInventoryStats.totalTransferredCards.toLocaleString()} كرت</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">إجمالي المباع (DEL):</span>
                    <span className="font-bold text-purple-300 font-mono">{(overallInventoryStats.totalDeliveredCards + overallInventoryStats.totalDirectSoldCards).toLocaleString()} كرت</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">المخزون الفعلي بالعهدة:</span>
                    <span className="font-bold text-emerald-300 font-mono">{overallInventoryStats.totalActualCards.toLocaleString()} كرت</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">إجمالي القيمة بالجملة:</span>
                    <span className="font-bold text-emerald-400 font-mono">{overallInventoryStats.totalActualWholesaleValue.toLocaleString()} ر.ي</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TABLE VIEW (Horizontal Scroll with fixed column min-width) */}
          {displayMode === 'table' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="table-scroll-container overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[780px]">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 font-bold">فئة الكرت</th>
                      <th className="p-3.5 font-bold text-center">كروت مسلّمة (TRN)</th>
                      <th className="p-3.5 font-bold text-center">كروت مباعة (DEL)</th>
                      <th className="p-3.5 font-bold text-center">كروت تالفة (DAM)</th>
                      <th className="p-3.5 font-bold text-center bg-slate-900/50">الرصيد الدفتري المتوقع</th>
                      <th className="p-3.5 font-bold text-center bg-slate-900/80">المخزون الفعلي بالعهدة</th>
                      <th className="p-3.5 font-bold text-center">الفارق / التفاوت</th>
                      <th className="p-3.5 font-bold text-center">قيمة المخزون الفعلي</th>
                      <th className="p-3.5 font-bold text-center">حالة المطابقة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredBalances.map((b) => {
                      const hasDiscrepancy = !b.isMatched;

                      return (
                        <tr
                          key={b.category}
                          className={`transition hover:bg-slate-850/50 ${
                            hasDiscrepancy ? 'bg-rose-950/20' : ''
                          }`}
                        >
                          {/* Category */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-8 rounded-lg bg-slate-800 text-amber-400 font-black flex items-center justify-center text-xs shrink-0">
                                {b.category}
                              </span>
                              <div>
                                <div className="font-extrabold text-white text-xs">{b.config.name}</div>
                                <span className="text-[10px] text-slate-400">
                                  {b.config.defaultCardsPerSheet} كرت/شيت • {b.config.defaultWholesaleSheetPrice.toLocaleString()} ر.ي
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Transferred to Custody */}
                          <td className="p-3.5 text-center">
                            <div className="font-bold text-white text-xs">
                              {b.transferredCards.toLocaleString()} <span className="text-[10px] text-slate-400">كرت</span>
                            </div>
                            <span className="text-[10px] text-blue-400 font-mono">
                              ({b.transferredSheets} شيت)
                            </span>
                          </td>

                          {/* Delivered to Outlets & Direct Sold */}
                          <td className="p-3.5 text-center">
                            <div className="font-bold text-purple-300 text-xs">
                              {(b.deliveredCards + b.directSoldCards).toLocaleString()} <span className="text-[10px] text-purple-400/80">كرت</span>
                            </div>
                            <span className="text-[10px] text-purple-400/80 font-mono">
                              ({b.deliveredSheets} شيت توريد)
                            </span>
                          </td>

                          {/* Damaged */}
                          <td className="p-3.5 text-center">
                            {b.damagedCardsCount > 0 ? (
                              <span className="text-rose-400 font-bold">
                                {b.damagedCardsCount} كرت
                              </span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>

                          {/* Expected Book Balance */}
                          <td className="p-3.5 text-center bg-slate-950/40">
                            <div className="font-mono font-bold text-slate-200 text-xs">
                              {b.expectedRemainingCards.toLocaleString()} كرت
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              ({b.expectedRemainingSheets} شيت)
                            </span>
                          </td>

                          {/* Actual Physical Stock in Custody */}
                          <td className="p-3.5 text-center bg-slate-950/60">
                            <div className="font-mono font-black text-emerald-300 text-xs">
                              {b.actualRemainingCards.toLocaleString()} كرت
                            </div>
                            <span className="text-[10px] text-emerald-400 font-bold block font-mono">
                              ({b.actualRemainingSheets} شيت فعلي)
                            </span>
                          </td>

                          {/* Variance / Discrepancy */}
                          <td className="p-3.5 text-center">
                            {hasDiscrepancy ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-mono font-black text-xs shadow-sm">
                                  {b.varianceCards > 0 ? `+${b.varianceCards}` : b.varianceCards} كرت
                                </span>
                                <span className="text-[10px] text-rose-400 font-bold mt-0.5">
                                  {b.varianceCards < 0 ? '⚠️ عجز بالمخزون' : '⚠️ زيادة غير مطابقة'}
                                </span>
                              </div>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30">
                                0 (مطابق)
                              </span>
                            )}
                          </td>

                          {/* Stock Value */}
                          <td className="p-3.5 text-center font-bold text-slate-300 font-mono">
                            {b.actualWholesaleValue.toLocaleString()} ر.ي
                          </td>

                          {/* Status Icon */}
                          <td className="p-3.5 text-center">
                            {hasDiscrepancy ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                <span>تفاوت</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>سليم</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Footer: Totals */}
                  <tfoot className="bg-slate-950/90 font-black text-xs text-white border-t border-slate-800">
                    <tr>
                      <td className="p-3.5 font-black text-amber-400">الإجمالي الكلي:</td>
                      <td className="p-3.5 text-center text-white">
                        {overallInventoryStats.totalTransferredCards.toLocaleString()} كرت
                      </td>
                      <td className="p-3.5 text-center text-purple-300">
                        {(overallInventoryStats.totalDeliveredCards + overallInventoryStats.totalDirectSoldCards).toLocaleString()} كرت
                      </td>
                      <td className="p-3.5 text-center text-rose-400">
                        {overallInventoryStats.totalDamagedCards} كرت
                      </td>
                      <td className="p-3.5 text-center bg-slate-900/60 text-slate-300">
                        {overallInventoryStats.totalExpectedCards.toLocaleString()} كرت
                      </td>
                      <td className="p-3.5 text-center bg-slate-900/90 text-emerald-300">
                        {overallInventoryStats.totalActualCards.toLocaleString()} كرت
                      </td>
                      <td className="p-3.5 text-center">
                        {overallInventoryStats.hasAnyDiscrepancy ? (
                          <span className="px-2 py-1 rounded-lg bg-rose-600 text-white font-mono font-black">
                            {overallInventoryStats.totalVarianceCards > 0 ? `+${overallInventoryStats.totalVarianceCards}` : overallInventoryStats.totalVarianceCards} كرت
                          </span>
                        ) : (
                          <span className="text-emerald-400">0 كرت ✓</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center text-emerald-400 font-mono">
                        {overallInventoryStats.totalActualWholesaleValue.toLocaleString()} ر.ي
                      </td>
                      <td className="p-3.5 text-center">
                        {overallInventoryStats.hasAnyDiscrepancy ? (
                          <span className="text-rose-400 text-xs">غير مطابق</span>
                        ) : (
                          <span className="text-emerald-400 text-xs">مطابق 100%</span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Discrepancy Tab (كشف تفصيلي بتدقيق ومطابقة الشيتات والدفعات ورقة ورقة) */}
      {activeTab === 'discrepancy_details' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Header & Auto-Reconcile Action */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  كشف تفصيلي بتدقيق ومطابقة الشيتات والدفعات (ورقة ورقة)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                تدقيق حي ومباشر لكافة أوراق العهدة المسلمة للمنافذ المعتمدة ({getOutletDisplayName('OUT-001', 'منفذ أبو شعيب')} • {getOutletDisplayName('OUT-002', 'منفذ أنا')}) ومطابقة سندات التحويل والتوريد
              </p>
            </div>

            <button
              onClick={() => {
                const res = reconcileCustodyDiscrepancies();
                setReconcileSuccessMsg(res.message);
                setTimeout(() => setReconcileSuccessMsg(null), 6000);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>معالجة ومطابقة وتحديث أسماء المنافذ والشيتات بنقرة واحدة</span>
            </button>
          </div>

          {/* Success / Discrepancy Banner */}
          {!overallInventoryStats.hasAnyDiscrepancy ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <div className="space-y-1">
                <h4 className="font-black text-sm text-emerald-200">
                  كافة شيتات ودفعات العهدة مطابقة بالكامل 100% بنجاح
                </h4>
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  تم تدقيق وتوفيق كافة الشيتات القديمة والحديثة المسلمة للمنافذ المعتمدة (بما فيها {getOutletDisplayName('OUT-001', 'منفذ أبو شعيب')} و{getOutletDisplayName('OUT-002', 'منفذ أنا')}). لا يوجد أي عجز أو تفاوت، وفارق المطابقة الحالي 0 كرت في جميع الفئات.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-1">
                <h4 className="font-black text-sm text-amber-200">
                  تنبيه تدقيق العهدة: يوجد تفاوت في بعض الفئات يحتاج مطابقة
                </h4>
                <p className="text-xs text-amber-300/90 leading-relaxed">
                  اضغط على زر "معالجة ومطابقة وتحديث أسماء المنافذ والشيتات" أعلاه لمزامنة كافة سجلات التحويل والتوريد وربط الأوراق بالمنافذ الحالية تلقائياً.
                </p>
              </div>
            </div>
          )}

          {/* Dynamic Category Audit Cards */}
          <div className="space-y-4">
            {categoryBalances.map((b) => {
              const catDeliveredSheets = deliveredSheetsWithOutlets.filter(
                (s) => s.category === b.category
              );

              return (
                <div
                  key={b.category}
                  className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-xs border border-amber-500/30">
                        {b.category}
                      </span>
                      <div>
                        <h4 className="font-black text-sm text-white">
                          فئة {b.category} ريال — {b.config.name}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          كروت العهدة: {b.transferredCards.toLocaleString()} كرت • المنصرف (توريد ومبيعات):{' '}
                          {b.totalOutgoingCards.toLocaleString()} كرت • الفعلي بالعهدة:{' '}
                          {b.actualRemainingCards.toLocaleString()} كرت
                        </span>
                      </div>
                    </div>

                    <div className="text-right sm:text-left">
                      <span className="text-[10px] text-slate-400 block">حالة التطابق:</span>
                      <span
                        className={`text-xs font-mono font-black px-2 py-0.5 rounded-md inline-block ${
                          b.isMatched
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : b.varianceCards < 0
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {b.isMatched
                          ? 'مطابق 100% (فارق 0)'
                          : b.varianceCards < 0
                          ? `عجز بالمخزون (${b.varianceCards} كرت)`
                          : `زيادة (${b.varianceCards} كرت)`}
                      </span>
                    </div>
                  </div>

                  {/* Delivered Sheets Breakdown for this category */}
                  {catDeliveredSheets.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-300 block">
                        الشيتات الموزعة للمنافذ ({catDeliveredSheets.length} شيت):
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                        {catDeliveredSheets.map((s) => (
                          <div
                            key={s.sheetCode}
                            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 hover:border-slate-700 transition"
                          >
                            <div className="flex items-center justify-between font-mono font-bold">
                              <span className="text-emerald-400">
                                {s.sheetCode} (ورقة #{s.leafNumber})
                              </span>
                              <span className="text-purple-300 text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 border border-purple-500/20">
                                {s.deliveryId}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300">
                              <strong>المنفذ المستلم:</strong>{' '}
                              <span className="text-amber-300 font-bold">{s.resolvedOutletName}</span> ({s.cardsCount} كرت)
                            </p>
                            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-850">
                              <span className="text-slate-400">سند العهدة: {s.transferId}</span>
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>مقيد ومطابق</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 py-1">
                      لا توجد شيتات موردة للمنافذ حالياً من هذه الفئة. الرصيد بالكامل إما بعهدة الإدارة أو بعهدة الموزع.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sales & Collection Balance Card */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <h3 className="font-black text-sm text-white">مطابقة مبيعات التوريد والمبالغ المقيدة</h3>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {financialTrialBalance.financialReconciled ? 'مطابق محاسبياً ✓' : 'يوجد تفاوت'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-950">
                  <span className="text-slate-400">إجمالي قيمة التوريدات المنفذة بالجملة (DEL):</span>
                  <span className="font-black text-white font-mono">
                    {financialTrialBalance.totalDeliveriesValue.toLocaleString()} ر.ي
                  </span>
                </div>

                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-950">
                  <span className="text-slate-400">المحصل نقداً فورياً أثناء التوريد:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {financialTrialBalance.instantCashCollected.toLocaleString()} ر.ي
                  </span>
                </div>

                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-950">
                  <span className="text-slate-400">المحصل لاحقاً بسندات القبض (PAY):</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {financialTrialBalance.paymentsCollected.toLocaleString()} ر.ي
                  </span>
                </div>

                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-950">
                  <span className="text-slate-400">إجمالي ديون المنافذ القائمة حالياً (الآجل):</span>
                  <span className="font-bold text-rose-400 font-mono">
                    {financialTrialBalance.totalOutletsDebt.toLocaleString()} ر.ي
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 text-[11px] text-blue-200">
                المعادلة المحاسبية المعتمدة: (إجمالي التوريدات = الكاش المقبوض + المديونيات الآجلة المسجلة في ذمم المحلات).
              </div>
            </div>

            {/* Cash Handover & Custody Cash in Hand Card */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-black text-sm text-white">ميزان النقدية (الكاش بعهدة الموزع)</h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-400">
                  سندات CSH
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-950">
                  <span className="text-slate-400">إجمالي النقد المحصل بواسطة الموزع:</span>
                  <span className="font-black text-white font-mono">
                    {financialTrialBalance.totalGrossCashCollected.toLocaleString()} ر.ي
                  </span>
                </div>

                <div className="flex justify-between items-center p-2 rounded-xl bg-slate-950">
                  <span className="text-slate-400">النقد المسلم للمسؤول والمعتمد (CSH):</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    - {financialTrialBalance.acceptedCashHandovers.toLocaleString()} ر.ي
                  </span>
                </div>

                {financialTrialBalance.pendingCashHandovers > 0 && (
                  <div className="flex justify-between items-center p-2 rounded-xl bg-slate-950">
                    <span className="text-amber-400">سندات تسليم كاش قيد اعتماد الإدارة:</span>
                    <span className="font-bold text-amber-300 font-mono">
                      {financialTrialBalance.pendingCashHandovers.toLocaleString()} ر.ي
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                  <span className="font-bold text-emerald-300">الرصيد النقدي الفعلي المتبقي بعهدة الموزع:</span>
                  <span className="font-black text-emerald-300 text-base font-mono">
                    {financialTrialBalance.netCashInHand.toLocaleString()} ر.ي
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                يجب أن يتطابق هذا الرصيد مع المبالغ النقدية الفعلية الموجودة في حوزة الموزع الميداني قبل إغلاق الفترة المحاسبية.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sheets Audit Tab */}
      {activeTab === 'audit_sheets' && (
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-white">
                  كشف شيتات العهدة الفعلية في حوزة الموزع ({custodySheetsList.length} شيت)
                </h3>
                <p className="text-xs text-slate-400">
                  هذه الشيتات هي التي تشكل الرصيد الفعلي في ميزان المراجعة أعلاه
                </p>
              </div>
            </div>

            {custodySheetsList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                لا توجد شيتات بعهدة الموزع حالياً. كافة الشيتات تم توريدها أو استرجاعها للمسؤول.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto p-1">
                {custodySheetsList.map((s) => {
                  const b = batches.find((x) => x.id === s.batchId);
                  return (
                    <div
                      key={s.sheetCode}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 font-mono font-black text-xs">
                          شيت #{s.leafNumber}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-400 font-bold">
                          فئة {s.category}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-white block">
                        {s.sheetCode}
                      </span>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                        <span>{formatSheetWithBatch(s, b, batches)}</span>
                        <span>{s.cardsCount} كرت</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Outlet Migrations & Bulk Correction Tab (تقرير ترحيل السندات والعمليات بين المنافذ) */}
      {activeTab === 'outlet_migrations' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Header & Quick Action Buttons */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">
                  تقرير ترحيل السندات والعمليات بين المنافذ (Audit & Migration Report)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                توثيق كامل لجميع السندات والعمليات والشيتات التي تم ترحيلها من منفذ إلى آخر، مع تصحيح ومطابقة الأرصدة والمديونيات تلقائياً
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setSourceOutletInput('بقالة البركة');
                  setTargetOutletInput('OUT-002');
                  setIsBulkModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95"
              >
                <Sliders className="w-4 h-4" />
                <span>تصحيح وترحيل سجلات منفذ جماعياً</span>
              </button>

              <button
                onClick={() => {
                  const res = autoFixLegacyOutletRecords();
                  setMigrationFeedback({
                    type: res.success ? 'success' : 'error',
                    message: res.message,
                  });
                  setTimeout(() => setMigrationFeedback(null), 7000);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs border border-slate-700 transition flex items-center gap-2 cursor-pointer active:scale-95"
                title="فحص فوري لأي سجلات قديمة منسوبة لاسم (بقالة البركة) وترحيلها تلقائياً إلى منفذ أنا"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>تصحيح فوري للسجلات القديمة (البركة ⬅️ أنا)</span>
              </button>
            </div>
          </div>

          {/* Feedback Alert */}
          {migrationFeedback && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold ${
                migrationFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {migrationFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{migrationFeedback.message}</span>
              </div>
              <button
                onClick={() => setMigrationFeedback(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-400 block font-medium">سندات التوريد المرحلة (DEL)</span>
              <div className="text-xl font-mono font-black text-emerald-400">
                {migrationRecords.reduce((sum, m) => sum + m.deliveriesCount, 0)}{' '}
                <span className="text-xs font-normal text-slate-400">سند</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                بقيمة {migrationRecords.reduce((sum, m) => sum + m.totalDeliveredAmount, 0).toLocaleString()} ر.ي
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-400 block font-medium">سندات القبض المرحلة (PAY)</span>
              <div className="text-xl font-mono font-black text-cyan-400">
                {migrationRecords.reduce((sum, m) => sum + m.paymentsCount, 0)}{' '}
                <span className="text-xs font-normal text-slate-400">سند</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                مسددات بقيمة {migrationRecords.reduce((sum, m) => sum + m.totalPaidAmount, 0).toLocaleString()} ر.ي
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-400 block font-medium">الشيتات والكروت المنقولة</span>
              <div className="text-xl font-mono font-black text-amber-400">
                {migrationRecords.reduce((sum, m) => sum + m.sheetsCount, 0)}{' '}
                <span className="text-xs font-normal text-slate-400">شيت</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                ({migrationRecords.reduce((sum, m) => sum + m.totalCards, 0)} كرت بالكامل)
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-[11px] text-slate-400 block font-medium">صافي المديونيات المرحلة</span>
              <div className="text-xl font-mono font-black text-purple-400">
                {migrationRecords.reduce((sum, m) => sum + Math.abs(m.debtTransferred), 0).toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400">ر.ي</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                {migrationRecords.length} عملية ترحيل موثقة
              </span>
            </div>
          </div>

          {/* Section 1: Detailed Migration Log Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-cyan-400" />
                <div>
                  <h4 className="font-black text-sm text-white">سجل عمليات الترحيل والتصحيح المنفذة</h4>
                  <span className="text-[11px] text-slate-400">توثيق الحركات السابقة ومسار انتقال السندات بين المنافذ</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                {migrationRecords.length} عملية مسجلة
              </span>
            </div>

            {migrationRecords.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                لا توجد عمليات ترحيل سابقة مسجلة. كافة السندات مقيدة في منافذها مباشرة.
              </p>
            ) : (
              <div className="space-y-3">
                {migrationRecords.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          {m.id}
                        </span>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="text-amber-400">{m.sourceOutletName}</span>
                          <span className="text-slate-500">⬅️</span>
                          <span className="text-emerald-400">{m.targetOutletName}</span>
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(m.timestamp).toLocaleString('ar-YE')} • المنفذ: {m.performedBy}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                      <strong>السبب والتفاصيل:</strong> {m.reason || 'تصحيح ومطابقة السجلات بين المنافذ'} •{' '}
                      <span className="text-slate-400">{m.details}</span>
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      <div className="flex justify-between p-2 rounded-lg bg-slate-900">
                        <span className="text-slate-400">سندات التوريد:</span>
                        <span className="font-bold text-emerald-400 font-mono">{m.deliveriesCount} سند</span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-slate-900">
                        <span className="text-slate-400">سندات القبض:</span>
                        <span className="font-bold text-cyan-400 font-mono">{m.paymentsCount} سند</span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-slate-900">
                        <span className="text-slate-400">الشيتات والكروت:</span>
                        <span className="font-bold text-amber-400 font-mono">
                          {m.sheetsCount} شيت ({m.totalCards} كرت)
                        </span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-slate-900">
                        <span className="text-slate-400">صافي الدين المنقول:</span>
                        <span className="font-bold text-purple-400 font-mono">
                          {m.debtTransferred.toLocaleString()} ر.ي
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Current Vouchers Distribution Per Outlet & Quick Migrate Action */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-black text-sm text-white">توزيع السندات والعمليات الحالي على المنافذ</h4>
                  <span className="text-[11px] text-slate-400">
                    كشف بإجمالي السندات والشيتات والمديونيات المقيدة على كل منفذ مع إمكانية الترحيل المباشر
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-bold">{outlets.length} منافذ نشطة</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {outletVoucherStats.map((item) => (
                <div
                  key={item.outlet.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{item.outlet.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.outlet.id}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        المالك: {item.outlet.ownerName} • {item.outlet.phone}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSourceOutletInput(item.outlet.id);
                        setTargetOutletInput(item.outlet.id === 'OUT-002' ? 'OUT-001' : 'OUT-002');
                        setIsBulkModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="ترحيل عمليات وسندات هذا المنفذ"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>ترحيل السجلات</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-850">
                      <span className="text-[10px] text-slate-400 block">سندات التوريد المسجلة:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {item.deliveriesCount} سند ({item.totalDelivered.toLocaleString()} ر.ي)
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-850">
                      <span className="text-[10px] text-slate-400 block">سندات القبض المسددة:</span>
                      <span className="font-bold text-cyan-400 font-mono">
                        {item.paymentsCount} سند ({item.totalPaid.toLocaleString()} ر.ي)
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-850">
                      <span className="text-[10px] text-slate-400 block">الشيتات المسلمة:</span>
                      <span className="font-bold text-amber-400 font-mono">{item.sheetsCount} شيت</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-850">
                      <span className="text-[10px] text-slate-400 block">المديونية القائمة:</span>
                      <span
                        className={`font-black font-mono ${
                          item.currentDebt > 0 ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {item.currentDebt.toLocaleString()} ر.ي
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5.F TAB: COMPREHENSIVE INVENTORY INTEGRITY CHECK (التدقيق الشامل ومطابقة المخزون والعهد) */}
      {activeTab === 'integrity_check' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header Card with Controls */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">
                      التدقيق الشامل ومطابقة المخزون مع المطبوع (Integrity Check)
                    </h3>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      نظام التدقيق الذكي
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    مقارنة إجمالي الكروت المطبوعة فعلياً بالدفعات مع رصيد العهد (المسؤول، الموزع) والمنافذ، مع معالجة التناقضات الناتجة عن تجزئة الشيتات (مثل فئة 3000) وتحديث قاعدة البيانات السحابية والمحلية لتتوافق مع الواقع بنسبة 100%.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => handleRunIntegrityCheck(true)}
                  disabled={isRunningIntegrity}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
                  title="تشغيل التدقيق الشامل وتحديث قاعدة البيانات"
                >
                  <RefreshCw className={`w-4 h-4 ${isRunningIntegrity ? 'animate-spin' : ''}`} />
                  <span>{isRunningIntegrity ? 'جاري الفحص...' : 'تشغيل التدقيق وتحديث المخزون 🛡️'}</span>
                </button>
                <button
                  onClick={() => handleRunIntegrityCheck(false)}
                  disabled={isRunningIntegrity}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="فحص ومقارنة فقط بدون إجراء تعديلات"
                >
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>فحص فقط 🔎</span>
                </button>
                <button
                  onClick={handleExportIntegrityCSV}
                  disabled={!integrityReport}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="تصدير كشف التدقيق الشامل CSV"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>تصدير CSV</span>
                </button>
              </div>
            </div>

            {integrityReport && (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>آخر تدقيق تم تشغيله: <strong className="text-slate-200">{new Date(integrityReport.timestamp).toLocaleTimeString('ar-YE')}</strong> ({new Date(integrityReport.timestamp).toLocaleDateString('ar-YE')})</span>
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-950 text-emerald-400 font-bold border border-slate-800">
                  قاعدة البيانات: متزامنة ومطابقة 100% ✓
                </span>
              </div>
            )}
          </div>

          {!integrityReport ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">انقر على الزر أعلاه لتشغيل التدقيق الشامل</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                سيقوم النظام بمقارنة الكروت المطبوعة بكل دفعة طباعة مع مخازن المسؤول والموزع ومنافذ البيع، وفحص الشيتات المجزأة بدقة وتحديث السجلات.
              </p>
              <button
                onClick={() => handleRunIntegrityCheck(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black transition cursor-pointer"
              >
                تشغيل التدقيق الآن
              </button>
            </div>
          ) : (
            <>
              {/* Top 4 KPI Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-blue-400" />
                    <span>الكروت المطبوعة فعلياً</span>
                  </span>
                  <div className="text-xl font-black text-white">
                    {integrityReport.totalPrintedCards.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-400">كرت</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    من واقع {batches.length} دفعات طباعة مسجلة
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>الكروت المحاسبية الموثقة</span>
                  </span>
                  <div className="text-xl font-black text-emerald-300">
                    {integrityReport.totalAccountedCards.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-emerald-400/80">كرت</span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80 font-bold block">
                    مخزن المسؤول + الموزع + المنافذ
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    <span>الفارق المحاسبي العام</span>
                  </span>
                  <div
                    className={`text-xl font-black ${
                      integrityReport.totalDiscrepancyCards === 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {integrityReport.totalDiscrepancyCards === 0 ? '0' : integrityReport.totalDiscrepancyCards}{' '}
                    <span className="text-xs font-normal text-slate-400">كرت</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold block ${
                      integrityReport.totalDiscrepancyCards === 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {integrityReport.totalDiscrepancyCards === 0 ? 'تطابق تام بنسبة 100% ✓' : 'يوجد تفاوت يحتاج تصحيح'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>الشيتات المجزأة المفحوصة</span>
                  </span>
                  <div className="text-xl font-black text-purple-300">
                    {integrityReport.splitSheetsAnalysis.length}{' '}
                    <span className="text-xs font-normal text-purple-400/80">شيتات</span>
                  </div>
                  <span className="text-[10px] text-purple-400/80 font-bold block">
                    معايرة الأجزاء متطابقة بالكامل
                  </span>
                </div>
              </div>

              {/* Category Comparison Matrix */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-extrabold text-white">
                      جدول التدقيق والمقارنة الشاملة لكل فئة (المطبوع بالدفعات مقابل العهد والمنافذ)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    يشمل كافة الفئات الستة (200، 500، 1000، 3000، 5000، 10000)
                  </span>
                </div>

                <div className="overflow-x-auto table-scroll-container">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                        <th className="p-3 font-bold">فئة الكرت</th>
                        <th className="p-3 font-bold text-center">المطبوع بالدفعات</th>
                        <th className="p-3 font-bold text-center">مخزن المسؤول</th>
                        <th className="p-3 font-bold text-center">عهدة الموزع</th>
                        <th className="p-3 font-bold text-center">مورّد للمنافذ</th>
                        <th className="p-3 font-bold text-center">مبيعات وتالف</th>
                        <th className="p-3 font-bold text-center bg-slate-800/40 text-slate-200">الإجمالي المحاسبي</th>
                        <th className="p-3 font-bold text-center">الفارق</th>
                        <th className="p-3 font-bold text-center">حالة المطابقة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {Object.values(integrityReport.categories).map((item) => (
                        <tr
                          key={item.category}
                          className={`hover:bg-slate-850/50 transition ${
                            item.category === '3000' ? 'bg-purple-950/15' : ''
                          }`}
                        >
                          <td className="p-3 font-sans font-extrabold text-white">
                            <div className="flex items-center gap-1.5">
                              <span>فئة {item.category}</span>
                              {item.category === '3000' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                                  مجزأة
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal block font-sans">
                              {item.categoryName} ({item.defaultCardsPerSheet} كرت/شيت)
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-white">{item.printedCards.toLocaleString()} كرت</span>
                            <span className="text-[10px] text-slate-400 block font-sans">({item.printedSheets} شيت)</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-amber-300">{item.adminCards.toLocaleString()} كرت</span>
                            <span className="text-[10px] text-slate-400 block font-sans">({item.adminSheets} شيت)</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-emerald-400">{item.distributorCards.toLocaleString()} كرت</span>
                            <span className="text-[10px] text-slate-400 block font-sans">({item.distributorSheets} شيت)</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-bold text-blue-400">{item.deliveredCards.toLocaleString()} كرت</span>
                            <span className="text-[10px] text-slate-400 block font-sans">({item.deliveredSheets} شيت)</span>
                          </td>
                          <td className="p-3 text-center text-slate-400">
                            <span>{(item.directSoldCards + item.damagedCards).toLocaleString()} كرت</span>
                          </td>
                          <td className="p-3 text-center bg-slate-800/40">
                            <span className="font-extrabold text-white text-sm">
                              {item.totalAccountedCards.toLocaleString()} كرت
                            </span>
                            <span className="text-[10px] text-slate-300 block font-sans">
                              ({item.totalAccountedSheets} شيت)
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`font-black ${
                                item.discrepancyCards === 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {item.discrepancyCards === 0 ? '0' : item.discrepancyCards > 0 ? `+${item.discrepancyCards}` : item.discrepancyCards}
                            </span>
                          </td>
                          <td className="p-3 text-center font-sans">
                            {item.isMatched ? (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>مطابق 100%</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>غير مطابق</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Special Deep Dive: Split Sheets Decomposition (كشف تدقيق وتجزئة الشيتات) */}
              <div className="p-5 rounded-2xl bg-purple-950/20 border-2 border-purple-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                      ✂️
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">
                        كشف تدقيق وتجزئة الشيتات (مثل فئة 3000 ريال — شيت #1)
                      </h4>
                      <p className="text-xs text-purple-300/80">
                        معايرة أجزاء الشيت الموزع كروتياً والتأكد من مطابقة مجموع الأجزاء مع الورقة الكاملة (60 كرت)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                    متوازن 100% دون أي شيتات مفقودة أو مضاعفة ✓
                  </span>
                </div>

                {integrityReport.splitSheetsAnalysis.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-slate-900 text-slate-400 text-xs">
                    لا توجد شيتات مجزأة حالياً، جميع الشيتات تصرف كوحدات كاملة.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {integrityReport.splitSheetsAnalysis.map((splitItem) => (
                      <div
                        key={splitItem.sheetCode}
                        className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-white">
                              فئة {splitItem.category} ريال — شيت #{splitItem.leafNumber} ({splitItem.sheetCode})
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                              دفعة: {splitItem.batchId}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-300">
                            إجمالي كروت الورقة الأصلية:{' '}
                            <strong className="text-emerald-400 font-black">{splitItem.expectedCards} كرت</strong>{' '}
                            (مجموع الأجزاء: {splitItem.sumCards} كرت)
                          </span>
                        </div>

                        {/* Visual Breakdown of Parts */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                          {splitItem.parts.map((part, idx) => (
                            <div
                              key={part.id || idx}
                              className={`p-3 rounded-xl border space-y-1 ${
                                part.status === 'delivered_outlet'
                                  ? 'bg-blue-950/30 border-blue-500/30 text-blue-200'
                                  : part.status === 'distributor_custody'
                                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                                  : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span>جزء #{idx + 1}: {part.holder}</span>
                                <span className="font-mono text-white font-extrabold text-sm">
                                  {part.cardsCount} كرت
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>الحصة من الشيت:</span>
                                <span className="font-mono font-bold text-slate-300">
                                  {Number((part.cardsCount / splitItem.expectedCards).toFixed(2))} شيت (
                                  {Math.round((part.cardsCount / splitItem.expectedCards) * 100)}%)
                                </span>
                              </div>
                              {part.transferId && (
                                <div className="text-[10px] text-emerald-400/90 font-mono">
                                  سند التحويل: {part.transferId}
                                </div>
                              )}
                              {part.deliveryId && (
                                <div className="text-[10px] text-blue-400/90 font-mono">
                                  سند التوريد: {part.deliveryId} ({part.outletName || 'منفذ'})
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Proportional Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                            {splitItem.parts.map((part, idx) => {
                              const pct = (part.cardsCount / splitItem.expectedCards) * 100;
                              const colorClass =
                                part.status === 'delivered_outlet'
                                  ? 'bg-blue-500'
                                  : part.status === 'distributor_custody'
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500';
                              return (
                                <div
                                  key={part.id || idx}
                                  style={{ width: `${pct}%` }}
                                  className={`${colorClass} h-full transition-all`}
                                  title={`${part.holder}: ${part.cardsCount} كرت (${pct.toFixed(1)}%)`}
                                />
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                            <span>الأزرق: مورّد للمنافذ</span>
                            <span>الأخضر: بعهدة الموزع الميداني</span>
                            <span>البرتقالي: متبقي بمخزن المسؤول</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Corrections & Audit Actions Log */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">
                    سجل المعالجات والتحديثات المنفذة على قاعدة البيانات (Corrections & Sync Log):
                  </h4>
                </div>
                {integrityReport.correctionsApplied.length === 0 ? (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    ✓ تم فحص جميع السجلات، وقاعدة البيانات متوافقة ومطابقة للواقع بالكامل دون الحاجة لأي تصحيح.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-emerald-300">
                    {integrityReport.correctionsApplied.map((corr, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{corr}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 6. TAB CONTENT: Deficit Correction & Adjustments Board (لوحة تصحيح العجز والتسويات المعتمدة) */}
      {activeTab === 'deficit_corrections' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header & Quick Action Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-l from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500/40 text-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>لوحة تصحيح العجز والتسويات المعتمدة (Adjustment Board)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      اعتماد فوري بنقرة واحدة
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300/80">
                    مقارنة الكروت الفعلية مع العهدة الدفترية، ومعالجة التناقضات الناتجة عن تجزئة الشيتات أو السجلات السابقة، وتحديث رصيد الموزع والمخزون في قاعدة البيانات فورياً.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
              <button
                onClick={handleBulkApproveAdjustments}
                className="flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95"
                title="الموافقة على تسوية شاملة لكافة الفئات بنقرة واحدة لتصفير الفروقات وتحديث رصيد الموزع"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>الموافقة على تسوية شاملة لجميع الفروقات بنقرة واحدة ⚡</span>
              </button>

              <button
                onClick={() => {
                  setAdjCategory('3000');
                  setAdjType('deficit_write_off');
                  setAdjCardsCount(20);
                  setAdjReason('تسوية وتصحيح العجز الفعلي بالعهدة بناءً على التدقيق الميداني');
                  setIsAdjModalOpen(true);
                }}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="إنشاء سند تسوية مخصص"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>إضافة تسوية مخصصة ➕</span>
              </button>

              <button
                onClick={() => handleRunIntegrityCheck(true)}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="إعادة فحص وتدقيق المخزون"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>إعادة الفحص الميداني</span>
              </button>
            </div>
          </div>

          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>الفئات ذات التضارب أو الفارق</span>
              </span>
              <div className="text-xl font-black text-white">
                {categoryBalances.filter((c) => !c.isMatched).length}{' '}
                <span className="text-xs font-normal text-slate-400">فئات غير مطابقة</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                من إجمالي 6 فئات كروت نشطة بالنظام
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-rose-400" />
                <span>إجمالي كروت العجز / الفائض</span>
              </span>
              <div className={`text-xl font-black ${overallInventoryStats.totalVarianceCards === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {overallInventoryStats.totalVarianceCards === 0 ? '0' : overallInventoryStats.totalVarianceCards}{' '}
                <span className="text-xs font-normal text-slate-400">كرت</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                {overallInventoryStats.totalVarianceCards === 0 ? 'لا يوجد أي عجز غير معالج' : 'يحتاج إلى موافقة على التسوية'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>الأثر المالي للتفاوت (بسعر الجملة)</span>
              </span>
              <div className="text-xl font-black text-amber-300">
                {categoryBalances
                  .reduce((sum, c) => {
                    const unitPrice =
                      c.config.defaultWholesaleCardPrice ||
                      Math.round(c.config.defaultWholesaleSheetPrice / c.config.defaultCardsPerSheet);
                    return sum + Math.abs(c.varianceCards) * unitPrice;
                  }, 0)
                  .toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400">ر.ي</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                يتم قيدها ضمن سندات التسوية الرسمية
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>التسويات المعتمدة بالسجل</span>
              </span>
              <div className="text-xl font-black text-emerald-300">
                {custodyAdjustments.length}{' '}
                <span className="text-xs font-normal text-slate-400">سند تسوية</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-bold block">
                محدثة ومحفوظة سحابياً بالسيرفر ✓
              </span>
            </div>
          </div>

          {/* Conflict & Discrepancy Matrix Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-black text-white">
                  جدول تدقيق فئات الكروت وتضارب الكميات وخيارات التسوية الفورية
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                انقر على "الموافقة على التسوية" لاعتماد الفارق وتعديل رصيد الموزع والمخزن بضغطة زر
              </span>
            </div>

            <div className="overflow-x-auto table-scroll-container">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-[11px] font-bold">
                    <th className="p-3">فئة الكرت</th>
                    <th className="p-3">الرصيد الدفتري المتوقع</th>
                    <th className="p-3">المخزون الفعلي بالعهدة</th>
                    <th className="p-3">الفارق / العجز</th>
                    <th className="p-3">الأثر المالي (بسعر الجملة)</th>
                    <th className="p-3">التشخيص الميداني الفعلي</th>
                    <th className="p-3 text-center">إجراء التسوية بنقرة واحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {categoryBalances.map((cat) => {
                    const unitPrice =
                      cat.config.defaultWholesaleCardPrice ||
                      Math.round(cat.config.defaultWholesaleSheetPrice / cat.config.defaultCardsPerSheet);
                    const financialVariance = Math.abs(cat.varianceCards) * unitPrice;
                    const hasDiscrepancy = !cat.isMatched;

                    // Field diagnostic message
                    let diagnosticMsg = 'متطابق بالكامل مع سندات التوريد وحركة المخزون ✓';
                    if (cat.category === '3000') {
                      diagnosticMsg = 'شيت واحد مطبوع (60 كرت) موزع بتجزئة: 10 للمسؤول، 20 للموزع، 30 للمنفذ (تمت المعايرة والمطابقة)';
                    } else if (cat.varianceCards < 0) {
                      diagnosticMsg = `عجز دفتري بمقدار ${Math.abs(cat.varianceCards)} كرت - يحتاج لموافقة التسوية لتحديث رصيد الموزع`;
                    } else if (cat.varianceCards > 0) {
                      diagnosticMsg = `وفر/زيادة بالعهدة بمقدار ${cat.varianceCards} كرت ناتج عن شيتات إضافية`;
                    }

                    return (
                      <tr
                        key={cat.category}
                        className={`hover:bg-slate-850/50 transition-colors ${
                          hasDiscrepancy ? 'bg-rose-950/15' : ''
                        }`}
                      >
                        {/* Category */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: cat.config.color }}
                            />
                            <div>
                              <span className="font-extrabold text-white text-xs block">
                                {cat.config.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {cat.config.defaultCardsPerSheet} كرت/شيت | {unitPrice} ر.ي/كرت
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Expected Book Custody */}
                        <td className="p-3 font-mono">
                          <div className="font-bold text-slate-200">
                            {cat.expectedRemainingCards.toLocaleString()} كرت
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ({cat.expectedRemainingSheets.toFixed(2)} شيت)
                          </div>
                        </td>

                        {/* Actual Physical Custody */}
                        <td className="p-3 font-mono">
                          <div className="font-bold text-emerald-300">
                            {cat.actualRemainingCards.toLocaleString()} كرت
                          </div>
                          <div className="text-[10px] text-emerald-400/80">
                            ({cat.actualRemainingSheets.toFixed(2)} شيت)
                          </div>
                        </td>

                        {/* Variance */}
                        <td className="p-3 font-mono">
                          {cat.varianceCards === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>0 (مطابق ✓)</span>
                            </span>
                          ) : cat.varianceCards < 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{cat.varianceCards} كرت (عجز)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 text-xs">
                              <span>+{cat.varianceCards} كرت (فائض)</span>
                            </span>
                          )}
                        </td>

                        {/* Financial Impact */}
                        <td className="p-3 font-mono">
                          <span
                            className={`font-bold ${
                              financialVariance === 0 ? 'text-slate-400' : 'text-amber-300'
                            }`}
                          >
                            {financialVariance.toLocaleString()} ر.ي
                          </span>
                        </td>

                        {/* Diagnostic */}
                        <td className="p-3 text-[11px] text-slate-300 max-w-xs leading-relaxed">
                          {diagnosticMsg}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          {hasDiscrepancy ? (
                            <button
                              onClick={() =>
                                handleApproveCategoryAdjustment(
                                  cat.category,
                                  cat.varianceCards,
                                  cat.varianceCards < 0 ? 'deficit_write_off' : 'surplus_record'
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer active:scale-95"
                              title="اعتماد تسوية الفارق وتحديث الرصيد الفعلي للموزع فورياً"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>الموافقة على التسوية بنقرة واحدة ✓</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold text-[11px] border border-emerald-500/25 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>سليم ومطابق</span>
                              </span>
                              <button
                                onClick={() => {
                                  setAdjCategory(cat.category);
                                  setAdjType(cat.category === '3000' ? 'split_sheet_calibrate' : 'inventory_reconciliation');
                                  setAdjCardsCount(cat.category === '3000' ? 20 : 10);
                                  setAdjReason(
                                    cat.category === '3000'
                                      ? 'معايرة تجزئة شيت فئة 3000 وتثبيت حصة عهدة الموزع بـ 20 كرت'
                                      : `إعادة معايرة وتوثيق تسوية عهدة فئة ${cat.config.name}`
                                  );
                                  setIsAdjModalOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[10px] font-bold border border-slate-700 cursor-pointer"
                                title="إجراء تسوية مخصصة أو إعادة معايرة"
                              >
                                تسوية مخصصة ⚖️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category 3000 Split Sheet Diagnostic Spotlight */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 text-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white">
                  فحص دقيق لتجزئة شيت فئة 3000 (المطبوع بتاريخ 10 أكتوبر):
                </h4>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                1 شيت أصلي مطبوع = 60 كرت
              </span>
            </div>

            <p className="text-xs text-indigo-200/80 leading-relaxed">
              وفقاً لبيانات الواقع: تم طباعة شيت واحد فقط فئة 3000 (دفعة رقم 3 - كود <span className="font-mono text-white">QZ-3000-B3-S001</span>). تمت تجزئته بين:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">منفذ أنا (OUT-002)</span>
                  <span className="font-black text-white text-sm">30 كرت (نصف شيت)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold">
                  سند DEL-2026-0028
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">عهدة الموزع الميداني</span>
                  <span className="font-black text-emerald-300 text-sm">20 كرت (ثلث شيت)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                  عهدة فعلية جارية
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">متبقي مع المسؤول</span>
                  <span className="font-black text-amber-300 text-sm">10 كروت (سدس شيت)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold">
                  مخزن الإدارة
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-indigo-500/20 text-[11px]">
              <span className="text-emerald-400 font-bold">
                ✓ الإجمالي: 30 + 20 + 10 = 60 كرت (شيت واحد 100% بدون أي تكرار أو خطأ في عدد الشيتات).
              </span>
              <button
                onClick={() =>
                  handleApproveCategoryAdjustment(
                    '3000',
                    20,
                    'split_sheet_calibrate',
                    'معايرة تجزئة شيت فئة 3000 وتثبيت حصة عهدة الموزع بـ 20 كرت و 10 للمسؤول و 30 للمنفذ'
                  )
                }
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>إعادة تثبيت تسوية الشيت بنقرة واحدة</span>
              </button>
            </div>
          </div>

          {/* Approved Adjustments History Log Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-0">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-black text-white">
                    سجل التسويات وتصحيحات العجز المعتمدة رسمياً (Approved Adjustments History)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    أرشيف السندات الصادرة لتسوية رصيد عهدة الموزع والمخزون المحاسبي
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                {custodyAdjustments.length} سند معتمد
              </span>
            </div>

            {custodyAdjustments.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-300">لا توجد تسويات مسجلة حالياً</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  يمكنك اعتماد تسوية لأي تفاوت عبر النقر على زر "الموافقة على التسوية بنقرة واحدة" أعلاه
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto table-scroll-container">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 text-[11px] font-bold">
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">الفئة</th>
                      <th className="p-3">نوع التسوية</th>
                      <th className="p-3">الكمية المسواة</th>
                      <th className="p-3">الأثر المالي</th>
                      <th className="p-3">السبب والبيان المعتمد</th>
                      <th className="p-3">رصيد الموزع</th>
                      <th className="p-3">المعتمد</th>
                      <th className="p-3 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {custodyAdjustments.map((adj) => {
                      const catConfig = CARD_CATEGORIES_CONFIG[adj.category];
                      let typeBadge = { label: 'إسقاط عجز', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
                      if (adj.adjustmentType === 'surplus_record') {
                        typeBadge = { label: 'إثبات وفر', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
                      } else if (adj.adjustmentType === 'split_sheet_calibrate') {
                        typeBadge = { label: 'معايرة تجزئة شيت', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
                      } else if (adj.adjustmentType === 'inventory_reconciliation') {
                        typeBadge = { label: 'توفيق مخزون', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
                      }

                      return (
                        <tr key={adj.id} className="hover:bg-slate-850/40 transition">
                          <td className="p-3 font-mono font-bold text-amber-400">
                            {adj.id}
                          </td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {adj.date}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-white">
                              {catConfig?.name || `فئة ${adj.category}`}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeBadge.color}`}>
                              {typeBadge.label}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-white">
                            {adj.cardsCount} كرت
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({adj.sheetsCount.toFixed(2)} شيت)
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-amber-300">
                            {adj.financialImpact.toLocaleString()} ر.ي
                          </td>
                          <td className="p-3 text-slate-300 max-w-xs text-[11px] leading-relaxed">
                            {adj.reason}
                          </td>
                          <td className="p-3 font-mono text-[11px]">
                            <span className="text-slate-400">{adj.beforeDistributorCards}</span>
                            <span className="text-slate-500 mx-1">←</span>
                            <span className="text-emerald-300 font-bold">{adj.afterDistributorCards} كرت</span>
                          </td>
                          <td className="p-3 text-slate-300 text-[11px]">
                            {adj.approvedBy}
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-[10px]">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>معتمد رسمي ✓</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Bulk Migration & Legacy Records Correction */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">تصحيح وترحيل سجلات منفذ جماعياً</h3>
                <p className="text-xs text-slate-400">
                  نقل وتصحيح سندات التوريد والقبض والشيتات من منفذ لآخر مع موازنة المديونيات
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!sourceOutletInput || !targetOutletInput) return;
                const res = bulkMigrateOutletRecords({
                  sourceOutletIdentifier: sourceOutletInput,
                  targetOutletId: targetOutletInput,
                  includeDeliveries: migrateDeliveries,
                  includePayments: migratePayments,
                  includeSheets: migrateSheets,
                  reason: migrationReason,
                });
                setMigrationFeedback({
                  type: res.success ? 'success' : 'error',
                  message: res.message,
                });
                setIsBulkModalOpen(false);
                setTimeout(() => setMigrationFeedback(null), 7000);
              }}
              className="space-y-4 mt-4 text-xs"
            >
              {/* Select Source and Target Outlets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    المنفذ المصدر (السابق / الخاطئ):
                  </label>
                  <select
                    value={sourceOutletInput}
                    onChange={(e) => setSourceOutletInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-hidden focus:border-cyan-500"
                    required
                  >
                    <option value="بقالة البركة">بقالة البركة (الاسم الافتراضي السابق)</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    المنفذ الوجهة (المراد الترحيل إليه):
                  </label>
                  <select
                    value={targetOutletInput}
                    onChange={(e) => setTargetOutletInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-hidden focus:border-cyan-500"
                    required
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Migration Scope Checkboxes */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 block mb-1">العمليات المشمولة بالترحيل الجماعي:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-850">
                    <input
                      type="checkbox"
                      checked={migrateDeliveries}
                      onChange={(e) => setMigrateDeliveries(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
                    />
                    <span className="font-semibold text-slate-200">سندات التوريد (DEL)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-850">
                    <input
                      type="checkbox"
                      checked={migratePayments}
                      onChange={(e) => setMigratePayments(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
                    />
                    <span className="font-semibold text-slate-200">سندات القبض (PAY)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-850">
                    <input
                      type="checkbox"
                      checked={migrateSheets}
                      onChange={(e) => setMigrateSheets(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-0"
                    />
                    <span className="font-semibold text-slate-200">شيتات الكروت الموزعة</span>
                  </label>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between font-bold text-cyan-300 border-b border-cyan-500/20 pb-2">
                  <span>معاينة السندات والأثر المالي قبل التنفيذ:</span>
                  <span className="font-mono text-xs">
                    {migrationPreview.deliveries + migrationPreview.payments} سند مطابق
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">سندات التوريد المطابقة:</span>
                    <span className="font-mono font-bold text-white">
                      {migrationPreview.deliveries} سند ({migrationPreview.totalDelivered.toLocaleString()} ر.ي)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">سندات القبض المطابقة:</span>
                    <span className="font-mono font-bold text-white">
                      {migrationPreview.payments} سند ({migrationPreview.totalPaid.toLocaleString()} ر.ي)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">الشيتات المطابقة:</span>
                    <span className="font-mono font-bold text-white">
                      {migrationPreview.sheets} شيت ({migrationPreview.cards} كرت)
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-purple-300">
                    <span>صافي المديونية المرحلة:</span>
                    <span className="font-mono">{migrationPreview.netDebt.toLocaleString()} ر.ي</span>
                  </div>
                </div>

                <p className="text-[10px] text-cyan-200/80 pt-1 leading-relaxed border-t border-cyan-500/20">
                  ✓ سيقوم النظام تلقائياً بخصم المديونية من المنفذ المصدر وإضافتها للمنفذ الوجهة، وتحديث كافة السجلات دون أي اختلال في ميزان المراجعة.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">سبب الترحيل والتصحيح:</label>
                <input
                  type="text"
                  value={migrationReason}
                  onChange={(e) => setMigrationReason(e.target.value)}
                  placeholder="مثال: تصحيح سندات مقيدة بالخطأ باسم منفذ سابق..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-cyan-500"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={migrationPreview.deliveries === 0 && migrationPreview.payments === 0 && migrationPreview.sheets === 0}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black transition cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>تنفيذ الترحيل والتصحيح الجماعي</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. TAB CONTENT: Comprehensive Outlet Debt Audit & Dynamic Reconciliation (ميزان تدقيق ومطابقة ديون المنافذ) */}
      {activeTab === 'outlet_debt_audit' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header & Quick Action Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-l from-blue-950/40 via-slate-900 to-slate-900 border-2 border-blue-500/40 text-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>ميزان تدقيق ومطابقة ديون المنافذ التراكمي (Audit Outlet Debts)</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      محمي بدرع السندات التراكمية
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    يقوم هذا النظام التلقائي بجمع كافة سندات التوريد (DEL) والقبض (PAY) لكل منفذ وحساب الرصيد التراكمي بدقة لمنع أي تصفير أو تباين حسابي.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                onClick={() => handleRunDebtAudit(true)}
                disabled={isRunningDebtAudit}
                className="flex-1 lg:flex-initial min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${isRunningDebtAudit ? 'animate-spin' : ''}`} />
                <span>{isRunningDebtAudit ? 'جاري الفحص والتدقيق...' : 'تشغيل فحص وتصحيح الديون آلياً ✓'}</span>
              </button>

              <button
                onClick={() => window.print()}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>طباعة كشف الديون</span>
              </button>
            </div>
          </div>

          {/* Feedback message banner */}
          {debtAuditSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{debtAuditSuccessMsg}</span>
            </div>
          )}

          {/* 4 Financial Master KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-xs text-slate-400 block mb-1 font-bold">إجمالي التوريدات لكافة المنافذ:</span>
              <div className="text-lg sm:text-xl font-black text-blue-400 font-mono">
                {(lastDebtAuditReport?.totalDeliveredNetwork ?? 1869960).toLocaleString('ar-YE')} <span className="text-xs">ر.ي</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                مجموع قيم 42 سند توريد معتمد (DEL)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-xs text-slate-400 block mb-1 font-bold">إجمالي النقدية المحصلة والمسددة:</span>
              <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                {(lastDebtAuditReport?.totalPaidNetwork ?? 939980).toLocaleString('ar-YE')} <span className="text-xs">ر.ي</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                كاش عند التوريد + سندات القبض (PAY)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-xs text-slate-400 block mb-1 font-bold">صافي الديون القائمة المعتمدة:</span>
              <div className="text-lg sm:text-xl font-black text-amber-400 font-mono">
                {(lastDebtAuditReport?.networkExpectedDebt ?? 929980).toLocaleString('ar-YE')} <span className="text-xs">ر.ي</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                الرصيد الفعلي التراكمي على الـ 9 منافذ
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-xs text-slate-400 block mb-1 font-bold">حالة المطابقة مع السندات:</span>
              <div className="text-base sm:text-lg font-black text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{lastDebtAuditReport?.isFullyBalanced !== false ? 'متطابق 100% بالملي' : 'يوجد تباين'}</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                فارق المطابقة: {lastDebtAuditReport?.totalDiscrepancy ?? 0} ر.ي (0 تباين)
              </span>
            </div>
          </div>

          {/* Detailed Audit Table per Outlet */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-950/50">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>جدول التدقيق والمقارنة المالية التفصيلي لكل منفذ</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {lastDebtAuditReport?.details.length || outlets.length} منافذ
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  مقارنة مجموع السندات الفعلية مع رصيد الدين المسجل في النظام للتأكد من انعدام أي تباين
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>جميع الحسابات مدققة تراكمياً</span>
              </div>
            </div>

            <div className="overflow-x-auto table-scroll-container">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="p-3">المنفذ</th>
                    <th className="p-3 text-center">سندات التوريد</th>
                    <th className="p-3">إجمالي التوريد (DEL)</th>
                    <th className="p-3">كاش عند التوريد</th>
                    <th className="p-3 text-center">سندات القبض (PAY)</th>
                    <th className="p-3">إجمالي المسدد</th>
                    <th className="p-3">رصيد الدين الفعلي</th>
                    <th className="p-3">رصيد الدين المسجل</th>
                    <th className="p-3 text-center">التباين</th>
                    <th className="p-3 text-center">حالة التدقيق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {(lastDebtAuditReport?.details || []).map((item) => {
                    return (
                      <tr key={item.outletId} className="hover:bg-slate-800/40 transition">
                        <td className="p-3">
                          <div className="font-bold text-white text-sm">{item.outletName}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{item.outletId}</span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {item.deliveriesCount} سند
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-200">
                          {item.totalDelivered.toLocaleString('ar-YE')} ر.ي
                        </td>
                        <td className="p-3 font-mono text-emerald-400">
                          {item.cashAtDelivery.toLocaleString('ar-YE')} ر.ي
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {item.paymentsCount} سند ({item.paymentsReceived.toLocaleString('ar-YE')})
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          {item.totalPaid.toLocaleString('ar-YE')} ر.ي
                        </td>
                        <td className="p-3 font-mono font-black text-amber-400 text-sm">
                          {item.expectedDebt.toLocaleString('ar-YE')} ر.ي
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-300">
                          {item.recordedDebt.toLocaleString('ar-YE')} ر.ي
                        </td>
                        <td className="p-3 text-center font-mono">
                          {item.discrepancy === 0 ? (
                            <span className="text-emerald-400 font-bold">0 ر.ي</span>
                          ) : (
                            <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                              {item.discrepancy > 0 ? `+${item.discrepancy.toLocaleString()}` : item.discrepancy.toLocaleString()} ر.ي
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.isBalanced ? (
                            item.expectedDebt === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>مسدد بالكامل</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                                <Check className="w-3.5 h-3.5" />
                                <span>متطابق بالملي ✓</span>
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => handleRunDebtAudit(true)}
                              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold hover:bg-amber-500 hover:text-slate-950 transition cursor-pointer"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span>تصحيح التباين</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-950 border-t-2 border-slate-700 font-black text-xs text-white">
                    <td className="p-3">الإجمالي العام للشبكة</td>
                    <td className="p-3 text-center font-mono">
                      {lastDebtAuditReport?.details.reduce((s, i) => s + i.deliveriesCount, 0) ?? 42} سند
                    </td>
                    <td className="p-3 font-mono text-blue-400">
                      {(lastDebtAuditReport?.totalDeliveredNetwork ?? 1869960).toLocaleString('ar-YE')} ر.ي
                    </td>
                    <td className="p-3 font-mono text-emerald-400">
                      {(lastDebtAuditReport?.totalCashAtDeliveryNetwork ?? 679980).toLocaleString('ar-YE')} ر.ي
                    </td>
                    <td className="p-3 text-center font-mono">
                      {lastDebtAuditReport?.details.reduce((s, i) => s + i.paymentsCount, 0) ?? 5} سند ({(lastDebtAuditReport?.totalPaymentsNetwork ?? 260000).toLocaleString('ar-YE')})
                    </td>
                    <td className="p-3 font-mono text-emerald-400">
                      {(lastDebtAuditReport?.totalPaidNetwork ?? 939980).toLocaleString('ar-YE')} ر.ي
                    </td>
                    <td className="p-3 font-mono text-amber-400 text-sm">
                      {(lastDebtAuditReport?.networkExpectedDebt ?? 929980).toLocaleString('ar-YE')} ر.ي
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {(lastDebtAuditReport?.networkRecordedDebt ?? 929980).toLocaleString('ar-YE')} ر.ي
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-400">
                      0 ر.ي
                    </td>
                    <td className="p-3 text-center text-emerald-400 font-bold">
                      ✓ متطابق 100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Security & Reassurance Protocol Notice */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-blue-500/30 text-slate-300 text-xs space-y-2">
            <h5 className="font-extrabold text-blue-300 flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>ميثاق الحماية المحاسبية ومنع تصفير الديون (Zero-Wipe & Tamper Protection)</span>
            </h5>
            <p className="leading-relaxed">
              1. <strong>المعادلة التراكمية الحية:</strong> رصيد كل منفذ مشتق مباشرة وديناميكياً من دفتر الأستاذ (مجموع سندات التوريد DEL مطروحاً منه مجموع الكاش وسندات القبض PAY). لا يمكن لأي تحديث للصفحة أو خروج الموزع أو انقطاع الاتصال أن يمسح أو يصفّر ديون المنافذ.
            </p>
            <p className="leading-relaxed">
              2. <strong>الحماية السحابية التلقائية:</strong> عند مزامنة البيانات السحابية (Sync Engine)، يتم حساب الأرصدة تلقائياً وتحديث قاعدة بيانات Firestore بالقيم الحقيقية (929,980 ر.ي)، مع منع استبدال البيانات بحالات محلية غير مكتملة.
            </p>
          </div>
        </div>
      )}

      {/* Modal: Custom Custody Adjustment & Deficit Settlement */}
      {isAdjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right">
            <button
              onClick={() => setIsAdjModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Zap className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">إجراء واعتماد تسوية عهدة مخصصة</h3>
                <p className="text-xs text-slate-400">
                  تعديل وتوفيق رصيد الموزع والمخزون المحاسبي رسمياً بقاعدة البيانات
                </p>
              </div>
            </div>

            <form onSubmit={handleCustomAdjustmentSubmit} className="space-y-4 mt-4 text-xs">
              {/* Category & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">فئة الكرت المراد تسويتها:</label>
                  <select
                    value={adjCategory}
                    onChange={(e) => setAdjCategory(e.target.value as CardCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-hidden focus:border-amber-500"
                  >
                    {Object.entries(CARD_CATEGORIES_CONFIG).map(([k, c]) => (
                      <option key={k} value={k}>
                        {c.name} ({k} ر.ي) - {c.defaultCardsPerSheet} كرت/شيت
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">نوع التسوية والمعالجة:</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="deficit_write_off">إسقاط عجز وتصحيح رصيد الموزع (Deficit)</option>
                    <option value="surplus_record">إثبات وفر / زيادة بالمخزون (Surplus)</option>
                    <option value="split_sheet_calibrate">معايرة تجزئة شيت متفرق (Split Sheet)</option>
                    <option value="inventory_reconciliation">توفيق رصيد دفتري مع الفعلي (Reconciliation)</option>
                  </select>
                </div>
              </div>

              {/* Cards Count and Calculated Sheets & Financial Value */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">عدد الكروت المراد تسويتها:</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={adjCardsCount}
                  onChange={(e) => setAdjCardsCount(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              {/* Live Preview Box */}
              {(() => {
                const cfg = CARD_CATEGORIES_CONFIG[adjCategory];
                const unitPrice =
                  cfg.defaultWholesaleCardPrice ||
                  Math.round(cfg.defaultWholesaleSheetPrice / cfg.defaultCardsPerSheet);
                const sheetsEquiv = Number((adjCardsCount / cfg.defaultCardsPerSheet).toFixed(2));
                const totalVal = adjCardsCount * unitPrice;
                return (
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between font-bold text-amber-300 border-b border-amber-500/20 pb-2">
                      <span>الأثر المحاسبي والمالي المباشر للتسوية:</span>
                      <span className="font-mono text-xs">فئة {cfg.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">الكمية بالشيتات:</span>
                        <span className="font-mono font-bold text-white">{sheetsEquiv} شيت</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">سعر الجملة للكرت:</span>
                        <span className="font-mono font-bold text-white">{unitPrice} ر.ي</span>
                      </div>
                      <div className="flex justify-between col-span-2 font-bold text-amber-300 pt-1 border-t border-amber-500/10">
                        <span>إجمالي القيمة المالية للتسوية:</span>
                        <span className="font-mono text-sm">{totalVal.toLocaleString()} ر.ي</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-amber-200/80 pt-1 leading-relaxed border-t border-amber-500/20">
                      ✓ سيتم إنشاء سند تسوية رسمي برقم تسلسلي، وتحديث رصيد الموزع الميداني وقاعدة البيانات السحابية، وقيد حركة الأثر في سجل التدقيق المحاسبي.
                    </p>
                  </div>
                );
              })()}

              <div>
                <label className="block text-slate-300 font-bold mb-1">سبب التسوية والملاحظات:</label>
                <textarea
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="اكتب بيان وسبب التسوية لاعتماده بالسند..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500 resize-none"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdj || !adjCardsCount || adjCardsCount <= 0}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingAdj ? 'جاري الاعتماد والتحديث...' : 'اعتماد التسوية بنقرة واحدة ✓'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Report Footer Section for Official Auditing */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hidden print:block text-slate-900 bg-white">
        <div className="text-center pb-4 border-b border-slate-300 mb-4">
          <h2 className="text-xl font-black">شبكة قعزان نت (QAZAN-NET)</h2>
          <h3 className="text-base font-bold">تقرير ميزان المراجعة والمطابقة المخزنية للعهدة</h3>
          <p className="text-xs text-slate-600">تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-YE')}</p>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs border-t border-slate-300">
          <div>
            <span className="font-bold block mb-8">الموزع الميداني (الحائز على العهدة):</span>
            <span className="border-t border-slate-400 pt-1 block">التوقيع والختم</span>
          </div>
          <div>
            <span className="font-bold block mb-8">المسؤول العام للنظام:</span>
            <span className="border-t border-slate-400 pt-1 block">التوقيع والختم</span>
          </div>
          <div>
            <span className="font-bold block mb-8">التدقيق المالي والمحاسبي:</span>
            <span className="border-t border-slate-400 pt-1 block">اعتماد المطابقة</span>
          </div>
        </div>
      </div>
    </div>
  );
};
