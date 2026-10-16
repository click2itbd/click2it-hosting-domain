import React, { useState } from 'react';
import { X, Send, Phone, User, FileText, Zap, Gamepad2, Video, Briefcase, Code, Wallet } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface CustomBuildRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomBuildRequestModal: React.FC<CustomBuildRequestModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ name: '', phone: '', details: '', budget: '', useCase: 'Gaming' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const useCases = [
    { id: 'Gaming', icon: Gamepad2 },
    { id: 'Editing', icon: Video },
    { id: 'Coding', icon: Code },
    { id: 'Office', icon: Briefcase }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.details) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Append budget and use case to details so admin can see it easily without schema changes
      const finalDetails = `Use Case: ${formData.useCase}\nEstimated Budget: ${formData.budget || 'Not specified'}\n\nRequirements:\n${formData.details}`;

      await addDoc(collection(db, 'buildRequests'), {
        name: formData.name,
        phone: formData.phone,
        details: finalDetails,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Your request has been submitted successfully! We will contact you soon.');
      setFormData({ name: '', phone: '', details: '', budget: '', useCase: 'Gaming' });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50/80 backdrop-blur-md">
      <div className="bg-slate-100 border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="relative p-8 pb-6 border-b border-slate-200 overflow-hidden">
          
          
          
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center border border-[#2A3441]">
                <Zap className="text-violet-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Request Custom Build</h3>
                <p className="text-slate-500 text-sm mt-1 font-medium">Let our experts design your perfect PC</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Name *</label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input 
                  type="text" required
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number *</label>
              <div className="relative group">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input 
                  type="tel" required
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Use Case */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Use Case</label>
              <div className="grid grid-cols-2 gap-2">
                {useCases.map(uc => {
                  const Icon = uc.icon;
                  const isActive = formData.useCase === uc.id;
                  return (
                    <button
                      type="button"
                      key={uc.id}
                      onClick={() => setFormData({...formData, useCase: uc.id})}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-sm font-bold ${
                        isActive 
                        ? 'bg-violet-500/10 border-violet-500 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-700 hover:text-slate-600'
                      }`}
                    >
                      <Icon size={16} /> {uc.id}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Budget (Optional)</label>
              <div className="relative group h-[46px]">
                <Wallet size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input 
                  type="text"
                  value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})}
                  className="w-full h-full pl-11 pr-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                  placeholder="e.g. 80,000 BDT"
                />
              </div>
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Specific Requirements *</label>
            <div className="relative group">
              <FileText size={18} className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
              <textarea 
                required rows={4}
                value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none resize-none transition-all placeholder:text-slate-600 font-medium custom-scrollbar"
                placeholder="List any specific parts or preferences you have (e.g. Core i5 12th Gen, RGB Casing, Liquid Cooler...)"
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" disabled={isSubmitting}
              className="w-full relative group overflow-hidden bg-violet-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 hover:bg-violet-500 active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              {isSubmitting ? (
                'Submitting Request...'
              ) : (
                <>
                  <Send size={18} className="relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
                  <span className="relative z-10">Send Build Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
