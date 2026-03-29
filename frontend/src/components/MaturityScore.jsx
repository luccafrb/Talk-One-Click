import { useEffect, useRef, useState } from 'react'

const IMPACT_COLORS = { Alto: '#ef4444', Médio: '#f59e0b', Baixo: '#4C70DA' }

function scoreColor(score) {
  if (score < 40) return '#ef4444'
  if (score < 60) return '#f59e0b'
  if (score < 80) return '#4C70DA'
  return '#22c55e'
}

function Gauge({ score }) {
  const [animated, setAnimated] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const duration = 1500
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setAnimated(Math.round(eased * score))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [score])

  // Semicircle SVG params
  const r = 80
  const cx = 110
  const cy = 100
  const strokeW = 14
  const circumference = Math.PI * r           // half circle = π*r
  const progress = (animated / 100) * circumference
  const color = scoreColor(animated)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={220} height={115} viewBox="0 0 220 115" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#202326"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
      </svg>
      {/* Center labels overlaid */}
      <div style={{ marginTop: -70, textAlign: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 64, fontWeight: 800, color, fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>
          {animated}
        </span>
        <span style={{ fontSize: 20, color: '#ACADBD', verticalAlign: 'super', marginLeft: 2 }}>/100</span>
      </div>
    </div>
  )
}

export default function MaturityScore({ score, nivel, resumo, pontos_fortes, oportunidades, proximo_passo, tempoFinal }) {
  const color = scoreColor(score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        @keyframes msIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ms-s0 { animation: msIn 0.4s ease 0s    both; }
        .ms-s1 { animation: msIn 0.4s ease 0.1s  both; }
        .ms-s2 { animation: msIn 0.4s ease 0.2s  both; }
        .ms-s3 { animation: msIn 0.4s ease 0.3s  both; }
        .ms-s4 { animation: msIn 0.4s ease 0.4s  both; }
      `}</style>

      {/* Seção 1 — Gauge */}
      <div className="ms-s0" style={{
        background: '#202326', border: `1px solid ${color}33`,
        borderRadius: 20, padding: '28px 24px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#ACADBD', textTransform: 'uppercase', marginBottom: 16 }}>
          Índice de Maturidade de Atendimento
        </p>
        <Gauge score={score} />
        <p style={{ fontSize: 14, fontWeight: 600, color, marginBottom: 8 }}>{nivel}</p>
        <p style={{ fontSize: 15, color: '#ACADBD', maxWidth: 400, margin: '0 auto' }}>{resumo}</p>
      </div>

      {/* Seção 2 — Tempo */}
      {tempoFinal && (
        <div className="ms-s1" style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{
            background: '#202326', border: '1px solid #4C70DA33',
            borderRadius: 20, padding: '6px 16px',
            fontSize: 13, color: '#4C70DA',
          }}>
            ⚡ Conta configurada em {tempoFinal}s
          </span>
        </div>
      )}

      {/* Seção 3 — Pontos fortes */}
      <div className="ms-s2">
        <p style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginBottom: 12 }}>O que você já faz bem</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {pontos_fortes.map((ponto, i) => (
            <div key={i} style={{
              background: '#202326', border: '1px solid #22c55e33',
              borderRadius: 12, padding: 16,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 14, color: '#FFFFFF', lineHeight: 1.4 }}>{ponto}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Seção 4 — Oportunidades */}
      <div className="ms-s3">
        <p style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginBottom: 12 }}>Onde você pode evoluir</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {oportunidades.map((op, i) => {
            const impactColor = IMPACT_COLORS[op.impacto] ?? '#4C70DA'
            return (
              <div key={i} style={{
                background: '#202326',
                borderLeft: `3px solid ${impactColor}`,
                borderRadius: 12, padding: 16,
              }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', marginBottom: 6 }}>{op.titulo}</p>
                <p style={{ fontSize: 13, color: '#ACADBD', marginBottom: 10, lineHeight: 1.4 }}>{op.descricao}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                    background: `${impactColor}18`, color: impactColor, border: `1px solid ${impactColor}33`,
                  }}>
                    Impacto {op.impacto}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 999,
                    background: '#141619', color: '#ACADBD', border: '1px solid #2a2d32',
                  }}>
                    ⏱ {op.prazo}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Seção 5 — Próximo passo */}
      <div className="ms-s4" style={{
        background: 'linear-gradient(135deg, rgba(76,112,218,0.12), rgba(76,112,218,0.04))',
        border: '1px solid rgba(76,112,218,0.3)',
        borderRadius: 16, padding: 20,
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#4C70DA', marginBottom: 8 }}>
          🎯 Seu próximo passo
        </p>
        <p style={{ fontSize: 15, color: '#FFFFFF', lineHeight: 1.5 }}>{proximo_passo}</p>
      </div>
    </div>
  )
}
