/**
 * CIT Program Page
 *
 * Coaches-In-Training program for high school girls.
 */

import { Metadata } from 'next'
import Link from 'next/link'
import { Award, Users, BookOpen, Star, CheckCircle, ChevronDown } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import ProgramHero from '@/components/programs/ProgramHero'
import TwoColumnSection from '@/components/programs/TwoColumnSection'
import PillarCard from '@/components/programs/PillarCard'
import { CIT_RESPONSIBILITIES, CIT_FAQ } from '@/lib/constants/programs'

export const metadata: Metadata = {
  title: 'CIT Program | Empowered Athletes',
  description:
    'Hands-on leadership experience and career-ready certifications for high school girls who want to coach, mentor, and lead.',
}

export default function CITProgramPage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Hero */}
      <ProgramHero
        badge="Leadership Track"
        title="Coaches-In-Training"
        titleAccent="(CIT) Program"
        subtitle="Hands-on leadership experience and career-ready certifications for high school girls."
        description="Giving girls equal opportunity and access in the world of sports, this CIT Program offers leadership training, hands-on coaching experience, and real career certifications that shine on resumes and college applications. Open to all high school female athletes who see themselves as leaders within the field of athletics."
        primaryCta={{ label: 'Apply as a CIT', href: '/programs/cit-program/apply' }}
        secondaryCta={{ label: 'Learn More', href: '#what-cits-do' }}
        accentColor="magenta"
      />

      {/* Who It's For */}
      <TwoColumnSection
        label="Who It's For"
        title="Future Leaders"
        titleAccent="Welcome"
        accentColor="magenta"
        imagePosition="left"
        content={
          <>
            <p>
              High school girls who love sports, want to serve younger athletes, and are
              ready to grow as leaders on and off the field.
            </p>
            <p>
              If you see yourself as someone who can inspire, encourage, and mentor
              younger girls—this program is for you. No prior coaching experience required,
              just heart and commitment.
            </p>
            <div className="pt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-magenta/10 border border-magenta/30 text-magenta text-sm">
                <CheckCircle className="h-4 w-4" />
                High School Athletes
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 text-sm">
                Leadership-minded
              </span>
            </div>
          </>
        }
      />

      {/* What CITs Do */}
      <section id="what-cits-do" className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple/5 rounded-full blur-[150px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Text content */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-purple mb-4 block">
                On-Field Experience
              </span>
              <h2 className="headline-display headline-md text-white mb-6">
                What CITs Do <span className="text-magenta">At Camp</span>
              </h2>
              <p className="text-white/60 leading-relaxed mb-8">
                CITs aren't just helpers—they're junior leaders in training. Every day
                brings real responsibilities, real feedback, and real growth opportunities.
              </p>

              <ul className="space-y-4">
                {CIT_RESPONSIBILITIES.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-magenta/10 flex items-center justify-center mt-0.5">
                      <CheckCircle className="h-4 w-4 text-magenta" />
                    </div>
                    <span className="text-white/70">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pillars */}
            <div className="space-y-6">
              <PillarCard
                title="Lead By Example"
                description="Model effort, attitude, and sportsmanship for younger athletes watching your every move."
                color="magenta"
                icon={<Star className="h-8 w-8 text-magenta" />}
              />
              <PillarCard
                title="Mentor & Encourage"
                description="Build connections with campers, offer encouragement, and help them believe in themselves."
                color="purple"
                icon={<Users className="h-8 w-8 text-purple" />}
              />
              <PillarCard
                title="Learn & Grow"
                description="Receive real-time feedback from experienced coaches and develop your own leadership style."
                color="neon"
                icon={<BookOpen className="h-8 w-8 text-neon" />}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Training & Certifications */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/50 to-black" />

        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-magenta/5 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-neon mb-4 block">
              Real Credentials
            </span>
            <h2 className="headline-display headline-md text-white mb-6">
              Training & <span className="text-magenta">Certifications</span>
            </h2>
            <p className="text-white/60">
              The CIT Program isn't just about showing up—it's a structured leadership
              development experience with tangible outcomes.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            <div className="bg-dark-100/50 border border-white/10 p-6 text-center">
              <div className="w-12 h-12 bg-neon/10 mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-neon" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Pre-Camp Training</h3>
              <p className="text-white/60 text-sm">
                Complete training modules (online or in-person) covering leadership
                fundamentals, safety, and coaching basics before camp begins.
              </p>
            </div>

            <div className="bg-dark-100/50 border border-white/10 p-6 text-center">
              <div className="w-12 h-12 bg-magenta/10 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-6 w-6 text-magenta" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">On-Field Evaluation</h3>
              <p className="text-white/60 text-sm">
                Receive ongoing feedback from experienced coaches throughout camp,
                with specific guidance on your strengths and growth areas.
              </p>
            </div>

            <div className="bg-dark-100/50 border border-white/10 p-6 text-center">
              <div className="w-12 h-12 bg-purple/10 mx-auto mb-4 flex items-center justify-center">
                <Award className="h-6 w-6 text-purple" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Certifications</h3>
              <p className="text-white/60 text-sm">
                Earn a leadership certificate, documented coaching hours, and
                endorsements perfect for resumes and college applications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Matters */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/30 to-black" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple/5 rounded-full blur-[200px]" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-magenta mb-4 block">
            The Bigger Picture
          </span>
          <h2 className="headline-display headline-md text-white mb-6">
            Why This Program <span className="text-neon">Matters</span>
          </h2>
          <p className="text-xl text-white/70 leading-relaxed mb-6">
            We want to raise up the next generation of women leaders in sports.
          </p>
          <p className="text-white/60 leading-relaxed max-w-2xl mx-auto">
            The CIT Program gives teen girls a chance to see themselves not just as
            athletes, but as coaches, mentors, and role models. When a young camper
            looks up and sees a high school girl leading her group with confidence,
            she sees what's possible for herself. That's the cycle we're building.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-dark-100/50 to-black" />

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-purple mb-4 block">
              Questions
            </span>
            <h2 className="headline-display headline-sm text-white mb-6">
              Frequently Asked <span className="text-magenta">Questions</span>
            </h2>
          </div>

          <div className="space-y-4">
            {CIT_FAQ.map((item, index) => (
              <div
                key={index}
                className="bg-dark-100/50 border border-white/10 p-6"
              >
                <div className="flex items-start gap-3">
                  <ChevronDown className="h-5 w-5 text-magenta flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-white mb-2">{item.question}</h3>
                    <p className="text-white/60 text-sm">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-dark-100/50 to-black" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="headline-display headline-sm text-white mb-6">
            Ready To Lead?
          </h2>
          <p className="text-white/60 mb-10 max-w-2xl mx-auto">
            Start your CIT application and take the first step toward becoming a
            leader, mentor, and role model for the next generation of girl athletes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/programs/cit-program/apply"
              className={buttonVariants({ variant: 'magenta', size: 'lg' })}
            >
              Start Your Application
            </Link>
            <Link
              href="/contact"
              className={buttonVariants({ variant: 'outline-neon-purple', size: 'lg' })}
            >
              Ask a Question
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
