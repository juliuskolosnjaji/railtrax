'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTripSchema, type CreateTripInput, TRIP_STATUSES } from '@/lib/validators/trip'
import { useUpdateTrip } from '@/hooks/useTrips'
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
import { Pencil } from 'lucide-react'

interface TripEditorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip: {
    id: string
    title: string
    description: string | null
    startDate: string | null
    endDate: string | null
    status: string | null
  }
}

export function TripEditorSheet({ open, onOpenChange, trip }: TripEditorSheetProps) {
  const { mutateAsync, isPending } = useUpdateTrip(trip.id)
  const [apiError, setApiError] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<CreateTripInput>({ 
      resolver: zodResolver(createTripSchema),
      defaultValues: { 
        status: 'planned',
        title: '',
        description: '',
        startDate: undefined,
        endDate: undefined,
      } 
    })

  useEffect(() => {
    if (open && trip) {
      reset({
        title: trip.title || '',
        description: trip.description || '',
        startDate: trip.startDate ? trip.startDate.split('T')[0] : undefined,
        endDate: trip.endDate ? trip.endDate.split('T')[0] : undefined,
        status: (trip.status as typeof TRIP_STATUSES[number]) || 'planned',
      })
    }
  }, [open, trip, reset])

  async function onSubmit(data: CreateTripInput) {
    setApiError(null)
    try {
      await mutateAsync(data)
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setApiError(msg)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-[#080d1a] border-[#1e2d4a] text-white w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">Reise bearbeiten</SheetTitle>
          <SheetDescription className="text-[#4a6a9a]">
            Titel, Datum und Beschreibung ändern.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-[#8ba3c7]">Titel *</Label>
            <Input
              id="title"
              placeholder="Interrail Sommer 2026"
              className="bg-[#0a1628] border-[#1e2d4a] text-white placeholder:text-[#4a6a9a]"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-[#8ba3c7]">Beschreibung</Label>
            <Textarea
              id="description"
              placeholder="Ein paar Notizen zu dieser Reise…"
              rows={3}
              className="bg-[#0a1628] border-[#1e2d4a] text-white placeholder:text-[#4a6a9a] resize-none"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-[#8ba3c7]">Startdatum</Label>
              <Input
                id="startDate"
                type="date"
                className="bg-[#0a1628] border-[#1e2d4a] text-white"
                {...register('startDate')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-[#8ba3c7]">Enddatum</Label>
              <Input
                id="endDate"
                type="date"
                className="bg-[#0a1628] border-[#1e2d4a] text-white"
                {...register('endDate')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#8ba3c7]">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v as typeof TRIP_STATUSES[number])}
            >
              <SelectTrigger className="bg-[#0a1628] border-[#1e2d4a] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a1628] border-[#1e2d4a]">
                {TRIP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-white focus:bg-[#1e2d4a]">
                    {s === 'planned' ? 'Geplant' : s === 'active' ? 'Aktiv' : s === 'completed' ? 'Abgeschlossen' : s === 'cancelled' ? 'Storniert' : s}
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
              className="flex-1 border-[#1e2d4a] text-[#8ba3c7] hover:bg-[#0a1628]"
              onClick={() => onOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#4f8ef7] text-white hover:bg-[#3a7de6]"
              disabled={isPending}
            >
              {isPending ? 'Speichern…' : 'Speichern'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
