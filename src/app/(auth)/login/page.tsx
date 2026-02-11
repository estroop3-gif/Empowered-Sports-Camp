'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { signIn, forgotPassword, resendConfirmationCode } from '@/lib/auth/cognito-client'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Zap, Mail, Lock, ArrowRight, Crown, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { refreshAuth } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError(null)
    setMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const session = await signIn({
        email: formData.email,
        password: formData.password,
      })

      // Store tokens in HTTP-only cookies for server-side auth
      const idToken = session.getIdToken().getJwtToken()
      const accessToken = session.getAccessToken().getJwtToken()
      const refreshToken = session.getRefreshToken().getToken()
      const expiresIn = session.getIdToken().getExpiration() - Math.floor(Date.now() / 1000)

      await fetch('/api/auth/set-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          accessToken,
          refreshToken,
          expiresIn,
        }),
      })

      // Refresh auth context
      await refreshAuth()

      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      console.error('Sign in error:', error)

      if (error.code === 'NotAuthorizedException' || error.message?.includes('Incorrect')) {
        setError('Invalid email or password. Please try again.')
      } else if (error.code === 'UserNotConfirmedException') {
        // Resend verification code and redirect to confirm page
        try {
          await resendConfirmationCode(formData.email)
        } catch (resendErr) {
          console.error('Failed to resend confirmation code:', resendErr)
        }
        router.push('/signup/confirm?email=' + encodeURIComponent(formData.email))
      } else if (error.code === 'UserNotFoundException') {
        setError('No account found with this email address.')
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError('Please enter your email address first')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      await forgotPassword(formData.email)
      // Redirect to reset password page with email pre-filled
      router.push(`/reset-password?email=${encodeURIComponent(formData.email)}`)
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      if (error.code === 'UserNotFoundException') {
        setError('No account found with this email address.')
      } else if (error.code === 'LimitExceededException') {
        setError('Too many attempts. Please try again later.')
      } else {
        setError('Failed to send reset email. Please try again.')
      }
      console.error(err)
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
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-magenta/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
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
              <div className="flex items-center gap-3 mb-8">
                <Zap className="h-6 w-6 text-neon" />
                <h1 className="text-2xl font-black uppercase tracking-wider text-white">
                  Welcome Back
                </h1>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {message && (
                <div className="mb-6 p-4 bg-neon/10 border border-neon/30 text-neon text-sm">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Email Address
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

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="pl-12 pr-12"
                      placeholder="Your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-neon hover:text-neon-400 font-bold uppercase tracking-wider"
                  >
                    Forgot Password?
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="neon"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    'Signing In...'
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-center text-sm text-white/40">
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="font-bold text-neon hover:text-neon-400">
                    Create One
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-lg">
            <Link href="/" className="flex items-center gap-3 mb-12">
              <div className="relative h-14 w-14">
                <Image
                  src="/images/logo.png"
                  alt="Empowered Athletes"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-2xl font-black uppercase tracking-wider text-white">Empowered</span>
                <span className="text-2xl font-light uppercase tracking-wider text-neon ml-2">Athletes</span>
              </div>
            </Link>

            <h2 className="text-5xl font-black uppercase tracking-wider text-white mb-6">
              Ready to<br />
              <span className="text-neon-gradient text-glow-neon">Compete?</span>
            </h2>

            <p className="text-xl text-white/60 leading-relaxed mb-8">
              Sign in to manage your registrations, add athletes, and access your dashboard.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-white/50">
                <div className="h-10 w-10 flex items-center justify-center bg-neon/10 border border-neon/30">
                  <span className="text-neon font-black">1</span>
                </div>
                <span>View your registered camps</span>
              </div>
              <div className="flex items-center gap-4 text-white/50">
                <div className="h-10 w-10 flex items-center justify-center bg-magenta/10 border border-magenta/30">
                  <span className="text-magenta font-black">2</span>
                </div>
                <span>Manage your athletes</span>
              </div>
              <div className="flex items-center gap-4 text-white/50">
                <div className="h-10 w-10 flex items-center justify-center bg-purple/10 border border-purple/30">
                  <span className="text-purple font-black">3</span>
                </div>
                <span>Register for new programs</span>
              </div>
            </div>

            <div className="mt-12 flex items-center gap-4 text-white/40">
              <Crown className="h-6 w-6 text-neon" />
              <span className="text-sm uppercase tracking-wider">Trusted by 5,000+ families</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
