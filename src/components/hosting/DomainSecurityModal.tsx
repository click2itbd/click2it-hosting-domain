import React, { useState, useEffect } from 'react';
import { 
  Lock, Unlock, Shield, Key, Copy, Check, Eye, EyeOff, 
  AlertTriangle, CheckCircle, RefreshCw, X, ExternalLink, Info, HelpCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiPost } from '../../services/apiClient';
import { getFriendlyErrorMessage } from '../../utils/errorUtils';

interface DomainSecurityModalProps {
  domain: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export const DomainSecurityModal: React.FC<DomainSecurityModalProps> = ({
  domain,
  onClose,
  onUpdate
}) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [updatingLock, setUpdatingLock] = useState(false);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);
  const [showEpp, setShowEpp] = useState(false);
  const [copiedEpp, setCopiedEpp] = useState(false);

  // Fetch live registry status
  const fetchDomainSecurity = async () => {
    setLoading(true);
    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'get_details',
        domain
      });
      if (res && res.success && res.data) {
        setDetails(res.data);
      } else {
        toast.error(getFriendlyErrorMessage(res?.error, 'Could not retrieve domain security status. Please try again.'));
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to connect to domain registry right now. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (domain) {
      fetchDomainSecurity();
    }
  }, [domain]);

  // Toggle Registrar Lock (clientTransferProhibited)
  const handleToggleLock = async () => {
    if (!details) return;
    const currentLock = !!details.is_locked;
    const nextState = !currentLock;
    setUpdatingLock(true);
    const toastId = toast.loading(`${nextState ? 'Locking' : 'Unlocking'} domain at registry...`);

    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'set_lock',
        domain,
        extraParams: { isLocked: nextState }
      });

      if (res && res.success) {
        toast.success(`Domain ${nextState ? 'Locked (Transfer Prohibited)' : 'Unlocked (Transfer Allowed)'}!`, { id: toastId });
        setDetails((prev: any) => ({ ...prev, is_locked: nextState }));
        if (onUpdate) onUpdate();
      } else {
        toast.error(getFriendlyErrorMessage(res?.error, 'Failed to update domain lock status. Please try again.'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update domain lock status. Please try again.'), { id: toastId });
    } finally {
      setUpdatingLock(false);
    }
  };

  // Toggle WHOIS Privacy (ID Protection)
  const handleTogglePrivacy = async () => {
    if (!details) return;
    const currentPrivacy = !!details.is_whois_privacy_enabled;
    const nextPrivacy = !currentPrivacy;
    setUpdatingPrivacy(true);
    const toastId = toast.loading(`${nextPrivacy ? 'Enabling' : 'Disabling'} WHOIS Privacy...`);

    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'set_whois_privacy',
        domain,
        extraParams: { isEnabled: nextPrivacy }
      });

      if (res && res.success) {
        toast.success(`WHOIS Privacy ${nextPrivacy ? 'Enabled' : 'Disabled'}!`, { id: toastId });
        setDetails((prev: any) => ({ ...prev, is_whois_privacy_enabled: nextPrivacy }));
        if (onUpdate) onUpdate();
      } else {
        toast.error(getFriendlyErrorMessage(res?.error, 'Failed to update WHOIS privacy. Please try again.'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update WHOIS privacy. Please try again.'), { id: toastId });
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const copyEppCode = () => {
    if (!details?.auth_code) return;
    navigator.clipboard.writeText(details.auth_code);
    setCopiedEpp(true);
    toast.success('EPP / Transfer Auth code copied!');
    setTimeout(() => setCopiedEpp(false), 2000);
  };

  const isLocked = details ? Boolean(details.is_locked) : true;
  const isPrivacyOn = details ? Boolean(details.is_whois_privacy_enabled) : false;
  const authCode = details?.auth_code || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#0e2a47] to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/20 shadow-xs">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Domain Lock & Security
              </h3>
              <p className="text-xs text-blue-200 font-mono mt-0.5">{domain}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs">
          
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw size={24} className="animate-spin text-blue-600" />
              <p className="font-medium text-xs">Connecting to global registry for {domain}...</p>
            </div>
          ) : (
            <>
              {/* Registrar Lock Banner Card */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isLocked 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isLocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">
                          {isLocked ? 'Registrar Lock Active (Protected)' : 'Registrar Lock Disabled (Unlocked)'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                          isLocked ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-200/80 text-amber-900'
                        }`}>
                          {isLocked ? 'LOCKED' : 'UNLOCKED'}
                        </span>
                      </div>
                      <p className={`mt-1 leading-relaxed ${isLocked ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {isLocked 
                          ? 'Your domain is locked at the registry (status: clientTransferProhibited). It cannot be transferred to another provider without your explicit authorization.'
                          : 'Your domain is currently unlocked. Anyone with the EPP authorization code can submit a transfer request to another registrar.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Toggle Action */}
                <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {isLocked ? 'Want to move to another registrar?' : 'Keep domain safe from unauthorized hijacking?'}
                  </span>
                  <button
                    onClick={handleToggleLock}
                    disabled={updatingLock}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 ${
                      isLocked
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {updatingLock ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : isLocked ? (
                      <Unlock size={13} />
                    ) : (
                      <Lock size={13} />
                    )}
                    <span>{updatingLock ? 'Updating...' : isLocked ? 'Unlock Domain' : 'Lock Domain (Protect)'}</span>
                  </button>
                </div>
              </div>

              {/* Transfer Auth / EPP Code Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-blue-600" />
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                      Transfer Authorization / EPP Code
                    </span>
                  </div>
                  {authCode && (
                    <button
                      onClick={copyEppCode}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-100/80 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                    >
                      {copiedEpp ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedEpp ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  )}
                </div>

                <p className="text-slate-500 text-[11px] leading-relaxed">
                  The EPP Code (Auth Key) is a secret security key required by the receiving registrar to transfer this domain.
                </p>

                <div className="relative">
                  <input
                    type={showEpp ? 'text' : 'password'}
                    readOnly
                    value={authCode || 'Auth code protected / contact support'}
                    className="w-full pl-3.5 pr-20 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 outline-none select-all"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowEpp(!showEpp)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      title={showEpp ? 'Hide EPP Code' : 'Show EPP Code'}
                    >
                      {showEpp ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {authCode && (
                      <button
                        type="button"
                        onClick={copyEppCode}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Copy EPP Code"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* WHOIS Privacy (ID Protection) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield size={16} className={isPrivacyOn ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className="font-bold text-slate-900 text-xs">WHOIS Privacy (ID Protection)</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                    Hides your personal email, phone number, and street address from the public WHOIS registry.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[11px] font-bold ${isPrivacyOn ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isPrivacyOn ? 'Enabled' : 'Disabled'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivacyOn}
                      onChange={handleTogglePrivacy}
                      disabled={updatingPrivacy}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>

              {/* ICANN Transfer Out Checklist */}
              <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100 text-[11px] text-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <HelpCircle size={15} className="text-blue-600" />
                  <span>How to transfer this domain to another registrar:</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li><strong>Unlock Domain:</strong> Turn off Registrar Lock above.</li>
                  <li><strong>Copy EPP Code:</strong> Provide the Auth/EPP Code to your new registrar.</li>
                  <li><strong>Check 60-day Rule:</strong> ICANN requires domains to be at least 60 days old from registration/previous transfer before transferring.</li>
                  <li><strong>Approve Transfer Email:</strong> Current registrar will email the admin contact to approve within 5–7 days.</li>
                </ol>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={fetchDomainSecurity}
            disabled={loading}
            className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Status</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
