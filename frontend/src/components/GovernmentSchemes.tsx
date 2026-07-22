import React, { useState, useMemo } from 'react'
import { matchSchemes, CATEGORY_META } from '../schemesData'
import type { MatchedScheme, SchemeCategory, MatchOpts } from '../schemesData'

/* ── Priority badge ─────────────────────────────────────── */
function PriorityBadge({ p }: { p: MatchedScheme['priority'] }) {
  const cfg = {
    critical: { label: '🔥 Top Match',    cls: 'gs-pri-critical' },
    high:     { label: '⭐ Highly Eligible', cls: 'gs-pri-high' },
    medium:   { label: '✅ Eligible',      cls: 'gs-pri-medium' },
    low:      { label: 'ℹ️ May Qualify',   cls: 'gs-pri-low' },
  }[p]
  return <span className={`gs-priority-badge ${cfg.cls}`}>{cfg.label}</span>
}

/* ── Single Scheme Card ─────────────────────────────────── */
function SchemeCard({ matched }: { matched: MatchedScheme }) {
  const [expanded, setExpanded] = useState(false)
  const { scheme, matchReason, priority, score } = matched
  const cat  = CATEGORY_META[scheme.category]

  return (
    <div
      className={`gs-card ${expanded ? 'gs-card-open' : ''}`}
      style={{ '--cat-gradient': cat.gradient, '--cat-text': cat.textColor } as React.CSSProperties}
    >
      {/* ── Card header ── */}
      <div className="gs-card-header" style={{ background: cat.gradient }}>
        <div className="gs-card-header-left">
          <span className="gs-emoji">{scheme.emoji}</span>
          <div>
            <div className="gs-short-name">{scheme.shortName}</div>
            <div className="gs-ministry">{scheme.ministry}</div>
          </div>
        </div>
        <div className="gs-card-header-right">
          <div className="gs-score-ring">
            <svg width="44" height="44" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle
                cx="22" cy="22" r="18" fill="none"
                stroke={cat.textColor} strokeWidth="3"
                strokeDasharray={`${(score / 100) * 113} 113`}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
              />
            </svg>
            <span className="gs-score-val" style={{ color: cat.textColor }}>{score}%</span>
          </div>
        </div>
      </div>

      {/* ── Match reason strip ── */}
      <div className="gs-match-reason">
        <span className="gs-match-icon">🎯</span>
        <p>{matchReason}</p>
        <PriorityBadge p={priority} />
      </div>

      {/* ── Key info row ── */}
      <div className="gs-info-row">
        <div className="gs-info-item">
          <span className="gs-info-label">💰 Benefit</span>
          <span className="gs-info-val">{scheme.benefitAmount}</span>
        </div>
        <div className="gs-info-item">
          <span className="gs-info-label">🏷️ Category</span>
          <span className="gs-info-val" style={{ color: cat.textColor }}>{cat.label}</span>
        </div>
      </div>

      {/* ── Expand toggle ── */}
      <button
        className="gs-expand-btn"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded ? '▲ Show Less' : '▼ View Details & Eligibility'}
      </button>

      {/* ── Expanded details ── */}
      {expanded && (
        <div className="gs-details">
          <p className="gs-description">{scheme.description}</p>

          <div className="gs-details-grid">
            {/* Eligibility */}
            <div className="gs-detail-section">
              <div className="gs-detail-title">✅ Eligibility</div>
              <ul className="gs-detail-list">
                {scheme.eligibility.map((e, i) => (
                  <li key={i}><span className="gs-li-dot" />  {e}</li>
                ))}
              </ul>
            </div>

            {/* Key Points */}
            <div className="gs-detail-section">
              <div className="gs-detail-title">⭐ Key Benefits</div>
              <ul className="gs-detail-list gs-detail-list-green">
                {scheme.keyPoints.map((k, i) => (
                  <li key={i}><span className="gs-li-dot gs-li-green" />  {k}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action buttons */}
          <div className="gs-actions">
            <a
              href={scheme.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gs-btn gs-btn-apply"
            >
              🌐 Apply Now / Official Website
            </a>
            <div className="gs-helpline">
              <span>📞 Helpline</span>
              <strong>{scheme.helpline}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function GovernmentSchemes({ opts }: { opts: MatchOpts }) {
  const [activeFilter, setActiveFilter] = useState<SchemeCategory | 'all'>('all')
  const [showAll, setShowAll]           = useState(false)

  const matched  = useMemo(() => matchSchemes(opts), [opts.plantName, opts.disease, opts.isHealthy, opts.severity])
  const filtered = activeFilter === 'all'
    ? matched
    : matched.filter(m => m.scheme.category === activeFilter)

  const visible  = showAll ? filtered : filtered.slice(0, 4)
  const topScheme = matched[0]
  const pmfbyMatch = matched.find(m => m.scheme.id === 'pmfby')

  // Unique categories in results for filter pills
  const cats = Array.from(new Set(matched.map(m => m.scheme.category)))

  return (
    <div className="gs-root">
      <style>{`
        .gs-root {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 10px;
        }
        .gs-section-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: rgba(255, 255, 255, 0.03);
          padding: 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .gs-header-left {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .gs-header-icon {
          font-size: 24px;
        }
        .gs-title {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          margin: 0 !important;
          border: none !important;
          padding: 0 !important;
        }
        .gs-subtitle {
          font-size: 12px;
          color: #94a3b8;
          margin: 2px 0 0 0;
        }
        .gs-top-match-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(249, 115, 22, 0.15);
          border: 1px solid rgba(249, 115, 22, 0.3) !important;
          color: #ff9800;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          align-self: flex-start;
        }
        .gs-pmfby-banner {
          display: flex;
          gap: 12px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2) !important;
          border-radius: 10px;
          padding: 12px;
          font-size: 12px;
          line-height: 1.4;
          text-align: left;
        }
        .gs-pmfby-left {
          font-size: 20px;
        }
        .gs-pmfby-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .gs-pmfby-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }
        .gs-pmfby-score {
          font-size: 11px;
          color: #4ade80;
          font-weight: bold;
        }
        .gs-alert-banner {
          display: flex;
          gap: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2) !important;
          border-radius: 10px;
          padding: 12px;
          font-size: 12px;
          color: #fca5a5;
          text-align: left;
        }
        .gs-filter-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 6px;
          scrollbar-width: none;
        }
        .gs-filter-row::-webkit-scrollbar {
          display: none;
        }
        .gs-filter-pill {
          font-size: 12px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(255, 255, 255, 0.1) !important;
          color: #cbd5e1;
          border-radius: 20px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .gs-filter-pill:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .gs-pill-active {
          background: #3b82f6;
          color: #fff;
          border-color: transparent !important;
        }
        .gs-cards-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .gs-cards-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .gs-card {
          background: rgba(10, 17, 32, 0.45);
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
          border: 1.5px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .gs-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.15) !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
        .gs-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--cat-gradient);
          color: var(--cat-text);
        }
        .gs-card-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .gs-emoji {
          font-size: 24px;
        }
        .gs-short-name {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
        }
        .gs-ministry {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.8);
        }
        .gs-score-ring {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
        }
        .gs-score-val {
          position: absolute;
          font-size: 10px;
          font-weight: 800;
        }
        .gs-match-reason {
          background: rgba(0, 0, 0, 0.2);
          padding: 8px 12px;
          font-size: 11px;
          color: #e2e8f0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .gs-match-reason p {
          margin: 0;
          flex: 1;
        }
        .gs-priority-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .gs-pri-critical { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .gs-pri-high { background: rgba(249, 115, 22, 0.2); color: #fb923c; }
        .gs-pri-medium { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .gs-pri-low { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }
        
        .gs-info-row {
          display: flex;
          padding: 10px 12px;
          gap: 12px;
          background: rgba(255, 255, 255, 0.02);
        }
        .gs-info-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .gs-info-label {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
        }
        .gs-info-val {
          font-size: 12px;
          font-weight: 600;
          color: #fff;
        }
        .gs-expand-btn {
          width: 100%;
          padding: 8px;
          font-size: 11px;
          background: rgba(255, 255, 255, 0.03);
          border: none !important;
          border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
          color: #3b82f6;
          text-align: center;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        .gs-expand-btn:hover {
          background: rgba(255, 255, 255, 0.07);
        }
        .gs-details {
          padding: 12px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
          font-size: 12px;
        }
        .gs-description {
          color: #cbd5e1;
          margin: 0 0 12px 0;
          line-height: 1.4;
        }
        .gs-details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        @media (min-width: 480px) {
          .gs-details-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .gs-detail-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .gs-detail-title {
          font-weight: 700;
          color: #fff;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .gs-detail-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .gs-detail-list li {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          color: #cbd5e1;
        }
        .gs-li-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #3b82f6;
          margin-top: 5px;
          flex-shrink: 0;
        }
        .gs-li-green {
          background: #10b981;
        }
        .gs-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .gs-btn-apply {
          background: #3b82f6;
          color: #fff !important;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: bold;
          text-decoration: none;
          font-size: 12px;
          transition: all 0.2s;
        }
        .gs-btn-apply:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        .gs-helpline {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          font-size: 11px;
          color: #94a3b8;
        }
        .gs-helpline strong {
          color: #fff;
          font-size: 12px;
        }
        .gs-show-more-btn {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.15) !important;
          color: #fff;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        }
        .gs-show-more-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.3) !important;
        }
        .gs-footer-note {
          display: flex;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          font-size: 11px;
          color: #94a3b8;
          text-align: left;
        }
      `}</style>
      {/* ── Section header ── */}
      <div className="gs-section-header">
        <div className="gs-header-left">
          <div className="gs-header-icon">🏛️</div>
          <div>
            <h2 className="gs-title">Government Schemes for You</h2>
            <p className="gs-subtitle">
              Based on your {opts.isHealthy ? 'healthy' : `${opts.disease}-affected`} {opts.plantName || 'crop'} — {matched.length} schemes matched
            </p>
          </div>
        </div>
        {topScheme && (
          <div className="gs-top-match-pill">
            <span>🔥 Best match:</span>
            <strong>{topScheme.scheme.shortName}</strong>
          </div>
        )}
        {/* ── PMFBY quick banner ── */}
        {pmfbyMatch && pmfbyMatch.score >= 70 && (
          <div className="gs-pmfby-banner">
            <div className="gs-pmfby-left">📊</div>
            <div className="gs-pmfby-body">
              <p>
                <strong>Your crop qualifies for {pmfbyMatch.scheme.name}.</strong>
                PM Fasal Bima Yojana may cover crop losses for your situation.
              </p>
              <div className="gs-pmfby-actions">
                <a href={pmfbyMatch.scheme.applyUrl} target="_blank" rel="noopener noreferrer" className="gs-btn gs-btn-apply">Apply / Learn More</a>
                <span className="gs-pmfby-score">Match: {pmfbyMatch.score}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Alert banner (if diseased + critical) ── */}
      {!opts.isHealthy && (opts.severity === 'critical' || opts.severity === 'high') && (
        <div className="gs-alert-banner">
          <span>⚠️</span>
          <p>
            <strong>Urgent:</strong> Your crop has {opts.severity} disease. PM Fasal Bima Yojana may cover your losses.
            File a claim at your nearest bank or Common Service Centre (CSC) immediately.
          </p>
        </div>
      )}

      {/* ── Category filter pills ── */}
      <div className="gs-filter-row">
        <button
          className={`gs-filter-pill ${activeFilter === 'all' ? 'gs-pill-active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          🌿 All ({matched.length})
        </button>
        {cats.map(c => {
          const meta  = CATEGORY_META[c]
          const count = matched.filter(m => m.scheme.category === c).length
          return (
            <button
              key={c}
              className={`gs-filter-pill ${activeFilter === c ? 'gs-pill-active' : ''}`}
              style={activeFilter === c ? { background: meta.gradient, color: meta.textColor, borderColor: 'transparent' } : {}}
              onClick={() => setActiveFilter(c)}
            >
              {meta.label} ({count})
            </button>
          )
        })}
      </div>

      {/* ── Scheme cards ── */}
      <div className="gs-cards-grid">
        {visible.map(m => (
          <SchemeCard key={m.scheme.id} matched={m} />
        ))}
      </div>

      {/* ── Show more ── */}
      {filtered.length > 4 && (
        <button className="gs-show-more-btn" onClick={() => setShowAll(s => !s)}>
          {showAll ? `▲ Show Less` : `▼ Show ${filtered.length - 4} More Schemes`}
        </button>
      )}

      {/* ── Footer note ── */}
      <div className="gs-footer-note">
        <span>ℹ️</span>
        <p>
          Visit your nearest <strong>Krishi Vigyan Kendra (KVK)</strong> or <strong>Block Agriculture Office</strong> to apply.
          Toll-free: <strong>1800-180-1551</strong> (Kisan Call Centre, 6am–10pm)
        </p>
      </div>
    </div>
  )
}
