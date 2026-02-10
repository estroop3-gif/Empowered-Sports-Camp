'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Mail, ArrowRight, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RegistrationSavedPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const campName = searchParams.get('camp') || 'camp'

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-neon/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-16 sm:py-24">
        <div className="text-center space-y-6 mb-10">
          <div className="h-20 w-20 rounded-full bg-neon/10 border-2 border-neon flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-neon" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-white">
              Progress Saved!
            </h1>
            <p className="mt-3 text-white/60">
              Your registration for <span className="text-white font-semibold">{campName}</span> has been saved.
            </p>
          </div>
        </div>

        <div className="bg-dark-100 border border-white/10 p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4 p-4 bg-neon/5 border border-neon/20 rounded-lg">
            <Mail className="h-6 w-6 text-neon flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold">Check your email</p>
              <p className="text-sm text-white/60 mt-1">
                We&apos;ve sent a confirmation to <span className="text-white">{email}</span> with a link to
                continue your registration anytime.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-white/50">
            <p>Your progress is saved for 30 days. When you&apos;re ready:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-neon mt-0.5">1.</span>
                Click the link in your email, or visit your dashboard
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon mt-0.5">2.</span>
                Pick up right where you left off
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neon mt-0.5">3.</span>
                Complete payment to secure the spot
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link href="/" className="flex-1">
            <Button variant="outline-white" size="lg" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button variant="neon" size="lg" className="w-full">
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
