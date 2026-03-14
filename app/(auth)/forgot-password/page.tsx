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

const schema = z.object({
  email: z.string().email('Invalid email address'),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_URL ?? window.location.origin}/auth/callback?next=/settings/reset-password`,
    })
    // Always show success — don't leak whether email exists
    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <Card className="text-white rounded-xl" style={{ background: '#0a1628', border: '1px solid #1e2d4a' }}>
          <CardHeader>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription style={{ color: '#8ba3c7' }}>
              If an account exists for that address, we sent a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="text-sm transition-colors hover:text-white" style={{ color: '#4a6a9a' }}>
              ← Back to sign in
            </Link>
          </CardContent>
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
          <CardTitle className="text-xl">Reset password</CardTitle>
          <CardDescription style={{ color: '#8ba3c7' }}>
            Enter your email address and we&apos;ll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
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

            <Button
              type="submit"
              className="w-full hover:opacity-90 transition-opacity"
              style={{ background: '#4f8ef7', color: '#fff' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>

            <p className="text-center text-sm">
              <Link href="/login" className="transition-colors hover:text-white" style={{ color: '#4a6a9a' }}>
                ← Back to sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
