import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !displayName) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    })

    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="page" style={{ justifyContent: 'center', flex: 1 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 48 }}>📧</div>
          <h2>Sjekk e-posten!</h2>
          <p className="text-muted">Vi sendte en innloggingslenke til <strong>{email}</strong></p>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ justifyContent: 'center', flex: 1 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🍺</div>
        <h1>Pub Crawler</h1>
        <p className="text-muted" style={{ marginTop: 6 }}>Logg inn for å starte eller bli med på en kveld</p>
      </div>

      {/* Gjest-snarveier */}
      <div style={{
        background: '#f0faf5',
        border: '1px solid #c3e6d8',
        borderRadius: 12,
        padding: '16px',
        marginBottom: 24,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: '#0F6E56', marginBottom: 10, fontWeight: 500 }}>
          Skal du bli med på en kveld?
        </p>
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={() => navigate('/join')}
        >
          Bli med som gjest 🍺
        </button>
        <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
          Ingen e-post nødvendig – bare navn og join-kode
        </p>
      </div>

      <div style={{ textAlign: 'center', color: '#bbb', fontSize: 13, marginBottom: 16 }}>
        — eller logg inn som host —
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, color: '#888', marginBottom: 4, display: 'block' }}>Kallenavn</label>
          <input
            type="text"
            placeholder="Hva skal vi kalle deg?"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ fontSize: 13, color: '#888', marginBottom: 4, display: 'block' }}>E-post</label>
          <input
            type="email"
            placeholder="din@epost.no"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: '#e24b4a', fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Sender...' : 'Send innloggingslenke'}
        </button>
      </form>
    </div>
  )
}
