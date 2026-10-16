import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';

async function checkProducts() {
  const serviceAccount = JSON.parse(
    await readFile(new URL('./backend/firebase-service-account.json', import.meta.url))
  );

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');

  const snapshot = await db.collection('products').get();
  console.log(`Found ${snapshot.size} products.`);
  snapshot.docs.forEach(doc => {
    console.log(doc.id, doc.data().name);
  });
  process.exit(0);
}

checkProducts().catch(console.error);
