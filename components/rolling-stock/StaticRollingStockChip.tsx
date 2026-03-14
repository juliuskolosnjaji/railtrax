'use client'

import { useState, useRef, useEffect } from 'react'
import { Wifi, Utensils, Bike, ExternalLink, Gauge, Train, X, WifiOff, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormationResult } from '@/lib/formation'

interface StaticRollingStockChipProps {
  formation: FormationResult
  className?: string
}

const SOURCE_LABEL: Record<FormationResult['source'], string> = {
  marudor:    'Marudor (live)',
  'swiss-otd':'Swiss OTD (live)',
  ns:         'NS API (live)',
  sncf:       'SNCF Navitia (live)',
  rtt:        'Realtime Trains (live)',
  static:     'static lookup',
}

export function StaticRollingStockChip({ formation, className }: StaticRollingStockChipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // series may include train name: "ICE 3 Neo · Rheingau" — already merged in source
  const displayName = formation.series

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      {/* Chip */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
          'bg-zinc-800 border border-zinc-700 text-zinc-300',
          'hover:bg-zinc-700 hover:border-zinc-600 hover:text-white',
          'transition-colors cursor-pointer',
        )}
      >
        <Train className="h-3 w-3 text-zinc-500 shrink-0" />
        <span>{displayName}</span>
        {formation.hasWifi && <Wifi className="h-3 w-3 text-blue-400 shrink-0" />}
        {formation.hasBistro && <Utensils className="h-3 w-3 text-orange-400 shrink-0" />}
        {formation.hasBike && <Bike className="h-3 w-3 text-purple-400 shrink-0" />}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl p-3 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{displayName}</p>
              <p className="text-xs text-zinc-500">{formation.operator}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-600 hover:text-zinc-400 mt-0.5 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Description */}
          {formation.description && (
            <p className="text-xs text-zinc-400 leading-relaxed">{formation.description}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            {formation.topSpeedKmh && (
              <span className="flex items-center gap-1 text-zinc-400">
                <Gauge className="h-3 w-3" />
                <span className="font-medium text-zinc-300">{formation.topSpeedKmh} km/h</span>
              </span>
            )}
            <Amenity enabled={formation.hasWifi}    icon={formation.hasWifi ? Wifi : WifiOff}     label="WiFi"   color="text-blue-400" />
            <Amenity enabled={formation.hasBistro}  icon={formation.hasBistro ? Utensils : UtensilsCrossed} label="Bistro" color="text-orange-400" />
            <Amenity enabled={formation.hasBike}    icon={Bike}   label="Bike"   color="text-purple-400" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
            {formation.wikipediaUrl ? (
              <a
                href={formation.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                Wikipedia
              </a>
            ) : <span />}
            <span className="text-xs text-zinc-700">{SOURCE_LABEL[formation.source]}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Amenity({
  enabled, icon: Icon, label, color,
}: { enabled: boolean; icon: React.ElementType; label: string; color: string }) {
  return (
    <span className={cn('flex items-center gap-1', enabled ? color : 'text-zinc-600')}>
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </span>
  )
}
