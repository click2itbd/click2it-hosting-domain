import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = resolve('./firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!process.env.FIREBASE_APP) {
  initializeApp({
    credential: cert(serviceAccount)
  });
  process.env.FIREBASE_APP = 'true';
}

const db = getFirestore(undefined, 'ai-studio-422fbad2-d827-4e69-8599-aed85390d277');

async function check() {
  const transSnap = await db.collection('transactions').orderBy('createdAt', 'desc').limit(5).get();
  console.log('--- LATEST TRANSACTIONS ---');
  transSnap.forEach(doc => console.log(doc.id, doc.data()));

  const purchSnap = await db.collection('purchases').orderBy('createdAt', 'desc').limit(2).get();
  console.log('\n--- LATEST PURCHASES ---');
  purchSnap.forEach(doc => console.log(doc.id, doc.data()));
}
check();
