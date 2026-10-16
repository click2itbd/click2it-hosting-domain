import React from 'react';
import { DynamicPolicyPage } from '../../components/DynamicPolicyPage';

const RefundPolicy = () => {
  return <DynamicPolicyPage pageId="refund-policy" defaultTitle="Refund & Return Policy" defaultContent={`{isHosting ? (
                // --- HOSTING REFUND POLICY ---
                <>
                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">1. General Policy</h2>
                    <p>
                      At {settings.brandName}, customer satisfaction is our priority. We offer a 30-day money-back guarantee on select services, subject to the conditions outlined below.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Web Hosting Services</h2>
                    <p>
                      Shared hosting and VPS plans are eligible for a full refund within the first 30 days of service. If you are not satisfied, you may cancel your account within this period and request a refund by opening a support ticket.
                    </p>
                    <p className="mt-2 text-sm text-gray-500 italic border-l-4 border-gray-300 pl-3">
                      Note: Dedicated servers and custom infrastructure plans are non-refundable once provisioned due to the upfront hardware deployment costs.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Domain Registrations (Non-Refundable)</h2>
                    <p>
                      <strong>Domain registrations, renewals, and transfers are strictly non-refundable.</strong> Once a domain is registered, it belongs to you for the duration of the term and cannot be canceled or refunded. Please ensure the spelling is correct before purchasing.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Add-on Services</h2>
                    <p>
                      Additional services such as SSL certificates, dedicated IP addresses, WHOIS Privacy, and custom development/migration work are non-refundable once activated or initiated.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Violation of Terms</h2>
                    <p>
                      Accounts suspended or terminated due to a violation of our Terms of Service (e.g., hosting malware, phishing, spamming, copyright infringement) are immediately ineligible for any refund.
                    </p>
                  </section>
                </>
              ) : (
                // --- E-COMMERCE REFUND POLICY ---
                <>
                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">1. General Return Policy</h2>
                    <p>
                      At {settings.brandName}, we strive to deliver the exact authentic products you order. You may return a physical hardware product within 3 days of delivery if the item is entirely dead on arrival (DOA), has a manufacturing defect out-of-the-box, or if the wrong item was delivered.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Conditions for Return</h2>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>The product must be unused and in the exact same condition that you received it.</li>
                      <li>It must be in the original intact packaging, with all manuals, accessories, and warranty cards included.</li>
                      <li>Products with broken warranty seals, torn boxes, or missing accessories will not be accepted for return or refund.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Non-Returnable Items</h2>
                    <p>
                      The following items cannot be returned or refunded once purchased:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 mt-2">
                      <li>Opened software, license keys, or digital games.</li>
                      <li>Printers with installed ink cartridges.</li>
                      <li>Any product that exhibits physical damage, burn marks, or liquid damage (these void warranty and return eligibility).</li>
                      <li>Custom built PCs (unless individual components are defective, which fall under the RMA warranty process).</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Refund Processing</h2>
                    <p>
                      Once your returned item is received and inspected by our technical team, we will notify you of the approval or rejection of your refund. If approved, your refund will be processed back to your original payment method (bKash/Bank/Card) within 5 to 7 working days.
                    </p>
                    <p className="mt-2 text-sm text-gray-500 italic border-l-4 border-gray-300 pl-3">
                      Please note: Courier or delivery charges are strictly non-refundable and will be deducted from the final refund amount.
                    </p>
                  </section>
                </>
              )}

              <section className="bg-blue-50 p-6 rounded-xl mt-8">
                <h2 className="text-xl font-bold text-blue-900 mb-2">How to Request a {isHosting ? 'Refund' : 'Return'}</h2>
                <p className="text-blue-800 text-sm">
                  To initiate a {isHosting ? 'refund' : 'return'}, please contact our billing and support team at <strong>{settings.contactEmail}</strong> or call us at <strong>{settings.contactPhone}</strong> with your Order/Invoice ID.
                </p>
              </section>`} />;
};

export default RefundPolicy;
