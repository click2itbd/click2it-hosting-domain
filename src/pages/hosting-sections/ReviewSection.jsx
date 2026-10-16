import React, { useState, useEffect, useMemo } from 'react';
import { Star, MessageSquare, CheckCircle2, Sparkles, Copy, Check } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-hot-toast';

export default function ReviewSection() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [rewardCode, setRewardCode] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReviews();
    if (user) {
      checkIfReviewed();
    }
  }, [user]);

  const fetchReviews = async () => {
    try {
      const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(5));
      const snap = await getDocs(q);
      setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const checkIfReviewed = async () => {
    try {
      const q = query(collection(db, 'reviews'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      setHasReviewed(!snap.empty);
    } catch (error) {
      console.error('Error checking review status:', error);
    }
  };

  const generateReward = async () => {
    const rewardSettings = settings || {};
    if (!rewardSettings.reviewRewardEnabled) return null;

    const discountPercentage = rewardSettings.reviewRewardPercentage || 10;
    const code = `REV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    try {
      await addDoc(collection(db, 'couponCodes'), {
        code,
        discountPercentage,
        expiryDate: expiryDate.toISOString(),
        isActive: true,
        maxUses: 1,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      return { code, discountPercentage };
    } catch (err) {
      console.error('Error creating reward code:', err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to submit a review');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: 'site',
        userId: user.uid,
        userName: user.displayName || 'Anonymous User',
        rating,
        comment,
        createdAt: new Date().toISOString()
      });

      toast.success('Thank you for your review!');

      if (!hasReviewed) {
        const reward = await generateReward();
        if (reward) {
          setRewardCode(reward);
        }
      }

      setHasReviewed(true);
      fetchReviews();
      setComment('');
      setRating(5);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!rewardCode) return;
    navigator.clipboard.writeText(rewardCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Aggregate stats derived from the latest signal batch (5 most recent reviews)
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return { avg: 0, total: 0, distribution: [0, 0, 0, 0, 0] };
    }
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const distribution = [5, 4, 3, 2, 1].map(
      star => reviews.filter(r => r.rating === star).length
    );
    return { avg: sum / total, total, distribution };
  }, [reviews]);

  const initials = (name) =>
    (name || 'A U')
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const avatarPalette = ['#14B8A6', '#0A1628', '#F2622E'];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold text-teal-600 mb-3">Client feedback</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0A1628] tracking-tight mb-3">
            What our clients report
          </h2>
          <p className="text-base text-slate-500">
            Real feedback logged directly by businesses running on our hosting and device services.
          </p>
        </div>

        {/* Summary panel — matches the dark navy card language used across the site */}
        <div className="mb-10 rounded-2xl bg-[#0A1628] px-6 py-8 sm:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-8 sm:gap-12 items-center">
            <div className="flex sm:flex-col items-baseline sm:items-start gap-2 sm:gap-1">
              <span className="text-4xl sm:text-5xl font-bold text-white tabular-nums">
                {stats.total ? stats.avg.toFixed(1) : '—'}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={13}
                      className={
                        star <= Math.round(stats.avg)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-white/20'
                      }
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400">
                  {stats.total ? `${stats.total} recent reviews` : 'No reviews yet'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 w-full">
              {stats.distribution.map((count, i) => {
                const star = 5 - i;
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-xs text-slate-300">
                    <span className="w-2.5 text-right">{star}</span>
                    <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-5 text-right text-slate-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Reviews list */}
          <div className="lg:col-span-3 space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-2xl border border-slate-200">
                <MessageSquare className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No reviews yet</p>
                <p className="text-sm text-slate-400 mt-1">Be the first client to log a signal.</p>
              </div>
            ) : (
              reviews.map((rev, idx) => (
                <div
                  key={rev.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-200 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: avatarPalette[idx % avatarPalette.length] }}
                      >
                        {initials(rev.userName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-[#0A1628] truncate">{rev.userName}</h4>
                          <CheckCircle2 size={13} className="text-teal-500 shrink-0" />
                        </div>
                        <p className="text-xs text-slate-400">
                          {new Date(rev.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={14}
                          className={
                            star <= rev.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-200'
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{rev.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* Review form */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 lg:sticky lg:top-24">
              {rewardCode ? (
                <div>
                  <div className="flex items-center gap-2 mb-4 text-teal-600">
                    <Sparkles size={18} />
                    <h3 className="text-lg font-bold text-[#0A1628]">Reward unlocked</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">
                    Thanks for your first review — here's a {rewardCode.discountPercentage}% discount
                    code for your next order.
                  </p>
                  <div className="relative rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/60 px-4 py-3 flex items-center justify-between gap-3">
                    <span className="font-bold text-lg text-[#0A1628] tracking-wider">
                      {rewardCode.code}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="shrink-0 p-2 rounded-lg bg-white border border-teal-200 text-teal-600 hover:bg-teal-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                      aria-label="Copy code"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Valid 30 days · single use
                  </p>
                </div>
              ) : hasReviewed ? (
                <div className="text-center py-10">
                  <div className="bg-teal-50 text-teal-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-6 h-6 fill-current" />
                  </div>
                  <p className="font-semibold text-[#0A1628]">You've already reviewed</p>
                  <p className="text-sm text-slate-500 mt-1">Thanks for the feedback.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <h3 className="text-lg font-bold text-[#0A1628] mb-1">Leave a review</h3>
                    <p className="text-sm text-slate-500">Tell other clients how it went.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2">
                      Rating
                    </label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded transition-transform hover:scale-110"
                          aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        >
                          <Star
                            size={26}
                            className={
                              (hoverRating || rating) >= star
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-200'
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2">
                      Comment
                    </label>
                    <textarea
                      rows={4}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your experience with our services..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm resize-none placeholder:text-slate-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !user}
                    className="w-full bg-[#0A1628] text-white py-3 rounded-xl font-semibold hover:bg-[#132038] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                  >
                    {isSubmitting ? 'Submitting...' : user ? 'Submit review' : 'Log in to review'}
                  </button>

                  {!user && (
                    <p className="text-xs text-center text-slate-400">
                      You must be logged in to leave a review.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
