'use client'

import { useState, useEffect } from 'react'
import { useCheckout } from '@/lib/checkout/context'
import type { ParentProfile } from '@/lib/checkout/context'
import { useAuth } from '@/lib/auth/context'
import { signUp, confirmSignUp, resendConfirmationCode, signIn } from '@/lib/auth/cognito-client'
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
  LogIn,
  X,
  Eye,
  EyeOff,
} from 'lucide-react'
import Link from 'next/link'

interface AccountCreationStepProps {
  onContinue: () => void
  onBack: () => void
}

type AccountStepPhase = 'check' | 'create' | 'confirm' | 'complete'

export function AccountCreationStep({ onContinue, onBack }: AccountCreationStepProps) {
  const { state, updateParent } = useCheckout()
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

  const [showPassword, setShowPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Confirmation code
  const [confirmationCode, setConfirmationCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Merge prompt state
  const [showMergePrompt, setShowMergePrompt] = useState(false)
  const [loggedInProfile, setLoggedInProfile] = useState<ParentProfile | null>(null)

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

  // Pre-fill login email from parent info
  useEffect(() => {
    if (showLoginModal && state.parentInfo.email && !loginEmail) {
      setLoginEmail(state.parentInfo.email)
    }
  }, [showLoginModal, state.parentInfo.email, loginEmail])

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
        setShowLoginModal(true)
        setLoginEmail(formData.email)
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

  // ---- Login Modal Handlers ----

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)

    try {
      // 1. Sign in with Cognito
      const session = await signIn({ email: loginEmail, password: loginPassword })

      // 2. Store tokens via server cookie endpoint
      const idToken = session.getIdToken().getJwtToken()
      const accessToken = session.getAccessToken().getJwtToken()
      const refreshToken = session.getRefreshToken()?.getToken()
      const expiresIn = session.getIdToken().getExpiration() - Math.floor(Date.now() / 1000)

      await fetch('/api/auth/set-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, accessToken, refreshToken, expiresIn }),
      })

      // 3. Refresh auth context to pick up the logged-in user
      await refreshAuth()

      // 4. Ensure the user has a parent role (non-parent users like coaches need it added)
      await fetch('/api/auth/ensure-parent-role', { method: 'POST' })

      // 5. Fetch user profile to compare with registration data
      //    Use withAthletes action — it resolves the profile from the authenticated session
      const profileRes = await fetch('/api/profiles?action=withAthletes')
      let profileData: ParentProfile | null = null

      if (profileRes.ok) {
        const json = await profileRes.json()
        if (json.data) {
          profileData = json.data as ParentProfile
        }
      }

      // 6. Close login modal
      setShowLoginModal(false)
      setLoginEmail('')
      setLoginPassword('')

      // 7. Check if profile differs from registration parent info and show merge prompt
      if (profileData && hasProfileDifferences(profileData)) {
        setLoggedInProfile(profileData)
        setShowMergePrompt(true)
      } else {
        // No differences or no profile — continue directly
        onContinue()
      }
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      console.error('Login error:', error)

      if (error.code === 'NotAuthorizedException') {
        setLoginError('Incorrect email or password.')
      } else if (error.code === 'UserNotConfirmedException') {
        // Resend the verification code and redirect to confirm phase
        try {
          await resendConfirmationCode(loginEmail)
        } catch (resendErr) {
          console.error('Failed to resend confirmation code:', resendErr)
        }
        setFormData(prev => ({ ...prev, email: loginEmail }))
        setShowLoginModal(false)
        setLoginEmail('')
        setLoginPassword('')
        setPhase('confirm')
        return
      } else if (error.code === 'UserNotFoundException') {
        setLoginError('No account found with this email address.')
      } else {
        setLoginError(error.message || 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoginLoading(false)
    }
  }

  /** Check if the logged-in profile has any differences from registration parentInfo */
  function hasProfileDifferences(profile: ParentProfile): boolean {
    const p = state.parentInfo
    const profileFirstName = profile.first_name || ''
    const profileLastName = profile.last_name || ''
    const profilePhone = profile.phone || ''

    return (
      (profileFirstName !== '' && profileFirstName !== p.firstName) ||
      (profileLastName !== '' && profileLastName !== p.lastName) ||
      (profilePhone !== '' && profilePhone !== p.phone)
    )
  }

  /** User chose to use account profile data for parent info */
  const handleUseAccountInfo = () => {
    if (loggedInProfile) {
      updateParent({
        firstName: loggedInProfile.first_name || state.parentInfo.firstName,
        lastName: loggedInProfile.last_name || state.parentInfo.lastName,
        email: loggedInProfile.email || state.parentInfo.email,
        phone: loggedInProfile.phone || state.parentInfo.phone,
        addressLine1: loggedInProfile.address_line_1 || state.parentInfo.addressLine1,
        addressLine2: loggedInProfile.address_line_2 || state.parentInfo.addressLine2,
        city: loggedInProfile.city || state.parentInfo.city,
        state: loggedInProfile.state || state.parentInfo.state,
        zipCode: loggedInProfile.zip_code || state.parentInfo.zipCode,
        emergencyContactName: loggedInProfile.emergency_contact_name || state.parentInfo.emergencyContactName,
        emergencyContactPhone: loggedInProfile.emergency_contact_phone || state.parentInfo.emergencyContactPhone,
        emergencyContactRelationship: loggedInProfile.emergency_contact_relationship || state.parentInfo.emergencyContactRelationship,
      })
    }
    setShowMergePrompt(false)
    setLoggedInProfile(null)
    onContinue()
  }

  /** User chose to keep the data they entered during registration */
  const handleKeepRegistrationInfo = () => {
    setShowMergePrompt(false)
    setLoggedInProfile(null)
    onContinue()
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

  // Data merge prompt (shown after successful login if profile differs)
  if (showMergePrompt && loggedInProfile) {
    const p = state.parentInfo
    const profile = loggedInProfile
    const rows = [
      {
        label: 'First Name',
        account: profile.first_name || '',
        registration: p.firstName,
      },
      {
        label: 'Last Name',
        account: profile.last_name || '',
        registration: p.lastName,
      },
      {
        label: 'Email',
        account: profile.email || '',
        registration: p.email,
      },
      {
        label: 'Phone',
        account: profile.phone || '',
        registration: p.phone,
      },
    ]

    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-neon/10 border border-neon/30 mb-4">
            <User className="h-8 w-8 text-neon" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
            Account Info Found
          </h2>
          <p className="text-white/60">
            Your account has different info than what you entered during registration.
            Which would you like to use for the parent/guardian details?
          </p>
        </div>

        {/* Side-by-side comparison */}
        <div className="border border-white/10 mb-8">
          {/* Header */}
          <div className="grid grid-cols-3 bg-white/5 border-b border-white/10">
            <div className="p-3 text-xs font-bold uppercase tracking-wider text-white/50">
              Field
            </div>
            <div className="p-3 text-xs font-bold uppercase tracking-wider text-neon text-center">
              Account Info
            </div>
            <div className="p-3 text-xs font-bold uppercase tracking-wider text-purple text-center">
              Registration Info
            </div>
          </div>
          {/* Rows */}
          {rows.map((row) => {
            const isDifferent = row.account !== row.registration
            return (
              <div
                key={row.label}
                className={`grid grid-cols-3 border-b border-white/5 ${isDifferent ? 'bg-yellow-500/5' : ''}`}
              >
                <div className="p-3 text-sm text-white/70">{row.label}</div>
                <div className={`p-3 text-sm text-center ${isDifferent ? 'text-neon font-semibold' : 'text-white/60'}`}>
                  {row.account || '-'}
                </div>
                <div className={`p-3 text-sm text-center ${isDifferent ? 'text-purple font-semibold' : 'text-white/60'}`}>
                  {row.registration || '-'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleUseAccountInfo}
            className="flex-1 py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors flex items-center justify-center gap-2"
          >
            <Check className="h-5 w-5" />
            Use Account Info
          </button>
          <button
            onClick={handleKeepRegistrationInfo}
            className="flex-1 py-4 border border-purple text-purple font-bold uppercase tracking-widest hover:bg-purple/10 transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="h-5 w-5" />
            Keep Registration Info
          </button>
        </div>
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
        <button
          type="button"
          onClick={() => {
            setShowLoginModal(true)
            setLoginError(null)
          }}
          className="text-neon font-bold text-sm hover:underline"
        >
          Log In
        </button>
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
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              className="pl-12 pr-12"
              placeholder="Min 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
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
              type={showPassword ? 'text' : 'password'}
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

      {/* ---- Login Modal ---- */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !loginLoading && setShowLoginModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md mx-4 bg-[#0a0a0a] border border-white/10 shadow-2xl">
            {/* Close button */}
            <button
              type="button"
              onClick={() => !loginLoading && setShowLoginModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-neon/10 border border-neon/30 mb-3">
                  <LogIn className="h-6 w-6 text-neon" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-wider text-white">
                  Log In
                </h3>
                <p className="text-white/50 text-sm mt-1">
                  Sign in to your existing account
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{loginError}</p>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                    <Input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value)
                        setLoginError(null)
                      }}
                      required
                      className="pl-12"
                      placeholder="jane@example.com"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                    <Input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value)
                        setLoginError(null)
                      }}
                      required
                      className="pl-12 pr-12"
                      placeholder="Your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <a
                    href="/reset-password"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/40 hover:text-neon transition-colors"
                  >
                    Forgot Password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-4 bg-neon text-black font-bold uppercase tracking-widest hover:bg-neon/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      Log In
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
