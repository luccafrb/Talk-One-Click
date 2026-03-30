import { useState, useEffect, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CUSTOM_FIELD_TYPE_MAP = {
  text:     'CreateTextCustomFieldDefinitionModel',
  number:   'CreateNumberCustomFieldDefinitionModel',
  cpf:      'CreateCPFCustomFieldDefinitionModel',
  cnpj:     'CreateCNPJCustomFieldDefinitionModel',
  date:     'CreateDateCustomFieldDefinitionModel',
  currency: 'CreateCurrencyCustomFieldDefinitionModel',
  link:     'CreateLinkCustomFieldDefinitionModel',
  logic:    'CreateLogicCustomFieldDefinitionModel',
}
import DiscoveryChat from '@/components/DiscoveryChat'
import ConfigPreview from '@/components/ConfigPreview'
import OnboardingTimer from '@/components/OnboardingTimer'
import DeployResult from '@/components/DeployResult'
import CredentialsGate from '@/components/CredentialsGate'
import StepperForm from '@/components/StepperForm'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { TEMPLATES } from '@/data/templates'
import { decodeConfig } from '@/utils/shareConfig'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const INITIAL_FORM = {
  business_name: '',
  segment: '',
  goal: '',
  approach: '',
  create_sectors: false,
  sectors_description: '',
  create_labels: false,
  label_items: [{ name: '', color: '' }],
  create_chatbot: false,
  chatbot_description: '',
  create_channel: false,
  channel_name: '',
  member_emails: '',
  create_quick_answers: false,
  quick_answers_description: '',
  create_custom_fields: false,
  custom_field_items: [{ name: '', type: 'text' }],
  configure_org_preferences: false,
  close_chat_message: '',
}

function AiTag() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
      background: 'rgba(76,112,218,0.12)', color: '#7b93e8',
      border: '1px solid rgba(76,112,218,0.25)', marginLeft: 6, verticalAlign: 'middle',
      letterSpacing: '0.01em',
    }}>✨ Preenchido por IA</span>
  )
}

function CheckboxField({ id, label, description, checked, onChange }) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
        checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
      />
      <div>
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && (
          <p className="text-xs mt-1" style={{ color: '#ACADBD' }}>{description}</p>
        )}
      </div>
    </label>
  )
}

function FillingAnimation() {
  const [phase, setPhase] = useState('filling') // 'filling' | 'done'

  useEffect(() => {
    const t = setTimeout(() => setPhase('done'), 1400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#141619', zIndex: 50,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32,
      animation: 'ai-fadein 0.25s ease',
    }}>
      <style>{`
        @keyframes ai-fadein   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ai-fadeout  { from { opacity: 1 } to { opacity: 0 } }
        @keyframes ai-fill     { from { width: 0% } to { width: 100% } }
        @keyframes ai-float    { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes ai-popin    { from { transform: scale(0.4); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes ai-shimmer  {
          0%   { background-position: -200% center }
          100% { background-position:  200% center }
        }
      `}</style>

      <h1 style={{
        fontFamily: "'Inter', sans-serif", fontWeight: 800, letterSpacing: '-0.02em',
        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
        backgroundImage: 'linear-gradient(90deg, #4C70DA, #7b93e8, #06b6d4, #7b93e8, #4C70DA)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        animation: 'ai-shimmer 2s linear infinite',
      }}>
        Talk One-Click
      </h1>

      <div style={{
        fontSize: '4rem', lineHeight: 1,
        animation: phase === 'filling' ? 'ai-float 1.6s ease-in-out infinite' : 'ai-popin 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        transition: 'all 0.2s ease',
      }}>
        {phase === 'filling' ? '✨' : '✅'}
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#FFFFFF', fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>
          {phase === 'filling' ? 'Preenchendo seu formulário com IA...' : 'Formulário preenchido!'}
        </p>
        <p style={{ color: '#ACADBD', fontSize: '0.875rem' }}>
          {phase === 'filling' ? 'Só mais um segundo' : 'Revise os campos antes de confirmar'}
        </p>
      </div>

      <div style={{ width: 280, background: '#252830', borderRadius: 999, height: 6, overflow: 'hidden', border: '1px solid #2a2d32' }}>
        <div style={{
          height: '100%', borderRadius: 999,
          background: 'linear-gradient(90deg, #4C70DA, #7b93e8, #06b6d4)',
          animation: phase === 'filling' ? 'ai-fill 1.3s ease-out forwards' : undefined,
          width: phase === 'done' ? '100%' : undefined,
          transition: phase === 'done' ? 'width 0.2s ease' : undefined,
        }} />
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-[#4C70DA] border-t-transparent animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium">Configurando sua conta Talk...</p>
        <p className="text-sm text-muted-foreground mt-1">
          Isso pode levar alguns segundos
        </p>
      </div>
    </div>
  )
}

function ResultBadge({ status }) {
  const styles = {
    ok:      { background: '#14532d', color: '#22c55e', border: '1px solid #166534' },
    partial: { background: '#451a03', color: '#f59e0b', border: '1px solid #78350f' },
    error:   { background: '#450a0a', color: '#ef4444', border: '1px solid #7f1d1d' },
  }
  const labels = { ok: 'Concluído', partial: 'Parcial', error: 'Erro' }
  const s = styles[status] ?? styles.partial
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, display: 'inline-block' }}>
      {labels[status] ?? status}
    </span>
  )
}

const TAG_COLOR_HEX = {
  Blue:       '#3b82f6',
  Skyblue:    '#38bdf8',
  Cyan:       '#06b6d4',
  Aquamarine: '#2dd4bf',
  Green:      '#22c55e',
  Kiwi:       '#84cc16',
  Gold:       '#eab308',
  Amber:      '#f59e0b',
  Tangerine:  '#f97316',
  Chocolate:  '#92400e',
  Salmon:     '#fb7185',
  Tomato:     '#ef4444',
  Rose:       '#f43f5e',
  Pink:       '#ec4899',
  Magenta:    '#d946ef',
  Violet:     '#8b5cf6',
  Grape:      '#7c3aed',
  Gray:       '#6b7280',
  Silver:     '#9ca3af',
  Umblerito:  '#4C70DA',
}

