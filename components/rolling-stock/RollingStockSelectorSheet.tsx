import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { RollingStockSearch } from './RollingStockSearch'
import { Button } from '@/components/ui/button'

interface RollingStockSelectorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  operator?: string
  onSelect: (rollingStock: any, setNumber?: string) => void
  currentSelection?: {
    rollingStockId: string
    setNumber?: string
  }
}

export function RollingStockSelectorSheet({ 
  open, 
  onOpenChange, 
  operator, 
  onSelect,
  currentSelection 
}: RollingStockSelectorSheetProps) {
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualSetNumber, setManualSetNumber] = useState('')

  const handleSelect = (rollingStock: any) => {
    onSelect(rollingStock, manualSetNumber || undefined)
    onOpenChange(false)
    setManualSetNumber('')
    setShowManualInput(false)
  }

  const handleManualSetNumber = () => {
    if (currentSelection?.rollingStockId && manualSetNumber) {
      // Update existing selection with new set number
      onSelect(
        { id: currentSelection.rollingStockId }, 
        manualSetNumber
      )
      onOpenChange(false)
      setManualSetNumber('')
      setShowManualInput(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader>
          <SheetTitle>Link Rolling Stock</SheetTitle>
          <SheetDescription>
            Select the train type for this journey leg
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <RollingStockSearch
            operator={operator}
            onSelect={handleSelect}
            onClose={() => onOpenChange(false)}
          />

          {currentSelection && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Set Number</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualInput(!showManualInput)}
                >
                  {showManualInput ? 'Cancel' : 'Edit'}
                </Button>
              </div>

              {showManualInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., ICE 123, TGV 456"
                    value={manualSetNumber}
                    onChange={(e) => setManualSetNumber(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleManualSetNumber}
                    disabled={!manualSetNumber.trim()}
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  {currentSelection.setNumber || 'No set number specified'}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}