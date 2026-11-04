import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Coins,
  Wallet,
  TrendingDown,
  TrendingUp,
  Printer,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Truck,
  Wifi,
  Zap,
  Wrench,
  Layers,
  Users,
  FileText,
  Edit2,
  Trash2,
  X,
  CreditCard,
  Briefcase,
  DollarSign,
  ChevronDown,
  Percent,
  Coffee,
  Calendar,
  Target,
  Check,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExpenseCategory, ExpensePaymentMethod, ExpenseItem, MonthlyBudget } from '../types';
import { getArabicMonthName, getArabicMonthOnly } from '../utils/batchNaming';

export const EXPENSE_CATEGORIES_CONFIG: Record<
  ExpenseCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  printing_cards: {
    label: 'طباعة كروت وورق وتغليف',
    icon: Layers,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15 border-amber-500/30',
  },
  internet_bandwidth: {
    label: 'اشتراك إنترنت وفايبر رئيسي',
    icon: Wifi,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15 border-cyan-500/30',
  },
  power_energy: {
    label: 'طاقة شمسية وكهرباء ومحروقات',
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15 border-yellow-500/30',
  },
  maintenance_hardware: {
    label: 'صيانة راوترات وأجهزة وكابلات',
    icon: Wrench,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15 border-rose-500/30',
  },
  site_rentals: {
    label: 'إيجارات أبراج ومواقع البث',
    icon: Building2,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15 border-purple-500/30',
  },
  transport_distribution: {
    label: 'مواصلات وبترول التوزيع الميداني',
    icon: Truck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/30',
  },
  salaries_commissions: {
    label: 'رواتب وعمولات وبدلات',
    icon: Users,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15 border-blue-500/30',
  },
  capital_assets: {
    label: 'أصول ومعدات جديدة للمشروع',
    icon: Briefcase,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/15 border-indigo-500/30',
  },
  hospitality_misc: {
    label: 'نثريات وضيافة وإداريات',
    icon: Coffee,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15 border-orange-500/30',
  },
  other: {
    label: 'مصروفات أخرى متنوعة',
    icon: FileText,
    color: 'text-slate-400',
    bg: 'bg-slate-500/15 border-slate-500/30',
  },
};

function CoffeeIcon({ className }: { className?: string }) {
  return <Receipt className={className} />;
}

export const PAYMENT_METHODS_CONFIG: Record<
  ExpensePaymentMethod,
  { label: string; desc: string; color: string; badgeBg: string }
> = {
  admin_cash: {
    label: 'خزينة الإدارة (الصندوق الرئيسي)',
    desc: 'صرف مباشر من الخزينة النقدية الرئيسية',
    color: 'text-amber-300',
    badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  },
  distributor_cash: {
    label: 'عهدة الموزع الميدانية (خصم من الكاش)',
    desc: 'يخصم من النقدية المحصلة التي بعهدة الموزع',
    color: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  },
  bank_wallet: {
    label: 'حساب بنكي / محفظة إلكترونية',
    desc: 'سداد عبر الكريمي / ون كاش / جايبي / بنك',
    color: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
  },
  credit_payable: {
    label: 'آجل / حساب المورد (دائنون)',
    desc: 'قيد على الحساب يُسدد في وقت لاحق',
    color: 'text-rose-300',
    badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
  },
};

