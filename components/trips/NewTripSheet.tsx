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
      <SheetContent className="bg-background border-border text-foreground w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground">Neue Reise</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Gib deiner Reise einen Namen und weitere Details.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-secondary-foreground">Reisetitel *</Label>
            <Input
              id="title"
              placeholder="Interrail Sommer 2026"
              className="bg-card border-border text-foreground placeholder:text-muted-foreground"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-secondary-foreground">Beschreibung</Label>
            <Textarea
              id="description"
              placeholder="Ein paar Notizen zu dieser Reise…"
              rows={3}
              className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-secondary-foreground">Startdatum</Label>
              <Input
                id="startDate"
                type="date"
                className="bg-card border-border text-foreground"
                {...register('startDate')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-secondary-foreground">Enddatum</Label>
              <Input
                id="endDate"
                type="date"
                className="bg-card border-border text-foreground"
                {...register('endDate')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-secondary-foreground">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v as typeof TRIP_STATUSES[number])}
            >
              <SelectTrigger className="bg-card border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {TRIP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-foreground focus:bg-secondary">
                    {s === 'planned' ? 'Geplant' : s === 'active' ? 'Aktiv' : s === 'completed' ? 'Abgeschlossen' : s === 'cancelled' ? 'Storniert' : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {apiError && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {apiError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-border text-secondary-foreground hover:bg-secondary"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isPending}
            >
              {isPending ? 'Erstellen…' : 'Reise erstellen'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
