'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { confirmSignUp, resendConfirmationCode } from '@/lib/auth/cognito-client'

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !code) {
      setError('Please enter the verification code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await confirmSignUp(email, code)

      // Create DB profile now that email is verified
      const storedData = sessionStorage.getItem('signupProfileData')
      if (storedData) {
        try {
          const profileData = JSON.parse(storedData)
          const response = await fetch('/api/auth/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData),
          })
          if (!response.ok) {
            console.error('Failed to create user profile:', await response.text())
          }
        } catch (profileErr) {
          console.error('Error creating profile after verification:', profileErr)
        } finally {
          sessionStorage.removeItem('signupProfileData')
        }
      } else {
        // No sessionStorage data — user navigated away before verifying.
        // Create profile from Cognito attributes as a fallback.
        try {
          const response = await fetch('/api/auth/create-user-from-cognito', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          })
          if (!response.ok) {
            console.error('Failed to create profile from Cognito:', await response.text())
          }
        } catch (profileErr) {
          console.error('Error creating profile from Cognito:', profileErr)
        }
      }

      setMessage('Account verified successfully! Redirecting to login...')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      console.error('Confirmation error:', error)

      if (error.code === 'CodeMismatchException') {
        setError('Invalid verification code. Please check and try again.')
      } else if (error.code === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new one.')
      } else if (error.code === 'NotAuthorizedException') {
        setError('Account is already verified. Please sign in.')
      } else {
        setError(error.message || 'Verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email) {
      setError('Email address is missing')
      return
    }

    setResending(true)
    setError(null)
    setMessage(null)

    try {
      await resendConfirmationCode(email)
      setMessage('A new verification code has been sent to your email.')
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      console.error('Resend error:', error)

      if (error.code === 'LimitExceededException') {
        setError('Too many attempts. Please wait before requesting another code.')
      } else {
        setError('Failed to resend code. Please try again.')
      }
    } finally {
      setResending(false)
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-black uppercase tracking-wider text-white mb-4">
            Missing Email
          </h1>
          <p className="text-white/60 mb-8">
            Please sign up again to receive a verification code.
          </p>
          <Link href="/signup">
            <Button variant="neon" className="w-full">
              Back to Sign Up
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex h-20 w-20 items-center justify-center bg-neon mb-6">
            <Mail className="h-10 w-10 text-black" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white mb-4">
            Verify Your Email
          </h1>
          <p className="text-white/60">
            We&apos;ve sent a 6-digit verification code to{' '}
            <span className="text-neon font-bold">{email}</span>
          </p>
        </div>

        <div className="bg-dark-100 border border-white/10 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-neon/10 border border-neon/30 text-neon text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {message}
            </div>
          )}

          <form onSubmit={handleConfirm} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                Verification Code
              </label>
              <Input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setError(null)
                }}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              variant="neon"
              size="lg"
              className="w-full"
              disabled={loading || code.length < 6}
            >
              {loading ? (
                'Verifying...'
              ) : (
                <>
                  Verify Account
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-white/40 text-center mb-4">
              Didn&apos;t receive the code? Check your spam folder.
            </p>
            <button
              onClick={handleResendCode}
              disabled={resending}
              className="w-full flex items-center justify-center gap-2 text-neon hover:text-neon-400 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          Already verified?{' '}
          <Link href="/login" className="font-bold text-neon hover:text-neon-400">
            Sign In
          </Link>
        </p>
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
