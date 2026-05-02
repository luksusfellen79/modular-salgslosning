import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ActivityScoring from '../components/ActivityScoring'

const AVATAR_COLORS = [
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#EEEDFE', color: '#534AB7' },
  { bg: '#FAEEDA', color: '#854F0B' },
  { bg: '#FAECE7', color: '#993C1D' },
  { bg: '#F4C0D1', color: '#72243E' },
]

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function TabBar({ active, onChange }) {
  return (
    <div className="bottom-tabs">
      {[
        { key: 'venue', label: 'Stopp' },
        { key: 'scores', label: 'Poeng' },
        { key: 'route', label: 'Rute' },
      ].map(t => (
        <button
          key={t.key}
          className={`bottom-tab ${active === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default function Session() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('venue')
  const [session, setSession] = useState(null)
  const [stops, setStops] = useState([])
  const [participants, setParticipants] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showActivity, setShowActivity] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
  }, [])

  useEffect(() => {
    load()

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        setSession(prev => ({ ...prev, ...payload.new }))
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetchParticipants())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [sessionId])

  async function load() {
    const { data: s } = await supabase
      .from('sessions')
      .select('*, routes(id, name)')
      .eq('id', sessionId)
      .single()
    setSession(s)

    const { data: routeStops } = await supabase
      .from('route_stops')
      .select('*, venues(id, name, address)')
      .eq('route_id', s.routes.id)
      .order('stop_order')
    setStops(routeStops || [])

    await fetchParticipants()
    setLoading(false)
  }

  async function fetchParticipants() {
    const { data } = await supabase
      .from('session_participants')
      .select('*, profiles(display_name)')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false })
    setParticipants(data || [])
  }

  async function advanceStop() {
    const nextIndex = (session.current_stop_index || 0) + 1
    await supabase
      .from('sessions')
      .update({ current_stop_index: nextIndex })
      .eq('id', sessionId)
    setSession(prev => ({ ...prev, current_stop_index: nextIndex }))
  }

  async function endSession() {
    await supabase
      .from('sessions')
      .update({ status: 'ended' })
      .eq('id', sessionId)
    navigate(`/session/${sessionId}/finale`)
  }

  const isHost = session && currentUser && session.host_id === currentUser.id
  const stopIndex = session?.current_stop_index || 0
  const currentStop = stops[stopIndex]
  const hasActivity = !!currentStop?.activity_name

  // Deltakere i format ActivityScoring forventer
  const participantList = participants.map(p => ({
    userId: p.user_id,
    name: p.profiles?.display_name || 'Ukjent',
  }))

  if (loading) {
    return (
      <div className="page" style={{ justifyContent: 'center', flex: 1 }}>
        <p className="text-muted text-center">Laster...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="topbar">
        <h2>{session?.routes?.name}</h2>
        <span className="pill pill-green" style={{ fontSize: 11 }}>
          Stopp {stopIndex + 1}/{stops.length}
        </span>
      </div>

      {tab === 'venue' && (
        <div className="page">
          {currentStop ? (
            <>
              <div className="card">
                <h3 style={{ marginBottom: 4 }}>{currentStop.venues?.name}</h3>
                <p className="text-muted">{currentStop.venues?.address}</p>
                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="pill pill-green">Stopp {stopIndex + 1} av {stops.length}</span>
                  {hasActivity && (
                    <span className="pill pill-amber">🎯 {currentStop.activity_name}</span>
                  )}
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => navigate(`/session/${sessionId}/quiz`, {
                  state: {
                    venueId: currentStop.venues?.id,
                    venueName: currentStop.venues?.name,
                    venueAddress: currentStop.venues?.address,
                  },
                })}
              >
                Start quiz for dette stedet 🎯
              </button>

              {/* Aktivitetspoeng – vises kun for host når stoppet har en aktivitet */}
              {isHost && hasActivity && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowActivity(true)}
                >
                  {currentStop.activity_name} – gi poeng 🏆
                </button>
              )}

              {isHost && stopIndex < stops.length - 1 && (
                <button className="btn btn-secondary" onClick={advanceStop}>
                  Neste stopp →
                </button>
              )}

              {isHost && stopIndex === stops.length - 1 && (
                <button
                  className="btn"
                  style={{ background: '#FCEBEB', borderColor: '#f0a0a0', color: '#a32d2d' }}
                  onClick={endSession}
                >
                  Avslutt kvelden 🏁
                </button>
              )}
            </>
          ) : (
            <p className="text-muted text-center">Ingen flere stopp!</p>
          )}
        </div>
      )}

      {tab === 'scores' && (
        <div className="page">
          <p style={{ fontSize: 13, color: '#888' }}>Totalpoeng kvelden</p>
          <div className="gap-8">
            {participants.map((p, i) => {
              const col = AVATAR_COLORS[i % AVATAR_COLORS.length]
              const name = p.profiles?.display_name || 'Ukjent'
              const maxScore = participants[0]?.total_score || 1
              return (
                <div key={p.id} className="list-row" style={{
                  background: i === 0 ? '#FAEEDA' : '#fff',
                  borderColor: i === 0 ? '#EF9F27' : '#eee',
                }}>
                  <span style={{
                    fontSize: i === 0 ? 18 : 14,
                    fontWeight: 500,
                    width: 28,
                    color: i === 0 ? '#BA7517' : '#888',
                  }}>
                    {i + 1}.
                  </span>
                  <div className="avatar" style={{ background: col.bg, color: col.color }}>
                    {initials(name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500 }}>{name}</p>
                    <div className="progress-bar" style={{ marginTop: 4 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${(p.total_score / maxScore) * 100}%`,
                          background: i === 0 ? '#EF9F27' : '#1D9E75',
                        }}
                      />
                    </div>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{p.total_score}p</span>
                </div>
              )
            })}
          </div>

          {/* Snarvei til finale for host */}
          {isHost && (
            <button
              className="btn"
              style={{ marginTop: 16, background: '#FCEBEB', borderColor: '#f0a0a0', color: '#a32d2d' }}
              onClick={endSession}
            >
              Avslutt og vis vinner 🏆
            </button>
          )}
        </div>
      )}

      {tab === 'route' && (
        <div className="page">
          <div className="gap-8">
            {stops.map((stop, i) => {
              const done = i < stopIndex
              const current = i === stopIndex
              return (
                <div
                  key={stop.id}
                  className="list-row"
                  style={{
                    opacity: done ? 0.5 : 1,
                    background: current ? '#FAEEDA' : '#fff',
                    borderColor: current ? '#EF9F27' : '#eee',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: done ? '#1D9E75' : current ? '#EF9F27' : '#E1F5EE',
                    color: done || current ? '#fff' : '#0F6E56',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, flexShrink: 0,
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, color: current ? '#412402' : undefined }}>
                      {stop.venues?.name}
                    </p>
                    <p className="text-muted">{stop.venues?.address}</p>
                    {stop.activity_name && (
                      <p style={{ fontSize: 12, color: '#EF9F27', marginTop: 2 }}>
                        🎯 {stop.activity_name}
                      </p>
                    )}
                  </div>
                  {current && <span className="pill pill-amber">Nå</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <TabBar active={tab} onChange={setTab} />

      {/* Aktivitetspoeng-modal */}
      {showActivity && currentStop?.activity_name && (
        <ActivityScoring
          sessionId={sessionId}
          stopIndex={stopIndex}
          activityName={currentStop.activity_name}
          participants={participantList}
          onClose={() => setShowActivity(false)}
        />
      )}
    </div>
  )
}
