import MaturityScore from './MaturityScore'

const TAG_COLOR_HEX = {
  Blue: '#3b82f6', Skyblue: '#38bdf8', Cyan: '#06b6d4', Aquamarine: '#2dd4bf',
  Green: '#22c55e', Kiwi: '#84cc16', Gold: '#eab308', Amber: '#f59e0b',
  Tangerine: '#f97316', Chocolate: '#92400e', Salmon: '#fb7185', Tomato: '#ef4444',
  Rose: '#f43f5e', Pink: '#ec4899', Magenta: '#d946ef', Violet: '#8b5cf6',
  Grape: '#7c3aed', Gray: '#6b7280', Silver: '#9ca3af', Umblerito: '#4C70DA',
}

const STATUS_CFG = {
  ok:      { color: '#22c55e', icon: '✓', title: 'Deploy concluído.' },
  partial: { color: '#f59e0b', icon: '⚠', title: 'Deploy com avisos.' },
  error:   { color: '#ef4444', icon: '✕', title: 'Deploy falhou.' },
}

const BADGE_STYLES = {
  ok:       { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   text: '#22c55e' },
  error:    { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   text: '#ef4444' },
  partial:  { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  text: '#f59e0b' },
  ignorado: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', text: '#ACADBD' },
}

function StatusCircle({ color, icon }) {
  return (
    <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 20px', flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `2px solid ${color}`,
        animation: 'drRipple 1.8s ease-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `${color}1A`, border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, color: '#FFFFFF', fontWeight: 700,
      }}>
        {icon}
      </div>
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
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
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
            <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', margin: 0, marginBottom: 2 }}>{title}</p>
            <p style={{ fontSize: 13, color: '#ACADBD', margin: 0 }}>{detail}</p>
          </div>
          <Badge label={badge.label} variant={badge.variant} />
        </div>
        {pills && pills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pills.map((pill, i) => (
              <span key={i} style={{
                fontSize: 12, padding: '3px 10px', borderRadius: 6,
                background: pill.bg ?? '#202326',
                border: `1px solid ${pill.border ?? '#2a2d32'}`,
                color: '#FFFFFF',
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

export default function DeployResult({ result, tempoFinal, fromChat, maturityScore, loadingMaturity, onReset }) {
  const sc = STATUS_CFG[result.status] ?? STATUS_CFG.partial
  const errors = result.errors ?? []

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
      bg: hex ? hex + '1A' : '#202326',
      border: hex ? hex + '44' : '#2a2d32',
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
    <div style={{ minHeight: '100svh', background: '#141619', display: 'flex', justifyContent: 'center', padding: '40px 24px 64px' }}>
      <style>{`
        @keyframes drRipple {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes drHeaderIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
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

      <div style={{ width: '100%', maxWidth: 640 }}>

        {/* Header */}
        <div style={{
          background: '#202326', border: `1px solid ${sc.color}33`,
          borderRadius: 16, padding: '32px 24px', textAlign: 'center', marginBottom: 32,
          animation: 'drHeaderIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          <StatusCircle color={sc.color} icon={sc.icon} />
          <h1 style={{
            fontSize: 26, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px',
            fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em',
          }}>
            {sc.title}
          </h1>
          <p style={{ fontSize: 14, color: '#ACADBD', margin: 0 }}>
            {result.status !== 'error' && tempoFinal ? (
              <>
                Configurado em{' '}
                <span style={{ fontSize: 22, fontWeight: 800, color: '#4C70DA' }}>{tempoFinal}</span>
                {' '}segundos
                {result.status === 'partial' && errors.length > 0 && (
                  <> · <span style={{ color: '#f59e0b' }}>{errors.length} aviso(s)</span></>
                )}
              </>
            ) : (
              'Verifique os erros abaixo'
            )}
          </p>
        </div>

        {/* Timeline */}
        <div style={{ marginBottom: 24 }}>
          {items.map((item, i) => (
            <TimelineItem key={item.title} {...item} isLast={i === items.length - 1} />
          ))}
        </div>

        {/* Aviso canal ausente */}
        {result.chatbot_created && !result.channel_id && (
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
              <p style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', margin: '0 0 4px' }}>
                Canal necessário para o chatbot funcionar
              </p>
              <p style={{ fontSize: 13, color: '#ACADBD', margin: 0, lineHeight: 1.5 }}>
                Nenhum canal foi vinculado ao chatbot. Para que ele entre em funcionamento, crie um canal de WhatsApp no Talk e conecte-o no bloco <strong style={{ color: '#FFFFFF' }}>"Iniciar por um canal"</strong> dentro do fluxo do chatbot.
              </p>
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

        {/* Footer */}
        <div style={{ opacity: 0, animation: `drFadeUp 0.35s ease ${footerDelay}s both` }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <a
              href="https://app-utalk.umbler.com"
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1, padding: '12px', borderRadius: 10, textAlign: 'center',
                background: '#4C70DA', color: '#FFFFFF', fontWeight: 600, fontSize: 14,
                textDecoration: 'none', display: 'block',
              }}
            >
              Acessar o Talk ↗
            </a>
            <button
              onClick={onReset}
              style={{
                flex: 1, padding: '12px', borderRadius: 10,
                background: 'transparent', color: '#FFFFFF', fontWeight: 600, fontSize: 14,
                border: '1px solid #2a2d32', cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4C70DA55'; e.currentTarget.style.background = '#4C70DA0D' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2d32'; e.currentTarget.style.background = 'transparent' }}
            >
              Nova configuração
            </button>
          </div>

          {fromChat && (
            <>
              {loadingMaturity && !maturityScore && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '16px', background: '#202326', borderRadius: 12,
                  border: '1px solid #2a2d32',
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid #4C70DA', borderTopColor: 'transparent',
                    animation: 'drSpin 0.8s linear infinite', flexShrink: 0,
                  }} />
                  <p style={{ fontSize: 13, color: '#ACADBD', margin: 0 }}>
                    Gerando diagnóstico de maturidade...
                  </p>
                </div>
              )}
              {maturityScore && (
                <div style={{ animation: 'drFadeUp 0.4s ease both' }}>
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
            </>
          )}
        </div>

      </div>
    </div>
  )
}
