/**
 * Programs Constants
 *
 * Centralized program metadata for use across pages.
 */

export interface Program {
  slug: string
  name: string
  tagline: string
  description: string
  href: string
  color: 'neon' | 'magenta' | 'purple'
  ages?: string
  grades?: string
}

export const PROGRAMS: Program[] = [
  {
    slug: 'all-girls-sports-camp',
    name: 'All Girls Sports Camp',
    tagline: 'An introductory multi-sport camp for girls, by girls.',
    description:
      'Athletes learn multiple popular sports in a welcoming, safe, and competitive environment with their friends. They explore new sports, build fundamentals, and compete for team points as they discover what they love.',
    href: '/programs/all-girls-sports-camp',
    color: 'neon',
    grades: '1st–8th grade',
  },
  {
    slug: 'cit-program',
    name: 'CIT Program',
    tagline: 'Hands-on leadership and coaching experience for high school girls.',
    description:
      'Our Coaches-in-Training program gives teen athletes real leadership reps on the field, guided mentoring, and career-ready certifications that shine on resumes and college applications.',
    href: '/programs/cit-program',
    color: 'magenta',
    ages: 'High school',
  },
  {
    slug: 'soccer-and-strength',
    name: 'Soccer & Strength',
    tagline: 'Indoor technical soccer plus strength training for serious players.',
    description:
      'A focused environment for the dedicated soccer player who wants to level up her game through high-rep technical work, 1v1 attacking, and smart strength training built for female athletes.',
    href: '/programs/soccer-and-strength',
    color: 'purple',
    grades: '6th–12th grade',
  },
]

export const SPORTS_LIST = [
  { name: 'Volleyball', icon: 'volleyball' },
  { name: 'Basketball', icon: 'basketball' },
  { name: 'Flag Football', icon: 'football' },
  { name: 'Soccer', icon: 'soccer' },
  { name: 'Lacrosse', icon: 'lacrosse' },
  { name: 'Track & Field', icon: 'running' },
  { name: 'Intro to Weightlifting', icon: 'dumbbell' },
]

export const CAMP_SCHEDULE = [
  {
    time: 'Morning',
    title: 'Welcome & First Sport Block',
    description: 'Check-in, warm-up, and dive into the first sport rotation.',
  },
  {
    time: 'Midday',
    title: 'Sport Rotations & Game-Based Learning',
    description: 'Athletes rotate through additional sports with skill-building and small-sided games.',
  },
  {
    time: 'Afternoon',
    title: 'Team Competitions & Leadership Moments',
    description: 'Team point competitions, leadership opportunities, and closing huddle.',
  },
]

export const VALUE_PILLARS = [
  {
    title: 'Confidence Comes First',
    description:
      'Girls leave camp feeling capable, brave, and ready to take on new challenges. We celebrate effort and build self-belief through every activity.',
    color: 'neon',
  },
  {
    title: 'Skill-Driven, Fun-Focused',
    description:
      'Real drills, real coaching, real improvement—wrapped in an environment that keeps girls engaged, moving, and having fun.',
    color: 'magenta',
  },
  {
    title: 'An All-Girls Community',
    description:
      'Girls build lasting friendships with teammates who become like sisters. Our camps create a culture where athletes lift each other up.',
    color: 'purple',
  },
]

export const CIT_RESPONSIBILITIES = [
  'Help lead drills and support coaches in station work',
  'Encourage and mentor younger athletes',
  'Assist with check-in, transitions, and game organization',
  'Model effort, attitude, and leadership for campers',
]

export const CIT_FAQ = [
  {
    question: 'Do I need prior coaching experience?',
    answer:
      'No prior coaching experience is required—just a willingness to learn, some playing experience, and a desire to serve younger athletes.',
  },
  {
    question: 'Can this count toward volunteer or community service hours?',
    answer:
      'In most cases, yes! Check with your school or organization, and we can provide documentation of your hours and contributions.',
  },
  {
    question: 'What certifications will I receive?',
    answer:
      'CITs receive a leadership certificate, documented coaching hours, and endorsements that look great on resumes and college applications.',
  },
]

export const SOCCER_SKILLS = {
  soccer: [
    '1v1 attacking and defending',
    'First touch and ball mastery',
    'Finishing in tight spaces',
    'Decision-making in small-sided games',
  ],
  strength: [
    'Bodyweight and basic strength movements',
    'Form, mechanics, and progression',
    'Injury-prevention focus for female athletes',
    'Age-appropriate conditioning',
  ],
}

export const BASKETBALL_PILLARS = [
  {
    title: 'Handles & Footwork',
    description:
      'Ball-handling progressions, change of pace, change of direction, and footwork that translates to real game situations.',
    color: 'neon',
  },
  {
    title: 'Scoring & Shooting Reps',
    description:
      'Form work, finishing at the rim, pull-up and catch-and-shoot reps from game spots, all with a focus on repeatable mechanics.',
    color: 'magenta',
  },
  {
    title: 'Game IQ & Competitive Play',
    description:
      'Small-sided games, 1v1/2v2/3v3 scenarios, and situational reads that help athletes see the floor and make better decisions under pressure.',
    color: 'purple',
  },
]
