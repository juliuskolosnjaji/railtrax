'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/ui/Logo'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
})

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  async function onSubmit(values: SignupFormValues) {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { username: values.username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setServerError(error.message)
      return
    }

    setSuccess(true)
  }

  async function handleGoogleSignUp() {
    setIsGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <Card className="text-white rounded-xl" style={{ background: '#0a1628', border: '1px solid #1e2d4a' }}>
          <CardHeader>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription style={{ color: '#8ba3c7' }}>
              We sent a confirmation link to your address. Click it to activate your account.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Logo size="lg" />
      </div>
      <Card className="text-white rounded-xl" style={{ background: '#0a1628', border: '1px solid #1e2d4a' }}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Create account</CardTitle>
          <CardDescription style={{ color: '#8ba3c7' }}>
            Start planning your European train journeys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              style={{ background: '#0d1f3c', border: '1px solid #1e3a6e', color: '#fff' }}
              onClick={handleGoogleSignUp}
              disabled={isGoogleLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" style={{ borderColor: '#1e2d4a' }} />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 text-xs" style={{ background: '#0a1628', color: '#4a6a9a' }}>or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" style={{ color: '#8ba3c7' }}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="text-white placeholder:text-[#4a6a9a] focus-visible:ring-[#4f8ef7]"
                  style={{ background: '#080d1a', border: '1px solid #1e2d4a' }}
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-[#e25555]">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" style={{ color: '#8ba3c7' }}>Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="railfan_42"
                  className="text-white placeholder:text-[#4a6a9a] focus-visible:ring-[#4f8ef7]"
                  style={{ background: '#080d1a', border: '1px solid #1e2d4a' }}
                  {...register('username')}
                />
                {errors.username && <p className="text-xs text-[#e25555]">{errors.username.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" style={{ color: '#8ba3c7' }}>Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="text-white placeholder:text-[#4a6a9a] focus-visible:ring-[#4f8ef7]"
                  style={{ background: '#080d1a', border: '1px solid #1e2d4a' }}
                  {...register('password')}
                />
                {errors.password && <p className="text-xs text-[#e25555]">{errors.password.message}</p>}
              </div>

              {serverError && (
                <p className="text-sm rounded-md px-3 py-2" style={{ color: '#e25555', background: '#1f0d0d', border: '1px solid #e2555530' }}>
                  {serverError}
                </p>
              )}

              <Button
                type="submit"
                className="w-full hover:opacity-90 transition-opacity"
                style={{ background: '#4f8ef7', color: '#fff' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </Button>

              <p className="text-center text-sm" style={{ color: '#4a6a9a' }}>
                Already have an account?{' '}
                <Link href="/login" className="transition-colors hover:text-white" style={{ color: '#8ba3c7' }}>
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
