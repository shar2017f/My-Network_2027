import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './src/firebase';

async function previewFullRestoration() {
  const snap = await getDoc(doc(db, 'system_data', 'network_state'));
  const data = snap.data();
  if (!data) return;

  const originalDeliveryCash: Record<string, number> = {
    'DEL-2026-0001': 20000,
    'DEL-2026-0002': 20000,
    'DEL-2026-0003': 50000,
    'DEL-2026-0004': 0,
    'DEL-2026-0005': 0,
    'DEL-2026-0006': 0,
    'DEL-2026-0007': 0,
    'DEL-2026-0008': 0,
    'DEL-2026-0009': 0,
    'DEL-2026-0010': 0,
    'DEL-2026-0011': 0,
    'DEL-2026-0012': 0,
    'DEL-2026-0013': 0,
    'DEL-2026-0014': 50000,
    'DEL-2026-0015': 0,
    'DEL-2026-0016': 50000,
    'DEL-2026-0017': 0,
    'DEL-2026-0018': 0,
    'DEL-2026-0019': 50000,
    'DEL-2026-0020': 20000,
    'DEL-2026-0021': 75000,
    'DEL-2026-0022': 20000,
    'DEL-2026-0023': 0,
    'DEL-2026-0024': 50000,
    'DEL-2026-0025': 50000,
    'DEL-2026-0026': 0,
    'DEL-2026-0027': 20000,
    'DEL-2026-0028': 0,
    'DEL-2026-0029': 50000,
    'DEL-2026-0030': 20000,
    'DEL-2026-0031': 25000,
    'DEL-2026-0032': 24990,
    'DEL-2026-0033': 0,
    'DEL-2026-0034': 50000,
    'DEL-2026-0035': 24990,
    'DEL-2026-0036': 0,
    'DEL-2026-0037': 0,
    'DEL-2026-0038': 0,
    'DEL-2026-0039': 0,
    'DEL-2026-0040': 0,
    'DEL-2026-0041': 0,
    'DEL-2026-0042': 0,
  };

  const updatedDeliveries = (data.deliveries || []).map((d: any) => {
    const cash = originalDeliveryCash[d.id] !== undefined ? originalDeliveryCash[d.id] : (d.cashPaidNow || 0);
    const debt = Math.max(0, d.totalAmount - cash);
    const paymentStatus = cash === 0 ? 'credit' : cash >= d.totalAmount ? 'paid_full' : 'partial';
    return {
      ...d,
      cashPaidNow: cash,
      remainingDebt: debt,
      paymentStatus,
    };
  });

  const updatedPayments = data.payments || [];

  const updatedOutlets = (data.outlets || []).map((o: any) => {
    const oDels = updatedDeliveries.filter((d: any) => d.outletId === o.id || d.outletName === o.name);
    const oPays = updatedPayments.filter((p: any) => p.outletId === o.id || p.outletName === o.name);

    const totDel = oDels.reduce((sum: number, d: any) => sum + (Number(d.totalAmount) || 0), 0);
    const cashDel = oDels.reduce((sum: number, d: any) => sum + (Number(d.cashPaidNow) || 0), 0);
    const payAmt = oPays.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const totPaid = cashDel + payAmt;
    const curDebt = Math.max(0, totDel - totPaid);

    return {
      ...o,
      totalDeliveredAmount: totDel,
      totalPaidAmount: totPaid,
      currentDebt: curDebt,
    };
  });

  console.log('--- RESTORED OUTLETS WITH REAL DEBTS ---');
  let sumDebt = 0;
  for (const o of updatedOutlets) {
    sumDebt += o.currentDebt;
    console.log(
      o.id,
      '|', o.name,
      '| إجمالي المسحوبات:', o.totalDeliveredAmount.toLocaleString(),
      '| إجمالي المسدد:', o.totalPaidAmount.toLocaleString(),
      '| الدين القائم الحقيقي:', o.currentDebt.toLocaleString(),
      'ر.ي'
    );
  }
  console.log('--- إجمالي الديون في الشبكة:', sumDebt.toLocaleString(), 'ر.ي ---');
}
previewFullRestoration().then(() => process.exit(0));
