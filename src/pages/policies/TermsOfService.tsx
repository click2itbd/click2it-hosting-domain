import React from 'react';
import { Layout } from '../../components/Layout';
import { SEO } from '../../components/SEO';

const TermsOfService = () => {
  return (
    <Layout fullWidth>
      <SEO title="Terms of Service - Click2IT BD" description="Terms of Service for Click2IT BD hosting and domain services." />
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Terms of Service</h1>
            <p className="text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
            
            <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using the services provided by Click2IT BD ("we," "us," or "our"), you agree to comply with and be bound by these Terms of Service. If you do not agree with these terms, please do not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Service Provision</h2>
                <p>
                  Click2IT BD provides web hosting, domain registration, and related digital services. We reserve the right to modify, suspend, or discontinue any part of our services at any time with or without notice.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">3. User Responsibilities</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You must provide accurate and complete information during registration.</li>
                  <li>You are responsible for maintaining the security of your account credentials.</li>
                  <li>You agree not to use our servers for spamming, malware distribution, or any illegal activities.</li>
                  <li>You must not host copyrighted material without permission.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Payment and Billing</h2>
                <p>
                  All services are billed on a prepaid basis. Failure to pay for services by the due date will result in suspension or termination of your account. Prices are subject to change with 30 days prior notice.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Domain Registration</h2>
                <p>
                  Domain registrations are subject to the terms and conditions of ICANN and the respective domain registries. Click2IT BD acts only as a reseller. Registered domains are non-refundable once activated.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Account Termination</h2>
                <p>
                  We reserve the right to suspend or terminate accounts that violate these Terms of Service. In cases of severe violations (e.g., phishing, malware hosting), termination will be immediate without prior notice or refund.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Limitation of Liability</h2>
                <p>
                  Click2IT BD shall not be liable for any data loss, downtime, or business interruption. It is the customer's responsibility to maintain off-site backups of their data. Our total liability is limited to the amount paid for the service during the previous billing cycle.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Contact Information</h2>
                <p>
                  If you have any questions about these Terms of Service, please contact us at <strong>info@click2itbd.com</strong>.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TermsOfService;
