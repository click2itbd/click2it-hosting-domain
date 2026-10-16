import React from 'react';
import { XCircle, Search, Download, ShoppingCart } from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';
import { useSettings } from '../../../context/SettingsContext';

interface LedgerModalProps {
  selectedLedgerEntity: any;
  setSelectedLedgerEntity: (v: any) => void;
  ledgerView: string;
  setLedgerView: (v: string) => void;
  ledgerStartDate: string;
  setLedgerStartDate: (v: string) => void;
  ledgerEndDate: string;
  setLedgerEndDate: (v: string) => void;
  ledgerSearchQuery: string;
  setLedgerSearchQuery: (v: string) => void;
  handleDownloadLedgerCSV: () => void;
  handleDownloadLedgerPDF: () => void;
  transactions: any[];
  paymentAmount: number;
  setPaymentAmount: (v: number) => void;
  ledgerPaymentMethod: string;
  setLedgerPaymentMethod: (v: string) => void;
  paymentDescription: string;
  setPaymentDescription: (v: string) => void;
  handleRecordPayment: (e: any) => void;
  products: any[];
  addItemToPurchase: (product: any) => void;
}

export const LedgerModal: React.FC<LedgerModalProps> = ({
  selectedLedgerEntity, setSelectedLedgerEntity, ledgerView, setLedgerView,
  ledgerStartDate, setLedgerStartDate, ledgerEndDate, setLedgerEndDate,
  ledgerSearchQuery, setLedgerSearchQuery, handleDownloadLedgerCSV, handleDownloadLedgerPDF,
  transactions, paymentAmount, setPaymentAmount, ledgerPaymentMethod, setLedgerPaymentMethod,
  paymentDescription, setPaymentDescription, handleRecordPayment, products, addItemToPurchase
}) => {
  const { settings } = useSettings();

  return (
    <>
      {/* Ledger Modal */}
      {selectedLedgerEntity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#081621] text-white">
              <div>
                <h2 className="text-xl font-bold">{selectedLedgerEntity.name}'s {ledgerView === 'ledger' ? 'Ledger' : 'Products'}</h2>
                <p className="text-xs opacity-70 uppercase tracking-wider">{selectedLedgerEntity.type} Account</p>
              </div>
              <div className="flex items-center gap-4">
                {selectedLedgerEntity.type === 'vendor' && (
                  <div className="flex bg-white/10 p-1 rounded-lg">
                    <button
                      onClick={() => setLedgerView('ledger')}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                        ledgerView === 'ledger' ? "bg-white text-[#081621]" : "text-white hover:bg-white/10"
                      )}
                    >
                      Ledger
                    </button>
                    <button
                      onClick={() => setLedgerView('products')}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                        ledgerView === 'products' ? "bg-white text-[#081621]" : "text-white hover:bg-white/10"
                      )}
                    >
                      Products
                    </button>
                  </div>
                )}
                <button onClick={() => { setSelectedLedgerEntity(null); setLedgerView('ledger'); }} className="p-2 hover:bg-white/10 rounded-full transition-all">
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {ledgerView === 'ledger' ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      value={ledgerStartDate}
                      onChange={e => setLedgerStartDate(e.target.value)}
                      className="text-sm border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      value={ledgerEndDate}
                      onChange={e => setLedgerEndDate(e.target.value)}
                      className="text-sm border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Search Transactions</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Description or ID..."
                        value={ledgerSearchQuery}
                        onChange={(e) => setLedgerSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444] w-48"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadLedgerCSV()}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-200 transition-all font-bold text-sm"
                  >
                    <Download size={18} /> CSV
                  </button>
                  <button
                    onClick={() => handleDownloadLedgerPDF()}
                    className="bg-[#081621] text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-[#EF4444] transition-all font-bold text-sm"
                  >
                    <Download size={18} /> PDF Report
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {(() => {
                  const entityTransactions = transactions.filter(t => {
                    const matchesEntity = t.entityId === selectedLedgerEntity.id;
                    const txDate = new Date(t.date).toISOString().split('T')[0];
                    const matchesDate = txDate >= ledgerStartDate && txDate <= ledgerEndDate;
                    const matchesSearch = t.description.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) || 
                                        t.id.toLowerCase().includes(ledgerSearchQuery.toLowerCase());
                    return matchesEntity && matchesDate && matchesSearch;
                  });
                  const totalDebit = entityTransactions
                    .filter(t => selectedLedgerEntity.type === 'customer' ? t.type === 'sale' : t.type === 'payment_made')
                    .reduce((sum, t) => sum + t.amount, 0);
                  const totalCredit = entityTransactions
                    .filter(t => selectedLedgerEntity.type === 'customer' ? t.type === 'payment_received' : t.type === 'purchase')
                    .reduce((sum, t) => sum + t.amount, 0);
                  const balance = selectedLedgerEntity.type === 'customer' ? totalDebit - totalCredit : totalCredit - totalDebit;

                  return (
                    <>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Total {selectedLedgerEntity.type === 'customer' ? 'Sales' : 'Payments Made'}</p>
                        <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalDebit, settings)}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <p className="text-xs font-bold text-green-600 uppercase mb-1">Total {selectedLedgerEntity.type === 'customer' ? 'Payments Received' : 'Purchases'}</p>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(totalCredit, settings)}</p>
                      </div>
                      <div className={cn("p-4 rounded-lg border", balance > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100")}>
                        <p className={cn("text-xs font-bold uppercase mb-1", balance > 0 ? "text-red-600" : "text-gray-600")}>Outstanding Balance</p>
                        <p className={cn("text-2xl font-bold", balance > 0 ? "text-red-900" : "text-gray-900")}>{formatCurrency(balance, settings)}</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Record New Payment</h3>
                <form onSubmit={handleRecordPayment} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Amount</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(Number(e.target.value))}
                      className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Payment Method</label>
                    <select
                      value={ledgerPaymentMethod}
                      onChange={e => setLedgerPaymentMethod(e.target.value)}
                      className="w-full border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444]"
                    >
                      <option value="cash">Cash</option>
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                      <option value="rocket">Rocket</option>
                      <option value="cellfin">Cellfin</option>
                      <option value="card">Visa/Mastercard</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="other">Other Gateway</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                    <input
                      type="text"
                      value={paymentDescription}
                      onChange={e => setPaymentDescription(e.target.value)}
                      className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                      placeholder="e.g. Cash Payment, Bank Transfer"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-[#EF4444] text-white py-2 rounded-md font-bold hover:bg-red-600 transition-all"
                    >
                      Record Payment
                    </button>
                  </div>
                </form>
              </div>

              <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Transaction History</h3>
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {(() => {
                      let runningBalance = 0;
                      return transactions
                        .filter(t => {
                          const matchesEntity = t.entityId === selectedLedgerEntity.id;
                          const txDate = new Date(t.date).toISOString().split('T')[0];
                          const matchesDate = txDate >= ledgerStartDate && txDate <= ledgerEndDate;
                          const matchesSearch = t.description.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) || 
                                              t.id.toLowerCase().includes(ledgerSearchQuery.toLowerCase());
                          return matchesEntity && matchesDate && matchesSearch;
                        })
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((t) => {
                          const isDebit = selectedLedgerEntity.type === 'customer' ? t.type === 'sale' : t.type === 'payment_made';
                          const isCredit = selectedLedgerEntity.type === 'customer' ? t.type === 'payment_received' : t.type === 'purchase';
                          
                          if (isDebit) runningBalance += t.amount;
                          if (isCredit) runningBalance -= t.amount;

                          return (
                            <tr key={t.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 text-gray-600">
                                {new Date(t.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-medium text-gray-900">{t.description}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                                  {t.type.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-900">
                                {isDebit ? formatCurrency(t.amount, settings) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-900">
                                {isCredit ? formatCurrency(t.amount, settings) : '-'}
                              </td>
                              <td className={cn(
                                "px-4 py-3 text-right font-bold",
                                runningBalance > 0 ? "text-red-600" : runningBalance < 0 ? "text-green-600" : "text-gray-900"
                              )}>
                                {formatCurrency(Math.abs(runningBalance), settings)}
                                {runningBalance > 0 && selectedLedgerEntity.type === 'customer' && ' Dr'}
                                {runningBalance < 0 && selectedLedgerEntity.type === 'customer' && ' Cr'}
                                {runningBalance > 0 && selectedLedgerEntity.type === 'vendor' && ' Cr'}
                                {runningBalance < 0 && selectedLedgerEntity.type === 'vendor' && ' Dr'}
                              </td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
              </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.filter(p => p.vendorId === selectedLedgerEntity.id).map(product => (
                    <div key={product.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                      <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                        {product.images && product.images.length > 0 ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ShoppingCart size={32} />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-bold">
                          Stock: {product.stock}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-900 truncate" title={product.name}>{product.name}</h3>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">{product.category}</p>
                          </div>
                          <p className="font-bold text-[#EF4444]">{formatCurrency(product.price, settings)}</p>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{product.description}</p>
                        <button
                          onClick={() => {
                            setSelectedLedgerEntity(null);
                            addItemToPurchase(product);
                          }}
                          className="w-full bg-gray-50 hover:bg-gray-100 text-gray-900 py-2 rounded-md font-bold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <ShoppingCart size={16} /> Add to Purchase
                        </button>
                      </div>
                    </div>
                  ))}
                  {products.filter(p => p.vendorId === selectedLedgerEntity.id).length === 0 && (
                    <div className="col-span-full py-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 font-medium">No products found for this vendor.</p>
                      <p className="text-sm text-gray-400">Products assigned to this vendor will appear here.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
