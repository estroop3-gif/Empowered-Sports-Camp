'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

function ConfirmContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || 'your email'

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center bg-neon mb-8">
          <Mail className="h-10 w-10 text-black" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-white mb-4">
          Check Your Email
        </h1>
        <p className="text-white/60 mb-8">
          We&apos;ve sent a confirmation link to{' '}
          <span className="text-neon font-bold">{email}</span>.
          Click the link to verify your account and start adding your athletes.
        </p>
        <div className="space-y-4">
          <p className="text-sm text-white/40">
            Didn&apos;t receive the email? Check your spam folder or try signing up again.
          </p>
          <Link href="/login">
            <Button variant="outline-neon" className="w-full">
              Back to Login
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SignupConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white/50">Loading...</div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  )
}