export const ExpensesView: React.FC = () => {
  const {
    currentRole,
    expenses,
    createExpense,
    updateExpense,
    deleteExpense,
    totalExpensesAmount,
    distributorPaidExpensesAmount,
    adminPaidExpensesAmount,
    netProjectProfit,
    deliveries,
    directSales,
    batches,
    monthlyBudgets,
    setMonthlyBudget,
    deleteMonthlyBudget,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'expenses_list' | 'pnl_summary' | 'suppliers'>('expenses_list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month'>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Monthly Budget State
  const [budgetMonth, setBudgetMonth] = useState<string>(() => new Date().toISOString().slice(0, 7)); // e.g. "2026-11"
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetModalMonth, setBudgetModalMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [budgetModalAmount, setBudgetModalAmount] = useState<number | ''>('');
  const [budgetModalNotes, setBudgetModalNotes] = useState<string>('');
  const [budgetSuccessMsg, setBudgetSuccessMsg] = useState<string>('');
  const [budgetErrorMsg, setBudgetErrorMsg] = useState<string>('');

  // Available Months for Expenses & Budgets
  const availableExpenseMonths = useMemo(() => {
    const set = new Set<string>();
    const currentMonth = new Date().toISOString().slice(0, 7);
    set.add(currentMonth); // "2026-11"
    
    // Add next month for advance planning
    const [y, m] = currentMonth.split('-').map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    set.add(nextMonth);

    // Add previous month
    const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    set.add(prevMonth);

    // Add months from expenses
    expenses.forEach((e) => {
      if (e.date) set.add(e.date.slice(0, 7));
    });

    // Add months from monthlyBudgets
    Object.keys(monthlyBudgets).forEach((mKey) => set.add(mKey));

    return Array.from(set).sort().reverse();
  }, [expenses, monthlyBudgets]);

  // Current selected month budget metrics
  const currentMonthBudget = monthlyBudgets[budgetMonth];
  const targetBudgetAmount = currentMonthBudget?.budgetAmount || 0;

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((e) => e.date && e.date.startsWith(budgetMonth));
  }, [expenses, budgetMonth]);

  const currentMonthSpentAmount = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [currentMonthExpenses]);

  const budgetUsagePercent = targetBudgetAmount > 0 
    ? Number(((currentMonthSpentAmount / targetBudgetAmount) * 100).toFixed(1)) 
    : 0;

  const isBudgetExceeded = targetBudgetAmount > 0 && currentMonthSpentAmount > targetBudgetAmount;
  const budgetExcessAmount = currentMonthSpentAmount - targetBudgetAmount;
  const budgetRemainingAmount = targetBudgetAmount - currentMonthSpentAmount;
  const isBudgetNearLimit = targetBudgetAmount > 0 && !isBudgetExceeded && budgetUsagePercent >= 80;

  const openBudgetModalForMonth = (m: string) => {
    const existing = monthlyBudgets[m];
    setBudgetModalMonth(m);
    setBudgetModalAmount(existing?.budgetAmount !== undefined ? existing.budgetAmount : '');
    setBudgetModalNotes(existing?.notes || '');
    setBudgetSuccessMsg('');
    setBudgetErrorMsg('');
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetModalMonth) {
      setBudgetErrorMsg('يرجى اختيار الشهر المحاسبي');
      return;
    }
    const num = Number(budgetModalAmount);
    if (isNaN(num) || num < 0) {
      setBudgetErrorMsg('يرجى إدخال مبلغ ميزانية صالح (0 أو أكبر)');
      return;
    }

    const res = setMonthlyBudget(budgetModalMonth, num, budgetModalNotes);
    if (res.success) {
      setBudgetSuccessMsg(`تم اعتماد ميزانية شهر ${getArabicMonthName(budgetModalMonth)} بنجاح (${num.toLocaleString()} ر.ي)`);
      setTimeout(() => {
        setIsBudgetModalOpen(false);
        setBudgetSuccessMsg('');
      }, 1200);
    } else {
      setBudgetErrorMsg(res.message || 'حدث خطأ أثناء حفظ الميزانية');
    }
  };

  const handleDeleteBudget = (m: string) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في إلغاء ميزانية شهر ${getArabicMonthName(m)}؟`)) {
      deleteMonthlyBudget(m);
      setIsBudgetModalOpen(false);
    }
  };

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [singlePrintExpense, setSinglePrintExpense] = useState<ExpenseItem | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<ExpenseItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('printing_cards');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<ExpensePaymentMethod>('admin_cash');
  const [formPaidBy, setFormPaidBy] = useState(currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني');
  const [formBeneficiary, setFormBeneficiary] = useState('');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsCapitalAsset, setFormIsCapitalAsset] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<'paid' | 'pending' | 'credit'>('paid');

  const openCreateModal = () => {
    setEditingExpense(null);
    setFormTitle('');
    setFormCategory('printing_cards');
    setFormAmount('');
    setFormPaymentMethod(currentRole === 'admin' ? 'admin_cash' : 'distributor_cash');
    setFormPaidBy(currentRole === 'admin' ? 'المسؤول' : 'الموزع الميداني');
    setFormBeneficiary('');
    setFormInvoiceNumber('');
    setFormNotes('');
    setFormIsCapitalAsset(false);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormStatus('paid');
    setIsModalOpen(true);
  };

  const openEditModal = (exp: ExpenseItem) => {
    setEditingExpense(exp);
    setFormTitle(exp.title);
    setFormCategory(exp.category);
    setFormAmount(exp.amount);
    setFormPaymentMethod(exp.paymentMethod);
    setFormPaidBy(exp.paidBy);
    setFormBeneficiary(exp.beneficiary || '');
    setFormInvoiceNumber(exp.invoiceNumber || '');
    setFormNotes(exp.notes || '');
    setFormIsCapitalAsset(!!exp.isCapitalAsset);
    setFormDate(exp.date);
    setFormStatus(exp.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formAmount || Number(formAmount) <= 0) return;

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        title: formTitle,
        category: formCategory,
        amount: Number(formAmount),
        paymentMethod: formPaymentMethod,
        paidBy: formPaidBy,
        beneficiary: formBeneficiary || undefined,
        invoiceNumber: formInvoiceNumber || undefined,
        notes: formNotes || undefined,
        isCapitalAsset: formIsCapitalAsset,
        date: formDate,
        status: formStatus,
      });
    } else {
      createExpense({
        title: formTitle,
        category: formCategory,
        amount: Number(formAmount),
        paymentMethod: formPaymentMethod,
        paidBy: formPaidBy,
        beneficiary: formBeneficiary || undefined,
        invoiceNumber: formInvoiceNumber || undefined,
        notes: formNotes || undefined,
        isCapitalAsset: formIsCapitalAsset,
        date: formDate,
        status: formStatus,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteConfirmExpense) return;
    deleteExpense(deleteConfirmExpense.id);
    setDeleteConfirmExpense(null);
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    return expenses.filter((exp) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = exp.title.toLowerCase().includes(q);
        const matchId = exp.id.toLowerCase().includes(q);
        const matchBeneficiary = exp.beneficiary?.toLowerCase().includes(q);
        const matchInvoice = exp.invoiceNumber?.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchBeneficiary && !matchInvoice) return false;
      }

      // Category
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;

      // Payment Method
      if (selectedPaymentMethod !== 'all' && exp.paymentMethod !== selectedPaymentMethod) return false;

      // Month Filter
      if (selectedMonthFilter !== 'all' && (!exp.date || !exp.date.startsWith(selectedMonthFilter))) {
        return false;
      }

      // Date
      if (dateFilter === 'today' && exp.date !== todayStr) return false;
      if (dateFilter === 'this_week' && exp.date < startOfWeekStr) return false;
      if (dateFilter === 'this_month' && !exp.date.startsWith(currentMonthStr)) return false;

      return true;
    });
  }, [expenses, searchQuery, selectedCategory, selectedPaymentMethod, selectedMonthFilter, dateFilter]);

  // Overall Financial P&L calculations
  const financialSummary = useMemo(() => {
    const totalDeliveriesAmount = deliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
    const totalDirectSalesAmount = directSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalRevenue = totalDeliveriesAmount + totalDirectSalesAmount;

    const totalBatchesCost = batches.reduce((sum, b) => sum + (b.totalWholesaleValue || 0), 0);

    const operationalExpenses = expenses
      .filter((e) => !e.isCapitalAsset && e.status === 'paid')
      .reduce((sum, e) => sum + e.amount, 0);

    const capitalExpenses = expenses
      .filter((e) => e.isCapitalAsset)
      .reduce((sum, e) => sum + e.amount, 0);

    const creditExpenses = expenses
      .filter((e) => e.status === 'credit' || e.paymentMethod === 'credit_payable')
      .reduce((sum, e) => sum + e.amount, 0);

    const netProfit = totalRevenue - totalBatchesCost - operationalExpenses;
    const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    return {
      totalRevenue,
      totalBatchesCost,
      operationalExpenses,
      capitalExpenses,
      creditExpenses,
      netProfit,
      profitMargin,
    };
  }, [deliveries, directSales, batches, expenses]);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<ExpenseCategory, { count: number; total: number }> = {
      printing_cards: { count: 0, total: 0 },
      internet_bandwidth: { count: 0, total: 0 },
      power_energy: { count: 0, total: 0 },
      maintenance_hardware: { count: 0, total: 0 },
      site_rentals: { count: 0, total: 0 },
      transport_distribution: { count: 0, total: 0 },
      salaries_commissions: { count: 0, total: 0 },
      capital_assets: { count: 0, total: 0 },
      hospitality_misc: { count: 0, total: 0 },
      other: { count: 0, total: 0 },
    };

    expenses.forEach((e) => {
      if (map[e.category]) {
        map[e.category].count += 1;
        map[e.category].total += e.amount;
      }
    });

    return Object.entries(map)
      .map(([cat, val]) => ({
        category: cat as ExpenseCategory,
        config: EXPENSE_CATEGORIES_CONFIG[cat as ExpenseCategory],
        ...val,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Suppliers & Creditors Summary
  const suppliersSummary = useMemo(() => {
    const map = new Map<string, { paid: number; credit: number; count: number; lastDate: string }>();

    expenses.forEach((e) => {
      const name = e.beneficiary?.trim() || 'جهة عامة غير محددة';
      const current = map.get(name) || { paid: 0, credit: 0, count: 0, lastDate: e.date };
      if (e.paymentMethod === 'credit_payable' || e.status === 'credit') {
        current.credit += e.amount;
      } else {
        current.paid += e.amount;
      }
      current.count += 1;
      if (e.date > current.lastDate) current.lastDate = e.date;
      map.set(name, current);
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.credit - a.credit || b.paid - a.paid);
  }, [expenses]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'رقم السند',
      'التاريخ',
      'بيان المصروف',
      'التصنيف',
      'المبلغ (ر.ي)',
      'طريقة الدفع',
      'القائم بالصرف',
      'المستفيد/المورد',
      'رقم الفاتورة',
      'أصل رأسمالي',
      'الحالة',
      'الملاحظات',
    ];

    const rows = filteredExpenses.map((e) => [
      e.id,
      e.date,
      e.title,
      EXPENSE_CATEGORIES_CONFIG[e.category]?.label || e.category,
      e.amount,
      PAYMENT_METHODS_CONFIG[e.paymentMethod]?.label || e.paymentMethod,
      e.paidBy,
      e.beneficiary || '',
      e.invoiceNumber || '',
      e.isCapitalAsset ? 'نعم (أصل)' : 'لا (تشغيلي)',
      e.status === 'paid' ? 'مسدد' : e.status === 'credit' ? 'آجل' : 'معلق',
      e.notes || '',
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
    link.setAttribute('download', `كشف_المصروفات_شبكة_قعزان_نت_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Bar */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">المصروفات والنفقات التشغيلية والرأسمالية</h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ربط محاسبي بالخزينة والعهدة
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              توثيق ومتابعة مشتريات وتكاليف شبكة قعزان نت واحتساب صافي الأرباح المحاسبية بدقة
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>تسجيل سند صرف جديد</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="تصدير كشف المصروفات إلى Excel / CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>تصدير CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="طباعة تقرير المصروفات"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Monthly Budget & Financial Ceiling Control Panel */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xl space-y-3.5 ${
          isBudgetExceeded
            ? 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-rose-950/40 border-rose-500/60 shadow-rose-950/30 ring-1 ring-rose-500/40'
            : isBudgetNearLimit
            ? 'bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/30 border-amber-500/50 shadow-amber-950/20'
            : targetBudgetAmount > 0
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-slate-900/60 border-slate-800/80'
        }`}
      >
        {/* Top bar: Title, Month Selector, Set Budget Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                isBudgetExceeded
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                  : isBudgetNearLimit
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}
            >
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm text-white">الميزانية التقديرية ومراقبة سقف النفقات</h3>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                    isBudgetExceeded
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                      : isBudgetNearLimit
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : targetBudgetAmount > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isBudgetExceeded
                    ? '🚨 تجاوز سقف الميزانية'
                    : isBudgetNearLimit
                    ? '⚠️ اقتراب من السقف'
                    : targetBudgetAmount > 0
                    ? '✓ منضبط ومطابق'
                    : 'لم تحدد ميزانية'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                متابعة وتدقيق المصروفات الفعلية مقارنة بالسقف المالي المحدد لكل شهر محاسبي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Month Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 flex-1 sm:flex-initial">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <select
                value={budgetMonth}
                onChange={(e) => setBudgetMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-hidden cursor-pointer"
              >
                {availableExpenseMonths.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    شهر {getArabicMonthName(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Set Budget Button */}
            {currentRole === 'admin' && (
              <button
                onClick={() => openBudgetModalForMonth(budgetMonth)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                title="تحديد أو تعديل الميزانية التقديرية للشهر المختار"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{targetBudgetAmount > 0 ? 'تعديل ميزانية الشهر' : 'تحديد ميزانية الشهر'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Alert Banner based on status */}
        {isBudgetExceeded ? (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-black text-xs sm:text-sm text-rose-200">
                  تنبيه مالي حرج: تجاوزت مصروفات شهر {getArabicMonthName(budgetMonth)} الميزانية التقديرية بمقدار {budgetExcessAmount.toLocaleString()} ر.ي!
                </h4>
                <button
                  onClick={() => {
                    setSelectedMonthFilter(budgetMonth);
                    setActiveTab('expenses_list');
                  }}
                  className="text-[11px] underline text-rose-300 hover:text-white font-bold cursor-pointer"
                >
                  فحص وتدقيق مصروفات هذا الشهر ({currentMonthExpenses.length} سند) ←
                </button>
              </div>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                المصروفات المسجلة فعلياً بلغت <strong>{currentMonthSpentAmount.toLocaleString()} ر.ي</strong> متجاوزة السقف المحدد (<strong>{targetBudgetAmount.toLocaleString()} ر.ي</strong>) بنسبة استهلاك <strong>%{budgetUsagePercent}</strong>. يرجى مراجعة بنود الصرف أو رفع سقف الميزانية إذا اقتضت متطلبات الشبكة.
              </p>
            </div>
          </div>
        ) : isBudgetNearLimit ? (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="font-black text-xs sm:text-sm text-amber-200">
                تنبيه اقتراب من السقف المالي: تم استهلاك %{budgetUsagePercent} من ميزانية شهر {getArabicMonthName(budgetMonth)}.
              </h4>
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                المصروف الفعلي حتى الآن: <strong>{currentMonthSpentAmount.toLocaleString()} ر.ي</strong>. المتبقي المتاح للصرف حتى نهاية الشهر: <strong>{budgetRemainingAmount.toLocaleString()} ر.ي</strong> فقط من أصل <strong>{targetBudgetAmount.toLocaleString()} ر.ي</strong>.
              </p>
            </div>
          </div>
        ) : targetBudgetAmount > 0 ? (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                الميزانية التقديرية لشهر <strong>{getArabicMonthName(budgetMonth)}</strong> منضبطة ومطابقة للسقف ✓. تم استهلاك <strong>%{budgetUsagePercent}</strong> والمتبقي المتاح للصرف <strong>{budgetRemainingAmount.toLocaleString()} ر.ي</strong>.
              </span>
            </div>
            {currentMonthBudget?.notes && (
              <span className="text-[11px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                ملاحظات: {currentMonthBudget.notes}
              </span>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2 text-slate-400">
            <span>
              لم يتم تعيين ميزانية تقديرية لشهر <strong>{getArabicMonthName(budgetMonth)}</strong> حتى الآن. المصروف الفعلي المسجل: <strong>{currentMonthSpentAmount.toLocaleString()} ر.ي</strong>.
            </span>
            {currentRole === 'admin' && (
              <button
                onClick={() => openBudgetModalForMonth(budgetMonth)}
                className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
              >
                + ضبط سقف الميزانية الآن
              </button>
            )}
          </div>
        )}

        {/* Progress Bar & Figures */}
        {targetBudgetAmount > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-400">
                  الميزانية المعتمدة: <strong className="text-white font-mono">{targetBudgetAmount.toLocaleString()} ر.ي</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">
                  المنصرف الفعلي: <strong className={isBudgetExceeded ? 'text-rose-400 font-mono' : 'text-amber-300 font-mono'}>{currentMonthSpentAmount.toLocaleString()} ر.ي</strong>
                </span>
              </div>
              <div className="font-bold">
                {isBudgetExceeded ? (
                  <span className="text-rose-400 font-mono">عجز وتجاوز: +{budgetExcessAmount.toLocaleString()} ر.ي (%{budgetUsagePercent})</span>
                ) : (
                  <span className="text-emerald-400 font-mono">المتبقي للصرف: {budgetRemainingAmount.toLocaleString()} ر.ي (متبقي %{(100 - budgetUsagePercent).toFixed(1)})</span>
                )}
              </div>
            </div>

            <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5 flex">
              <div
                style={{ width: `${Math.min(100, budgetUsagePercent)}%` }}
                className={`h-full rounded-full transition-all ${
                  isBudgetExceeded
                    ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                    : isBudgetNearLimit
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* 6 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Expenses */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-rose-400" />
            <span>إجمالي المصروفات</span>
          </span>
          <div className="text-xl font-black text-rose-400">
            {totalExpensesAmount.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ر.ي</span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            بموجب {expenses.length} سند صرف معتمد
          </span>
        </div>

        {/* Monthly Budget Card */}
        <div
          onClick={() => currentRole === 'admin' && openBudgetModalForMonth(budgetMonth)}
          className={`p-4 rounded-2xl border space-y-1 transition ${
            currentRole === 'admin' ? 'cursor-pointer hover:border-slate-700' : ''
          } ${
            isBudgetExceeded
              ? 'bg-rose-950/20 border-rose-500/40'
              : isBudgetNearLimit
              ? 'bg-amber-950/20 border-amber-500/40'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Target className={`w-3.5 h-3.5 ${isBudgetExceeded ? 'text-rose-400' : 'text-amber-400'}`} />
              <span>ميزانية {getArabicMonthOnly(budgetMonth)}</span>
            </span>
            {targetBudgetAmount > 0 && (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                  isBudgetExceeded
                    ? 'bg-rose-500/20 text-rose-300'
                    : isBudgetNearLimit
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                %{budgetUsagePercent}
              </span>
            )}
          </span>
          <div className="text-xl font-black text-white font-mono">
            {targetBudgetAmount > 0 ? targetBudgetAmount.toLocaleString() : 'غير محددة'}{' '}
            <span className="text-xs font-normal text-slate-400">{targetBudgetAmount > 0 ? 'ر.ي' : ''}</span>
          </div>
          <span className={`text-[10px] block font-bold ${isBudgetExceeded ? 'text-rose-400' : 'text-slate-400'}`}>
            {isBudgetExceeded
              ? `🚨 تجاوز: +${budgetExcessAmount.toLocaleString()} ر.ي`
              : targetBudgetAmount > 0
              ? `المنفق: ${currentMonthSpentAmount.toLocaleString()} ر.ي`
              : 'انقر لتحديد الميزانية'}
          </span>
        </div>

        {/* Admin Cash & Bank */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span>خزينة الإدارة والمحافظ</span>
          </span>
          <div className="text-xl font-black text-amber-300">
            {adminPaidExpensesAmount.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ر.ي</span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            صُرفت من خزينة الإدارة والمحافظ
          </span>
        </div>

        {/* Distributor Field Expenses */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 bg-emerald-950/20 space-y-1">
          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            <span>مصروفات عهدة الموزع</span>
          </span>
          <div className="text-xl font-black text-emerald-300">
            {distributorPaidExpensesAmount.toLocaleString()}{' '}
            <span className="text-xs font-normal text-emerald-400/80">ر.ي</span>
          </div>
          <span className="text-[10px] text-emerald-300/80 font-bold block">
            ✓ خُصمت رسمياً من الكاش المحصل
          </span>
        </div>

        {/* Credit / Payables */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>المصروفات الآجلة (دائنون)</span>
          </span>
          <div className="text-xl font-black text-purple-300">
            {financialSummary.creditExpenses.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ر.ي</span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            مستحقات للموردين لم تسدد بعد
          </span>
        </div>

        {/* Net Project Profit */}
        <div
          className={`p-4 rounded-2xl border space-y-1 col-span-2 md:col-span-1 ${
            netProjectProfit >= 0
              ? 'bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-500/40'
              : 'bg-gradient-to-br from-rose-950/40 to-slate-900 border-rose-500/40'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TrendingUp className={`w-3.5 h-3.5 ${netProjectProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span>صافي الأرباح</span>
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                financialSummary.profitMargin >= 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              %{financialSummary.profitMargin}
            </span>
          </span>
          <div
            className={`text-xl font-black ${
              netProjectProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'
            }`}
          >
            {netProjectProfit.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ر.ي</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            المبيعات - تكلفة الكروت - المصروفات
          </span>
        </div>
      </div>

      {/* Tabs Switcher: Expenses List | P&L Summary | Suppliers */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto table-scroll-container">
        <button
          onClick={() => setActiveTab('expenses_list')}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer shrink-0 active:scale-95 ${
            activeTab === 'expenses_list'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>سجل سندات المصروفات ({filteredExpenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pnl_summary')}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer shrink-0 active:scale-95 ${
            activeTab === 'pnl_summary'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>قائمة الأرباح والخسائر والتحليل المالي 📊</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black transition cursor-pointer shrink-0 active:scale-95 ${
            activeTab === 'suppliers'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>سجل الموردين والدائنين ({suppliersSummary.length})</span>
          {financialSummary.creditExpenses > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
              ديون قائمة
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Expenses List */}
      {activeTab === 'expenses_list' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم السند، بيان المصروف، اسم المورد، رقم الفاتورة..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {/* Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-hidden focus:border-amber-500 cursor-pointer"
              >
                <option value="all">كل بنود وتصنيفات المصروفات</option>
                {Object.entries(EXPENSE_CATEGORIES_CONFIG).map(([k, cfg]) => (
                  <option key={k} value={k}>
                    {cfg.label}
                  </option>
                ))}
              </select>

              {/* Payment Method Filter */}
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold focus:outline-hidden focus:border-amber-500 cursor-pointer"
              >
                <option value="all">كل طرق الدفع ومصادر التمويل</option>
                {Object.entries(PAYMENT_METHODS_CONFIG).map(([k, cfg]) => (
                  <option key={k} value={k}>
                    {cfg.label}
                  </option>
                ))}
              </select>

              {/* Month Selector Filter */}
              <select
                value={selectedMonthFilter}
                onChange={(e) => {
                  setSelectedMonthFilter(e.target.value);
                  if (e.target.value !== 'all') {
                    setDateFilter('all');
                  }
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-hidden focus:border-amber-500 cursor-pointer"
              >
                <option value="all">كل الشهور المحاسبية</option>
                {availableExpenseMonths.map((m) => (
                  <option key={m} value={m}>
                    شهر {getArabicMonthName(m)}
                  </option>
                ))}
              </select>

              {/* Date Filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    dateFilter === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setDateFilter('today')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    dateFilter === 'today' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  اليوم
                </button>
                <button
                  onClick={() => setDateFilter('this_month')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    dateFilter === 'this_month' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  هذا الشهر
                </button>
              </div>
            </div>
          </div>

          {/* Table of Expenses */}
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 space-y-3">
              <Receipt className="w-12 h-12 mx-auto text-slate-600 stroke-1" />
              <p className="text-sm font-bold text-slate-300">لم يتم العثور على أي سندات مصروفات مطابقة للبحث</p>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل مصروف جديد</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto table-scroll-container">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[11px] font-bold">
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">بيان وتفاصيل المصروف</th>
                      <th className="p-3">التصنيف</th>
                      <th className="p-3">المبلغ (ر.ي)</th>
                      <th className="p-3">طريقة الدفع ومصدر التمويل</th>
                      <th className="p-3">القائم بالصرف</th>
                      <th className="p-3">المورد / المستفيد</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredExpenses.map((exp) => {
                      const catConfig = EXPENSE_CATEGORIES_CONFIG[exp.category] || EXPENSE_CATEGORIES_CONFIG.other;
                      const CatIcon = catConfig.icon;
                      const payConfig = PAYMENT_METHODS_CONFIG[exp.paymentMethod];

                      return (
                        <tr key={exp.id} className="hover:bg-slate-850/50 transition-colors">
                          {/* Voucher ID */}
                          <td className="p-3 font-mono font-bold text-amber-400">
                            {exp.id}
                          </td>

                          {/* Date */}
                          <td className="p-3 font-mono text-slate-400 text-[11px]">
                            {exp.date}
                          </td>

                          {/* Title & Notes */}
                          <td className="p-3 max-w-xs">
                            <div className="font-extrabold text-white text-xs leading-snug">
                              {exp.title}
                            </div>
                            {exp.notes && (
                              <div className="text-[10px] text-slate-400 truncate mt-0.5" title={exp.notes}>
                                {exp.notes}
                              </div>
                            )}
                            {exp.invoiceNumber && (
                              <span className="inline-block text-[9px] font-mono bg-slate-950 px-1.5 py-0.2 rounded-sm text-slate-400 mt-1">
                                فاتورة: {exp.invoiceNumber}
                              </span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${catConfig.bg} ${catConfig.color}`}>
                              <CatIcon className="w-3 h-3" />
                              <span>{catConfig.label}</span>
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="p-3 font-mono">
                            <div className="font-black text-rose-400 text-sm">
                              {exp.amount.toLocaleString()}{' '}
                              <span className="text-[10px] font-normal text-slate-400">ر.ي</span>
                            </div>
                            {exp.isCapitalAsset && (
                              <span className="text-[9px] font-bold text-indigo-400 block mt-0.5">
                                [أصل رأسمالي]
                              </span>
                            )}
                          </td>

                          {/* Payment Method */}
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${payConfig.badgeBg}`}>
                              <span>{payConfig.label}</span>
                            </span>
                          </td>

                          {/* Paid By */}
                          <td className="p-3 text-[11px] text-slate-300 font-bold">
                            {exp.paidBy}
                          </td>

                          {/* Beneficiary */}
                          <td className="p-3 text-[11px] text-slate-300">
                            {exp.beneficiary || '—'}
                          </td>

                          {/* Status */}
                          <td className="p-3 text-center">
                            {exp.paymentMethod === 'credit_payable' || exp.status === 'credit' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-500/30">
                                <Clock className="w-3 h-3" />
                                <span>آجل غير مسدد</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>مسدد نقداً ✓</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSinglePrintExpense(exp)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition cursor-pointer"
                                title="معاينة وطباعة سند صرف رسمي"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditModal(exp)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                                title="تعديل السند"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmExpense(exp)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                title="حذف السند"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: P&L Summary & Financial Analytics */}
      {activeTab === 'pnl_summary' && (
        <div className="space-y-6">
          {/* Income Statement Matrix */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>قائمة الدخل والأرباح والخسائر التقديرية (P&L Income Statement)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                التقرير المالي التراكمي لشبكة قعزان نت: مطابقة الإيرادات المحققة مع تكاليف الكروت والمصروفات
              </p>
            </div>

            <div className="space-y-3 font-sans text-sm">
              {/* Gross Revenue */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">1. إجمالي الإيرادات المحققة (Gross Sales)</span>
                  <span className="text-[11px] text-slate-400">
                    مبيعات المنافذ الموردة + المبيعات المباشرة للأفراد
                  </span>
                </div>
                <div className="font-mono font-black text-emerald-400 text-lg">
                  +{financialSummary.totalRevenue.toLocaleString()} ر.ي
                </div>
              </div>

              {/* COGS (Card Printing Cost) */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">2. تكلفة الكروت المطبوعة (Cost of Goods Sold)</span>
                  <span className="text-[11px] text-slate-400">
                    إجمالي القيمة التكليفية للطباعة لكافة الدفعات
                  </span>
                </div>
                <div className="font-mono font-black text-rose-400 text-lg">
                  -{financialSummary.totalBatchesCost.toLocaleString()} ر.ي
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">3. المصروفات التشغيلية والنفقات (Operating Expenses)</span>
                  <span className="text-[11px] text-slate-400">
                    إنترنت، طاقة، صيانة، مواصلات، رواتب ونثريات
                  </span>
                </div>
                <div className="font-mono font-black text-rose-400 text-lg">
                  -{financialSummary.operationalExpenses.toLocaleString()} ر.ي
                </div>
              </div>

              {/* Capital Assets (Memorandum) */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-850 flex items-center justify-between text-xs text-slate-400">
                <div>
                  <span className="font-bold text-slate-300 block">مشتريات أصول ومعدات رأسمالية (Capital Assets)</span>
                  <span className="text-[10px]">بطاريات، ألواح طاقة، راوترات جديدة (تضاف كأصول للمشروع)</span>
                </div>
                <div className="font-mono font-bold text-indigo-400">
                  {financialSummary.capitalExpenses.toLocaleString()} ر.ي
                </div>
              </div>

              {/* Net Profit Bar */}
              <div
                className={`p-5 rounded-2xl border-2 flex items-center justify-between ${
                  financialSummary.netProfit >= 0
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/50 text-rose-300'
                }`}
              >
                <div>
                  <span className="text-base font-black block">صافي الربح الفعلي للمشروع (Net Profit)</span>
                  <span className="text-xs text-slate-300">
                    هامش الربح التشغيلي: %{financialSummary.profitMargin}
                  </span>
                </div>
                <div className="text-2xl font-black font-mono">
                  {financialSummary.netProfit.toLocaleString()} ر.ي
                </div>
              </div>
            </div>
          </div>

          {/* Expenses by Category Breakdown Cards */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>توزيع المصروفات حسب بنود التشغيل (Cost Centers)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryBreakdown.map((item) => {
                const Icon = item.config.icon;
                const percentage =
                  totalExpensesAmount > 0
                    ? Number(((item.total / totalExpensesAmount) * 100).toFixed(1))
                    : 0;

                return (
                  <div key={item.category} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 font-bold text-xs ${item.config.color}`}>
                        <Icon className="w-4 h-4" />
                        <span>{item.config.label}</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-400">%{percentage}</span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-base font-black text-white font-mono">
                        {item.total.toLocaleString()} <span className="text-xs font-normal text-slate-400">ر.ي</span>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {item.count} سندات
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, percentage)}%` }}
                        className="h-full bg-amber-500 transition-all rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Budgets & Variance Analysis Table */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  <span>كشف الميزانيات التقديرية الشهرية وتحليل الانحرافات (Budgets vs Actuals)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  مقارنة السقف المالي التقديري المعتمد بالمصروف الفعلي واحتساب نسب التجاوز أو الوفورات المحققة
                </p>
              </div>

              {currentRole === 'admin' && (
                <button
                  onClick={() => openBudgetModalForMonth(budgetMonth)}
                  className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>تحديد ميزانية جديدة</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto table-scroll-container">
              <table className="w-full text-right text-xs min-w-[700px]">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-bold">الشهر المحاسبي</th>
                    <th className="p-3 font-bold">الميزانية التقديرية</th>
                    <th className="p-3 font-bold">المصروف الفعلي</th>
                    <th className="p-3 font-bold">الفارق (وفر / عجز)</th>
                    <th className="p-3 font-bold">نسبة الاستهلاك</th>
                    <th className="p-3 font-bold">الحالة المالية</th>
                    <th className="p-3 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {availableExpenseMonths.map((m) => {
                    const budget = monthlyBudgets[m];
                    const budgetAmount = budget?.budgetAmount || 0;
                    const spent = expenses
                      .filter((e) => e.date && e.date.startsWith(m))
                      .reduce((sum, e) => sum + e.amount, 0);
                    const usage = budgetAmount > 0 ? Number(((spent / budgetAmount) * 100).toFixed(1)) : 0;
                    const diff = budgetAmount - spent;
                    const isExceeded = budgetAmount > 0 && spent > budgetAmount;
                    const isNear = budgetAmount > 0 && !isExceeded && usage >= 80;

                    return (
                      <tr key={m} className="hover:bg-slate-850/50 transition">
                        <td className="p-3">
                          <div className="font-extrabold text-white text-xs">
                            شهر {getArabicMonthName(m)}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{m}</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-white">
                          {budgetAmount > 0 ? (
                            `${budgetAmount.toLocaleString()} ر.ي`
                          ) : (
                            <span className="text-slate-500 text-[11px] font-sans">غير محددة</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-300">
                          {spent.toLocaleString()} ر.ي
                        </td>
                        <td className="p-3 font-mono font-bold">
                          {budgetAmount > 0 ? (
                            diff >= 0 ? (
                              <span className="text-emerald-400">+{diff.toLocaleString()} ر.ي (وفر)</span>
                            ) : (
                              <span className="text-rose-400">-{Math.abs(diff).toLocaleString()} ر.ي (عجز)</span>
                            )
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {budgetAmount > 0 ? (
                            <div className="space-y-1 w-28">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className={isExceeded ? 'text-rose-400 font-bold' : isNear ? 'text-amber-400' : 'text-slate-400'}>
                                  %{usage}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                <div
                                  style={{ width: `${Math.min(100, usage)}%` }}
                                  className={`h-full rounded-full ${
                                    isExceeded ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isExceeded ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>تجاوز السقف 🚨</span>
                            </span>
                          ) : isNear ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>اقتراب من السقف ⚠️</span>
                            </span>
                          ) : budgetAmount > 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>منضبط ومطابق ✓</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                              بدون ميزانية
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {currentRole === 'admin' && (
                            <button
                              onClick={() => openBudgetModalForMonth(m)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                              title="تعديل الميزانية التقديرية لهذا الشهر"
                            >
                              {budgetAmount > 0 ? 'تعديل' : 'تحديد'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Suppliers & Creditors Summary */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <span>سجل الموردين والجهات والدائنين (Suppliers & Payables)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تتبع المطابع وشركات الاتصالات ومحطات الوقود والمستحقات المسددة والمتبقية
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-xl border border-cyan-500/20">
              {suppliersSummary.length} مورد / جهة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suppliersSummary.map((sup, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">{sup.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">آخر تعامل: {sup.lastDate}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">{sup.count} فواتير</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-850">
                    <span className="text-[10px] text-slate-400 block font-sans">المسدد نقداً:</span>
                    <span className="font-black text-emerald-400">{sup.paid.toLocaleString()} ر.ي</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-850">
                    <span className="text-[10px] text-slate-400 block font-sans">الآجل المتبقي:</span>
                    <span className={`font-black ${sup.credit > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {sup.credit.toLocaleString()} ر.ي
                    </span>
                  </div>
                </div>

                {sup.credit > 0 && (
                  <button
                    onClick={() => {
                      setFormTitle(`سداد مستحقات آجلة لـ ${sup.name}`);
                      setFormCategory('other');
                      setFormAmount(sup.credit);
                      setFormPaymentMethod('admin_cash');
                      setFormPaidBy('المسؤول');
                      setFormBeneficiary(sup.name);
                      setFormStatus('paid');
                      setIsModalOpen(true);
                    }}
                    className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>سداد الآجل وقيد سند الصرف</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingExpense ? 'تعديل سند مصروف' : 'تسجيل سند صرف مصروف جديد'}
                </h3>
                <p className="text-xs text-slate-400">
                  توثيق العملية المحاسبية وتحديد مصدر التمويل والأثر على الحسابات
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Title */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">بيان وعنوان المصروف: *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: شراء ورق كروت وطباعة / اشتراك باقة فايبر / بترول مواصلات..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">المبلغ (ريال يمني): *</label>
                  <input
                    type="number"
                    min="1"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono font-black text-sm focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">تاريخ الصرف: *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Category and Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">بند وتصنيف المصروف: *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  >
                    {Object.entries(EXPENSE_CATEGORIES_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">طريقة الدفع ومصدر التمويل: *</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as ExpensePaymentMethod)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  >
                    {Object.entries(PAYMENT_METHODS_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Accounting Impact Warning Banner */}
              {formPaymentMethod === 'distributor_cash' && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 flex items-start gap-2 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <span className="font-bold block">ربط محاسبي مع العهدة النقدية للموزع:</span>
                    سيتم خصم هذا المبلغ تلقائياً من النقدية المحصلة التي بعهدة الموزع، وتخفيض المبلغ المطلوب توريده للمسؤول بسند رسمي.
                  </div>
                </div>
              )}

              {formPaymentMethod === 'credit_payable' && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 flex items-start gap-2 text-[11px]">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <span className="font-bold block">قيد كحساب آجل (دائنون):</span>
                    سيسجل في قائمة ديون الموردين لحين سداده لاحقاً.
                  </div>
                </div>
              )}

              {/* Beneficiary and Invoice Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">المستفيد / المورد / الجهة:</label>
                  <input
                    type="text"
                    value={formBeneficiary}
                    onChange={(e) => setFormBeneficiary(e.target.value)}
                    placeholder="مثال: مطبعة النور، يمن نت، محطة الوقود..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">رقم الفاتورة الورقية (إن وجد):</label>
                  <input
                    type="text"
                    value={formInvoiceNumber}
                    onChange={(e) => setFormInvoiceNumber(e.target.value)}
                    placeholder="INV-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Paid By & Capital Asset Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">القائم بالصرف:</label>
                  <select
                    value={formPaidBy}
                    onChange={(e) => setFormPaidBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="المسؤول">المسؤول (المدير العام)</option>
                    <option value="الموزع الميداني">الموزع الميداني</option>
                  </select>
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <input
                      type="checkbox"
                      checked={formIsCapitalAsset}
                      onChange={(e) => setFormIsCapitalAsset(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                    />
                    <span className="font-bold text-slate-200 text-[11px]">
                      أصل رأسمالي (معدات / راوتر / بطارية)
                    </span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">ملاحظات وبيان تفصيلي:</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="أي تفاصيل أو بنود مشمولة بالسند..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-amber-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!formTitle || !formAmount || Number(formAmount) <= 0}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingExpense ? 'حفظ التعديلات' : 'اعتماد وقيد السند'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Single Printable Voucher (سند صرف رسمي قابل للطباعة) */}
      {singlePrintExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white text-slate-900 p-6 shadow-2xl relative text-right">
            <button
              onClick={() => setSinglePrintExpense(null)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-500 hover:text-black hover:bg-slate-100 transition cursor-pointer no-print"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Voucher Header */}
            <div className="text-center pb-4 border-b-2 border-slate-800 mb-4">
              <h2 className="text-xl font-black text-slate-950">شبكة قعزان نت (QAZAN-NET)</h2>
              <h3 className="text-sm font-bold text-slate-700">سند صرف مصروفات رسمي (Payment Voucher)</h3>
              <div className="flex items-center justify-between text-xs text-slate-600 mt-2 font-mono">
                <span>رقم السند: <strong>{singlePrintExpense.id}</strong></span>
                <span>التاريخ: <strong>{singlePrintExpense.date}</strong></span>
              </div>
            </div>

            {/* Voucher Body */}
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-600">اصرفوا للمكرم (المستفيد):</span>
                <span className="font-black text-slate-900 text-sm">
                  {singlePrintExpense.beneficiary || 'جهة العمل'}
                </span>
              </div>

              <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-600">مبلغ وقدره:</span>
                <span className="font-black font-mono text-base text-slate-950">
                  {singlePrintExpense.amount.toLocaleString()} ريال يمني فقط لا غير
                </span>
              </div>

              <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-600">وذلك عن (البيان):</span>
                <span className="font-bold text-slate-900">{singlePrintExpense.title}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">بند المصروف:</span>
                  <span className="font-bold">
                    {EXPENSE_CATEGORIES_CONFIG[singlePrintExpense.category]?.label}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">مصدر التمويل:</span>
                  <span className="font-bold">
                    {PAYMENT_METHODS_CONFIG[singlePrintExpense.paymentMethod]?.label}
                  </span>
                </div>
              </div>

              {singlePrintExpense.notes && (
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                  <span className="text-slate-500 block">ملاحظات:</span>
                  <p>{singlePrintExpense.notes}</p>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-8 mt-6 border-t-2 border-slate-800 text-center text-xs">
              <div>
                <span className="font-bold block mb-8 text-slate-700">المستلم:</span>
                <span className="border-t border-slate-400 pt-1 block">التوقيع</span>
              </div>
              <div>
                <span className="font-bold block mb-8 text-slate-700">القائم بالصرف ({singlePrintExpense.paidBy}):</span>
                <span className="border-t border-slate-400 pt-1 block">التوقيع</span>
              </div>
              <div>
                <span className="font-bold block mb-8 text-slate-700">اعتماد الإدارة:</span>
                <span className="border-t border-slate-400 pt-1 block">الختم والاعتماد</span>
              </div>
            </div>

            {/* Print Button */}
            <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-end gap-2 no-print">
              <button
                onClick={() => setSinglePrintExpense(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl text-right space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-black text-sm text-white">تأكيد حذف سند المصروف</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف سند المصروف <strong>{deleteConfirmExpense.id}</strong> (
              {deleteConfirmExpense.title}) بقيمة{' '}
              <strong className="text-rose-400 font-mono">
                {deleteConfirmExpense.amount.toLocaleString()} ر.ي
              </strong>
              ؟ سيتم إعادة موازنة النقدية والأرباح فورياً.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={() => setDeleteConfirmExpense(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Set / Edit Monthly Budget */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl relative text-right space-y-4">
            <button
              onClick={() => setIsBudgetModalOpen(false)}
              className="absolute left-4 top-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 shrink-0 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">تحديد الميزانية التقديرية للشهر</h3>
                <p className="text-xs text-slate-400">ضبط السقف المالي للمصروفات والنفقات التشغيلية للمسؤول</p>
              </div>
            </div>

            {budgetSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{budgetSuccessMsg}</span>
              </div>
            )}

            {budgetErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{budgetErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">الشهر المحاسبي المستهدف</label>
                <select
                  value={budgetModalMonth}
                  onChange={(e) => {
                    const m = e.target.value;
                    setBudgetModalMonth(m);
                    const existing = monthlyBudgets[m];
                    setBudgetModalAmount(existing?.budgetAmount !== undefined ? existing.budgetAmount : '');
                    setBudgetModalNotes(existing?.notes || '');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  {availableExpenseMonths.map((m) => (
                    <option key={m} value={m}>
                      شهر {getArabicMonthName(m)} ({m})
                    </option>
                  ))}
                </select>
              </div>

              {/* Informative spent so far hint */}
              {(() => {
                const spent = expenses
                  .filter((e) => e.date && e.date.startsWith(budgetModalMonth))
                  .reduce((sum, e) => sum + e.amount, 0);
                const count = expenses.filter((e) => e.date && e.date.startsWith(budgetModalMonth)).length;
                return (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 text-xs flex items-center justify-between text-slate-400">
                    <span>المصروف الفعلي المسجل حتى اللحظة:</span>
                    <strong className="text-amber-300 font-mono font-bold">
                      {spent.toLocaleString()} ر.ي ({count} سند)
                    </strong>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  الميزانية التقديرية المعتمدة (بالريال اليمني)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={budgetModalAmount}
                    onChange={(e) => setBudgetModalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 180000"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white font-mono font-bold focus:outline-hidden focus:border-amber-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">
                    ر.ي
                  </span>
                </div>

                {/* Quick suggestions */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-slate-500">مبالغ سريعة:</span>
                  {[100000, 150000, 180000, 200000, 250000, 300000].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setBudgetModalAmount(amt)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-850 hover:bg-slate-800 text-slate-300 font-mono transition border border-slate-800 cursor-pointer"
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  بيان وتفاصيل وملاحظات الميزانية (اختياري)
                </label>
                <textarea
                  value={budgetModalNotes}
                  onChange={(e) => setBudgetModalNotes(e.target.value)}
                  placeholder="مثال: ميزانية تشغيلية تشمل طباعة كروت وبترول واشتراك الفايبر والصيانة الدورية..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2">
                {monthlyBudgets[budgetModalMonth] && (
                  <button
                    type="button"
                    onClick={() => handleDeleteBudget(budgetModalMonth)}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition border border-rose-500/25 cursor-pointer"
                  >
                    حذف الميزانية
                  </button>
                )}

                <div className="flex items-center gap-2 mr-auto">
                  <button
                    type="button"
                    onClick={() => setIsBudgetModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
                  >
                    حفظ واعتماد الميزانية
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
