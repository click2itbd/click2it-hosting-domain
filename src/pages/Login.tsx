import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, Mail, Lock, User, ArrowRight, Server, Shield, Zap, Eye, EyeOff, ShoppingBag, ShieldCheck, Truck, Cpu, Settings, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useSiteContext } from '../hooks/useSiteContext';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  
  const navigate = useNavigate();
  const { settings } = useSettings();
  const siteContext = useSiteContext();

  
  const getContextContent = () => {
    switch (siteContext) {
      case 'ecommerce':
        return {
          title: 'Shop the Best Electronics',
          subtitle: 'Discover top brands, exclusive deals, and fast delivery for all your tech needs.',
          features: [
            { icon: <ShoppingBag className="text-orange-400" />, title: 'Vast Selection', desc: 'Find everything from gadgets to premium accessories.' },
            { icon: <ShieldCheck className="text-blue-400" />, title: '100% Authentic', desc: 'Genuine products with official brand warranties.' },
            { icon: <Truck className="text-emerald-400" />, title: 'Fast Delivery', desc: 'Secure and express shipping across the country.' }
          ]
        };
      case 'pc-build':
        return {
          title: 'Build Your Dream Setup',
          subtitle: 'Select from thousands of premium components and let our experts assemble it for you.',
          features: [
            { icon: <Cpu className="text-purple-400" />, title: 'Premium Components', desc: 'Latest processors, GPUs, and motherboards.' },
            { icon: <Settings className="text-slate-400" />, title: 'Expert Assembly', desc: 'Professional cable management and stress testing.' },
            { icon: <Star className="text-yellow-400" />, title: '3 Years Warranty', desc: 'Comprehensive warranty on all custom builds.' }
          ]
        };
      default:
        return {
          title: 'Empower Your Digital Presence',
          subtitle: 'Join thousands of businesses scaling on our ultra-fast, secure, and reliable cloud infrastructure.',
          features: [
            { icon: <Zap className="text-yellow-400" />, title: 'Lightning Fast', desc: 'NVMe SSDs and global CDN for unmatched speed.' },
            { icon: <Shield className="text-blue-400" />, title: 'Enterprise Security', desc: 'Free SSL, DDoS protection, and automated backups.' },
            { icon: <Server className="text-red-400" />, title: '99.9% Uptime', desc: 'Reliable infrastructure guaranteed to keep you online.' }
          ]
        };
    }
  };

  const contextData = getContextContent();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      toast.success('Successfully logged in with Google!');
      navigate('/');
    } catch (error: any) {
      console.error('Google login error:', error);
      if (error?.code === 'auth/unauthorized-domain') {
        const hostname = window.location.hostname;
        toast.error(`Domain "${hostname}" is not authorized in Firebase. Please add "${hostname}" in Firebase Console -> Auth -> Settings -> Authorized Domains.`, { duration: 8000 });
      } else if (error?.code === 'auth/popup-blocked') {
        toast.error('Pop-up blocked by browser. Please enable pop-ups for this site or use email/password.');
      } else if (error?.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in pop-up was closed before completion.');
      } else {
        toast.error(error?.message || 'Google sign in failed. Please try again or check Firebase configuration.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
        toast.success('Account created successfully!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Successfully logged in!');
      }
      navigate('/');
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error('Please enter your email address first.');
      return;
    }
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error(error.message || 'Failed to send reset email.');
    } finally {
      setIsResetting(false);
    }
  };

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
        
        <div className="w-full max-w-md mt-16 md:mt-0">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-gray-500">
              {isSignUp 
                ? (siteContext === 'ecommerce' ? 'Sign up to start shopping for the best deals.' : siteContext === 'pc-build' ? 'Sign up to save and order your custom builds.' : 'Sign up to start deploying in seconds.') 
                : 'Enter your details to access your dashboard.'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-5">
            
            {isSignUp && (
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] transition-all bg-gray-50/50"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] transition-all bg-gray-50/50"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] transition-all bg-gray-50/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isResetting}
                  className="text-sm font-bold text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {isResetting ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#081621] hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all disabled:opacity-70 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-500 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all disabled:opacity-70"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
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
          
          <div className="mt-8 text-center text-sm">
            <span className="text-gray-600">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 font-bold text-blue-600 hover:text-blue-500 transition-colors"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
          
        </div>
      </div>
      
    </div>
  );
};
