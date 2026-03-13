'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/useDebounce'
import type { Station } from '@/lib/vendo'

interface StationInputProps {
  id: string
  label: string
  placeholder: string
  value: Station | null
  onChange: (station: Station | null) => void
}

export function StationInput({ id, label, placeholder, value, onChange }: StationInputProps) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: stations, isFetching } = useQuery<Station[]>({
    queryKey: ['stations', debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/stations/search?q=${encodeURIComponent(debouncedQuery)}`)
      const json = await res.json()
      return (json.data ?? []) as Station[]
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 24 * 60 * 60 * 1000,
  })

  // Sync external value changes → display text
  useEffect(() => {
    if (value) setQuery(value.name)
    else setQuery('')
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function handleSelect(s: Station) {
    onChange(s)
    setOpen(false)
  }

  const showDropdown = open && !isFetching && !!stations?.length

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 rounded-md pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-colors"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange(null)
          }}
          onFocus={() => debouncedQuery.length >= 2 && setOpen(true)}
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 animate-spin" />
        )}
      </div>

      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md shadow-xl overflow-hidden">
          {(stations ?? []).slice(0, 6).map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-zinc-700 flex items-center justify-between gap-3 transition-colors"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s) }}
              >
                <span className="truncate">{s.name}</span>
                <span className="text-xs text-zinc-500 shrink-0 font-mono">{s.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
