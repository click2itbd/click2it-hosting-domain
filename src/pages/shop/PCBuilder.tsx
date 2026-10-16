// @ts-nocheck
import React, { useState, useEffect } from 'react';
import '../../styles/pc-builder-theme.css';
import { Navigate, useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { CommunityBuilds } from '../../components/PCBuilder/CommunityBuilds';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Product } from '../../types';
import { Layout } from '../../components/Layout';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { coreCategories, peripheralCategories, BuilderCategory } from '../../components/PCBuilder/constants';
import { getCompatibility } from '../../components/PCBuilder/utils';
import { BuilderHeader } from '../../components/PCBuilder/BuilderHeader';
import { BuilderSidebar } from '../../components/PCBuilder/BuilderSidebar';
import { BuilderCategoryRow } from '../../components/PCBuilder/BuilderCategoryRow';
import { BuilderProgress } from '../../components/PCBuilder/BuilderProgress';
import { BuilderSelectionModal } from '../../components/PCBuilder/BuilderSelectionModal';
import { BuildVisualizer } from '../../components/PCBuilder/BuildVisualizer';
import { AIAssistantModal } from '../../components/PCBuilder/AIAssistantModal';
import { CustomBuildRequestModal } from '../../components/PCBuilder/CustomBuildRequestModal';
import { SmartBuilderTemplates } from '../../components/PCBuilder/SmartBuilderTemplates';
import { apiPost } from '../../services/apiClient';
import { generatePDF } from '../../lib/pdf';
import { useSettings } from '../../context/SettingsContext';
import { SEO } from '../../components/SEO';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export const PCBuilder: React.FC = () => {
  const [dynamicCoreCategories, setDynamicCoreCategories] = useState<BuilderCategory[]>(coreCategories);
  const [dynamicPeripheralCategories, setDynamicPeripheralCategories] = useState<BuilderCategory[]>(peripheralCategories);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const snap = await getDocs(collection(db, 'pc_builder_categories'));
        if (!snap.empty) {
          const fetched = snap.docs.map(doc => {
            const data = doc.data();
            // Map icon string back to component
            const IconComponent = (Icons as any)[data.iconName] || Icons.Settings;
            return {
              id: doc.id,
              name: data.name,
              icon: IconComponent,
              required: data.required,
              type: data.type,
              order: data.order
            } as any;
          });
          fetched.sort((a, b) => a.order - b.order);
          setDynamicCoreCategories(fetched.filter(c => c.type === 'core'));
          setDynamicPeripheralCategories(fetched.filter(c => c.type === 'peripheral'));
        }
      } catch (e) {
        console.error("Failed to load dynamic categories", e);
      }
    };
    fetchCats();
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [includeAssembly, setIncludeAssembly] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  
  const matchChoose = location.pathname.match(/\/pc-build\/choose\/(.+)/);
  const categoryId = matchChoose ? matchChoose[1] : null;
  const activeCategoryModal = categoryId ? [...dynamicCoreCategories, ...dynamicPeripheralCategories].find(c => c.id === categoryId) || null : null;
  const [showAIModal, setShowAIModal] = useState(false);
  const [showCustomBuildModal, setShowCustomBuildModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('pcb-theme') === 'dark');

  useEffect(() => {
    localStorage.setItem('pcb-theme', isDarkMode ? 'dark' : 'light');
    const event = new CustomEvent('pcb-theme-change', { detail: isDarkMode });
    window.dispatchEvent(event);
  }, [isDarkMode]);

  useEffect(() => {
    const handler = (e) => setIsDarkMode(e.detail);
    window.addEventListener('pcb-theme-toggle', handler);
    return () => window.removeEventListener('pcb-theme-toggle', handler);
  }, []);
  const { addToCart } = useCart();
  // searchParams removed

  useEffect(() => {
    const handleOpenAI = () => setShowAIModal(true);
    document.addEventListener('open-ai-assistant', handleOpenAI);
    const handleCustomBuild = () => setShowCustomBuildModal(true);
    document.addEventListener('open-custom-build', handleCustomBuild);
    return () => {
      document.removeEventListener('open-ai-assistant', handleOpenAI);
      document.removeEventListener('open-custom-build', handleCustomBuild);
    };
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(500)));
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];
        setProducts(productsData.filter(p => p.showInStore !== false));

        
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
      if (products.length === 0) return;
      const params = new URLSearchParams(location.search);
      const buildParam = params.get('build');
      const communityBuildId = params.get('communityBuild');
      if (!buildParam && !communityBuildId) {
        const savedLocal = localStorage.getItem('savedPcBuild');
        if (savedLocal) {
          try {
            setSelectedComponents(JSON.parse(savedLocal));
            toast.success('Restored your saved build');
          } catch(e) {}
        }
      }


      const loadCommunityBuild = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const docRef = doc(db, 'community_builds', communityBuildId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const buildData = docSnap.data();
            if (buildData.components) {
              const newSelection = {};
              Object.entries(buildData.components).forEach(([cat, item]) => {
                if (item && item.id) {
                  const foundProduct = products.find(p => p.id === item.id);
                  if (foundProduct) {
                    newSelection[cat] = foundProduct;
                  } else {
                    newSelection[cat] = item;
                  }
                }
              });
              setSelectedComponents(newSelection);
            }
          }
        } catch (err) {
          console.error("Failed to load community build", err);
        }
      };

      if (communityBuildId) {
        loadCommunityBuild();
      } else if (buildParam) {

        try {
          const decoded = atob(buildParam);
          const pairs = decoded.split(',');
          const newSelection = {};
          pairs.forEach(pair => {
            const [cat, id] = pair.split(':');
            const foundProduct = products.find(p => p.id === id);
            if (foundProduct) {
              newSelection[cat] = foundProduct;
            }
          });
          setSelectedComponents(newSelection);
        } catch (e) {
          console.error('Failed to parse shared build', e);
        }
      }
    }, [location.search, products]);

  const handleSelect = (product: Product) => {
    if (!activeCategoryModal) return;
    setSelectedComponents(prev => ({
      ...prev,
      [activeCategoryModal.id]: product
    }));
    toast.success(`${product.name} selected!`, { icon: '✅' });
  };

  const handleRemove = (categoryId: string) => {
    setSelectedComponents(prev => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
  };

  const handleAddToCart = () => {
    const selectedList = Object.values(selectedComponents).filter(Boolean) as Product[];
    if (selectedList.length === 0) {
      toast.error('Please select at least one component');
      return;
    }
    
    // Add components
    selectedList.forEach(product => addToCart(product));
    
    // Add assembly service if checked
    if (includeAssembly) {
      const assemblyService = {
        id: 'SERVICE-ASSEMBLY',
        name: 'Professional PC Assembly Service',
        price: 1500,
        stock: 999,
        category: 'Service',
        description: 'Professional cable management and stress testing for your custom PC build.',
        imageUrl: 'https://placehold.co/400x400/1e293b/ffffff?text=Assembly+Service',
        isService: true
      };
      addToCart(assemblyService as any);
    }
    
    toast.success('Components ' + (includeAssembly ? 'and assembly ' : '') + 'added to cart!');
  };

  const handleSaveBuild = async () => {
    if (Object.keys(selectedComponents).length === 0) {
      toast.error('Add some components to save your build');
      return;
    }
    
    if (!user) {
      localStorage.setItem('savedPcBuild', JSON.stringify(selectedComponents));
      toast.success('Build saved locally! Log in to save to your profile.', { duration: 4000 });
      return;
    }

    const buildName = window.prompt("Enter a name for this build:", "My PC Build");
    if (!buildName) return;

    try {
      const selectedList = Object.values(selectedComponents).filter(Boolean) as Product[];
      const totalPrice = selectedList.reduce((sum, p) => sum + p.price, 0);

      await addDoc(collection(db, 'saved_builds'), {
        userId: user.uid,
        name: buildName,
        components: selectedComponents,
        totalPrice,
        createdAt: serverTimestamp()
      });
      toast.success('Build saved to your profile!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save build');
    }
  };

  const handlePrintBuild = () => {
    const selectedList = Object.values(selectedComponents).filter(Boolean) as Product[];
    if (selectedList.length === 0) {
      toast.error('Add components to your build first');
      return;
    }
    const totalPrice = selectedList.reduce((sum, p) => sum + (p.discountPrice || p.price), 0);
    const mockOrder: any = {
      id: `PCB-${Date.now().toString().slice(-6)}`,
      customerName: "PC Build Quotation",
      items: selectedList.map(p => ({
        name: p.name,
        price: p.discountPrice || p.price,
        quantity: 1,
        productId: p.id
      })),
      total: totalPrice,
      discount: 0,
      shippingFee: 0,
      createdAt: new Date().toISOString(),
      _autoPrint: true
    };
    generatePDF(mockOrder, 'quotation', settings, 'doc');
  };

  const handleDownloadPDF = () => {
    const selectedList = Object.values(selectedComponents).filter(Boolean) as Product[];
    if (selectedList.length === 0) {
      toast.error('Add components to your build first');
      return;
    }
    const totalPrice = selectedList.reduce((sum, p) => sum + (p.discountPrice || p.price), 0);
    const mockOrder: any = {
      id: `PCB-${Date.now().toString().slice(-6)}`,
      customerName: "PC Build Quotation",
      items: selectedList.map(p => ({
        name: p.name,
        price: p.discountPrice || p.price,
        quantity: 1,
        productId: p.id
      })),
      total: totalPrice,
      discount: 0,
      shippingFee: 0,
      createdAt: new Date().toISOString()
    };
    generatePDF(mockOrder, 'quotation', settings, 'download');
  };


  const handleEmailBuild = async () => {
    const selectedList = Object.values(selectedComponents).filter(Boolean) as Product[];
    if (selectedList.length === 0) {
      toast.error('Add some components to email your build quote');
      return;
    }
    
    const customerName = window.prompt("Enter your name:");
    if (!customerName) return;
    
    const customerEmail = window.prompt("Enter your email address to receive the quote:");
    if (!customerEmail || !customerEmail.includes('@')) {
      toast.error('Valid email is required');
      return;
    }

    const toastId = toast.loading('Generating quote and sending email...');
    
    try {
      const totalPrice = selectedList.reduce((sum, p) => sum + p.price, 0);
      
      const mockOrder: any = {
        id: 'QUO-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        customerName,
        customerEmail,
        customerPhone: '',
        customerAddress: '',
        items: selectedList.map(p => ({
          ...p,
          quantity: 1
        })),
        total: totalPrice,
        discountAmount: 0,
        createdAt: new Date().toISOString()
      };
      
      const pdfDoc = await generatePDF(mockOrder, 'quotation', settings, 'doc');
      const pdfBase64 = pdfDoc.output('datauristring');
      
      await apiPost('/api/send-email/pc-build-summary', {
        customerName,
        customerEmail,
        totalAmount: totalPrice,
        attachments: [
          {
            filename: 'PC-Build-Quote.pdf',
            content: pdfBase64.split('base64,')[1],
            encoding: 'base64',
            contentType: 'application/pdf'
          }
        ]
      });
      
      toast.success('Quote sent to your email!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to send email. Try again.', { id: toastId });
    }
  };

  const handlePublishBuild = async () => {
    const selectedList = Object.values(selectedComponents).filter(Boolean) as Product[];
    if (selectedList.length === 0) {
      toast.error('Add some components to publish your build');
      return;
    }
    
    const buildName = window.prompt("Enter a name for your build (e.g. Budget Gaming King):");
    if (!buildName) return;

    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'community_builds'), {
        name: buildName,
        components: selectedComponents,
        totalPrice: selectedList.reduce((sum, p) => sum + p.price, 0),
        author: "Anonymous Builder", // In a real app, use auth context
        upvotes: 0,
        createdAt: serverTimestamp()
      });
      toast.success('Build published to the community!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish build');
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to clear your current build?')) {
      setSelectedComponents({});
      toast.success('Build cleared');
    }
  };

  const renderCategoryGroup = (title: string, groupCategories: BuilderCategory[], startStep: number) => (
    <motion.div variants={itemVariants} className="mb-12">
      <div className="flex items-end justify-between mb-5 px-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
        <span className="text-xs font-semibold text-slate-400">{groupCategories.length} parts</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {groupCategories.map((cat, idx) => {
          const selected = selectedComponents[cat.id];
          const compatibility = selected 
            ? getCompatibility(cat.id, selected, selectedComponents) 
            : { isCompatible: true, reason: '' };

          return (
            <BuilderCategoryRow
              key={cat.id}
              step={startStep + idx + 1}
              category={cat}
              selectedProduct={selected}
              compatibility={compatibility}
              onRemove={() => handleRemove(cat.id)}
              onChoose={() => navigate(`/pc-build/choose/${cat.id}`)}
            />
          );
        })}
      </div>
    </motion.div>
  );

  const builderContent = (
    <Layout fullWidth>
      <SEO
        title="Custom PC Builder in Bangladesh | Build Your Dream PC"
        description="Build your custom gaming, editing, or office desktop PC with CLICK2IT PC Builder. Real-time compatibility check, component pricing, and expert assembly in Bangladesh."
        keywords="pc builder bangladesh, custom pc builder bd, gaming pc build, desktop computer price bd, click2it pc build"
        canonical="https://click2itbd.com/pc-build"
      />
      <div className={isDarkMode ? 'dark-builder' : ''}>
      
        <div className="bg-slate-50 min-h-screen pt-8 pb-20 font-sans selection:bg-violet-500/30 selection:text-violet-200 print:bg-white print:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="print:hidden">
            <BuilderHeader onReset={handleReset} />
          </div>
          
          <div className="print:block hidden mb-8">
            <h1 className="text-3xl font-black text-slate-900">My PC Build</h1>
            <p className="text-slate-500">Generated on {new Date().toLocaleDateString()}</p>
          </div>

          <SmartBuilderTemplates 
            products={products} 
            onApplyBuild={(build) => setSelectedComponents(build)} 
          />

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Builder Area */}
            <div className="flex-grow min-w-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                  <p className="text-slate-500 font-medium animate-pulse">Loading components...</p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <BuilderProgress categories={dynamicCoreCategories} selectedComponents={selectedComponents} />
                  {renderCategoryGroup("Core Components", dynamicCoreCategories, 0)}
                  {renderCategoryGroup("Peripherals & Accessories", dynamicPeripheralCategories, dynamicCoreCategories.length)}
                </motion.div>
              )}
            </div>

            {/* Sidebar Summary */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full lg:w-[380px] shrink-0 print:hidden"
            >
              <div className="sticky top-24 z-10 transition-all duration-300 space-y-6">
                <BuildVisualizer selectedComponents={selectedComponents} />
                <BuilderSidebar 
                  selectedComponents={selectedComponents}
                  onAddToCart={handleAddToCart}
                  onSaveBuild={handleSaveBuild}
                  onPrintBuild={handlePrintBuild}
                    onDownloadPDF={handleDownloadPDF}
                  onEmailBuild={handleEmailBuild}
                  onPublishBuild={handlePublishBuild}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeCategoryModal && (
          <BuilderSelectionModal
            isOpen={!!activeCategoryModal}
            onClose={() => navigate('/pc-build')}
            category={activeCategoryModal}
            products={products}
            selectedComponents={selectedComponents}
            onSelect={handleSelect}
          />
        )}
                <AIAssistantModal 
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          products={products}
          onApplyBuild={(build) => setSelectedComponents(build)}
        />
        <CustomBuildRequestModal
          isOpen={showCustomBuildModal}
          onClose={() => setShowCustomBuildModal(false)}
        />
      </AnimatePresence>
      </div>
    </Layout>
  );

  return (
    <Routes>
      <Route path="community-builds" element={<CommunityBuilds />} />
      <Route path="*" element={builderContent} />
    </Routes>
  );
};


