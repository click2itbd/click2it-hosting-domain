import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Transaction, TransactionCategory, PaymentAccount } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import {
  Upload,
  Plus,
  List,
  Search,
  Printer,
  Trash2,
  Edit2,
  ArrowUpRight,
  X,
  CheckCircle,
  Download,
} from 'lucide-react';
import { Pagination } from '../../../../components/common/Pagination';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logAudit } from '../../../../lib/audit';

interface ManualExpenseTabProps {
  setSelectedLedgerEntity?: (v: any) => void;
  setActiveTab?: (tab: string) => void;
}

const ManualExpenseTab: React.FC<ManualExpenseTabProps> = ({
  setActiveTab,
}) => {
  const { hasPermission, isAdmin, user, profile } = useAuth();
  const { settings } = useSettings();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    categoryId: '',
    paymentAccountId: '',
    entityName: '',
    reference: '',
  });

  // Table Filters
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txSnap, catSnap, accSnap] = await Promise.all([
        getDocs(query(collection(db, 'transactions'), orderBy('date', 'desc'))),
        getDocs(query(collection(db, 'transaction_categories'), orderBy('name'))),
        getDocs(query(collection(db, 'payment_accounts'), orderBy('name'))),
      ]);

      const allTx = txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      setTransactions(allTx.filter(t => t.type === 'expense'));

      const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionCategory));
      setCategories(cats.filter(c => c.type === 'expense' || !c.type));

      const accs = accSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentAccount));
      setPaymentAccounts(accs);

      if (accs.length > 0 && !formData.paymentAccountId) {
        setFormData(prev => ({ ...prev, paymentAccountId: accs[0].id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load expense data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0 || !formData.description.trim()) {
      toast.error('Please enter a valid amount and description');
      return;
    }

    try {
      setSubmitting(true);
      const selectedCat = categories.find(c => c.id === formData.categoryId);
      const selectedAcc = paymentAccounts.find(a => a.id === formData.paymentAccountId);

      const expenseData = {
        type: 'expense',
        amount: Number(formData.amount),
        date: new Date(formData.date).toISOString(),
        description: formData.description,
        categoryId: formData.categoryId || '',
        category: selectedCat ? selectedCat.name : 'Operating Expense',
        categoryName: selectedCat ? selectedCat.name : 'Operating Expense',
        paymentAccountId: selectedAcc?.id || '',
        paymentMethod: selectedAcc?.type || selectedAcc?.name || 'cash',
        entityId: 'manual',
        entityName: formData.entityName || 'Vendor / Payee',
        reference: formData.reference || '',
        updatedAt: new Date().toISOString(),
      };

      const currentOperator = user?.displayName || user?.email || profile?.displayName || 'Admin';

      if (editingTx) {
        await updateDoc(doc(db, 'transactions', editingTx.id), expenseData);
        await logAudit(
          'EDIT',
          'Expense',
          `Updated expense entry: ৳${formData.amount} (${formData.description})`,
          currentOperator,
          {
            entityId: editingTx.id,
            previousState: editingTx,
            newState: expenseData,
          }
        );
        toast.success('Expense entry updated successfully');
      } else {
        const docRef = await addDoc(collection(db, 'transactions'), {
          ...expenseData,
          createdAt: new Date().toISOString(),
        });
        await logAudit(
          'CREATE',
          'Expense',
          `Recorded manual expense: ৳${formData.amount} (${formData.description})`,
          currentOperator,
          {
            entityId: docRef.id,
            newState: expenseData,
          }
        );
        toast.success('Expense entry recorded successfully');
      }

      setIsAdding(false);
      setEditingTx(null);
      setFormData({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
        categoryId: '',
        paymentAccountId: paymentAccounts[0]?.id || '',
        entityName: '',
        reference: '',
      });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTx(tx);
    setFormData({
      amount: tx.amount || 0,
      date: new Date(tx.date).toISOString().split('T')[0],
      description: tx.description || '',
      categoryId: tx.categoryId || '',
      paymentAccountId: tx.paymentAccountId || '',
      entityName: tx.entityName || '',
      reference: tx.reference || '',
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      const targetTx = transactions.find(t => t.id === id);
      await deleteDoc(doc(db, 'transactions', id));
      const currentOperator = user?.displayName || user?.email || profile?.displayName || 'Admin';
      await logAudit(
        'DELETE',
        'Expense',
        `Deleted expense entry: ৳${targetTx?.amount || 0} (${targetTx?.description || id})`,
        currentOperator,
        {
          entityId: id,
          previousState: targetTx,
        }
      );
      toast.success('Expense entry deleted');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete');
    }
  };

  // Filter logic
  const filteredExpenses = transactions.filter(tx => {
    const txDateStr = new Date(tx.date).toISOString().split('T')[0];
    const matchesDate = txDateStr >= startDate && txDateStr <= endDate;
    if (!matchesDate) return false;

    if (categoryFilter !== 'all') {
      if (tx.categoryId !== categoryFilter && tx.category !== categoryFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesDesc = (tx.description || '').toLowerCase().includes(q);
      const matchesEntity = (tx.entityName || '').toLowerCase().includes(q);
      const matchesCat = (tx.category || '').toLowerCase().includes(q);
      const matchesRef = (tx.reference || '').toLowerCase().includes(q);
      if (!matchesDesc && !matchesEntity && !matchesCat && !matchesRef) return false;
    }

    return true;
  });

  const totalExpenseAmount = filteredExpenses.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // Export CSV
  const exportToCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = ['Date', 'Category', 'Paid To / Payee', 'Description', 'Method', 'Reference', 'Amount (৳)'];
    const rows = filteredExpenses.map(tx => [
      new Date(tx.date).toLocaleDateString(),
      `"${tx.category || 'Expense'}"`,
      `"${tx.entityName || '-'}"`,
      `"${tx.description || '-'}"`,
      tx.paymentMethod || 'cash',
      tx.reference || '',
      tx.amount,
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Expense_Report_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export PDF
  const exportToPDF = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No records to export');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(settings?.siteName || 'Click2IT', 14, 18);
    doc.setFontSize(11);
    doc.text('Operating Expenses Report', 14, 25);
    doc.setFontSize(9);
    doc.text(`Period: ${startDate} to ${endDate} | Total Expense: ${formatCurrency(totalExpenseAmount, settings)}`, 14, 31);

    const body = filteredExpenses.map(tx => [
      new Date(tx.date).toLocaleDateString(),
      tx.category || 'Operating Expense',
      tx.entityName || '-',
      tx.description || '-',
      tx.paymentMethod || 'cash',
      formatCurrency(tx.amount, settings),
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['Date', 'Category', 'Paid To', 'Description', 'Account/Method', 'Amount (৳)']],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [8, 22, 33] },
      styles: { fontSize: 7 },
    });

    doc.save(`Expense_Report_${startDate}_to_${endDate}.pdf`);
  };

  if (!hasPermission('manage_finances')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-6">
      {/* Header Bar */}
      <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Upload className="text-[#EF4444]" /> Manual & Operating Expenses
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Track and manage shop rent, electricity, refreshments, repairs, software, and administrative costs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('tx_categories')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <List size={14} /> Expense Categories
            </button>
          )}
          {!isAdding && (
            <button
              onClick={() => {
                setEditingTx(null);
                setFormData({
                  amount: 0,
                  date: new Date().toISOString().split('T')[0],
                  description: '',
                  categoryId: categories[0]?.id || '',
                  paymentAccountId: paymentAccounts[0]?.id || '',
                  entityName: '',
                  reference: '',
                });
                setIsAdding(true);
              }}
              className="bg-[#081621] hover:bg-[#EF4444] text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus size={14} /> Add New Expense
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50/70 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Filtered Expense Total</span>
            <ArrowUpRight size={16} className="text-red-600" />
          </div>
          <span className="text-2xl font-black text-red-950 mt-1 block">
            {formatCurrency(totalExpenseAmount, settings)}
          </span>
          <span className="text-[10px] text-red-600 mt-1 block">Total for {startDate} to {endDate}</span>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Expense Records</span>
          <span className="text-xl font-black text-gray-900 mt-1 block">{filteredExpenses.length}</span>
          <span className="text-[10px] text-gray-500 mt-1 block">Total entries matching filters</span>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Active Categories</span>
          <span className="text-xl font-black text-blue-950 mt-1 block">{categories.length} Categories</span>
          <span className="text-[10px] text-blue-600 mt-1 block">Configured expense heads</span>
        </div>
      </div>

      {/* Add / Edit Form */}
      {isAdding && (
        <div className="px-6 pb-6">
          <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                {editingTx ? 'Edit Expense Entry' : 'Record New Expense'}
              </h3>
              <button onClick={() => { setIsAdding(false); setEditingTx(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Expense Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 font-medium"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Paid From Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.paymentAccountId}
                    onChange={e => setFormData({ ...formData, paymentAccountId: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 font-medium"
                  >
                    {paymentAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    Amount (৳) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.amount || ''}
                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    placeholder="e.g. 2500"
                    className="w-full border border-gray-200 rounded-lg p-2 font-black text-gray-900 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Paid To / Payee Name</label>
                  <input
                    type="text"
                    value={formData.entityName}
                    onChange={e => setFormData({ ...formData, entityName: e.target.value })}
                    placeholder="e.g. Landlord / Electrician / Vendor"
                    className="w-full border border-gray-200 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Voucher / Bill #</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={e => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="e.g. VOUCH-8419"
                    className="w-full border border-gray-200 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Description / Remarks <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Monthly office internet bill"
                  className="w-full border border-gray-200 rounded-lg p-2"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#EF4444] hover:bg-red-600 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle size={14} /> {submitting ? 'Saving...' : editingTx ? 'Update Expense' : 'Record Expense'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingTx(null); }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Row: Category, Date, Search, Export */}
      <div className="px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="py-1.5 px-3 text-xs border border-gray-200 rounded-lg outline-none font-medium"
            >
              <option value="all">-- All Categories --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <label className="text-[10px] font-bold text-gray-500 uppercase">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="border-none bg-transparent text-xs font-bold text-gray-800 p-0 focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <label className="text-[10px] font-bold text-gray-500 uppercase">To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="border-none bg-transparent text-xs font-bold text-gray-800 p-0 focus:ring-0"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-56">
            <input
              type="text"
              placeholder="Search description, payee..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-100"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          </div>

          <button
            onClick={exportToCSV}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
            title="Export CSV"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={exportToPDF}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
            title="Export PDF"
          >
            <Printer size={13} /> PDF
          </button>
        </div>
      </div>

      {/* Expense Table */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-200">
            <tr>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5">Category</th>
              <th className="px-6 py-3.5">Paid To / Payee</th>
              <th className="px-6 py-3.5">Description</th>
              <th className="px-6 py-3.5">Account / Method</th>
              <th className="px-6 py-3.5 text-right">Amount (৳)</th>
              <th className="px-6 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading expense entries...</td>
              </tr>
            ) : filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                  No expense entries found matching the filter criteria.
                </td>
              </tr>
            ) : (
              filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((tx, idx) => (
                <tr key={tx.id || idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                      {tx.category || 'Expense'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-bold text-gray-800">
                    {tx.entityName || '-'}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-gray-800">
                    {tx.description}
                    {tx.reference && <span className="text-[10px] font-mono text-gray-400 block">Ref: #{tx.reference}</span>}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-[10px] font-bold uppercase text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {tx.paymentMethod || 'cash'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-black text-red-600 text-sm">
                    {formatCurrency(tx.amount, settings)}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleEditClick(tx)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Entry"
                      >
                        <Edit2 size={13} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-6 pt-0">
        <Pagination
          currentPage={currentPage}
          totalItems={filteredExpenses.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
};

export default ManualExpenseTab;
