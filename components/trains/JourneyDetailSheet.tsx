'use client'

import { useState } from 'react'
import { X, Train, AlertTriangle, ChevronRight } from 'lucide-react'
import { OperatorBadge } from '@/components/ui/OperatorBadge'
import { TrainDetailSheet } from './TrainDetailSheet'

interface JourneyLeg {
  origin: string
  originIbnr: string | null
  originLat: number | null
  originLon: number | null
  destination: string
  destinationIbnr: string | null
  destinationLat: number | null
  destinationLon: number | null
  departure: string
  arrival: string
  operator: string | null
  trainNumber: string
  tripId: string | null
  delayMinutes: number
  platform: string | null
  plannedDeparturePlatform: string | null
  plannedArrivalPlatform: string | null
  departurePlatform: string | null
  arrivalPlatform: string | null
  line?: {
    name: string
    operator?: {
      name: string
    }
  }
}

interface Journey {
  legs: JourneyLeg[]
  totalDuration?: number
  changes?: number
}

interface JourneyDetailSheetProps {
  journey: Journey
  onClose: () => void
  onAddToTrip: (tripId: string) => void
}

export function JourneyDetailSheet({ journey, onClose, onAddToTrip }: JourneyDetailSheetProps) {
  const [showTripPicker, setShowTripPicker] = useState(false)
  const [selectedTrain, setSelectedTrain] = useState<string|null>(null)

  const totalDelayMin = journey.legs.reduce((sum, l) =>
    sum + Math.round((l.delayMinutes ?? 0) / 60), 0)

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed',inset:0,zIndex:100,
        background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',
      }}/>
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:101,
        background:'#0a1628',border:'1px solid #1e2d4a',
        borderRadius:'14px 14px 0 0',
        maxHeight:'92vh',display:'flex',flexDirection:'column',
      }}>

        {/* Header */}
        <div style={{
          padding:'14px 16px',borderBottom:'1px solid #1e2d4a',
          display:'flex',alignItems:'center',gap:10,flexShrink:0,
        }}>
          <button onClick={onClose} style={{
            width:28,height:28,display:'flex',
            alignItems:'center',justifyContent:'center',
            background:'#0d1f3c',border:'1px solid #1e3a6e',
            borderRadius:6,cursor:'pointer',flexShrink:0,
          }}>
            <X size={14} color="#4f8ef7"/>
          </button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:500,color:'#fff'}}>
              {journey.legs[0]?.origin} →{' '}
              {journey.legs[journey.legs.length-1]?.destination}
            </div>
            <div style={{fontSize:11,color:'#4a6a9a',marginTop:1}}>
              {formatDuration(journey.totalDuration || 0)} ·{' '}
              {(journey.changes || 0) === 0 ? 'Direkt'
                : `${journey.changes || 0} Umstieg${(journey.changes || 0)>1?'e':''}`}
            </div>
          </div>
          {/* Total delay badge */}
          {totalDelayMin > 0 ? (
            <span style={{
              fontSize:11,padding:'3px 8px',borderRadius:4,
              background:'#1f0d0d',color:'#e25555',
              border:'1px solid #3a1515',flexShrink:0,
            }}>
              +{totalDelayMin} Min.
            </span>
          ) : (
            <span style={{
              fontSize:11,padding:'3px 8px',borderRadius:4,
              background:'#0d2618',color:'#3ecf6e',
              border:'1px solid #1a4a2e',flexShrink:0,
            }}>
              Pünktlich
            </span>
          )}
        </div>

        {/* Delay warning */}
        {totalDelayMin > 5 && (
          <div style={{
            padding:'10px 16px',
            background:'rgba(245,158,11,0.08)',
            borderBottom:'1px solid rgba(245,158,11,0.2)',
            display:'flex',alignItems:'center',gap:8,flexShrink:0,
          }}>
            <AlertTriangle size={13} color="#f59e0b"/>
            <span style={{fontSize:12,color:'#f59e0b'}}>
              Verspätung auf dieser Verbindung — Anschlusszüge prüfen
            </span>
          </div>
        )}

        {/* Journey timeline */}
        <div style={{flex:1,overflowY:'auto',padding:'8px 0',
                     WebkitOverflowScrolling:'touch'}}>
          {journey.legs.map((leg, i) => {
            const isLast = i === journey.legs.length - 1
            const nextLeg = journey.legs[i + 1]
            const transferMin = nextLeg && leg.departure
              ? Math.round(
                  (new Date(nextLeg.departure).getTime() -
                   new Date(leg.arrival).getTime()) / 60000
                )
              : null
            const tightTransfer = transferMin !== null && transferMin < 6

            return (
              <div key={i}>
                {/* Leg block */}
                <div style={{
                  margin:'0 12px 0 16px',
                  background:'#0d1628',
                  border:'1px solid #1e2d4a',
                  borderRadius:10,
                  overflow:'hidden',
                }}>
                  {/* Origin row */}
                  <div style={{
                    display:'flex',alignItems:'center',
                    justifyContent:'space-between',
                    padding:'10px 12px',
                  }}>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,
                                   color:'#fff',fontVariantNumeric:'tabular-nums'}}>
                        {formatTime(leg.departure)}
                        {(leg.delayMinutes ?? 0) > 0 && (
                          <span style={{fontSize:11,color:'#e25555',marginLeft:6}}>
                            +{Math.round(leg.delayMinutes)}
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:12,color:'#8ba3c7',marginTop:1}}>
                        {leg.origin}
                      </div>
                    </div>
                    {leg.plannedDeparturePlatform && (
                      <div style={{
                        fontSize:11,
                        color: leg.departurePlatform &&
                               leg.departurePlatform !== leg.plannedDeparturePlatform
                          ? '#f59e0b' : '#4a6a9a',
                      }}>
                        Gl. {leg.departurePlatform ?? leg.plannedDeparturePlatform}
                      </div>
                    )}
                  </div>

                  {/* Middle: train info */}
                  <div style={{
                    padding:'8px 12px',
                    borderTop:'1px solid #1e2d4a',
                    borderBottom:'1px solid #1e2d4a',
                    display:'flex',alignItems:'center',
                    justifyContent:'space-between',gap:8,
                    background:'#080d1a',
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <OperatorBadge
                        operator={leg.operator}
                        lineName={leg.line?.name ?? leg.trainNumber}
                      />
                      <span style={{fontSize:12,color:'#4a6a9a'}}>
                        {formatDuration(
                          Math.round(
                            (new Date(leg.arrival).getTime() -
                             new Date(leg.departure).getTime()) / 60000
                          )
                        )}
                      </span>
                    </div>
                    {/* Tap to see train detail */}
                    <button
                      onClick={() => setSelectedTrain(
                        leg.line?.name ?? leg.trainNumber
                      )}
                      style={{
                        fontSize:11,color:'#4f8ef7',background:'none',
                        border:'none',cursor:'pointer',padding:0,
                        display:'flex',alignItems:'center',gap:3,
                      }}
                    >
                      Details
                      <ChevronRight size={11}/>
                    </button>
                  </div>

                  {/* Destination row */}
                  <div style={{
                    display:'flex',alignItems:'center',
                    justifyContent:'space-between',
                    padding:'10px 12px',
                  }}>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,
                                   color:'#fff',fontVariantNumeric:'tabular-nums'}}>
                        {formatTime(leg.arrival)}
                        {(leg.delayMinutes ?? 0) > 0 && (
                          <span style={{fontSize:11,color:'#e25555',marginLeft:6}}>
                            +{Math.round(leg.delayMinutes)}
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:12,color:'#8ba3c7',marginTop:1}}>
                        {leg.destination}
                      </div>
                    </div>
                    {leg.plannedArrivalPlatform && (
                      <div style={{fontSize:11,color:'#4a6a9a'}}>
                        Gl. {leg.arrivalPlatform ?? leg.plannedArrivalPlatform}
                      </div>
                    )}
                  </div>
                </div>

                {/* Transfer block between legs */}
                {!isLast && transferMin !== null && (
                  <div style={{
                    display:'flex',alignItems:'center',gap:8,
                    padding:'8px 20px',
                    color: tightTransfer ? '#f59e0b' : '#4a6a9a',
                  }}>
                    <div style={{
                      width:2,height:24,
                      background: tightTransfer ? '#f59e0b' : '#1e2d4a',
                      marginLeft:16,flexShrink:0,
                    }}/>
                    <span style={{fontSize:11}}>
                      {tightTransfer && '⚠ '}
                      Umstieg · {transferMin} Min.
                      {tightTransfer && ' (knapper Anschluss)'}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bottom action */}
        <div style={{
          padding:'12px 16px',borderTop:'1px solid #1e2d4a',
          flexShrink:0,
        }}>
          <button
            onClick={() => setShowTripPicker(true)}
            style={{
              width:'100%',padding:'13px',
              background:'#2563eb',color:'#fff',
              border:'none',borderRadius:9,
              fontSize:14,fontWeight:600,cursor:'pointer',
            }}
          >
            + Zur Reise hinzufügen
          </button>
        </div>

        {/* Nested: train detail */}
        {selectedTrain && (
          <TrainDetailSheet
            trainNumber={selectedTrain}
            date={journey.legs[0]?.departure?.slice(0,10)}
            onClose={() => setSelectedTrain(null)}
          />
        )}

        {showTripPicker && (
          <div style={{
            position:'fixed',inset:0,zIndex:102,
            background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)',
            display:'flex',alignItems:'center',justifyContent:'center',
            padding:20,
          }}
          onClick={() => setShowTripPicker(false)}
          >
            <div style={{
              background:'#0a1628',border:'1px solid #1e2d4a',
              borderRadius:14,padding:20,maxWidth:400,width:'100%',
            }}
            onClick={e => e.stopPropagation()}
            >
              <h3 style={{fontSize:16,fontWeight:600,color:'#fff',margin:0}}>
                Reise auswählen
              </h3>
              <p style={{fontSize:12,color:'#4a6a9a',marginTop:4}}>
                Wähle eine bestehende Reise oder erstelle eine neue
              </p>
              <div style={{marginTop:16}}>
                <button
                  onClick={() => {
                    setShowTripPicker(false)
                    // Create new trip logic would go here
                  }}
                  style={{
                    width:'100%',padding:'12px',
                    background:'#2563eb',color:'#fff',
                    border:'none',borderRadius:8,
                    fontSize:14,fontWeight:500,cursor:'pointer',
                    marginBottom:8,
                  }}
                >
                  + Neue Reise erstellen
                </button>
                <button
                  onClick={() => setShowTripPicker(false)}
                  style={{
                    width:'100%',padding:'12px',
                    background:'transparent',color:'#4a6a9a',
                    border:'1px solid #1e2d4a',borderRadius:8,
                    fontSize:14,fontWeight:500,cursor:'pointer',
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}