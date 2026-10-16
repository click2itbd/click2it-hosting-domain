import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Initialize Firebase Admin
const serviceAccountPath = resolve('./firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(undefined, 'ai-studio-422fbad2-d827-4e69-8599-aed85390d277');

async function clearCollection(collectionPath) {
  const collRef = db.collection(collectionPath);
  const snapshot = await collRef.get();
  
  if (snapshot.size === 0) {
    console.log(`Collection ${collectionPath} is already empty.`);
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Deleted ${snapshot.size} documents from ${collectionPath}.`);
}

async function resetProducts() {
  const snapshot = await db.collection('products').get();
  let count = 0;
  
  const batches = [];
  let batch = db.batch();
  
  snapshot.docs.forEach((doc, index) => {
    batch.update(doc.ref, {
      stock: 0,
      availableSerials: [],
      newSerials: [],
      purchasePrice: 0
    });
    count++;
    
    if (count === 500) {
      batches.push(batch.commit());
      batch = db.batch();
      count = 0;
    }
  });
  
  if (count > 0) {
    batches.push(batch.commit());
  }
  
  await Promise.all(batches);
  console.log(`Reset stock to 0 for ${snapshot.size} products.`);
}

async function resetBalances() {
  const collections = ['customers', 'vendors', 'payment_accounts'];
  
  for (const coll of collections) {
    const snapshot = await db.collection(coll).get();
    let count = 0;
    let batch = db.batch();
    const batches = [];
    
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        openingBalance: 0
      });
      count++;
      
      if (count === 500) {
        batches.push(batch.commit());
        batch = db.batch();
        count = 0;
      }
    });
    
    if (count > 0) {
      batches.push(batch.commit());
    }
    
    await Promise.all(batches);
    console.log(`Reset balances for ${snapshot.size} ${coll}.`);
  }
}

async function runReset() {
  console.log('Starting Database Reset...');
  
  try {
    // 1. Delete transactional data
    await clearCollection('purchases');
    await clearCollection('purchase_returns');
    await clearCollection('orders');
    await clearCollection('sale_returns');
    await clearCollection('transactions');
    await clearCollection('sold_serials');

    // 2. Reset Products stock
    await resetProducts();
    
    // 3. Reset opening balances for Customers, Vendors, and Payment Accounts
    await resetBalances();
    
    console.log('Database reset completed successfully!');
  } catch (error) {
    console.error('Error resetting database:', error);
  }
}

runReset();
