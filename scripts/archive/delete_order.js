import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

// load firebase config
const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(config);
const db = getFirestore(app);

async function deleteOrder() {
  console.log('Searching for INV-00074...');
  const q = query(collection(db, 'orders'), where('documentNumber', '==', 'INV-00074'));
  const snap = await getDocs(q);
  console.log('Found:', snap.size);
  
  if (snap.size > 0) {
    for (let d of snap.docs) {
      await deleteDoc(doc(db, 'orders', d.id));
      console.log('Deleted successfully:', d.id);
    }
  } else {
    console.log('Not found by documentNumber. Trying full scan...');
    const snap2 = await getDocs(collection(db, 'orders'));
    let found = false;
    for (let d of snap2.docs) {
      if (d.data().documentNumber === 'INV-00074' || d.data().invoiceNumber === 'INV-00074' || d.id === 'INV-00074') {
        await deleteDoc(doc(db, 'orders', d.id));
        console.log('Deleted successfully:', d.id);
        found = true;
      }
    }
    if (!found) console.log('Could not find order INV-00074 at all.');
  }
  process.exit(0);
}

deleteOrder().catch(console.error);
