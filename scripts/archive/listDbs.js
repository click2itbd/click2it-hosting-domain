import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';

async function listDbs() {
  const serviceAccount = JSON.parse(
    await readFile(new URL('./backend/firebase-service-account.json', import.meta.url))
  );

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db1 = getFirestore();
  const db2 = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');

  const snap1 = await db1.collection('products').get();
  console.log(`Default DB: ${snap1.size} products`);
  
  const snap2 = await db2.collection('products').get();
  console.log(`Named DB: ${snap2.size} products`);
  
  process.exit(0);
}

listDbs().catch(console.error);
