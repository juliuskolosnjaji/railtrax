'use client'

import { cn } from '@/lib/utils'
import { 
  Wifi, 
  Utensils, 
  Bike,
  Zap,
  Train,
  Clock
} from 'lucide-react'

interface RollingStockChipProps {
  rollingStock: {
    id: string
    operator: string
    series: string
    maxSpeedKmh?: number | null
    hasWifi?: boolean | null
    hasBistro?: boolean | null
    hasWheelchair?: boolean | null
    hasBikeSpace?: boolean | null
    powerSystem?: string | null
    photoUrl?: string | null
  }
  setNumber?: string | null
  confirmed?: boolean
  className?: string
  onClick?: () => void
}

export function RollingStockChip({ 
  rollingStock, 
  setNumber, 
  confirmed = true,
  className,
  onClick 
}: RollingStockChipProps) {
  const features = [
    { 
      enabled: rollingStock.hasWifi, 
      icon: Wifi, 
      label: 'WiFi',
      color: 'text-blue-600'
    },
    { 
      enabled: rollingStock.hasBistro, 
      icon: Utensils, 
      label: 'Bistro/Restaurant',
      color: 'text-orange-600'
    },
    { 
      enabled: rollingStock.hasBikeSpace, 
      icon: Bike, 
      label: 'Bike spaces',
      color: 'text-purple-600'
    },
    { 
      enabled: !!rollingStock.powerSystem, 
      icon: Zap, 
      label: `Power system: ${rollingStock.powerSystem || ''}`,
      color: 'text-yellow-600'
    },
  ].filter(f => f.enabled)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.()
  }

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
        "bg-slate-100 hover:bg-slate-200 transition-colors",
        "border border-slate-200",
        !confirmed && "opacity-60 border-dashed",
        onClick && "cursor-pointer",
        className
      )}
      onClick={handleClick}
    >
      {/* Train icon and basic info */}
      <div className="flex items-center gap-2">
        <Train className="h-4 w-4 text-slate-600" />
        <span className="font-medium text-slate-900">
          {rollingStock.operator} {rollingStock.series}
        </span>
        {setNumber && (
          <span className="text-xs text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
            {setNumber}
          </span>
        )}
        {!confirmed && (
          <div className="relative group">
            <Clock className="h-3 w-3 text-amber-500" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-slate-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              Unconfirmed - needs verification
            </div>
          </div>
        )}
      </div>

      {/* Feature icons */}
      {features.length > 0 && (
        <div className="flex items-center gap-1 border-l border-slate-300 pl-2">
          {features.map((feature, index) => (
            <div key={index} className="relative group">
              <feature.icon className={cn("h-3.5 w-3.5", feature.color)} />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-slate-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {feature.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Speed badge */}
      {rollingStock.maxSpeedKmh && rollingStock.maxSpeedKmh > 0 && (
        <div className="border-l border-slate-300 pl-2">
          <span className="text-xs font-medium text-slate-600">
            {rollingStock.maxSpeedKmh} km/h
          </span>
        </div>
      )}
    </div>
  )
}