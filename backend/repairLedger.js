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

async function repair() {
  const transColl = db.collection('transactions');
  
  console.log("Repairing Purchases...");
  const purchSnap = await db.collection('purchases').get();
  for (const doc of purchSnap.docs) {
    const data = doc.data();
    
    // Check if a transaction for this purchase already exists
    const existing = await transColl.where('referenceId', '==', doc.id).get();
    if (existing.empty) {
      console.log(`Adding missing transactions for Purchase ${data.documentNumber}`);
      
      // Add main purchase transaction (liability/expense)
      await transColl.add({
        type: 'purchase',
        amount: data.total,
        date: data.date,
        description: `Purchase from ${data.vendorName} (#${data.documentNumber})`,
        entityId: data.vendorId,
        entityName: data.vendorName,
        entityType: 'vendor',
        referenceId: doc.id,
        documentNumber: data.documentNumber,
        paymentAccountId: '',
        paymentMethod: '',
        createdAt: data.createdAt || new Date().toISOString(),
      });
      
      // If paid, add payment transaction
      if (data.paidAmount > 0) {
        await transColl.add({
          type: 'payment_made',
          amount: data.paidAmount,
          date: data.date,
          description: `Payment for Purchase #${data.documentNumber}`,
          entityId: data.vendorId,
          entityName: data.vendorName,
          entityType: 'vendor',
          referenceId: doc.id,
          documentNumber: data.documentNumber,
          paymentAccountId: data.paymentAccountId || '',
          paymentMethod: data.paymentMethod || 'cash',
          createdAt: data.createdAt || new Date().toISOString(),
        });
      }
    }
  }

  console.log("Repairing Orders (Sales)...");
  const ordersSnap = await db.collection('orders').get();
  for (const doc of ordersSnap.docs) {
    const data = doc.data();
    
    const existing = await transColl.where('referenceId', '==', doc.id).get();
    if (existing.empty) {
      console.log(`Adding missing transactions for Sale ${data.documentNumber || doc.id}`);
      
      await transColl.add({
        type: 'sale',
        amount: data.total || data.grandTotal || 0,
        date: data.createdAt,
        description: `Sale to ${data.customerName} (#${data.documentNumber || doc.id})`,
        entityId: data.customerId || 'general',
        entityName: data.customerName,
        entityType: 'customer',
        referenceId: doc.id,
        documentNumber: data.documentNumber || doc.id,
        paymentAccountId: '',
        paymentMethod: '',
        createdAt: data.createdAt,
      });

      const paid = data.paidAmount || data.paid || 0;
      if (paid > 0) {
        await transColl.add({
          type: 'payment_received',
          amount: paid,
          date: data.createdAt,
          description: `Payment for Sale #${data.documentNumber || doc.id}`,
          entityId: data.customerId || 'general',
          entityName: data.customerName,
          entityType: 'customer',
          referenceId: doc.id,
          documentNumber: data.documentNumber || doc.id,
          paymentAccountId: data.paymentAccountId || '',
          paymentMethod: data.paymentMethod || 'cash',
          createdAt: data.createdAt,
        });
      }
    }
  }

  console.log("Repair complete!");
}

repair().catch(console.error);
