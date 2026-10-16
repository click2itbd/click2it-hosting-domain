export interface CourierRiskReport {
  total_parcels: number;
  total_delivered: number;
  total_cancelled: number;
  success_rate: number;
  cancel_rate: number;
  risk_level: 'safe' | 'medium' | 'high' | 'unknown';
  risk_badge_color: string;
  risk_title: string;
  recommendation: string;
}

export async function fetchCourierRisk(
  phone: string,
  apiKey?: string,
  secretKey?: string
): Promise<CourierRiskReport> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('সঠিক ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন');
  }

  if (!apiKey || !secretKey) {
    throw new Error('Steadfast API Key অথবা Secret Key কনফিগার করা নেই। Settings > Courier (Steadfast) এ গিয়ে আপনার API Key ও Secret Key সেট করুন।');
  }

  let effectivePhone = cleanPhone.length > 11 && cleanPhone.startsWith('88') 
    ? cleanPhone.slice(2) 
    : cleanPhone;
  if (effectivePhone.length === 10 && effectivePhone.startsWith('1')) {
    effectivePhone = '0' + effectivePhone;
  }

  const baseUrl = (typeof window !== 'undefined' && window.location.origin) 
    ? window.location.origin 
    : 'https://click2itbd.com';

  const res = await fetch(`${baseUrl}/steadfast.php?action=fraud_check&phone=${encodeURIComponent(effectivePhone)}`, {
    headers: {
      'Api-Key': apiKey,
      'Secret-Key': secretKey
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || `Steadfast API ত্রুটি (${res.status}: ${res.statusText})`);
  }

  const data = await res.json();
  const total = Number(data.total_parcels ?? data.Total_parcels ?? 0);
  const delivered = Number(data.total_delivered ?? data.Total_delivered ?? 0);
  const cancelled = Number(data.total_cancelled ?? data.Total_cancelled ?? 0);

  const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

  let risk_level: 'safe' | 'medium' | 'high' | 'unknown' = 'unknown';
  let risk_badge_color = 'bg-gray-100 text-gray-700 border-gray-300';
  let risk_title = 'New Customer';
  let recommendation = 'পূর্বে কোনো কুরিয়ার রেকর্ড পাওয়া যায়নি (নতুন কাস্টমার)। ফোন করে অর্ডার ভেরিফাই করুন।';

  if (total > 0) {
    if (successRate >= 80) {
      risk_level = 'safe';
      risk_badge_color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      risk_title = `${successRate}% Delivered (Safe)`;
      recommendation = `নিরাপদ কাস্টমার (${total} টির মধ্যে ${delivered} টি পার্সেল গ্রহণ করেছেন)। ক্যাশ অন ডেলিভারিতে পাঠানো নিরাপদ।`;
    } else if (successRate >= 50) {
      risk_level = 'medium';
      risk_badge_color = 'bg-amber-50 text-amber-700 border-amber-200';
      risk_title = `${cancelRate}% Cancelled (Medium Risk)`;
      recommendation = `মাঝারি ঝুঁকি (${total} টির মধ্যে ${cancelled} টি পার্সেল ক্যানসেল হয়েছে)। কুরিয়ারে বুকিংয়ের আগে অবশ্যই কল করে কনফার্ম করুন।`;
    } else {
      risk_level = 'high';
      risk_badge_color = 'bg-rose-50 text-rose-700 border-rose-300 font-bold';
      risk_title = `${cancelRate}% Cancel Rate (High Risk!)`;
      recommendation = `উচ্চ ঝুঁকি / ফেক অর্ডার সতর্কতা! কাস্টমার বেশিরভাগ পার্সেল রিটার্ন করেন (${total} টির মধ্যে ${cancelled} টি ক্যানসেল)। অগ্রিম ডেলিভারি চার্জ ছাড়া পার্সেল পাঠানো ঝুঁকিপূর্ণ!`;
    }
  }

  return {
    total_parcels: total,
    total_delivered: delivered,
    total_cancelled: cancelled,
    success_rate: successRate,
    cancel_rate: cancelRate,
    risk_level,
    risk_badge_color,
    risk_title,
    recommendation
  };
}
