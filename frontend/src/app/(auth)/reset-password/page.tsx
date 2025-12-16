'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { forgotPassword, confirmForgotPassword } from '@/lib/auth/cognito-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Zap, Mail, Lock, ArrowRight, KeyRound, CheckCircle, ArrowLeft } from 'lucide-react'

type Step = 'email' | 'code' | 'success'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill email from query params if redirected from login
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
      setStep('code') // Skip to code entry if email was provided
    }
  }, [searchParams])

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await forgotPassword(email)
      setStep('code')
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      if (error.code === 'UserNotFoundException') {
        setError('No account found with this email address.')
      } else if (error.code === 'LimitExceededException') {
        setError('Too many attempts. Please try again later.')
      } else {
        setError('Failed to send reset code. Please try again.')
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    // Validate password strength
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      await confirmForgotPassword(email, code, newPassword)
      setStep('success')
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      if (error.code === 'CodeMismatchException') {
        setError('Invalid verification code. Please check and try again.')
      } else if (error.code === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new one.')
      } else if (error.code === 'InvalidPasswordException') {
        setError('Password does not meet requirements. Must include uppercase, lowercase, numbers, and special characters.')
      } else {
        setError('Failed to reset password. Please try again.')
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setLoading(true)
    setError(null)

    try {
      await forgotPassword(email)
      setError(null)
      // Show a temporary success message
      alert('New verification code sent to your email!')
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      if (error.code === 'LimitExceededException') {
        setError('Too many attempts. Please try again later.')
      } else {
        setError('Failed to resend code. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-purple/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-neon/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="relative h-12 w-12">
                <Image
                  src="/images/logo.png"
                  alt="Empowered Athletes"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-xl font-black uppercase tracking-wider text-white">Empowered</span>
                <span className="text-xl font-light uppercase tracking-wider text-neon ml-2">Athletes</span>
              </div>
            </Link>
          </div>

          <div className="bg-dark-100 border border-white/10 p-8">
            {/* Step 1: Enter Email */}
            {step === 'email' && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <KeyRound className="h-6 w-6 text-neon" />
                  <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                    Reset Password
                  </h1>
                </div>

                <p className="text-sm text-white/50 mb-6">
                  Enter your email address and we&apos;ll send you a verification code to reset your password.
                </p>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSendCode} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-12"
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="neon"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : (
                      <>
                        Send Reset Code
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-white/40">
                  Remember your password?{' '}
                  <Link href="/login" className="font-bold text-neon hover:text-neon-400">
                    Sign In
                  </Link>
                </p>
              </>
            )}

            {/* Step 2: Enter Code and New Password */}
            {step === 'code' && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <Lock className="h-6 w-6 text-neon" />
                  <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                    Enter Code
                  </h1>
                </div>

                <p className="text-sm text-white/50 mb-6">
                  We sent a verification code to <span className="text-neon">{email}</span>. Enter it below with your new password.
                </p>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      Verification Code
                    </label>
                    <div className="relative">
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                      <Input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                        className="pl-12 text-center tracking-widest text-lg"
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pl-12"
                        placeholder="Min 8 characters"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pl-12"
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="neon"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Resetting...' : (
                      <>
                        Reset Password
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-white/40 hover:text-white flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="font-bold text-neon hover:text-neon-400"
                  >
                    Resend Code
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="h-16 w-16 bg-neon/10 border border-neon/30 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-neon" />
                  </div>
                </div>

                <h1 className="text-2xl font-black uppercase tracking-wider text-white mb-4">
                  Password Reset!
                </h1>

                <p className="text-white/50 mb-8">
                  Your password has been successfully reset. You can now sign in with your new password.
                </p>

                <Button
                  variant="neon"
                  size="lg"
                  className="w-full"
                  onClick={() => router.push('/login')}
                >
                  Sign In
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
