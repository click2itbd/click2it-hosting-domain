import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Shield, Loader2, XCircle, AlertTriangle, 
  CreditCard, Lock, ArrowRight, Phone, RefreshCw,
  Building2, Copy, Check, ChevronDown, CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useCart } from '../context/CartContext';

type Step = 'method_info' | 'otp' | 'pin' | 'bank_confirm' | 'bank_details' | 'processing';

export default function PaymentSimulation() {
  const [searchParams] = useSearchParams();
  const method = searchParams.get('method') || 'bkash';
  const orderId = searchParams.get('orderId') || '';
  const amount = parseFloat(searchParams.get('amount') || '0');
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [step, setStep] = useState<Step>('method_info');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  // bKash
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [pin, setPin] = useState(['', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Card
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [showCvv, setShowCvv] = useState(false);

  // Bank
  const [txRef, setTxRef] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderBank, setSenderBank] = useState('');

  useEffect(() => {
    if (!orderId || !amount) setError('Invalid payment session.');
  }, [orderId, amount]);

  useEffect(() => {
    if (step === 'otp' && otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(v => v - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [step, otpTimer]);

  const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  };

  const handleDigitChange = (i: number, val: string, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const d = val.replace(/\D/g, '');
    setter(prev => { const n = [...prev]; n[i] = d.slice(-1); return n; });
    if (d && i < refs.current.length - 1) refs.current[i + 1]?.focus();
  };

  const handleDigitKeyDown = (e: React.KeyboardEvent, i: number, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, arr: string[]) => {
    if (e.key === 'Backspace' && !arr[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const simulateFinish = (status: 'success' | 'failed' | 'cancelled') => {
    setStep('processing');
    setTimeout(() => {
      navigate(`/payment/callback?status=${status}&orderId=${orderId}&method=${method}`);
    }, 2000);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Invalid Session</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button onClick={() => navigate(-1)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium">Go Back</button>
        </div>
      </div>
    );
  }

  // ─── Processing ───────────────────────────────────────────────────────
  if (step === 'processing') {
    const bg = method === 'bkash' 
      ? 'linear-gradient(135deg,#e2136e,#c0105a)' 
      : method === 'nagad'
        ? 'linear-gradient(135deg,#ed1c24,#f37021)'
        : method === 'card' 
          ? 'linear-gradient(135deg,#1a56db,#1342a8)'
          : 'linear-gradient(135deg,#111827,#374151)';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: bg }}>
        <div className="text-center text-white">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-6 opacity-90" />
          <h2 className="text-2xl font-bold mb-2">Processing Payment</h2>
          <p className="opacity-75 text-sm">Please wait, do not close this window...</p>
          <p className="mt-4 font-mono bg-white/10 px-5 py-2.5 rounded-xl">{formatCurrency(amount)}</p>
        </div>
      </div>
    );
  }

  // ─── BKASH ───────────────────────────────────────────────────────────
  if (method === 'bkash') {
    const bg = { background: 'linear-gradient(135deg,#e2136e 0%,#c0105a 100%)' };
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        {/* Header */}
        <div style={bg} className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow">
              <span className="text-[#e2136e] font-black text-lg">b</span>
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none">bKash</div>
              <div className="text-pink-200 text-[10px] tracking-wide">Payment Gateway</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-pink-100 text-xs bg-white/10 px-3 py-1 rounded-full">
            <Lock size={11} /> SSL Secured
          </div>
        </div>

        {/* Amount */}
        <div className="bg-white shadow-sm px-5 py-3 flex items-center justify-between">
          <span className="text-gray-500 text-sm">Payable Amount</span>
          <span className="font-black text-[#e2136e] text-xl">{formatCurrency(amount)}</span>
        </div>

        <div className="flex-grow flex items-start justify-center p-4 pt-6">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">

            {/* Step 1: Phone */}
            {step === 'method_info' && (
              <div className="p-7">
                <div className="text-center mb-7">
                  <div className="w-14 h-14 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Phone className="w-7 h-7 text-[#e2136e]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Enter bKash Number</h2>
                  <p className="text-gray-400 text-sm mt-1">We'll send an OTP to verify your number</p>
                </div>

                <label className="text-sm font-semibold text-gray-700 block mb-2">bKash Account Number</label>
                <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-[#e2136e] transition-colors mb-5">
                  <div className="bg-gray-50 px-4 py-4 text-sm text-gray-600 font-semibold border-r border-gray-200">+880</div>
                  <input
                    type="tel" maxLength={10} value={phone}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.startsWith('880')) val = val.slice(3);
                      else if (val.startsWith('88')) val = val.slice(2);
                      val = val.replace(/^0+/, '');
                      setPhone(val.slice(0, 10));
                    }}
                    placeholder="1XXXXXXXXX"
                    className="flex-1 px-4 py-4 text-gray-900 outline-none text-sm font-medium"
                  />
                </div>

                <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 mb-6 text-xs text-pink-700 flex gap-2">
                  <span className="text-base">ℹ️</span>
                  <span>Make sure your bKash account has sufficient balance. Service charges may apply.</span>
                </div>

                <button
                  onClick={() => {
                    if (/^1[3-9]\d{8}$/.test(phone)) {
                      setStep('otp');
                      setOtpTimer(60);
                    } else {
                      alert('Please enter a valid 10-digit number starting with 1 (e.g. 17XXXXXXXX)');
                    }
                  }}
                  style={bg}
                  className="w-full py-4 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shadow-lg shadow-pink-200"
                >
                  Send OTP <ArrowRight size={18} />
                </button>

                <button onClick={() => navigate(-1)} className="w-full py-3 mt-2 text-gray-400 text-sm text-center hover:text-gray-600">Cancel</button>
              </div>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
              <div className="p-7">
                <div className="text-center mb-7">
                  <div className="w-14 h-14 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">📱</div>
                  <h2 className="text-xl font-bold text-gray-900">Verify OTP</h2>
                  <p className="text-gray-400 text-sm mt-1">6-digit code sent to <span className="font-bold text-gray-700">+880 {phone}</span></p>
                </div>

                <div className="flex gap-2 justify-center mb-4">
                  {otp.map((d, i) => (
                    <input key={i} ref={el => { otpRefs.current[i] = el; }}
                      type="tel" maxLength={1} value={d}
                      onChange={e => handleDigitChange(i, e.target.value, otpRefs, setOtp)}
                      onKeyDown={e => handleDigitKeyDown(e, i, otpRefs, otp)}
                      className="w-12 h-13 py-3 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-[#e2136e] focus:outline-none transition-colors"
                    />
                  ))}
                </div>

                <div className="text-center mb-6">
                  {otpTimer > 0
                    ? <span className="text-sm text-gray-500">Resend in <span className="font-bold text-[#e2136e]">{otpTimer}s</span></span>
                    : <button onClick={() => setOtpTimer(60)} className="text-[#e2136e] text-sm font-semibold flex items-center gap-1 mx-auto"><RefreshCw size={13} /> Resend OTP</button>
                  }
                </div>

                <button
                  onClick={() => otp.join('').length === 6 ? setStep('pin') : alert('Enter all 6 digits')}
                  style={bg} className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                >Verify <ArrowRight size={18} /></button>
              </div>
            )}

            {/* Step 3: PIN */}
            {step === 'pin' && (
              <div className="p-7">
                <div className="text-center mb-7">
                  <div className="w-14 h-14 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-7 h-7 text-[#e2136e]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Enter bKash PIN</h2>
                  <p className="text-gray-400 text-sm mt-1">Your 5-digit secret PIN</p>
                </div>

                <div className="flex gap-3 justify-center mb-8">
                  {pin.map((d, i) => (
                    <input key={i} ref={el => { pinRefs.current[i] = el; }}
                      type="password" maxLength={1} value={d}
                      onChange={e => handleDigitChange(i, e.target.value, pinRefs, setPin)}
                      onKeyDown={e => handleDigitKeyDown(e, i, pinRefs, pin)}
                      className="w-13 h-14 py-4 w-12 text-center text-2xl border-2 border-gray-200 rounded-xl focus:border-[#e2136e] focus:outline-none transition-colors"
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400 justify-center mb-6">
                  <Lock size={11} className="text-green-500" /> Never share your PIN with anyone
                </div>

                <button
                  onClick={() => pin.join('').length === 5 ? simulateFinish('success') : alert('Enter your 5-digit PIN')}
                  style={bg} className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 mb-3"
                >
                  Confirm {formatCurrency(amount)}
                </button>
                <button onClick={() => simulateFinish('cancelled')} className="w-full py-2 text-gray-400 text-sm text-center">Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── NAGAD ───────────────────────────────────────────────────────────
  if (method === 'nagad') {
    const bg = { background: 'linear-gradient(135deg,#ed1c24 0%,#f37021 100%)' };
    return (
      <div className="min-h-screen bg-[#fcf5f3] flex flex-col">
        {/* Header */}
        <div style={bg} className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow">
              <span className="text-[#ed1c24] font-black text-lg">ন</span>
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-none">Nagad</div>
              <div className="text-orange-200 text-[10px] tracking-wide">Payment Gateway</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-orange-100 text-xs bg-white/20 px-3 py-1 rounded-full">
            <Lock size={11} /> SSL Secured
          </div>
        </div>

        {/* Amount */}
        <div className="bg-white shadow-sm px-5 py-3 flex items-center justify-between">
          <span className="text-gray-500 text-sm">Payable Amount</span>
          <span className="font-black text-[#ed1c24] text-xl">{formatCurrency(amount)}</span>
        </div>

        <div className="flex-grow flex items-start justify-center p-4 pt-6">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">

            {/* Step 1: Phone */}
            {step === 'method_info' && (
              <div className="p-7">
                <div className="text-center mb-7">
                  <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Phone className="w-7 h-7 text-[#ed1c24]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Enter Nagad Number</h2>
                  <p className="text-gray-400 text-sm mt-1">We'll send an OTP to verify your number</p>
                </div>

                <label className="text-sm font-semibold text-gray-700 block mb-2">Nagad Account Number</label>
                <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-[#ed1c24] transition-colors mb-5">
                  <div className="bg-gray-50 px-4 py-4 text-sm text-gray-600 font-semibold border-r border-gray-200">+880</div>
                  <input
                    type="tel" maxLength={10} value={phone}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.startsWith('880')) val = val.slice(3);
                      else if (val.startsWith('88')) val = val.slice(2);
                      val = val.replace(/^0+/, '');
                      setPhone(val.slice(0, 10));
                    }}
                    placeholder="1XXXXXXXXX"
                    className="flex-1 px-4 py-4 text-gray-900 outline-none text-sm font-medium"
                  />
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-6 text-xs text-orange-800 flex gap-2">
                  <span className="text-base">ℹ️</span>
                  <span>Ensure your Nagad account is active and has sufficient balance.</span>
                </div>

                <button
                  onClick={() => {
                    if (/^1[3-9]\d{8}$/.test(phone)) {
                      setStep('otp');
                      setOtpTimer(60);
                    } else {
                      alert('Enter a valid 10-digit number starting with 1 (e.g. 17XXXXXXXX)');
                    }
                  }}
                  style={bg}
                  className="w-full py-4 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shadow-lg shadow-orange-200"
                >
                  Proceed <ArrowRight size={18} />
                </button>

                <button onClick={() => navigate(-1)} className="w-full py-3 mt-2 text-gray-400 text-sm text-center hover:text-gray-600">Cancel</button>
              </div>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
              <div className="p-7">
                <div className="text-center mb-7">
                  <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">📱</div>
                  <h2 className="text-xl font-bold text-gray-900">Verify OTP</h2>
                  <p className="text-gray-400 text-sm mt-1">6-digit code sent to <span className="font-bold text-gray-700">+880 {phone}</span></p>
                </div>

                <div className="flex gap-2 justify-center mb-4">
                  {otp.map((d, i) => (
                    <input key={i} ref={el => { otpRefs.current[i] = el; }}
                      type="tel" maxLength={1} value={d}
                      onChange={e => handleDigitChange(i, e.target.value, otpRefs, setOtp)}
                      onKeyDown={e => handleDigitKeyDown(e, i, otpRefs, otp)}
                      className="w-12 h-13 py-3 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-[#ed1c24] focus:outline-none transition-colors"
                    />
                  ))}
                </div>

                <div className="text-center mb-6">
                  {otpTimer > 0
                    ? <span className="text-sm text-gray-500">Resend in <span className="font-bold text-[#ed1c24]">{otpTimer}s</span></span>
                    : <button onClick={() => setOtpTimer(60)} className="text-[#ed1c24] text-sm font-semibold flex items-center gap-1 mx-auto"><RefreshCw size={13} /> Resend OTP</button>
                  }
                </div>

                <button
                  onClick={() => otp.join('').length === 6 ? setStep('pin') : alert('Enter all 6 digits')}
                  style={bg} className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                >Verify <ArrowRight size={18} /></button>
              </div>
            )}

            {/* Step 3: PIN */}
            {step === 'pin' && (
              <div className="p-7">
                <div className="text-center mb-7">
                  <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-7 h-7 text-[#ed1c24]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Enter Nagad PIN</h2>
                  <p className="text-gray-400 text-sm mt-1">Your 4-digit secret PIN</p>
                </div>

                <div className="flex gap-3 justify-center mb-8">
                  {pin.slice(0,4).map((d, i) => (
                    <input key={i} ref={el => { pinRefs.current[i] = el; }}
                      type="password" maxLength={1} value={d}
                      onChange={e => {
                         const val = e.target.value.replace(/\D/g, '').slice(-1);
                         setPin(prev => { const n = [...prev]; n[i] = val; return n; });
                         if (val && i < 3) pinRefs.current[i + 1]?.focus();
                      }}
                      onKeyDown={e => handleDigitKeyDown(e, i, pinRefs, pin)}
                      className="w-13 h-14 py-4 w-12 text-center text-2xl border-2 border-gray-200 rounded-xl focus:border-[#ed1c24] focus:outline-none transition-colors"
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400 justify-center mb-6">
                  <Lock size={11} className="text-green-500" /> Never share your PIN with anyone
                </div>

                <button
                  onClick={() => pin.slice(0,4).join('').length === 4 ? simulateFinish('success') : alert('Enter your 4-digit PIN')}
                  style={bg} className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 mb-3"
                >
                  Confirm {formatCurrency(amount)}
                </button>
                <button onClick={() => simulateFinish('cancelled')} className="w-full py-2 text-gray-400 text-sm text-center">Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── CARD ────────────────────────────────────────────────────────────
  if (method === 'card') {
    const bg = { background: 'linear-gradient(135deg,#1a56db 0%,#1342a8 100%)' };
    const isValid = cardData.number.replace(/\s/g, '').length === 16 && cardData.name && cardData.expiry.length === 5 && cardData.cvv.length === 3;

    return (
      <div className="min-h-screen bg-[#f0f4ff] flex flex-col">
        <div style={bg} className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-white w-8 h-8" />
            <div>
              <div className="text-white font-bold text-lg leading-none">SSLCommerz</div>
              <div className="text-blue-200 text-[10px] tracking-wide">Secure Payment Gateway</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 text-white text-xs px-3 py-1 rounded-full">
            <Lock size={11} /> 256-bit SSL
          </div>
        </div>

        <div className="bg-white shadow-sm px-5 py-3 flex items-center justify-between">
          <span className="text-gray-500 text-sm">Order Total</span>
          <span className="font-black text-blue-700 text-xl">{formatCurrency(amount)}</span>
        </div>

        <div className="flex-grow flex items-start justify-center p-4 pt-6">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-7">
              {/* Card Preview */}
              <div style={bg} className="rounded-2xl p-5 mb-7 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-16 translate-x-16" />
                <div className="flex justify-between items-start mb-8">
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Credit / Debit Card</div>
                  <CreditCard className="w-8 h-8 opacity-70" />
                </div>
                <div className="font-mono text-xl tracking-widest mb-5 text-white/90">
                  {cardData.number || '•••• •••• •••• ••••'}
                </div>
                <div className="flex justify-between text-sm">
                  <div><div className="text-[10px] opacity-50 uppercase mb-0.5">Card Holder</div><div className="font-semibold">{cardData.name || 'YOUR NAME'}</div></div>
                  <div className="text-right"><div className="text-[10px] opacity-50 uppercase mb-0.5">Expires</div><div className="font-semibold">{cardData.expiry || 'MM/YY'}</div></div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">Card Number</label>
                  <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-blue-500 transition-colors overflow-hidden">
                    <CreditCard size={16} className="text-gray-400 ml-3 flex-shrink-0" />
                    <input type="tel" placeholder="1234 5678 9012 3456" value={cardData.number}
                      onChange={e => setCardData(d => ({ ...d, number: formatCard(e.target.value) }))}
                      className="flex-1 px-3 py-3.5 outline-none text-sm font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">Cardholder Name</label>
                  <input type="text" placeholder="As printed on card" value={cardData.name}
                    onChange={e => setCardData(d => ({ ...d, name: e.target.value.toUpperCase() }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:border-blue-500 focus:outline-none transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1.5">Expiry</label>
                    <input type="tel" placeholder="MM/YY" value={cardData.expiry}
                      onChange={e => setCardData(d => ({ ...d, expiry: formatExpiry(e.target.value) }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:border-blue-500 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1.5">CVV</label>
                    <div className="relative">
                      <input type={showCvv ? 'text' : 'password'} placeholder="•••" maxLength={3} value={cardData.cvv}
                        onChange={e => setCardData(d => ({ ...d, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:border-blue-500 focus:outline-none transition-colors pr-10" />
                      <button type="button" onClick={() => setShowCvv(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Shield size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 mt-4 mb-6">
                <Lock size={12} className="text-green-500" /> Your card data is encrypted with 256-bit SSL
              </div>

              <button
                onClick={() => isValid ? simulateFinish('success') : alert('Please fill in all card details correctly')}
                style={bg}
                className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 hover:opacity-95 mb-3 shadow-lg shadow-blue-200"
              >
                Pay {formatCurrency(amount)} <ArrowRight size={18} />
              </button>
              <button onClick={() => simulateFinish('cancelled')} className="w-full py-2 text-gray-400 text-sm text-center">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── BANK TRANSFER ───────────────────────────────────────────────────
  const bankDetails = [
    { label: 'Bank Name', value: 'Dutch-Bangla Bank Ltd.' },
    { label: 'Account Name', value: 'Click2IT Web Solutions' },
    { label: 'Account Number', value: '2081060017823' },
    { label: 'Branch', value: 'Mirpur, Dhaka' },
    { label: 'Routing Number', value: '090261200' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gray-900 px-5 py-4 flex items-center gap-3">
        <Building2 className="text-white w-7 h-7" />
        <div>
          <div className="text-white font-bold text-lg leading-none">Bank Transfer</div>
          <div className="text-gray-400 text-xs">Manual payment — 1-3 business days</div>
        </div>
      </div>

      <div className="flex-grow flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-md space-y-4">

          {/* Step 1: Confirm intent */}
          {step === 'method_info' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-gray-700" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Bank Transfer</h2>
                <p className="text-gray-500 text-sm mb-6">You are about to pay via bank transfer</p>

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="text-sm text-gray-500 mb-1">Amount to Transfer</div>
                  <div className="text-3xl font-black text-gray-900">{formatCurrency(amount)}</div>
                  <div className="text-xs text-gray-400 mt-1">Transfer exact amount to avoid delays</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-xs text-amber-800 text-left flex gap-2">
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Your service will be activated within 1-3 business days after payment is verified by our team.</span>
                </div>

                <button
                  onClick={() => setStep('bank_details')}
                  className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors mb-3"
                >
                  View Bank Details <ChevronDown size={18} />
                </button>
                <button onClick={() => navigate(-1)} className="w-full py-2 text-gray-400 text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Step 2: Show bank details + confirm */}
          {step === 'bank_details' && (
            <>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-900 px-5 py-3 flex items-center justify-between">
                  <span className="text-white text-sm font-semibold">Transfer to this account</span>
                  <span className="text-gray-400 text-xs">Order #{orderId.slice(-10)}</span>
                </div>
                <div className="p-5 space-y-2">
                  {bankDetails.map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-[11px] text-gray-400 mb-0.5">{label}</div>
                        <div className="font-bold text-gray-900">{value}</div>
                      </div>
                      <button onClick={() => copyToClipboard(value, label)} className="p-2 text-gray-300 hover:text-blue-500 transition-colors">
                        {copied === label ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 px-5 py-3 flex items-center justify-between border-t border-blue-100">
                  <div>
                    <div className="text-[11px] text-blue-500 mb-0.5">Reference / Memo (required)</div>
                    <div className="font-bold text-blue-900 text-sm">{orderId}</div>
                  </div>
                  <button onClick={() => copyToClipboard(orderId, 'orderId')} className="p-2 text-blue-300 hover:text-blue-600">
                    {copied === 'orderId' ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>

              {/* Sender info */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500" /> Confirm Your Transfer</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Your Name (Sender)</label>
                    <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Your Bank Name</label>
                    <input type="text" value={senderBank} onChange={e => setSenderBank(e.target.value)}
                      placeholder="e.g. Brac Bank, Dutch-Bangla, etc."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Transaction Reference / ID (Optional)</label>
                    <input type="text" value={txRef} onChange={e => setTxRef(e.target.value)}
                      placeholder="Enter transaction ID from your bank"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none transition-colors" />
                  </div>
                </div>

                <button
                  onClick={() => senderName && senderBank ? simulateFinish('success') : alert('Please fill in your name and bank name')}
                  className="w-full mt-5 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  I've Completed the Transfer <ArrowRight size={18} />
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">Our team will verify and activate your service within 1-3 business days.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
