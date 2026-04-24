import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Terms() {
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
          <h1 className="text-4xl font-extrabold text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-[#4B5563]">Last updated: April 23, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Agreement to Terms</h2>
            <p className="text-slate-300 leading-relaxed">
              By accessing and using Raven, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Service Description</h2>
            <p className="text-slate-300 leading-relaxed">
              Raven is an AI-powered financial advisory platform designed to help solo founders manage their finances, track compliance requirements, and make informed financial decisions. The service includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 mt-4">
              <li>AI-powered financial analysis and insights</li>
              <li>Expense and revenue tracking</li>
              <li>Compliance deadline management</li>
              <li>Financial scenario planning</li>
              <li>Conversational AI assistance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">User Responsibilities</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              You agree to use Raven only for lawful purposes and in a way that does not infringe upon the rights of others or restrict their use and enjoyment of the application. Prohibited behavior includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300">
              <li>Harassing or causing distress or inconvenience to any person</li>
              <li>Disrupting the normal flow of dialogue within Raven</li>
              <li>Attempting to access, hack, or decompile the application</li>
              <li>Using the service to upload malware or illegal content</li>
              <li>Reselling or redistributing Raven access without authorization</li>
              <li>Engaging in fraudulent activity or financial crimes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Data Ownership</h2>
            <p className="text-slate-300 leading-relaxed">
              You retain full ownership and control of all financial data, documents, and messages you upload to or create within Raven. We act as a service provider to help you manage and analyze this data. By uploading data to Raven, you grant us a non-exclusive, worldwide license to process, store, and display your data as necessary to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Disclaimer of Warranties</h2>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">NOT FINANCIAL ADVICE</h3>
                <p className="text-slate-300 leading-relaxed">
                  Raven and its AI-generated insights are provided for informational purposes only and do not constitute financial, accounting, legal, or tax advice. The information provided is not a substitute for professional advice from a qualified accountant, bookkeeper, tax advisor, or financial advisor.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">AS-IS SERVICE</h3>
                <p className="text-slate-300 leading-relaxed">
                  Raven is provided on an "as-is" and "as-available" basis. We make no warranties, expressed or implied, regarding the service, including but not limited to any warranties of merchantability, fitness for a particular purpose, or non-infringement.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">NO ACCURACY GUARANTEE</h3>
                <p className="text-slate-300 leading-relaxed">
                  While we strive for accuracy, AI-generated analysis may contain errors, omissions, or inaccuracies. You are responsible for verifying all information before relying on it for business decisions.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h2>
            <p className="text-slate-300 leading-relaxed">
              To the fullest extent permitted by law, Raven and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to damages for loss of profits, revenue, data, use, or other intangible losses arising from:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 mt-4">
              <li>Your use of or inability to use Raven</li>
              <li>Reliance on information or advice provided by the AI</li>
              <li>Unauthorized access or alteration of your data</li>
              <li>Third-party services or APIs used by Raven</li>
            </ul>
            <p className="text-slate-300 leading-relaxed mt-4">
              In no case shall Raven's total liability exceed the amount you paid for the service in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Indemnification</h2>
            <p className="text-slate-300 leading-relaxed">
              You agree to indemnify and hold harmless Raven, its owners, employees, and agents from any claims, damages, losses, and expenses arising from your use of Raven, violation of these Terms, or infringement of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Termination</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              We reserve the right to terminate or suspend your account and access to Raven at any time, with or without cause, and without notice. Upon termination:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300">
              <li>Your right to use Raven immediately ceases</li>
              <li>We may delete your data according to our data retention policy</li>
              <li>You may request an export of your data before deletion</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">User Disputes</h2>
            <p className="text-slate-300 leading-relaxed">
              Raven is in beta and we're continuously improving. If you encounter issues or have disputes regarding the service, please contact us. We aim to resolve disputes fairly and promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Compliance with Laws</h2>
            <p className="text-slate-300 leading-relaxed">
              You agree to comply with all applicable local, state, national, and international laws and regulations. You are responsible for complying with all tax, accounting, and financial reporting requirements in your jurisdiction. Raven cannot provide guidance on jurisdiction-specific requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Changes to Terms</h2>
            <p className="text-slate-300 leading-relaxed">
              We may update these Terms of Service at any time. Your continued use of Raven following the posting of revised Terms means that you accept and agree to the changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Contact & Support</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              For questions about these Terms of Service or to report violations, contact us at:
            </p>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-6">
              <p className="text-slate-300">
                <strong>Email:</strong> support@raven.app<br />
                <strong>Response Time:</strong> We aim to respond within 48 hours
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Severability</h2>
            <p className="text-slate-300 leading-relaxed">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.
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

export default Terms;
