import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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

export default function Lobby() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [participants, setParticipants] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
  }, [])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('sessions')
        .select('*, routes(name)')
        .eq('id', sessionId)
        .single()
      setSession(data)

      // Hvis sesjonen allerede er aktiv (f.eks. gjest ble med etter host startet)
      if (data?.status === 'active') {
        navigate(`/session/${sessionId}`)
        return
      }

      await fetchParticipants()
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel(`lobby-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetchParticipants())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.new.status === 'active') {
          navigate(`/session/${sessionId}`)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [sessionId])

  async function fetchParticipants() {
    const { data } = await supabase
      .from('session_participants')
      .select('*, profiles(display_name)')
      .eq('session_id', sessionId)
    setParticipants(data || [])
  }

  async function startSession() {
    await supabase
      .from('sessions')
      .update({ status: 'active' })
      .eq('id', sessionId)
    navigate(`/session/${sessionId}`)
  }

  const isHost = session && currentUser && session.host_id === currentUser.id

  if (loading) {
    return (
      <div className="page" style={{ justifyContent: 'center', flex: 1 }}>
        <p className="text-muted text-center">Laster lobby...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="topbar">
        <h2 style={{ flex: 1, textAlign: 'center' }}>
          {isHost ? 'Lobby · Du er host' : 'Venter på host...'}
        </h2>
      </div>

      <div className="page">
        <div>
          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 8 }}>
            {isHost ? 'Del denne koden' : 'Kveldens kode'}
          </p>
          <div style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: 10,
            textAlign: 'center',
            padding: '20px 16px',
            color: '#1D9E75',
            background: '#E1F5EE',
            borderRadius: 12,
          }}>
            {session?.join_code}
          </div>
        </div>

        <div>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
            Deltakere ({participants.length})
          </p>
          <div className="gap-8">
            {participants.map((p, i) => {
              const col = AVATAR_COLORS[i % AVATAR_COLORS.length]
              const name = p.profiles?.display_name || 'Ukjent'
              const isMe = p.profile_id === currentUser?.id
              const isHostP = p.profile_id === session?.host_id
              return (
                <div key={p.id} className="list-row">
                  <div className="avatar" style={{ background: col.bg, color: col.color }}>
                    {initials(name)}
                  </div>
                  <p style={{ flex: 1, fontWeight: 500 }}>{name}</p>
                  {isHostP && <span className="pill pill-green">Host</span>}
                  {isMe && !isHostP && <span className="pill pill-gray">Deg</span>}
                </div>
              )
            })}
            {participants.length === 0 && (
              <div className="list-row" style={{ justifyContent: 'center', borderStyle: 'dashed' }}>
                <p className="text-muted">Venter på deltakere...</p>
              </div>
            )}
          </div>
        </div>

        {isHost && (
          <div style={{ marginTop: 'auto' }}>
            <button
              className="btn btn-primary"
              onClick={startSession}
              disabled={participants.length < 1}
            >
              Start kvelden! 🍺
            </button>
          </div>
        )}

        {!isHost && (
          <p className="text-muted text-center" style={{ marginTop: 'auto' }}>
            Hosten starter kvelden snart...
          </p>
        )}
      </div>
    </div>
  )
}
