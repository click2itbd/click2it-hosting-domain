import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

export async function generateDocumentNumber(type: 'INV' | 'QUO' | 'CHA' | 'REC' | 'SR' | 'PR' | 'PUR' | 'purchase' | 'invoice' | 'sale_return'): Promise<string> {
  try {
    const counterRef = doc(db, 'counters', type);

    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let newNumber = 1;

      if (counterDoc.exists()) {
        newNumber = counterDoc.data().lastNumber + 1;
        transaction.update(counterRef, { lastNumber: newNumber });
      } else {
        transaction.set(counterRef, { lastNumber: 1 });
      }

      return `${type}-${String(newNumber).padStart(5, '0')}`;
    });
  } catch (err) {
    console.warn('generateDocumentNumber fallback triggered:', err);
    return `${type}-${Date.now().toString().slice(-6)}`;
  }
}
