import { useState, useEffect, useRef } from 'react'
import MaturityScore from './MaturityScore'
import { encodeConfig } from '@/utils/shareConfig'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function fireConfetti() {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;width:100%;height:100%;'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')

  const COLORS = ['#4C70DA', '#7b93e8', '#ffffff', '#06b6d4', '#4C70DA', '#a5b4fc', '#4C70DA']
  const particles = Array.from({ length: 130 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height * 0.5,
    r: 3 + Math.random() * 5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    speed: 2 + Math.random() * 4,
    tiltAngle: Math.random() * Math.PI * 2,
    tiltInc: 0.08 + Math.random() * 0.25,
    opacity: 1,
  }))

  let frame, elapsed = 0
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    elapsed++
    particles.forEach(p => {
      p.tiltAngle += p.tiltInc
      p.y += p.speed
      if (elapsed > 100) p.opacity = Math.max(0, p.opacity - 0.012)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.ellipse(p.x + Math.sin(p.tiltAngle) * 10, p.y, p.r * 0.45, p.r, Math.sin(p.tiltAngle) * 0.4, 0, Math.PI * 2)
      ctx.fill()
      if (p.y > canvas.height) {
        p.y = -10; p.x = Math.random() * canvas.width
        if (elapsed > 100) p.opacity = 0
      }
    })
    if (elapsed < 280) { frame = requestAnimationFrame(animate) }
    else { if (canvas.parentNode) canvas.parentNode.removeChild(canvas) }
  }
  frame = requestAnimationFrame(animate)

  try {
    const ac = new AudioContext()
    ;[523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => {
        const osc = ac.createOscillator()
        const gain = ac.createGain()
        osc.connect(gain); gain.connect(ac.destination)
        osc.frequency.value = freq; osc.type = 'sine'
        gain.gain.setValueAtTime(0, ac.currentTime)
        gain.gain.linearRampToValueAtTime(0.12, ac.currentTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.45)
        osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.45)
      }, i * 90)
    })
  } catch {}

  return () => { cancelAnimationFrame(frame); if (canvas.parentNode) canvas.parentNode.removeChild(canvas) }
}

