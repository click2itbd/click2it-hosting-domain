import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { sendEmail } from '../../../services/emailService';
import toast from 'react-hot-toast';
import { 
  Trash2, Mail, Download, Search, CheckCircle, XCircle, 
  Clock, AlertCircle, RefreshCw, FileText, CreditCard, Globe
} from 'lucide-react';

interface BdDomainApplication {
  id: string;
  domainName: string;
  applicantName: string;
  email: string;
  phone: string;
  nidUrl?: string;
  tradeLicenseUrl?: string;
  status: 'pending_check' | 'available' | 'not_available' | 'payment_pending' | 'processing' | 'completed' | 'rejected';
  createdAt?: any;
  emailSentAt?: any;
  type?: string;
  transferType?: string;
  willSendDocsLater?: boolean;
}

const statusColors = {
  pending_check: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  available: 'bg-green-100 text-green-800 border-green-200',
  not_available: 'bg-red-100 text-red-800 border-red-200',
  payment_pending: 'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels = {
  pending_check: 'Pending Check',
  available: 'Available',
  not_available: 'Not Available',
  payment_pending: 'Payment Pending',
  processing: 'Processing',
  completed: 'Completed',
  rejected: 'Rejected',
};

export function BdDomainApplicationsManager() {
  const [applications, setApplications] = useState<BdDomainApplication[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{url: string, title: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'bd_domain_applications'), (snapshot) => {
      const apps = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          domainName: data.domain || data.domainName || '',
          applicantName: data.name || data.applicantName || '',
          email: data.email || '',
          phone: data.phone || '',
          nidUrl: data.nidUrl || '',
          tradeLicenseUrl: data.tradeLicenseUrl || '',
          status: data.status || 'pending_check',
          createdAt: data.createdAt,
          emailSentAt: data.emailSentAt,
          type: data.type || data.requestType || 'registration',
          transferType: data.transferType,
          willSendDocsLater: data.willSendDocsLater,
        };
      }) as BdDomainApplication[];
      
      // Sort by date descending
      apps.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      
      setApplications(apps);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'bd_domain_applications', appId), {
        status: newStatus
      });
      toast.success(`Status updated to ${statusLabels[newStatus as keyof typeof statusLabels]}`);
      
      const app = applications.find(a => a.id === appId);
      if (app && (newStatus === 'rejected' || newStatus === 'not_available')) {
        let emailHtml = '';
        if (newStatus === 'not_available') {
          emailHtml = `<p>Dear ${app.applicantName},</p><p>We regret to inform you that the domain <strong>${app.domainName}</strong> is not available for registration via BTCL.</p><p>Please try applying for a different domain name.</p>`;
        } else {
          emailHtml = `<p>Dear ${app.applicantName},</p><p>There is an issue with your .BD domain application for <strong>${app.domainName}</strong>.</p><p>Your provided NID or Trade License may be invalid, illegible, or missing.</p><p>Please log in to your dashboard to check the status, or reply to this email to provide the correct documents.</p>`;
        }
        
        await sendEmail({
          to: app.email,
          subject: `Update on your .BD Domain Application: ${app.domainName}`,
          html: emailHtml
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (appId: string) => {
    if (!window.confirm("Are you sure you want to delete this application?")) return;
    try {
      await deleteDoc(doc(db, 'bd_domain_applications', appId));
      toast.success("Application deleted");
    } catch (error) {
      console.error("Error deleting application:", error);
      toast.error("Failed to delete application");
    }
  };

  const handleSendPaymentEmail = async (app: BdDomainApplication) => {
    setSendingEmail(app.id);
    try {
      const checkoutLink = `${window.location.origin}/checkout?bd_domain=${encodeURIComponent(app.domainName)}&app_id=${app.id}`;
      
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #2563eb;">Good news! Your domain is available</h2>
          <p>Dear ${app.applicantName},</p>
          <p>We are pleased to inform you that the domain <strong>${app.domainName}</strong> is available for registration.</p>
          <p>To proceed with the registration, please complete your payment by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${checkoutLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Proceed to Checkout</a>    </div>
          <p>Or copy this link to your browser: <br/>
          <a href="${checkoutLink}">${checkoutLink}</a></p>
          <p>If you have any questions, feel free to reply to this email.</p>
          <p>Best regards,<br/>The Hosting Team</p>    </div>
      `;

      const success = await sendEmail({
        to: app.email,
        subject: `Domain Available for Registration: ${app.domainName}`,
        html
      });

      if (success) {
        await updateDoc(doc(db, 'bd_domain_applications', app.id), {
          status: 'payment_pending',
          emailSentAt: new Date()
        });
        toast.success("Payment email sent successfully!");
      } else {
        // Fallback for local development or API failure
        await navigator.clipboard.writeText(checkoutLink);
        await updateDoc(doc(db, 'bd_domain_applications', app.id), {
          status: 'payment_pending'
        });
        toast.error("Email API failed, but checkout link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error processing email:", error);
      toast.error("Failed to process action");
    } finally {
      setSendingEmail(null);
    }
  };

  const filteredApps = applications.filter(app => 
    app.domainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="p-8 text-center"><RefreshCw className="animate-spin h-8 w-8 mx-auto text-blue-500" /></div>;
  }

  return (<>
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header & Stats */}
      <div className="p-6 md:p-8 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="text-blue-600" /> .BD Domain Applications
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage all BTCL domain requests and verifications</p>    </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search domain, name, email..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />    </div>    </div>
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-3xl font-black text-gray-800 relative z-10">{stats.total || 0}</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1 relative z-10">Total</span>    </div>
          {Object.entries(statusLabels).map(([key, label]) => {
            const isPending = key === 'pending_check';
            const isAvailable = key === 'available';
            const isCompleted = key === 'completed';
            
            return (
              <div key={key} className={`p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center relative overflow-hidden group bg-white`}>
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${
                  isPending ? 'bg-yellow-500' : isAvailable ? 'bg-green-500' : isCompleted ? 'bg-emerald-500' : 'bg-gray-500'
                }`}></div>
                <span className={`text-2xl font-bold relative z-10 ${
                  isPending ? 'text-yellow-600' : isAvailable ? 'text-green-600' : isCompleted ? 'text-emerald-600' : 'text-gray-700'
                }`}>{stats[key] || 0}</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1 relative z-10 text-center">{label}</span>    </div>
            );
          })}    </div>    </div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-4">Domain details</th>
              <th className="px-6 py-4">Applicant</th>
              <th className="px-6 py-4">Documents</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredApps.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <AlertCircle size={32} className="mb-3 opacity-20" />
                    <p>No applications found.</p>    </div>
                </td>
              </tr>
            ) : (
              filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <Globe size={18} />    </div>
                      <div>
                        <div className="font-bold text-gray-900 text-base flex items-center gap-2 flex-wrap">
                          {app.domainName}
                          {app.type === 'transfer' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                              Transfer {app.transferType === 'ownership_transfer' ? '(Ownership)' : '(Technical)'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                              Registration
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock size={12} />
                          {app.createdAt?.toDate ? app.createdAt.toDate().toLocaleDateString() : (app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Unknown date')}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {app.applicantName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{app.applicantName}</div>
                        <div className="text-[11px] mt-0.5 flex flex-col">
                          <a href={`mailto:${app.email}`} className="text-gray-500 hover:text-blue-600 transition-colors">{app.email}</a>
                          <a href={`tel:${app.phone}`} className="text-gray-500 hover:text-blue-600 transition-colors">{app.phone}</a>
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-2">
                      {app.willSendDocsLater && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200 w-fit">
                          Docs via Email/WhatsApp
                        </span>
                      )}
                      
                      {app.nidUrl ? (
                        <button onClick={() => setPreviewDoc({url: app.nidUrl as string, title: "NID Document - " + app.applicantName})} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100 w-fit">
                          <CheckCircle size={12} /> NID Uploaded
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-gray-400 text-[11px] font-semibold border border-gray-100 w-fit">
                          <XCircle size={12} /> No NID
                        </span>
                      )}
                      
                      {app.tradeLicenseUrl ? (
                        <button onClick={() => setPreviewDoc({url: app.tradeLicenseUrl as string, title: "Trade License - " + app.applicantName})} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100 w-fit">
                          <CheckCircle size={12} /> Trade License
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-gray-400 text-[11px] font-semibold border border-gray-100 w-fit">
                          <XCircle size={12} /> No License
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col gap-2">
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border shadow-sm cursor-pointer ${statusColors[app.status as keyof typeof statusColors]} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 appearance-none`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2rem' }}
                      >
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <option key={key} value={key} className="bg-white text-gray-800 font-medium">
                            {label}
                          </option>
                        ))}
                      </select>
                      
                      {app.emailSentAt && (
                        <div className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded w-fit">
                          <CheckCircle size={10} /> Link sent    </div>
                      )}    </div>
                  </td>
                  
                  <td className="px-8 py-5 whitespace-nowrap text-right">
                    <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {app.status === 'available' && (
                        <button
                          onClick={() => handleSendPaymentEmail(app)}
                          disabled={sendingEmail === app.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/30 transition-all disabled:opacity-50"
                          title="Send Checkout Link via Email"
                        >
                          {sendingEmail === app.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Mail className="h-3.5 w-3.5" />
                              Send Link
                            </>
                          )}
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors bg-white border border-gray-200 shadow-sm"
                        title="Delete Application"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>    </div>    </div>
      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{previewDoc.title}</h3>
              <button onClick={() => setPreviewDoc(null)} className="text-gray-400 hover:text-gray-600 bg-gray-200 hover:bg-gray-300 p-1.5 rounded-full transition-colors">
                <XCircle size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100 flex justify-center items-center min-h-[400px]">
              <iframe 
                src={previewDoc.url} 
                className="w-full h-[70vh] border-0 rounded bg-white shadow-sm"
                title={previewDoc.title}
              />
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <a 
                href={previewDoc.url} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 bg-[#0E2A47] hover:bg-[#1a3f66] text-white px-5 py-2 rounded-lg font-semibold transition-colors text-sm"
              >
                <Download size={16} /> Download / Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}
  </>);
}
