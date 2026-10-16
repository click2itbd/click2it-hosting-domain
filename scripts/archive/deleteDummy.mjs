import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function deleteDummy() {
  console.log("Fetching tickets...");
  const snap = await getDocs(collection(db, 'tickets'));
  let count = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    console.log("Found ticket:", data.subject);
    if (data.subject && (data.subject.includes('animi') || data.subject.includes('dummy') || data.subject.includes('test'))) {
      await deleteDoc(doc(db, 'tickets', docSnap.id));
      console.log('Deleted dummy ticket:', docSnap.id);
      count++;
    }
  }
  console.log("Done. Deleted:", count);
}
deleteDummy().then(() => process.exit(0)).catch(console.error);