function ConversationSimulator({ result, form, isDemoMode }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function start() {
    setStarted(true)
    const welcome = result.welcome_message || `Olá! Sou ${result.chatbot_name || 'o assistente'} de ${form?.business_name || 'nossa empresa'}. Como posso ajudar?`
    setMessages([{ role: 'assistant', content: welcome }])
  }

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setInput('')
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/onboarding/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbot_name: result.chatbot_name || 'Assistente',
          chatbot_approach: result.chatbot_approach || null,
          business_name: form?.business_name || 'nossa empresa',
          welcome_message: result.welcome_message || null,
          messages: [...messages, userMsg],
          is_demo: isDemoMode,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!started) {
    return (
      <div style={{ marginTop: 12 }}>
        <button
          onClick={start}
          style={{
            width: '100%', padding: '10px', borderRadius: 6, fontWeight: 500, fontSize: 13,
            background: 'rgba(76,112,218,0.1)', color: '#7b93e8',
            border: '1px solid rgba(76,112,218,0.3)', cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(76,112,218,0.18)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(76,112,218,0.1)' }}
        >
          💬 Simular conversa com o chatbot
        </button>
      </div>
    )
  }

  return (
    <div style={{
      marginTop: 16, borderRadius: 10, border: '1px solid rgba(76,112,218,0.3)',
      background: '#0f1114', overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', background: 'rgba(76,112,218,0.12)',
        borderBottom: '1px solid rgba(76,112,218,0.2)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>
          {result.chatbot_name || 'Chatbot'} — simulação
        </span>
        <span style={{ fontSize: 11, color: '#8E92A4', marginLeft: 'auto' }}>como um cliente</span>
      </div>

      <div style={{ height: 220, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '78%', padding: '8px 12px', borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: m.role === 'user' ? '#4C70DA' : '#1e2126',
              color: '#FFFFFF', fontSize: 13, lineHeight: 1.5,
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex' }}>
            <div style={{ padding: '8px 14px', borderRadius: '12px 12px 12px 4px', background: '#1e2126', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: '#8E92A4', animation: `bounce 1.2s ${j * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.7);opacity:0.5} 40%{transform:scale(1);opacity:1} }`}</style>

      <div style={{ padding: '10px 12px', borderTop: '1px solid #1e2126', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Digite como se fosse um cliente..."
          style={{
            flex: 1, background: '#1a1d21', border: '1px solid #2a2d32', borderRadius: 6,
            padding: '8px 12px', color: '#FFFFFF', fontSize: 13, outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          style={{
            padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
            background: input.trim() && !loading ? '#4C70DA' : '#2a2d32',
            color: input.trim() && !loading ? '#FFFFFF' : '#555',
            border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s',
          }}
        >
          →
        </button>
      </div>
    </div>
  )
}

const TAG_COLOR_HEX = {
  Blue: '#3b82f6', Skyblue: '#38bdf8', Cyan: '#06b6d4', Aquamarine: '#2dd4bf',
  Green: '#22c55e', Kiwi: '#84cc16', Gold: '#eab308', Amber: '#f59e0b',
  Tangerine: '#f97316', Chocolate: '#92400e', Salmon: '#fb7185', Tomato: '#ef4444',
  Rose: '#f43f5e', Pink: '#ec4899', Magenta: '#d946ef', Violet: '#8b5cf6',
  Grape: '#7c3aed', Gray: '#6b7280', Silver: '#9ca3af', Umblerito: '#4C70DA',
}

const STATUS_CFG = {
  ok:      { color: '#22c55e', icon: '✓', title: 'Organização configurada.' },
  partial: { color: '#f59e0b', icon: '⚠', title: 'Concluído com avisos.' },
  error:   { color: '#ef4444', icon: '✕', title: 'Falha na configuração.' },
}

const BADGE_STYLES = {
  ok:       { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   text: '#22c55e' },
  error:    { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   text: '#ef4444' },
  partial:  { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  text: '#f59e0b' },
  ignorado: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', text: '#ACADBD' },
}

function StatusCircle({ color, icon }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
      background: `${color}1A`, border: `1px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18, color: color, fontWeight: 700,
    }}>
      {icon}
    </div>
  )
}

function ItemIcon({ ok, delay }) {
  const iconColor = ok ? '#22c55e' : '#ef4444'
  return (
    <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
      {/* Spinner — fades out after delay+0.5s */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '2px solid #2a2d32', borderTopColor: '#4C70DA',
        animation: `drSpin 0.7s linear infinite, drSpinOut 0.15s ease ${delay + 0.5}s forwards`,
      }} />
      {/* Icon — pops in at delay+0.6s */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `${iconColor}1A`, border: `1.5px solid ${iconColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: iconColor, fontWeight: 700,
        opacity: 0,
        animation: `drIconPop 0.3s cubic-bezier(0.34,1.56,0.64,1) ${delay + 0.6}s forwards`,
      }}>
        {ok ? '✓' : '✕'}
      </div>
    </div>
  )
}

function Badge({ label, variant }) {
  const s = BADGE_STYLES[variant] ?? BADGE_STYLES.ignorado
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function TimelineItem({ title, detail, badge, pills, delay, isLast, ok }) {
  return (
    <div style={{
      display: 'flex', gap: 0,
      opacity: 0,
      animation: `drItemIn 0.35s ease ${delay}s both`,
    }}>
      {/* Left column: icon + connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 }}>
        <ItemIcon ok={ok} delay={delay} />
        {!isLast && (
          <div style={{
            width: 2, flex: 1, minHeight: 20,
            background: '#2a2d32',
            animation: `drLineColor 0.4s ease ${delay + 0.9}s forwards`,
          }} />
        )}
      </div>

      {/* Right column: content */}
      <div style={{ flex: 1, paddingLeft: 14, paddingBottom: isLast ? 0 : 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: pills?.length > 0 ? 8 : 0 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', margin: 0, marginBottom: 2 }}>{title}</p>
            <p style={{ fontSize: 12, color: '#8E92A4', margin: 0 }}>{detail}</p>
          </div>
          <Badge label={badge.label} variant={badge.variant} />
        </div>
        {pills && pills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pills.map((pill, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: pill.bg ?? '#1A1C20',
                border: `1px solid ${pill.border ?? '#2A2D32'}`,
                color: '#E0E2E6',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
                {pill.dot && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: pill.dot, flexShrink: 0, display: 'inline-block' }} />
                )}
                {pill.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DeployResult({ result, tempoFinal, fromChat, maturityScore, loadingMaturity, credentials, isDemoMode, form, onReset }) {
  const sc = STATUS_CFG[result.status] ?? STATUS_CFG.partial
  const errors = result.errors ?? []

  const [showUndoModal, setShowUndoModal] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [undoLoading, setUndoLoading] = useState(false)
  const [undoDone, setUndoDone] = useState(false)
  const [undoToast, setUndoToast] = useState(null)

  useEffect(() => {
    if (result.status === 'ok') return fireConfetti()
  }, [])

  useEffect(() => {
    if (undoToast) {
      const t = setTimeout(() => setUndoToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [undoToast])

  async function handleUndo() {
    setUndoLoading(true)
    setShowUndoModal(false)
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 2000))
        setUndoDone(true)
        setUndoToast({ type: 'ok', message: 'Configuração desfeita com sucesso' })
        return
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/onboarding/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talk_api_key: credentials.talk_api_key,
          organization_id: credentials.organization_id,
          sector_ids: (result.sectors ?? []).map(s => s.id),
          label_ids: (result.labels ?? []).map(l => l.id),
          chatbot_id: null,
          channel_id: result.channel_id ?? null,
        }),
      })
      const data = await res.json()
      if (data.status === 'ok') {
        setUndoDone(true)
        setUndoToast({ type: 'ok', message: 'Configuração desfeita com sucesso' })
      } else if (data.status === 'partial') {
        setUndoToast({ type: 'partial', message: 'Desfeito parcialmente — verifique manualmente' })
      } else {
        setUndoToast({ type: 'error', message: data.errors?.[0]?.error || 'Erro ao desfazer' })
      }
    } catch {
      setUndoToast({ type: 'error', message: 'Erro ao conectar ao servidor' })
    } finally {
      setUndoLoading(false)
    }
  }

  // Build timeline items with computed delays
  const items = []
  let d = 0.3

  // 1. Configuração IA
  items.push({
    title: 'Configuração IA',
    detail: 'Configuração personalizada gerada',
    badge: { label: 'ok', variant: 'ok' },
    ok: true,
    delay: d,
  })
  d += 0.3

  // 2. Canal (optional)
  if (result.channel_id) {
    items.push({
      title: 'Canal',
      detail: 'Canal de atendimento criado',
      badge: { label: 'ok', variant: 'ok' },
      ok: true,
      delay: d,
    })
    d += 0.3
  }

  // 3. Setores
  const sectorsErr = errors.find(e => e.step === 'sectors')
  const sectorPills = (result.sectors ?? []).map(s => ({ label: s.name }))
  items.push({
    title: 'Setores',
    detail: `${result.sectors_created} setor(es) criado(s)`,
    badge: sectorsErr
      ? { label: 'erro', variant: 'error' }
      : result.sectors_created > 0
        ? { label: 'ok', variant: 'ok' }
        : { label: 'ignorado', variant: 'ignorado' },
    ok: !sectorsErr && result.sectors_created >= 0,
    delay: d,
    pills: sectorPills,
  })
  d += 0.3

  // 4. Etiquetas
  const labelsErr = errors.find(e => e.step === 'labels')
  const labelPills = (result.labels ?? []).map(l => {
    const hex = TAG_COLOR_HEX[l.color]
    return {
      label: l.name,
      bg: hex ? hex + '15' : '#1A1C20',
      border: hex ? hex + '33' : '#2A2D32',
      dot: hex ?? null,
    }
  })
  items.push({
    title: 'Etiquetas',
    detail: `${result.labels_created} etiqueta(s) criada(s)`,
    badge: labelsErr
      ? { label: 'erro', variant: 'error' }
      : result.labels_created > 0
        ? { label: 'ok', variant: 'ok' }
        : { label: 'ignorado', variant: 'ignorado' },
    ok: !labelsErr && result.labels_created >= 0,
    delay: d,
    pills: labelPills,
  })
  d += 0.3

  // 5. Chatbot
  const chatbotErr = errors.find(e => e.step === 'chatbot')
  items.push({
    title: 'Chatbot',
    detail: result.chatbot_created
      ? 'Fluxo de atendimento configurado'
      : chatbotErr
        ? 'Falha ao configurar o chatbot'
        : 'Não configurado',
    badge: result.chatbot_created
      ? { label: 'ok', variant: 'ok' }
      : chatbotErr
        ? { label: 'erro', variant: 'error' }
        : { label: 'ignorado', variant: 'ignorado' },
    ok: result.chatbot_created,
    delay: d,
  })
  d += 0.3

  // 6. Membros (optional)
  if (result.members_invited > 0) {
    items.push({
      title: 'Membros',
      detail: `${result.members_invited} membro(s) convidado(s)`,
      badge: { label: 'ok', variant: 'ok' },
      ok: true,
      delay: d,
    })
    d += 0.3
  }

  const lastDelay = items[items.length - 1]?.delay ?? 0.3
  const errorsDelay = lastDelay + 0.9
  const footerDelay = errorsDelay + (errors.length > 0 ? 0.5 : 0.15)

  return (
    <div style={{ height: '100svh', background: '#141619', display: 'flex', justifyContent: 'center', padding: '0 24px', overflow: 'hidden' }}>
      <style>{`
        @keyframes drHeaderIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes drItemIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes drSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes drSpinOut {
          to { opacity: 0; transform: scale(0.5); }
        }
        @keyframes drIconPop {
          0%   { opacity: 0; transform: scale(0); }
          60%  { opacity: 1; transform: scale(1.25); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes drLineColor {
          to { background: #22c55e; }
        }
        @keyframes drFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: 540, height: '100%', display: 'flex', flexDirection: 'column', paddingTop: 80, paddingBottom: 24, boxSizing: 'border-box' }}>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>

          {/* Header */}
          <div style={{
            background: '#1A1C20', border: `1px solid #2A2D32`,
            borderLeft: `4px solid ${sc.color}`,
            borderRadius: 8, padding: '20px 24px', marginBottom: 32,
            display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            animation: 'drHeaderIn 0.3s ease-out both',
          }}>
            <StatusCircle color={sc.color} icon={sc.icon} />
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: 16, fontWeight: 600, color: '#FFFFFF', margin: '0 0 2px 0',
                fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em',
              }}>
                {sc.title}
              </h1>
              <p style={{ fontSize: 13, color: '#8E92A4', margin: 0 }}>
                {result.status !== 'error' && tempoFinal ? (
                  <>
                    Configurado em{' '}
                    <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{tempoFinal}s</span>
                    {result.status === 'partial' && errors.length > 0 && (
                      <> · <span style={{ color: '#f59e0b' }}>{errors.length} aviso(s)</span></>
                    )}
                  </>
                ) : (
                  'Verifique os erros abaixo'
                )}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ marginBottom: 24 }}>
            {items.map((item, i) => (
              <TimelineItem key={item.title} {...item} isLast={i === items.length - 1} />
            ))}
          </div>

          {/* Aviso de ativação do chatbot */}
          {result.chatbot_created && (
            <div style={{
              marginBottom: 16, opacity: 0,
              animation: `drFadeUp 0.35s ease ${errorsDelay}s both`,
              borderRadius: 10, padding: '14px 16px',
              background: 'rgba(245,158,11,0.07)',
              borderTop: '1px solid rgba(245,158,11,0.2)',
              borderRight: '1px solid rgba(245,158,11,0.2)',
              borderBottom: '1px solid rgba(245,158,11,0.2)',
              borderLeft: '3px solid #f59e0b',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', margin: '0 0 6px' }}>
                  Ative o chatbot conectando um número
                </p>
                <p style={{ fontSize: 13, color: '#ACADBD', margin: '0 0 6px', lineHeight: 1.6 }}>
                  O chatbot foi criado, mas ainda não está conectado a nenhum número. Para ativá-lo:
                </p>
                <ol style={{ fontSize: 13, color: '#ACADBD', margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                  <li>
                    Acesse{' '}
                    <a
                      href="https://app-utalk.umbler.com/settings/channels"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#4C70DA', textDecoration: 'underline' }}
                    >
                      Configurações → Canais
                    </a>
                    {', clique em '}
                    <strong style={{ color: '#FFFFFF' }}>Sincronizar</strong>
                    {' e leia o QR Code com o WhatsApp desejado'}
                  </li>
                  <li>
                    Abra o chatbot criado e adicione o canal no bloco{' '}
                    <strong style={{ color: '#FFFFFF' }}>"Iniciar por um canal"</strong>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Errors detail */}
          {errors.length > 0 && (
            <div style={{ marginBottom: 28, opacity: 0, animation: `drFadeUp 0.35s ease ${errorsDelay}s both` }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 10 }}>
                Detalhes dos avisos
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {errors.map((err, i) => (
                  <div key={i} style={{
                    borderRadius: 8, padding: '10px 14px',
                    background: '#1a1d21',
                    borderTop: '1px solid rgba(239,68,68,0.18)',
                    borderRight: '1px solid rgba(239,68,68,0.18)',
                    borderBottom: '1px solid rgba(239,68,68,0.18)',
                    borderLeft: '3px solid #ef4444',
                  }}>
                    <p style={{ fontSize: 12, color: '#ACADBD', margin: '0 0 4px' }}>Etapa: {err.step}</p>
                    <p style={{ fontSize: 13, color: '#FFFFFF', margin: 0 }}>{err.error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Simulador de conversa */}
          {result.chatbot_created && (
            <div style={{ marginTop: 24, opacity: 0, animation: `drFadeUp 0.35s ease ${footerDelay}s both` }}>
              <ConversationSimulator result={result} form={form} isDemoMode={isDemoMode} />
            </div>
          )}

          {loadingMaturity && !maturityScore && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '16px', marginTop: 24, background: 'var(--talk-bg-secondary)', borderRadius: 12,
              border: '1px solid var(--talk-border)',
              opacity: 0, animation: `drFadeUp 0.35s ease ${footerDelay}s both`
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid var(--talk-accent)', borderTopColor: 'transparent',
                animation: 'drSpin 0.8s linear infinite', flexShrink: 0,
              }} />
              <p style={{ fontSize: 13, color: 'var(--talk-text-muted)', margin: 0 }}>
                Gerando diagnóstico de maturidade...
              </p>
            </div>
          )}
          {maturityScore && (
            <div style={{ animation: `drFadeUp 0.4s ease ${footerDelay}s both`, marginTop: 24 }}>
              <MaturityScore
                score={maturityScore.score}
                nivel={maturityScore.nivel}
                resumo={maturityScore.resumo}
                pontos_fortes={maturityScore.pontos_fortes}
                oportunidades={maturityScore.oportunidades}
                proximo_passo={maturityScore.proximo_passo}
                tempoFinal={tempoFinal}
              />
            </div>
          )}

          {/* Share button */}
          {form && result.status !== 'error' && (
            <div style={{ textAlign: 'center', marginTop: 24, opacity: 0, animation: `drFadeUp 0.35s ease ${footerDelay}s both` }}>
              <button
                onClick={() => {
                  const url = window.location.origin + '?config=' + encodeConfig(form)
                  navigator.clipboard.writeText(url).then(() => {
                    setShareCopied(true)
                    setTimeout(() => setShareCopied(false), 2000)
                  })
                }}
                style={{
                  background: 'transparent', border: '1px solid #2A2D32', color: shareCopied ? '#22c55e' : '#8E92A4',
                  borderRadius: 6, fontSize: 12, padding: '8px 16px', cursor: 'pointer',
                  transition: 'border-color 0.2s, color 0.2s', width: '100%',
                }}
                onMouseEnter={e => { if (!shareCopied) { e.currentTarget.style.borderColor = '#33363c'; e.currentTarget.style.color = '#E0E2E6' } }}
                onMouseLeave={e => { if (!shareCopied) { e.currentTarget.style.borderColor = '#2A2D32'; e.currentTarget.style.color = '#8E92A4' } }}
              >
                {shareCopied ? '✓ Link copiado!' : '🔗 Compartilhar esta configuração'}
              </button>
            </div>
          )}

          {/* Undo button */}
          {result.status !== 'error' && (
            <div style={{ textAlign: 'center', marginTop: 12, opacity: 0, animation: `drFadeUp 0.35s ease ${footerDelay}s both` }}>
              {undoDone ? (
                <span style={{ fontSize: 12, color: '#22c55e' }}>✓ Desfeito</span>
              ) : (
                <button
                  onClick={() => setShowUndoModal(true)}
                  disabled={undoLoading}
                  style={{
                    background: 'none', border: 'none', cursor: undoLoading ? 'not-allowed' : 'pointer',
                    color: undoLoading ? '#6b7280' : '#8E92A4', fontSize: 12,
                    padding: '4px 8px', transition: 'color 0.2s ease',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                  onMouseEnter={e => { if (!undoLoading) e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { if (!undoLoading) e.currentTarget.style.color = '#8E92A4' }}
                >
                  {undoLoading ? (
                    <>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid #6b7280', borderTopColor: 'transparent', animation: 'drSpin 0.7s linear infinite', flexShrink: 0 }} />
                      Desfazendo...
                    </>
                  ) : '🗑️ Desfazer tudo'}
                </button>
              )}
            </div>
          )}
          
          <div style={{ height: 24 }} />
        </div>

        {/* Bottom navigation fixed */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexShrink: 0, opacity: 0, animation: `drFadeUp 0.35s ease ${footerDelay}s both` }}>
          <button
            onClick={onReset}
            style={{
              flex: 1, padding: '13px', borderRadius: 8, fontWeight: 500, fontSize: 14,
              background: 'transparent', color: '#E0E2E6', border: '1px solid #2A2D32', cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1A1C20' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            Nova configuração
          </button>
          <a
            href="https://app-utalk.umbler.com"
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 2, padding: '13px', borderRadius: 8, fontWeight: 700, fontSize: 14,
              background: '#4C70DA', color: '#FFFFFF', border: 'none', cursor: 'pointer',
              transition: 'background 0.15s', textAlign: 'center', textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#3d5ec4' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#4C70DA' }}
          >
            Acessar Talk 🚀
          </a>
        </div>

      </div>

      {/* Undo Modal */}
      {showUndoModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px',
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowUndoModal(false) }}
        >
          <div style={{ background: '#202326', border: '1px solid #2a2d32', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 10 }}>Desfazer configuração?</h2>
            <p style={{ fontSize: 13, color: '#ACADBD', lineHeight: 1.6, marginBottom: 20 }}>
              Isso irá deletar os <strong style={{ color: '#FFFFFF' }}>{result.sectors_created} setor(es)</strong>,{' '}
              <strong style={{ color: '#FFFFFF' }}>{result.labels_created} etiqueta(s)</strong> e o chatbot criados agora. Essa ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowUndoModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 6, fontWeight: 500, fontSize: 13, background: 'transparent', color: '#FFFFFF', border: '1px solid #2A2D32', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleUndo}
                style={{ flex: 1, padding: '10px', borderRadius: 6, fontWeight: 500, fontSize: 13, background: '#ef4444', color: '#FFFFFF', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#dc2626' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ef4444' }}
              >
                Sim, desfazer tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {undoToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          color: '#FFFFFF', whiteSpace: 'nowrap',
          background: undoToast.type === 'ok' ? '#16a34a' : undoToast.type === 'partial' ? '#b45309' : '#dc2626',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'drFadeUp 0.3s ease both',
        }}>
          {undoToast.message}
        </div>
      )}
    </div>
  )
}
