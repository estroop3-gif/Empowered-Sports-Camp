/**
 * Terms of Service Page
 *
 * Legal terms and conditions for Empowered Athletes camp registration and services.
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service | Empowered Athletes',
  description: 'Terms of Service for Empowered Athletes sports camps and programs.',
}

export default function TermsOfServicePage() {
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
            Terms of Service
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
              1. Agreement to Terms
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                Welcome to Empowered Athletes. These Terms of Service ("Terms") govern your use of our website,
                mobile applications, and services, including camp registration, programs, and related activities
                (collectively, the "Services") operated by Empowered Athletes LLC ("Company," "we," "us," or "our").
              </p>
              <p>
                By accessing or using our Services, registering for a camp, or creating an account, you agree to
                be bound by these Terms. If you disagree with any part of these Terms, you may not access our Services.
              </p>
              <p>
                If you are registering a minor for our programs, you represent that you are the parent or legal
                guardian of that minor and agree to these Terms on their behalf.
              </p>
            </div>
          </section>

          {/* Eligibility */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              2. Eligibility
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                Our camp programs are designed for female athletes within specified age ranges as indicated for
                each program. Parents or legal guardians must register participants and agree to these Terms.
              </p>
              <p>
                You must be at least 18 years old to create an account and register participants. By using our
                Services, you represent and warrant that you meet this requirement.
              </p>
            </div>
          </section>

          {/* Registration and Payment */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              3. Registration and Payment
            </h2>
            <div className="text-white/70 space-y-4">
              <h3 className="text-lg font-semibold text-white">3.1 Registration Process</h3>
              <p>
                Camp registration requires complete and accurate information about the participant and
                parent/guardian. You agree to provide truthful information and update it as necessary.
              </p>

              <h3 className="text-lg font-semibold text-white">3.2 Payment Terms</h3>
              <p>
                Full payment is required at the time of registration unless otherwise specified. We accept
                major credit cards processed through our secure payment provider, Stripe. All prices are in
                US dollars unless otherwise indicated.
              </p>

              <h3 className="text-lg font-semibold text-white">3.3 Early Bird Pricing</h3>
              <p>
                Early bird pricing, when offered, is available until the specified deadline. After this date,
                standard pricing applies automatically.
              </p>

              <h3 className="text-lg font-semibold text-white">3.4 Sibling Discounts</h3>
              <p>
                Sibling discounts may be applied when registering multiple children from the same family for
                the same camp session. Discounts are applied automatically during checkout.
              </p>
            </div>
          </section>

          {/* Cancellation and Refund Policy */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              4. Cancellation and Refund Policy
            </h2>
            <div className="text-white/70 space-y-4">
              <h3 className="text-lg font-semibold text-white">4.1 Cancellation by Participant</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>More than 30 days before camp start:</strong> Full refund minus a $50 administrative fee.
                </li>
                <li>
                  <strong>14-30 days before camp start:</strong> 50% refund of the registration fee.
                </li>
                <li>
                  <strong>Less than 14 days before camp start:</strong> No refund available. Registration may be
                  transferred to another camp session within the same calendar year, subject to availability.
                </li>
              </ul>

              <h3 className="text-lg font-semibold text-white">4.2 Cancellation by Empowered Athletes</h3>
              <p>
                If we cancel a camp session due to insufficient enrollment, weather emergencies, or other
                circumstances beyond our control, you will receive a full refund or the option to transfer
                to another available session.
              </p>

              <h3 className="text-lg font-semibold text-white">4.3 No-Shows</h3>
              <p>
                Failure to attend camp without prior cancellation notice will not result in a refund.
              </p>

              <h3 className="text-lg font-semibold text-white">4.4 Add-On Purchases</h3>
              <p>
                Merchandise and add-on purchases are non-refundable once the order has been processed.
              </p>
            </div>
          </section>

          {/* Health and Safety */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              5. Health, Safety, and Medical Information
            </h2>
            <div className="text-white/70 space-y-4">
              <h3 className="text-lg font-semibold text-white">5.1 Medical Disclosure</h3>
              <p>
                Parents/guardians must disclose all relevant medical conditions, allergies, dietary restrictions,
                and special needs during registration. Failure to disclose pertinent health information may
                result in dismissal from camp without refund.
              </p>

              <h3 className="text-lg font-semibold text-white">5.2 Medical Authorization</h3>
              <p>
                By registering, you authorize Empowered Athletes staff to obtain emergency medical treatment
                for the participant if you cannot be reached in an emergency situation. You agree to be
                responsible for all medical expenses incurred.
              </p>

              <h3 className="text-lg font-semibold text-white">5.3 Illness Policy</h3>
              <p>
                Participants who are ill or showing symptoms of contagious illness should not attend camp.
                We reserve the right to send home any participant who appears ill. No refunds will be provided
                for missed days due to illness.
              </p>

              <h3 className="text-lg font-semibold text-white">5.4 Medications</h3>
              <p>
                All medications must be provided in original containers with clear dosage instructions.
                Medications will be administered only with written authorization from the parent/guardian.
              </p>
            </div>
          </section>

          {/* Assumption of Risk */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              6. Assumption of Risk and Liability Waiver
            </h2>
            <div className="text-white/70 space-y-4">
              <h3 className="text-lg font-semibold text-white">6.1 Inherent Risks</h3>
              <p>
                Participation in sports activities involves inherent risks, including but not limited to:
                physical injury, sprains, strains, fractures, concussions, heat-related illness, and in rare
                cases, serious injury or death. You acknowledge and accept these risks on behalf of the participant.
              </p>

              <h3 className="text-lg font-semibold text-white">6.2 Liability Waiver</h3>
              <p>
                To the fullest extent permitted by law, you agree to release, indemnify, and hold harmless
                Empowered Athletes LLC, its owners, officers, employees, coaches, volunteers, and agents from
                any and all liability, claims, demands, or causes of action arising from or related to the
                participant's involvement in our programs.
              </p>

              <h3 className="text-lg font-semibold text-white">6.3 Insurance</h3>
              <p>
                We recommend that all participants have adequate health and accident insurance coverage.
                Empowered Athletes does not provide medical insurance for participants.
              </p>
            </div>
          </section>

          {/* Code of Conduct */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              7. Code of Conduct
            </h2>
            <div className="text-white/70 space-y-4">
              <h3 className="text-lg font-semibold text-white">7.1 Participant Behavior</h3>
              <p>
                All participants are expected to demonstrate good sportsmanship, respect for coaches, staff,
                and fellow campers, and follow all camp rules and instructions. Bullying, harassment, violence,
                or any form of discrimination will not be tolerated.
              </p>

              <h3 className="text-lg font-semibold text-white">7.2 Dismissal</h3>
              <p>
                We reserve the right to dismiss any participant whose behavior is deemed disruptive, dangerous,
                or inconsistent with our values, without refund. Parents/guardians will be responsible for
                immediate pickup of dismissed participants.
              </p>

              <h3 className="text-lg font-semibold text-white">7.3 Parent/Guardian Conduct</h3>
              <p>
                Parents and guardians are also expected to conduct themselves respectfully when interacting
                with staff, coaches, and other families.
              </p>
            </div>
          </section>

          {/* Photo and Media Release */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              8. Photo and Media Release
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                By registering, you grant Empowered Athletes permission to photograph and record the participant
                during camp activities. These images and recordings may be used for promotional purposes,
                including but not limited to: website content, social media, marketing materials, and press releases.
              </p>
              <p>
                If you do not wish for your child to be photographed or recorded, you must notify us in writing
                prior to the start of camp. We will make reasonable efforts to accommodate such requests, though
                we cannot guarantee the participant will not appear incidentally in group photos or videos.
              </p>
            </div>
          </section>

          {/* Personal Property */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              9. Personal Property
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                Empowered Athletes is not responsible for lost, stolen, or damaged personal property. We
                recommend that participants leave valuables at home and clearly label all belongings with
                the participant's name.
              </p>
              <p>
                Lost and found items will be held for 30 days after the camp session ends. Unclaimed items
                will be donated to charity.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              10. Intellectual Property
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                All content on our website and in our programs, including but not limited to logos, text,
                graphics, images, videos, curriculum, and training materials, is the property of Empowered
                Athletes LLC and is protected by copyright and trademark laws.
              </p>
              <p>
                You may not reproduce, distribute, modify, or create derivative works from our content without
                prior written permission.
              </p>
            </div>
          </section>

          {/* Privacy */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              11. Privacy
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                Your use of our Services is also governed by our{' '}
                <Link href="/privacy" className="text-neon hover:underline">
                  Privacy Policy
                </Link>
                , which describes how we collect, use, and protect your personal information.
              </p>
            </div>
          </section>

          {/* Modifications */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              12. Modifications to Terms
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                We reserve the right to modify these Terms at any time. Changes will be effective immediately
                upon posting to our website. Your continued use of our Services after changes are posted
                constitutes acceptance of the modified Terms.
              </p>
              <p>
                For active registrations, material changes to these Terms will be communicated via email to
                the address on file.
              </p>
            </div>
          </section>

          {/* Governing Law */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              13. Governing Law and Dispute Resolution
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of
                Illinois, without regard to its conflict of law provisions.
              </p>
              <p>
                Any disputes arising from these Terms or your use of our Services shall be resolved through
                binding arbitration in accordance with the rules of the American Arbitration Association.
                The arbitration shall take place in Chicago, Illinois.
              </p>
              <p>
                You agree to waive any right to participate in a class action lawsuit or class-wide arbitration
                against Empowered Athletes.
              </p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              14. Limitation of Liability
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                To the maximum extent permitted by applicable law, Empowered Athletes LLC shall not be liable
                for any indirect, incidental, special, consequential, or punitive damages, or any loss of
                profits or revenues, whether incurred directly or indirectly, or any loss of data, use,
                goodwill, or other intangible losses.
              </p>
              <p>
                In no event shall our total liability exceed the amount you paid for the specific camp
                registration giving rise to the claim.
              </p>
            </div>
          </section>

          {/* Severability */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              15. Severability
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall
                be limited or eliminated to the minimum extent necessary so that these Terms shall otherwise
                remain in full force and effect.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wider text-neon">
              16. Contact Us
            </h2>
            <div className="text-white/70 space-y-4">
              <p>
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-white/5 border border-white/10 p-4 space-y-2">
                <p><strong className="text-white">Empowered Athletes LLC</strong></p>
                <p>Email: legal@empoweredathletes.com</p>
                <p>Phone: (312) 555-0123</p>
                <p>Address: Chicago, IL</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  )
}
