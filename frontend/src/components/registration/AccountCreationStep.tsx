'use client'

import { useState, useEffect } from 'react'
import { useCheckout } from '@/lib/checkout/context'
import { useAuth } from '@/lib/auth/context'
import { signUp, confirmSignUp, resendConfirmationCode } from '@/lib/auth/cognito-client'
import { Input } from '@/components/ui/input'
import {
  User,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  Check,
  AlertCircle,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'

interface AccountCreationStepProps {
  onContinue: () => void
  onBack: () => void
}

type AccountStepPhase = 'check' | 'create' | 'confirm' | 'complete'

export function AccountCreationStep({ onContinue, onBack }: AccountCreationStepProps) {
  const { state } = useCheckout()
  const { user, loading: authLoading, refreshAuth } = useAuth()
  const isAuthenticated = !!user

  const [phase, setPhase] = useState<AccountStepPhase>('check')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data - pre-filled from parent info
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  })

  // Confirmation code
  const [confirmationCode, setConfirmationCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Pre-fill form with parent info from registration
  useEffect(() => {
    if (state.parentInfo) {
      setFormData(prev => ({
        ...prev,
        email: state.parentInfo.email || prev.email,
        firstName: state.parentInfo.firstName || prev.firstName,
        lastName: state.parentInfo.lastName || prev.lastName,
        phone: state.parentInfo.phone || prev.phone,
      }))
    }
  }, [state.parentInfo])

  // Check if already authenticated
  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && user) {
        // User is already logged in, skip this step
        setPhase('complete')
        onContinue()
      } else {
        setPhase('create')
      }
    }
  }, [isAuthenticated, user, authLoading, onContinue])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError(null)
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      // Sign up with Cognito
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      })

      const userId = result.userSub

      if (userId) {
        // Create profile in database
        const response = await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            // Include address from parent info if available
            addressLine1: state.parentInfo.addressLine1,
            city: state.parentInfo.city,
            state: state.parentInfo.state,
            zipCode: state.parentInfo.zipCode,
          }),
        })

        if (!response.ok) {
          console.error('Failed to create user profile:', await response.text())
        }
      }

      // Move to confirmation phase
      setPhase('confirm')
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      console.error('Sign up error:', error)

      if (error.code === 'UsernameExistsException') {
        setError('An account with this email already exists. Please log in instead.')
      } else if (error.code === 'InvalidPasswordException') {
        setError('Password must include uppercase, lowercase, numbers, and special characters.')
      } else if (error.code === 'InvalidParameterException') {
        setError('Please check your input and try again.')
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await confirmSignUp(formData.email, confirmationCode)

      // Refresh auth state to pick up the new user
      await refreshAuth()

      setPhase('complete')

      // Small delay to ensure auth state is updated
      setTimeout(() => {
        onContinue()
      }, 500)
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      console.error('Confirmation error:', error)

      if (error.code === 'CodeMismatchException') {
        setError('Invalid verification code. Please try again.')
      } else if (error.code === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new one.')
      } else {
        setError(error.message || 'Failed to verify code. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return

    try {
      await resendConfirmationCode(formData.email)
      setResendCooldown(60)
      setError(null)
    } catch (err) {
      console.error('Resend error:', err)
      setError('Failed to resend code. Please try again.')
    }
  }

  // Loading state while checking auth
  if (phase === 'check' || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-neon animate-spin mb-4" />
        <p className="text-white/60">Checking account status...</p>
      </div>
    )
  }

  // Confirmation phase
  if (phase === 'confirm') {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-neon/10 border border-neon/30 mb-4">
            <Mail className="h-8 w-8 text-neon" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
            Verify Your Email
          </h2>
          <p className="text-white/60">
            We sent a verification code to <span className="text-neon">{formData.email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleConfirmCode} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
              Verification Code
            </label>
            <Input
              type="text"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em] font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || confirmationCode.length < 6}
            className="w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify & Continue
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendCooldown > 0}
              className="text-sm text-white/50 hover:text-neon transition-colors disabled:cursor-not-allowed"
            >
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Didn't receive the code? Resend"}
            </button>
          </div>
        </form>

        <button
          onClick={() => setPhase('create')}
          className="mt-6 w-full py-3 border border-white/20 text-white/60 font-semibold uppercase tracking-wider hover:border-white/40 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Account Details
        </button>
      </div>
    )
  }

  // Create account phase
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-neon/10 border border-neon/30 mb-4">
          <UserPlus className="h-8 w-8 text-neon" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
          Create Your Account
        </h2>
        <p className="text-white/60">
          Create a parent account to complete registration and manage future bookings
        </p>
      </div>

      {/* Already have account prompt */}
      <div className="mb-6 p-4 bg-purple/10 border border-purple/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-purple" />
          <span className="text-white/80 text-sm">Already have an account?</span>
        </div>
        <Link
          href={`/login?redirect=/register/${state.campSession?.slug || ''}`}
          className="text-neon font-bold text-sm hover:underline"
        >
          Log In
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Pre-filled notice */}
      <div className="mb-6 p-3 bg-neon/5 border border-neon/20 flex items-center gap-3">
        <Check className="h-5 w-5 text-neon flex-shrink-0" />
        <p className="text-white/70 text-sm">
          We&apos;ve pre-filled your info from the registration. Just add a password!
        </p>
      </div>

      <form onSubmit={handleCreateAccount} className="space-y-5">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
              First Name *
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <Input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="pl-12"
                placeholder="Jane"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
              Last Name *
            </label>
            <Input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              placeholder="Smith"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="pl-12"
              placeholder="jane@example.com"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
            Phone *
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <Input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="pl-12"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
            Create Password *
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              className="pl-12"
              placeholder="Min 8 characters"
            />
          </div>
          <p className="mt-1 text-xs text-white/40">
            Must include uppercase, lowercase, number, and special character
          </p>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
            Confirm Password *
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <Input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="pl-12"
              placeholder="Confirm your password"
            />
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10">
          <Shield className="h-5 w-5 text-neon flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white/80 text-sm font-semibold">Your data is secure</p>
            <p className="text-white/50 text-xs mt-1">
              We use industry-standard encryption to protect your information.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-4 border border-white/20 text-white/60 font-bold uppercase tracking-widest hover:border-white/40 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Create Account & Continue
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-xs text-white/30">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="text-neon hover:underline">Terms of Service</Link>
        {' '}and{' '}
        <Link href="/privacy" className="text-neon hover:underline">Privacy Policy</Link>
      </p>
    </div>
  )
}
