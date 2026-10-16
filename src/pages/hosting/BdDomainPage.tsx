import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { SEO } from '../../components/SEO';
import { Shield, FileText, CheckCircle, ArrowRight, PhoneCall, HelpCircle, User, Mail, Phone, Globe, X } from 'lucide-react';
import { getDomainPricing, DomainPricing } from '../../services/hostingApi';
import { sendEmail } from '../../services/emailService';
import { collection, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebase';
import toast from 'react-hot-toast';

export default function BdDomainPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pricing, setPricing] = useState<DomainPricing[]>([]);
  
  // Application Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getDomainPricing().then(setPricing);
  }, []);

  const handleApplyClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter a domain name');
      return;
    }
    setIsModalOpen(true);
  };

  const submitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !applicantEmail || !applicantPhone) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      let finalDomain = searchQuery.trim().toLowerCase();
      if (!finalDomain.includes('.')) {
        finalDomain += '.com.bd';
      }

      const storage = getStorage();
      let nidUrl = '';
      let tradeLicenseUrl = '';

      if (nidFile) {
        const nidRef = ref(storage, `bd_domain_docs/${finalDomain}/nid_${Date.now()}_${nidFile.name}`);
        await uploadBytes(nidRef, nidFile);
        nidUrl = await getDownloadURL(nidRef);
      }

      if (tradeLicenseFile) {
        const tlRef = ref(storage, `bd_domain_docs/${finalDomain}/trade_license_${Date.now()}_${tradeLicenseFile.name}`);
        await uploadBytes(tlRef, tradeLicenseFile);
        tradeLicenseUrl = await getDownloadURL(tlRef);
      }

      const applicationData: any = {
        domain: finalDomain,
        name: applicantName,
        email: applicantEmail,
        phone: applicantPhone,
        status: 'pending_check',
        createdAt: new Date().toISOString()
      };

      if (nidUrl) applicationData.nidUrl = nidUrl;
      if (tradeLicenseUrl) applicationData.tradeLicenseUrl = tradeLicenseUrl;

      await addDoc(collection(db, 'bd_domain_applications'), applicationData);
      
      try {
        await sendEmail({
          to: 'support@click2it.com.bd',
          subject: `New .BD Domain Application: ${finalDomain}`,
          html: `<h3>New .BD Domain Application</h3>
                 <p><strong>Domain:</strong> ${finalDomain}</p>
                 <p><strong>Applicant:</strong> ${applicantName}</p>
                 <p><strong>Email:</strong> ${applicantEmail}</p>
                 <p><strong>Phone:</strong> ${applicantPhone}</p>
                 <p>Please log in to the admin panel to review the documents and check availability with BTCL.</p>`
        });
      } catch (err) {
        console.error('Failed to send admin notification:', err);
      }
      
      toast.success('Application received! Our team will check availability and contact you shortly.', { duration: 5000 });
      setIsModalOpen(false);
      setSearchQuery('');
      setApplicantName('');
      setApplicantEmail('');
      setApplicantPhone('');
      setNidFile(null);
      setTradeLicenseFile(null);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBdPrice = () => {
    const p = pricing.find(p => p.tld === '.com.bd');
    return p ? p.registerPrice : 1840;
  };

  const popularBdTlds = ['.com.bd', '.net.bd', '.org.bd', '.edu.bd', '.gov.bd'];

  return (
    <Layout fullWidth={true}>
      <SEO 
        title=".BD Domain Registration & BTCL Approval | Click2IT"
        description="Register official .bd, .com.bd, .net.bd, .edu.bd, .org.bd domains easily. Fast BTCL verification, manual paperwork processing, and dedicated support in Bangladesh."
        keywords="bd domain registration, com bd domain, btcl domain registration, buy bd domain bangladesh, .bd domain price, official bd domain"
        canonical="https://click2itbd.com/domain/bd"
      />
      
      {/* Hero Section with Bangladesh Background */}
      <div className="relative pt-24 pb-20 text-white text-center px-4 w-full overflow-hidden min-h-[520px] flex items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img src="/assets/bd_hero_bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a192f]/80 via-[#0a192f]/60 to-[#0a192f]/90"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight drop-shadow-lg">Apply For Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">.BD</span> Domain</h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto mb-10 drop-shadow-md">
            Secure your local identity in Bangladesh. Submit your desired name, and our experts will manually verify availability and handle all BTCL paperwork.
          </p>
          
          <form onSubmit={handleApplyClick} className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center bg-black/30 backdrop-blur-md p-2 rounded-2xl md:rounded-full border border-white/15 mb-6 shadow-2xl focus-within:bg-black/40 transition-all">
            <div className="pl-4 text-cyan-400 hidden sm:block">
              <Globe size={24} />
            </div>
            <input 
              type="text" 
              placeholder="Enter your brand name (e.g. yourcompany.com.bd)" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-4 w-full sm:w-auto text-white placeholder-white/50 focus:outline-none text-lg bg-transparent font-medium tracking-wide"
            />
            <button type="submit" className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold py-4 px-8 rounded-xl md:rounded-full transition-all mt-2 sm:mt-0 flex justify-center items-center gap-2 shadow-lg shadow-green-500/25">
              Apply Now <ArrowRight size={18} />
            </button>
          </form>
          
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mt-6">
            {popularBdTlds.map(tld => (
              <button 
                key={tld} 
                onClick={() => setSearchQuery(searchQuery.includes('.') ? searchQuery.substring(0, searchQuery.indexOf('.')) + tld : (searchQuery || 'yourbrand') + tld)}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white/90 text-sm py-1.5 px-4 rounded-full transition-all hover:scale-105"
              >
                {tld}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* How it Works - BD Theme */}
      <div className="bg-gradient-to-b from-[#006a4e]/5 to-white py-20 px-4 w-full">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold uppercase tracking-wider mb-4">How It Works</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">4 Simple Steps to Your .BD Domain</h2>
          </div>
          
          <div className="grid md:grid-cols-4 gap-0 relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-[52px] left-[12%] right-[12%] h-[3px] bg-gradient-to-r from-green-300 via-emerald-400 to-green-600 rounded-full"></div>
            
            {[
              { step: '01', icon: <Globe size={28} />, title: 'Apply Online', desc: 'Enter your desired domain name and submit the application form with your details.', color: 'from-green-500 to-emerald-600' },
              { step: '02', icon: <Shield size={28} />, title: 'We Check BTCL', desc: 'Our team manually verifies domain availability directly with the BTCL registry.', color: 'from-emerald-500 to-teal-600' },
              { step: '03', icon: <FileText size={28} />, title: 'Submit Documents', desc: 'If available, we contact you to collect NID, Trade License, and process payment.', color: 'from-teal-500 to-green-600' },
              { step: '04', icon: <CheckCircle size={28} />, title: 'Domain Active!', desc: 'BTCL reviews and activates your domain. Goes live within 24-48 working hours.', color: 'from-green-600 to-[#006a4e]' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center px-4 group">
                {/* Step Circle */}
                <div className={`relative z-10 w-[104px] h-[104px] rounded-2xl bg-gradient-to-br ${item.color} text-white flex flex-col items-center justify-center shadow-xl shadow-green-500/20 mb-6 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300`}>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Step</span>
                  <span className="text-3xl font-black leading-none">{item.step}</span>
                </div>
                <h4 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[220px]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Requirements Section - BD Theme */}
      <div className="py-20 px-4 w-full bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider mb-4">Important</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Required Legal Documents</h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto">BTCL strictly enforces eligibility to protect Bangladeshi brands. Choose your domain category below to see what documents you'll need.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Business */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
              <div className="p-7">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-gray-900">.com.bd / .net.bd</h4>
                      <p className="text-xs text-gray-400">.co.bd also included</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Business</span>
                </div>
                
                <p className="text-sm text-gray-500 mb-5 leading-relaxed">For registered companies, sole proprietorships, and businesses operating in Bangladesh.</p>
                
                <ul className="space-y-3.5">
                  <li className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle size={14} className="text-green-600" /></div>
                    <div><p className="text-sm font-semibold text-gray-800">Valid Trade License</p><p className="text-xs text-gray-400 mt-0.5">Current year's renewed copy (scanned/photo)</p></div>
                  </li>
                  <li className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle size={14} className="text-green-600" /></div>
                    <div><p className="text-sm font-semibold text-gray-800">National ID (NID)</p><p className="text-xs text-gray-400 mt-0.5">Both sides of the registrant's NID card</p></div>
                  </li>
                  <li className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle size={14} className="text-green-600" /></div>
                    <div><p className="text-sm font-semibold text-gray-800">Authorization Letter</p><p className="text-xs text-gray-400 mt-0.5">On company letterhead/pad (if applicable)</p></div>
                  </li>
                </ul>
                
                <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-400">Min. registration: <span className="font-bold text-gray-600">2 Years</span></div>
                  <div className="text-xs text-gray-400">Processing: <span className="font-bold text-gray-600">24-48 hrs</span></div>
                </div>
              </div>
            </div>

            {/* Education */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="h-2 bg-gradient-to-r from-red-500 to-red-600"></div>
              <div className="p-7">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-gray-900">.edu.bd / .ac.bd</h4>
                      <p className="text-xs text-gray-400">Educational institutions only</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Education</span>
                </div>
                
                <p className="text-sm text-gray-500 mb-5 leading-relaxed">For universities, colleges, schools, and other UGC/Ministry recognized educational institutions.</p>
                
                <ul className="space-y-3.5">
                  <li className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle size={14} className="text-red-600" /></div>
                    <div><p className="text-sm font-semibold text-gray-800">UGC / Ministry Approval</p><p className="text-xs text-gray-400 mt-0.5">Official approval from UGC or Ministry of Education</p></div>
                  </li>
                  <li className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle size={14} className="text-red-600" /></div>
                    <div><p className="text-sm font-semibold text-gray-800">Official Application Letter</p><p className="text-xs text-gray-400 mt-0.5">On institution letterhead, signed by Head/Principal</p></div>
                  </li>
                  <li className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle size={14} className="text-red-600" /></div>
                    <div><p className="text-sm font-semibold text-gray-800">Applicant's NID</p><p className="text-xs text-gray-400 mt-0.5">NID of the authorized applicant from the institution</p></div>
                  </li>
                </ul>
                
                <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-400">Min. registration: <span className="font-bold text-gray-600">2 Years</span></div>
                  <div className="text-xs text-gray-400">Processing: <span className="font-bold text-gray-600">3-5 days</span></div>
                </div>
              </div>
            </div>

            {/* Org / Gov */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="h-2 bg-gradient-to-r from-yellow-400 to-yellow-500"></div>
              <div className="p-7">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-gray-900">.org.bd / .gov.bd</h4>
                      <p className="text-xs text-gray-400">NGOs & Government bodies</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Org / Gov</span>
                </div>
                
                <p className="text-sm text-gray-500 mb-5 leading-relaxed">For registered NGOs, non-profit organizations, and government ministries/departments.</p>
                
                <ul className="space-y-3.5">
                  <li className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle size={14} className="text-yellow-600" /></div>
                    <div><p className="text-sm font-semibold text-gray-800">Registration Certificate</p><p className="text-xs text-gray-400 mt-0.5">NGO Bureau or Social Welfare registration document</p></div>
                  </li>
                  <li className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle size={14} className="text-yellow-600" /></div>
                    <div><p className="text-sm font-semibold text-gray-800">Authorized Person's NID</p><p className="text-xs text-gray-400 mt-0.5">NID of the person authorized to register the domain</p></div>
                  </li>
                  <li className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle size={14} className="text-yellow-600" /></div>
                    <div><p className="text-sm font-semibold text-gray-800">Ministry Approval (.gov.bd)</p><p className="text-xs text-gray-400 mt-0.5">Mandatory for .gov.bd — direct Ministry approval required</p></div>
                  </li>
                </ul>
                
                <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-400">Min. registration: <span className="font-bold text-gray-600">2 Years</span></div>
                  <div className="text-xs text-gray-400">Processing: <span className="font-bold text-gray-600">5-7 days</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Note Banner */}
          <div className="mt-10 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <HelpCircle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Don't have all documents right now?</p>
              <p className="text-sm text-amber-700 mt-1">No worries! You can submit your application first with basic details. Our team will guide you on exactly which documents are needed and help you through the entire process.</p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto py-20 px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-bold uppercase tracking-wider mb-4">Got Questions?</span>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-5">
          {/* FAQ 1 */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow group">
            <h4 className="text-lg font-bold text-gray-900 mb-3 flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
                <HelpCircle className="text-green-600" size={18} />
              </div>
              <span className="mt-1">What if I don't have a Trade License?</span>
            </h4>
            <p className="text-gray-600 ml-12 leading-relaxed">Unfortunately, BTCL strictly requires a valid Trade License to register a .com.bd or .net.bd domain. You cannot register these extensions for personal use without a registered entity.</p>
          </div>
          {/* FAQ 2 */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow group">
            <h4 className="text-lg font-bold text-gray-900 mb-3 flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
                <HelpCircle className="text-green-600" size={18} />
              </div>
              <span className="mt-1">Can I register a .bd domain for 1 year?</span>
            </h4>
            <p className="text-gray-600 ml-12 leading-relaxed">No, the Bangladesh Telecommunication Company Limited (BTCL) mandates a minimum registration period of 2 years for all .bd domain extensions. Our pricing reflects this 2-year total.</p>
          </div>
          {/* FAQ 3 */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow group">
            <h4 className="text-lg font-bold text-gray-900 mb-3 flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0 group-hover:bg-green-100 transition-colors">
                <HelpCircle className="text-green-600" size={18} />
              </div>
              <span className="mt-1">How long does the activation process take?</span>
            </h4>
            <p className="text-gray-600 ml-12 leading-relaxed">After we verify availability and collect your payment and documents, we process the application with BTCL. It typically takes 24 to 48 working hours for BTCL to review the paperwork and activate the domain.</p>
          </div>
        </div>
      </div>

      {/* Support CTA - BD Theme */}
      <div className="max-w-5xl mx-auto mb-24 px-4">
        <div className="relative bg-gradient-to-br from-[#006a4e] to-[#004d3b] rounded-3xl p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden shadow-2xl shadow-green-900/20">
          {/* Decorative elements */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/5 blur-2xl"></div>
          <div className="absolute bottom-0 right-[20%] w-32 h-32 rounded-full bg-[#f42a41]/20 blur-2xl"></div>
          <div className="absolute top-8 right-8 w-6 h-6 rounded-full bg-[#f42a41] shadow-lg shadow-red-500/30 hidden md:block"></div>
          
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3">Need help with the paperwork?</h3>
            <p className="text-green-100 text-lg max-w-xl">Our dedicated BTCL domain experts are here to help you navigate the registration process. Don't hesitate to reach out if you have any questions.</p>
          </div>
          
          <a href="tel:+880123456789" className="relative z-10 shrink-0 bg-white hover:bg-gray-50 text-[#006a4e] px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-transform hover:scale-105 shadow-xl shadow-black/10">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <PhoneCall size={16} />
            </div>
            Call Support Now
          </a>
        </div>
      </div>

      {/* Application Modal - Horizontal Layout */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[90vh]" onClick={e => e.stopPropagation()}>
            
            {/* Left Panel - BD Branding */}
            <div className="relative bg-gradient-to-br from-[#006a4e] to-[#004d3b] p-8 text-white md:w-[320px] shrink-0 flex flex-col justify-between overflow-hidden">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-[#f42a41]/20 blur-2xl"></div>
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#f42a41] shadow-lg shadow-red-500/30"></div>
              
              <div className="relative z-10">
                <Globe size={36} className="mb-4 text-green-300" />
                <h3 className="text-2xl font-black mb-2">Apply for .BD Domain</h3>
                <p className="text-green-200 text-sm leading-relaxed">We'll verify availability with BTCL and contact you within 24 hours.</p>
              </div>
              
              <div className="relative z-10 mt-8 space-y-3 hidden md:block">
                <div className="flex items-center gap-3 text-sm text-green-200">
                  <CheckCircle size={16} className="text-green-300 shrink-0" />
                  <span>Manual BTCL verification</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-green-200">
                  <CheckCircle size={16} className="text-green-300 shrink-0" />
                  <span>Complete paperwork handling</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-green-200">
                  <CheckCircle size={16} className="text-green-300 shrink-0" />
                  <span>24-48 hours activation</span>
                </div>
              </div>

              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 md:hidden bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 hidden md:flex bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors text-gray-500">
                <X size={18} />
              </button>

              <form onSubmit={submitApplication} className="space-y-5">
                {/* Domain Name */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <label className="block text-xs font-bold text-green-800 mb-1.5 uppercase tracking-wider">Desired Domain Name</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" size={18} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-green-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all font-semibold text-gray-800 text-lg"
                      required
                    />
                  </div>
                </div>

                {/* Name + Email + Phone in a row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Name / Company</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        value={applicantName}
                        onChange={e => setApplicantName(e.target.value)}
                        placeholder="Resti Technologies"
                        className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="email" 
                        value={applicantEmail}
                        onChange={e => setApplicantEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="tel" 
                        value={applicantPhone}
                        onChange={e => setApplicantPhone(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Documents (Optional)</span>
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`relative flex items-center gap-3 w-full px-4 py-4 border-2 border-dashed rounded-xl transition-all cursor-pointer group ${nidFile ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-green-400'}`}>
                      <FileText className={`shrink-0 ${nidFile ? 'text-green-600' : 'text-gray-400 group-hover:text-green-500'}`} size={22} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">NID</p>
                        <p className={`text-xs truncate ${nidFile ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                          {nidFile ? nidFile.name : 'Click to upload'}
                        </p>
                      </div>
                      {nidFile && <CheckCircle size={16} className="text-green-500 shrink-0 ml-auto" />}
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setNidFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                    <div className={`relative flex items-center gap-3 w-full px-4 py-4 border-2 border-dashed rounded-xl transition-all cursor-pointer group ${tradeLicenseFile ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-green-400'}`}>
                      <FileText className={`shrink-0 ${tradeLicenseFile ? 'text-green-600' : 'text-gray-400 group-hover:text-green-500'}`} size={22} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Trade License</p>
                        <p className={`text-xs truncate ${tradeLicenseFile ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                          {tradeLicenseFile ? tradeLicenseFile.name : 'Click to upload'}
                        </p>
                      </div>
                      {tradeLicenseFile && <CheckCircle size={16} className="text-green-500 shrink-0 ml-auto" />}
                      <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setTradeLicenseFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 text-center mt-2">You can also submit documents later via email or dashboard.</p>
                </div>

                                {/* Legal Checkbox */}
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <input 
                    type="checkbox" 
                    id="terms" 
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 shrink-0 w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500"
                    required
                  />
                  <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed">
                    I confirm that the provided documents are authentic and I agree to <a href="#" className="text-green-600 font-bold hover:underline">BTCL's Terms & Conditions</a> for domain registration.
                  </label>
                </div>

                {/* Submit */}
                <button 
                  type="submit" 
                  disabled={isSubmitting || !termsAccepted}
                  className="w-full bg-gradient-to-r from-[#006a4e] to-[#008060] hover:from-[#005a40] hover:to-[#006a4e] text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg shadow-green-700/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-lg"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  {!isSubmitting && <ArrowRight size={20} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}


