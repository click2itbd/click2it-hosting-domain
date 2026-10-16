import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./backend/firebase-service-account.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');

async function run() {
  const q2 = await db.collection('orders').get();
  for (let d of q2.docs) {
    const data = d.data();
    if (d.id.includes('00074') || (data.documentNumber && data.documentNumber.includes('00074')) || (data.invoiceNumber && data.invoiceNumber.includes('00074'))) {
      await d.ref.delete();
      console.log('Deleted:', d.id, data.documentNumber);
    }
  }
  console.log('Done scanning.');
  process.exit(0);
}
run().catch(console.error);
