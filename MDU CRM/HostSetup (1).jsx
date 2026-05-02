import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Larvik sentrum koordinater
const LARVIK_LAT = 59.0559
const LARVIK_LNG = 10.0275
const SEARCH_RADIUS = 1500 // meter

const ACTIVITIES = [
  { name: 'Billiard', emoji: '🎱' },
  { name: 'Karaoke', emoji: '🎤' },
  { name: 'Dart', emoji: '🎯' },
  { name: 'Brettspill', emoji: '🎲' },
  { name: 'Flipperspill', emoji: '🕹️' },
  { name: 'Annet', emoji: '🏆' },
]

async function searchBarsOverpass(lat, lng, radius) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="bar"](around:${radius},${lat},${lng});
      node["amenity"="pub"](around:${radius},${lat},${lng});
      node["amenity"="restaurant"]["alcohol"="yes"](around:${radius},${lat},${lng});
      node["amenity"="nightclub"](around:${radius},${lat},${lng});
    );
    out body;
  `
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  })
  const data = await res.json()
  return data.elements
    .filter(el => el.tags?.name)
    .map(el => ({
      osm_id: el.id,
      name: el.tags.name,
      address: [el.tags['addr:street'], el.tags['addr:housenumber']]
        .filter(Boolean)
        .join(' ') || el.tags['addr:city'] || 'Larvik',
      lat: el.lat,
      lng: el.lon,
    }))
}

function generateJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function HostSetup() {
  const navigate = useNavigate()
  const [venues, setVenues] = useState([])
  const [selected, setSelected] = useState([]) // [{ venue, order }]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const results = await searchBarsOverpass(LARVIK_LAT, LARVIK_LNG, SEARCH_RADIUS)
        setVenues(results)
      } catch (e) {
        setError('Kunne ikke hente steder. Sjekk internett og prøv igjen.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredVenues = venues.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function toggleVenue(venue) {
    setSelected(prev => {
      const exists = prev.find(s => s.venue.osm_id === venue.osm_id)
      if (exists) {
        return prev.filter(s => s.venue.osm_id !== venue.osm_id)
      } else {
        return [...prev, { venue, order: prev.length + 1, activity: null }]
      }
    })
  }

  function setActivity(osmId, activity) {
    setSelected(prev => prev.map(s =>
      s.venue.osm_id === osmId ? { ...s, activity } : s
    ))
  }

  function moveUp(index) {
    if (index === 0) return
    setSelected(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  function moveDown(index) {
    setSelected(prev => {
      if (index === prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  async function upsertVenue(v) {
    // Sjekk om venue finnes i DB fra før (via navn+adresse)
    const { data: existing } = await supabase
      .from('venues')
      .select('id')
      .eq('name', v.name)
      .maybeSingle()

    if (existing) return existing.id

    const { data, error } = await supabase
      .from('venues')
      .insert({ name: v.name, address: v.address, lat: v.lat, lng: v.lng })
      .select('id')
      .single()

    if (error) throw error
    return data.id
  }

  async function handleCreate() {
    if (selected.length < 2) return
    setCreating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Opprett route
      const { data: route, error: routeErr } = await supabase
        .from('routes')
        .insert({ owner_id: user.id, name: 'Kvelden i Larvik', is_public: false })
        .select('id')
        .single()
      if (routeErr) throw routeErr

      // 2. Upsert venues og opprett route_stops
      for (const { venue, order } of selected) {
        const venueId = await upsertVenue(venue)
        const { error: stopErr } = await supabase
          .from('route_stops')
          .insert({
            route_id: route.id,
            venue_id: venueId,
            stop_order: order,
            activity_name: activity?.name || null,
          })
        if (stopErr) throw stopErr
      }

      // 3. Opprett session
      const joinCode = generateJoinCode()
      const { data: session, error: sessionErr } = await supabase
        .from('sessions')
        .insert({
          route_id: route.id,
          host_id: user.id,
          join_code: joinCode,
          status: 'lobby',
          current_stop_index: 0,
        })
        .select('id')
        .single()
      if (sessionErr) throw sessionErr

      // 4. Legg til host som deltaker
      await supabase.from('session_participants').insert({
        session_id: session.id,
        user_id: user.id,
        total_score: 0,
      })

      navigate(`/lobby/${session.id}`)
    } catch (e) {
      console.error(e)
      setError('Noe gikk galt ved opprettelse. Prøv igjen.')
      setCreating(false)
    }
  }

  return (
    <div className="host-setup">
      <div className="setup-header">
        <h1>🍺 Sett opp kvelden</h1>
        <p>Velg hvilke steder dere skal innom – i Larvik og omegn</p>
      </div>

      {/* Valgte steder */}
      {selected.length > 0 && (
        <div className="selected-section">
          <h2>Din rute ({selected.length} stopp)</h2>
          <div className="selected-list">
            {selected.map(({ venue, order }, index) => (
              <div key={venue.osm_id} className="selected-item">
                <span className="stop-number">{order}</span>
                <div className="stop-info">
                  <strong>{venue.name}</strong>
                  <span>{venue.address}</span>
                  {/* Aktivitetsvelger */}
                  <div className="activity-picker">
                    <button
                      className={`activity-toggle ${!activity ? 'active' : ''}`}
                      onClick={() => setActivity(venue.osm_id, null)}
                    >Ingen</button>
                    {ACTIVITIES.map(a => (
                      <button
                        key={a.name}
                        className={`activity-toggle ${activity?.name === a.name ? 'active' : ''}`}
                        onClick={() => setActivity(venue.osm_id, a)}
                        title={a.name}
                      >{a.emoji}</button>
                    ))}
                  </div>
                  {activity && <span className="activity-label">{activity.emoji} {activity.name}</span>}
                </div>
                <div className="stop-actions">
                  <button onClick={() => moveUp(index)} disabled={index === 0}>↑</button>
                  <button onClick={() => moveDown(index)} disabled={index === selected.length - 1}>↓</button>
                  <button className="remove-btn" onClick={() => toggleVenue(venue)}>✕</button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn-primary create-btn"
            onClick={handleCreate}
            disabled={selected.length < 2 || creating}
          >
            {creating ? 'Oppretter kveld...' : `Start kvelden med ${selected.length} stopp →`}
          </button>
        </div>
      )}

      {/* Søk og liste */}
      <div className="venues-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Søk etter sted..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {loading && (
          <div className="loading-state">
            <span>🔍 Finner barer i Larvik...</span>
          </div>
        )}

        {error && (
          <div className="error-state">
            <span>⚠️ {error}</span>
          </div>
        )}

        {!loading && !error && filteredVenues.length === 0 && (
          <div className="empty-state">
            <span>Ingen steder funnet</span>
          </div>
        )}

        <div className="venues-grid">
          {filteredVenues.map(venue => {
            const isSelected = selected.some(s => s.venue.osm_id === venue.osm_id)
            const stopNum = selected.find(s => s.venue.osm_id === venue.osm_id)?.order
            return (
              <div
                key={venue.osm_id}
                className={`venue-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleVenue(venue)}
              >
                {isSelected && <span className="stop-badge">{stopNum}</span>}
                <div className="venue-icon">🍺</div>
                <div className="venue-info">
                  <strong>{venue.name}</strong>
                  <span>{venue.address || 'Larvik'}</span>
                </div>
                <div className="venue-toggle">
                  {isSelected ? '✓' : '+'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .host-setup {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem 1rem 6rem;
        }

        .setup-header {
          text-align: center;
          padding: 1.5rem 0 1rem;
        }

        .setup-header h1 {
          font-size: 1.8rem;
          margin-bottom: 0.25rem;
        }

        .setup-header p {
          color: var(--text-secondary, #888);
          font-size: 0.95rem;
        }

        .selected-section {
          background: var(--surface, #1a1a2e);
          border: 1px solid var(--accent, #f59e0b);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .selected-section h2 {
          font-size: 1rem;
          margin-bottom: 0.75rem;
          color: var(--accent, #f59e0b);
        }

        .selected-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .selected-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg, #0f0f1a);
          border-radius: 8px;
          padding: 0.6rem 0.75rem;
        }

        .stop-number {
          width: 24px;
          height: 24px;
          background: var(--accent, #f59e0b);
          color: #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.8rem;
          flex-shrink: 0;
        }

        .stop-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .activity-picker {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
          margin-top: 0.4rem;
        }
        .activity-toggle {
          padding: 0.2rem 0.4rem;
          border: 1px solid var(--border, #333);
          background: transparent;
          color: var(--text-secondary, #888);
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.1s;
        }
        .activity-toggle.active {
          background: var(--accent, #f59e0b);
          border-color: var(--accent, #f59e0b);
          color: #000;
        }
        .activity-label {
          font-size: 0.78rem;
          color: var(--accent, #f59e0b);
          margin-top: 0.2rem;
        }

        .stop-info strong { font-size: 0.95rem; }
        .stop-info span { font-size: 0.8rem; color: var(--text-secondary, #888); }

        .stop-actions {
          display: flex;
          gap: 0.25rem;
        }

        .stop-actions button {
          width: 28px;
          height: 28px;
          border: 1px solid var(--border, #333);
          background: transparent;
          color: var(--text, #fff);
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stop-actions button:disabled { opacity: 0.3; cursor: default; }
        .remove-btn { color: #ef4444 !important; border-color: #ef4444 !important; }

        .create-btn {
          width: 100%;
          padding: 0.9rem;
          font-size: 1rem;
          font-weight: bold;
        }

        .search-bar input {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1px solid var(--border, #333);
          background: var(--surface, #1a1a2e);
          color: var(--text, #fff);
          font-size: 1rem;
          margin-bottom: 1rem;
          box-sizing: border-box;
        }

        .loading-state, .error-state, .empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-secondary, #888);
        }

        .error-state { color: #ef4444; }

        .venues-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .venue-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          background: var(--surface, #1a1a2e);
          border: 1px solid var(--border, #333);
          border-radius: 10px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          position: relative;
        }

        .venue-card:active { transform: scale(0.98); }

        .venue-card.selected {
          border-color: var(--accent, #f59e0b);
          background: color-mix(in srgb, var(--accent, #f59e0b) 10%, var(--surface, #1a1a2e));
        }

        .stop-badge {
          position: absolute;
          top: -8px;
          left: -8px;
          width: 22px;
          height: 22px;
          background: var(--accent, #f59e0b);
          color: #000;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .venue-icon { font-size: 1.5rem; }

        .venue-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .venue-info strong { font-size: 0.95rem; }
        .venue-info span { font-size: 0.8rem; color: var(--text-secondary, #888); }

        .venue-toggle {
          width: 28px;
          height: 28px;
          border: 2px solid var(--border, #444);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          color: var(--text-secondary, #888);
          flex-shrink: 0;
          transition: all 0.15s;
        }

        .venue-card.selected .venue-toggle {
          background: var(--accent, #f59e0b);
          border-color: var(--accent, #f59e0b);
          color: #000;
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}
