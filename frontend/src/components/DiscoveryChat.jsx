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
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', borderRadius: 16, borderBottomLeftRadius: 4, background: '#2a2d32', width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#4C70DA', display: 'inline-block', animation: `discovery-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
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
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#252830', border: '1px solid #2a2d32', color: '#FFFFFF' }}>{c}</span>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
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

      {ready && (
        <button
          onClick={onFinalize}
          disabled={loading}
          style={{
            marginTop: 8, width: '100%', padding: '12px', borderRadius: 10,
            background: loading ? '#16a34a99' : '#22c55e', color: 'white',
            fontWeight: 600, fontSize: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Finalizando...' : 'Revisar e configurar →'}
        </button>
      )}
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
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: 'var(--talk-bg-primary)' }}>
      <style>{`
        @keyframes discovery-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .discovery-grid {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .discovery-grid { grid-template-columns: 1fr; }
          .discovery-draft { order: -1; }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <button
            onClick={onBack}
            style={{ color: '#FFFFFF', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}
          >
            ← Voltar
          </button>
          <h1
            className=""
            style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#FFFFFF', textShadow: '0 2px 16px rgba(76,112,218,0.35)', marginBottom: 6 }}
          >
            Talk One-Click
          </h1>
          <p style={{ fontSize: '1rem', color: '#ACADBD', marginBottom: 0 }}>
            Converse com nossa IA para montar a configuração ideal
          </p>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '20px 24px 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1100 }} className="discovery-grid">

          {/* Chat */}
          <Card style={{ display: 'flex', flexDirection: 'column', height: 'calc(100svh - 210px)', minHeight: 420 }}>
            <CardContent style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px',
                    borderRadius: 16,
                    borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                    background: msg.role === 'user' ? '#4C70DA' : '#2a2d32',
                    color: '#FFFFFF', fontSize: 14, lineHeight: 1.55,
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <TypingIndicator />
                </div>
              )}
              <div ref={bottomRef} />
            </CardContent>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2d32', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                disabled={loading}
                placeholder="Digite sua resposta..."
                style={{
                  flex: 1, background: '#141619', border: `1px solid ${inputFocused ? '#4C70DA' : '#2a2d32'}`,
                  borderRadius: 8, padding: '10px 14px', color: '#FFFFFF', fontSize: 14,
                  outline: 'none', transition: 'border-color 0.2s',
                  opacity: loading ? 0.6 : 1,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  background: loading || !input.trim() ? '#2a2d32' : '#4C70DA',
                  color: loading || !input.trim() ? '#FFFFFF' : 'white',
                  border: 'none', borderRadius: 8, padding: '10px 18px',
                  fontWeight: 700, fontSize: 16, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, color 0.2s', flexShrink: 0,
                }}
              >
                →
              </button>
            </div>
          </Card>

          {/* Draft panel */}
          <Card className="discovery-draft">
            <CardContent style={{ padding: '20px' }}>
              <DraftPanel draft={draft} ready={ready} loading={finalizing} onFinalize={handleFinalize} />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
