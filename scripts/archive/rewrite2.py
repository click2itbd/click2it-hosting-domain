import sys
import re

with open("src/pages/admin/tabs/purchase/Purchases.tsx", "r", encoding="utf-8") as f:
    content = f.read()

new_logic = """const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
      const docNumber = `PO-${dateStr}-${randomStr}`;
      
      let invoiceUrl = '';
      if (purchaseForm.invoiceFile) {
        const fileRef = ref(storage, `purchases/invoices/${docNumber}_${purchaseForm.invoiceFile.name}`);
        await uploadBytes(fileRef, purchaseForm.invoiceFile);
        invoiceUrl = await getDownloadURL(fileRef);
      }"""

content = content.replace("const docNumber = await generateDocumentNumber('PUR');", new_logic)

# For stock updates, it's currently:
# // 1. Update Product Inventory & Stock & Cost Price
# for (const item of purchaseForm.items) {
# Need to make sure it's only when status is Received or Partially Received
stock_update_old = """      // 1. Update Product Inventory & Stock & Cost Price
      for (const item of purchaseForm.items) {"""
stock_update_new = """      // 1. Update Product Inventory & Stock & Cost Price
      if (purchaseForm.status === 'Received' || purchaseForm.status === 'Partially Received') {
        for (const item of purchaseForm.items) {"""
content = content.replace(stock_update_old, stock_update_new)

# And close the if statement before saving
save_rec_old = """      // 2. Save Purchase Record to Firestore `purchases`
      const selectedAcc = paymentAccounts.find(a => a.id === purchaseForm.paymentAccountId);"""
save_rec_new = """      }

      // 2. Save Purchase Record to Firestore `purchases`
      const selectedAcc = paymentAccounts.find(a => a.id === purchaseForm.paymentAccountId);"""
content = content.replace(save_rec_old, save_rec_new)

# Update purchaseRecord saving to include status, invoiceUrl
purchase_rec_old = """      const purchaseRecord: Omit<PurchaseRecord, 'id'> = {
        documentNumber: docNumber,
        vendorId: purchaseForm.vendorId,
        vendorName: purchaseForm.vendorName,
        date: new Date(purchaseForm.date).toISOString(),
        items: purchaseForm.items,
        subtotal: billTotal,
        total: billTotal,"""
purchase_rec_new = """      const purchaseRecord: Omit<PurchaseRecord, 'id'> = {
        documentNumber: docNumber,
        vendorId: purchaseForm.vendorId,
        vendorName: purchaseForm.vendorName,
        date: new Date(purchaseForm.date).toISOString(),
        status: purchaseForm.status,
        invoiceUrl: invoiceUrl,
        items: purchaseForm.items,
        subtotal: subtotal,
        taxTotal: totalTax,
        discountTotal: totalDiscount,
        total: billTotal,"""
content = content.replace(purchase_rec_old, purchase_rec_new)

with open("src/pages/admin/tabs/purchase/Purchases.tsx", "w", encoding="utf-8") as f:
    f.write(content)
