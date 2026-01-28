/**
 * Privacy Policy Page
 *
 * Privacy policy for Empowered Athletes data collection and usage.
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | Empowered Athletes',
  description: 'Privacy Policy for Empowered Athletes - how we collect, use, and protect your information.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gradient-to-b from-dark-100 to-black py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-neon transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-white">
            Privacy Policy
          </h1>
          <p className="mt-4 text-white/60">
            Last updated: January 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-invert prose-lg max-w-none space-y-8">

          {/* Introduction */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              1. Introduction
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                Empowered Athletes LLC ("Company," "we," "us," or "our") respects your privacy and is committed
                to protecting your personal information. This Privacy Policy explains how we collect, use,
                disclose, and safeguard your information when you visit our website, use our mobile applications,
                register for our programs, or otherwise interact with our services.
              </p>
              <p>
                Please read this Privacy Policy carefully. By using our Services, you consent to the collection
                and use of information in accordance with this policy. If you do not agree with our policies
                and practices, please do not use our Services.
              </p>
            </div>
          </section>

          {/* Information We Collect */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              2. Information We Collect
            </h2>
            <div className="text-white/70 space-y-4">
              <h3 className="text-lg font-semibold text-white">2.1 Personal Information You Provide</h3>
              <p>We collect information you voluntarily provide, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Account Information:</strong> Name, email address, phone number, mailing address,
                  and password when you create an account.
                </li>
                <li>
                  <strong>Participant Information:</strong> Child's name, date of birth, gender, grade level,
                  t-shirt size, and other details needed for camp registration.
                </li>
                <li>
                  <strong>Medical Information:</strong> Allergies, medical conditions, medications, dietary
                  restrictions, and emergency contact information.
                </li>
                <li>
                  <strong>Payment Information:</strong> Credit card details and billing address (processed
                  securely through Stripe; we do not store full card numbers).
                </li>
                <li>
                  <strong>Communications:</strong> Messages, feedback, and inquiries you send us.
                </li>
              </ul>

              <h3 className="text-lg font-semibold text-white">2.2 Information Collected Automatically</h3>
              <p>When you use our Services, we may automatically collect:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Device Information:</strong> IP address, browser type, operating system, device
                  identifiers, and mobile network information.
                </li>
                <li>
                  <strong>Usage Data:</strong> Pages visited, time spent on pages, links clicked, and other
                  actions taken on our website.
                </li>
                <li>
                  <strong>Location Data:</strong> General geographic location based on IP address.
                </li>
                <li>
                  <strong>Cookies and Tracking:</strong> Information collected through cookies, web beacons,
                  and similar technologies.
                </li>
              </ul>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              3. How We Use Your Information
            </h2>
            <div className="text-white/70 space-y-4">
              <p>We use collected information for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Service Delivery:</strong> To process registrations, manage camp operations, and
                  provide our programs and services.
                </li>
                <li>
                  <strong>Communication:</strong> To send registration confirmations, camp updates, schedule
                  changes, and important announcements.
                </li>
                <li>
                  <strong>Safety:</strong> To ensure participant safety and respond to medical emergencies.
                </li>
                <li>
                  <strong>Payment Processing:</strong> To process transactions and prevent fraud.
                </li>
                <li>
                  <strong>Customer Support:</strong> To respond to inquiries and resolve issues.
                </li>
                <li>
                  <strong>Marketing:</strong> To send promotional materials about our programs (with your
                  consent, where required).
                </li>
                <li>
                  <strong>Improvement:</strong> To analyze usage patterns and improve our Services.
                </li>
                <li>
                  <strong>Legal Compliance:</strong> To comply with applicable laws and regulations.
                </li>
              </ul>
            </div>
          </section>

          {/* Information Sharing */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              4. How We Share Your Information
            </h2>
            <div className="text-white/70 space-y-4">
              <p>We may share your information in the following circumstances:</p>

              <h3 className="text-lg font-semibold text-white">4.1 Service Providers</h3>
              <p>
                We share information with third-party vendors who perform services on our behalf, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Payment processors (Stripe)</li>
                <li>Email service providers</li>
                <li>Cloud hosting providers (Amazon Web Services)</li>
                <li>Analytics providers</li>
              </ul>

              <h3 className="text-lg font-semibold text-white">4.2 Camp Staff and Coaches</h3>
              <p>
                Relevant participant information is shared with our coaches and staff members who need it to
                provide safe and effective programming.
              </p>

              <h3 className="text-lg font-semibold text-white">4.3 Legal Requirements</h3>
              <p>
                We may disclose information if required by law, court order, or government request, or when
                necessary to protect our rights, safety, or property.
              </p>

              <h3 className="text-lg font-semibold text-white">4.4 Emergency Situations</h3>
              <p>
                Medical information may be shared with healthcare providers in emergency situations.
              </p>

              <h3 className="text-lg font-semibold text-white">4.5 Business Transfers</h3>
              <p>
                In the event of a merger, acquisition, or sale of assets, your information may be transferred
                as part of that transaction.
              </p>

              <p className="font-semibold text-white mt-4">
                We do not sell your personal information to third parties for marketing purposes.
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              5. Children's Privacy
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                Our Services involve collecting information about children under 13 for camp registration
                purposes. We comply with the Children's Online Privacy Protection Act (COPPA) and only collect
                children's information with verifiable parental consent.
              </p>
              <p>
                Parents and guardians have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Review their child's personal information</li>
                <li>Request deletion of their child's information</li>
                <li>Refuse further collection of their child's information</li>
                <li>Consent to collection without consenting to disclosure to third parties</li>
              </ul>
              <p>
                To exercise these rights, please contact us using the information provided below.
              </p>
            </div>
          </section>

          {/* Data Security */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              6. Data Security
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                We implement appropriate technical and organizational measures to protect your personal
                information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encryption of data in transit (SSL/TLS) and at rest</li>
                <li>Secure authentication systems (AWS Cognito)</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls limiting employee access to personal data</li>
                <li>PCI-compliant payment processing through Stripe</li>
              </ul>
              <p>
                However, no method of transmission over the Internet or electronic storage is 100% secure.
                While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </div>
          </section>

          {/* Data Retention */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              7. Data Retention
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                We retain your personal information for as long as necessary to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide our Services and fulfill registration obligations</li>
                <li>Maintain records for legal and tax purposes (typically 7 years)</li>
                <li>Resolve disputes and enforce our agreements</li>
                <li>Comply with applicable laws and regulations</li>
              </ul>
              <p>
                You may request deletion of your account and associated data, subject to our legal retention
                requirements.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              8. Your Privacy Rights
            </h2>
            <div className="text-white/70 space-y-4">
              <p>Depending on your location, you may have the following rights:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Access:</strong> Request a copy of the personal information we hold about you.
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate or incomplete information.
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal information (subject to
                  certain exceptions).
                </li>
                <li>
                  <strong>Opt-Out:</strong> Opt out of marketing communications at any time.
                </li>
                <li>
                  <strong>Data Portability:</strong> Request your data in a portable format.
                </li>
              </ul>

              <h3 className="text-lg font-semibold text-white">California Residents (CCPA)</h3>
              <p>
                California residents have additional rights under the California Consumer Privacy Act,
                including the right to know what personal information is collected, request deletion, and
                opt out of the sale of personal information (we do not sell personal information).
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              9. Cookies and Tracking Technologies
            </h2>
            <div className="text-white/70 space-y-4">
              <p>We use cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Keep you logged into your account</li>
                <li>Remember your preferences</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Deliver relevant content and advertisements</li>
              </ul>
              <p>
                You can control cookies through your browser settings. Note that disabling cookies may
                affect the functionality of our Services.
              </p>

              <h3 className="text-lg font-semibold text-white">Types of Cookies We Use:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Essential Cookies:</strong> Required for basic website functionality.
                </li>
                <li>
                  <strong>Analytics Cookies:</strong> Help us understand how visitors use our site.
                </li>
                <li>
                  <strong>Preference Cookies:</strong> Remember your settings and preferences.
                </li>
              </ul>
            </div>
          </section>

          {/* Third-Party Links */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              10. Third-Party Links
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                Our Services may contain links to third-party websites or services. We are not responsible
                for the privacy practices of these third parties. We encourage you to review the privacy
                policies of any third-party sites you visit.
              </p>
            </div>
          </section>

          {/* Updates */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              11. Changes to This Privacy Policy
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                We may update this Privacy Policy from time to time. The updated version will be indicated
                by the "Last updated" date at the top of this page. We encourage you to review this Privacy
                Policy periodically.
              </p>
              <p>
                For material changes, we will notify you by email or through a prominent notice on our website
                prior to the changes becoming effective.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              12. Contact Us
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                If you have questions about this Privacy Policy or wish to exercise your privacy rights,
                please contact us:
              </p>
              <div className="bg-white/5 border border-white/10 p-4 space-y-2">
                <p><strong className="text-white">Empowered Athletes LLC</strong></p>
                <p>Privacy Inquiries</p>
                <p>Email: privacy@empoweredathletes.com</p>
                <p>Phone: (312) 555-0123</p>
                <p>Address: Chicago, IL</p>
              </div>
              <p className="text-sm">
                For general inquiries, please visit our{' '}
                <Link href="/contact" className="text-neon hover:underline">
                  Contact Page
                </Link>
                .
              </p>
            </div>
          </section>

          {/* Related Links */}
          <section className="pt-8 border-t border-white/10">
            <p className="text-white/50 text-sm">
              See also:{' '}
              <Link href="/terms" className="text-neon hover:underline">
                Terms of Service
              </Link>
            </p>
          </section>

        </div>
      </div>
    </main>
  )
}
