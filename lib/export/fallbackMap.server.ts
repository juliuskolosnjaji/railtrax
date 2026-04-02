import 'server-only'

import sharp from 'sharp'
import { buildFallbackMapSvgMarkup, type FallbackLeg } from '@/lib/export/fallbackMap'

export async function generateFallbackMapPng(
  legs: FallbackLeg[],
  width: number = 794,
  height: number = 280,
): Promise<string | null> {
  const svg = buildFallbackMapSvgMarkup(legs, width, height)
  if (!svg) return null

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()
  return `data:image/png;base64,${pngBuffer.toString('base64')}`
}
