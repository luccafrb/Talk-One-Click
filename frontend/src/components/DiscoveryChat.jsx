import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SEGMENT_LABELS = {
  beleza: 'Beleza & Estética',
  saude: 'Saúde & Bem-estar',
  ecommerce: 'E-commerce',
  educacao: 'Educação',
  imobiliaria: 'Imobiliária',
  juridico: 'Jurídico',
  financeiro: 'Financeiro',
  restaurante: 'Restaurante & Delivery',
  logistica: 'Logística',
  tecnologia: 'Tecnologia & SaaS',
  construcao: 'Construção & Reforma',
  automotivo: 'Automotivo',
  eventos: 'Eventos & Festas',
  pet: 'Pet Shop & Veterinário',
  outro: 'Outro',
}
const APPROACH_LABELS = {
  consultivo: 'Consultivo',
  direto: 'Direto e objetivo',
  empatico: 'Empático e acolhedor',
  tecnico: 'Técnico e detalhista',
  comercial: 'Comercial e proativo',
  educativo: 'Educativo',
}

function formatValue(key, value) {
  if (!value && value !== false) return null
  if (key === 'segment') return SEGMENT_LABELS[value] || value
  if (key === 'approach') return APPROACH_LABELS[value] || value
  return String(value)
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', borderRadius: 8, borderBottomLeftRadius: 0, background: 'var(--talk-bg-hover)', width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--talk-text-muted)', display: 'inline-block', animation: `discovery-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  )
}

function ConfidenceBar({ value }) {
  const color = value < 40 ? '#ef4444' : value < 70 ? '#f59e0b' : '#22c55e'
  return (
    <div>
      <div style={{ background: '#2a2d32', borderRadius: 999, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.2s ease, background 0.2s ease' }} />
      </div>
      <p style={{ color: '#ACADBD', fontSize: 12, marginTop: 6 }}>{value}% da configuração mapeada</p>
    </div>
  )
}

const DRAFT_FIELDS = [
  { key: 'business_name', label: 'Nome do negócio', icon: '🏢' },
  { key: 'segment', label: 'Segmento', icon: '📂' },
  { key: 'goal', label: 'Objetivo', icon: '🎯' },
  { key: 'approach', label: 'Abordagem', icon: '🤝' },
]

function DraftField({ icon, label, value, chips }) {
  const filled = chips ? chips.length > 0 : !!value
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ marginTop: 1, fontSize: 13, color: filled ? '#22c55e' : '#ACADBD', flexShrink: 0 }}>
        {filled ? '✓' : '○'}
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11, color: '#ACADBD', lineHeight: 1.2, marginBottom: 2 }}>{icon} {label}</p>
        {chips
          ? chips.length > 0
            ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {chips.map((c, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--talk-bg-hover)', border: '1px solid var(--talk-border)', color: 'var(--talk-text-primary)' }}>{c}</span>
                ))}
              </div>
            : <p style={{ fontSize: 13, color: '#ACADBD' }}>—</p>
          : <p style={{ fontSize: 13, color: filled ? '#FFFFFF' : '#ACADBD' }}>{value || '—'}</p>
        }
      </div>
    </div>
  )
}

function DraftPanel({ draft, ready, loading, onFinalize }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>
            O que entendemos até agora
          </p>
          <ConfidenceBar value={draft?.confidence ?? 0} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {DRAFT_FIELDS.map(({ key, label, icon }) => (
            <DraftField key={key} icon={icon} label={label} value={formatValue(key, draft?.[key])} />
          ))}
          <DraftField icon="🏢" label="Setores sugeridos" chips={draft?.suggested_sectors ?? []} />
          <DraftField icon="🏷️" label="Etiquetas sugeridas" chips={draft?.suggested_labels ?? []} />
          <DraftField
            icon="🤖"
            label="Chatbot"
            value={draft?.create_chatbot === null || draft?.create_chatbot === undefined ? null : draft.create_chatbot ? 'Sim' : 'Não'}
          />
          {draft?.create_chatbot && (
            <DraftField icon="💬" label="Descrição do chatbot" value={draft?.chatbot_description ?? null} />
          )}
          <DraftField
            icon="📡"
            label="Canal"
            value={draft?.create_channel === null || draft?.create_channel === undefined ? null
              : draft.create_channel ? (draft.channel_name || 'Sim') : 'Não'}
          />
          <DraftField icon="👥" label="Atendentes convidados" chips={draft?.member_emails ?? []} />
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <button
          onClick={onFinalize}
          disabled={loading || !ready}
          style={{
            width: '100%', padding: '14px', borderRadius: 8,
            background: loading || !ready ? '#2F3238' : '#4C70DA',
            color: loading || !ready ? '#8E92A4' : '#FFFFFF',
            fontWeight: 600, fontSize: 14, border: 'none', cursor: loading || !ready ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            boxShadow: loading || !ready ? 'none' : '0 4px 12px rgba(76,112,218,0.3)',
            opacity: ready ? 1 : 0.5,
          }}
          onMouseEnter={e => { if (!loading && ready) e.currentTarget.style.background = '#3d5ec7' }}
          onMouseLeave={e => { if (!loading && ready) e.currentTarget.style.background = '#4C70DA' }}
        >
          {loading ? 'Finalizando...' : 'Revisar e Configurar →'}
        </button>
      </div>
    </div>
  )
}

export default function DiscoveryChat({ onComplete, onBack, isDemoMode }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState(null)
  const [ready, setReady] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { startChat() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function startChat() {
    setLoading(true)
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 800))
        const data = await fetch(`${API}/onboarding/chat/demo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 0 }),
        }).then(r => r.json())
        setMessages([{ role: 'assistant', content: data.message }])
        setDraft(data.draft)
        setDemoStep(1)
      } else {
        const res = await fetch(`${API}/onboarding/chat/start`, { method: 'POST' })
        const data = await res.json()
        setMessages([{ role: 'assistant', content: data.message }])
        setDraft(data.draft)
      }
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return
    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    inputRef.current?.focus()
    setLoading(true)
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1500))
        const data = await fetch(`${API}/onboarding/chat/demo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: demoStep }),
        }).then(r => r.json())
        setMessages([...newMessages, { role: 'assistant', content: data.message }])
        setDraft(data.draft)
        setReady(data.ready)
        setDemoStep(s => s + 1)
        return
      }
      const res = await fetch(`${API}/onboarding/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, draft }),
      })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.message }])
      setDraft(data.draft)
      setReady(data.ready)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleFinalize() {
    setFinalizing(true)
    try {
      const res = await fetch(`${API}/onboarding/chat/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, draft }),
      })
      const data = await res.json()
      onComplete({ ...data, messages })
    } finally {
      setFinalizing(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="page-transition min-h-svh flex flex-col" style={{ background: 'var(--talk-bg-primary)' }}>
      <style>{`
        @keyframes discovery-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .discovery-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .discovery-grid { grid-template-columns: 1fr; }
          .discovery-draft { order: -1; }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '32px 24px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1000, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <button
            onClick={onBack}
            style={{ position: 'fixed', top: 20, left: 24, zIndex: 100, background: 'rgba(26,28,32,0.8)', border: '1px solid #2A2D32', borderRadius: 8, cursor: 'pointer', color: '#8E92A4', fontSize: 13, padding: '8px 14px', display: 'flex', gap: 6, alignItems: 'center', transition: 'all 0.2s', backdropFilter: 'blur(4px)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#4C70DA'; e.currentTarget.style.background = '#1A1C20' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8E92A4'; e.currentTarget.style.borderColor = '#2A2D32'; e.currentTarget.style.background = 'rgba(26,28,32,0.8)' }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>←</span> Voltar
          </button>
          
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF', margin: '0 0 6px' }}>
              Discovery por IA
            </h1>
            <p style={{ fontSize: 15, color: '#8E92A4', margin: 0, lineHeight: 1.5 }}>
              Descreva sua operação e deixe nossa Inteligência Artificial montar a configuração ideal para você.
            </p>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '16px 24px 32px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1000 }} className="discovery-grid">

          {/* Chat */}
          <Card style={{ display: 'flex', flexDirection: 'column', height: 'calc(100svh - 180px)', minHeight: 480, background: 'var(--talk-bg-primary)', border: '1px solid var(--talk-border)', borderRadius: 12, overflow: 'hidden' }}>
            <CardContent style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                    {!isUser && (
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #4C70DA, #3d5ec7)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0, alignSelf: 'flex-end', fontSize: 16 }}>
                        ✨
                      </div>
                    )}
                    <div style={{
                      maxWidth: '75%', padding: '12px 16px',
                      borderRadius: 12,
                      borderBottomLeftRadius: !isUser ? 4 : 12,
                      borderBottomRightRadius: isUser ? 4 : 12,
                      background: isUser ? '#4C70DA' : '#1A1C20',
                      border: isUser ? 'none' : '1px solid #2A2D32',
                      color: isUser ? '#FFFFFF' : '#E0E2E6',
                      fontSize: 15, lineHeight: 1.5,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                )
              })}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #4C70DA, #3d5ec7)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0, fontSize: 16 }}>
                    ✨
                  </div>
                  <TypingIndicator />
                </div>
              )}
              <div ref={bottomRef} />
            </CardContent>

            <div style={{ padding: '16px 20px', background: '#1A1C20', borderTop: '1px solid #2a2d32', display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                disabled={loading}
                placeholder="Exemplo: 'somos uma assistência técnica, queremos suporte a devoluções...'"
                style={{
                  flex: 1, background: '#141619', border: `1px solid ${inputFocused ? '#4C70DA' : '#2A2D32'}`,
                  borderRadius: 8, padding: '12px 16px', color: '#FFFFFF', fontSize: 15,
                  outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: inputFocused ? '0 0 0 2px rgba(76,112,218,0.2)' : 'none',
                  opacity: loading ? 0.6 : 1,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  background: loading || !input.trim() ? '#2F3238' : '#4C70DA',
                  color: loading || !input.trim() ? '#8E92A4' : 'white',
                  border: 'none', borderRadius: 8, padding: '12px 20px',
                  fontWeight: 600, fontSize: 15, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', flexShrink: 0,
                  boxShadow: loading || !input.trim() ? 'none' : '0 2px 8px rgba(76,112,218,0.3)',
                }}
                onMouseEnter={e => { if (!loading && input.trim()) e.currentTarget.style.background = '#3d5ec7' }}
                onMouseLeave={e => { if (!loading && input.trim()) e.currentTarget.style.background = '#4C70DA' }}
              >
                Enviar
              </button>
            </div>
          </Card>

          {/* Draft panel */}
          <Card className="discovery-draft" style={{ background: '#1A1C20', border: '1px solid #2A2D32', borderRadius: 12, position: 'sticky', top: 24, height: 'calc(100svh - 180px)', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
            <CardContent style={{ padding: '24px', flex: 1, minHeight: 0 }}>
              <DraftPanel draft={draft} ready={ready} loading={finalizing} onFinalize={handleFinalize} />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
