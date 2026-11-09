import React, { useState } from 'react';
import { X, Printer, Download, Mail, CheckCircle2, Clock, AlertCircle, Loader2, Building, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiPost } from '../../services/apiClient';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency } from '../../lib/utils';

export interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  isAdmin?: boolean;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  order,
  isAdmin = false,
}) => {
  const { settings } = useSettings();
  const [sendingEmail, setSendingEmail] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!isOpen || !order) return null;

  const brandName = settings?.brandName || 'CLICK2IT BD';
  const contactEmail = settings?.contactEmail || 'info@click2it.bd';
  const contactPhone = settings?.contactPhone || '+8809640887777, +8801729887777';
  const address = settings?.address || 'Shop No. 1072, Level 10, Multiplan Center, 69-71 New Elephant Road, Dhaka-1205';

  const docNumber = order.documentNumber || `#INV-${order.id?.slice(0, 8)?.toUpperCase() || '00000'}`;
  const isPaid = ['paid', 'verified', 'completed'].includes(String(order.paymentStatus || '').toLowerCase());
  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : new Date().toLocaleDateString();

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = Number(order.subtotal || order.total || 0);
  const discountAmount = Number(order.discountAmount || 0);
  const total = Number(order.total || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 18;

      // Header Brand
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(brandName, 14, currentY);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      currentY += 5;
      doc.text(contactEmail, 14, currentY);
      currentY += 4;
      doc.text(contactPhone, 14, currentY);
      currentY += 4;
      const addrLines = doc.splitTextToSize(address, 100);
      doc.text(addrLines, 14, currentY);
      currentY += (addrLines.length * 4);

      // Top Right: INVOICE tag & number
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('INVOICE', pageWidth - 14, 18, { align: 'right' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(docNumber, pageWidth - 14, 25, { align: 'right' });
      doc.text(`Date: ${formattedDate}`, pageWidth - 14, 30, { align: 'right' });

      // Status Badge text
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isPaid ? 16 : 217, isPaid ? 185 : 119, isPaid ? 129 : 6);
      doc.text(isPaid ? 'PAID' : 'PENDING PAYMENT', pageWidth - 14, 36, { align: 'right' });

      currentY = Math.max(currentY + 6, 44);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, currentY, pageWidth - 14, currentY);
      currentY += 8;

      // Billed To info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Billed To:', 14, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      currentY += 5;

      const cName = order.customerName || 'Valued Customer';
      doc.text(cName, 14, currentY);
      currentY += 4.5;
      if (order.customerEmail) {
        doc.text(order.customerEmail, 14, currentY);
        currentY += 4.5;
      }
      if (order.customerPhone) {
        doc.text(order.customerPhone, 14, currentY);
        currentY += 4.5;
      }

      currentY += 4;

      // Items Table
      const tableBody = items.map((item: any) => [
        item.name || item.domain || 'Hosting / Domain Service',
        item.itemType === 'domain' ? `${item.termYears || 1} Year(s)` : (item.billingCycle || 'Monthly'),
        `BDT ${Number(item.price || 0).toLocaleString()}`,
        `BDT ${Number(item.total || item.price || 0).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Service / Item', 'Billing Cycle / Term', 'Unit Price', 'Total']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3.5 },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);

      const rightLabelX = pageWidth - 65;
      const rightValX = pageWidth - 14;

      doc.text('Subtotal:', rightLabelX, finalY);
      doc.text(`BDT ${subtotal.toLocaleString()}`, rightValX, finalY, { align: 'right' });

      let currentSumY = finalY;
      if (discountAmount > 0) {
        currentSumY += 5;
        doc.setTextColor(22, 163, 74);
        doc.text('Discount:', rightLabelX, currentSumY);
        doc.text(`- BDT ${discountAmount.toLocaleString()}`, rightValX, currentSumY, { align: 'right' });
      }

      currentSumY += 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('Total:', rightLabelX, currentSumY);
      doc.text(`BDT ${total.toLocaleString()}`, rightValX, currentSumY, { align: 'right' });

      currentSumY += 12;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Thank you for choosing Click2IT BD! For questions, email info@click2it.bd.', 14, currentSumY);

      doc.save(`Invoice_${docNumber.replace('#', '')}.pdf`);
      toast.success('Invoice downloaded successfully!');
    } catch (err: any) {
      console.error('Invoice PDF generation error:', err);
      toast.error('Failed to generate PDF invoice.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendInvoiceEmail = async () => {
    try {
      setSendingEmail(true);
      const res: any = await apiPost(`/api/orders/${order.id}/send-invoice-email`, {
        recipientEmail: order.customerEmail,
      });

      if (res?.success) {
        toast.success(res.message || `Invoice sent to ${order.customerEmail}`);
      } else {
        toast.error(res?.error || 'Failed to send invoice email');
      }
    } catch (err: any) {
      console.error('Send invoice email error:', err);
      toast.error(err?.message || 'Failed to dispatch invoice email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base sm:text-lg tracking-tight">Official Order Invoice</h3>
            <span className="text-xs text-slate-400 font-mono">({docNumber})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              title="Download PDF"
            >
              {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            <button
              onClick={handleSendInvoiceEmail}
              disabled={sendingEmail || !order.customerEmail}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              title="Send to Customer Email"
            >
              {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              <span>{isAdmin ? 'Email Customer' : 'Email to Me'}</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors ml-2"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable / Rendered Invoice Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 bg-white" id="invoice-printable-area">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-black tracking-tight text-slate-900">{brandName}</h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">Enterprise Cloud Hosting & Domain Infrastructure</p>
              <div className="mt-3 text-xs text-slate-600 space-y-0.5 leading-relaxed">
                <p>{address}</p>
                <p>Phone: <span className="font-semibold">{contactPhone}</span></p>
                <p>Email: <span className="font-semibold text-blue-600">{contactEmail}</span></p>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="inline-block">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {isPaid ? 'PAID' : (order.paymentStatus ? order.paymentStatus.toUpperCase() : 'PENDING PAYMENT')}
                </span>
              </div>

              <h2 className="text-lg font-extrabold text-blue-600 mt-2 font-mono">{docNumber}</h2>
              <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                <p>Invoice Date: <span className="font-semibold text-slate-700">{formattedDate}</span></p>
                <p>Payment: <span className="font-semibold uppercase text-slate-700">{order.paymentMethod || 'Manual'}</span></p>
                {order.transactionId && (
                  <p className="font-mono text-[11px] text-slate-600">TrxID: {order.transactionId}</p>
                )}
              </div>
            </div>
          </div>

          {/* Customer / Billed To Section */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Billed To (Customer Details)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <p className="font-bold text-sm text-slate-900">{order.customerName || 'Valued Customer'}</p>
                <p className="text-slate-600 mt-0.5">{order.customerEmail}</p>
                {order.customerPhone && <p className="text-slate-600">{order.customerPhone}</p>}
              </div>
              <div className="sm:text-right text-slate-600">
                {order.shippingAddress && (
                  <p className="leading-relaxed">
                    {typeof order.shippingAddress === 'string'
                      ? order.shippingAddress
                      : `${order.shippingAddress.address || ''} ${order.shippingAddress.city || ''}`}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">Customer ID: #{order.userId?.slice(0, 8) || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="px-4 py-3">Description & Service Details</th>
                  <th className="px-4 py-3 text-center">Term / Cycle</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      No order items recorded.
                    </td>
                  </tr>
                ) : (
                  items.map((item: any, idx: number) => {
                    const name = item.name || item.domain || 'Hosting / Domain Service';
                    const term = item.itemType === 'domain'
                      ? `${item.termYears || 1} Year(s)`
                      : (item.billingCycle || 'Monthly');
                    const price = Number(item.price || 0);
                    const lineTotal = Number(item.total || item.price || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{name}</p>
                          {item.domain && item.itemType !== 'domain' && (
                            <p className="text-[11px] text-blue-600 font-mono mt-0.5">Domain: {item.domain}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 capitalize">
                          {term}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {formatCurrency(price, settings as any)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {formatCurrency(lineTotal, settings as any)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(subtotal, settings as any)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span>- {formatCurrency(discountAmount, settings as any)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 border-t-2 border-slate-900 pt-2">
                <span>Total Amount:</span>
                <span className="text-blue-600">{formatCurrency(total, settings as any)}</span>
              </div>
            </div>
          </div>

          {/* Notice & Support Box */}
          <div className="rounded-xl p-3.5 bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Need help with this order?</p>
              <p className="text-blue-800/80 mt-0.5 leading-relaxed">
                Contact our support desk 24/7 via WhatsApp or email <span className="font-semibold">{contactEmail}</span>. Retain your invoice number ({docNumber}) for quick billing reference.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">
            Click2IT Billing System &bull; Electronic Computer Generated Invoice
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
