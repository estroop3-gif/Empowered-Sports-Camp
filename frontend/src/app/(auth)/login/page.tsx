'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Zap, Mail, Lock, ArrowRight, Crown } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          setError('Invalid email or password. Please try again.')
        } else {
          setError(signInError.message)
        }
        return
      }

      if (data.user) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error(err)
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

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setError(null)
        alert('Password reset email sent! Check your inbox.')
      }
    } catch (err) {
      setError('Failed to send reset email. Please try again.')
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
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="pl-12"
                      placeholder="Your password"
                    />
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
