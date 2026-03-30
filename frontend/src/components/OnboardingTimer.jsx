import { useState, useEffect, useRef } from 'react'

// Logs timed to match what the backend actually does
// time = seconds after start, status = 'pending' | 'running' | 'done' | 'warn'
function buildLogs(segment = 'seu negócio') {
  return [
    { t: 0.1,  text: 'Iniciando configuração Talk One-Click...',        status: 'done' },
    { t: 0.4,  text: 'Conectando à Talk API...',                        status: 'done' },
    { t: 0.7,  text: 'Credenciais validadas ✓',                         status: 'done' },
    { t: 1.0,  text: `Chamando GPT-4o para ${segment}...`,             status: 'running' },
    { t: 3.5,  text: 'Configuração IA gerada com sucesso',              status: 'done' },
    { t: 3.8,  text: 'Iniciando criação de setores...',                 status: 'running' },
    { t: 5.0,  text: 'Setores criados',                                 status: 'done' },
    { t: 5.2,  text: 'Iniciando criação de etiquetas...',               status: 'running' },
    { t: 6.5,  text: 'Etiquetas criadas com cores configuradas',        status: 'done' },
    { t: 6.8,  text: 'Montando fluxo FlowchartBot...',                  status: 'running' },
    { t: 8.0,  text: 'Chatbot criado — steps conectados',               status: 'done' },
    { t: 8.3,  text: 'Configurando preferências da organização...',     status: 'running' },
    { t: 9.5,  text: 'Preferências salvas',                             status: 'done' },
    { t: 9.8,  text: 'Finalizando e validando recursos...',             status: 'running' },
  ]
}

const PREFIX = {
  done:    { char: '✓', color: '#22c55e' },
  running: { char: '⟳', color: '#4C70DA' },
  warn:    { char: '!', color: '#f59e0b' },
  pending: { char: '·', color: '#555a65' },
}

export default function OnboardingTimer({ startTime, segment }) {
  const [elapsed, setElapsed] = useState(0)
  const [visibleCount, setVisibleCount] = useState(0)
  const bottomRef = useRef(null)

  const logs = buildLogs(segment || 'seu negócio')

  useEffect(() => {
    const iv = setInterval(() => {
      const e = (Date.now() - startTime) / 1000
      setElapsed(e)
      const visible = logs.filter(l => l.t <= e).length
      setVisibleCount(visible)
    }, 80)
    return () => clearInterval(iv)
  }, [startTime])

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [visibleCount])

  const seconds = elapsed.toFixed(1)
  const lastLog = logs[visibleCount - 1]
  const isRunning = lastLog?.status === 'running'

  return (
    <div style={{
      minHeight: '100svh', background: '#0a0c0e',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    }}>
      <style>{`
        @keyframes termBlink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes termFadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes termSpin   { to{transform:rotate(360deg)} }
        @keyframes termPulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      {/* Terminal window */}
      <div style={{
        width: '100%', maxWidth: 580,
        background: '#0f1114', border: '1px solid #1e2329',
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
          background: '#161a1e', borderBottom: '1px solid #1e2329',
        }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#555a65', marginLeft: 8 }}>talk-one-click — deploy</span>
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#4C70DA' }}>
            {seconds}s
          </span>
        </div>

        {/* Log area */}
        <div style={{
          padding: '16px', minHeight: 280, maxHeight: 360, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {/* Static header */}
          <div style={{ color: '#555a65', fontSize: 12, marginBottom: 8 }}>
            <span style={{ color: '#4C70DA' }}>talk@deploy</span>
            <span style={{ color: '#555a65' }}>:</span>
            <span style={{ color: '#7b93e8' }}>~/onboarding</span>
            <span style={{ color: '#FFFFFF' }}> $ </span>
            <span style={{ color: '#ACADBD' }}>./configure.sh --env=production</span>
          </div>

          {logs.slice(0, visibleCount).map((log, i) => {
            const isLast = i === visibleCount - 1
            const pfx = PREFIX[log.status] ?? PREFIX.pending
            const isSpinning = isLast && log.status === 'running'

            return (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  animation: 'termFadeIn 0.2s ease both',
                  lineHeight: 1.6,
                }}
              >
                {/* Prefix icon */}
                {isSpinning ? (
                  <div style={{
                    flexShrink: 0, width: 12, height: 12, marginTop: 3,
                    borderRadius: '50%',
                    border: `2px solid ${pfx.color}33`,
                    borderTopColor: pfx.color,
                    animation: 'termSpin 0.7s linear infinite',
                  }} />
                ) : (
                  <span style={{
                    flexShrink: 0, width: 14, height: 14, marginTop: 2,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: pfx.color, fontSize: 13,
                  }}>
                    {pfx.char}
                  </span>
                )}

                {/* Timestamp */}
                <span style={{ fontSize: 11, color: '#3a3f48', flexShrink: 0, marginTop: 1 }}>
                  {log.t.toFixed(1)}s
                </span>

                {/* Message */}
                <span style={{
                  fontSize: 13, color: log.status === 'done' ? '#ACADBD' : log.status === 'running' ? '#FFFFFF' : '#6b7280',
                  fontWeight: isLast && log.status === 'running' ? 500 : 400,
                }}>
                  {log.text}
                </span>
              </div>
            )
          })}

          {/* Blinking cursor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ color: '#4C70DA', fontSize: 13 }}>$</span>
            <span style={{
              display: 'inline-block', width: 8, height: 14,
              background: '#4C70DA', borderRadius: 1,
              animation: 'termBlink 1.1s step-end infinite',
            }} />
          </div>

          <div ref={bottomRef} />
        </div>

        {/* Footer bar */}
        <div style={{
          padding: '10px 16px',
          background: '#0d1013', borderTop: '1px solid #1e2329',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: '#22c55e',
            animation: 'termPulse 1.5s ease-in-out infinite',
            boxShadow: '0 0 6px #22c55e',
          }} />
          <span style={{ fontSize: 11, color: '#555a65' }}>
            {isRunning
              ? logs[visibleCount - 1]?.text ?? 'Processando...'
              : visibleCount >= logs.length
                ? 'Finalizando...'
                : 'Aguardando...'}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#3a3f48' }}>
            {visibleCount}/{logs.length} etapas
          </span>
        </div>
      </div>

      {/* Subtitle below terminal */}
      <p style={{ fontSize: 13, color: '#555a65', marginTop: 20, textAlign: 'center' }}>
        Configuração em andamento — isso leva menos de 15 segundos
      </p>
    </div>
  )
}
