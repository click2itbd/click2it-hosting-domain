import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getApiUrl } from '../services/apiClient';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Server,
  Shield,
  Zap,
  Eye,
  EyeOff,
  ShoppingBag,
  ShieldCheck,
  Truck,
  Cpu,
  Settings,
  Star,
  Check,
  Circle,
  RefreshCw,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../utils/errorUtils';
import { useSettings } from '../context/SettingsContext';
import { useSiteContext } from '../hooks/useSiteContext';

interface PasswordEvaluation {
  score: number; // 0 to 4
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

export const Login: React.FC = () => {
  const location = useLocation();
  const isRegisterRoute =
    location.pathname === '/register' ||
    location.pathname === '/signup' ||
    new URLSearchParams(location.search).get('mode') === 'register' ||
    new URLSearchParams(location.search).get('mode') === 'signup';

  const isForgotRoute =
    location.pathname === '/forgot-password' ||
    new URLSearchParams(location.search).get('mode') === 'forgot';

  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(isRegisterRoute);
  const [isForgotPassword, setIsForgotPassword] = useState(isForgotRoute);
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (isRegisterRoute) {
      setIsSignUp(true);
      setIsForgotPassword(false);
    } else if (isForgotRoute) {
      setIsForgotPassword(true);
      setIsSignUp(false);
    }
  }, [isRegisterRoute, isForgotRoute]);

  const navigate = useNavigate();
  const { settings } = useSettings();
  const siteContext = useSiteContext();

  const passwordStrength = useMemo(() => evaluatePasswordStrength(password), [password]);

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
    setPassword(generated);
    setShowPassword(true);
    navigator.clipboard?.writeText(generated).catch(() => null);
    toast.success('Strong password generated & copied to clipboard!');
  };

  const getContextContent = () => {
    switch (siteContext) {
      case 'ecommerce':
        return {
          title: 'Shop the Best Electronics',
          subtitle: 'Discover top brands, exclusive deals, and fast delivery for all your tech needs.',
          features: [
            { icon: <ShoppingBag className="text-orange-400" />, title: 'Vast Selection', desc: 'Find everything from gadgets to premium accessories.' },
            { icon: <ShieldCheck className="text-blue-400" />, title: '100% Authentic', desc: 'Genuine products with official brand warranties.' },
            { icon: <Truck className="text-emerald-400" />, title: 'Fast Delivery', desc: 'Secure and express shipping across the country.' },
          ],
        };
      case 'pc-build':
        return {
          title: 'Build Your Dream Setup',
          subtitle: 'Select from thousands of premium components and let our experts assemble it for you.',
          features: [
            { icon: <Cpu className="text-purple-400" />, title: 'Premium Components', desc: 'Latest processors, GPUs, and motherboards.' },
            { icon: <Settings className="text-slate-400" />, title: 'Expert Assembly', desc: 'Professional cable management and stress testing.' },
            { icon: <Star className="text-yellow-400" />, title: '3 Years Warranty', desc: 'Comprehensive warranty on all custom builds.' },
          ],
        };
      default:
        return {
          title: 'Empower Your Digital Presence',
          subtitle: 'Join thousands of businesses scaling on our ultra-fast, secure, and reliable cloud infrastructure.',
          features: [
            { icon: <Zap className="text-yellow-400" />, title: 'Lightning Fast', desc: 'NVMe SSDs and global CDN for unmatched speed.' },
            { icon: <Shield className="text-blue-400" />, title: 'Enterprise Security', desc: 'Free SSL, DDoS protection, and automated backups.' },
            { icon: <Server className="text-red-400" />, title: '99.9% Uptime', desc: 'Reliable infrastructure guaranteed to keep you online.' },
          ],
        };
    }
  };

  const contextData = getContextContent();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCred = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid)).catch(() => null);
      const role = userDoc?.exists() ? userDoc.data()?.role : 'user';
      toast.success('Successfully signed in with Google!');
      navigate(role === 'admin' || role === 'staff' || role === 'manager' ? '/admin' : '/profile');
    } catch (error: any) {
      if (error?.code === 'auth/unauthorized-domain') {
        const hostname = window.location.hostname;
        toast.error('Google sign-in is currently unavailable. Please sign in with Email and Password.');
      } else if (error?.code === 'auth/popup-blocked') {
        toast.error('Pop-up was blocked by your browser. Please allow pop-ups or sign in with Email and Password.');
      } else if (error?.code !== 'auth/popup-closed-by-user') {
        toast.error(getFriendlyErrorMessage(error, 'Google sign-in could not be completed. Please use Email and Password.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }

    if (isSignUp && passwordStrength.score < 2) {
      toast.error('Please choose a stronger password that meets at least 2 security requirements.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName: displayName.trim() }).catch(() => null);
        }
        await setDoc(
          doc(db, 'users', userCredential.user.uid),
          {
            uid: userCredential.user.uid,
            email: email.trim(),
            displayName: displayName.trim() || email.split('@')[0],
            role: 'user',
            permissions: [],
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => null);
        toast.success('Account created successfully!');
        navigate('/profile');
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid)).catch(() => null);
        const role = userDoc?.exists() ? userDoc.data()?.role : 'user';
        toast.success('Successfully signed in!');
        navigate(role === 'admin' || role === 'staff' || role === 'manager' ? '/admin' : '/profile');
      }
    } catch (error: any) {
      if (
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/user-not-found'
      ) {
        toast.error('Invalid email or password. Please check your credentials and try again.');
      } else if (error?.code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists. Please sign in instead.');
      } else if (error?.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters long.');
      } else if (error?.code === 'auth/too-many-requests') {
        toast.error('Too many failed login attempts. Please try again later or reset your password.');
      } else {
        toast.error(getFriendlyErrorMessage(error, 'Authentication could not be completed. Please check your credentials and try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Please enter your registered email address.');
      return;
    }

    setIsResetting(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://click2it.bd';
      const response = await fetch(getApiUrl('/api/email/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, origin }),
      });

      const data = await response.json().catch(() => ({}));

      // If Resend/backend suggests client Firebase fallback, also dispatch via Firebase Auth
      if (!response.ok || data.fallbackClientFirebase) {
        await sendPasswordResetEmail(auth, cleanEmail).catch(() => null);
      }

      setResetEmailSent(true);
      toast.success('Password reset link sent! Please check your email inbox.');
    } catch (error: any) {
      // Fallback to Firebase client password reset email
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        setResetEmailSent(true);
        toast.success('Password reset link sent! Please check your email inbox.');
      } catch (fbErr: any) {
        toast.error(getFriendlyErrorMessage(fbErr, 'Unable to send password reset email. Please verify your address and try again.'));
      }
    } finally {
      setIsResetting(false);
    }
  };

  const requirementItems = [
    { key: 'minLength', label: 'At least 8 characters', met: passwordStrength.checks.minLength },
    { key: 'hasMixedCase', label: 'Uppercase & lowercase letters', met: passwordStrength.checks.hasMixedCase },
    { key: 'hasNumber', label: 'At least one number (0-9)', met: passwordStrength.checks.hasNumber },
    { key: 'hasSpecial', label: 'Special symbol (!@#$%^&*)', met: passwordStrength.checks.hasSpecial },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* LEFT SIDE - VISUALS */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#081621] p-12 text-white relative overflow-hidden">
        {/* Background Gradients/Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-500/20 rounded-full blur-[100px]" />

        <div className="relative z-10">
          <Link to="/" className="inline-block">
            {settings?.logoUrl ? (
              <img src={settings?.logoUrl} alt="Logo" className="h-10 object-contain" />
            ) : (
              <img src="/logo.png" alt="Logo" className="h-10 object-contain" />
            )}
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            {contextData.title}
          </h1>
          <p className="text-gray-400 text-lg mb-12">
            {contextData.subtitle}
          </p>

          <div className="space-y-6">
            {contextData.features.map((feature, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">{feature.title}</h3>
                  <p className="text-gray-400 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm text-gray-500">
          &copy; {new Date().getFullYear()} {settings?.companyName || 'Click2IT'}. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <Link to="/" className="md:hidden absolute top-6 left-6">
          <img src="/logo.png" alt="Logo" className="h-8 object-contain" />
        </Link>

        <div className="w-full max-w-md mt-12 md:mt-0">
          {isForgotPassword ? (
            /* FORGOT PASSWORD VIEW (Resend Notification Flow) */
            <div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetEmailSent(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 mb-6 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </button>

              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Forgot password?
                </h2>
                <p className="text-gray-500 text-sm">
                  Enter the email address associated with your account and we&apos;ll send you a secure password reset link via Resend.
                </p>
              </div>

              {resetEmailSent ? (
                <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-emerald-950">
                        Check your email inbox
                      </h3>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        We&apos;ve sent a secure password reset link to <strong>{email}</strong>. The link is valid for 60 minutes.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-emerald-200/70 text-xs">
                    <span className="text-emerald-700">Didn&apos;t receive the email?</span>
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={() => handlePasswordResetSubmit()}
                      className="font-bold text-emerald-900 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {isResetting ? 'Resending...' : 'Resend link'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-xs font-extrabold text-white bg-slate-900 hover:bg-black transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {isResetting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Send Secure Reset Link
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* SIGN IN / SIGN UP VIEW */
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {isSignUp ? 'Create an account' : 'Welcome back'}
                </h2>
                <p className="text-gray-500 text-sm">
                  {isSignUp
                    ? 'Sign up to manage web hosting, domains, and cloud servers.'
                    : 'Enter your credentials to access your dashboard.'}
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700">Password</label>
                    {isSignUp && (
                      <button
                        type="button"
                        onClick={handleGenerateStrongPassword}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Suggest strong password
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-describedby={isSignUp ? 'password-strength-meter' : undefined}
                      className="block w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                      placeholder={isSignUp ? 'Create a strong password (8+ chars)' : '••••••••'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* REAL-TIME PASSWORD STRENGTH METER (Registration View) */}
                  {isSignUp && (
                    <div
                      id="password-strength-meter"
                      aria-live="polite"
                      className="pt-2 space-y-2.5"
                    >
                      {/* 4-Segment Strength Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">Password strength</span>
                          <span className={`font-bold ${passwordStrength.textColorClass}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div
                          className="grid grid-cols-4 gap-1.5 h-1.5"
                          role="progressbar"
                          aria-valuenow={passwordStrength.score}
                          aria-valuemin={0}
                          aria-valuemax={4}
                        >
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

                      {/* Live Security Criteria Checklist */}
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
                  )}
                </div>

                {!isSignUp && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setResetEmailSent(false);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (isSignUp && password.length > 0 && passwordStrength.score < 2)}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-xs font-extrabold text-white bg-slate-900 hover:bg-black transition-all disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                      <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-gray-50 text-gray-500 font-medium">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2.5 py-3 px-4 border border-gray-200 rounded-xl shadow-xs text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all disabled:opacity-70 cursor-pointer"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </button>
                </div>
              </div>

              <div className="mt-6 text-center text-xs">
                <span className="text-gray-600">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </span>
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-2 font-bold text-blue-600 hover:text-blue-500 transition-colors cursor-pointer"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
