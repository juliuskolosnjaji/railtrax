import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RollingStockChip } from './RollingStockChip'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface RollingStockRecord {
  id: string
  series: string
  operator: string
  manufacturer?: string | null
  description?: string | null
  maxSpeedKmh?: number | null
  hasWifi?: boolean | null
  hasBistro?: boolean | null
  hasWheelchair?: boolean | null
  hasBikeSpace?: boolean | null
  powerSystem?: string | null
  photoUrl?: string | null
  [key: string]: unknown
}

interface RollingStockSearchProps {
  operator?: string
  onSelect: (rollingStock: RollingStockRecord) => void
  onClose?: () => void
  className?: string
}

export function RollingStockSearch({ 
  operator, 
  onSelect, 
  onClose, 
  className 
}: RollingStockSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOperator] = useState(operator)

  const { data: rollingStock, isLoading } = useQuery({
    queryKey: ['rolling-stock', searchQuery, selectedOperator],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (selectedOperator) params.set('operator', selectedOperator)
      params.set('limit', '20')
      
      const response = await fetch(`/api/rolling-stock?${params}`)
      if (!response.ok) throw new Error('Failed to fetch rolling stock')
      const data = await response.json()
      return data.data
    },
    enabled: searchQuery.length > 0 || selectedOperator !== undefined,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Select Rolling Stock</h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by series, operator, or manufacturer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {operator && (
          <div className="text-sm text-slate-600">
            Filtered by operator: <span className="font-medium">{operator}</span>
          </div>
        )}
      </form>

      {/* Results */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : rollingStock && rollingStock.length > 0 ? (
          rollingStock.map((stock: RollingStockRecord) => (
            <button
              key={stock.id}
              onClick={() => onSelect(stock)}
              className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <div className="space-y-2">
                <RollingStockChip rollingStock={stock} />
                {stock.manufacturer && (
                  <div className="text-sm text-slate-600">
                    Manufacturer: {stock.manufacturer}
                  </div>
                )}
                {stock.description && (
                  <div className="text-sm text-slate-600 line-clamp-2">
                    {stock.description}
                  </div>
                )}
              </div>
            </button>
          ))
        ) : searchQuery ? (
          <div className="text-center py-8 text-slate-500">
            No rolling stock found matching &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            Start typing to search for rolling stock...
          </div>
        )}
      </div>
    </div>
  )
}