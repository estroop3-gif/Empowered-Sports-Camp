/**
 * FAQ Constants
 *
 * All FAQ content for the public FAQ page.
 * Organized by category for easy management and extension.
 */

export interface FaqItem {
  question: string
  answer: string
}

export interface FaqCategory {
  id: string
  title: string
  description?: string
  items: FaqItem[]
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'registration',
    title: 'Registration & Logistics',
    items: [
      {
        question: 'What ages can attend Empowered Sports Camp?',
        answer:
          'Our camps are designed for girls ages 5–17. Certain camps or sessions may target narrower age ranges (for example, 5–10 or 11–14), but the overall camp system is built to serve elementary through high school athletes. Each camp page clearly lists the age/grade range so you can be sure your athlete is in the right group.',
      },
      {
        question: "My daughter is brand new to sports. Is this camp still for her?",
        answer:
          "Yes. Empowered is an intro-to-competitive environment. We create space for beginners to learn the basics, try multiple sports, and experience the fun of competing without the pressure of tryouts or making a roster. Our staff is trained to meet girls where they are – whether they're trying something new or already love to play.",
      },
      {
        question: 'How do I register for a camp?',
        answer:
          "You can browse all active camps on our 'Find a Camp' page, choose a location and date that works for you, and complete registration and payment directly online. Once you register, you'll receive a confirmation email with everything you need to know before camp starts.",
      },
      {
        question: 'Can I sign up more than one child?',
        answer:
          "Absolutely. During registration, you'll be able to add multiple athletes under the same parent account. Each athlete can be enrolled in the same camp or different camps depending on their age and interests.",
      },
    ],
  },
  {
    id: 'experience',
    title: 'Camp Experience',
    items: [
      {
        question: 'What does a typical camp day look like?',
        answer:
          'A camp day usually includes a welcome and warm-up, skill blocks by sport, small-sided games or scrimmages, leadership and confidence-building moments, and a closing huddle. Girls rotate through sports and activities so they stay engaged, learn something new, and leave camp feeling tired in the best way.',
      },
      {
        question: 'What should my daughter bring to camp?',
        answer:
          "We'll send a camp-specific packing list after you register, but in general we recommend: athletic clothes, sneakers or sport-appropriate shoes, a refillable water bottle, sunscreen, and any medically necessary items (like inhalers). For sport-specific camps, shin guards or other gear may be recommended.",
      },
      {
        question: 'How are campers grouped?',
        answer:
          'Campers are grouped by age/grade, skill level, and occasionally by friend requests when possible. Our grouping system is designed so girls are challenged but not overwhelmed, and so they have at least one familiar face in their group when requested.',
      },
      {
        question: 'Are boys allowed to attend?',
        answer:
          'Empowered Sports Camp is intentionally all-girls and women-led. We believe there is huge value in giving girls a space of their own to compete, grow, and lead. Boys are not currently included in our camp model.',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety & Policies',
    items: [
      {
        question: 'What safety measures do you have in place?',
        answer:
          'Safety is non-negotiable. All staff and Coaches-in-Training go through orientation and training that covers emergency procedures, injury response, communication, and camper protection policies. We maintain appropriate camper-to-coach ratios, run structured check-in and check-out with QR codes, and partner only with facilities that meet our standards.',
      },
      {
        question: 'How does drop-off and pick-up work?',
        answer:
          "Each camp uses a secure check-in and check-out process. At drop-off, you'll check your athlete in at the designated area. At pick-up, we verify your athlete against your parent account and daily pickup code before releasing them. Details will be included in your pre-camp email.",
      },
      {
        question: 'What if my child has medical needs or allergies?',
        answer:
          "You'll have the opportunity to share medical information and allergies during registration and at camp check-in. Please be as detailed as possible. Our staff uses that information to plan safely, and directors are trained to respond appropriately if an issue comes up.",
      },
      {
        question: 'What is your behavior policy?',
        answer:
          'We expect every athlete and staff member to help us create a safe, encouraging environment. Bullying, harassment, or unsafe behavior is not tolerated. If there is an issue, our staff will address it quickly with the athlete and parent, and we reserve the right to remove a camper from a session if needed to protect the group.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Refunds',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer:
          'All registrations are handled online through our secure checkout. We accept major credit and debit cards. Some locations may also offer payment plans or discounts; see the individual camp page for details.',
      },
      {
        question: "Do you offer refunds if we can't attend?",
        answer:
          "Refund policies can vary slightly by location, but generally we offer partial refunds or credits if you cancel by a certain date before camp begins. Once camp has started, refunds are limited. Each camp page lists the specific refund policy, and you'll see it again at checkout.",
      },
      {
        question: 'Are scholarships or financial assistance available?',
        answer:
          "We never want finances to be the only barrier. Some locations offer scholarships or reduced tuition funded by partners and community supporters. If you need assistance, reach out through our contact form and select 'General Question' with a note about scholarship interest.",
      },
    ],
  },
  {
    id: 'cit-staff',
    title: 'Coaches-In-Training (CIT) & Staff',
    items: [
      {
        question: 'What is a Coaches-In-Training (CIT)?',
        answer:
          'Our Coaches-In-Training are high school girls who step into leadership roles at camp. They help lead drills, support younger athletes, and develop real coaching, communication, and mentoring skills. The CIT program is a powerful way to build confidence, earn experience, and stand out on college or job applications.',
      },
      {
        question: 'How does my high school athlete apply to be a CIT?',
        answer:
          "If your daughter is interested in the CIT program, she can apply through our site or via a specific camp's CIT application link. We'll ask about her sports background, leadership experience, and why she wants to serve younger athletes.",
      },
      {
        question: 'How do you select coaches and staff?',
        answer:
          'Our coaches and staff are carefully selected for both their knowledge of sport and their heart for developing girls. We look for women who are strong communicators, positive role models, and committed to creating an environment where girls feel safe, challenged, and seen.',
      },
    ],
  },
]

/**
 * Hero content for the FAQ page
 */
export const FAQ_HERO = {
  badge: 'FAQ',
  title: 'Frequently Asked Questions',
  subtitle: 'Everything you need to know before your athlete steps onto the field.',
  description:
    "If you're wondering how camp works, what your daughter should bring, or how our all-girls, women-led model works in real life, you're in the right place. Browse the questions below or reach out to us directly if you don't see your answer.",
  ctaText: 'Still have questions? Contact us',
  ctaHref: '/contact',
}
