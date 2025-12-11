import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  ArrowLeft,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice, formatDateRange } from '@/lib/utils'

// Sample data - in production, this would come from Supabase
const CAMP_DETAILS = {
  'summer-week-1-lincoln-park': {
    id: '1',
    slug: 'summer-week-1-lincoln-park',
    name: 'Summer Week 1 - Lincoln Park',
    programType: 'All Girls Sports Camp',
    shortDescription:
      'A week-long multi-sport experience designed to build confidence, skills, and friendships.',
    description: `
      Join us for an incredible week of sports, fun, and empowerment at our flagship All Girls Sports Camp!

      Each day, campers rotate through multiple sports including soccer, basketball, volleyball, flag football, and more. Our experienced coaches create a supportive environment where every girl can discover her strengths and try new things.

      Beyond sports skills, we focus on building confidence, leadership, teamwork, and resilience. Your daughter will leave camp with new friends, new skills, and a stronger belief in herself.
    `,
    location: {
      name: 'Lincoln Park',
      address: '2045 N Lincoln Park West',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60614',
    },
    startDate: '2025-06-09',
    endDate: '2025-06-13',
    dailyStartTime: '9:00 AM',
    dailyEndTime: '3:00 PM',
    minAge: 6,
    maxAge: 12,
    capacity: 40,
    enrolledCount: 32,
    price: 29900,
    earlyBirdPrice: 27900,
    earlyBirdDeadline: '2025-05-01',
    sports: ['Soccer', 'Basketball', 'Volleyball', 'Flag Football', 'Lacrosse', 'Softball'],
    highlights: [
      'Multi-sport experience with expert coaching',
      'Small group sizes for personalized attention',
      'Focus on confidence and leadership',
      'Daily swimming (optional)',
      'Healthy snacks provided',
      'End-of-week showcase for families',
    ],
    whatToBring: [
      'Athletic clothes and sneakers',
      'Sunscreen (applied before arrival)',
      'Water bottle (labeled)',
      'Packed lunch (nut-free)',
      'Swimsuit and towel (for swim days)',
      'Hat or visor',
    ],
    schedule: [
      { time: '9:00 AM', activity: 'Check-in & Morning Circle' },
      { time: '9:30 AM', activity: 'Sport Rotation 1' },
      { time: '10:30 AM', activity: 'Snack Break' },
      { time: '10:45 AM', activity: 'Sport Rotation 2' },
      { time: '11:45 AM', activity: 'Leadership Activity' },
      { time: '12:15 PM', activity: 'Lunch' },
      { time: '1:00 PM', activity: 'Sport Rotation 3' },
      { time: '2:00 PM', activity: 'Free Play / Swimming' },
      { time: '2:45 PM', activity: 'Closing Circle & Pickup' },
    ],
    faqs: [
      {
        question: 'What if my daughter has never played these sports before?',
        answer:
          'No experience necessary! Our camps are designed for all skill levels. Coaches break down fundamentals and create an encouraging environment for every camper.',
      },
      {
        question: 'What is the camper-to-coach ratio?',
        answer:
          'We maintain a 8:1 camper-to-coach ratio to ensure personalized attention and safety.',
      },
      {
        question: 'Is there extended care available?',
        answer:
          'Yes! We offer before-care starting at 8:00 AM and after-care until 5:30 PM for an additional fee.',
      },
      {
        question: 'What happens if it rains?',
        answer:
          'We have indoor backup facilities and modified programming for inclement weather. Camp runs rain or shine!',
      },
    ],
  },
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const camp = CAMP_DETAILS[slug as keyof typeof CAMP_DETAILS]

  if (!camp) {
    return {
      title: 'Camp Not Found',
    }
  }

  return {
    title: camp.name,
    description: camp.shortDescription,
  }
}

