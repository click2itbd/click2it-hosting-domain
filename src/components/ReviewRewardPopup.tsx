import React, { useState, useEffect } from 'react';
import { X, Gift, Star } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export const ReviewRewardPopup: React.FC = () => {
  const { settings } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only run if the feature is enabled in settings
    const rewardSettings = settings as any;
    if (!rewardSettings.reviewRewardEnabled) return;

    // Check if we've already dismissed this popup
    const dismissed = localStorage.getItem('review_reward_popup_dismissed');
    if (dismissed === 'true') return;

    const checkAndShow = async () => {
      // If user is logged in, check if they already reviewed
      if (user) {
        try {
          const q = query(collection(db, 'reviews'), where('userId', '==', user.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            // Already reviewed, never show again
            localStorage.setItem('review_reward_popup_dismissed', 'true');
            return;
          }
        } catch (error) {
          console.error("Error checking review status:", error);
        }
      }
      
      // Delay to not bombard the user immediately
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000); // 3 seconds delay

      return () => clearTimeout(timer);
    };

    checkAndShow();
  }, [settings, user]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('review_reward_popup_dismissed', 'true');
  };

  const handleAction = () => {
    handleClose();
    // Navigate to homepage review section (assuming it's at the bottom)
    navigate('/');
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 500);
  };

  const rewardSettings = settings as any;
  const percentage = rewardSettings.reviewRewardPercentage || 10;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full"
        >
          <div className="bg-gradient-to-br from-[#0a1628] to-blue-900 rounded-2xl shadow-2xl p-6 text-white border border-blue-800/50 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-purple-500/20 rounded-full blur-xl"></div>
            
            <button 
              onClick={handleClose}
              className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors bg-white/10 rounded-full p-1"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-4 relative z-10">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                <Gift className="text-white" size={24} />
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  Get {percentage}% Off! <Star className="text-yellow-400 fill-yellow-400" size={16} />
                </h3>
                <p className="text-blue-100 text-sm mb-4 leading-relaxed">
                  Leave your first review on our website and instantly receive a special {percentage}% discount code for your next order.
                </p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={handleAction}
                    className="flex-1 bg-white text-blue-900 font-bold py-2 px-4 rounded-lg text-sm hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    Leave a Review
                  </button>
                  <button 
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
