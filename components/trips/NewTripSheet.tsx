'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { createTripSchema, type CreateTripInput, TRIP_STATUSES } from '@/lib/validators/trip'
import { useCreateTrip } from '@/hooks/useTrips'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface NewTripSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewTripSheet({ open, onOpenChange }: NewTripSheetProps) {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreateTrip()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<CreateTripInput>({ resolver: zodResolver(createTripSchema), defaultValues: { status: 'planned' } })

  const [apiError, setApiError] = useState<string | null>(null)

  async function onSubmit(data: CreateTripInput) {
    setApiError(null)
    try {
      const trip = await mutateAsync(data)
      reset()
      onOpenChange(false)
      router.push(`/trips/${trip.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setApiError(msg)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-zinc-900 border-zinc-800 text-white w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">New trip</SheetTitle>
          <SheetDescription className="text-zinc-400">
            Give your journey a name and some details.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-zinc-300">Title *</Label>
            <Input
              id="title"
              placeholder="Interrail Summer 2026"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-zinc-300">Description</Label>
            <Textarea
              id="description"
              placeholder="A few notes about this trip…"
              rows={3}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-zinc-300">Start date</Label>
              <Input
                id="startDate"
                type="date"
                className="bg-zinc-800 border-zinc-700 text-white"
                {...register('startDate')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-zinc-300">End date</Label>
              <Input
                id="endDate"
                type="date"
                className="bg-zinc-800 border-zinc-700 text-white"
                {...register('endDate')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-300">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v as typeof TRIP_STATUSES[number])}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {TRIP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-white focus:bg-zinc-700 capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {apiError && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
              {apiError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-white text-zinc-900 hover:bg-zinc-100"
              disabled={isPending}
            >
              {isPending ? 'Creating…' : 'Create trip'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
