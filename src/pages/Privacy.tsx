import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Header */}
      <div className="border-b border-white/[0.08] bg-white/[0.02]">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-sm text-[#4B5563] hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
          <h1 className="text-4xl font-extrabold text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-[#4B5563]">Last updated: April 23, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
            <p className="text-slate-300 leading-relaxed">
              Raven ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Data We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Financial Data</h3>
                <p className="text-slate-300 leading-relaxed">
                  You may voluntarily upload or input financial information including transactions, invoices, revenue data, expenses, and other accounting records. This data remains under your control and belongs to you.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Chat Messages</h3>
                <p className="text-slate-300 leading-relaxed">
                  We store your chat messages and our responses to provide conversation history, improve our AI models, and deliver better financial guidance. Messages are encrypted and securely stored.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Usage Metrics</h3>
                <p className="text-slate-300 leading-relaxed">
                  We collect anonymous usage data including features accessed, time spent in the app, and interaction patterns. This helps us understand how you use Raven and improve your experience.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Account Information</h3>
                <p className="text-slate-300 leading-relaxed">
                  When you register, we collect your email address, password (hashed), full name, and company name.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-3 text-slate-300">
              <li>Provide, maintain, and improve our AI financial advisory service</li>
              <li>Generate personalized insights and recommendations based on your financial data</li>
              <li>Process API requests to Anthropic Claude for AI-powered analysis</li>
              <li>Detect and prevent fraudulent activity and security breaches</li>
              <li>Send service announcements and customer support responses</li>
              <li>Understand usage patterns to develop new features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Data Storage & Security</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Supabase Storage</h3>
                <p className="text-slate-300 leading-relaxed">
                  All your data is securely stored in Supabase, which uses industry-standard encryption. We employ Row-Level Security (RLS) policies to ensure only you can access your data. Your financial information is encrypted at rest and in transit using AES-256 encryption.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">AI Processing</h3>
                <p className="text-slate-300 leading-relaxed">
                  When you ask questions or request analysis, your messages and relevant financial data are sent to Anthropic's Claude API for processing. Anthropic does not retain this data after processing unless you have a separate agreement with them. For details, see Anthropic's privacy policy.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Data Retention</h2>
            <p className="text-slate-300 leading-relaxed">
              We retain your data for as long as your account is active. You may request deletion of your account and all associated data at any time. Some data may be retained for legal or regulatory compliance purposes for a limited period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Your Rights</h2>
            <ul className="list-disc list-inside space-y-3 text-slate-300">
              <li><strong>Access:</strong> You can access all your data through the application</li>
              <li><strong>Export:</strong> You can export your financial data and chat history at any time</li>
              <li><strong>Delete:</strong> You can request deletion of your account and all personal data</li>
              <li><strong>Control:</strong> You control what data you upload and share with the AI</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Third-Party Services</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Raven uses the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300">
              <li><strong>Supabase:</strong> Database and authentication</li>
              <li><strong>Anthropic Claude API:</strong> AI-powered financial analysis</li>
              <li><strong>Sentry:</strong> Error tracking and performance monitoring (anonymous)</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-4">
              These services have their own privacy policies, and we encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Children's Privacy</h2>
            <p className="text-slate-300 leading-relaxed">
              Raven is not intended for users under the age of 18. We do not knowingly collect personal information from children. If we learn that we have collected personal information from a child without parental consent, we will delete such information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
            <p className="text-slate-300 leading-relaxed">
              If you have questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-6 mt-4">
              <p className="text-slate-300">
                <strong>Email:</strong> privacy@raven.app<br />
                <strong>Response Time:</strong> We aim to respond within 7 business days
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Policy Changes</h2>
            <p className="text-slate-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date and posting the new policy in the application. Your continued use of Raven after changes constitutes your acceptance of the updated Privacy Policy.
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.08] bg-white/[0.02] mt-12">
        <div className="max-w-3xl mx-auto px-6 py-8 text-center text-sm text-[#4B5563]">
          <p>© 2026 Raven. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default Privacy;
