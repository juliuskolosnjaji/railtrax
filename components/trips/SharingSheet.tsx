'use client'

import { useState } from 'react'
import { Share2, Link, Code, X, Copy, Check, Globe, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface SharingSheetProps {
  tripId: string
  isPublic?: boolean
  shareToken?: string | null
  onShare: () => Promise<void>
  onUnshare: () => Promise<void>
}

export function SharingSheet({ tripId, isPublic, shareToken, onShare, onUnshare }: SharingSheetProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const shareUrl = shareToken ? `${process.env.NEXT_PUBLIC_URL}/trip/${shareToken}` : ''
  const embedUrl = shareToken ? `${process.env.NEXT_PUBLIC_URL}/embed/${shareToken}` : ''
  const embedCode = shareToken ? `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>` : ''

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleShare = async () => {
    setIsLoading(true)
    try {
      await onShare()
    } catch (error) {
      console.error('Failed to share trip:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnshare = async () => {
    setIsLoading(true)
    try {
      await onUnshare()
    } catch (error) {
      console.error('Failed to unshare trip:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800 gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Share Trip</SheetTitle>
          <SheetDescription>
            {isPublic 
              ? 'Your trip is currently shared publicly.' 
              : 'Share your trip with others to let them view your journey.'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Share Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public-share">Public Sharing</Label>
              <p className="text-sm text-gray-500">
                Allow anyone with the link to view your trip
              </p>
            </div>
            <Switch
              id="public-share"
              checked={isPublic}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleShare()
                } else {
                  handleUnshare()
                }
              }}
              disabled={isLoading}
            />
          </div>

          {isPublic && shareToken && (
            <>
              {/* Share URL */}
              <div className="space-y-2">
                <Label>Share URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={shareUrl} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleCopy(shareUrl, 'url')}
                  >
                    {copied === 'url' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Embed Code */}
              <div className="space-y-2">
                <Label>Embed Code</Label>
                <div className="space-y-2">
                  <Textarea 
                    value={embedCode}
                    readOnly
                    className="font-mono text-xs"
                    rows={3}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(embedCode, 'embed')}
                    className="w-full"
                  >
                    {copied === 'embed' ? (
                      <><Check className="h-4 w-4 mr-2" /> Copied!</>
                    ) : (
                      <><Code className="h-4 w-4 mr-2" /> Copy Embed Code</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <Label>Quick Actions</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(shareUrl, 'url')}
                    className="gap-2"
                  >
                    <Link className="h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Generate calendar download URL for this trip
                      const calendarUrl = `${process.env.NEXT_PUBLIC_URL}/api/trips/${tripId}/calendar`
                      window.open(calendarUrl, '_blank')
                    }}
                    className="gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Download .ics
                  </Button>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Globe className="h-4 w-4" />
                    <span>Your trip will be viewable at:</span>
                  </div>
                  <a 
                    href={shareUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                  >
                    {shareUrl}
                  </a>
                </div>
              </div>
            </>
          )}

          {!isPublic && (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">
                Enable sharing to get a public link and embed code for your trip.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}