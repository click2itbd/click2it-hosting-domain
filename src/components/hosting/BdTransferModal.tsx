import React, { useState } from 'react';
import { X, Shield, FileText, CheckCircle2, Upload, Download, Phone, AlertCircle, RefreshCw, Send } from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { sendEmail } from '../../services/emailService';
import toast from 'react-hot-toast';

interface BdTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDomain?: string;
}

export function BdTransferModal({ isOpen, onClose, initialDomain = '' }: BdTransferModalProps) {
  const [domain, setDomain] = useState(initialDomain);
  const [transferType, setTransferType] = useState<'technical_move' | 'ownership_transfer'>('technical_move');
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [existingRegistrar, setExistingRegistrar] = useState('');
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);
  const [willSendLater, setWillSendLater] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  React.useEffect(() => {
    if (initialDomain) {
      setDomain(initialDomain);
    }
  }, [initialDomain]);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const targetDomain = domain.trim() || 'yourdomain.com.bd';
    const templateContent = `================================================================================
OFFICIAL .BD DOMAIN TECHNICAL CONTACT CHANGE AUTHORIZATION LETTER TEMPLATE
(Print on your Company Official Letterhead or Plain Paper for Personal Domain)
================================================================================

Date: ${new Date().toLocaleDateString('en-GB')}

To:
The Domain Compliance & Registry Team
Click2IT (Official .BD Domain Partner)
Dhaka, Bangladesh.

Subject: Request for changing Technical & Billing Contact for Domain: ${targetDomain}

Dear Sir,

I, the undersigned ${applicantName || '[Your Full Name]'}, am the legal and registered owner of the .BD domain "${targetDomain}".

I would like to authorize Click2IT (Web: click2it.bd / info@click2itbd.com) as the authorized technical management partner for our domain. Kindly update the Technical and Billing contact details in the central registry database as follows:

Domain Name: ${targetDomain}
New Technical Contact ID / Partner: Click2IT
Primary Nameserver: ns1.click2itbd.com
Secondary Nameserver: ns2.click2itbd.com

All required documents including copy of National ID (NID) / Trade License are attached herewith for your kind perusal and verification.

Kindly process this request at your earliest convenience.

Sincerely yours,

____________________________
Signature & Official Seal
Name: ${applicantName || '[Your Full Name]'}
Designation: [Proprietor / MD / Owner]
Company: [Your Organization Name]
Mobile: ${applicantPhone || '[Your Contact Number]'}
Email: ${applicantEmail || '[Your Email Address]'}
================================================================================`;

    const blob = new Blob([templateContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BD_Domain_Transfer_Authorization_${targetDomain.replace(/[^a-zA-Z0-9.-]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('.BD Transfer Authorization Letter Template downloaded!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanDomain = domain.trim().toLowerCase();
    if (!cleanDomain) {
      toast.error('Please enter the .bd domain name');
      return;
    }
    if (!applicantName.trim() || !applicantEmail.trim() || !applicantPhone.trim()) {
      toast.error('Please fill in your name, email, and phone number');
      return;
    }
    if (!termsAccepted) {
      toast.error('Please accept the terms and document verification acknowledgment');
      return;
    }

    setIsSubmitting(true);

    try {
      let nidUrl = '';
      let tradeLicenseUrl = '';

      if (!willSendLater && (nidFile || tradeLicenseFile)) {
        const storage = getStorage();

        if (nidFile) {
          const nidRef = ref(storage, `bd_domain_docs/${cleanDomain}/nid_${Date.now()}_${nidFile.name}`);
          await uploadBytes(nidRef, nidFile);
          nidUrl = await getDownloadURL(nidRef);
        }

        if (tradeLicenseFile) {
          const tlRef = ref(storage, `bd_domain_docs/${cleanDomain}/tl_${Date.now()}_${tradeLicenseFile.name}`);
          await uploadBytes(tlRef, tradeLicenseFile);
          tradeLicenseUrl = await getDownloadURL(tlRef);
        }
      }

      const applicationData: any = {
        domain: cleanDomain,
        domainName: cleanDomain,
        name: applicantName.trim(),
        applicantName: applicantName.trim(),
        email: applicantEmail.trim(),
        phone: applicantPhone.trim(),
        transferType,
        existingRegistrar: existingRegistrar.trim() || 'Not specified',
        willSendDocsLater: willSendLater,
        status: 'pending_check',
        type: 'transfer',
        requestType: 'bd_domain_transfer',
        createdAt: new Date().toISOString(),
      };

      if (nidUrl) applicationData.nidUrl = nidUrl;
      if (tradeLicenseUrl) applicationData.tradeLicenseUrl = tradeLicenseUrl;

      await addDoc(collection(db, 'bd_domain_applications'), applicationData);

      // Send email alert to admin
      try {
        await sendEmail({
          to: 'info@click2itbd.com',
          subject: `[Transfer Request] .BD Domain: ${cleanDomain}`,
          html: `<h3>New .BD Domain Manual Transfer Request</h3>
                 <p><strong>Domain:</strong> ${cleanDomain}</p>
                 <p><strong>Transfer Type:</strong> ${transferType === 'technical_move' ? 'Technical Contact Move (Keep Owner)' : 'Ownership Transfer'}</p>
                 <p><strong>Applicant Name:</strong> ${applicantName}</p>
                 <p><strong>Email:</strong> ${applicantEmail}</p>
                 <p><strong>Phone:</strong> ${applicantPhone}</p>
                 <p><strong>Current Registrar:</strong> ${existingRegistrar || 'None'}</p>
                 <p><strong>Document Status:</strong> ${willSendLater ? 'Customer will send later via email/WhatsApp' : 'Uploaded online'}</p>
                 <p>Please review in Admin Panel under .BD Domain Applications.</p>`,
        });
      } catch (mailErr) {
        console.warn('Admin notification email failed (non-blocking):', mailErr);
      }

      setIsSubmitted(true);
      toast.success('Your .BD domain transfer request has been received!');
    } catch (err: any) {
      console.error('Failed to submit .BD transfer application:', err);
      toast.error(err?.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🇧🇩</span>
            <span className="text-xs font-bold tracking-wider uppercase bg-white/20 px-2.5 py-0.5 rounded-full">
              Official .BD Domain Transfer
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            .BD Domain Transfer Assistance
          </h2>
          <p className="text-emerald-100 text-sm mt-1">
            .BD domains use document verification instead of EPP codes. Our specialists handle all official documentation and registry processing for you.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          {isSubmitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Transfer Request Submitted!</h3>
              <p className="text-slate-600 max-w-md mx-auto text-sm leading-relaxed">
                Thank you, <strong>{applicantName}</strong>. Our dedicated .BD domain specialists have received your request for <strong>{domain}</strong> and will contact you within 24 working hours.
              </p>
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-800">
                  <Shield size={16} /> What happens next?
                </div>
                <p>1. Our team will verify the current registry ownership and status of {domain}.</p>
                <p>2. We will assist you in preparing and validating the required authorization documents.</p>
                <p>3. Once processed, your domain technical contact and nameservers will be updated seamlessly.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <a
                  href={`https://wa.me/8801729887777?text=Hello%20Click2IT,%20I%20just%20submitted%20a%20.BD%20domain%20transfer%20request%20for%20${encodeURIComponent(domain)}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-colors shadow-md shadow-emerald-600/20"
                >
                  <Phone size={16} /> Contact via WhatsApp
                </a>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Notice Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-xs text-emerald-900 leading-relaxed">
                <Shield size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-emerald-800 mb-0.5">How .BD Transfer Works:</strong>
                  Official .BD domain transfers require scanned verification documents (NID / Trade License & Official Authorization Letter). No EPP code is needed—our compliance team handles the entire transfer process.
                </div>
              </div>

              {/* Domain & Transfer Type */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Domain Name to Transfer *
                  </label>
                  <input
                    type="text"
                    name="bd_transfer_domain"
                    autoComplete="off"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value.toLowerCase().trim())}
                    placeholder="e.g. click2it.bd or company.com.bd"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-mono transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Transfer Scope / Type *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      transferType === 'technical_move'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="radio"
                          name="transferType"
                          value="technical_move"
                          checked={transferType === 'technical_move'}
                          onChange={() => setTransferType('technical_move')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-bold text-slate-800">Technical Move</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed pl-5">
                        Keep same legal owner; move technical control, billing, and DNS management to Click2IT.
                      </p>
                    </label>

                    <label className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      transferType === 'ownership_transfer'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="radio"
                          name="transferType"
                          value="ownership_transfer"
                          checked={transferType === 'ownership_transfer'}
                          onChange={() => setTransferType('ownership_transfer')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-bold text-slate-800">Ownership Transfer</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed pl-5">
                        Transfer legal ownership rights from one company or individual to another.
                      </p>
                    </label>
                  </div>
                </div>
              </div>

              {/* Applicant Information */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Applicant & Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Full Name (Owner / Representative) *
                    </label>
                    <input
                      type="text"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="e.g. Muntasir Alam"
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={applicantEmail}
                      onChange={(e) => setApplicantEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Phone Number (Mobile) *
                    </label>
                    <input
                      type="tel"
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      placeholder="+880 17XX XXXXXX"
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Current Provider / Account Ref (Optional)
                    </label>
                    <input
                      type="text"
                      value={existingRegistrar}
                      onChange={(e) => setExistingRegistrar(e.target.value)}
                      placeholder="e.g. Previous Hosting Provider"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Template Download Utility */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700">
                  <FileText size={18} className="text-emerald-600 flex-shrink-0" />
                  <span>Need the official .BD transfer authorization format?</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 font-semibold rounded-lg text-slate-700 transition-all shadow-sm"
                >
                  <Download size={14} /> Download Sample Letter
                </button>
              </div>

              {/* Document Uploads */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Required Verification Documents
                  </h4>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={willSendLater}
                      onChange={(e) => setWillSendLater(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>I will submit documents later via Email/WhatsApp</span>
                  </label>
                </div>

                {!willSendLater ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-white transition-colors">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        1. NID or Passport Copy *
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setNidFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                      />
                      {nidFile && <p className="text-[11px] text-emerald-600 mt-1 truncate">Selected: {nidFile.name}</p>}
                    </div>

                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-white transition-colors">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        2. Trade License or Letterhead (Optional for Personal)
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setTradeLicenseFile(e.target.files?.[0] || null)}
                        className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                      />
                      {tradeLicenseFile && <p className="text-[11px] text-emerald-600 mt-1 truncate">Selected: {tradeLicenseFile.name}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle size={16} className="flex-shrink-0 text-amber-600" />
                    <span>You can submit this form now and email your documents to <strong>info@click2itbd.com</strong> or WhatsApp <strong>+8801729887777</strong> quoting your domain name.</span>
                  </div>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    I confirm that I am the legal owner or authorized representative for <strong>{domain || 'this domain'}</strong>, and authorize Click2IT to process the official .BD domain transfer on my behalf.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Submit .BD Transfer Request
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
