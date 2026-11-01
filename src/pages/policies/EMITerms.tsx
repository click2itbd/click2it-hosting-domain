import React from 'react';
import { DynamicPolicyPage } from '../../components/DynamicPolicyPage';

const EMITerms = () => {
  return (
    <DynamicPolicyPage
      pageId="emi-terms"
      defaultTitle="EMI Terms & Payment Policy"
      defaultContent={`<section class="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
  <div class="flex items-start gap-3">
    <div>
      <span class="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
        Current Status: Not Available Yet • Future Roadmap
      </span>
      <h2 class="text-xl font-bold text-gray-900 mb-2">EMI Facility is Currently Unavailable (Coming in the Future)</h2>
      <p class="text-gray-700 leading-relaxed">
        At present, <strong>{brandName} does not offer Credit Card EMI (Equated Monthly Installment)</strong> for Domain Registration, Shared Web Hosting, or Cloud VPS services. However, <strong>we are actively planning to introduce EMI facilities in the future</strong> for our long-term Enterprise Cloud, Dedicated Server, and Corporate Infrastructure plans.
      </p>
      <p class="text-gray-600 text-sm mt-2">
        বর্তমানে আমাদের ডোমেইন এবং হোস্টিং সার্ভিসে কোনো EMI (কিস্তি) সুবিধা চালু নেই। তবে ভবিষ্যতে আমাদের এন্টারপ্রাইজ ক্লাউড, ভিপিএস (VPS) এবং ডেডিকেটেড সার্ভারের বার্ষিক প্যাকেজগুলোতে EMI সুবিধা চালু করার পরিকল্পনা রয়েছে।
      </p>
    </div>
  </div>
</section>

<section>
  <h2 class="text-2xl font-bold text-gray-900 mb-3">1. Why EMI is Not Active Right Now</h2>
  <p>
    Unlike physical hardware products, Web Hosting and Cloud VPS services already come with built-in <strong>Monthly, Quarterly, and Annual billing cycles</strong>. Because you can subscribe to our hosting and VPS plans on a low-cost month-to-month basis without locking into a large upfront capital expense, traditional bank credit card EMI is currently not required for standard plans.
  </p>
</section>

<section>
  <h2 class="text-2xl font-bold text-gray-900 mb-3">2. Flexible Billing Cycles Available Today</h2>
  <p>While formal bank EMI is under consideration for future rollout, you can enjoy complete payment flexibility today through our standard billing cycles:</p>
  <ul class="list-disc pl-6 mt-3 space-y-2">
    <li><strong>Pay Monthly (Pay-As-You-Go):</strong> Start with our Shared NVMe Hosting, WordPress Cloud, or KVM Cloud VPS on a monthly billing cycle and renew each month at your convenience.</li>
    <li><strong>Annual Billing Discounts:</strong> Save up to 20% when you opt for an annual billing cycle on Shared and WordPress Cloud Hosting.</li>
    <li><strong>Domain Registration Terms:</strong> Domains (.com, .net, .org, .bd, etc.) can be registered for 1 to 10 years at a time as required by ICANN and BTCL registry rules.</li>
  </ul>
</section>

<section>
  <h2 class="text-2xl font-bold text-gray-900 mb-3">3. Future EMI Roadmap</h2>
  <p>
    We understand that growing businesses, agencies, and enterprise clients investing in high-tier annual infrastructure may prefer installment payments. Our billing team is evaluating partnerships with leading payment gateways and commercial banks in Bangladesh to bring EMI options in the future for:
  </p>
  <ul class="list-disc pl-6 mt-3 space-y-2">
    <li>Annual &amp; Multi-Year Enterprise Cloud VPS Plans</li>
    <li>Managed Dedicated Servers &amp; Custom Cluster Deployments</li>
    <li>Bulk Corporate Domain &amp; Multi-Year SSL Portfolios</li>
  </ul>
  <p class="mt-3 text-sm text-gray-500 italic">
    Once EMI becomes officially available, the eligible banks, tenure options (3, 6, 9, or 12 months), and minimum invoice thresholds will be published right here on this page.
  </p>
</section>

<section>
  <h2 class="text-2xl font-bold text-gray-900 mb-3">4. Supported Instant Payment Methods</h2>
  <p>
    You can pay for any domain, hosting, VPS, or SSL invoice instantly with 0% gateway hassle using:
  </p>
  <ul class="list-disc pl-6 mt-3 space-y-1.5">
    <li><strong>Mobile Banking (MFS):</strong> bKash, Nagad, Rocket, Upay</li>
    <li><strong>Cards &amp; Internet Banking (via EPS):</strong> Visa, MasterCard, American Express, NexusPay, and local internet banking</li>
    <li><strong>Direct Bank Deposit / NPSB / BEFTN:</strong> Available for corporate and high-value invoices</li>
  </ul>
</section>

<section class="bg-blue-50 p-6 rounded-xl mt-8 border border-blue-100">
  <h2 class="text-xl font-bold text-blue-900 mb-2">Need Custom Billing for Enterprise Servers?</h2>
  <p class="text-blue-800 text-sm">
    If your organization requires a custom monthly payment schedule for a high-capacity VPS or Dedicated Server deployment, please reach out to our billing department at <strong>{contactEmail}</strong> or call <strong>{contactPhone}</strong>.
  </p>
</section>`}
    />
  );
};

export default EMITerms;
