import 'dotenv/config';
import { getAdminDb } from './src/firebase/admin.js';

async function checkBkash() {
    const db = getAdminDb();
    const accountsRef = db.collection('payment_accounts');
    const accSnap = await accountsRef.get();
    for (let docSnap of accSnap.docs) {
        if (docSnap.data().name?.includes('+8801727666677')) {
            console.log('Bkash Account:', docSnap.id, docSnap.data());
        }
    }
    process.exit(0);
}
checkBkash().catch(console.error);
