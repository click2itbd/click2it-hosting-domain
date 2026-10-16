import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';

async function wipe() {
  const serviceAccount = JSON.parse(
    await readFile(new URL('./backend/firebase-service-account.json', import.meta.url))
  );

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');

  async function deleteCollection(collectionPath) {
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.get();
    
    if (snapshot.size === 0) {
      console.log(`Collection ${collectionPath} is empty.`);
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} documents from ${collectionPath}.`);
  }

  await deleteCollection('services');
  await deleteCollection('support_tickets');
  console.log('Services and Tickets wiped!');
  process.exit(0);
}

wipe().catch(console.error);
