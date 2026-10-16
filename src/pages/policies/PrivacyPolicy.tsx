import React from 'react';
import { DynamicPolicyPage } from '../../components/DynamicPolicyPage';

const PrivacyPolicy = () => {
  return <DynamicPolicyPage pageId="privacy-policy" defaultTitle="Privacy Policy" defaultContent={`<section>
                <p className="text-lg">
                  Welcome to {brandName}. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services, encompassing our <strong>Tech Shop</strong>, <strong>Custom PC Builder</strong>, and <strong>Domain & Hosting</strong> platforms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
                <p>We collect information depending on the specific services you interact with:</p>
                <ul className="list-disc pl-6 mt-3 space-y-2">
                  <li><strong>General Account Data:</strong> Name, email address, phone number, and encrypted passwords when you register an account.</li>
                  <li><strong>E-Commerce & Shop Data:</strong> Delivery addresses, billing information, and purchase history when you buy gadgets or components.</li>
                  <li><strong>PC Build Preferences:</strong> Saved PC build configurations and hardware compatibility preferences.</li>
                  <li><strong>Hosting & Domain Data:</strong> Domain registration details (WHOIS data), server logs, and website technical metadata.</li>
                  <li><strong>Payment Data:</strong> Secure transaction IDs (Note: We do not store full credit card numbers or raw Mobile Banking PINs on our servers).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
                <p>We use the collected information for specific service-related purposes:</p>
                
                <div className="mt-4 space-y-4 pl-2">
                  <div>
                    <h3 className="font-bold text-gray-900">A. Tech Shop & E-Commerce</h3>
                    <ul className="list-disc pl-6 mt-1 space-y-1">
                      <li>To process your orders, arrange nationwide delivery, and handle returns.</li>
                      <li>To provide accurate warranty tracking for purchased components and gadgets.</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-gray-900">B. Custom PC Builder</h3>
                    <ul className="list-disc pl-6 mt-1 space-y-1">
                      <li>To review your selected components for compatibility before assembly.</li>
                      <li>To provide tailored technical support and lifetime service records for your custom rig.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900">C. Domain & Hosting Services</h3>
                    <ul className="list-disc pl-6 mt-1 space-y-1">
                      <li>To register domain names on your behalf (requires sharing details with ICANN).</li>
                      <li>To allocate server resources, monitor uptime, and maintain infrastructure security.</li>
                      <li>To send administrative emails regarding server maintenance or SSL renewals.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data Sharing and Disclosure</h2>
                <p>
                  We strictly protect your privacy and do not sell your personal data. We only share information with authorized third parties when necessary:
                </p>
                <ul className="list-disc pl-6 mt-3 space-y-2">
                  <li><strong>Logistics Partners:</strong> Courier services (e.g., Pathao, RedX, Steadfast) require your phone number and address to deliver your Shop/PC orders.</li>
                  <li><strong>Domain Registries:</strong> ICANN and global registries require contact data to officially assign a domain name to you.</li>
                  <li><strong>Payment Processors:</strong> bKash, Nagad, and SSLCommerz process your payments securely off-site.</li>
                  <li><strong>Legal Compliance:</strong> If requested by law enforcement authorities in Bangladesh regarding fraudulent transactions or cybercrimes.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
                <p>
                  We implement robust security measures, including SSL encryption across our platform, secure Tier-3 data centers for our hosting nodes, and encrypted databases to protect your personal and financial information.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Contact Us</h2>
                <p>
                  If you have any questions or concerns about this Privacy Policy, your shopping history, PC warranty data, or hosting information, please contact our support team.
                </p>
              </section>`} />;
};

export default PrivacyPolicy;
