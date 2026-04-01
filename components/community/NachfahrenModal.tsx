'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Calendar, Clock, CheckCircle } from 'lucide-react'

interface NachfahrenModalProps {
  communityTrip: {
    id: string
    title: string
    trip: {
      legs: {
        originName: string
        destName: string
        lineName: string | null
        operator: string | null
      }[]
    }
  }
  onClose: () => void
}

export function NachfahrenModal({ communityTrip, onClose }: NachfahrenModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [time, setTime] = useState('08:00')
  const [options, setOptions] = useState<
    {
      index: number
      departure: string
      arrival: string
      changes: number
      legs: { lineName: string; operator: string | null }[]
    }[]
  >([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [newTripId, setNewTripId] = useState<string | null>(null)

  const handleSearch = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/community/trips/${communityTrip.id}/copy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate: date, startTime: time }),
        },
      )
      const data = await res.json()
      if (data.data?.options) {
        setOptions(data.data.options)
        setStep(2)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (selectedIndex === null) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/community/trips/${communityTrip.id}/copy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: date,
            startTime: time,
            selectedJourneyIndex: selectedIndex,
          }),
        },
      )
      const data = await res.json()
      if (data.data?.tripId) {
        setNewTripId(data.data.tripId)
        setStep(3)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 101,
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid hsl(var(--border))',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'hsl(var(--muted-foreground))',
              flexShrink: 0,
            }}
          >
            <X size={13} />
          </button>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'hsl(var(--foreground))',
              }}
            >
              Reise nachfahren
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'hsl(var(--muted-foreground))',
                marginTop: 2,
              }}
            >
              {communityTrip.title}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 3,
            background: 'hsl(var(--secondary))',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: '100%',
              width: step === 1 ? '33%' : step === 2 ? '66%' : '100%',
              background: 'hsl(var(--primary))',
              transition: 'width 0.3s',
            }}
          />
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 18px',
          }}
        >
          {step === 1 && (
            <div>
              <h4
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'hsl(var(--foreground))',
                  marginBottom: 16,
                }}
              >
                Datum und Uhrzeit wählen
              </h4>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: 'hsl(var(--muted-foreground))',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 6,
                    }}
                  >
                    <Calendar size={12} /> Datum
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--foreground))',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ width: 120 }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: 'hsl(var(--muted-foreground))',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 6,
                    }}
                  >
                    <Clock size={12} /> Zeit
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      color: 'hsl(var(--foreground))',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleSearch}
                disabled={loading}
                style={{
                  width: '100%',
                  height: 44,
                  background: loading
                    ? 'hsl(var(--muted))'
                    : 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  border: 'none',
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Suche...' : 'Züge suchen'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h4
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'hsl(var(--foreground))',
                  marginBottom: 16,
                }}
              >
                Verbindung wählen
              </h4>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                {options.map((opt) => (
                  <button
                    key={opt.index}
                    onClick={() => setSelectedIndex(opt.index)}
                    style={{
                      padding: '12px 14px',
                      background:
                        selectedIndex === opt.index
                          ? 'hsl(var(--primary) / 0.1)'
                          : 'hsl(var(--background))',
                      border: `1px solid ${
                        selectedIndex === opt.index
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--border))'
                      }`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: 'hsl(var(--foreground))',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {new Date(opt.departure).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                        →
                      </span>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: 'hsl(var(--foreground))',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {new Date(opt.arrival).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 12,
                          color: 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {opt.changes === 0
                          ? 'Direkt'
                          : `${opt.changes} Umst.`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {opt.legs.map((l, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            background: '#111e35',
                            border: '1px solid #1e3a6e',
                            color: '#60a5fa',
                          }}
                        >
                          {l.lineName}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleCreate}
                disabled={loading || selectedIndex === null}
                style={{
                  width: '100%',
                  height: 44,
                  background:
                    loading || selectedIndex === null
                      ? 'hsl(var(--muted))'
                      : 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  border: 'none',
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor:
                    loading || selectedIndex === null
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {loading ? 'Erstelle...' : 'Reise erstellen'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <CheckCircle
                size={48}
                color="#2dd4b0"
                style={{ marginBottom: 16 }}
              />
              <h4
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'hsl(var(--foreground))',
                  marginBottom: 8,
                }}
              >
                Reise erstellt!
              </h4>
              <p
                style={{
                  fontSize: 14,
                  color: 'hsl(var(--muted-foreground))',
                  marginBottom: 24,
                }}
              >
                Deine Kopie von "{communityTrip.title}" wurde erstellt.
              </p>
              <button
                onClick={() => router.push(`/trips/${newTripId}`)}
                style={{
                  height: 44,
                  padding: '0 24px',
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  border: 'none',
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Zur Reise →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