export default async function CampDetailPage({ params }: PageProps) {
  const { slug } = await params
  const camp = CAMP_DETAILS[slug as keyof typeof CAMP_DETAILS]

  if (!camp) {
    notFound()
  }

  const spotsLeft = camp.capacity - camp.enrolledCount
  const isFull = spotsLeft === 0
  const isLowAvailability = spotsLeft > 0 && spotsLeft <= 5
  const isEarlyBird = new Date() < new Date(camp.earlyBirdDeadline)
  const currentPrice = isEarlyBird ? camp.earlyBirdPrice : camp.price

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/camps"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all camps
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div>
                <Badge variant="default" className="mb-4">
                  {camp.programType}
                </Badge>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  {camp.name}
                </h1>
                <p className="mt-4 text-lg text-gray-600">{camp.shortDescription}</p>
              </div>

              {/* Quick Info */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span>
                    {camp.location.name}, {camp.location.city}, {camp.location.state}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span>{formatDateRange(camp.startDate, camp.endDate)}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span>
                    {camp.dailyStartTime} - {camp.dailyEndTime}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Users className="h-5 w-5 text-gray-400" />
                  <span>Ages {camp.minAge}-{camp.maxAge}</span>
                </div>
              </div>

              {/* Image Placeholder */}
              <div className="mt-8 aspect-[16/9] overflow-hidden rounded-xl bg-gradient-to-br from-primary-100 to-primary-200">
                <div className="flex h-full items-center justify-center">
                  <span className="text-6xl font-bold text-primary-300">E</span>
                </div>
              </div>
            </div>

            {/* Sticky Registration Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <div className="flex items-baseline justify-between">
                    <div>
                      {isEarlyBird && (
                        <Badge variant="success" className="mb-2">
                          Early Bird Pricing
                        </Badge>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">
                          {formatPrice(currentPrice)}
                        </span>
                        {isEarlyBird && (
                          <span className="text-lg text-gray-400 line-through">
                            {formatPrice(camp.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Availability */}
                  {isFull ? (
                    <div className="rounded-lg bg-red-50 p-4 text-center">
                      <p className="font-semibold text-red-700">Session is Full</p>
                      <p className="mt-1 text-sm text-red-600">
                        Join the waitlist to be notified of openings
                      </p>
                    </div>
                  ) : isLowAvailability ? (
                    <div className="rounded-lg bg-yellow-50 p-4 text-center">
                      <p className="font-semibold text-yellow-700">
                        Only {spotsLeft} spots left!
                      </p>
                      <p className="mt-1 text-sm text-yellow-600">
                        Register soon to secure your spot
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-green-50 p-4 text-center">
                      <p className="font-semibold text-green-700">
                        {spotsLeft} spots available
                      </p>
                    </div>
                  )}

                  {/* CTA Button */}
                  <Button
                    variant={isFull ? 'outline-neon' : 'neon'}
                    size="xl"
                    className="w-full"
                  >
                    {isFull ? 'Join Waitlist' : 'Register Now'}
                  </Button>

                  {/* Share */}
                  <Button variant="ghost" className="w-full gap-2">
                    <Share2 className="h-4 w-4" />
                    Share this camp
                  </Button>

                  {isEarlyBird && (
                    <p className="text-center text-sm text-gray-500">
                      Early bird pricing ends{' '}
                      {new Date(camp.earlyBirdDeadline).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-12">
            {/* About */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900">About This Camp</h2>
              <div className="mt-4 prose prose-gray max-w-none">
                {camp.description.split('\n').map((paragraph, i) => (
                  <p key={i} className="text-gray-600 leading-relaxed">
                    {paragraph.trim()}
                  </p>
                ))}
              </div>
            </section>

            {/* Sports */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900">Sports You&apos;ll Play</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {camp.sports.map((sport) => (
                  <Badge key={sport} variant="purple" className="text-sm">
                    {sport}
                  </Badge>
                ))}
              </div>
            </section>

            {/* Highlights */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900">What&apos;s Included</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {camp.highlights.map((highlight, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-gray-700">{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Schedule */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900">Daily Schedule</h2>
              <div className="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
                {camp.schedule.map((item, i) => (
                  <div
                    key={i}
                    className={`flex gap-4 px-6 py-4 ${
                      i !== camp.schedule.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <span className="w-24 flex-shrink-0 font-medium text-gray-900">
                      {item.time}
                    </span>
                    <span className="text-gray-600">{item.activity}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* What to Bring */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900">What to Bring</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {camp.whatToBring.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* FAQs */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900">
                Frequently Asked Questions
              </h2>
              <div className="mt-4 space-y-4">
                {camp.faqs.map((faq, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                      <p className="mt-2 text-gray-600">{faq.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          {/* Location Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Location</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Map Placeholder */}
                <div className="aspect-video rounded-lg bg-gray-200 mb-4">
                  <div className="flex h-full items-center justify-center text-gray-400">
                    Map
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900">{camp.location.name}</h3>
                <p className="mt-1 text-gray-600">
                  {camp.location.address}
                  <br />
                  {camp.location.city}, {camp.location.state} {camp.location.zipCode}
                </p>
                <Button variant="outline-neon" className="mt-4 w-full">
                  Get Directions
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
