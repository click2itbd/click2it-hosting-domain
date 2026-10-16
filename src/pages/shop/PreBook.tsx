import React, { useState } from 'react';
import { Layout } from '../../components/Layout';
import { CalendarPlus, Send } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { SEO } from '../../components/SEO';

export const PreBook = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    productName: '',
    productLink: '',
    description: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        const imageRef = ref(storage, `pre_bookings/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, 'pre_bookings'), {
        ...formData,
        imageUrl,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Pre-booking request submitted successfully! We will contact you soon.');
      setFormData({
        name: '',
        phone: '',
        email: '',
        productName: '',
        productLink: '',
        description: ''
      });
      setImageFile(null);
    } catch (error) {
      console.error('Error submitting pre-booking:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Layout>
      <SEO
        title="Pre-Book Upcoming Gadgets & PC Hardware | CLICK2IT"
        description="Can't find your desired PC component or laptop in Bangladesh? Request a pre-booking at CLICK2IT and we will source and deliver it for you."
        canonical="https://click2itbd.com/pre-book"
      />
      <div className="bg-[#f8f9fa] min-h-screen py-10">
        <div className="container mx-auto px-2 sm:px-4 max-w-3xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-10">
            <div className="flex flex-col items-center justify-center mb-8 text-center">
              <div className="w-16 h-16 bg-orange-100 text-[#F97316] rounded-full flex items-center justify-center mb-4">
                <CalendarPlus size={32} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#081621] mb-2">Pre-Book a Product</h1>
              <p className="text-gray-500 max-w-lg">
                Can't find the product you're looking for? Let us know what you need and we'll arrange it for you.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md py-2.5 px-4 focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-colors"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md py-2.5 px-4 focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-colors"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-4 focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-colors"
                  placeholder="Enter your email (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Product Name / Model <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="productName"
                  required
                  value={formData.productName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-4 focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-colors"
                  placeholder="e.g. RTX 5090 Graphics Card"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Reference Link</label>
                <input
                  type="url"
                  name="productLink"
                  value={formData.productLink}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-4 focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-colors"
                  placeholder="Link to the product (if any)"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Product Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md py-2 px-4 focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-colors"
                />
                {imageFile && <p className="text-xs text-green-600 mt-1">Selected: {imageFile.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Additional Details</label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-4 focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-colors resize-none"
                  placeholder="Any specific requirements (color, capacity, expected budget, etc.)"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F97316] text-white py-3.5 rounded-md font-bold hover:bg-[#e06612] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Submitting...' : (
                  <>
                    <Send size={18} />
                    Submit Pre-Book Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};
