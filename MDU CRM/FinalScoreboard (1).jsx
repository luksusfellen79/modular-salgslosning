import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function FinalScoreboard() {
  const { id: sessionId } = useParams()
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    async function load() {
      // Hent deltakere med quiz-poeng
      const { data: participants } = await supabase
        .from('session_participants')
        .select('profile_id, total_score, profiles(display_name)')
        .eq('session_id', sessionId)

      // Hent aktivitetspoeng
      const { data: activityScores } = await supabase
        .from('activity_scores')
        .select('profile_id, score')
        .eq('session_id', sessionId)

      // Slå sammen
      const activityMap = {}
      for (const a of activityScores || []) {
        activityMap[a.profile_id] = (activityMap[a.profile_id] || 0) + a.score
      }

      const merged = (participants || []).map(p => ({
        userId: p.profile_id,
        name: p.profiles?.display_name || 'Ukjent',
        quizScore: p.total_score || 0,
        activityScore: activityMap[p.profile_id] || 0,
        total: (p.total_score || 0) + (activityMap[p.profile_id] || 0),
      }))

      merged.sort((a, b) => b.total - a.total)
      setResults(merged)
      setLoading(false)

      // Auto-reveal etter kort delay
      setTimeout(() => setRevealed(true), 600)
    }
    load()
  }, [sessionId])

  const medals = ['🥇', '🥈', '🥉']
  const winner = results[0]

  if (loading) {
    return (
      <div className="final-loading">
        <div className="loading-emoji">🍺</div>
        <p>Teller opp poeng...</p>
      </div>
    )
  }

  return (
    <div className="final-scoreboard">
      {/* Header */}
      <div className={`final-header ${revealed ? 'revealed' : ''}`}>
        <div className="trophy">🏆</div>
        <h1>Kvelden er over!</h1>
        {winner && (
          <div className="winner-announce">
            <span className="winner-name">{winner.name}</span>
            <span className="winner-sub">vant kvelden med {winner.total} poeng</span>
          </div>
        )}
      </div>

      {/* Podium for topp 3 */}
      {results.length >= 2 && (
        <div className={`podium ${revealed ? 'revealed' : ''}`}>
          {[results[1], results[0], results[2]].filter(Boolean).map((p, i) => {
            const realRank = results.indexOf(p)
            const heights = ['60px', '90px', '45px']
            const podiumOrder = [2, 1, 3]
            return (
              <div key={p.userId} className="podium-slot" style={{ '--height': heights[i] }}>
                <div className="podium-name">{p.name}</div>
                <div className="podium-score">{p.total}p</div>
                <div className="podium-medal">{medals[realRank] || ''}</div>
                <div className="podium-bar" style={{ height: heights[i] }}>
                  <span>{podiumOrder[i]}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full liste */}
      <div className={`results-list ${revealed ? 'revealed' : ''}`}>
        <h2>Komplett rangering</h2>
        {results.map((p, i) => (
          <div key={p.userId} className={`result-row rank-${i + 1}`}>
            <span className="rank-medal">{medals[i] || `${i + 1}.`}</span>
            <span className="result-name">{p.name}</span>
            <div className="result-scores">
              {p.quizScore > 0 && (
                <span className="score-pill quiz">🧠 {p.quizScore}</span>
              )}
              {p.activityScore > 0 && (
                <span className="score-pill activity">🎯 {p.activityScore}</span>
              )}
              <span className="score-total">{p.total}p</span>
            </div>
          </div>
        ))}
      </div>

      <button className="btn-primary home-btn" onClick={() => navigate('/')}>
        Tilbake til start
      </button>

      <style>{`
        .final-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 1rem;
        }
        .loading-emoji {
          font-size: 3rem;
          animation: bounce 1s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        .final-scoreboard {
          max-width: 500px;
          margin: 0 auto;
          padding: 1.5rem 1rem 6rem;
        }

        .final-header {
          text-align: center;
          padding: 1rem 0 1.5rem;
          opacity: 0;
          transform: translateY(-20px);
          transition: all 0.6s ease;
        }
        .final-header.revealed { opacity: 1; transform: translateY(0); }

        .trophy {
          font-size: 4rem;
          animation: spin 1s ease 0.8s both;
        }
        @keyframes spin {
          0% { transform: rotate(-20deg) scale(0.5); }
          60% { transform: rotate(10deg) scale(1.2); }
          100% { transform: rotate(0deg) scale(1); }
        }

        .final-header h1 {
          font-size: 2rem;
          margin: 0.5rem 0;
        }

        .winner-announce {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .winner-name {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--accent, #f59e0b);
        }
        .winner-sub {
          font-size: 0.9rem;
          color: var(--text-secondary, #888);
        }

        /* Podium */
        .podium {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 0.5rem;
          margin: 1.5rem 0;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s ease 0.3s;
        }
        .podium.revealed { opacity: 1; transform: translateY(0); }

        .podium-slot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          flex: 1;
        }
        .podium-name {
          font-size: 0.8rem;
          font-weight: bold;
          text-align: center;
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .podium-score {
          font-size: 0.75rem;
          color: var(--text-secondary, #888);
        }
        .podium-medal { font-size: 1.4rem; }
        .podium-bar {
          width: 100%;
          background: var(--accent, #f59e0b);
          border-radius: 6px 6px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          font-weight: bold;
          font-size: 1.2rem;
          opacity: 0.85;
        }
        .podium-slot:nth-child(1) .podium-bar { background: #9ca3af; }
        .podium-slot:nth-child(2) .podium-bar { background: var(--accent, #f59e0b); }
        .podium-slot:nth-child(3) .podium-bar { background: #b45309; }

        /* Results list */
        .results-list {
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s ease 0.5s;
        }
        .results-list.revealed { opacity: 1; transform: translateY(0); }

        .results-list h2 {
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary, #888);
          margin-bottom: 0.75rem;
        }

        .result-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--surface, #1a1a2e);
          border-radius: 10px;
          margin-bottom: 0.5rem;
          border: 1px solid transparent;
        }
        .result-row.rank-1 { border-color: var(--accent, #f59e0b); }

        .rank-medal { font-size: 1.2rem; width: 28px; text-align: center; }
        .result-name { flex: 1; font-weight: 500; }

        .result-scores {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .score-pill {
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          border-radius: 20px;
          background: var(--bg, #0f0f1a);
        }
        .score-pill.quiz { color: #60a5fa; }
        .score-pill.activity { color: #34d399; }
        .score-total {
          font-weight: bold;
          font-size: 1rem;
          color: var(--accent, #f59e0b);
          min-width: 40px;
          text-align: right;
        }

        .home-btn {
          width: 100%;
          margin-top: 2rem;
          padding: 1rem;
          font-size: 1rem;
        }
      `}</style>
    </div>
  )
}
