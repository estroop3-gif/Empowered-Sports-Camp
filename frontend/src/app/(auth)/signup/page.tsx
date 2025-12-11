'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Zap, Mail, Lock, User, Phone, ArrowRight, Crown } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (data.user) {
        // Create profile in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
          })

        if (profileError && profileError.code !== '23505') {
          console.error('Profile creation error:', profileError)
        }

        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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
            We&apos;ve sent a confirmation link to <span className="text-neon font-bold">{formData.email}</span>.
            Click the link to verify your account and get started.
          </p>
          <Link href="/login">
            <Button variant="outline-neon">
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-neon/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-magenta/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left side - Branding */}
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
              Join the<br />
              <span className="text-neon-gradient text-glow-neon">Movement</span>
            </h2>

            <p className="text-xl text-white/60 leading-relaxed mb-8">
              Create your account to register for camps, track your athlete&apos;s progress, and become part of our community of fierce competitors.
            </p>

            <div className="flex items-center gap-4 text-white/40">
              <Crown className="h-6 w-6 text-neon" />
              <span className="text-sm uppercase tracking-wider">Trusted by 5,000+ families</span>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
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
                  Create Account
                </h1>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                      First Name
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
                      Last Name
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
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-12"
                      placeholder="(555) 123-4567"
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
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Confirm Password
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

                <Button
                  type="submit"
                  variant="neon"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    'Creating Account...'
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-white/40">
                Already have an account?{' '}
                <Link href="/login" className="font-bold text-neon hover:text-neon-400">
                  Sign In
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-white/30">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-neon hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-neon hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
