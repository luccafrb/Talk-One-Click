import { useState, useEffect, useRef } from 'react'

const STEPS = [
  { label: 'Analisando seu negócio com IA...', activeFrom: 0, completedFrom: 2 },
  { label: 'Gerando configuração personalizada...', activeFrom: 2, completedFrom: 4 },
  { label: 'Criando setores...', activeFrom: 4, completedFrom: 6 },
  { label: 'Criando etiquetas...', activeFrom: 6, completedFrom: 8 },
  { label: 'Configurando chatbot...', activeFrom: 8, completedFrom: Infinity },
]

export default function OnboardingTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000)
    }, 100)
    return () => clearInterval(intervalRef.current)
  }, [startTime])

  const allDone = elapsed >= STEPS[STEPS.length - 1].activeFrom + 4
  const seconds = elapsed.toFixed(1)

  return (
    <div style={{
      minHeight: '100svh', background: '#141619',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <style>{`
        @keyframes shimmerBar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes timerPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
        @keyframes stepPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes finishingPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      {/* Título */}
      <p style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', textAlign: 'center', maxWidth: 480, margin: '0 auto 8px', lineHeight: 1.3 }}>
        Vamos ver em quanto tempo configuramos sua organização!
      </p>
      <p style={{ fontSize: 14, color: '#ACADBD', textAlign: 'center', marginBottom: 40 }}>
        Cronômetro iniciado — cada segundo conta 🚀
      </p>

      {/* Cronômetro */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <span style={{
          fontSize: 80, fontWeight: 800, color: '#4C70DA',
          fontFamily: "'Inter', sans-serif", lineHeight: 1,
          display: 'block',
        }}>
          {seconds}
        </span>
        <p style={{ fontSize: 16, color: '#ACADBD', marginTop: 6 }}>segundos e contando...</p>
      </div>

      {/* Barra shimmer */}
      <div style={{ width: '100%', maxWidth: 360, height: 3, background: '#202326', borderRadius: 4, overflow: 'hidden', marginBottom: 40, marginTop: 24 }}>
        <div style={{
          width: '30%', height: '100%', background: '#4C70DA', borderRadius: 4,
          animation: 'shimmerBar 1.4s ease-in-out infinite',
        }} />
      </div>

      {/* Etapas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 340 }}>
        {STEPS.map((step, i) => {
          const isCompleted = elapsed >= step.completedFrom
          const isActive = !isCompleted && elapsed >= step.activeFrom

          const iconColor = isCompleted ? '#22c55e' : isActive ? '#4C70DA' : '#ACADBD'
          const textColor = isActive ? '#FFFFFF' : '#ACADBD'
          const icon = isCompleted ? '✓' : isActive ? '◉' : '◎'

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                fontSize: 16, color: iconColor, flexShrink: 0,
                animation: isActive ? 'stepPulse 1.2s ease-in-out infinite' : 'none',
                display: 'inline-block',
              }}>
                {icon}
              </span>
              <span style={{ fontSize: 14, color: textColor, lineHeight: 1.3 }}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Finalizando */}
      {allDone && (
        <p style={{
          marginTop: 24, fontSize: 13, color: '#4C70DA',
          animation: 'finishingPulse 1.5s ease-in-out infinite',
        }}>
          Finalizando os últimos detalhes...
        </p>
      )}
    </div>
  )
}
