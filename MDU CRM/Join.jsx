import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Join() {
  const [code, setCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleJoin(e) {
    e.preventDefault()
    if (!code || !displayName) return
    setLoading(true)
    setError('')

    try {
      // 1. Logg inn anonymt hvis ikke allerede innlogget
      const { data: { user: existingUser } } = await supabase.auth.getUser()
      let user = existingUser

      if (!user) {
        const { data, error: anonErr } = await supabase.auth.signInAnonymously()
        if (anonErr) throw anonErr
        user = data.user
      }

      // 2. Oppdater display_name i profilen
      await supabase
        .from('profiles')
        .upsert({ id: user.id, display_name: displayName.trim() })

      // 3. Finn sesjonen via join-kode
      const { data: session, error: sessionErr } = await supabase
        .from('sessions')
        .select('id, status')
        .eq('join_code', code.toUpperCase().trim())
        .single()

      if (sessionErr || !session) {
        setError('Fant ingen aktiv kveld med den koden. Sjekk at du skrev riktig.')
        setLoading(false)
        return
      }

      if (session.status === 'ended') {
        setError('Denne kvelden er allerede avsluttet.')
        setLoading(false)
        return
      }

      // 4. Legg til som deltaker
      await supabase.from('session_participants').upsert({
        session_id: session.id,
        profile_id: user.id,
        total_score: 0,
        veto_count: 0,
      }, { onConflict: 'session_id,profile_id' })

      navigate(`/lobby/${session.id}`)
    } catch (e) {
      console.error(e)
      setError('Noe gikk galt. Prøv igjen.')
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ flex: 1 }}>
      <div className="topbar" style={{ margin: '-16px -16px 0', padding: '14px 16px' }}>
        <button className="back-btn" onClick={() => navigate('/')}>← Tilbake</button>
        <h2>Bli med</h2>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, marginTop: 32 }}>
        <p className="text-muted text-center">Skriv inn kallenavnet ditt og koden fra hosten</p>

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, color: '#888', marginBottom: 4, display: 'block' }}>Kallenavn</label>
            <input
              type="text"
              placeholder="Hva skal vi kalle deg?"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 13, color: '#888', marginBottom: 4, display: 'block' }}>Join-kode</label>
            <input
              type="text"
              placeholder="F.eks. BEER42"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              style={{ textAlign: 'center', fontSize: 28, letterSpacing: 6, fontWeight: 600 }}
              required
            />
          </div>

          {error && <p style={{ color: '#e24b4a', fontSize: 13, textAlign: 'center' }}>{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading || !code || !displayName}>
            {loading ? 'Kobler til...' : 'Bli med 🍺'}
          </button>
        </form>
      </div>
    </div>
  )
}
