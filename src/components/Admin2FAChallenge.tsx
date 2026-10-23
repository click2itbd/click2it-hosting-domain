import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Key, Copy, Check, QrCode, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  generateTotpSecret,
  verifyTotpCode,
  buildWhitelabeledTotpUri,
  generateQrCodeSvgDataUrl,
  generateBackupCodes,
} from '../utils/totp';
import { toast } from 'react-hot-toast';

interface Admin2FAChallengeProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const Admin2FAChallenge: React.FC<Admin2FAChallengeProps> = ({ onSuccess, onCancel }) => {
  const { user, profile, refreshProfile, set2faVerified } = useAuth();
  const { settings } = useSettings();

  const brandName = settings?.companyName || 'CLICK2IT BD';

  const isSetupMode = !profile?.totpSecret || !profile?.twoFactorEnabled;

  // Setup state
  const [setupSecret, setSetupSecret] = useState<string>('');
  const [setupQrUrl, setSetupQrUrl] = useState<string>('');
  const [setupBackupCodes, setSetupBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState<string>('');
  const [isBackupMode, setIsBackupMode] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);
  const [copiedCodes, setCopiedCodes] = useState<boolean>(false);
  const [setupConfirmed, setSetupConfirmed] = useState<boolean>(false);

  // Initialize Setup Secret & QR code if in Setup Mode
  useEffect(() => {
    if (isSetupMode && !setupSecret) {
      const secret = generateTotpSecret(20);
      const email = user?.email || 'admin@click2it.bd';
      const uri = buildWhitelabeledTotpUri(email, secret, brandName);
      const qrUrl = generateQrCodeSvgDataUrl(uri);
      const backup = generateBackupCodes(8);

      setSetupSecret(secret);
      setSetupQrUrl(qrUrl);
      setSetupBackupCodes(backup);
    }
  }, [isSetupMode, setupSecret, user?.email, brandName]);

  const handleCopySecret = () => {
    if (!setupSecret) return;
    navigator.clipboard.writeText(setupSecret);
    setCopiedSecret(true);
    toast.success('Secret key copied to clipboard');
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    if (setupBackupCodes.length === 0) return;
    navigator.clipboard.writeText(setupBackupCodes.join('\n'));
    setCopiedCodes(true);
    toast.success('Backup recovery codes copied');
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanCode = code.trim().replace(/\s+/g, '');

    if (!cleanCode) {
      setErrorMsg('Please enter your 6-digit verification code.');
      return;
    }

    setVerifying(true);

    try {
      if (isSetupMode) {
        // Validate code against temporary setupSecret
        const isValid = await verifyTotpCode(setupSecret, cleanCode);
        if (!isValid) {
          setErrorMsg('Invalid 6-digit code. Check your authenticator app and try again.');
          setVerifying(false);
          return;
        }

        // Code valid! Save secret and backup codes to user's Firestore document
        if (user?.uid) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            totpSecret: setupSecret,
            twoFactorEnabled: true,
            twoFactorSetupAt: new Date().toISOString(),
            backupCodes: setupBackupCodes,
          });
          await refreshProfile();
        }

        setSetupConfirmed(true);
        set2faVerified(true);
        toast.success('Admin 2FA Security successfully configured!');
      } else {
        // Verification Mode
        if (isBackupMode) {
          // Check if input matches one of stored backup codes
          const storedBackup = profile?.backupCodes || [];
          const matchedCodeIndex = storedBackup.findIndex(
            (bc) => bc.replace(/-/g, '').toLowerCase() === cleanCode.replace(/-/g, '').toLowerCase()
          );

          if (matchedCodeIndex === -1) {
            setErrorMsg('Invalid recovery backup code.');
            setVerifying(false);
            return;
          }

          // Consume backup code
          const updatedCodes = [...storedBackup];
          updatedCodes.splice(matchedCodeIndex, 1);

          if (user?.uid) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { backupCodes: updatedCodes });
            await refreshProfile();
          }

          set2faVerified(true);
          toast.success('Verified using recovery code');
          onSuccess();
        } else {
          // Verify 6-digit TOTP code against stored profile.totpSecret
          const secret = profile?.totpSecret || '';
          const isValid = await verifyTotpCode(secret, cleanCode);

          if (!isValid) {
            setErrorMsg('Invalid 6-digit code. Please check your authenticator app.');
            setVerifying(false);
            return;
          }

          set2faVerified(true);
          toast.success('Admin 2FA Verified');
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error('2FA Verification Error:', err);
      setErrorMsg(err.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 text-center relative">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Admin 2-Factor Authentication</h2>
          <p className="text-xs text-indigo-200/90 mt-1 font-medium">
            {brandName} • Security Control Panel
          </p>
        </div>

        <div className="p-6">
          {isSetupMode ? (
            setupConfirmed ? (
              /* Setup Complete View showing Backup Codes */
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold block">2FA Activation Complete!</span>
                    Your admin account is now secured with two-factor authentication.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Emergency Backup Recovery Codes
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Save these single-use recovery codes in a safe place. If you lose your authenticator app, you can use these to sign in.
                  </p>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs grid grid-cols-2 gap-2 border border-slate-800">
                    {setupBackupCodes.map((c, i) => (
                      <span key={i} className="text-center bg-slate-800/80 rounded py-1 border border-slate-700/50">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyBackupCodes}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCodes ? 'Copied' : 'Copy Codes'}
                  </button>
                  <button
                    type="button"
                    onClick={onSuccess}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    Continue to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Setup Instructions View */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-center">
                  <p className="text-xs text-slate-600 font-medium">
                    Scan this QR code with Google Authenticator, Authy, or 1Password to connect 2FA.
                  </p>
                </div>

                {/* Whitelabeled QR Code Display */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
                  {setupQrUrl ? (
                    <img
                      src={setupQrUrl}
                      alt="Admin 2FA QR Code"
                      className="w-40 h-40 object-contain rounded-lg shadow-sm border border-slate-200 bg-white p-1"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-slate-200 rounded-lg animate-pulse flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Secret Key Text Display */}
                <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="overflow-hidden pr-2">
                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                      Manual Entry Key
                    </span>
                    <span className="font-mono text-xs text-slate-800 select-all truncate block">
                      {setupSecret || '••••••••••••••••'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-600 border border-slate-300 transition-colors shrink-0"
                    title="Copy Secret"
                  >
                    {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Verification Code Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter 6-Digit Authenticator Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.5em] font-mono text-lg py-2.5 px-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50"
                    autoFocus
                  />
                </div>

                {errorMsg && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {onCancel && (
                    <button
                      type="button"
                      onClick={onCancel}
                      className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={verifying || code.length < 6}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Confirm & Enable 2FA
                  </button>
                </div>
              </form>
            )
          ) : (
            /* Login Verification Challenge View */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-slate-600 font-medium">
                  {isBackupMode
                    ? 'Enter an emergency 8-character recovery backup code.'
                    : 'Open your Authenticator app and enter the 6-digit code for CLICK2IT BD.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isBackupMode ? 'Recovery Backup Code' : '6-Digit Security Code'}
                </label>
                <input
                  type="text"
                  maxLength={isBackupMode ? 9 : 6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={isBackupMode ? 'XXXX-XXXX' : '000000'}
                  className={`w-full text-center tracking-[0.3em] font-mono text-lg py-2.5 px-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50`}
                  autoFocus
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupMode(!isBackupMode);
                    setCode('');
                    setErrorMsg(null);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline flex items-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" />
                  {isBackupMode ? 'Use Authenticator App' : 'Use Recovery Code'}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={verifying || !code.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Verify & Access Admin
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
