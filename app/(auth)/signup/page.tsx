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
        // username stored in raw_user_meta_data; picked up by the DB trigger
        data: { username: values.username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setServerError(error.message)
      return
    }

    // Show "check your email" message
    setSuccess(true)
  }

  if (success) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardHeader>
          <CardTitle className="text-xl">Check your email</CardTitle>
          <CardDescription className="text-zinc-400">
            We sent a confirmation link to your address. Click it to activate your account.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 text-white">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Create account</CardTitle>
        <CardDescription className="text-zinc-400">
          Start planning your European train journeys
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-500"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-zinc-300">Username</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="railfan_42"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-500"
              {...register('username')}
            />
            {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-500"
              {...register('password')}
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          {serverError && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-md px-3 py-2">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="text-zinc-300 hover:text-white transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
