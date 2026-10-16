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

  const db = getFirestore();

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

  async function resetProductsStock() {
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();
    
    let count = 0;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        stock: 0,
        availableSerials: [],
        totalSoldQty: 0
      });
      count++;
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Reset stock for ${count} products.`);
    } else {
      console.log('No products found.');
    }
  }

  console.log('Starting data wipe...');
  await deleteCollection('transactions');
  await deleteCollection('orders');
  await deleteCollection('purchases');
  await deleteCollection('quotations');
  await deleteCollection('sold_serials');
  await resetProductsStock();
  console.log('Data wipe complete!');
  process.exit(0);
}

wipe().catch(console.error);
