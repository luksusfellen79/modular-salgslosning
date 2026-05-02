import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ACTIVITY_PRESETS = [
  { name: 'Billiard', emoji: '🎱', points: [100, 75, 50] },
  { name: 'Karaoke', emoji: '🎤', points: [100, 75, 50] },
  { name: 'Dart', emoji: '🎯', points: [100, 75, 50] },
  { name: 'Brettspill', emoji: '🎲', points: [100, 75, 50] },
  { name: 'Flipperspill', emoji: '🕹️', points: [100, 75, 50] },
  { name: 'Annet', emoji: '🏆', points: [100, 75, 50] },
]

export default function ActivityScoring({ sessionId, stopIndex, activityName, participants, onClose }) {
  const [scores, setScores] = useState({}) // userId -> score
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const activity = ACTIVITY_PRESETS.find(a => a.name === activityName) || ACTIVITY_PRESETS[ACTIVITY_PRESETS.length - 1]

  function setScore(userId, score) {
    setScores(prev => ({ ...prev, [userId]: score }))
  }

  async function handleSave() {
    setSaving(true)
    const entries = Object.entries(scores).filter(([, s]) => s > 0)
    if (entries.length === 0) { onClose(); return }

    for (const [userId, score] of entries) {
      await supabase
        .from('activity_scores')
        .upsert({
          session_id: sessionId,
          stop_index: stopIndex,
          user_id: userId,
          score,
        }, { onConflict: 'session_id,stop_index,user_id' })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(onClose, 1000)
  }

  return (
    <div className="activity-overlay">
      <div className="activity-modal">
        <div className="activity-header">
          <span className="activity-emoji">{activity.emoji}</span>
          <div>
            <h2>{activityName || 'Aktivitet'}</h2>
            <p>Gi poeng til deltakerne</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Quick-assign topp 3 */}
        <div className="quick-section">
          <p className="quick-label">Hurtigtildel podium</p>
          <div className="quick-row">
            {['🥇 1. plass', '🥈 2. plass', '🥉 3. plass'].map((label, i) => (
              <div key={i} className="quick-col">
                <p className="quick-place-label">{label}</p>
                <select
                  onChange={e => {
                    const userId = e.target.value
                    if (!userId) return
                    setScore(userId, activity.points[i])
                  }}
                  defaultValue=""
                >
                  <option value="">–</option>
                  {participants.map(p => (
                    <option key={p.userId} value={p.userId}>{p.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="divider">eller sett manuelt</div>

        {/* Manuell per deltaker */}
        <div className="manual-list">
          {participants.map(p => (
            <div key={p.userId} className="manual-row">
              <span className="manual-name">{p.name}</span>
              <div className="point-btns">
                {[0, 25, 50, 75, 100].map(pts => (
                  <button
                    key={pts}
                    className={`point-btn ${scores[p.userId] === pts ? 'active' : ''}`}
                    onClick={() => setScore(p.userId, pts)}
                  >
                    {pts}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn-primary save-btn"
          onClick={handleSave}
          disabled={saving || saved}
        >
          {saved ? '✓ Lagret!' : saving ? 'Lagrer...' : 'Lagre poeng'}
        </button>
      </div>

      <style>{`
        .activity-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          display: flex;
          align-items: flex-end;
          z-index: 100;
        }

        .activity-modal {
          background: var(--surface, #1a1a2e);
          border-radius: 20px 20px 0 0;
          padding: 1.5rem 1rem 2rem;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
        }

        .activity-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .activity-emoji { font-size: 2rem; }
        .activity-header h2 { margin: 0; font-size: 1.2rem; }
        .activity-header p { margin: 0; font-size: 0.85rem; color: var(--text-secondary, #888); }
        .close-btn {
          margin-left: auto;
          background: none;
          border: none;
          color: var(--text-secondary, #888);
          font-size: 1.2rem;
          cursor: pointer;
        }

        .quick-section {
          background: var(--bg, #0f0f1a);
          border-radius: 10px;
          padding: 0.75rem;
          margin-bottom: 1rem;
        }
        .quick-label {
          font-size: 0.8rem;
          color: var(--text-secondary, #888);
          margin: 0 0 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .quick-row { display: flex; gap: 0.5rem; }
        .quick-col { flex: 1; }
        .quick-place-label { font-size: 0.75rem; margin: 0 0 0.25rem; }
        .quick-col select {
          width: 100%;
          padding: 0.4rem 0.3rem;
          background: var(--surface, #1a1a2e);
          border: 1px solid var(--border, #333);
          color: var(--text, #fff);
          border-radius: 6px;
          font-size: 0.8rem;
        }

        .divider {
          text-align: center;
          font-size: 0.8rem;
          color: var(--text-secondary, #888);
          margin: 0.75rem 0;
          position: relative;
        }
        .divider::before, .divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 35%;
          height: 1px;
          background: var(--border, #333);
        }
        .divider::before { left: 0; }
        .divider::after { right: 0; }

        .manual-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
        .manual-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .manual-name { width: 80px; font-size: 0.9rem; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .point-btns { display: flex; gap: 0.3rem; flex: 1; }
        .point-btn {
          flex: 1;
          padding: 0.4rem 0;
          border: 1px solid var(--border, #333);
          background: transparent;
          color: var(--text-secondary, #888);
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.1s;
        }
        .point-btn.active {
          background: var(--accent, #f59e0b);
          border-color: var(--accent, #f59e0b);
          color: #000;
          font-weight: bold;
        }

        .save-btn {
          width: 100%;
          padding: 0.9rem;
          font-size: 1rem;
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}