function ColorPickerDropdown({ color, onChange }) {
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => {
    if (!pos) return
    function onOutside(e) {
      if (
        btnRef.current && btnRef.current.contains(e.target) ||
        dropRef.current && dropRef.current.contains(e.target)
      ) return
      setPos(null)
    }
    function onScroll() { setPos(null) }
    document.addEventListener('mousedown', onOutside)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [pos])

  function handleOpen() {
    if (pos) { setPos(null); return }
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: r.left })
  }

  const hex = TAG_COLOR_HEX[color] ?? null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        title={color || 'Selecionar cor (opcional)'}
        style={{
          width: 36, height: 36, borderRadius: 8,
          border: `1px solid ${hex ? hex + '66' : '#2a2d32'}`,
          background: '#202326', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.2s',
          flexShrink: 0,
        }}
      >
        {hex
          ? <span style={{ width: 16, height: 16, borderRadius: '50%', background: hex, display: 'block', flexShrink: 0 }} />
          : <span style={{ color: '#ACADBD', fontSize: 14, lineHeight: 1 }}>⬤</span>
        }
      </button>

      {pos && (
        <div
          ref={dropRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
            background: '#1a1d21', border: '1px solid #2a2d32', borderRadius: 10,
            padding: 10,
            display: 'grid', gridTemplateColumns: 'repeat(5, 28px)', gap: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}
        >
          <button
            type="button"
            onClick={() => { onChange(''); setPos(null) }}
            title="IA escolhe a cor"
            style={{
              width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
              background: '#2a2d32',
              border: color === '' ? '2px solid #FFFFFF' : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#ACADBD',
            }}
          >✕</button>

          {Object.entries(TAG_COLOR_HEX).map(([name, h]) => (
            <button
              key={name}
              type="button"
              onClick={() => { onChange(name); setPos(null) }}
              title={name}
              style={{
                width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                background: h,
                border: color === name ? '2px solid #FFFFFF' : '2px solid transparent',
                boxShadow: color === name ? `0 0 0 1px ${h}` : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}

function ChipList({ items }) {
  if (!items || items.length === 0) return <span className="text-sm" style={{ color: '#ACADBD' }}>—</span>
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
          style={{ background: '#252830', border: '1px solid #2a2d32', color: '#FFFFFF' }}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function LabelChipList({ labels }) {
  if (!labels || labels.length === 0) return <span className="text-sm" style={{ color: '#ACADBD' }}>—</span>
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {labels.map((label, i) => {
        const hex = TAG_COLOR_HEX[label.color] ?? '#4C70DA'
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
            style={{ background: `${hex}18`, border: `1px solid ${hex}44`, color: '#FFFFFF' }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: hex, flexShrink: 0, display: 'inline-block' }} />
            {label.name}
          </span>
        )
      })}
    </div>
  )
}

function ResultSection({ icon, title, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#ACADBD' }}>
        {icon} {title}
      </p>
      {children}
    </div>
  )
}

function ResultScreen({ result, tempoFinal, fromChat, maturityScore, loadingMaturity, onReset }) {
  const hasErrors = result.errors && result.errors.length > 0
  const sectorNames = result.sectors?.map((s) => s.name) ?? []

  const timerConfig = {
    ok:      { icon: '✓', iconColor: '#22c55e', title: 'Tudo pronto!', sub: 'Sua conta Talk está pronta para uso' },
    partial: { icon: '⚠', iconColor: '#f59e0b', title: 'Quase lá!',   sub: 'Alguns itens precisam de atenção' },
    error:   { icon: '✕', iconColor: '#ef4444', title: 'Algo deu errado', sub: 'Verifique os erros abaixo e tente novamente' },
  }
  const tc = timerConfig[result.status] ?? timerConfig.partial

  const statusConfig = {
    ok:      { emoji: '✅', title: 'Onboarding concluído!',    color: '#22c55e' },
    partial: { emoji: '⚠️', title: 'Concluído com avisos',     color: '#f59e0b' },
    error:   { emoji: '❌', title: 'Falha no onboarding',       color: '#ef4444' },
  }
  const sc = statusConfig[result.status] ?? statusConfig.partial

  return (
    <div className="max-w-2xl mx-auto w-full py-10 px-4 space-y-6">
      <style>{`
        @keyframes resultFadeScale {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes resultFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .result-card-0 { animation: resultFadeScale 0.3s ease 0s    both; }
        .result-card-1 { animation: resultFadeUp    0.3s ease 0.1s  both; }
        .result-card-2 { animation: resultFadeUp    0.3s ease 0.2s  both; }
        .result-card-3 { animation: resultFadeUp    0.3s ease 0.3s  both; }
        .result-card-4 { animation: resultFadeUp    0.3s ease 0.4s  both; }
      `}</style>

      {/* Header */}
      <div className="pt-8 pb-2 space-y-3">
        <h1
          className=""
          style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#FFFFFF', textShadow: '0 2px 16px rgba(76,112,218,0.35)' }}
        >
          Talk One-Click
        </h1>
      </div>

      {/* Card de destaque — tempo */}
      <div className="result-card-0" style={{
        background: '#202326', border: `1px solid ${tc.iconColor}33`,
        borderRadius: 20, padding: '28px 24px', textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `${tc.iconColor}18`, border: `2px solid ${tc.iconColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 24, color: tc.iconColor, fontWeight: 700,
        }}>
          {tc.icon}
        </div>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', marginBottom: 10 }}>{tc.title}</p>
        {result.status !== 'error' && tempoFinal && (
          <p style={{ fontSize: 16, color: '#ACADBD', marginBottom: 6 }}>
            Configurado em{' '}
            <span style={{ fontSize: 32, fontWeight: 800, color: '#4C70DA', verticalAlign: 'middle' }}>
              {tempoFinal}
            </span>
            {' '}segundos
          </p>
        )}
        <p style={{ fontSize: 14, color: '#ACADBD' }}>{tc.sub}</p>
      </div>

      {/* Status banner */}
      <div
        className="result-card-1 flex items-center gap-4 rounded-2xl px-5 py-4"
        style={{ background: '#202326', border: `1px solid ${sc.color}33` }}
      >
        <span style={{ fontSize: '2rem', lineHeight: 1 }}>{sc.emoji}</span>
        <div className="flex-1">
          <p className="font-semibold text-lg" style={{ color: '#FFFFFF' }}>{sc.title}</p>
          <p className="text-sm mt-0.5" style={{ color: '#ACADBD' }}>
            {result.sectors_created} setor(es) · {result.labels_created} etiqueta(s)
            {result.chatbot_created ? ' · chatbot' : ''}
            {result.channel_id ? ' · canal' : ''}
            {(result.members ?? []).length > 0 ? ` · ${result.members.length} membro(s)` : ''}
          </p>
        </div>
        <ResultBadge status={result.status} />
      </div>

      {/* Resumo da IA */}
      {(result.chatbot_name || result.ai_explanation) && (
        <Card className="result-card-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span>✨</span> Resumo da configuração IA
            </CardTitle>
            <CardDescription>O que a IA definiu para a sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {result.chatbot_name && (
              <ResultSection icon="🤖" title="Nome do chatbot">
                <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{result.chatbot_name}</p>
              </ResultSection>
            )}
            {result.chatbot_approach && (
              <ResultSection icon="🎯" title="Abordagem">
                <p className="text-sm" style={{ color: '#FFFFFF' }}>{result.chatbot_approach}</p>
              </ResultSection>
            )}
            {result.welcome_message && (
              <ResultSection icon="💬" title="Mensagem de boas-vindas">
                <p
                  className="text-sm rounded-lg px-4 py-3 mt-2"
                  style={{ background: '#252830', border: '1px solid #2a2d32', color: '#FFFFFF', fontStyle: 'italic' }}
                >
                  "{result.welcome_message}"
                </p>
              </ResultSection>
            )}
            {result.ai_explanation && (
              <ResultSection icon="📝" title="Explicação">
                <p className="text-sm leading-relaxed" style={{ color: '#ACADBD' }}>{result.ai_explanation}</p>
              </ResultSection>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recursos criados */}
      <Card className="result-card-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>📦</span> Recursos criados
          </CardTitle>
          <CardDescription>Itens configurados automaticamente na sua conta Talk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ResultSection icon="🏢" title={`Setores (${result.sectors_created})`}>
            <ChipList items={sectorNames} />
          </ResultSection>

          <ResultSection icon="🏷️" title={`Etiquetas (${result.labels_created})`}>
            <LabelChipList labels={result.labels ?? []} />
          </ResultSection>

          {result.chatbot_created && (
            <ResultSection icon="🤖" title="Chatbot">
              <p className="text-sm mt-1" style={{ color: '#ACADBD' }}>Fluxo criado com sucesso</p>
            </ResultSection>
          )}

          {result.channel_id && (
            <ResultSection icon="📡" title="Canal">
              <p className="text-sm font-mono mt-1" style={{ color: '#FFFFFF' }}>{result.channel_id}</p>
            </ResultSection>
          )}

          {result.members_invited > 0 && (
            <ResultSection icon="👥" title={`Membros convidados (${result.members_invited})`}>
              <ChipList items={result.members ?? []} />
            </ResultSection>
          )}
        </CardContent>
      </Card>

      {/* Erros */}
      {hasErrors && (
        <Card className="result-card-4" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base" style={{ color: '#ef4444' }}>
              Erros por etapa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.errors.map((err, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: '#141619', borderLeft: '3px solid #ef4444', borderRadius: 6, padding: '10px 12px' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#ef4444' }}>
                  {err.step}
                </p>
                <p className="text-sm mt-0.5" style={{ color: '#ACADBD' }}>{err.error}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Maturity Score */}
      {(loadingMaturity || maturityScore) && (
        <div className="result-card-4" style={{ marginTop: 8 }}>
          {loadingMaturity && !maturityScore && (
            <div style={{
              background: '#202326', border: '1px solid #2a2d32',
              borderRadius: 16, padding: '24px', textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: '2px solid #4C70DA', borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite', flexShrink: 0,
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              <p style={{ fontSize: 14, color: '#ACADBD', margin: 0 }}>
                Gerando seu diagnóstico de maturidade...
              </p>
            </div>
          )}
          {maturityScore && (
            <MaturityScore
              score={maturityScore.score}
              nivel={maturityScore.nivel}
              resumo={maturityScore.resumo}
              pontos_fortes={maturityScore.pontos_fortes}
              oportunidades={maturityScore.oportunidades}
              proximo_passo={maturityScore.proximo_passo}
              tempoFinal={tempoFinal}
            />
          )}
        </div>
      )}

      <Button onClick={onReset} className="w-full" variant="outline">
        Novo onboarding
      </Button>
    </div>
  )
}

export default function App() {
  const [form, setForm] = useState(INITIAL_FORM)

  const _savedKey = sessionStorage.getItem('talk_api_key')
  const _savedOrg = sessionStorage.getItem('talk_organization_id')
  const _hasSaved = _savedKey && _savedOrg

  const [credentials, setCredentials] = useState(
    _hasSaved ? { talk_api_key: _savedKey, organization_id: _savedOrg } : { talk_api_key: '', organization_id: '' }
  )
  const [status, setStatus] = useState(_hasSaved ? 'select' : 'credentials') // credentials | select | form | chat | loading | result
  const isDemoMode = credentials.talk_api_key === 'demo-mode-active'

  const demoBadge = isDemoMode ? (
    <div
      title="Modo de demonstração ativo — nenhuma ação real será executada"
      style={{
        position: 'fixed', top: 12, right: 12, zIndex: 9999,
        background: '#4C70DA22', border: '1px solid #4C70DA44',
        borderRadius: 20, fontSize: 11, color: '#4C70DA',
        padding: '4px 12px', cursor: 'default', userSelect: 'none',
      }}
    >
      🎬 Modo Demo
    </div>
  ) : null
  const [hoveredCard, setHoveredCard] = useState(null)
  const [hoveredButton, setHoveredButton] = useState(null)
  const isDesktop = useIsDesktop()
  const [result, setResult] = useState(null)
  const [tempoFinal, setTempoFinal] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [error, setError] = useState(null)
  const [aiFilledFields, setAiFilledFields] = useState(new Set())
  const [fromChat, setFromChat] = useState(false)
  const [chatMessages, setChatMessages] = useState(null)
  const [maturityScore, setMaturityScore] = useState(null)
  const [loadingMaturity, setLoadingMaturity] = useState(false)
  const [showSurpriseModal, setShowSurpriseModal] = useState(false)
  const [surpriseDesc, setSurpriseDesc] = useState('')
  const [surpriseLoading, setSurpriseLoading] = useState(false)
  const [templateApplied, setTemplateApplied] = useState(false)
  const [importedBadge, setImportedBadge] = useState(false)
  const [goalTyping, setGoalTyping] = useState(false)

  // Detect ?config= in URL on first render
  const [pendingConfig] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const configParam = params.get('config')
    if (configParam) {
      window.history.replaceState({}, '', window.location.pathname)
      return decodeConfig(configParam)
    }
    return null
  })
  const [sharedConfigBanner, setSharedConfigBanner] = useState(!!pendingConfig)

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function applyTemplate(tpl) {
    setForm(f => ({ ...f, approach: tpl.approach, create_sectors: tpl.create_sectors, create_labels: tpl.create_labels, create_chatbot: tpl.create_chatbot, goal: '' }))
    setTemplateApplied(true)
    setTimeout(() => setTemplateApplied(false), 3000)
    // Typing animation for goal
    setGoalTyping(true)
    let i = 0
    const text = tpl.goal
    const tick = setInterval(() => {
      i++
      setForm(f => ({ ...f, goal: text.slice(0, i) }))
      if (i >= text.length) { clearInterval(tick); setGoalTyping(false) }
    }, 12)
  }

  useEffect(() => {
    if (isDemoMode) {
      setForm(f => ({
        ...f,
        business_name: 'Umbler',
        segment: 'tecnologia',
        goal: 'Organizar suporte técnico, reduzir tempo de resposta e separar atendimento por nível de complexidade',
        approach: 'tecnico',
        create_sectors: true,
        create_labels: true,
        create_chatbot: true,
      }))
    }
  }, [isDemoMode])

  async function handleStepperSubmit(stepperData) {
    const t0 = Date.now()
    setStartTime(t0)
    setStatus('loading')
    setError(null)
    setForm(f => ({ ...f, ...stepperData }))

    const labelItems = stepperData.label_items ?? []
    const labelNames = labelItems.map(l => l.name.trim()).filter(Boolean)
    const labelColors = labelItems.map(l => l.color)
    const hasColorOverrides = labelColors.some(Boolean)

    const payload = {
      business_name: stepperData.business_name,
      segment: stepperData.segment,
      goal: stepperData.goal,
      approach: stepperData.approach,
      talk_api_key: credentials.talk_api_key,
      organization_id: credentials.organization_id,
      create_sectors: stepperData.create_sectors,
      sectors_description: stepperData.sectors_description || undefined,
      create_labels: stepperData.create_labels,
      labels_description: stepperData.create_labels && labelNames.length > 0 ? labelNames.join(', ') : undefined,
      label_colors_override: stepperData.create_labels && hasColorOverrides ? labelColors : undefined,
      create_chatbot: stepperData.create_chatbot,
      chatbot_description: stepperData.create_chatbot && stepperData.chatbot_description ? stepperData.chatbot_description : undefined,
      create_channel: stepperData.create_channel,
      channel_name: stepperData.create_channel && stepperData.channel_name ? stepperData.channel_name : undefined,
      create_quick_answers: false,
      create_custom_fields: false,
      configure_org_preferences: false,
    }

    try {
      const endpoint = isDemoMode ? `${API_URL}/onboarding/demo` : `${API_URL}/onboarding`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setTempoFinal(((Date.now() - t0) / 1000).toFixed(1))
      setResult(data)
      setStatus('result')

      if (!isDemoMode) {
        setLoadingMaturity(true)
        fetch(`${API_URL}/onboarding/chat/maturity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [], onboarding_result: data }),
        })
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(score => setMaturityScore(score))
          .catch(() => {})
          .finally(() => setLoadingMaturity(false))
      }
    } catch {
      setError('Não foi possível conectar ao servidor.')
      setStatus('stepper')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const t0 = Date.now()
    setStartTime(t0)
    setStatus('loading')
    setError(null)

    const memberEmails = form.member_emails
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    const labelItems = form.label_items.filter(i => i.name.trim())
    const labelNames = labelItems.map(i => i.name.trim())
    const labelColors = labelItems.map(i => i.color)
    const hasColorOverrides = labelColors.some(Boolean)

    const payload = {
      business_name: form.business_name,
      segment: form.segment,
      goal: form.goal,
      approach: form.approach,
      talk_api_key: credentials.talk_api_key,
      organization_id: credentials.organization_id,
      create_sectors: form.create_sectors,
      sectors_description: form.create_sectors ? form.sectors_description || undefined : undefined,
      create_labels: form.create_labels,
      labels_description: form.create_labels && labelNames.length > 0 ? labelNames.join(', ') : undefined,
      label_colors_override: form.create_labels && hasColorOverrides ? labelColors : undefined,
      create_chatbot: form.create_chatbot,
      chatbot_description: form.create_chatbot ? form.chatbot_description || undefined : undefined,
      create_channel: form.create_channel,
      channel_name: form.create_channel ? form.channel_name || undefined : undefined,
      member_emails: memberEmails.length > 0 ? memberEmails : undefined,
      create_quick_answers: form.create_quick_answers,
      quick_answers_description: form.create_quick_answers && form.quick_answers_description ? form.quick_answers_description : undefined,
      create_custom_fields: form.create_custom_fields,
      custom_field_items_override: form.create_custom_fields
        ? form.custom_field_items.filter(i => i.name.trim()).map(i => ({ name: i.name.trim(), type: CUSTOM_FIELD_TYPE_MAP[i.type] || CUSTOM_FIELD_TYPE_MAP.text }))
        : undefined,
      configure_org_preferences: form.configure_org_preferences,
      close_chat_message: form.configure_org_preferences && form.close_chat_message ? form.close_chat_message : undefined,
    }

    try {
      const endpoint = isDemoMode ? `${API_URL}/onboarding/demo` : `${API_URL}/onboarding`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setTempoFinal(((Date.now() - t0) / 1000).toFixed(1))
      setResult(data)
      setStatus('result')

      if (!isDemoMode) {
        setLoadingMaturity(true)
        fetch(`${API_URL}/onboarding/chat/maturity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: chatMessages ?? [], onboarding_result: data }),
        })
          .then(async r => {
            if (!r.ok) throw new Error()
            return r.json()
          })
          .then(score => setMaturityScore(score))
          .catch(() => {/* ignore silently */})
          .finally(() => setLoadingMaturity(false))
      } else {
        // Simular o score de maturidade no modo Demo
        setLoadingMaturity(true)
        setTimeout(() => {
          setMaturityScore({
            score: 75,
            nivel: "Avançado",
            resumo: "Sua operação demonstra forte adoção de processos digitais com excelente separação de setores.",
            pontos_fortes: [
              "Separação clara entre Comercial e Níveis de Suporte.",
              "Uso de etiquetas para classificar motivos de contato.",
              "Implementação de chatbot automatizado para triagem."
            ],
            oportunidades: [
              {
                titulo: "Integrar IA de Respostas",
                descricao: "Mapeie perguntas frequentes para o Chatbot IA responder sozinho e poupar seus operadores.",
                impacto: "Alto",
                prazo: "Curto prazo"
              },
              {
                titulo: "Criar Campos Personalizados",
                descricao: "Colete o ID de cliente antes do transbordo para agilizar o suporte técnico.",
                impacto: "Médio",
                prazo: "Imediato"
              }
            ],
            proximo_passo: "Ative fluxos de resposta rápida para reduzir o tempo da primeira interação com clientes."
          })
          setLoadingMaturity(false)
        }, 3000)
      }
    } catch (err) {
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.')
      setStatus('form')
    }
  }

  function handleChatComplete(data) {
    setFromChat(true)
    if (data.messages) setChatMessages(data.messages)
    const filled = new Set()
    const patch = {}

    const map = {
      business_name: data.business_name,
      segment: data.segment,
      goal: data.goal,
      approach: data.approach,
      sectors_description: data.sectors_description,
      chatbot_description: data.chatbot_description,
      channel_name: data.channel_name,
    }
    for (const [key, val] of Object.entries(map)) {
      if (val) { patch[key] = val; filled.add(key) }
    }

    if (data.labels_description) {
      const items = data.labels_description.split(/,\s*/).map(s => s.trim()).filter(Boolean).map(name => ({ name, color: '' }))
      if (items.length > 0) {
        patch.label_items = items
        filled.add('label_items')
      }
    }

    const boolMap = {
      create_sectors: data.create_sectors,
      create_labels: data.create_labels,
      create_chatbot: data.create_chatbot,
      create_channel: data.create_channel,
      create_quick_answers: data.create_quick_answers,
      create_custom_fields: data.create_custom_fields,
      configure_org_preferences: data.configure_org_preferences,
    }
    for (const [key, val] of Object.entries(boolMap)) {
      if (val != null) { patch[key] = val; filled.add(key) }
    }

    const strMap = {
      quick_answers_description: data.quick_answers_description,
      close_chat_message: data.close_chat_message,
    }
    for (const [key, val] of Object.entries(strMap)) {
      if (val) { patch[key] = val; filled.add(key) }
    }

    if (data.custom_fields_description) {
      const items = data.custom_fields_description.split(/,\s*/).map(s => s.trim()).filter(Boolean)
        .map(name => ({ name, type: 'text' }))
      if (items.length > 0) {
        patch.custom_field_items = items
        filled.add('custom_field_items')
      }
    }

    if (data.member_emails?.length > 0) {
      patch.member_emails = data.member_emails.join('\n')
      filled.add('member_emails')
    }

    setForm(f => ({ ...f, ...patch }))
    setAiFilledFields(filled)
    setStatus('transitioning')
    setTimeout(() => setStatus('stepper'), 2200)
  }

  async function handleChatComplete(data) {
    const t0 = Date.now()
    setStartTime(t0)
    setFromChat(true)
    if (data.messages) setChatMessages(data.messages)
    
    setStatus('loading')
    try {
      const endpoint = isDemoMode ? `${API_URL}/onboarding/demo` : `${API_URL}/onboarding`
      const payload = {
        talk_api_key: credentials.talk_api_key,
        organization_id: credentials.organization_id,
        business_name: data.business_name || form.business_name || '',
        segment: data.segment || form.segment || 'tecnologia',
        goal: data.goal || form.goal || '',
        approach: data.approach || form.approach || 'consultivo',
        create_sectors: data.create_sectors ?? true,
        sectors_description: data.sectors_description || '',
        create_labels: data.create_labels ?? true,
        label_items: data.label_items || form.label_items,
        create_chatbot: data.create_chatbot ?? true,
        chatbot_description: data.chatbot_description || '',
        create_channel: data.create_channel ?? false,
        channel_name: data.channel_name || '',
        create_quick_answers: data.create_quick_answers ?? true,
        quick_answers_description: data.quick_answers_description || '',
        create_custom_fields: data.create_custom_fields ?? true,
        custom_field_items_override: data.custom_field_items_override || null,
        configure_org_preferences: data.configure_org_preferences ?? true,
        close_chat_message: data.close_chat_message || '',
        member_emails: data.member_emails ? (Array.isArray(data.member_emails) ? data.member_emails : data.member_emails.split(',').map(s=>s.trim())) : [],
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const resultData = await res.json()
      
      if (!res.ok) throw new Error(resultData.detail || 'Erro na configuração')
      
      setResult(resultData)
      setTempoFinal(((Date.now() - t0) / 1000).toFixed(1))
      
      if (!isDemoMode) {
        setLoadingMaturity(true)
        fetch(`${API_URL}/onboarding/chat/maturity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: data.messages ?? [], onboarding_result: resultData }),
        })
          .then(async r => {
            if (!r.ok) throw new Error()
            return r.json()
          })
          .then(score => setMaturityScore(score))
          .catch(() => {})
          .finally(() => setLoadingMaturity(false))
      } else {
        setLoadingMaturity(true)
        setTimeout(() => {
          setMaturityScore({
            score: 75,
            nivel: "Avançado",
            resumo: "Sua operação demonstra forte adoção de processos digitais com excelente separação de setores.",
            pontos_fortes: ["Separação clara entre Comercial e Níveis de Suporte.", "Uso de etiquetas para classificar motivos de contato.", "Implementação de chatbot automatizado para triagem."],
            oportunidades: [
              { titulo: "Integrar IA de Respostas", descricao: "Mapeie perguntas frequentes para o Chatbot IA.", impacto: "Alto", prazo: "Curto prazo" },
              { titulo: "Criar Campos Personalizados", descricao: "Colete o ID de cliente para agilizar o suporte.", impacto: "Médio", prazo: "Imediato" }
            ],
            proximo_passo: "Ative fluxos de resposta rápida para reduzir o tempo da primeira interação."
          })
          setLoadingMaturity(false)
        }, 3000)
      }
      
      setStatus('result')
    } catch (err) {
      setError(err.message || 'Erro ao processar as configurações geradas pela IA.')
      setStatus('stepper')
    }
  }

  async function handleSurpriseConfirm() {
    setSurpriseLoading(true)
    try {
      const res = await fetch(`${API_URL}/onboarding/surprise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment: form.segment || null,
          business_name: form.business_name || null,
          description: surpriseDesc.trim() || null,
        }),
      })
      const data = await res.json()
      setSurpriseDesc('')
      handleChatComplete(data)
    } catch {
      // silently ignore
    } finally {
      setSurpriseLoading(false)
    }
  }

  if (status === 'credentials') return (
    <div key={status} className="page-transition">
      <CredentialsGate
        sharedConfigBanner={sharedConfigBanner}
        onDismissBanner={() => setSharedConfigBanner(false)}
        onConnect={(apiKey, orgId) => {
          sessionStorage.setItem('talk_api_key', apiKey)
          sessionStorage.setItem('talk_organization_id', orgId)
          setCredentials({ talk_api_key: apiKey, organization_id: orgId })
          if (pendingConfig) {
            setForm(f => ({ ...f, ...pendingConfig }))
            setImportedBadge(true)
            setTimeout(() => setImportedBadge(false), 4000)
            setStatus('stepper')
          } else {
            setStatus('select')
          }
        }}
      />
    </div>
  )

  if (status === 'transitioning') return <div key={status} className="page-transition"><>{demoBadge}<FillingAnimation /></></div>
  if (status === 'loading') return <div key={status} className="page-transition"><>{demoBadge}<OnboardingTimer startTime={startTime ?? Date.now()} segment={form.segment} /></></div>
  
  if (status === 'surprise') return (
    <div key={status} className="page-transition min-h-svh flex flex-col items-center justify-center px-4" style={{ background: 'var(--talk-bg-primary)' }}>
      {demoBadge}
      <button
        onClick={() => setStatus('select')}
        style={{ position: 'fixed', top: 20, left: 24, zIndex: 100, background: 'rgba(26,28,32,0.8)', border: '1px solid #2A2D32', borderRadius: 8, cursor: 'pointer', color: '#8E92A4', fontSize: 13, padding: '8px 14px', display: 'flex', gap: 6, alignItems: 'center', transition: 'all 0.2s', backdropFilter: 'blur(4px)' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#4C70DA'; e.currentTarget.style.background = '#1A1C20' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#8E92A4'; e.currentTarget.style.borderColor = '#2A2D32'; e.currentTarget.style.background = 'rgba(26,28,32,0.8)' }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>←</span> Voltar
      </button>

      <div style={{ width: '100%', maxWidth: 540, height: '100vh', display: 'flex', flexDirection: 'column', paddingTop: 80, paddingBottom: 24, boxSizing: 'border-box' }}>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Surpreenda-me ✨
            </h1>
            <p style={{ fontSize: 15, color: '#8E92A4', margin: 0, lineHeight: 1.5 }}>
              Descreva seu negócio e a IA de alto nível criará setores, etiquetas e fluxos baseados na sua descrição num piscar de olhos.
            </p>
          </div>

          <div style={{ position: 'relative', marginBottom: 24 }}>
            <textarea
              value={surpriseDesc}
              onChange={e => setSurpriseDesc(e.target.value.slice(0, 500))}
              placeholder="Ex: Somos uma clínica odontológica com 3 dentistas. Recebemos muitos pedidos de agendamento e orçamentos pelo WhatsApp."
              rows={5}
              maxLength={500}
              disabled={surpriseLoading}
              className="focus-visible:ring-1 focus-visible:ring-talk-accent"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#1A1C20', border: '1px solid #2A2D32', borderRadius: 8,
                padding: '16px 18px', color: '#FFFFFF', fontSize: 15, lineHeight: 1.6,
                resize: 'none', outline: 'none', fontFamily: 'inherit',
                opacity: surpriseLoading ? 0.6 : 1,
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#4C70DA'}
              onBlur={e => e.currentTarget.style.borderColor = '#2A2D32'}
            />
            <span style={{ position: 'absolute', bottom: 12, right: 14, fontSize: 12, color: '#8E92A4', pointerEvents: 'none', fontWeight: 500 }}>
              {surpriseDesc.length}/500
            </span>
          </div>
        </div>

        {/* Bottom Nav */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexShrink: 0 }}>
          <button
            onClick={handleSurpriseConfirm}
            disabled={!surpriseDesc.trim() || surpriseLoading}
            style={{
              width: '100%', padding: '14px', borderRadius: 8, fontWeight: 600, fontSize: 15,
              background: (!surpriseDesc.trim() || surpriseLoading) ? '#2F3238' : '#4C70DA',
              color: (!surpriseDesc.trim() || surpriseLoading) ? '#8E92A4' : '#FFFFFF', border: 'none', cursor: (!surpriseDesc.trim() || surpriseLoading) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: (!surpriseDesc.trim() || surpriseLoading) ? 'none' : '0 4px 12px rgba(76,112,218,0.3)',
            }}
            onMouseEnter={e => { if (surpriseDesc.trim() && !surpriseLoading) e.currentTarget.style.background = '#3d5ec7' }}
            onMouseLeave={e => { if (surpriseDesc.trim() && !surpriseLoading) e.currentTarget.style.background = '#4C70DA' }}
          >
            {surpriseLoading ? (
              <>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #FFFFFF88', borderTopColor: '#FFFFFF', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                Gerando arquitetura...
              </>
            ) : '🚀 Construir minha operação'}
          </button>
        </div>
      </div>
    </div>
  )

  if (status === 'stepper') return (
    <div key={status} className="page-transition">
      <>{demoBadge}<StepperForm
        initialForm={{
          business_name: form.business_name,
          segment: form.segment,
          goal: form.goal,
          approach: form.approach,
          create_sectors: form.create_sectors,
          sectors_description: form.sectors_description || '',
          create_labels: form.create_labels,
          label_items: form.label_items?.length ? form.label_items : [{ name: '', color: '' }],
          create_chatbot: form.create_chatbot,
          chatbot_description: form.chatbot_description || '',
          create_channel: form.create_channel,
          channel_name: form.channel_name || '',
        }}
        onSubmit={handleStepperSubmit}
        onBack={() => setStatus('select')}
        aiFilledFields={aiFilledFields}
      /></>
    </div>
  )
  if (status === 'result') return <div key={status} className="page-transition"><>{demoBadge}<DeployResult result={result} tempoFinal={tempoFinal} fromChat={fromChat} maturityScore={maturityScore} loadingMaturity={loadingMaturity} credentials={credentials} isDemoMode={isDemoMode} form={form} onReset={() => { setStatus('select'); setResult(null); setTempoFinal(null); setFromChat(false); setChatMessages(null); setMaturityScore(null); setLoadingMaturity(false) }} /></></div>

  if (status === 'chat') return (
    <div key={status} className="page-transition">
      <>{demoBadge}<DiscoveryChat
        onComplete={handleChatComplete}
        onBack={() => setStatus('select')}
        isDemoMode={isDemoMode}
      /></>
    </div>
  )

  if (status === 'select') return (
    <div key={status} className="page-transition">
      {demoBadge}

      <div className="min-h-svh flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[640px] space-y-8">
          <div className="space-y-2" style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF', margin: 0 }}>
              Talk One-Click
            </h1>
            <p style={{ fontSize: 16, color: '#8E92A4', margin: 0 }}>Escolha como deseja configurar sua nova conta Talk hoje.</p>
            <button
              onClick={() => {
                sessionStorage.removeItem('talk_api_key')
                sessionStorage.removeItem('talk_organization_id')
                setCredentials({ talk_api_key: '', organization_id: '' })
                setStatus('credentials')
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8E92A4', fontSize: 13, padding: 0, textDecoration: 'underline', marginTop: 12, display: 'inline-block' }}
            >
              Trocar de conta
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Card Chat */}
            <div
              onClick={() => setStatus('chat')}
              onMouseEnter={() => setHoveredCard('chat')}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                padding: '24px 28px', borderRadius: 10, minHeight: 120,
                background: '#1A1C20', border: hoveredCard === 'chat' ? '1px solid #4C70DA' : '1px solid #2A2D32',
                cursor: 'pointer', transition: 'all 0.15s ease-out',
                display: 'flex', alignItems: 'center', gap: 24,
                boxShadow: hoveredCard === 'chat' ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <h2 style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 18, margin: 0 }}>Conversar com IA</h2>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: 'rgba(76,112,218,0.15)', color: '#4C70DA', border: '1px solid rgba(76,112,218,0.3)' }}>
                    Recomendado
                  </span>
                </div>
                <p style={{ color: '#8E92A4', fontSize: 15, lineHeight: 1.5, margin: 0 }}>
                  A IA entende o seu negócio e toma as melhores decisões de configuração por você.
                </p>
              </div>
              <span style={{ fontSize: 26, opacity: hoveredCard === 'chat' ? 1 : 0.6, transition: 'opacity 0.2s' }}>💬</span>
            </div>

            {/* Card Stepper */}
            <div
              onClick={() => setStatus('stepper')}
              onMouseEnter={() => setHoveredCard('form')}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                padding: '24px 28px', borderRadius: 10, minHeight: 120,
                background: '#1A1C20', border: hoveredCard === 'form' ? '1px solid #4C70DA' : '1px solid #2A2D32',
                cursor: 'pointer', transition: 'all 0.15s ease-out',
                display: 'flex', alignItems: 'center', gap: 24,
                boxShadow: hoveredCard === 'form' ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ flex: 1 }}>
                <h2 style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 18, margin: '0 0 8px 0' }}>Já sei o que quero</h2>
                <p style={{ color: '#8E92A4', fontSize: 15, lineHeight: 1.5, margin: 0 }}>
                  Configure passo a passo em 4 etapas guiadas — rápido e sem complexidade.
                </p>
              </div>
              <span style={{ fontSize: 26, filter: hoveredCard === 'form' ? 'none' : 'grayscale(1)', opacity: hoveredCard === 'form' ? 1 : 0.6, transition: 'all 0.2s' }}>📋</span>
            </div>

            {/* Surpreenda-me */}
            <div
              onClick={() => setStatus('surprise')}
              onMouseEnter={() => setHoveredCard('surprise')}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                padding: '24px 28px', borderRadius: 10, minHeight: 120,
                background: hoveredCard === 'surprise' ? 'rgba(76,112,218,0.06)' : '#1A1C20',
                border: hoveredCard === 'surprise' ? '1px solid #4C70DA' : '1px solid #2A2D32',
                cursor: 'pointer', transition: 'all 0.15s ease-out',
                display: 'flex', alignItems: 'center', gap: 24,
                boxShadow: hoveredCard === 'surprise' ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ flex: 1 }}>
                <h2 style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 18, margin: '0 0 8px 0' }}>Surpreenda-me</h2>
                <p style={{ color: '#8E92A4', fontSize: 15, lineHeight: 1.5, margin: 0 }}>
                  Descreva sua empresa brevemente e deixe que montemos tudo num piscar de olhos.
                </p>
              </div>
              <span style={{ fontSize: 26, filter: hoveredCard === 'surprise' ? 'none' : 'grayscale(1)', opacity: hoveredCard === 'surprise' ? 1 : 0.6, transition: 'all 0.2s' }}>✨</span>
            </div>


          </div>

        </div>
      </div>
    </div>
  )

  return (
    <>
    {demoBadge}
    <style>{`@keyframes tplFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 16px 64px' }}>

      {/* Cabeçalho do formulário */}
      <div style={{ marginBottom: 36, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <button onClick={() => setStatus('select')} style={{ color: '#8E92A4', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>←</span> Voltar
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', color: '#FFFFFF', margin: 0 }}>
            Configuração de nova conta
          </h1>
          <p style={{ fontSize: 14, color: '#8E92A4', margin: '4px 0 0' }}>
            Preencha os dados e o sistema gerará sua conta do Talk pronta para uso.
          </p>
        </div>
        {importedBadge && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#4C70DA', background: 'rgba(76,112,218,0.1)', border: '1px solid rgba(76,112,218,0.25)', borderRadius: 6, padding: '4px 10px' }}>
            🔗 Configuração importada
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isDesktop ? '1fr 360px' : '1fr',
        gap: 24,
        alignItems: 'start',
      }}>
      <form id="onboarding-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Dados do negócio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do negócio</CardTitle>
            <CardDescription>Informações básicas sobre a empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="business_name">Nome do negócio{aiFilledFields.has('business_name') && <AiTag />}</Label>
              <Input
                id="business_name"
                placeholder="Ex: Studio Bella"
                value={form.business_name}
                onChange={(e) => setField('business_name', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Segmento{aiFilledFields.has('segment') && <AiTag />}</Label>
                <Select
                  value={form.segment}
                  onValueChange={(v) => setField('segment', v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent style={{ minWidth: 'var(--radix-select-trigger-width)', width: 'max-content' }}>
                    <SelectItem value="automotivo">Automotivo</SelectItem>
                    <SelectItem value="beleza">Beleza &amp; Estética</SelectItem>
                    <SelectItem value="construcao">Construção &amp; Reforma</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="educacao">Educação</SelectItem>
                    <SelectItem value="eventos">Eventos &amp; Festas</SelectItem>
                    <SelectItem value="financeiro">Financeiro &amp; Contabilidade</SelectItem>
                    <SelectItem value="imobiliaria">Imobiliária</SelectItem>
                    <SelectItem value="juridico">Jurídico</SelectItem>
                    <SelectItem value="logistica">Logística &amp; Transporte</SelectItem>
                    <SelectItem value="pet">Pet Shop &amp; Veterinário</SelectItem>
                    <SelectItem value="restaurante">Restaurante &amp; Delivery</SelectItem>
                    <SelectItem value="saude">Saúde &amp; Bem-estar</SelectItem>
                    <SelectItem value="tecnologia">Tecnologia &amp; SaaS</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {/* Template card */}
                {form.segment && TEMPLATES[form.segment] && (() => {
                  const tpl = TEMPLATES[form.segment]
                  return (
                    <div style={{ marginTop: 8, animation: 'tplFadeIn 0.2s ease both' }}>
                      {templateApplied && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#4C70DA', marginBottom: 6 }}>
                          📋 Template aplicado
                        </div>
                      )}
                      <div style={{ background: '#202326', border: '1px solid #2a2d32', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', margin: '0 0 2px' }}>{tpl.emoji} {tpl.label}</p>
                          <p style={{ fontSize: 12, color: '#ACADBD', margin: 0, lineHeight: 1.4 }}>{tpl.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyTemplate(tpl)}
                          style={{ flexShrink: 0, background: 'transparent', border: '1px solid #4C70DA', color: '#4C70DA', borderRadius: 6, fontSize: 12, padding: '4px 10px', cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#4C70DA'; e.currentTarget.style.color = '#FFFFFF' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4C70DA' }}
                        >
                          Usar template →
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="goal">Objetivo principal{aiFilledFields.has('goal') && <AiTag />}</Label>
                <Textarea
                  id="goal"
                  placeholder="Ex: Quero automatizar o agendamento de clientes, reduzir tempo de resposta e organizar meu time por especialidade..."
                  value={form.goal}
                  onChange={(e) => setField('goal', e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Abordagem{aiFilledFields.has('approach') && <AiTag />}</Label>
                <Select
                  value={form.approach}
                  onValueChange={(v) => setField('approach', v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent style={{ minWidth: 'var(--radix-select-trigger-width)', width: 'max-content' }}>
                    <SelectItem value="consultivo">Consultivo</SelectItem>
                    <SelectItem value="direto">Direto e objetivo</SelectItem>
                    <SelectItem value="empatico">Empático e acolhedor</SelectItem>
                    <SelectItem value="tecnico">Técnico e detalhista</SelectItem>
                    <SelectItem value="comercial">Comercial e proativo</SelectItem>
                    <SelectItem value="educativo">Educativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </CardContent>
        </Card>


        {/* Recursos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recursos a criar</CardTitle>
            <CardDescription>Selecione o que deve ser configurado automaticamente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <CheckboxField
              id="create_sectors"
              label="Setores"
              description="Cria setores de atendimento personalizados para o seu segmento"
              checked={form.create_sectors}
              onChange={(e) => setField('create_sectors', e.target.checked)}
            />
            {form.create_sectors && (
              <div className="space-y-1.5 pl-7">
                <Label htmlFor="sectors_description">Descrição dos setores <span className="text-muted-foreground font-normal">(opcional)</span>{aiFilledFields.has('sectors_description') && <AiTag />}</Label>
                <Textarea
                  id="sectors_description"
                  placeholder="Ex: Quero setores de Vendas, Suporte e Financeiro..."
                  value={form.sectors_description}
                  onChange={(e) => setField('sectors_description', e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <CheckboxField
              id="create_labels"
              label="Etiquetas"
              description="Cria etiquetas para categorizar os atendimentos"
              checked={form.create_labels}
              onChange={(e) => setField('create_labels', e.target.checked)}
            />
            {form.create_labels && (
              <div className="space-y-2 pl-7">
                <Label>
                  Etiquetas{' '}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                  {aiFilledFields.has('label_items') && <AiTag />}
                </Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.label_items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Input
                        value={item.name}
                        placeholder={`Ex: ${['Urgente', 'Orçamento', 'Reclamação', 'Pós-venda', 'VIP'][i % 5]}`}
                        onChange={(e) => setForm(f => ({
                          ...f,
                          label_items: f.label_items.map((v, idx) => idx === i ? { ...v, name: e.target.value } : v),
                        }))}
                        style={{ flex: 1 }}
                      />
                      <ColorPickerDropdown
                        color={item.color}
                        onChange={(color) => setForm(f => ({
                          ...f,
                          label_items: f.label_items.map((v, idx) => idx === i ? { ...v, color } : v),
                        }))}
                      />
                      {form.label_items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, label_items: f.label_items.filter((_, idx) => idx !== i) }))}
                          style={{
                            width: 36, height: 36, borderRadius: 8, border: '1px solid #2a2d32',
                            background: '#202326', color: '#ACADBD', cursor: 'pointer',
                            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'border-color 0.2s, color 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2d32'; e.currentTarget.style.color = '#ACADBD' }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, label_items: [...f.label_items, { name: '', color: '' }] }))}
                  style={{
                    fontSize: 13, color: '#4C70DA', background: 'none', border: '1px dashed #4C70DA55',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#4C70DA'; e.currentTarget.style.background = '#4C70DA0D' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#4C70DA55'; e.currentTarget.style.background = 'none' }}
                >
                  + Adicionar etiqueta
                </button>
              </div>
            )}

            <CheckboxField
              id="create_chatbot"
              label="Chatbot"
              description="Cria um fluxo de chatbot inteligente com boas-vindas automáticas"
              checked={form.create_chatbot}
              onChange={(e) => setField('create_chatbot', e.target.checked)}
            />
            {form.create_chatbot && (
              <div className="space-y-1.5 pl-7">
                <Label htmlFor="chatbot_description">Descrição do chatbot <span className="text-muted-foreground font-normal">(opcional)</span>{aiFilledFields.has('chatbot_description') && <AiTag />}</Label>
                <Textarea
                  id="chatbot_description"
                  placeholder="Ex: Fluxo com menu de Vendas e Suporte, horário seg-sex 9h-18h..."
                  value={form.chatbot_description}
                  onChange={(e) => setField('chatbot_description', e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <CheckboxField
              id="create_channel"
              label="Canal"
              description="Cria um canal de atendimento e vincula ao chatbot"
              checked={form.create_channel}
              onChange={(e) => setField('create_channel', e.target.checked)}
            />
            {form.create_channel && (
              <div className="space-y-1.5 pl-7">
                <Label htmlFor="channel_name">Nome do canal{aiFilledFields.has('channel_name') && <AiTag />}</Label>
                <Input
                  id="channel_name"
                  placeholder="Ex: WhatsApp Principal"
                  value={form.channel_name}
                  onChange={(e) => setField('channel_name', e.target.value)}
                />
              </div>
            )}

            <CheckboxField
              id="create_quick_answers"
              label="Respostas Rápidas"
              description="Atalhos de texto para o time usar nos atendimentos — saudações, horários, preços, endereço. A IA cria automaticamente para o seu segmento."
              checked={form.create_quick_answers}
              onChange={(e) => setField('create_quick_answers', e.target.checked)}
            />
            {form.create_quick_answers && (
              <div className="space-y-1.5 pl-7">
                <Label htmlFor="quick_answers_description">Dica para a IA <span className="text-muted-foreground font-normal">(opcional)</span>{aiFilledFields.has('quick_answers_description') && <AiTag />}</Label>
                <Textarea
                  id="quick_answers_description"
                  placeholder="Ex: Quero respostas para horário de funcionamento, endereço e como agendar..."
                  value={form.quick_answers_description}
                  onChange={(e) => setField('quick_answers_description', e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <CheckboxField
              id="create_custom_fields"
              label="Campos Personalizados de Contato"
              description="Campos extras no perfil do contato — CPF, plano de saúde, número do pedido, etc. A IA sugere os mais relevantes para o seu segmento."
              checked={form.create_custom_fields}
              onChange={(e) => setField('create_custom_fields', e.target.checked)}
            />
            {form.create_custom_fields && (
              <div className="space-y-2 pl-7">
                <Label>
                  Campos{' '}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                  {aiFilledFields.has('custom_field_items') && <AiTag />}
                </Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.custom_field_items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Input
                        value={item.name}
                        placeholder={`Ex: ${['CPF', 'DataNascimento', 'PlanoSaude', 'NumeroPedido', 'Empresa'][i % 5]}`}
                        onChange={(e) => setForm(f => ({
                          ...f,
                          custom_field_items: f.custom_field_items.map((v, idx) => idx === i ? { ...v, name: e.target.value } : v),
                        }))}
                        style={{ flex: 1 }}
                      />
                      <Select
                        value={item.type}
                        onValueChange={(type) => setForm(f => ({
                          ...f,
                          custom_field_items: f.custom_field_items.map((v, idx) => idx === i ? { ...v, type } : v),
                        }))}
                      >
                        <SelectTrigger style={{ width: 120, flexShrink: 0 }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="number">Número</SelectItem>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="date">Data</SelectItem>
                          <SelectItem value="currency">Moeda</SelectItem>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="logic">Sim/Não</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.custom_field_items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, custom_field_items: f.custom_field_items.filter((_, idx) => idx !== i) }))}
                          style={{
                            width: 36, height: 36, borderRadius: 8, border: '1px solid #2a2d32',
                            background: '#202326', color: '#ACADBD', cursor: 'pointer',
                            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'border-color 0.2s, color 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2d32'; e.currentTarget.style.color = '#ACADBD' }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, custom_field_items: [...f.custom_field_items, { name: '', type: 'text' }] }))}
                  style={{
                    fontSize: 13, color: '#4C70DA', background: 'none', border: '1px dashed #4C70DA55',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#4C70DA'; e.currentTarget.style.background = '#4C70DA0D' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#4C70DA55'; e.currentTarget.style.background = 'none' }}
                >
                  + Adicionar campo
                </button>
              </div>
            )}

            <CheckboxField
              id="configure_org_preferences"
              label="Mensagem de Encerramento"
              description="Envia uma mensagem automática quando um atendimento é encerrado — ex: 'Obrigado pelo contato! 😊'. A IA cria uma mensagem personalizada se você não definir uma."
              checked={form.configure_org_preferences}
              onChange={(e) => setField('configure_org_preferences', e.target.checked)}
            />
            {form.configure_org_preferences && (
              <div className="space-y-1.5 pl-7">
                <Label htmlFor="close_chat_message">Mensagem de encerramento <span className="text-muted-foreground font-normal">(opcional — IA gera automaticamente)</span>{aiFilledFields.has('close_chat_message') && <AiTag />}</Label>
                <Input
                  id="close_chat_message"
                  placeholder="Ex: Obrigado pelo contato! Estamos sempre à disposição. 😊"
                  value={form.close_chat_message}
                  onChange={(e) => setField('close_chat_message', e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Membros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Convidar atendentes{' '}
              <span className="text-muted-foreground font-normal text-sm">(opcional)</span>
              {aiFilledFields.has('member_emails') && <AiTag />}
            </CardTitle>
            <CardDescription>Um e-mail por linha ou separados por vírgula</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="joao@empresa.com&#10;maria@empresa.com"
              value={form.member_emails}
              onChange={(e) => setField('member_emails', e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </form>

      <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ConfigPreview
          businessName={form.business_name}
          segment={form.segment}
          goal={form.goal}
          approach={form.approach}
          createSectors={form.create_sectors}
          createLabels={form.create_labels}
          createChatbot={form.create_chatbot}
        />
        <button
          type="submit"
          form="onboarding-form"
          style={{
            width: '100%', padding: '10px 16px', borderRadius: 6,
            background: '#4C70DA', color: 'white', fontWeight: 500,
            fontSize: 14, border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(76,112,218,0.25)',
          }}
        >
          Iniciar configuração
        </button>
        <p style={{ fontSize: 12, color: '#8E92A4', textAlign: 'center', marginTop: 8 }}>
          ✓ Seus dados não são armazenados
        </p>
      </div>
      </div>
    </div>
    </>
  )
}
