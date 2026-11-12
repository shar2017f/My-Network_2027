import { doc, getDoc } from 'firebase/firestore';
import { db } from './src/firebase';

async function checkVoucherHistory() {
  const snap = await getDoc(doc(db, 'system_data', 'network_state'));
  const data = snap.data();
  if (!data) return;
  const logs = data.auditLogs || [];
  const deliveries = data.deliveries || [];

  for (const d of deliveries) {
    const relatedLogs = logs.filter((l: any) => l.details.includes(d.id));
    console.log(`=== ${d.id} (${d.outletName} - Cat ${d.category} - ${d.totalAmount} ر.ي) ===`);
    for (const rl of relatedLogs) {
      console.log(`  [${rl.timestamp}] [${rl.actionType}] ${rl.details}`);
    }
  }
}
checkVoucherHistory().then(() => process.exit(0));
