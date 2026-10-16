import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';

async function listCols() {
  const serviceAccount = JSON.parse(
    await readFile(new URL('./backend/firebase-service-account.json', import.meta.url))
  );

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');

  const collections = await db.listCollections();
  collections.forEach(collection => {
    console.log('Found collection with id:', collection.id);
  });
  
  process.exit(0);
}

listCols().catch(console.error);
