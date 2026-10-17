import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';
import { getApiUrl } from '../services/apiClient';
import {
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  Circle,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';

interface PasswordEvaluation {
  score: number;
  label: string;
  colorClass: string;
  textColorClass: string;
  checks: {
    minLength: boolean;
    hasMixedCase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
  feedback: string;
}

function evaluatePasswordStrength(pwd: string): PasswordEvaluation {
  const checks = {
    minLength: pwd.length >= 8,
    hasMixedCase: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_+=~`[\]\\;/']/.test(pwd),
  };

  if (!pwd) {
    return {
      score: 0,
      label: 'Enter a password',
      colorClass: 'bg-gray-200',
      textColorClass: 'text-gray-400',
      checks,
      feedback: 'Use 8+ characters with a mix of letters, numbers & symbols.',
    };
  }

  const passedCount = Object.values(checks).filter(Boolean).length;
  let score = passedCount;
  if (pwd.length < 6) {
    score = 1;
  } else if (pwd.length >= 12 && passedCount >= 3) {
    score = 4;
  }

  switch (score) {
    case 1:
      return {
        score: 1,
        label: 'Weak',
        colorClass: 'bg-rose-500',
        textColorClass: 'text-rose-600',
        checks,
        feedback: 'Easy to guess. Add more characters, numbers, or symbols.',
      };
    case 2:
      return {
        score: 2,
        label: 'Fair',
        colorClass: 'bg-amber-500',
        textColorClass: 'text-amber-600',
        checks,
        feedback: 'Getting better. Include uppercase letters and symbols for higher security.',
      };
    case 3:
      return {
        score: 3,
        label: 'Good',
        colorClass: 'bg-blue-500',
        textColorClass: 'text-blue-600',
        checks,
        feedback: 'Strong password. Add a special character or extra length to make it unbreakable.',
      };
    case 4:
    default:
      return {
        score: 4,
        label: 'Strong',
        colorClass: 'bg-emerald-500',
        textColorClass: 'text-emerald-600',
        checks,
        feedback: 'Excellent! Your password meets all security recommendations.',
      };
  }
}

export const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = searchParams.get('token') || '';
  const oobCode = searchParams.get('oobCode') || '';
  const initialEmail = searchParams.get('email') || '';

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [email, setEmail] = useState(initialEmail);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const passwordStrength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);

  useEffect(() => {
    const verifyLink = async () => {
      setVerifying(true);
      setTokenError('');

      try {
        if (oobCode) {
          const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
          if (verifiedEmail) setEmail(verifiedEmail);
          setTokenValid(true);
          setVerifying(false);
          return;
        }

        if (token) {
          const res = await fetch(getApiUrl('/api/email/verify-reset-token'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, email: initialEmail }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            if (data.email) setEmail(data.email);
            setTokenValid(true);
          } else {
            setTokenValid(false);
            setTokenError(data.error || 'This password reset link is invalid or has expired.');
          }
          setVerifying(false);
          return;
        }

        setTokenValid(false);
        setTokenError('Missing password reset token. Please request a new password reset link from the login page.');
      } catch (err: any) {
        setTokenValid(false);
        setTokenError(err?.message || 'Unable to verify password reset link.');
      } finally {
        setVerifying(false);
      }
    };

    verifyLink();
  }, [token, oobCode, initialEmail]);

  const handleGenerateStrongPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%^&*-_+=';
    const all = upper + lower + digits + symbols;

    const required = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    for (let i = 4; i < 14; i++) {
      required.push(all[Math.floor(Math.random() * all.length)]);
    }

    const generated = required.sort(() => Math.random() - 0.5).join('');
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    navigator.clipboard?.writeText(generated).catch(() => null);
    toast.success('Strong password generated & copied to clipboard!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordStrength.score < 2) {
      toast.error('Please choose a stronger password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      let completedViaFirebaseClient = false;

      if (oobCode) {
        await confirmPasswordReset(auth, oobCode, newPassword);
        completedViaFirebaseClient = true;
      }

      const res = await fetch(getApiUrl('/api/email/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          newPassword,
          completedViaFirebaseClient,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!completedViaFirebaseClient && (!res.ok || !data.success)) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setCompleted(true);
      toast.success('Your password has been updated!');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      toast.error(err?.message || 'Could not reset password. Please request a new reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  const requirementItems = [
    { key: 'minLength', label: 'At least 8 characters', met: passwordStrength.checks.minLength },
    { key: 'hasMixedCase', label: 'Uppercase & lowercase letters', met: passwordStrength.checks.hasMixedCase },
    { key: 'hasNumber', label: 'At least one number (0-9)', met: passwordStrength.checks.hasNumber },
    { key: 'hasSpecial', label: 'Special symbol (!@#$%^&*)', met: passwordStrength.checks.hasSpecial },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-block">
            <img
              src={settings?.logoUrl || '/logo.png'}
              alt="Click2IT"
              className="h-8 object-contain"
            />
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Account Recovery
          </span>
        </div>

        {verifying ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-medium text-gray-600">Verifying your secure reset link...</p>
          </div>
        ) : completed ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Password Updated!</h2>
            <p className="text-sm text-gray-600">
              Your account password for <strong>{email}</strong> has been changed. Redirecting you to sign in...
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-extrabold transition-colors"
            >
              Return to Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : !tokenValid ? (
          <div className="py-6 space-y-5">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-900">Reset Link Invalid or Expired</h3>
                <p className="text-xs text-rose-700 mt-1">{tokenError}</p>
              </div>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-extrabold transition-colors"
            >
              Request a New Reset Link
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <KeyRound className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Set a New Password</h1>
              <p className="text-xs text-gray-500">
                Choose a strong password for <strong>{email || 'your account'}</strong>.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">New Password</label>
                  <button
                    type="button"
                    onClick={handleGenerateStrongPassword}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Suggest strong password
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                    placeholder="Enter new strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Real-Time Password Strength Meter */}
                <div className="pt-2 space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Password strength</span>
                      <span className={`font-bold ${passwordStrength.textColorClass}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((segment) => (
                        <div
                          key={segment}
                          className={`h-full rounded-full transition-all duration-300 ${
                            passwordStrength.score >= segment
                              ? passwordStrength.colorClass
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      {passwordStrength.feedback}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 pt-0.5">
                    {requirementItems.map((item) => (
                      <div
                        key={item.key}
                        className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                          item.met ? 'text-emerald-700 font-medium' : 'text-gray-500'
                        }`}
                      >
                        {item.met ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="h-3 w-3 text-gray-300 shrink-0" />
                        )}
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                    placeholder="Re-enter new password"
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-rose-600 font-medium pt-0.5">
                    Passwords do not match.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || passwordStrength.score < 2 || newPassword !== confirmPassword}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-xs font-extrabold text-white bg-slate-900 hover:bg-black transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Update Password
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
